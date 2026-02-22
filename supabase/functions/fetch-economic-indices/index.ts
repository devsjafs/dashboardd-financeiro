import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// BCB series: IPCA = 433, IGP-M = 189
async function fetchBCBSeries(seriesId: number): Promise<{ data: Array<{ date: string; value: number }>; accumulated: number }> {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesId}/dados/ultimos/12?formato=json`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`BCB API error for series ${seriesId}: ${resp.status}`);
  const raw: Array<{ data: string; valor: string }> = await resp.json();

  const data = raw.map(item => ({
    date: item.data, // dd/mm/yyyy format
    value: parseFloat(item.valor),
  }));

  // Calculate accumulated: product of (1 + value/100) - 1
  const accumulated = data.reduce((acc, item) => acc * (1 + item.value / 100), 1) - 1;

  return { data, accumulated: Math.round(accumulated * 10000) / 100 }; // 2 decimal places as percentage
}

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

    // Check cache (24h TTL)
    const cacheKey = 'economic_indices_cache';
    const { data: cached } = await supabase.from('settings').select('value, updated_at').eq('key', cacheKey).eq('organization_id', orgId).maybeSingle();

    if (cached) {
      const cacheAge = Date.now() - new Date(cached.updated_at).getTime();
      if (cacheAge < 24 * 60 * 60 * 1000) {
        try {
          const parsed = JSON.parse(cached.value);
          return new Response(JSON.stringify(parsed), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch { /* cache invalid, refetch */ }
      }
    }

    // Fetch from BCB
    const [ipca, igpm] = await Promise.all([
      fetchBCBSeries(433),
      fetchBCBSeries(189),
    ]);

    const result = {
      ipca: { monthly: ipca.data, accumulated12m: ipca.accumulated },
      igpm: { monthly: igpm.data, accumulated12m: igpm.accumulated },
      fetchedAt: new Date().toISOString(),
    };

    // Save to cache
    await supabase.from('settings').upsert({
      key: cacheKey,
      value: JSON.stringify(result),
      organization_id: orgId,
    }, { onConflict: 'key,organization_id' });

    return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    const errorId = crypto.randomUUID();
    console.error('Error ID:', errorId, error);
    return new Response(JSON.stringify({ error: 'Erro ao buscar índices econômicos. ID: ' + errorId }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
