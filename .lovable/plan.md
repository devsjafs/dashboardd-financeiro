
# Plano: Ajuste da API Nibo + Página de Inadimplência

## O que será feito

Duas entregas em conjunto:

1. **Correção do filtro da API Nibo** — importar todos os boletos em aberto (passados e futuros), não só os vencidos até ontem.
2. **Nova página "Inadimplência"** — painel completo com KPIs, gráfico mensal, ranking de devedores e lista de boletos vencidos com ação de marcar como pago.

Nenhuma alteração no banco de dados é necessária. Tudo usa dados já existentes em `boletos` e `clients`.

---

## Parte 1 — Ajuste da API Nibo

### Arquivo: `supabase/functions/fetch-nibo-boletos/index.ts`

Remover as 3 linhas que calculam a data de ontem (linhas 50-53) e simplificar a URL eliminando o `$filter`:

```
// Antes (linhas 50-60):
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = yesterday.toISOString().split('T')[0];
...
const filter = `dueDate le ${yesterdayStr}`;
const niboUrl = `...?$filter=${encodeURIComponent(filter)}&$orderby=dueDate&$top=500`;

// Depois:
const niboUrl = `https://api.nibo.com.br/empresas/v1/schedules/credit/opened?$orderby=dueDate&$top=500`;
```

O endpoint `/schedules/credit/opened` do Nibo já filtra por status "aberto" nativamente. Não precisa de filtro extra. A deduplicação existente (por `client_id + vencimento + valor`) evita duplicatas em re-importações.

A função será reimplantada automaticamente após a edição.

---

## Parte 2 — Página de Inadimplência

### Arquivos a criar

**`src/pages/Inadimplencia.tsx`** — Página principal. Usa `useBoletos()` já existente, calcula tudo no frontend.

**`src/components/inadimplencia/DebtSummaryCards.tsx`** — 4 cards de KPI:
- Total em Aberto (todos os "não pago")
- Total Vencido (boletos "não pago" com `vencimento < hoje`)
- A Vencer em 30 dias (boletos "não pago" com vencimento entre hoje e +30 dias)
- Taxa de Inadimplência do mês atual: `(vencidos no mês / total boletos do mês) × 100%`

**`src/components/inadimplencia/InadimplenciaChart.tsx`** — Gráfico de barras empilhadas com `recharts` (já instalado) mostrando os últimos 12 meses, agrupado por `competencia`. Barras: Pago (verde) vs Não Pago (vermelho).

**`src/components/inadimplencia/TopDebtorsTable.tsx`** — Ranking dos clientes com mais débito em aberto:
- Nome do cliente
- Quantidade de boletos em aberto
- Valor total em aberto
- Data do boleto mais antigo vencido

**`src/components/inadimplencia/OverdueBoletosTable.tsx`** — Lista detalhada de todos os boletos vencidos não pagos:
- Nome do cliente | Categoria | Competência | Vencimento | Dias em atraso | Valor | Ação
- Badge colorido por severidade:
  - 1–30 dias → amarelo
  - 31–60 dias → laranja
  - +60 dias → vermelho
- Botão "Marcar como pago" reutilizando `markAsPaid` do `useBoletos()`

### Arquivos a modificar

**`src/components/layout/AppSidebar.tsx`**
- Importar `AlertTriangle` do `lucide-react`
- Adicionar item no array `items[]`:
  ```ts
  { title: "Inadimplência", url: "/inadimplencia", icon: AlertTriangle, minRole: "member" }
  ```
  Posicionado após "Boletos" (antes de Comissões)

**`src/App.tsx`**
- Importar `Inadimplencia` de `./pages/Inadimplencia`
- Adicionar rota: `<Route path="/inadimplencia" element={<Inadimplencia />} />`

---

## Estrutura visual da página

```text
+----------------------------------------------------------+
|  Inadimplência & Resumo Financeiro                        |
+---------------+-----------+--------------+---------------+
| Total Aberto  | Vencido   | A Vencer 30d | Taxa Inad. %  |
| R$ 45.000     | R$ 12.000 | R$ 8.000     | 18,5%         |
+---------------+-----------+--------------+---------------+
|                                                          |
|  [Gráfico de barras: Pago vs Não Pago - últimos 12m]    |
|                                                          |
+----------------------------------------------------------+
|  Top Clientes Inadimplentes                              |
|  Cliente      | Boletos | Total Aberto | Mais Antigo     |
|  Empresa X    |    3    | R$ 8.500     | 67 dias         |
+----------------------------------------------------------+
|  Boletos Vencidos                                        |
|  Cliente | Categoria | Venc.   | Atraso   | Valor | Ação |
|  Emp. X  | Nibo      | 10/12   | 67 dias  | 2.800 | Pago |
+----------------------------------------------------------+
```

---

## Sequência de implementação

1. Editar `supabase/functions/fetch-nibo-boletos/index.ts` (remover filtro de data)
2. Criar `src/components/inadimplencia/DebtSummaryCards.tsx`
3. Criar `src/components/inadimplencia/InadimplenciaChart.tsx`
4. Criar `src/components/inadimplencia/TopDebtorsTable.tsx`
5. Criar `src/components/inadimplencia/OverdueBoletosTable.tsx`
6. Criar `src/pages/Inadimplencia.tsx`
7. Modificar `src/components/layout/AppSidebar.tsx` (adicionar item no menu)
8. Modificar `src/App.tsx` (adicionar rota)
