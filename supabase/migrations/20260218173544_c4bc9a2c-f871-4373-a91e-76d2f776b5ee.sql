
-- Fix: Recreate view WITHOUT security_invoker so it can bypass the base table's USING(false) RLS
-- The view's WHERE clause already filters by org, so SECURITY DEFINER is safe here.

DROP VIEW IF EXISTS public.nibo_connections_safe;

CREATE OR REPLACE VIEW public.nibo_connections_safe AS
SELECT id, nome, organization_id, created_at, updated_at
FROM public.nibo_connections
WHERE organization_id = public.get_user_org_id(auth.uid());

-- Grant SELECT on the safe view to authenticated users
GRANT SELECT ON public.nibo_connections_safe TO authenticated;
