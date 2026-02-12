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

    // Get Nibo API token from settings
    const { data: setting, error: settingError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'nibo_api_token')
      .single();

    if (settingError || !setting) {
      return new Response(
        JSON.stringify({ error: 'Token do Nibo não configurado. Vá em Configurações para adicionar.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiToken = setting.value;

    // Calculate yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Fetch overdue receivables from Nibo (credit/opened with dueDate filter)
    // Using OData filter for dueDate <= yesterday
    const filter = `dueDate le ${yesterdayStr}`;
    const niboUrl = `https://api.nibo.com.br/empresas/v1/schedules/credit/opened?$filter=${encodeURIComponent(filter)}&$orderby=dueDate&$top=500`;

    console.log('Fetching from Nibo:', niboUrl);

    const niboResponse = await fetch(niboUrl, {
      method: 'GET',
      headers: {
        'ApiToken': apiToken,
        'Accept': 'application/json',
      },
    });

    if (!niboResponse.ok) {
      const errorText = await niboResponse.text();
      console.error('Nibo API error:', niboResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Erro na API do Nibo [${niboResponse.status}]: ${errorText}` }),
        { status: niboResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const niboData = await niboResponse.json();
    console.log('Nibo response count:', niboData.count || niboData.items?.length);

    return new Response(
      JSON.stringify(niboData),
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
