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

    const query = supabase.from('billing_connections').select('*').eq('organization_id', orgId).eq('provider', 'contaazul');
    if (connectionId) query.eq('id', connectionId);
    const { data: connections } = await query;

    if (!connections || connections.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhuma conexão Conta Azul configurada. Vá em Configurações para adicionar.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const allItems: any[] = [];

    for (const conn of connections) {
      const accessToken = conn.api_token || conn.api_key;
      let page = 1;
      const size = 50;

      while (page <= 200) {
        const url = `https://api.contaazul.com/v1/receivables?page=${page}&size=${size}`;
        console.log(`Fetching Conta Azul (${conn.nome}) page ${page}`);

        const resp = await fetch(url, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
        });

        if (!resp.ok) {
          console.error(`Conta Azul API error: ${resp.status}`);
          break;
        }

        const items: any[] = await resp.json();

        for (const item of items) {
          if (item.status === 'RECEIVED') continue; // skip already paid
          allItems.push({
            scheduleId: String(item.id || ''),
            stakeholder: { name: item.customer?.name || 'Desconhecido', document: item.customer?.document || '' },
            value: item.value || 0,
            dueDate: item.due_date || '',
            categoryName: 'Conta Azul',
            _connectionName: conn.nome,
          });
        }

        if (items.length < size) break;
        page++;
      }
    }

    return new Response(
      JSON.stringify({ items: allItems, count: allItems.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorId = crypto.randomUUID();
    console.error('Error ID:', errorId, error);
    return new Response(JSON.stringify({ error: 'Falha ao buscar dados do Conta Azul. ID: ' + errorId }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
