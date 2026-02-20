import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Fetch all open schedules into a map — one paginated bulk call per connection
async function fetchOpenSchedules(apiToken: string, connName: string): Promise<Map<string, { dueDate: string | null }>> {
  const map = new Map<string, { dueDate: string | null }>();
  const headers = { 'ApiToken': apiToken, 'Accept': 'application/json' };
  let skip = 0;
  const top = 500;

  while (true) {
    const url = `https://api.nibo.com.br/empresas/v1/schedules/credit/opened?$top=${top}&$skip=${skip}&$orderby=dueDate`;
    const resp = await fetch(url, { method: 'GET', headers });
    if (!resp.ok) break;
    const data = await resp.json();
    const items = data?.items || (Array.isArray(data) ? data : []);
    for (const item of items) {
      const id = String(item.scheduleId || item.id || '');
      if (!id) continue;
      map.set(id, { dueDate: item.dueDate?.split('T')[0] || null });
    }
    if (items.length < top) break;
    skip += top;
  }
  console.log(`[${connName}] Open schedules: ${map.size}`);
  return map;
}

// Individual lookup — only for boletos NOT found in the open list
async function checkSingleSchedule(
  apiToken: string, scheduleId: string,
): Promise<{ isPaid: boolean; paidDate: string | null; dueDate: string | null; notFound: boolean } | null> {
  const headers = { 'ApiToken': apiToken, 'Accept': 'application/json' };
  const resp = await fetch(`https://api.nibo.com.br/empresas/v1/schedules/credit/${scheduleId}`, { method: 'GET', headers });
  if (resp.status === 404) return { isPaid: false, paidDate: null, dueDate: null, notFound: true };
  if (!resp.ok) return null;
  const item = await resp.json();
  const dueDate = item.dueDate?.split('T')[0] || null;
  const paidValue = Number(item.paidValue ?? 0);
  const openValue = Number(item.openValue ?? item.value ?? 0);
  const writeOffDate = item.writeOffDate?.split('T')[0] || null;
  const isPaid =
    item.isPaid === true ||
    item.status === 'finished' || item.status === 'paid' || item.status === 'pago' || item.status === 'finalizado' ||
    (paidValue > 0 && openValue <= 0) ||
    (writeOffDate !== null && openValue <= 0);
  const paidDate = isPaid ? (writeOffDate || item.paymentDate?.split('T')[0] || dueDate || null) : null;
  return { isPaid, paidDate, dueDate, notFound: false };
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

    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (!orgMember) {
      return new Response(
        JSON.stringify({ error: 'Organização não encontrada.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orgId = orgMember.organization_id;

    // ── Concurrency lock ──────────────────────────────────────────────
    const lockKey = 'nibo_sync_lock';
    const lockTTL = 5 * 60 * 1000; // 5 minutes

    const { data: existingLock } = await supabase
      .from('settings')
      .select('value')
      .eq('key', lockKey)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (existingLock) {
      const lockTime = new Date(existingLock.value).getTime();
      if (Date.now() - lockTime < lockTTL) {
        return new Response(
          JSON.stringify({ message: 'Sincronização já em execução. Tente novamente em alguns minutos.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Set lock
    await supabase.from('settings').upsert({
      key: lockKey,
      value: new Date().toISOString(),
      organization_id: orgId,
    }, { onConflict: 'key,organization_id' });

    try {
      // Fetch all unpaid boletos with nibo_schedule_id (not soft-deleted)
      const { data: boletos, error: boletosError } = await supabase
        .from('boletos')
        .select('id, nibo_schedule_id, vencimento, valor, status')
        .eq('organization_id', orgId)
        .eq('status', 'não pago')
        .not('nibo_schedule_id', 'is', null)
        .is('deleted_at', null);

      if (boletosError) throw new Error('Erro ao buscar boletos: ' + boletosError.message);

      if (!boletos || boletos.length === 0) {
        return new Response(
          JSON.stringify({ updated: 0, unchanged: 0, message: 'Nenhum boleto do Nibo pendente para sincronizar.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: connections } = await supabase
        .from('nibo_connections')
        .select('api_token, nome')
        .eq('organization_id', orgId);

      if (!connections || connections.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Nenhuma conexão Nibo configurada.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Sync starting: ${boletos.length} boletos, ${connections.length} connections`);

      let updated = 0;
      let unchanged = 0;
      let cancelled = 0;
      let dueDateUpdated = 0;
      const syncErrors: { boleto_id: string; nibo_id: string; error: string }[] = [];

      // Process in parallel batches of 20
      const BATCH_SIZE = 20;
      for (let i = 0; i < boletos.length; i += BATCH_SIZE) {
        const batch = boletos.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (boleto) => {
          // ── GUARD: Never modify paid boletos ──
          if (boleto.status === 'pago') return;

          const niboId = String(boleto.nibo_schedule_id);
          let foundInAny = false;
          let notFoundIn404Count = 0;

          for (const conn of connections) {
            try {
              const result = await checkSingleSchedule(conn.api_token, niboId);

              if (!result) {
                // Network/API error — skip this connection, try next
                syncErrors.push({ boleto_id: boleto.id, nibo_id: niboId, error: `timeout/error on ${conn.nome}` });
                continue;
              }

              if (result.notFound) {
                notFoundIn404Count++;
                continue; // Try next connection
              }

              foundInAny = true;

              if (result.isPaid) {
                // ── Mark as paid ──
                const paymentDate = result.paidDate || new Date().toISOString().split('T')[0];
                const { error: updateError } = await supabase
                  .from('boletos')
                  .update({
                    status: 'pago',
                    data_pagamento: paymentDate,
                    nibo_synced_at: new Date().toISOString(),
                  })
                  .eq('id', boleto.id);

                if (!updateError) {
                  updated++;
                  console.log(`PAID: boleto=${boleto.id} nibo=${niboId} date=${paymentDate} conn=${conn.nome}`);
                } else {
                  syncErrors.push({ boleto_id: boleto.id, nibo_id: niboId, error: updateError.message });
                }
              } else {
                // ── Check if due date changed ──
                if (result.dueDate && result.dueDate !== boleto.vencimento) {
                  const { error: upErr } = await supabase
                    .from('boletos')
                    .update({
                      vencimento: result.dueDate,
                      nibo_synced_at: new Date().toISOString(),
                    })
                    .eq('id', boleto.id);

                  if (!upErr) {
                    dueDateUpdated++;
                    console.log(`DUE_DATE: boleto=${boleto.id} ${boleto.vencimento}->${result.dueDate}`);
                  }
                } else {
                  await supabase
                    .from('boletos')
                    .update({ nibo_synced_at: new Date().toISOString() })
                    .eq('id', boleto.id);
                  unchanged++;
                }
              }
              break; // Found in this connection, stop checking others
            } catch (err: any) {
              syncErrors.push({ boleto_id: boleto.id, nibo_id: niboId, error: err.message });
            }
          }

          // If 404 in ALL connections → boleto was removed from Nibo → mark as cancelled
          if (!foundInAny && notFoundIn404Count === connections.length) {
            // ── GUARD: Never cancel paid boletos ──
            if (boleto.status === 'pago') return;

            const { error: cancelError } = await supabase
              .from('boletos')
              .update({
                status: 'cancelado',
                nibo_deleted_at: new Date().toISOString(),
                nibo_synced_at: new Date().toISOString(),
              })
              .eq('id', boleto.id);

            if (!cancelError) {
              cancelled++;
              console.log(`CANCELLED: boleto=${boleto.id} nibo=${niboId} (removed from Nibo)`);
            }
          }
        }));
      }

      const durationMs = Date.now() - startTime;

      // Log to audit_logs
      await supabase.from('audit_logs').insert({
        organization_id: orgId,
        user_id: userId,
        action: 'nibo_sync',
        details: {
          triggered_by: userId,
          boletos_checked: boletos.length,
          updated_paid: updated,
          updated_due_date: dueDateUpdated,
          cancelled,
          unchanged,
          errors: syncErrors,
          duration_ms: durationMs,
        },
      });

      console.log(`Sync done: updated=${updated}, unchanged=${unchanged}, cancelled=${cancelled}, dueDateUpdated=${dueDateUpdated}, errors=${syncErrors.length}, ms=${durationMs}`);

      return new Response(
        JSON.stringify({ updated, unchanged, cancelled, dueDateUpdated, total: boletos.length, errors: syncErrors }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } finally {
      // Always release lock
      await supabase.from('settings').delete()
        .eq('key', lockKey)
        .eq('organization_id', orgId);
    }
  } catch (error) {
    const errorId = crypto.randomUUID();
    console.error('Error ID:', errorId, 'Details:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao sincronizar. ID: ' + errorId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
