import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
      return new Response(JSON.stringify({ error: 'Organização não encontrada.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const orgId = orgMember.organization_id;
    const body = await req.json().catch(() => ({}));
    const connectionId = body.connection_id;

    let connections: any[] = [];
    const query = supabase.from('billing_connections').select('*').eq('organization_id', orgId).eq('provider', 'safe2pay');
    if (connectionId) query.eq('id', connectionId);
    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhuma conexão Safe2Pay configurada. Vá em Configurações para adicionar.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    connections = data;

    const allItems: any[] = [];

    for (const conn of connections) {
      const apiToken = conn.api_token || conn.api_key;
      let pageNumber = 1;
      const rowsPerPage = 200;

      while (pageNumber <= 50) {
        const url = `https://api.safe2pay.com.br/v2/BankSlip/List?PageNumber=${pageNumber}&RowsPerPage=${rowsPerPage}&IsPaid=false`;
        console.log(`Fetching Safe2Pay (${conn.nome}) page ${pageNumber}`);

        const resp = await fetch(url, {
          method: 'GET',
          headers: { 'x-api-key': apiToken, 'Accept': 'application/json' },
        });

        if (!resp.ok) {
          console.error(`Safe2Pay API error: ${resp.status}`);
          break;
        }

        const result = await resp.json();
        const items = result?.ResponseDetail?.Objects || [];

        for (const item of items) {
          allItems.push({
            scheduleId: String(item.IdTransaction || item.Id || ''),
            stakeholder: { name: item.Customer?.Name || 'Desconhecido', document: item.Customer?.Identity || '' },
            value: item.Amount || 0,
            dueDate: item.DueDate || '',
            categoryName: 'Safe2Pay',
            _connectionName: conn.nome,
          });
        }

        if (items.length < rowsPerPage) break;
        pageNumber++;
      }
    }

    return new Response(
      JSON.stringify({ items: allItems, count: allItems.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorId = crypto.randomUUID();
    console.error('Error ID:', errorId, 'Details:', error);
    return new Response(
      JSON.stringify({ error: 'Falha ao buscar dados do Safe2Pay. ID: ' + errorId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
