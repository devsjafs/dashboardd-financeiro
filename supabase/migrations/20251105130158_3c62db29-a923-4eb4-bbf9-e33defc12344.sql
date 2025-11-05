-- Adicionar coluna document_type na tabela clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'cnpj';

-- Atualizar a constraint check para situacao incluir a nova opção
-- Primeiro removemos a constraint antiga se existir
ALTER TABLE public.clients 
DROP CONSTRAINT IF EXISTS clients_situacao_check;

-- Adicionar nova constraint com todas as opções
ALTER TABLE public.clients 
ADD CONSTRAINT clients_situacao_check 
CHECK (situacao IN ('mes-vencido', 'mes-corrente', 'anual', 'mes-corrente-vencido'));