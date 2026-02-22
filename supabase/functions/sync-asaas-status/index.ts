import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function checkAsaasPayment(apiKey: string, paymentId: string, isSandbox: boolean): Promise<{ isPaid: boolean; paidDate: string | null; dueDate: string | null; notFound: boolean } | null> {
  const baseUrl = isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
  const resp = await fetch(`${baseUrl}/payments/${paymentId}`, {
    method: 'GET',
    headers: { 'access_token': apiKey, 'Accept': 'application/json' },
  });
  if (resp.status === 404) return { isPaid: false, paidDate: null, dueDate: null, notFound: true };
  if (!resp.ok) return null;
  const item = await resp.json();
  const dueDate = item.dueDate || null;
  // RECEIVED, CONFIRMED = pago; REFUNDED, DELETED = cancelado
  const isPaid = item.status === 'RECEIVED' || item.status === 'CONFIRMED' || item.status === 'RECEIVED_IN_CASH';
  const isCancelled = item.status === 'REFUNDED' || item.status === 'DELETED';
  const paidDate = isPaid ? (item.paymentDate || item.confirmedDate || dueDate || new Date().toISOString().split('T')[0]) : null;
  return { isPaid, paidDate, dueDate, notFound: isCancelled };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const startTime = Date.now();

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
    const lockKey = 'asaas_sync_lock';
    const lockTTL = 5 * 60 * 1000;

    const { data: existingLock } = await supabase.from('settings').select('value').eq('key', lockKey).eq('organization_id', orgId).maybeSingle();
    if (existingLock && Date.now() - new Date(existingLock.value).getTime() < lockTTL) {
      return new Response(JSON.stringify({ message: 'Sincronização já em execução.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await supabase.from('settings').upsert({ key: lockKey, value: new Date().toISOString(), organization_id: orgId }, { onConflict: 'key,organization_id' });

    try {
      const { data: boletos } = await supabase.from('boletos').select('id, nibo_schedule_id, vencimento, valor, status')
        .eq('organization_id', orgId).eq('status', 'não pago').not('nibo_schedule_id', 'is', null).is('deleted_at', null);

      if (!boletos || boletos.length === 0) {
        return new Response(JSON.stringify({ updated: 0, unchanged: 0, message: 'Nenhum boleto pendente.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: connections } = await supabase.from('billing_connections').select('api_token, api_key, nome, extra_config').eq('organization_id', orgId).eq('provider', 'asaas');
      if (!connections || connections.length === 0) {
        return new Response(JSON.stringify({ error: 'Nenhuma conexão Asaas configurada.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      let updated = 0, unchanged = 0, cancelled = 0, dueDateUpdated = 0;

      const BATCH_SIZE = 20;
      for (let i = 0; i < boletos.length; i += BATCH_SIZE) {
        const batch = boletos.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (boleto) => {
          if (boleto.status === 'pago') return;
          const paymentId = String(boleto.nibo_schedule_id);

          for (const conn of connections) {
            const apiKey = conn.api_token || conn.api_key;
            const isSandbox = (conn.extra_config as any)?.sandbox === true;
            const result = await checkAsaasPayment(apiKey, paymentId, isSandbox);
            if (!result) continue;
            if (result.notFound) { cancelled++; await supabase.from('boletos').update({ status: 'cancelado', nibo_synced_at: new Date().toISOString() }).eq('id', boleto.id); break; }
            if (result.isPaid) { updated++; await supabase.from('boletos').update({ status: 'pago', data_pagamento: result.paidDate, nibo_synced_at: new Date().toISOString() }).eq('id', boleto.id); break; }
            if (result.dueDate && result.dueDate !== boleto.vencimento) { dueDateUpdated++; await supabase.from('boletos').update({ vencimento: result.dueDate, nibo_synced_at: new Date().toISOString() }).eq('id', boleto.id); }
            else { unchanged++; await supabase.from('boletos').update({ nibo_synced_at: new Date().toISOString() }).eq('id', boleto.id); }
            break;
          }
        }));
      }

      await supabase.from('audit_logs').insert({ organization_id: orgId, user_id: userId, action: 'asaas_sync', details: { updated, unchanged, cancelled, dueDateUpdated, duration_ms: Date.now() - startTime } });

      return new Response(JSON.stringify({ updated, unchanged, cancelled, dueDateUpdated, total: boletos.length }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } finally {
      await supabase.from('settings').delete().eq('key', lockKey).eq('organization_id', orgId);
    }
  } catch (error) {
    const errorId = crypto.randomUUID();
    console.error('Error ID:', errorId, error);
    return new Response(JSON.stringify({ error: 'Erro ao sincronizar. ID: ' + errorId }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
