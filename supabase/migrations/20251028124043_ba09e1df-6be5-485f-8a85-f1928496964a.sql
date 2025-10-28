-- Criar tabela de clientes
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome_fantasia TEXT NOT NULL,
  razao_social TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  valor_smart DECIMAL(10,2) DEFAULT 0,
  valor_apoio DECIMAL(10,2) DEFAULT 0,
  valor_contabilidade DECIMAL(10,2) DEFAULT 0,
  valor_personalite DECIMAL(10,2) DEFAULT 0,
  vencimento INTEGER NOT NULL CHECK (vencimento >= 1 AND vencimento <= 31),
  inicio_competencia TEXT NOT NULL,
  ultima_competencia TEXT,
  services TEXT[] NOT NULL DEFAULT '{}',
  situacao TEXT NOT NULL CHECK (situacao IN ('mes-vencido', 'mes-corrente', 'anual')),
  status TEXT NOT NULL CHECK (status IN ('ativo', 'inativo', 'sem-faturamento', 'ex-cliente', 'suspenso')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX idx_clients_codigo ON public.clients(codigo);
CREATE INDEX idx_clients_status ON public.clients(status);
CREATE INDEX idx_clients_services ON public.clients USING GIN(services);

-- Habilitar RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem ler clientes
CREATE POLICY "Clientes são visíveis para todos"
  ON public.clients
  FOR SELECT
  USING (true);

-- Política: Todos podem inserir clientes
CREATE POLICY "Todos podem inserir clientes"
  ON public.clients
  FOR INSERT
  WITH CHECK (true);

-- Política: Todos podem atualizar clientes
CREATE POLICY "Todos podem atualizar clientes"
  ON public.clients
  FOR UPDATE
  USING (true);

-- Política: Todos podem deletar clientes
CREATE POLICY "Todos podem deletar clientes"
  ON public.clients
  FOR DELETE
  USING (true);

-- Criar tabela de histórico de alterações
CREATE TABLE public.client_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Criar índice para buscar histórico por cliente
CREATE INDEX idx_client_history_client_id ON public.client_history(client_id);
CREATE INDEX idx_client_history_changed_at ON public.client_history(changed_at DESC);

-- Habilitar RLS
ALTER TABLE public.client_history ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem ler histórico
CREATE POLICY "Histórico é visível para todos"
  ON public.client_history
  FOR SELECT
  USING (true);

-- Política: Sistema pode inserir no histórico
CREATE POLICY "Sistema pode inserir histórico"
  ON public.client_history
  FOR INSERT
  WITH CHECK (true);

-- Criar tabela de anotações
CREATE TABLE public.client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Criar índice para buscar anotações por cliente
CREATE INDEX idx_client_notes_client_id ON public.client_notes(client_id);
CREATE INDEX idx_client_notes_created_at ON public.client_notes(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem ler anotações
CREATE POLICY "Anotações são visíveis para todos"
  ON public.client_notes
  FOR SELECT
  USING (true);

-- Política: Todos podem inserir anotações
CREATE POLICY "Todos podem inserir anotações"
  ON public.client_notes
  FOR INSERT
  WITH CHECK (true);

-- Política: Todos podem atualizar anotações
CREATE POLICY "Todos podem atualizar anotações"
  ON public.client_notes
  FOR UPDATE
  USING (true);

-- Política: Todos podem deletar anotações
CREATE POLICY "Todos podem deletar anotações"
  ON public.client_notes
  FOR DELETE
  USING (true);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_notes_updated_at
  BEFORE UPDATE ON public.client_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para registrar mudanças no histórico
CREATE OR REPLACE FUNCTION public.log_client_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Registrar mudanças em campos específicos
  IF OLD.valor_smart IS DISTINCT FROM NEW.valor_smart THEN
    INSERT INTO public.client_history (client_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'valor_smart', OLD.valor_smart::TEXT, NEW.valor_smart::TEXT);
  END IF;
  
  IF OLD.valor_apoio IS DISTINCT FROM NEW.valor_apoio THEN
    INSERT INTO public.client_history (client_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'valor_apoio', OLD.valor_apoio::TEXT, NEW.valor_apoio::TEXT);
  END IF;
  
  IF OLD.valor_contabilidade IS DISTINCT FROM NEW.valor_contabilidade THEN
    INSERT INTO public.client_history (client_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'valor_contabilidade', OLD.valor_contabilidade::TEXT, NEW.valor_contabilidade::TEXT);
  END IF;
  
  IF OLD.valor_personalite IS DISTINCT FROM NEW.valor_personalite THEN
    INSERT INTO public.client_history (client_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'valor_personalite', OLD.valor_personalite::TEXT, NEW.valor_personalite::TEXT);
  END IF;
  
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.client_history (client_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'status', OLD.status, NEW.status);
  END IF;
  
  IF OLD.situacao IS DISTINCT FROM NEW.situacao THEN
    INSERT INTO public.client_history (client_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'situacao', OLD.situacao, NEW.situacao);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para capturar mudanças
CREATE TRIGGER track_client_changes
  AFTER UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.log_client_changes();