
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Update existing RLS policies to require authentication
-- clients
DROP POLICY IF EXISTS "Clientes são visíveis para todos" ON public.clients;
CREATE POLICY "Clientes são visíveis para autenticados" ON public.clients FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos podem atualizar clientes" ON public.clients;
CREATE POLICY "Autenticados podem atualizar clientes" ON public.clients FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos podem deletar clientes" ON public.clients;
CREATE POLICY "Autenticados podem deletar clientes" ON public.clients FOR DELETE TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos podem inserir clientes" ON public.clients;
CREATE POLICY "Autenticados podem inserir clientes" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);

-- boletos
DROP POLICY IF EXISTS "Boletos são visíveis para todos" ON public.boletos;
CREATE POLICY "Boletos são visíveis para autenticados" ON public.boletos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos podem atualizar boletos" ON public.boletos;
CREATE POLICY "Autenticados podem atualizar boletos" ON public.boletos FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos podem deletar boletos" ON public.boletos;
CREATE POLICY "Autenticados podem deletar boletos" ON public.boletos FOR DELETE TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos podem inserir boletos" ON public.boletos;
CREATE POLICY "Autenticados podem inserir boletos" ON public.boletos FOR INSERT TO authenticated WITH CHECK (true);

-- payments
DROP POLICY IF EXISTS "Pagamentos são visíveis para todos" ON public.payments;
CREATE POLICY "Pagamentos são visíveis para autenticados" ON public.payments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos podem atualizar pagamentos" ON public.payments;
CREATE POLICY "Autenticados podem atualizar pagamentos" ON public.payments FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos podem deletar pagamentos" ON public.payments;
CREATE POLICY "Autenticados podem deletar pagamentos" ON public.payments FOR DELETE TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos podem inserir pagamentos" ON public.payments;
CREATE POLICY "Autenticados podem inserir pagamentos" ON public.payments FOR INSERT TO authenticated WITH CHECK (true);

-- commissions
DROP POLICY IF EXISTS "Comissões são visíveis para todos" ON public.commissions;
CREATE POLICY "Comissões são visíveis para autenticados" ON public.commissions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos podem atualizar comissões" ON public.commissions;
CREATE POLICY "Autenticados podem atualizar comissões" ON public.commissions FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos podem deletar comissões" ON public.commissions;
CREATE POLICY "Autenticados podem deletar comissões" ON public.commissions FOR DELETE TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos podem inserir comissões" ON public.commissions;
CREATE POLICY "Autenticados podem inserir comissões" ON public.commissions FOR INSERT TO authenticated WITH CHECK (true);

-- commission_payments
DROP POLICY IF EXISTS "Pagamentos de comissão são visíveis para todos" ON public.commission_payments;
CREATE POLICY "Pagamentos de comissão são visíveis para autenticados" ON public.commission_payments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos podem atualizar pagamentos de comissão" ON public.commission_payments;
CREATE POLICY "Autenticados podem atualizar pagamentos de comissão" ON public.commission_payments FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos podem deletar pagamentos de comissão" ON public.commission_payments;
CREATE POLICY "Autenticados podem deletar pagamentos de comissão" ON public.commission_payments FOR DELETE TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos podem inserir pagamentos de comissão" ON public.commission_payments;
CREATE POLICY "Autenticados podem inserir pagamentos de comissão" ON public.commission_payments FOR INSERT TO authenticated WITH CHECK (true);

-- client_history
DROP POLICY IF EXISTS "Histórico é visível para todos" ON public.client_history;
CREATE POLICY "Histórico é visível para autenticados" ON public.client_history FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Sistema pode inserir histórico" ON public.client_history;
CREATE POLICY "Sistema pode inserir histórico" ON public.client_history FOR INSERT TO authenticated WITH CHECK (true);

-- client_notes
DROP POLICY IF EXISTS "Anotações são visíveis para todos" ON public.client_notes;
CREATE POLICY "Anotações são visíveis para autenticados" ON public.client_notes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos podem atualizar anotações" ON public.client_notes;
CREATE POLICY "Autenticados podem atualizar anotações" ON public.client_notes FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos podem deletar anotações" ON public.client_notes;
CREATE POLICY "Autenticados podem deletar anotações" ON public.client_notes FOR DELETE TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos podem inserir anotações" ON public.client_notes;
CREATE POLICY "Autenticados podem inserir anotações" ON public.client_notes FOR INSERT TO authenticated WITH CHECK (true);

-- settings
DROP POLICY IF EXISTS "Settings são visíveis para todos" ON public.settings;
CREATE POLICY "Settings são visíveis para autenticados" ON public.settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos podem atualizar settings" ON public.settings;
CREATE POLICY "Autenticados podem atualizar settings" ON public.settings FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos podem deletar settings" ON public.settings;
CREATE POLICY "Autenticados podem deletar settings" ON public.settings FOR DELETE TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos podem inserir settings" ON public.settings;
CREATE POLICY "Autenticados podem inserir settings" ON public.settings FOR INSERT TO authenticated WITH CHECK (true);

-- nibo_connections
DROP POLICY IF EXISTS "Conexões Nibo são visíveis para todos" ON public.nibo_connections;
CREATE POLICY "Conexões Nibo são visíveis para autenticados" ON public.nibo_connections FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos podem atualizar conexões Nibo" ON public.nibo_connections;
CREATE POLICY "Autenticados podem atualizar conexões Nibo" ON public.nibo_connections FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos podem deletar conexões Nibo" ON public.nibo_connections;
CREATE POLICY "Autenticados podem deletar conexões Nibo" ON public.nibo_connections FOR DELETE TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos podem inserir conexões Nibo" ON public.nibo_connections;
CREATE POLICY "Autenticados podem inserir conexões Nibo" ON public.nibo_connections FOR INSERT TO authenticated WITH CHECK (true);
