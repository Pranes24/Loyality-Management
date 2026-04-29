-- Migration 007 — QR Pool Allocations
-- Super admin generates QR codes into a pool per org; org admin claims from pool when creating batches.
-- Previously: QR codes were generated at batch-creation time by org admin.
-- Now: Super admin generates QR codes (prints + distributes), org admin claims them into batches.

-- ── Step 1: Add 'available' status ───────────────────────────────────────────
-- 'available' = in the org's pool, not yet claimed into a batch
ALTER TABLE qr_codes
  DROP CONSTRAINT IF EXISTS qr_codes_status_check;

ALTER TABLE qr_codes
  ADD CONSTRAINT qr_codes_status_check
  CHECK (status IN ('available', 'generated', 'funded', 'scanning', 'redeemed',
                    'wallet_credited', 'pending_reason', 'expired'));

-- ── Step 2: qr_allocations — tracks each super admin generation event ────────
CREATE TABLE IF NOT EXISTS qr_allocations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  count        INTEGER NOT NULL CHECK (count > 0),
  serial_from  INTEGER NOT NULL,
  serial_to    INTEGER NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_allocations_org_id ON qr_allocations(org_id);

-- ── Step 3: Link qr_codes back to their allocation event ─────────────────────
ALTER TABLE qr_codes
  ADD COLUMN IF NOT EXISTS allocation_id UUID REFERENCES qr_allocations(id);

CREATE INDEX IF NOT EXISTS idx_qr_codes_allocation_id ON qr_codes(allocation_id);
