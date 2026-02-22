import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

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

    const { data: orgMember } = await supabase.from('organization_members').select('organization_id').eq('user_id', userId).limit(1).maybeSingle();
    if (!orgMember) return new Response(JSON.stringify({ error: 'Organização não encontrada.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const orgId = orgMember.organization_id;
    const body = await req.json().catch(() => ({}));
    const connectionId = body.connection_id;

    const query = supabase.from('billing_connections').select('*').eq('organization_id', orgId).eq('provider', 'asaas');
    if (connectionId) query.eq('id', connectionId);
    const { data: connections } = await query;

    if (!connections || connections.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhuma conexão Asaas configurada. Vá em Configurações para adicionar.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const allItems: any[] = [];

    for (const conn of connections) {
      const apiKey = conn.api_token || conn.api_key;
      // Determine if sandbox based on extra_config
      const isSandbox = conn.extra_config?.sandbox === true;
      const baseUrl = isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
      let offset = 0;
      const limit = 100;

      while (offset < 10000) {
        const url = `${baseUrl}/payments?status=PENDING&billingType=BOLETO&offset=${offset}&limit=${limit}`;
        console.log(`Fetching Asaas (${conn.nome}) offset ${offset}`);

        const resp = await fetch(url, {
          method: 'GET',
          headers: { 'access_token': apiKey, 'Accept': 'application/json' },
        });

        if (!resp.ok) {
          console.error(`Asaas API error: ${resp.status}`);
          break;
        }

        const result = await resp.json();
        const items = result?.data || [];

        for (const item of items) {
          allItems.push({
            scheduleId: String(item.id || ''),
            stakeholder: { name: item.customer || 'Desconhecido', document: '' },
            stakeholderName: item.customerName || item.customer || 'Desconhecido',
            value: item.value || 0,
            dueDate: item.dueDate || '',
            categoryName: 'Asaas',
            _connectionName: conn.nome,
          });
        }

        if (!result.hasMore || items.length < limit) break;
        offset += limit;
      }
    }

    return new Response(
      JSON.stringify({ items: allItems, count: allItems.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorId = crypto.randomUUID();
    console.error('Error ID:', errorId, error);
    return new Response(JSON.stringify({ error: 'Falha ao buscar dados do Asaas. ID: ' + errorId }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
