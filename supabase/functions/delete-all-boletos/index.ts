import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CHUNK_SIZE = 100;

async function chunkArray<T>(arr: T[], size: number): Promise<T[][]> {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
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

    // Validate JWT
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get org + validate role (owner or admin only)
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (!orgMember) {
      return new Response(
        JSON.stringify({ error: 'Organização não encontrada.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { organization_id: orgId, role } = orgMember;

    if (!['owner', 'admin'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Permissão negada. Apenas owners e admins podem executar esta ação.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse body — optional month filter
    const body = await req.json().catch(() => ({}));
    const monthFilter: string | null = body.month_filter || null; // format: 'YYYY-MM'

    // Fetch all non-deleted boletos
    let query = supabase
      .from('boletos')
      .select('id, status')
      .eq('organization_id', orgId)
      .is('deleted_at', null);

    if (monthFilter) {
      // Filter by month: vencimento starts with YYYY-MM
      query = query.gte('vencimento', `${monthFilter}-01`).lte('vencimento', `${monthFilter}-31`);
    }

    const { data: boletos, error: fetchError } = await query;

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar boletos.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!boletos || boletos.length === 0) {
      return new Response(
        JSON.stringify({ hard_deleted: 0, soft_deleted: 0, total: 0, errors: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Separate paid (soft delete) from unpaid (hard delete)
    const paidIds = boletos.filter(b => b.status === 'pago').map(b => b.id);
    const unpaidIds = boletos.filter(b => b.status !== 'pago').map(b => b.id);

    let softDeleted = 0;
    let hardDeleted = 0;
    const errors: string[] = [];

    // Soft delete paid boletos in chunks
    const paidChunks = await chunkArray(paidIds, CHUNK_SIZE);
    for (const chunk of paidChunks) {
      const { error } = await supabase
        .from('boletos')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', chunk);
      if (error) {
        console.error('Soft delete error:', error.message);
        errors.push(`soft_delete_chunk: ${error.message}`);
      } else {
        softDeleted += chunk.length;
      }
    }

    // Hard delete unpaid boletos in chunks
    const unpaidChunks = await chunkArray(unpaidIds, CHUNK_SIZE);
    for (const chunk of unpaidChunks) {
      const { error } = await supabase
        .from('boletos')
        .delete()
        .in('id', chunk);
      if (error) {
        console.error('Hard delete error:', error.message);
        errors.push(`hard_delete_chunk: ${error.message}`);
      } else {
        hardDeleted += chunk.length;
      }
    }

    const durationMs = Date.now() - startTime;

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      organization_id: orgId,
      user_id: userId,
      action: 'delete_all_boletos',
      details: {
        month_filter: monthFilter,
        total_found: boletos.length,
        hard_deleted: hardDeleted,
        soft_deleted: softDeleted,
        errors,
        duration_ms: durationMs,
      },
    });

    console.log(`delete-all-boletos: org=${orgId}, user=${userId}, total=${boletos.length}, hard=${hardDeleted}, soft=${softDeleted}, errors=${errors.length}, ms=${durationMs}`);

    return new Response(
      JSON.stringify({ hard_deleted: hardDeleted, soft_deleted: softDeleted, total: boletos.length, errors }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorId = crypto.randomUUID();
    console.error('Error ID:', errorId, 'Details:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno. ID: ' + errorId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
