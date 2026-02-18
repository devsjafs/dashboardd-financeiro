
-- Fix: Create a safe view for nibo_connections that excludes sensitive API credentials
-- and restrict direct table SELECT access so tokens can't be exfiltrated

-- 1. Drop the existing permissive SELECT policy
DROP POLICY IF EXISTS "Org members can view nibo_connections" ON public.nibo_connections;

-- 2. Create a restrictive SELECT policy that blocks direct table access
-- (The edge function uses service_role which bypasses RLS, so it still works)
CREATE POLICY "Block direct SELECT on nibo_connections"
ON public.nibo_connections FOR SELECT
TO authenticated
USING (false);

-- 3. Create a safe view that exposes only non-sensitive columns
CREATE OR REPLACE VIEW public.nibo_connections_safe AS
SELECT id, nome, organization_id, created_at, updated_at
FROM public.nibo_connections
WHERE organization_id = public.get_user_org_id(auth.uid());

-- 4. Grant SELECT on the safe view to authenticated users
GRANT SELECT ON public.nibo_connections_safe TO authenticated;
