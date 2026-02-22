
-- Drop and recreate the view with org-level security
DROP VIEW IF EXISTS public.billing_connections_safe;

CREATE VIEW public.billing_connections_safe 
WITH (security_invoker = true)
AS
  SELECT id, organization_id, provider, nome, created_at, updated_at
  FROM public.billing_connections;

-- Add a permissive SELECT policy so the security_invoker view can read
CREATE POLICY "Org members can view billing_connections"
  ON public.billing_connections FOR SELECT
  USING (organization_id = get_user_org_id(auth.uid()));

-- Drop the blocking policy since we now have a proper org-scoped one
DROP POLICY IF EXISTS "Block direct SELECT on billing_connections" ON public.billing_connections;
