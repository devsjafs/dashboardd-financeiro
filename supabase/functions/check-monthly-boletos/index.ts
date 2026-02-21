import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface BoletoCheck {
  clientId: string;
  nomeFantasia: string;
  cnpj: string;
  expectedBoletos: { service: string; valor: number }[];
  foundBoletos: { valor: number; niboScheduleId: string | null; dueDate: string }[];
  status: "ok" | "parcial" | "pendente";
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Authenticate user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get org
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (!orgMember) {
      return new Response(JSON.stringify({ error: 'Organization not found.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const orgId = orgMember.organization_id;

    const body = await req.json().catch(() => ({}));
    const now = new Date();
    const competencia = body.competencia || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, month] = competencia.split('-').map(Number);

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    // Fetch active clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, nome_fantasia, cnpj, services, valor_smart, valor_apoio, valor_contabilidade, valor_personalite, vencimento')
      .eq('organization_id', orgId)
      .eq('status', 'ativo');

    if (clientsError) {
      return new Response(JSON.stringify({ error: 'Erro ao buscar clientes.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch Nibo connections
    const { data: connections } = await supabase
      .from('nibo_connections')
      .select('*')
      .eq('organization_id', orgId);

    // Fetch ONLY schedules for the target month using OData date filter
    const niboItems: any[] = [];

    if (connections && connections.length > 0) {
      for (const conn of connections) {
        const headers: Record<string, string> = {
          'ApiToken': conn.api_token,
          'Accept': 'application/json',
        };

        let skip = 0;
        const top = 500;
        let page = 0;

        while (page < 10) {
          // Use OData filter to only get schedules within the month
          const filter = encodeURIComponent(`dueDate ge ${startDate} and dueDate le ${endDate}`);
          const niboUrl = `https://api.nibo.com.br/empresas/v1/schedules/credit?$filter=${filter}&$orderby=dueDate&$top=${top}&$skip=${skip}`;
          console.log(`Nibo (${conn.nome}) page ${page + 1}: fetching ${startDate} to ${endDate}`);

          const niboResponse = await fetch(niboUrl, { method: 'GET', headers });

          if (!niboResponse.ok) {
            const errorText = await niboResponse.text();
            console.error(`Nibo API error for ${conn.nome}:`, niboResponse.status, errorText);
            break;
          }

          const niboData = await niboResponse.json();
          const items = niboData?.items || (Array.isArray(niboData) ? niboData : []);

          if (Array.isArray(items) && items.length > 0) {
            niboItems.push(...items);
          }

          if (!Array.isArray(items) || items.length < top) break;
          skip += top;
          page++;
        }
      }
    }

    console.log(`Total Nibo items for ${competencia}: ${niboItems.length}`);

    // Debug: log first 3 items structure to understand field names
    for (let i = 0; i < Math.min(3, niboItems.length); i++) {
      const item = niboItems[i];
      console.log(`Nibo item ${i}: keys=${Object.keys(item).join(',')}, stakeholders=${JSON.stringify(item.stakeholders)}, stakeholder=${JSON.stringify(item.stakeholder)}, customerName=${item.customerName}, customer=${JSON.stringify(item.customer)}`);
    }

    // Build map by CNPJ
    const normalizeCnpj = (doc: string) => doc?.replace(/\D/g, '') || '';
    const niboByCnpj = new Map<string, any[]>();

    for (const item of niboItems) {
      const allStakeholders = [...(item.stakeholders || []), ...(item.stakeholder ? [item.stakeholder] : [])];
      for (const sh of allStakeholders) {
        const doc = sh?.cpfCnpj || sh?.document || '';
        if (doc) {
          const cnpj = normalizeCnpj(doc);
          if (!niboByCnpj.has(cnpj)) niboByCnpj.set(cnpj, []);
          niboByCnpj.get(cnpj)!.push(item);
        }
      }
    }

    // Log some debug info
    console.log(`Unique CNPJs found in Nibo: ${niboByCnpj.size}`);

    // Check each client
    const serviceMap: Record<string, string> = {
      smart: 'valor_smart',
      apoio: 'valor_apoio',
      contabilidade: 'valor_contabilidade',
      personalite: 'valor_personalite',
    };

    const results: BoletoCheck[] = [];

    for (const client of (clients || [])) {
      const expectedBoletos: { service: string; valor: number }[] = [];

      for (const svc of (client.services || [])) {
        const field = serviceMap[svc];
        const valor = field ? (client as any)[field] || 0 : 0;
        if (valor > 0) {
          expectedBoletos.push({ service: svc, valor });
        }
      }

      if (expectedBoletos.length === 0) continue;

      const clientCnpj = normalizeCnpj(client.cnpj);
      const niboForClient = niboByCnpj.get(clientCnpj) || [];

      const foundBoletos = niboForClient.map((item: any) => ({
        valor: item.value || item.totalValue || 0,
        niboScheduleId: item.scheduleId || item.id || null,
        dueDate: item.dueDate || '',
      }));

      // Log first few mismatches for debugging
      if (niboForClient.length === 0 && results.length < 5) {
        console.log(`No Nibo match for ${client.nome_fantasia} (CNPJ: ${clientCnpj})`);
      }

      let matched = 0;
      const usedIndices = new Set<number>();

      for (const expected of expectedBoletos) {
        for (let i = 0; i < foundBoletos.length; i++) {
          if (usedIndices.has(i)) continue;
          if (Math.abs(foundBoletos[i].valor - expected.valor) <= 0.05) {
            matched++;
            usedIndices.add(i);
            break;
          }
        }
      }

      const status = matched >= expectedBoletos.length ? "ok" :
                     matched > 0 ? "parcial" : "pendente";

      results.push({
        clientId: client.id,
        nomeFantasia: client.nome_fantasia,
        cnpj: client.cnpj,
        expectedBoletos,
        foundBoletos,
        status,
      });
    }

    const summary = {
      competencia,
      total: results.length,
      ok: results.filter(r => r.status === "ok").length,
      parcial: results.filter(r => r.status === "parcial").length,
      pendente: results.filter(r => r.status === "pendente").length,
    };

    return new Response(
      JSON.stringify({ summary, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorId = crypto.randomUUID();
    console.error('Error ID:', errorId, 'Details:', error);
    return new Response(
      JSON.stringify({ error: 'Falha ao verificar boletos. ID: ' + errorId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
