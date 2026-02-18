
-- Fix: Recreate the view with SECURITY INVOKER (not SECURITY DEFINER)
-- to ensure it runs with the querying user's permissions, not the owner's

DROP VIEW IF EXISTS public.nibo_connections_safe;

CREATE OR REPLACE VIEW public.nibo_connections_safe
WITH (security_invoker = true)
AS
SELECT id, nome, organization_id, created_at, updated_at
FROM public.nibo_connections
WHERE organization_id = public.get_user_org_id(auth.uid());

-- Grant SELECT on the safe view to authenticated users
GRANT SELECT ON public.nibo_connections_safe TO authenticated;
