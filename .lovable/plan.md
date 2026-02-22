

## Plano: Edge Functions dos Provedores + Automacao de Reajustes com Indices

Este plano cobre duas grandes frentes: (1) criar as edge functions de importacao e sincronizacao para Safe2Pay, Asaas e Conta Azul, e (2) automatizar os reajustes com consulta de indices economicos (IPCA/IGP-M).

---

### PARTE 1 - Edge Functions para Safe2Pay, Asaas e Conta Azul

Cada provedor tera duas edge functions seguindo o mesmo padrao do Nibo:
- **fetch-{provider}-boletos**: Busca cobrancas/recebimentos da API do provedor
- **sync-{provider}-status**: Sincroniza status de pagamento dos boletos locais com o provedor

#### 1.1 Safe2Pay

**API Base**: `https://api.safe2pay.com.br`
**Autenticacao**: Header `x-api-key` com o API Token

- `fetch-safe2pay-boletos/index.ts`:
  - Endpoint: `GET /v2/singleSale/list` com paginacao (PageNumber, RowsPerPage)
  - Filtra transacoes do tipo boleto pendentes
  - Retorna items no mesmo formato padrao (stakeholder, valor, vencimento, scheduleId)

- `sync-safe2pay-status/index.ts`:
  - Consulta `GET /v2/singleSale/get?id={id}` para cada boleto local com safe2pay_id
  - Verifica status (pago, cancelado, vencido)
  - Atualiza boletos locais com lock de concorrencia (mesmo padrao do Nibo)

#### 1.2 Asaas

**API Base**: `https://api.asaas.com/v3` (producao) ou `https://api-sandbox.asaas.com/v3`
**Autenticacao**: Header `access_token` com a API Key

- `fetch-asaas-boletos/index.ts`:
  - Endpoint: `GET /v3/payments` com filtros (`status=PENDING`, `billingType=BOLETO`)
  - Paginacao via `offset` e `limit`
  - Mapeia campos: `id` -> scheduleId, `customer` -> stakeholder, `value`, `dueDate`

- `sync-asaas-status/index.ts`:
  - Consulta `GET /v3/payments/{id}` para cada boleto
  - Status mapping: `RECEIVED`/`CONFIRMED` = pago, `REFUNDED`/`DELETED` = cancelado
  - Atualiza localmente com mesmas protecoes (lock, guard de pago, audit log)

#### 1.3 Conta Azul

**API Base**: `https://api-v2.contaazul.com/v1`
**Autenticacao**: OAuth 2.0 com Bearer Token (Client ID + Client Secret para refresh)

- `fetch-contaazul-boletos/index.ts`:
  - Endpoint: `GET /v1/receivables` (contas a receber)
  - Paginacao via `page` e `size`
  - Mapeia campos do retorno para o formato padrao

- `sync-contaazul-status/index.ts`:
  - Consulta `GET /v1/receivables/{id}` para verificar status
  - Atualiza boletos locais conforme status retornado

#### 1.4 Adaptacoes no Frontend

- **useNiboImport.ts -> useBillingImport.ts** (refatorar ou criar novo):
  - Hook generico que recebe o provider e chama a edge function correspondente (`fetch-{provider}-boletos`)
  - Logica de match de clientes e insercao de boletos permanece a mesma

- **useNiboSync.ts -> useBillingSync.ts** (refatorar ou criar novo):
  - Hook generico que chama `sync-{provider}-status` conforme o provedor ativo

- **NiboImportDialog.tsx -> BillingImportDialog.tsx**:
  - Adaptar para mostrar conexoes do provedor ativo (de `billing_connections` ou `nibo_connections`)

- **Boletos.tsx e Index.tsx**:
  - Ja usam `useActiveBillingProvider`, basta apontar para os hooks genericos

- **useActiveBillingProvider.ts**:
  - Atualizar `implemented: true` para todos os provedores

#### 1.5 Configuracao (supabase/config.toml)

Adicionar as 6 novas functions com `verify_jwt = false`:
```text
[functions.fetch-safe2pay-boletos]
verify_jwt = false
[functions.sync-safe2pay-status]
verify_jwt = false
[functions.fetch-asaas-boletos]
verify_jwt = false
[functions.sync-asaas-status]
verify_jwt = false
[functions.fetch-contaazul-boletos]
verify_jwt = false
[functions.sync-contaazul-status]
verify_jwt = false
```

---

