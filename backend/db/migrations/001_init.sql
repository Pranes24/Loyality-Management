-- Loyalty Management System — Initial Schema
-- Run via: node db/migrate.js

-- Admin wallet (single row, id always = 1)
CREATE TABLE IF NOT EXISTS admin_wallet (
  id              INTEGER PRIMARY KEY DEFAULT 1,
  balance         DECIMAL(10,2) DEFAULT 0,
  total_funded    DECIMAL(10,2) DEFAULT 0,
  total_debited   DECIMAL(10,2) DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insert the single admin wallet row if not exists
INSERT INTO admin_wallet (id, balance, total_funded, total_debited)
VALUES (1, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Admin wallet transaction history
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type         VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
  amount       DECIMAL(10,2) NOT NULL,
  qr_id        UUID,
  batch_id     UUID,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Batches
CREATE TABLE IF NOT EXISTS batches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code   VARCHAR(20) UNIQUE NOT NULL,
  name         VARCHAR(255) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  total_amount DECIMAL(10,2),
  qr_count     INTEGER DEFAULT 500,
  dist_mode    VARCHAR(10) CHECK (dist_mode IN ('auto', 'manual')),
  status       VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'funded', 'paused', 'exhausted', 'expired')),
  expires_at   DATE,
  funded_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Individual QR codes
CREATE TABLE IF NOT EXISTS qr_codes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id     UUID REFERENCES batches(id),
  amount       DECIMAL(10,2),
  status       VARCHAR(20) DEFAULT 'generated' CHECK (status IN ('generated', 'funded', 'scanning', 'redeemed', 'wallet_credited', 'pending_reason', 'expired')),
  expires_at   DATE,
  scanned_at   TIMESTAMPTZ,
  user_name    VARCHAR(255),
  user_mobile  VARCHAR(15),
  upi_id       VARCHAR(255),
  reason       TEXT,
  redeemed_at  TIMESTAMPTZ,
  txn_id       VARCHAR(255)
);

-- Users (auto-created on first OTP verification)
CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile                VARCHAR(15) UNIQUE NOT NULL,
  name                  VARCHAR(255),
  upi_id                VARCHAR(255),
  wallet_balance        DECIMAL(10,2) DEFAULT 0,
  total_scans           INTEGER DEFAULT 0,
  total_redeemed        INTEGER DEFAULT 0,
  total_wallet_credits  INTEGER DEFAULT 0,
  total_pending         INTEGER DEFAULT 0,
  total_earned          DECIMAL(10,2) DEFAULT 0,
  total_wallet_in       DECIMAL(10,2) DEFAULT 0,
  total_wallet_out      DECIMAL(10,2) DEFAULT 0,
  registered_at         TIMESTAMPTZ DEFAULT NOW(),
  last_scan_at          TIMESTAMPTZ
);

-- User wallet transactions
CREATE TABLE IF NOT EXISTS user_wallet_transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id),
  type         VARCHAR(15) NOT NULL CHECK (type IN ('credit', 'withdrawal')),
  amount       DECIMAL(10,2) NOT NULL,
  qr_id        UUID,
  batch_code   VARCHAR(20),
  product_name VARCHAR(255),
  upi_id       VARCHAR(255),
  txn_id       VARCHAR(255),
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Scan history (append-only audit trail)
CREATE TABLE IF NOT EXISTS scan_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id),
  qr_id        UUID REFERENCES qr_codes(id),
  batch_id     UUID REFERENCES batches(id),
  batch_code   VARCHAR(20),
  product_name VARCHAR(255),
  amount       DECIMAL(10,2),
  action       VARCHAR(20) CHECK (action IN ('redeemed', 'wallet_credited', 'pending_reason')),
  upi_id       VARCHAR(255),
  reason       TEXT,
  txn_id       VARCHAR(255),
  scanned_at   TIMESTAMPTZ DEFAULT NOW()
);

-- OTP sessions
CREATE TABLE IF NOT EXISTS otp_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile     VARCHAR(15) NOT NULL,
  otp        VARCHAR(6) NOT NULL,
  qr_id      UUID,
  expires_at TIMESTAMPTZ NOT NULL,
  verified   BOOLEAN DEFAULT FALSE,
  attempts   INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_qr_codes_batch_id ON qr_codes(batch_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON qr_codes(status);
CREATE INDEX IF NOT EXISTS idx_scan_history_user_id ON scan_history(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_batch_id ON scan_history(batch_id);
CREATE INDEX IF NOT EXISTS idx_otp_sessions_mobile ON otp_sessions(mobile);
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_wallet_transactions_user ON user_wallet_transactions(user_id);
