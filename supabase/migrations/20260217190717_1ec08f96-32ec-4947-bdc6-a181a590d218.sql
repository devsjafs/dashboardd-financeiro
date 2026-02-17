
-- Fix: Allow authenticated users to INSERT organizations
CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create organization_invites table
CREATE TABLE public.organization_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'member',
  invited_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  accepted_at timestamp with time zone,
  UNIQUE(organization_id, email)
);

ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- Org admins/owners can view invites
CREATE POLICY "Org admins can view invites"
ON public.organization_invites
FOR SELECT
TO authenticated
USING (
  get_user_role_in_org(auth.uid(), organization_id) IN ('owner'::app_role, 'admin'::app_role)
);

-- Org admins/owners can create invites
CREATE POLICY "Org admins can create invites"
ON public.organization_invites
FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role_in_org(auth.uid(), organization_id) IN ('owner'::app_role, 'admin'::app_role)
);

-- Org admins/owners can delete invites
CREATE POLICY "Org admins can delete invites"
ON public.organization_invites
FOR DELETE
TO authenticated
USING (
  get_user_role_in_org(auth.uid(), organization_id) IN ('owner'::app_role, 'admin'::app_role)
);

-- Function to auto-accept invite on login
CREATE OR REPLACE FUNCTION public.accept_pending_invite(_user_id uuid, _email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite RECORD;
BEGIN
  SELECT * INTO invite FROM organization_invites
    WHERE email = _email AND accepted_at IS NULL
    LIMIT 1;
  
  IF FOUND THEN
    -- Add user to org
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (invite.organization_id, _user_id, invite.role)
    ON CONFLICT DO NOTHING;
    
    -- Mark invite as accepted
    UPDATE organization_invites SET accepted_at = now() WHERE id = invite.id;
  END IF;
END;
$$;
