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
      .select('id, nibo_schedule_id, client_id')
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

    let updated = 0;
    let unchanged = 0;
    let errors = 0;

    for (const boleto of boletos) {
      const niboId = boleto.nibo_schedule_id;
      let paid = false;
      let paymentDate: string | null = null;
      let foundInAnyConn = false;

      for (const conn of connections) {
        try {
          const url = `https://api.nibo.com.br/empresas/v1/schedules/credit/${niboId}`;
          const resp = await fetch(url, {
            method: 'GET',
            headers: { 'ApiToken': conn.api_token, 'Accept': 'application/json' },
          });

          if (!resp.ok) {
            await resp.text(); // consume body
            continue;
          }

          const data = await resp.json();
          foundInAnyConn = true;

          // Nibo statuses: "open", "finished", "cancelled"
          const status = data?.status || data?.scheduleStatus || '';
          if (status === 'finished' || status === 'paid') {
            paid = true;
            paymentDate = data?.paymentDate?.split('T')[0] || data?.dueDate?.split('T')[0] || new Date().toISOString().split('T')[0];
          }
          break; // found in this connection, no need to try others
        } catch {
          continue;
        }
      }

      if (!foundInAnyConn) {
        errors++;
        continue;
      }

      if (paid) {
        const { error: updateError } = await supabase
          .from('boletos')
          .update({ status: 'pago', data_pagamento: paymentDate })
          .eq('id', boleto.id);

        if (!updateError) {
          updated++;
        } else {
          errors++;
        }
      } else {
        unchanged++;
      }
    }

    return new Response(
      JSON.stringify({ updated, unchanged, errors, total: boletos.length }),
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
