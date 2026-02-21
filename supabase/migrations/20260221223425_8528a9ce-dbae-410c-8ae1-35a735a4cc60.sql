
-- Generic billing connections table for Safe2Pay, Asaas, Conta Azul
CREATE TABLE public.billing_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  provider TEXT NOT NULL, -- 'safe2pay' | 'asaas' | 'contaazul'
  nome TEXT NOT NULL,
  api_token TEXT NOT NULL DEFAULT '',
  api_key TEXT NOT NULL DEFAULT '',
  extra_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.billing_connections ENABLE ROW LEVEL SECURITY;

-- Block direct SELECT (same pattern as nibo_connections for credential protection)
CREATE POLICY "Block direct SELECT on billing_connections"
  ON public.billing_connections FOR SELECT
  USING (false);

CREATE POLICY "Org members can insert billing_connections"
  ON public.billing_connections FOR INSERT
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org members can update billing_connections"
  ON public.billing_connections FOR UPDATE
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org members can delete billing_connections"
  ON public.billing_connections FOR DELETE
  USING (organization_id = get_user_org_id(auth.uid()));

-- Safe view (no sensitive fields)
CREATE VIEW public.billing_connections_safe AS
  SELECT id, organization_id, provider, nome, created_at, updated_at
  FROM public.billing_connections;

-- Trigger for updated_at
CREATE TRIGGER update_billing_connections_updated_at
  BEFORE UPDATE ON public.billing_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
