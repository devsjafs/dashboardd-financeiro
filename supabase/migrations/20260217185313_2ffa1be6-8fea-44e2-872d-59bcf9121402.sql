
-- Phase 1: Create organization structure

-- 1. Role enum
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- 2. Organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 3. Organization members table (roles stored separately per security guidelines)
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 4. Security definer functions (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_user_role_in_org(_user_id UUID, _org_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.organization_members WHERE user_id = _user_id AND organization_id = _org_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_org(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _user_id AND organization_id = _org_id)
$$;

-- 5. Add organization_id to all data tables
ALTER TABLE public.clients ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.boletos ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.payments ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.commissions ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.commission_payments ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.settings ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.client_history ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.client_notes ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.nibo_connections ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 6. RLS for organizations: members can see their own org
CREATE POLICY "Members can view their org"
  ON public.organizations FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), id));

CREATE POLICY "Owners can update their org"
  ON public.organizations FOR UPDATE TO authenticated
  USING (public.get_user_role_in_org(auth.uid(), id) = 'owner');

-- 7. RLS for organization_members
CREATE POLICY "Members can view org members"
  ON public.organization_members FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can insert members"
  ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role_in_org(auth.uid(), organization_id) IN ('owner', 'admin')
    OR NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = organization_members.organization_id)
  );

CREATE POLICY "Admins can update members"
  ON public.organization_members FOR UPDATE TO authenticated
  USING (public.get_user_role_in_org(auth.uid(), organization_id) IN ('owner', 'admin'));

CREATE POLICY "Owners can delete members"
  ON public.organization_members FOR DELETE TO authenticated
  USING (public.get_user_role_in_org(auth.uid(), organization_id) = 'owner');

-- 8. Phase 2: Drop old RLS policies and create org-scoped ones

-- clients
DROP POLICY IF EXISTS "Clientes são visíveis para autenticados" ON public.clients;
DROP POLICY IF EXISTS "Autenticados podem atualizar clientes" ON public.clients;
DROP POLICY IF EXISTS "Autenticados podem deletar clientes" ON public.clients;
DROP POLICY IF EXISTS "Autenticados podem inserir clientes" ON public.clients;

CREATE POLICY "Org members can view clients" ON public.clients FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can insert clients" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can update clients" ON public.clients FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can delete clients" ON public.clients FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));

-- boletos
DROP POLICY IF EXISTS "Boletos são visíveis para autenticados" ON public.boletos;
DROP POLICY IF EXISTS "Autenticados podem atualizar boletos" ON public.boletos;
DROP POLICY IF EXISTS "Autenticados podem deletar boletos" ON public.boletos;
DROP POLICY IF EXISTS "Autenticados podem inserir boletos" ON public.boletos;

CREATE POLICY "Org members can view boletos" ON public.boletos FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can insert boletos" ON public.boletos FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can update boletos" ON public.boletos FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can delete boletos" ON public.boletos FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));

-- payments
DROP POLICY IF EXISTS "Pagamentos são visíveis para autenticados" ON public.payments;
DROP POLICY IF EXISTS "Autenticados podem atualizar pagamentos" ON public.payments;
DROP POLICY IF EXISTS "Autenticados podem deletar pagamentos" ON public.payments;
DROP POLICY IF EXISTS "Autenticados podem inserir pagamentos" ON public.payments;

CREATE POLICY "Org members can view payments" ON public.payments FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can insert payments" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can update payments" ON public.payments FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can delete payments" ON public.payments FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));

-- commissions
DROP POLICY IF EXISTS "Comissões são visíveis para autenticados" ON public.commissions;
DROP POLICY IF EXISTS "Autenticados podem atualizar comissões" ON public.commissions;
DROP POLICY IF EXISTS "Autenticados podem deletar comissões" ON public.commissions;
DROP POLICY IF EXISTS "Autenticados podem inserir comissões" ON public.commissions;

CREATE POLICY "Org members can view commissions" ON public.commissions FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can insert commissions" ON public.commissions FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can update commissions" ON public.commissions FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can delete commissions" ON public.commissions FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));

-- commission_payments
DROP POLICY IF EXISTS "Pagamentos de comissão são visíveis para autenticados" ON public.commission_payments;
DROP POLICY IF EXISTS "Autenticados podem atualizar pagamentos de comissão" ON public.commission_payments;
DROP POLICY IF EXISTS "Autenticados podem deletar pagamentos de comissão" ON public.commission_payments;
DROP POLICY IF EXISTS "Autenticados podem inserir pagamentos de comissão" ON public.commission_payments;

CREATE POLICY "Org members can view commission_payments" ON public.commission_payments FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can insert commission_payments" ON public.commission_payments FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can update commission_payments" ON public.commission_payments FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can delete commission_payments" ON public.commission_payments FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));

