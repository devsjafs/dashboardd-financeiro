-- Tabela para armazenar contratos de comissão
CREATE TABLE public.commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  vendedor TEXT NOT NULL,
  inicio_periodo DATE NOT NULL,
  duracao_meses INTEGER NOT NULL CHECK (duracao_meses IN (12, 24)),
  percentual_comissao NUMERIC NOT NULL DEFAULT 10.00,
  valor_base NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para armazenar cada pagamento trimestral
CREATE TABLE public.commission_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commission_id UUID NOT NULL REFERENCES public.commissions(id) ON DELETE CASCADE,
  trimestre_numero INTEGER NOT NULL,
  inicio_trimestre DATE NOT NULL,
  fim_trimestre DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  preco NUMERIC NOT NULL,
  pago BOOLEAN NOT NULL DEFAULT false,
  data_pagamento DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;

-- Políticas para commissions
CREATE POLICY "Comissões são visíveis para todos" 
ON public.commissions 
FOR SELECT 
USING (true);

CREATE POLICY "Todos podem inserir comissões" 
ON public.commissions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Todos podem atualizar comissões" 
ON public.commissions 
FOR UPDATE 
USING (true);

CREATE POLICY "Todos podem deletar comissões" 
ON public.commissions 
FOR DELETE 
USING (true);

-- Políticas para commission_payments
CREATE POLICY "Pagamentos de comissão são visíveis para todos" 
ON public.commission_payments 
FOR SELECT 
USING (true);

CREATE POLICY "Todos podem inserir pagamentos de comissão" 
ON public.commission_payments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Todos podem atualizar pagamentos de comissão" 
ON public.commission_payments 
FOR UPDATE 
USING (true);

CREATE POLICY "Todos podem deletar pagamentos de comissão" 
ON public.commission_payments 
FOR DELETE 
USING (true);

-- Triggers para updated_at
CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_commission_payments_updated_at
  BEFORE UPDATE ON public.commission_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();