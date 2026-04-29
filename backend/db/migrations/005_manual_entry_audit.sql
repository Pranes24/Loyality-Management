-- Migration 005 — Audit log for manual QR number entry attempts
-- Stories: US-052, US-053

CREATE TABLE IF NOT EXISTS manual_entry_audit (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip         TEXT        NOT NULL,
  org_code   TEXT        NOT NULL,
  qr_number  INTEGER     NOT NULL,
  result     TEXT        NOT NULL CHECK (result IN ('success','not_found','invalid_state','rate_limited','invalid_input')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manual_entry_audit_org  ON manual_entry_audit(org_code);
CREATE INDEX IF NOT EXISTS idx_manual_entry_audit_time ON manual_entry_audit(created_at DESC);
