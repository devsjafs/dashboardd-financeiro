-- ============================================================
-- P0: Add deleted_at to boletos (soft delete for paid boletos)
-- ============================================================
ALTER TABLE public.boletos 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_boletos_deleted_at 
ON public.boletos (deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- P0: Add nibo_synced_at and nibo_deleted_at for traceability
-- ============================================================
ALTER TABLE public.boletos
ADD COLUMN IF NOT EXISTS nibo_synced_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS nibo_deleted_at TIMESTAMPTZ DEFAULT NULL;

-- ============================================================
-- P1: Create audit_logs table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON public.audit_logs (organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

-- Only owners and admins can view audit logs
CREATE POLICY "Admins can view audit_logs"
ON public.audit_logs FOR SELECT
USING (
  organization_id = get_user_org_id(auth.uid()) AND
  get_user_role_in_org(auth.uid(), organization_id) IN ('owner', 'admin')
);

-- Only edge functions (service role) insert audit logs
-- No direct INSERT policy for regular users intentionally

-- ============================================================
-- P2: Concurrency lock helper via settings key
-- ============================================================
-- (Uses existing settings table — no migration needed)

-- ============================================================
-- P2: Index for nibo_deleted_at to find cancelled boletos
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_boletos_nibo_schedule_id 
ON public.boletos (nibo_schedule_id) WHERE nibo_schedule_id IS NOT NULL;