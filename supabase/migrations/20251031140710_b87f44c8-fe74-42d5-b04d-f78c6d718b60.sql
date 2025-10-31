-- Adicionar campo banco na tabela payments
ALTER TABLE public.payments ADD COLUMN banco text;

-- Adicionar campo grupo na tabela clients
ALTER TABLE public.clients ADD COLUMN grupo text;