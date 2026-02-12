
-- Create settings table to store API configurations
CREATE TABLE public.settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Settings são visíveis para todos"
ON public.settings FOR SELECT USING (true);

CREATE POLICY "Todos podem inserir settings"
ON public.settings FOR INSERT WITH CHECK (true);

CREATE POLICY "Todos podem atualizar settings"
ON public.settings FOR UPDATE USING (true);

CREATE POLICY "Todos podem deletar settings"
ON public.settings FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
