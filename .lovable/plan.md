

## Hub de Integracoes Multi-API

### Objetivo
Transformar a aba "Integracoes" em Configuracoes num hub onde o admin seleciona qual plataforma de faturamento usar (Nibo, Safe2Pay, Asaas, Conta Azul). Ao selecionar, todos os botoes do Dashboard e da pagina de Boletos se adaptam automaticamente.

### Como vai funcionar

1. **Seletor de Provedor Ativo**: Na aba Integracoes, acima dos cards de cada provedor, tera um seletor destacado mostrando qual plataforma esta ativa. Apenas uma pode estar ativa por vez.

2. **Cards por Provedor**: Cada provedor (Nibo, Safe2Pay, Asaas, Conta Azul) tera seu proprio card com formulario de credenciais especifico. O card do provedor ativo tera destaque visual.

3. **Botoes Dinamicos**: Os botoes "Sincronizar Nibo", "Importar Nibo" no Dashboard e em Boletos mudam o texto e comportamento conforme o provedor selecionado (ex: "Sincronizar Safe2Pay", "Importar Asaas").

4. **Verificacao Mensal Adaptada**: O botao Nibo no Dashboard e a coluna de status na tabela de clientes tambem se adaptam ao provedor ativo.

### Etapas de Implementacao

**Etapa 1 - Tabela de Conexoes Generica e Setting do Provedor Ativo**
- Salvar o provedor ativo na tabela `settings` com a chave `active_billing_provider` (valores: `nibo`, `safe2pay`, `asaas`, `contaazul`)
- Criar tabelas de conexoes para cada novo provedor (safe2pay_connections, asaas_connections, contaazul_connections) com campos especificos de cada API, ou reutilizar um modelo generico

**Etapa 2 - Hook useActiveBillingProvider**
- Novo hook que le/escreve o `active_billing_provider` da tabela `settings`
- Fornece o provedor ativo para todos os componentes via contexto ou query

**Etapa 3 - Refatorar Pagina de Configuracoes**
- Adicionar seletor de provedor ativo no topo da aba Integracoes
- Adicionar cards de configuracao para Safe2Pay, Asaas e Conta Azul (formularios de credenciais)
- Manter o card existente do Nibo e Thomson Reuters

**Etapa 4 - Adaptar Dashboard (Index.tsx)**
- O botao "Nibo" muda o label para o nome do provedor ativo
- A verificacao mensal so roda se o provedor ativo tiver edge function implementada (inicialmente so Nibo)
- Para provedores sem implementacao ainda, mostrar badge "Em breve"

**Etapa 5 - Adaptar Pagina de Boletos**
- Botoes "Sincronizar Nibo" e "Importar Nibo" mudam label conforme provedor
- Desabilitar funcoes de import/sync para provedores ainda nao implementados, com tooltip "Em breve"

**Etapa 6 - Edge Functions por Provedor (futuro)**
- Inicialmente, apenas o Nibo tera edge functions funcionais
- Os demais provedores ficam com o formulario de credenciais pronto, mas com as funcoes de sync/import marcadas como "Em breve"
- Conforme cada API for implementada, basta criar a edge function e remover o "Em breve"

### Detalhes Tecnicos

**Migration SQL:**
```sql
-- Nenhuma migration necessaria inicialmente
-- O provedor ativo sera salvo na tabela settings existente
-- key = 'active_billing_provider', value = 'nibo' | 'safe2pay' | 'asaas' | 'contaazul'

-- Tabelas de conexoes para novos provedores (quando implementados):
-- CREATE TABLE public.safe2pay_connections (...)
-- CREATE TABLE public.asaas_connections (...)
-- CREATE TABLE public.contaazul_connections (...)
```

**Arquivos Novos:**
- `src/hooks/useActiveBillingProvider.ts` - hook para ler/escrever provedor ativo

**Arquivos Alterados:**
- `src/pages/Settings.tsx` - seletor de provedor + cards dos novos provedores
- `src/pages/Index.tsx` - label dinamico no botao de verificacao
- `src/pages/Boletos.tsx` - labels dinamicos nos botoes de sync/import
- `src/components/dashboard/ClientsTable.tsx` - label dinamico na coluna de status

**Fluxo do Seletor:**
```text
[Admin abre Configuracoes > Integracoes]
        |
[Ve seletor com opcoes: Nibo, Safe2Pay, Asaas, Conta Azul]
        |
[Seleciona Safe2Pay] --> salva em settings: active_billing_provider = 'safe2pay'
        |
[Dashboard e Boletos mostram "Safe2Pay" nos botoes]
[Se Safe2Pay ainda nao implementado: botoes ficam com badge "Em breve"]
```

### Observacoes
- Apenas o Nibo tera funcionalidade completa inicialmente
- Os outros provedores terao o formulario de credenciais pronto para configuracao
- Conforme cada API for implementada, a funcionalidade sera "ligada" automaticamente
- Thomson Reuters permanece separado pois nao e plataforma de faturamento

