-- Adicionar campo de email na tabela clients
ALTER TABLE public.clients
ADD COLUMN email TEXT;

-- Criar tabela de boletos (contas a receber)
CREATE TABLE public.boletos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  valor NUMERIC NOT NULL,
  vencimento DATE NOT NULL,
  competencia TEXT NOT NULL,
  categoria TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'não pago' CHECK (status IN ('pago', 'não pago')),
  data_pagamento DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.boletos ENABLE ROW LEVEL SECURITY;

-- Políticas para boletos
CREATE POLICY "Boletos são visíveis para todos"
  ON public.boletos
  FOR SELECT
  USING (true);

CREATE POLICY "Todos podem inserir boletos"
  ON public.boletos
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Todos podem atualizar boletos"
  ON public.boletos
  FOR UPDATE
  USING (true);

CREATE POLICY "Todos podem deletar boletos"
  ON public.boletos
  FOR DELETE
  USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_boletos_updated_at
  BEFORE UPDATE ON public.boletos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar índices para melhor performance
CREATE INDEX idx_boletos_client_id ON public.boletos(client_id);
CREATE INDEX idx_boletos_vencimento ON public.boletos(vencimento);
CREATE INDEX idx_boletos_status ON public.boletos(status);