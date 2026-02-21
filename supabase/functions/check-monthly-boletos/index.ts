import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ClientExpected {
  id: string;
  nome_fantasia: string;
  cnpj: string;
  services: string[];
  valor_smart: number;
  valor_apoio: number;
  valor_contabilidade: number;
  valor_personalite: number;
  vencimento: number;
}

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

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = claimsData.claims.sub;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (!orgMember) {
      return new Response(JSON.stringify({ error: 'Organization not found.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const orgId = orgMember.organization_id;

    // Parse optional month param, default to current month
    const body = await req.json().catch(() => ({}));
    const now = new Date();
    const competencia = body.competencia || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, month] = competencia.split('-').map(Number);

    // 1. Fetch active clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, nome_fantasia, cnpj, services, valor_smart, valor_apoio, valor_contabilidade, valor_personalite, vencimento')
      .eq('organization_id', orgId)
      .eq('status', 'ativo');

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      return new Response(JSON.stringify({ error: 'Erro ao buscar clientes.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Fetch Nibo connections
    const { data: connections } = await supabase
      .from('nibo_connections')
      .select('*')
      .eq('organization_id', orgId);

    // 3. Fetch all open schedules from Nibo for current month
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

        while (page < 20) {
          const niboUrl = `https://api.nibo.com.br/empresas/v1/schedules/credit?$orderby=dueDate&$top=${top}&$skip=${skip}&$filter=dueDate ge '${year}-${String(month).padStart(2, '0')}-01' and dueDate le '${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}'`;
          console.log(`Checking Nibo (${conn.nome}):`, niboUrl);

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

    // 4. Normalize CNPJs from Nibo items for matching
    const normalizeCnpj = (doc: string) => doc?.replace(/\D/g, '') || '';

    // Build a map of Nibo items by CNPJ
    const niboByCnpj = new Map<string, any[]>();
    for (const item of niboItems) {
      const stakeholders = item.stakeholders || item.stakeholder ? [item.stakeholder] : [];
      const allStakeholders = [...(item.stakeholders || []), ...(item.stakeholder ? [item.stakeholder] : [])];
      
      for (const sh of allStakeholders) {
        if (sh?.document) {
          const cnpj = normalizeCnpj(sh.document);
          if (!niboByCnpj.has(cnpj)) niboByCnpj.set(cnpj, []);
          niboByCnpj.get(cnpj)!.push(item);
        }
      }
    }

    // 5. Check each client
    const results: BoletoCheck[] = [];
    const serviceMap: Record<string, string> = {
      smart: 'valor_smart',
      apoio: 'valor_apoio',
      contabilidade: 'valor_contabilidade',
      personalite: 'valor_personalite',
    };

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

      // Match found boletos
      const foundBoletos = niboForClient.map((item: any) => ({
        valor: item.value || item.totalValue || 0,
        niboScheduleId: item.scheduleId || item.id || null,
        dueDate: item.dueDate || '',
      }));

      // Determine status: match expected values to found values (with R$0.05 tolerance)
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