### PARTE 2 - Automacao de Reajustes com Indices IPCA/IGP-M

#### 2.1 Edge Function para Consulta de Indices

- `fetch-economic-indices/index.ts`:
  - Consulta a API publica do Banco Central do Brasil (sem necessidade de API Key):
    - IPCA: `https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/12?formato=json` (serie 433)
    - IGP-M: `https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados/ultimos/12?formato=json` (serie 189)
  - Retorna os ultimos 12 meses de cada indice + acumulado 12 meses
  - Cache: salva resultado na tabela `settings` com TTL de 24h para evitar chamadas excessivas

#### 2.2 Pagina de Reajustes Aprimorada

Melhorias na pagina `Reajustes.tsx`:

- **Coluna "Indice Sugerido"**: Mostra o valor do IPCA e IGP-M acumulado dos ultimos 12 meses
- **Coluna "Novo Valor Sugerido"**: Calcula automaticamente o novo valor mensal aplicando o indice escolhido
- **Seletor de Indice**: Dropdown para escolher entre IPCA, IGP-M ou personalizado (percentual manual)
- **Botao "Aplicar Reajuste"**: Abre dialog de confirmacao mostrando:
  - Valor atual vs novo valor
  - Indice aplicado e percentual
  - Confirma e atualiza o `valorMensalidade` do cliente + registra `ultimoReajuste` como hoje
- **Reajuste em Lote**: Selecionar multiplos clientes vencidos e aplicar reajuste com mesmo indice

#### 2.3 Tabela de Historico de Reajustes

- Nova tabela `reajuste_history` no banco:
  - `id`, `client_id`, `organization_id`, `indice_usado` (IPCA/IGP-M/manual), `percentual_aplicado`, `valor_anterior`, `valor_novo`, `applied_at`, `applied_by`
  - RLS: membros da org podem ver/inserir
- Registra cada reajuste aplicado para auditoria

#### 2.4 Notificacoes de Reajuste

- Badge no sidebar indicando quantos clientes tem reajuste vencido
- Card de alerta no Dashboard quando ha clientes com reajuste vencido

---

### Detalhes Tecnicos

**Arquivos Novos:**
- `supabase/functions/fetch-safe2pay-boletos/index.ts`
- `supabase/functions/sync-safe2pay-status/index.ts`
- `supabase/functions/fetch-asaas-boletos/index.ts`
- `supabase/functions/sync-asaas-status/index.ts`
- `supabase/functions/fetch-contaazul-boletos/index.ts`
- `supabase/functions/sync-contaazul-status/index.ts`
- `supabase/functions/fetch-economic-indices/index.ts`
- `src/hooks/useBillingImport.ts`
- `src/hooks/useBillingSync.ts`
- `src/components/reajustes/ReajusteDialog.tsx`
- `src/components/reajustes/IndiceSelector.tsx`
- `src/hooks/useEconomicIndices.ts`

**Arquivos Alterados:**
- `supabase/config.toml` (novas functions)
- `src/pages/Reajustes.tsx` (indices, novo valor sugerido, reajuste em lote)
- `src/pages/Boletos.tsx` (usar hooks genericos)
- `src/pages/Index.tsx` (usar hooks genericos, alerta de reajustes)
- `src/components/boletos/NiboImportDialog.tsx` (tornar generico)
- `src/hooks/useActiveBillingProvider.ts` (marcar todos como implemented)
- `src/components/layout/AppSidebar.tsx` (badge de reajustes)

**Migration SQL:**
```sql
CREATE TABLE public.reajuste_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  organization_id UUID,
  indice_usado TEXT NOT NULL,
  percentual_aplicado NUMERIC NOT NULL,
  valor_anterior JSONB NOT NULL,
  valor_novo JSONB NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_by UUID NOT NULL
);

ALTER TABLE public.reajuste_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view reajuste_history"
  ON public.reajuste_history FOR SELECT
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org members can insert reajuste_history"
  ON public.reajuste_history FOR INSERT
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));
```

### Ordem de Implementacao

1. Edge functions dos 3 provedores (fetch + sync) - 6 functions
2. Hooks genericos (useBillingImport, useBillingSync) + refatorar dialogs
3. Marcar todos provedores como implementados e testar fluxo completo
4. Edge function de indices economicos (BCB API)
5. Migration da tabela reajuste_history
6. Pagina de Reajustes aprimorada com indices e reajuste em lote
7. Badge de alerta no sidebar e dashboard

