import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Fetch receipts from Nibo /receipts, filtering by date range to reduce load
async function fetchReceipts(apiToken: string, connName: string): Promise<Map<string, string>> {
  // scheduleId -> paymentDate
  const paidMap = new Map<string, string>();
  const headers = { 'ApiToken': apiToken, 'Accept': 'application/json' };

  // Fetch receipts paginated - Nibo ignores orderby, returns oldest first
  // Fetch last page by using high skip to get most recent entries
  // Strategy: fetch total count first, then skip to near-end
  const countUrl = `https://api.nibo.com.br/empresas/v1/receipts?$top=1&$inlinecount=allpages`;
  const countResp = await fetch(countUrl, { method: 'GET', headers });
  let skip = 0;
  if (countResp.ok) {
    const countData = await countResp.json();
    const total = countData?.count || countData?.['@odata.count'] || 0;
    skip = Math.max(0, total - 500); // get last 500
    console.log(`[${connName}] Receipts total: ${total}, skip: ${skip}`);
  }
  const url = `https://api.nibo.com.br/empresas/v1/receipts?$top=500&$skip=${skip}`;
  const resp = await fetch(url, { method: 'GET', headers });

  if (resp.ok) {
    const data = await resp.json();
    const items = data?.items || (Array.isArray(data) ? data : []);
    console.log(`[${connName}] Receipts (last 90d): ${items.length}`);

    for (const item of items) {
      const paymentDate = item.date?.split('T')[0] || new Date().toISOString().split('T')[0];
      if (item.scheduleId) {
        paidMap.set(String(item.scheduleId), paymentDate);
      }
      if (Array.isArray(item.schedules)) {
        for (const s of item.schedules) {
          const sid = String(s.scheduleId || s.id || '');
          if (sid) paidMap.set(sid, paymentDate);
        }
      }
    }
  } else {
    const errText = await resp.text();
    console.log(`[${connName}] Receipts error ${resp.status}: ${errText.substring(0, 200)}`);
  }

  return paidMap;
}

// Fetch open schedules from Nibo, returns map of scheduleId -> { isPaid, dueDate, paidDate }
async function fetchOpenSchedules(apiToken: string, connName: string): Promise<Map<string, { isPaid: boolean; dueDate: string | null; paidDate: string | null }>> {
  const map = new Map<string, { isPaid: boolean; dueDate: string | null; paidDate: string | null }>();
  const headers = { 'ApiToken': apiToken, 'Accept': 'application/json' };

  const url = `https://api.nibo.com.br/empresas/v1/schedules/credit/opened?$top=2000`;
  const resp = await fetch(url, { method: 'GET', headers });

  if (resp.ok) {
    const data = await resp.json();
    const items = data?.items || (Array.isArray(data) ? data : []);
    console.log(`[${connName}] Open schedules: ${items.length}`);

    for (const item of items) {
      const id = String(item.scheduleId || item.id || '');
      if (!id) continue;

      const dueDate = item.dueDate?.split('T')[0] || null;
      const paidValue = item.paidValue || 0;
      const openValue = item.openValue ?? item.value ?? 0;
      const isPaid = item.isPaid === true || (paidValue > 0 && openValue <= 0);
      const paidDate = isPaid
        ? (item.writeOffDate?.split('T')[0] || item.paymentDate?.split('T')[0] || dueDate)
        : null;

      map.set(id, { isPaid, dueDate, paidDate });
    }
  } else {
    const errText = await resp.text();
    console.log(`[${connName}] Open schedules error ${resp.status}: ${errText.substring(0, 200)}`);
  }

  return map;
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

    // Fetch all data in parallel for all connections
    const allFetches = connections.flatMap(conn => [
      fetchReceipts(conn.api_token, conn.nome),
      fetchOpenSchedules(conn.api_token, conn.nome),
    ]);

    const results = await Promise.all(allFetches);

    // Merge results: paid receipts take priority, then open schedules
    // results alternates: [receipts0, openSchedules0, receipts1, openSchedules1, ...]
    const mergedPaid = new Map<string, string>(); // scheduleId -> paymentDate
    const mergedOpen = new Map<string, { isPaid: boolean; dueDate: string | null; paidDate: string | null }>();

    for (let i = 0; i < results.length; i += 2) {
      const receipts = results[i] as Map<string, string>;
      const open = results[i + 1] as Map<string, { isPaid: boolean; dueDate: string | null; paidDate: string | null }>;

      for (const [sid, date] of receipts) {
        if (!mergedPaid.has(sid)) mergedPaid.set(sid, date);
      }

      for (const [sid, data] of open) {
        if (!mergedOpen.has(sid)) mergedOpen.set(sid, data);
        if (data.isPaid && !mergedPaid.has(sid)) {
          mergedPaid.set(sid, data.paidDate || new Date().toISOString().split('T')[0]);
        }
      }
    }

    console.log(`mergedPaid: ${mergedPaid.size}, mergedOpen: ${mergedOpen.size}`);

    let updated = 0;
    let unchanged = 0;
    let notFound = 0;
    let dueDateUpdated = 0;

    for (const boleto of boletos) {
      const niboId = String(boleto.nibo_schedule_id);

      if (mergedPaid.has(niboId)) {
        const paymentDate = mergedPaid.get(niboId)!;
        const { error: updateError } = await supabase
          .from('boletos')
          .update({ status: 'pago', data_pagamento: paymentDate })
          .eq('id', boleto.id);

        if (!updateError) {
          updated++;
          console.log(`Boleto ${boleto.id}: PAID on ${paymentDate}`);
        }
      } else if (mergedOpen.has(niboId)) {
        const openData = mergedOpen.get(niboId)!;
        // Not paid — check due date change
        if (openData.dueDate && openData.dueDate !== boleto.vencimento) {
          console.log(`Due date changed: ${boleto.vencimento} -> ${openData.dueDate}`);
          const { error: updateError } = await supabase
            .from('boletos')
            .update({ vencimento: openData.dueDate })
            .eq('id', boleto.id);
          if (!updateError) dueDateUpdated++;
        }
        unchanged++;
      } else {
        // Not found in either map — deleted in Nibo or different connection
        notFound++;
        console.log(`Boleto ${boleto.id} schedule ${niboId}: not found in Nibo`);
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
