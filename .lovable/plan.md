
## Sincronização de Status dos Boletos com o Nibo

### Objetivo
Criar um botão "Sincronizar Status" que consulta o Nibo pelo ID de cada boleto importado e atualiza automaticamente quais foram pagos.

### O Problema Atual
O sistema importa boletos do Nibo, mas não guarda o ID único do Nibo (`scheduleId`). Sem esse ID, não há como perguntar ao Nibo "esse boleto foi pago?" — só dá para deduzir pelo CNPJ + valor + data, o que é menos confiável.

### Solução: 3 Etapas

**Etapa 1 — Banco de Dados: Adicionar coluna `nibo_schedule_id`**
- Criar uma migration que adiciona a coluna `nibo_schedule_id TEXT` na tabela `boletos`
- Ela ficará nula para boletos já existentes ou criados manualmente

**Etapa 2 — Atualizar o Import: Salvar o ID do Nibo**
- Atualizar `supabase/functions/fetch-nibo-boletos/index.ts` para retornar o campo `scheduleId` (ou equivalente) de cada item do Nibo
- Atualizar `src/hooks/useNiboImport.ts` para gravar esse ID no campo `nibo_schedule_id` ao inserir no banco

**Etapa 3 — Nova Função de Sincronização**
- Criar nova edge function `sync-nibo-status` que:
  1. Busca todos os boletos locais com `nibo_schedule_id != null` e `status = "não pago"`
  2. Para cada um, consulta a API do Nibo pelo endpoint de schedule individual (`/schedules/{id}`) para ver o status atual
  3. Se o Nibo indicar que foi pago, atualiza `status = "pago"` e `data_pagamento` no banco
  4. Retorna um resumo: X atualizados, Y sem mudança
- Adicionar hook `useNiboSync` no frontend
- Adicionar botão "Sincronizar Status" na página de Boletos ao lado do botão "Importar Nibo"

### Technical Details

**Migration SQL:**
```sql
ALTER TABLE public.boletos ADD COLUMN nibo_schedule_id TEXT;
CREATE INDEX idx_boletos_nibo_schedule_id ON public.boletos(nibo_schedule_id);
```

**Fluxo do botão Sincronizar:**
```text
[Usuário clica "Sincronizar"]
        ↓
[Edge Function: busca boletos locais "não pago" com nibo_schedule_id]
        ↓
[Para cada boleto: GET /schedules/credit/{id} no Nibo]
        ↓
[Se status = pago → UPDATE boletos SET status='pago', data_pagamento=...]
        ↓
[Retorna: X boletos atualizados para pago]
```

### Arquivos Alterados
- `supabase/migrations/` — nova migration com a coluna `nibo_schedule_id`
- `supabase/functions/fetch-nibo-boletos/index.ts` — incluir `scheduleId` na resposta
- `src/hooks/useNiboImport.ts` — salvar `nibo_schedule_id` no insert
- `supabase/functions/sync-nibo-status/index.ts` — nova edge function de sync
- `src/hooks/useNiboSync.ts` — novo hook para chamar a edge function
- `src/pages/Boletos.tsx` — adicionar botão "Sincronizar Status"

### Observação Importante
Boletos criados manualmente ou importados via XLSX não terão `nibo_schedule_id`, portanto o sync só funcionará para os boletos importados via Nibo. Isso é exibido claramente no resultado da sincronização.
