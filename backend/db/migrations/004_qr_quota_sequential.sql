-- Migration 004 — QR Quota per Organisation + Sequential QR Numbers
-- Stories: US-047, US-050
-- Phase 1 of QR Quota & Sequential Numbering feature

-- ── Step 1: Add qr_quota to organizations ────────────────────────────────────
-- Default 0 means "not yet assigned" — org admin cannot create batches until
-- super admin sets a quota > 0
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS qr_quota INTEGER NOT NULL DEFAULT 0;

-- Give existing orgs a working quota equal to their current QR count + 10000
-- so existing operations are not disrupted. Super admin can adjust from the UI.
UPDATE organizations o
SET qr_quota = (
  SELECT COALESCE(COUNT(qr.id), 0) + 10000
  FROM batches b
  JOIN qr_codes qr ON qr.batch_id = b.id
  WHERE b.org_id = o.id
);

-- ── Step 2: Add org_id to qr_codes (for the unique constraint) ───────────────
-- qr_codes currently only links to batches; we need org_id directly so we can
-- enforce UNIQUE(org_id, qr_number) without a join
ALTER TABLE qr_codes
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);

-- Backfill org_id from the parent batch
UPDATE qr_codes q
SET org_id = b.org_id
FROM batches b
WHERE q.batch_id = b.id
  AND q.org_id IS NULL;

-- Index for org_id lookups on qr_codes
CREATE INDEX IF NOT EXISTS idx_qr_codes_org_id ON qr_codes(org_id);

-- ── Step 3: Add qr_number column ─────────────────────────────────────────────
ALTER TABLE qr_codes
  ADD COLUMN IF NOT EXISTS qr_number INTEGER;

-- ── Step 4: Backfill sequential numbers for existing QR codes ────────────────
-- Numbers are assigned per org, ordered by batch creation then qr id.
-- Gaps are acceptable; once assigned a number never changes.
WITH numbered AS (
  SELECT
    q.id,
    ROW_NUMBER() OVER (
      PARTITION BY b.org_id
      ORDER BY b.created_at, q.id
    ) AS rn
  FROM qr_codes q
  JOIN batches b ON q.batch_id = b.id
  WHERE b.org_id IS NOT NULL
)
UPDATE qr_codes q
SET qr_number = n.rn
FROM numbered n
WHERE q.id = n.id
  AND q.qr_number IS NULL;

-- ── Step 5: Apply NOT NULL + UNIQUE constraints ───────────────────────────────
-- Only after backfill so existing rows satisfy the constraint
-- Set any remaining NULL qr_numbers (QR codes with no org) to 0 as placeholder
UPDATE qr_codes SET qr_number = 0 WHERE qr_number IS NULL;

ALTER TABLE qr_codes
  ALTER COLUMN qr_number SET NOT NULL,
  ALTER COLUMN qr_number SET DEFAULT 0;

-- Unique sequential number within each org
ALTER TABLE qr_codes
  DROP CONSTRAINT IF EXISTS qr_codes_org_number_unique;

ALTER TABLE qr_codes
  ADD CONSTRAINT qr_codes_org_number_unique UNIQUE (org_id, qr_number);

-- Composite index for fast manual-entry lookup: (org_id, qr_number)
CREATE INDEX IF NOT EXISTS idx_qr_codes_org_number ON qr_codes(org_id, qr_number);
