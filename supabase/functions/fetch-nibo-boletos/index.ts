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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get connection_id from request body
    const body = await req.json().catch(() => ({}));
    const connectionId = body.connection_id; // optional, if not provided fetch all

    let connections: any[] = [];

    if (connectionId) {
      const { data, error } = await supabase
        .from('nibo_connections')
        .select('*')
        .eq('id', connectionId)
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
        .select('*');
      if (error || !data || data.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Nenhuma conexão Nibo configurada. Vá em Configurações para adicionar.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      connections = data;
    }

    // Calculate yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const allItems: any[] = [];

    for (const conn of connections) {
      const apiToken = conn.api_token;
      const filter = `dueDate le ${yesterdayStr}`;
      const niboUrl = `https://api.nibo.com.br/empresas/v1/schedules/credit/opened?$filter=${encodeURIComponent(filter)}&$orderby=dueDate&$top=500`;

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
        allItems.push(...items.map((item: any) => ({ ...item, _connectionName: conn.nome })));
      }
    }

    return new Response(
      JSON.stringify({ items: allItems, count: allItems.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
