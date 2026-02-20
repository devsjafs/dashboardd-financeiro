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

    // Get user's organization
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

    // Get all unpaid boletos that have a nibo_schedule_id
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

    // Get all Nibo connections for this org
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

    // Strategy: fetch ALL schedules (open + recently finished) from Nibo API
    // and build a lookup map by scheduleId
    const niboStatusMap = new Map<string, { paid: boolean; paymentDate: string | null; newDueDate: string | null }>();

    for (const conn of connections) {
      // Fetch open schedules
      const openUrl = `https://api.nibo.com.br/empresas/v1/schedules/credit/opened?$top=1000`;
      // Fetch finished/paid schedules (last 90 days)
      const finishedUrl = `https://api.nibo.com.br/empresas/v1/schedules/credit/finished?$top=1000`;

      const headers: Record<string, string> = {
        'ApiToken': conn.api_token,
        'Accept': 'application/json',
      };

      const [openResp, finishedResp] = await Promise.allSettled([
        fetch(openUrl, { method: 'GET', headers }),
        fetch(finishedUrl, { method: 'GET', headers }),
      ]);

      // Process open schedules (may have changed due date)
      if (openResp.status === 'fulfilled' && openResp.value.ok) {
        const data = await openResp.value.json();
        const items = data?.items || (Array.isArray(data) ? data : []);
        console.log(`Open schedules from ${conn.nome}:`, items.length);
        for (const item of items) {
          const id = String(item.scheduleId || item.id || '');
          if (!id) continue;
          const dueDate = item.dueDate?.split('T')[0] || null;
          niboStatusMap.set(id, { paid: false, paymentDate: null, newDueDate: dueDate });
        }
      } else if (openResp.status === 'fulfilled') {
        const errText = await openResp.value.text();
        console.error(`Nibo open API error for ${conn.nome}:`, openResp.value.status, errText);
      }

      // Process finished/paid schedules
      if (finishedResp.status === 'fulfilled' && finishedResp.value.ok) {
        const data = await finishedResp.value.json();
        const items = data?.items || (Array.isArray(data) ? data : []);
        console.log(`Finished schedules from ${conn.nome}:`, items.length);
        for (const item of items) {
          const id = String(item.scheduleId || item.id || '');
          if (!id) continue;
          // paymentDate or dueDate as fallback
          const paymentDate =
            item.paymentDate?.split('T')[0] ||
            item.paidDate?.split('T')[0] ||
            item.dueDate?.split('T')[0] ||
            new Date().toISOString().split('T')[0];
          niboStatusMap.set(id, { paid: true, paymentDate, newDueDate: null });
        }
      } else if (finishedResp.status === 'fulfilled') {
        const errText = await finishedResp.value.text();
        console.error(`Nibo finished API error for ${conn.nome}:`, finishedResp.value.status, errText);
      }
    }

    console.log(`Nibo status map size: ${niboStatusMap.size}`);
    console.log(`Boletos to check: ${boletos.length}`);

    let updated = 0;
    let unchanged = 0;
    let notFound = 0;
    let dueDateUpdated = 0;

    for (const boleto of boletos) {
      const niboId = String(boleto.nibo_schedule_id);
      const niboData = niboStatusMap.get(niboId);

      if (!niboData) {
        // Not found in open or finished — try individual lookup as fallback
        let paid = false;
        let paymentDate: string | null = null;
        let foundIndividual = false;

        for (const conn of connections) {
          try {
            const url = `https://api.nibo.com.br/empresas/v1/schedules/credit/${niboId}`;
            const resp = await fetch(url, {
              method: 'GET',
              headers: { 'ApiToken': conn.api_token, 'Accept': 'application/json' },
            });

            if (!resp.ok) {
              await resp.text();
              continue;
            }

            const data = await resp.json();
            foundIndividual = true;
            console.log(`Individual lookup for ${niboId}:`, JSON.stringify(data).substring(0, 300));

            const status = data?.status || data?.scheduleStatus || data?.statusName || '';
            const statusLower = status.toLowerCase();
            if (statusLower === 'finished' || statusLower === 'paid' || statusLower === 'pago' || statusLower === 'finalizado') {
              paid = true;
              paymentDate =
                data?.paymentDate?.split('T')[0] ||
                data?.paidDate?.split('T')[0] ||
                data?.dueDate?.split('T')[0] ||
                new Date().toISOString().split('T')[0];
            }
            break;
          } catch {
            continue;
          }
        }

        if (!foundIndividual) {
          notFound++;
          continue;
        }

        if (paid) {
          const { error: updateError } = await supabase
            .from('boletos')
            .update({ status: 'pago', data_pagamento: paymentDate })
            .eq('id', boleto.id);

          if (!updateError) updated++;
        } else {
          unchanged++;
        }
        continue;
      }

      if (niboData.paid) {
        const { error: updateError } = await supabase
          .from('boletos')
          .update({ status: 'pago', data_pagamento: niboData.paymentDate })
          .eq('id', boleto.id);

        if (!updateError) {
          updated++;
        }
      } else {
        // Check if due date changed
        if (niboData.newDueDate && niboData.newDueDate !== boleto.vencimento) {
          console.log(`Due date changed for ${niboId}: ${boleto.vencimento} -> ${niboData.newDueDate}`);
          const { error: updateError } = await supabase
            .from('boletos')
            .update({ vencimento: niboData.newDueDate })
            .eq('id', boleto.id);

          if (!updateError) dueDateUpdated++;
        }
        unchanged++;
      }
    }

    console.log(`Sync result: updated=${updated}, unchanged=${unchanged}, notFound=${notFound}, dueDateUpdated=${dueDateUpdated}`);

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
