
-- Create nibo_connections table for multiple API connections
CREATE TABLE public.nibo_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  api_token text NOT NULL,
  api_key text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.nibo_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conexões Nibo são visíveis para todos"
ON public.nibo_connections FOR SELECT USING (true);

CREATE POLICY "Todos podem inserir conexões Nibo"
ON public.nibo_connections FOR INSERT WITH CHECK (true);

CREATE POLICY "Todos podem atualizar conexões Nibo"
ON public.nibo_connections FOR UPDATE USING (true);

CREATE POLICY "Todos podem deletar conexões Nibo"
ON public.nibo_connections FOR DELETE USING (true);

CREATE TRIGGER update_nibo_connections_updated_at
BEFORE UPDATE ON public.nibo_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