-- settings
DROP POLICY IF EXISTS "Settings são visíveis para autenticados" ON public.settings;
DROP POLICY IF EXISTS "Autenticados podem atualizar settings" ON public.settings;
DROP POLICY IF EXISTS "Autenticados podem deletar settings" ON public.settings;
DROP POLICY IF EXISTS "Autenticados podem inserir settings" ON public.settings;

CREATE POLICY "Org members can view settings" ON public.settings FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can insert settings" ON public.settings FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can update settings" ON public.settings FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can delete settings" ON public.settings FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));

-- client_history
DROP POLICY IF EXISTS "Histórico é visível para autenticados" ON public.client_history;
DROP POLICY IF EXISTS "Sistema pode inserir histórico" ON public.client_history;

CREATE POLICY "Org members can view client_history" ON public.client_history FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can insert client_history" ON public.client_history FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

-- client_notes
DROP POLICY IF EXISTS "Anotações são visíveis para autenticados" ON public.client_notes;
DROP POLICY IF EXISTS "Autenticados podem atualizar anotações" ON public.client_notes;
DROP POLICY IF EXISTS "Autenticados podem deletar anotações" ON public.client_notes;
DROP POLICY IF EXISTS "Autenticados podem inserir anotações" ON public.client_notes;

CREATE POLICY "Org members can view client_notes" ON public.client_notes FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can insert client_notes" ON public.client_notes FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can update client_notes" ON public.client_notes FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can delete client_notes" ON public.client_notes FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));

-- nibo_connections
DROP POLICY IF EXISTS "Conexões Nibo são visíveis para autenticados" ON public.nibo_connections;
DROP POLICY IF EXISTS "Autenticados podem atualizar conexões Nibo" ON public.nibo_connections;
DROP POLICY IF EXISTS "Autenticados podem deletar conexões Nibo" ON public.nibo_connections;
DROP POLICY IF EXISTS "Autenticados podem inserir conexões Nibo" ON public.nibo_connections;

CREATE POLICY "Org members can view nibo_connections" ON public.nibo_connections FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can insert nibo_connections" ON public.nibo_connections FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can update nibo_connections" ON public.nibo_connections FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can delete nibo_connections" ON public.nibo_connections FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));

-- 9. Update triggers
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Update log_client_changes to copy organization_id
CREATE OR REPLACE FUNCTION public.log_client_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.valor_smart IS DISTINCT FROM NEW.valor_smart THEN
    INSERT INTO public.client_history (client_id, field_name, old_value, new_value, organization_id)
    VALUES (NEW.id, 'valor_smart', OLD.valor_smart::TEXT, NEW.valor_smart::TEXT, NEW.organization_id);
  END IF;
  IF OLD.valor_apoio IS DISTINCT FROM NEW.valor_apoio THEN
    INSERT INTO public.client_history (client_id, field_name, old_value, new_value, organization_id)
    VALUES (NEW.id, 'valor_apoio', OLD.valor_apoio::TEXT, NEW.valor_apoio::TEXT, NEW.organization_id);
  END IF;
  IF OLD.valor_contabilidade IS DISTINCT FROM NEW.valor_contabilidade THEN
    INSERT INTO public.client_history (client_id, field_name, old_value, new_value, organization_id)
    VALUES (NEW.id, 'valor_contabilidade', OLD.valor_contabilidade::TEXT, NEW.valor_contabilidade::TEXT, NEW.organization_id);
  END IF;
  IF OLD.valor_personalite IS DISTINCT FROM NEW.valor_personalite THEN
    INSERT INTO public.client_history (client_id, field_name, old_value, new_value, organization_id)
    VALUES (NEW.id, 'valor_personalite', OLD.valor_personalite::TEXT, NEW.valor_personalite::TEXT, NEW.organization_id);
  END IF;
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.client_history (client_id, field_name, old_value, new_value, organization_id)
    VALUES (NEW.id, 'status', OLD.status, NEW.status, NEW.organization_id);
  END IF;
  IF OLD.situacao IS DISTINCT FROM NEW.situacao THEN
    INSERT INTO public.client_history (client_id, field_name, old_value, new_value, organization_id)
    VALUES (NEW.id, 'situacao', OLD.situacao, NEW.situacao, NEW.organization_id);
  END IF;
  IF OLD.vencimento IS DISTINCT FROM NEW.vencimento THEN
    INSERT INTO public.client_history (client_id, field_name, old_value, new_value, organization_id)
    VALUES (NEW.id, 'vencimento', OLD.vencimento::TEXT, NEW.vencimento::TEXT, NEW.organization_id);
  END IF;
  IF OLD.services IS DISTINCT FROM NEW.services THEN
    INSERT INTO public.client_history (client_id, field_name, old_value, new_value, organization_id)
    VALUES (NEW.id, 'services', array_to_string(OLD.services, ','), array_to_string(NEW.services, ','), NEW.organization_id);
  END IF;
  RETURN NEW;
END;
$function$;
