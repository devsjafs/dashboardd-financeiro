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

    // Strategy: fetch ALL open schedules from Nibo API (includes isPaid field)
    // and also fetch paid/closed schedules via a separate endpoint
    const niboStatusMap = new Map<string, { paid: boolean; paymentDate: string | null; newDueDate: string | null }>();

    for (const conn of connections) {
      const headers: Record<string, string> = {
        'ApiToken': conn.api_token,
        'Accept': 'application/json',
      };

      // Fetch open schedules — these include isPaid, writeOffDate fields
      const openUrl = `https://api.nibo.com.br/empresas/v1/schedules/credit/opened?$top=1000`;
      const openResp = await fetch(openUrl, { method: 'GET', headers });

      if (openResp.ok) {
        const data = await openResp.json();
        const items = data?.items || (Array.isArray(data) ? data : []);
        console.log(`Open schedules from ${conn.nome}:`, items.length);
        if (items.length > 0) {
          console.log(`Sample open item:`, JSON.stringify(items[0]).substring(0, 400));
        }
        for (const item of items) {
          const id = String(item.scheduleId || item.id || '');
          if (!id) continue;
          const dueDate = item.dueDate?.split('T')[0] || null;
          // isPaid flag exists in the opened endpoint too
          const isPaid = item.isPaid === true;
          const paymentDate = isPaid
            ? (item.writeOffDate?.split('T')[0] || item.paymentDate?.split('T')[0] || item.dueDate?.split('T')[0] || new Date().toISOString().split('T')[0])
            : null;
          niboStatusMap.set(id, { paid: isPaid, paymentDate, newDueDate: dueDate });
        }
      } else {
        const errText = await openResp.text();
        console.error(`Nibo open API error for ${conn.nome}:`, openResp.status, errText);
      }

      // Try to also fetch schedules that are fully closed (writeOff done)
      // Nibo endpoint for closed/paid: /schedules/credit with status filter
      const closedUrl = `https://api.nibo.com.br/empresas/v1/schedules/credit?$filter=status eq 'finished'&$top=500`;
      const closedResp = await fetch(closedUrl, { method: 'GET', headers });
      if (closedResp.ok) {
        const data = await closedResp.json();
        const items = data?.items || (Array.isArray(data) ? data : []);
        console.log(`Closed schedules from ${conn.nome}:`, items.length);
        for (const item of items) {
          const id = String(item.scheduleId || item.id || '');
          if (!id) continue;
          const paymentDate =
            item.writeOffDate?.split('T')[0] ||
            item.paymentDate?.split('T')[0] ||
            item.dueDate?.split('T')[0] ||
            new Date().toISOString().split('T')[0];
          niboStatusMap.set(id, { paid: true, paymentDate, newDueDate: null });
        }
      } else {
        const errText = await closedResp.text();
        console.log(`Closed endpoint for ${conn.nome} returned:`, closedResp.status, errText.substring(0, 200));
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
        // Not found in /opened — boleto may have been paid or cancelled in Nibo
        // Try individual lookup using the correct Nibo endpoint
        let paid = false;
        let paymentDate: string | null = null;
        let foundIndividual = false;

        for (const conn of connections) {
          try {
            // Try different possible endpoints for individual schedule
            const endpoints = [
              `https://api.nibo.com.br/empresas/v1/schedules/${niboId}`,
              `https://api.nibo.com.br/empresas/v1/schedules/credit/${niboId}`,
            ];

            for (const url of endpoints) {
              const resp = await fetch(url, {
                method: 'GET',
                headers: { 'ApiToken': conn.api_token, 'Accept': 'application/json' },
              });

              if (!resp.ok) {
                const txt = await resp.text();
                console.log(`Endpoint ${url} returned ${resp.status}:`, txt.substring(0, 100));
                continue;
              }

              const data = await resp.json();
              foundIndividual = true;
              console.log(`Individual lookup success for ${niboId} at ${url}:`, JSON.stringify(data).substring(0, 500));

              // Check isPaid field (same as in /opened response)
              if (data?.isPaid === true || data?.paidValue > 0) {
                paid = true;
                paymentDate =
                  data?.writeOffDate?.split('T')[0] ||
                  data?.paymentDate?.split('T')[0] ||
                  data?.dueDate?.split('T')[0] ||
                  new Date().toISOString().split('T')[0];
              }
              break;
            }

            if (foundIndividual) break;
          } catch (e) {
            console.error(`Error looking up ${niboId}:`, e);
            continue;
          }
        }

        if (!foundIndividual) {
          // Not found anywhere — may have been deleted in Nibo, skip
          console.log(`Schedule ${niboId} not found in any Nibo endpoint — may be deleted`);
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
