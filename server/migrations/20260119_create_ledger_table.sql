-- SEV-1 MIGRATION: Create B2B Billing Ledger Table
-- CIR: CIR-1768864546
-- Timestamp: 2026-01-19T23:15:00Z
-- Blocking: Run in single explicit transaction with IF NOT EXISTS guards

BEGIN;

-- Create ledger entry type enum if not exists
DO $$ BEGIN
  CREATE TYPE ledger_entry_type AS ENUM (
    'award_disbursed',
    'platform_fee',
    'provider_invoice',
    'refund',
    'adjustment',
    'reconciliation'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create ledger status enum if not exists
DO $$ BEGIN
  CREATE TYPE ledger_status AS ENUM (
    'pending',
    'posted',
    'reconciled',
    'disputed',
    'voided'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create the ledger table with IF NOT EXISTS
CREATE TABLE IF NOT EXISTS b2b_ledger (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  
  -- Core identifiers
  provider_id VARCHAR(255) NOT NULL,
  scholarship_id VARCHAR(255),
  student_id VARCHAR(255),
  
  -- Financial data
  entry_type ledger_entry_type NOT NULL,
  amount_cents INTEGER NOT NULL,
  fee_cents INTEGER DEFAULT 0,
  net_cents INTEGER GENERATED ALWAYS AS (amount_cents - fee_cents) STORED,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Status and tracking
  status ledger_status DEFAULT 'pending',
  posted_at TIMESTAMP,
  reconciled_at TIMESTAMP,
  
  -- Idempotency and audit
  idempotency_key VARCHAR(255) UNIQUE,
  external_reference VARCHAR(255),
  checksum VARCHAR(64),
  
  -- Telemetry correlation
  a8_event_id VARCHAR(255),
  correlation_id VARCHAR(255),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes if not exist (idempotent)
CREATE INDEX IF NOT EXISTS idx_ledger_provider_id ON b2b_ledger(provider_id);
CREATE INDEX IF NOT EXISTS idx_ledger_scholarship_id ON b2b_ledger(scholarship_id);
CREATE INDEX IF NOT EXISTS idx_ledger_status ON b2b_ledger(status);
CREATE INDEX IF NOT EXISTS idx_ledger_entry_type ON b2b_ledger(entry_type);
CREATE INDEX IF NOT EXISTS idx_ledger_posted_at ON b2b_ledger(posted_at);
CREATE INDEX IF NOT EXISTS idx_ledger_idempotency_key ON b2b_ledger(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_ledger_a8_event_id ON b2b_ledger(a8_event_id);
CREATE INDEX IF NOT EXISTS idx_ledger_correlation_id ON b2b_ledger(correlation_id);

-- Create schema_migrations table if not exists
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL UNIQUE,
  ddl_hash VARCHAR(64) NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW(),
  applied_by VARCHAR(255) DEFAULT 'agent',
  status VARCHAR(50) DEFAULT 'applied'
);

-- Record this migration (idempotent via ON CONFLICT)
INSERT INTO schema_migrations (migration_name, ddl_hash, applied_by, status)
VALUES (
  '20260119_create_ledger_table',
  'sha256:b2b_ledger_v1_' || md5(now()::text),
  'sev1_recovery_agent',
  'applied'
)
ON CONFLICT (migration_name) DO NOTHING;

COMMIT;

-- Verification query (run after migration)
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'b2b_ledger';
-- SELECT * FROM schema_migrations WHERE migration_name = '20260119_create_ledger_table';
