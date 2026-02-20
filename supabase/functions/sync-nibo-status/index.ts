import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Check a single credit schedule to get its real status
async function checkSingleSchedule(
  apiToken: string,
  scheduleId: string,
  debug = false
): Promise<{ isPaid: boolean; paidDate: string | null; dueDate: string | null } | null> {
  const headers = { 'ApiToken': apiToken, 'Accept': 'application/json' };
  const url = `https://api.nibo.com.br/empresas/v1/schedules/credit/${scheduleId}`;
  const resp = await fetch(url, { method: 'GET', headers });

  if (!resp.ok) return null;

  const item = await resp.json();

  if (debug) {
    console.log(`DEBUG schedule ${scheduleId}: status=${item.status}, isPaid=${item.isPaid}, paidValue=${item.paidValue}, openValue=${item.openValue}, value=${item.value}`);
  }

  const dueDate = item.dueDate?.split('T')[0] || null;
  const paidValue = Number(item.paidValue ?? 0);
  const openValue = Number(item.openValue ?? item.value ?? 0);

  const writeOffDate = item.writeOffDate?.split('T')[0] || null;

  const isPaid =
    item.isPaid === true ||
    item.status === 'finished' ||
    item.status === 'paid' ||
    item.status === 'pago' ||
    item.status === 'finalizado' ||
    (paidValue > 0 && openValue <= 0) ||
    (writeOffDate !== null && openValue <= 0);  // Has a write-off date and nothing open

  const paidDate = isPaid
    ? (writeOffDate || item.paymentDate?.split('T')[0] || item.dueDate?.split('T')[0] || null)
    : null;

  return { isPaid, paidDate, dueDate };
}

// Search Nibo for schedules matching a stakeholder document + value + dueDate
// Used to find the nibo_schedule_id for boletos that don't have it yet
async function searchScheduleByDoc(
  apiToken: string,
  connName: string,
  stakeholderDoc: string,
  value: number,
  dueDate: string
): Promise<{ scheduleId: string; isPaid: boolean; paidDate: string | null } | null> {
  const headers = { 'ApiToken': apiToken, 'Accept': 'application/json' };
  
  // Search in open schedules first
  const openUrl = `https://api.nibo.com.br/empresas/v1/schedules/credit/opened?$top=100&$filter=dueDate eq '${dueDate}'`;
  const openResp = await fetch(openUrl, { method: 'GET', headers });
  
  if (openResp.ok) {
    const openData = await openResp.json();
    const items = openData?.items || (Array.isArray(openData) ? openData : []);
    for (const item of items) {
      const doc = (item.stakeholder?.document || item.stakeholder?.cpfCnpj || '').replace(/\D/g, '');
      const itemValue = Number(item.value ?? 0);
      if (doc === stakeholderDoc && Math.abs(itemValue - value) < 0.01) {
        const id = String(item.scheduleId || item.id || '');
        if (id) return { scheduleId: id, isPaid: false, paidDate: null };
      }
    }
  }

  return null;
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

    // Fetch all unpaid boletos
    const { data: boletos, error: boletosError } = await supabase
      .from('boletos')
      .select('id, nibo_schedule_id, vencimento, valor, client_id')
      .eq('organization_id', orgId)
      .eq('status', 'não pago');

    if (boletosError) {
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar boletos.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!boletos || boletos.length === 0) {
      return new Response(
        JSON.stringify({ updated: 0, unchanged: 0, message: 'Nenhum boleto pendente para sincronizar.' }),
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

    const boletosWithId = boletos.filter(b => b.nibo_schedule_id);
    const boletosWithoutId = boletos.filter(b => !b.nibo_schedule_id);
    console.log(`Boletos with nibo_schedule_id: ${boletosWithId.length}, without: ${boletosWithoutId.length}`);

    let updated = 0;
    let unchanged = 0;
    let notFound = 0;
    let dueDateUpdated = 0;
    let niboIdLinked = 0;

    // --- Process boletos WITH nibo_schedule_id ---
    // Log first 3 for debugging
    let debugCount = 0;
    const BATCH_SIZE = 20;
    for (let i = 0; i < boletosWithId.length; i += BATCH_SIZE) {
      const batch = boletosWithId.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (boleto) => {
        const niboId = String(boleto.nibo_schedule_id);
        const shouldDebug = debugCount++ < 3;

        let found = false;
        for (const conn of connections) {
          const result = await checkSingleSchedule(conn.api_token, niboId, shouldDebug);
          if (!result) continue;

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
            if (result.dueDate && result.dueDate !== boleto.vencimento) {
              const { error: upErr } = await supabase
                .from('boletos')
                .update({ vencimento: result.dueDate })
                .eq('id', boleto.id);
              if (!upErr) {
                dueDateUpdated++;
                console.log(`Due date updated ${boleto.id}: ${boleto.vencimento} -> ${result.dueDate}`);
              }
            }
            unchanged++;
          }
          break;
        }

        if (!found) {
          notFound++;
        }
      }));
    }

    console.log(`Result: updated=${updated}, unchanged=${unchanged}, notFound=${notFound}, dueDateUpdated=${dueDateUpdated}, niboIdLinked=${niboIdLinked}`);

    return new Response(
      JSON.stringify({ updated, unchanged, notFound, dueDateUpdated, total: boletos.length, withoutNiboId: boletosWithoutId.length, niboIdLinked }),
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
