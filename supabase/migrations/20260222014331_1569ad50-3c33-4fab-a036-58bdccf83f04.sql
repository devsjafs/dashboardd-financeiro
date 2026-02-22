CREATE TABLE public.reajuste_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  indice_usado TEXT NOT NULL,
  percentual_aplicado NUMERIC NOT NULL,
  valor_anterior JSONB NOT NULL DEFAULT '{}'::jsonb,
  valor_novo JSONB NOT NULL DEFAULT '{}'::jsonb,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_by UUID NOT NULL
);

ALTER TABLE public.reajuste_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view reajuste_history"
  ON public.reajuste_history FOR SELECT
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org members can insert reajuste_history"
  ON public.reajuste_history FOR INSERT
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));
