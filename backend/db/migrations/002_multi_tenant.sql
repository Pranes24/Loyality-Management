-- Multi-tenant migration: organizations, admin_users, org_wallets
-- Migrates all existing data into "Test Org"

-- Step 1: Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL,
  org_code   VARCHAR(20) UNIQUE NOT NULL,
  status     VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Admin users (super_admin + org_admin with email/password auth)
CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'org_admin')),
  name          VARCHAR(255),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Per-org wallets (replaces single admin_wallet)
CREATE TABLE IF NOT EXISTS org_wallets (
  org_id        UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  balance       DECIMAL(10,2) DEFAULT 0,
  total_funded  DECIMAL(10,2) DEFAULT 0,
  total_debited DECIMAL(10,2) DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Add org_id to existing tables
ALTER TABLE batches             ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);

-- Step 5: Migrate existing data to "Test Org"
DO $$
DECLARE
  test_org_id  UUID;
  old_balance  DECIMAL;
  old_funded   DECIMAL;
  old_debited  DECIMAL;
BEGIN
  -- Create Test Org
  INSERT INTO organizations (name, org_code)
  VALUES ('Test Org', 'TESTORG')
  ON CONFLICT (org_code) DO NOTHING;

  SELECT id INTO test_org_id FROM organizations WHERE org_code = 'TESTORG';

  -- Migrate admin_wallet balance to Test Org wallet
  SELECT balance, total_funded, total_debited
  INTO old_balance, old_funded, old_debited
  FROM admin_wallet WHERE id = 1;

  INSERT INTO org_wallets (org_id, balance, total_funded, total_debited)
  VALUES (test_org_id,
          COALESCE(old_balance, 0),
          COALESCE(old_funded, 0),
          COALESCE(old_debited, 0))
  ON CONFLICT (org_id) DO NOTHING;

  -- Assign all existing batches to Test Org
  UPDATE batches SET org_id = test_org_id WHERE org_id IS NULL;

  -- Assign all existing wallet_transactions to Test Org
  UPDATE wallet_transactions SET org_id = test_org_id WHERE org_id IS NULL;
END $$;

-- Step 6: Indexes
CREATE INDEX IF NOT EXISTS idx_batches_org_id             ON batches(org_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_org_id ON wallet_transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_org_id         ON admin_users(org_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email          ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_organizations_org_code     ON organizations(org_code);
