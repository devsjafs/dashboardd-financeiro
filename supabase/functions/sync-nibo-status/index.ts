import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Fetch all open credit schedules (paginated) — returns map of scheduleId -> { dueDate }
async function fetchOpenSchedules(apiToken: string, connName: string): Promise<Map<string, { dueDate: string | null }>> {
  const map = new Map<string, { dueDate: string | null }>();
  const headers = { 'ApiToken': apiToken, 'Accept': 'application/json' };
  let skip = 0;
  const top = 500;

  while (true) {
    const url = `https://api.nibo.com.br/empresas/v1/schedules/credit/opened?$top=${top}&$skip=${skip}&$orderby=dueDate`;
    const resp = await fetch(url, { method: 'GET', headers });

    if (!resp.ok) {
      const errText = await resp.text();
      console.log(`[${connName}] Open schedules error ${resp.status}: ${errText.substring(0, 200)}`);
      break;
    }

    const data = await resp.json();
    const items = data?.items || (Array.isArray(data) ? data : []);

    for (const item of items) {
      const id = String(item.scheduleId || item.id || '');
      if (!id) continue;
      const dueDate = item.dueDate?.split('T')[0] || null;
      map.set(id, { dueDate });
    }

    if (items.length < top) break; // last page
    skip += top;
  }

  console.log(`[${connName}] Total open schedules fetched: ${map.size}`);
  return map;
}

// Check a single schedule to see if it was paid
// Returns null if not found or error, or { isPaid, paidDate, dueDate }
async function checkSingleSchedule(
  apiToken: string,
  scheduleId: string
): Promise<{ isPaid: boolean; paidDate: string | null; dueDate: string | null } | null> {
  const headers = { 'ApiToken': apiToken, 'Accept': 'application/json' };

  // Try the credit schedule endpoint
  const url = `https://api.nibo.com.br/empresas/v1/schedules/credit/${scheduleId}`;
  const resp = await fetch(url, { method: 'GET', headers });

  if (!resp.ok) return null;

  const item = await resp.json();

  const dueDate = item.dueDate?.split('T')[0] || null;
  const paidValue = item.paidValue || 0;
  const openValue = item.openValue ?? item.value ?? 0;
  const isPaid =
    item.isPaid === true ||
    item.status === 'finished' ||
    item.status === 'paid' ||
    item.status === 'pago' ||
    item.status === 'finalizado' ||
    (paidValue > 0 && openValue <= 0);

  const paidDate = isPaid
    ? (item.writeOffDate?.split('T')[0] || item.paymentDate?.split('T')[0] || dueDate)
    : null;

  return { isPaid, paidDate, dueDate };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (orgError || !orgMember) {
      return new Response(
        JSON.stringify({ error: 'Organização não encontrada.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orgId = orgMember.organization_id;

    // Fetch unpaid boletos with a nibo_schedule_id
    const { data: boletos, error: boletosError } = await supabase
      .from('boletos')
      .select('id, nibo_schedule_id, vencimento, valor')
      .eq('organization_id', orgId)
      .eq('status', 'não pago')
      .not('nibo_schedule_id', 'is', null);

    if (boletosError) {
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar boletos.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!boletos || boletos.length === 0) {
      return new Response(
        JSON.stringify({ updated: 0, unchanged: 0, message: 'Nenhum boleto do Nibo pendente para sincronizar.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: connections, error: connError } = await supabase
      .from('nibo_connections')
      .select('api_token, nome')
      .eq('organization_id', orgId);

    if (connError || !connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma conexão Nibo configurada.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch open schedules from ALL connections in parallel
    const openMaps = await Promise.all(
      connections.map(conn => fetchOpenSchedules(conn.api_token, conn.nome))
    );

    // Merge all open maps into one
    const mergedOpen = new Map<string, { dueDate: string | null }>();
    for (const openMap of openMaps) {
      for (const [sid, data] of openMap) {
        if (!mergedOpen.has(sid)) mergedOpen.set(sid, data);
      }
    }

    console.log(`Total merged open schedules: ${mergedOpen.size}, boletos to check: ${boletos.length}`);

    let updated = 0;
    let unchanged = 0;
    let notFound = 0;
    let dueDateUpdated = 0;

    for (const boleto of boletos) {
      const niboId = String(boleto.nibo_schedule_id);

      if (mergedOpen.has(niboId)) {
        // Still open in Nibo — check if due date changed
        const openData = mergedOpen.get(niboId)!;
        if (openData.dueDate && openData.dueDate !== boleto.vencimento) {
          console.log(`Due date changed for ${boleto.id}: ${boleto.vencimento} -> ${openData.dueDate}`);
          const { error: updateError } = await supabase
            .from('boletos')
            .update({ vencimento: openData.dueDate })
            .eq('id', boleto.id);
          if (!updateError) dueDateUpdated++;
        }
        unchanged++;
      } else {
        // Not in open list — might be paid or deleted. Check individually across all connections.
        let found = false;

        for (const conn of connections) {
          const result = await checkSingleSchedule(conn.api_token, niboId);
          if (!result) continue; // 404 or error on this connection

          found = true;

          if (result.isPaid) {
            const paymentDate = result.paidDate || new Date().toISOString().split('T')[0];
            const { error: updateError } = await supabase
              .from('boletos')
              .update({ status: 'pago', data_pagamento: paymentDate })
              .eq('id', boleto.id);

            if (!updateError) {
              updated++;
              console.log(`Boleto ${boleto.id} (${niboId}): PAID on ${paymentDate} via ${conn.nome}`);
            }
          } else {
            // Found but not paid — check due date
            if (result.dueDate && result.dueDate !== boleto.vencimento) {
              await supabase
                .from('boletos')
                .update({ vencimento: result.dueDate })
                .eq('id', boleto.id);
              dueDateUpdated++;
            }
            unchanged++;
          }
          break; // Found in this connection, no need to check others
        }

        if (!found) {
          notFound++;
          console.log(`Boleto ${boleto.id} schedule ${niboId}: not found in any Nibo connection`);
        }
      }
    }

    console.log(`Result: updated=${updated}, unchanged=${unchanged}, notFound=${notFound}, dueDateUpdated=${dueDateUpdated}`);

    return new Response(
      JSON.stringify({ updated, unchanged, notFound, dueDateUpdated, total: boletos.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorId = crypto.randomUUID();
    console.error('Error ID:', errorId, 'Details:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao sincronizar. Contate o suporte informando o ID: ' + errorId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
