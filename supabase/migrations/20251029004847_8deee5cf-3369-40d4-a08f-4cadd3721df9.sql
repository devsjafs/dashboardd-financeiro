-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao TEXT NOT NULL,
  vencimento DATE NOT NULL,
  valor NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'não pago',
  data_pagamento DATE,
  recorrente BOOLEAN NOT NULL DEFAULT false,
  intervalo_recorrencia TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Pagamentos são visíveis para todos" 
ON public.payments 
FOR SELECT 
USING (true);

CREATE POLICY "Todos podem inserir pagamentos" 
ON public.payments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Todos podem atualizar pagamentos" 
ON public.payments 
FOR UPDATE 
USING (true);

CREATE POLICY "Todos podem deletar pagamentos" 
ON public.payments 
FOR DELETE 
USING (true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();