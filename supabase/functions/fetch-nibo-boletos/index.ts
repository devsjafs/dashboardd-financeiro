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
    // --- Authentication ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Use anon client with user's token to validate the JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

    // Use service role client for privileged DB access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's organization
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (orgError || !orgMember) {
      return new Response(
        JSON.stringify({ error: 'Organization not found for user.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orgId = orgMember.organization_id;

    // Get connection_id from request body
    const body = await req.json().catch(() => ({}));
    const connectionId = body.connection_id; // optional, if not provided fetch all

    let connections: any[] = [];

    if (connectionId) {
      const { data, error } = await supabase
        .from('nibo_connections')
        .select('*')
        .eq('id', connectionId)
        .eq('organization_id', orgId)
        .single();
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Conexão não encontrada.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      connections = [data];
    } else {
      const { data, error } = await supabase
        .from('nibo_connections')
        .select('*')
        .eq('organization_id', orgId);
      if (error || !data || data.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Nenhuma conexão Nibo configurada. Vá em Configurações para adicionar.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      connections = data;
    }

    const allItems: any[] = [];

    for (const conn of connections) {
      const apiToken = conn.api_token;
      const niboUrl = `https://api.nibo.com.br/empresas/v1/schedules/credit/opened?$orderby=dueDate&$top=500`;

      console.log(`Fetching from Nibo (${conn.nome}):`, niboUrl);

      const headers: Record<string, string> = {
        'ApiToken': apiToken,
        'Accept': 'application/json',
      };

      const niboResponse = await fetch(niboUrl, { method: 'GET', headers });

      if (!niboResponse.ok) {
        const errorText = await niboResponse.text();
        console.error(`Nibo API error for ${conn.nome}:`, niboResponse.status, errorText);
        continue; // Skip failed connections, don't abort all
      }

      const niboData = await niboResponse.json();
      const items = niboData?.items || niboData || [];
      if (Array.isArray(items)) {
        if (items.length > 0) {
          console.log(`Sample item keys for ${conn.nome}:`, JSON.stringify(Object.keys(items[0])));
          console.log(`Sample stakeholder for ${conn.nome}:`, JSON.stringify(items[0].stakeholder));
        }
        allItems.push(...items.map((item: any) => ({ ...item, _connectionName: conn.nome })));
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
      JSON.stringify({ error: 'Falha ao buscar dados do Nibo. Entre em contato com o suporte informando o ID: ' + errorId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
