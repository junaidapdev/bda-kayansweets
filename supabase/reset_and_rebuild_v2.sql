-- ============================================================
-- KNC Discount — Full Reset & Rebuild (v2 — Stacked Rebates)
-- Run this in the Supabase SQL Editor.
-- WARNING: This drops all data. Only use on a fresh/dev database.
-- ============================================================

-- ============================================================
-- STEP 1: DROP EVERYTHING (in reverse dependency order)
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'credit_notes') THEN
    DROP TRIGGER IF EXISTS trg_credit_notes_discrepancy ON credit_notes;
  END IF;
END $$;
DROP FUNCTION IF EXISTS set_discrepancy_flag();
DROP FUNCTION IF EXISTS calculate_period_bda(uuid, date, date);
DROP FUNCTION IF EXISTS current_user_role();

DROP TABLE IF EXISTS rebate_accruals  CASCADE;
DROP TABLE IF EXISTS point_ledger     CASCADE;
DROP TABLE IF EXISTS credit_notes     CASCADE;
DROP TABLE IF EXISTS purchase_orders  CASCADE;
DROP TABLE IF EXISTS user_profiles    CASCADE;
DROP TABLE IF EXISTS suppliers        CASCADE;

-- ============================================================
-- STEP 2: SUPPLIERS
-- rebate_rules JSONB holds all stacked rebate layers.
-- ============================================================
CREATE TABLE suppliers (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name          text        NOT NULL UNIQUE,
    rebate_rules  jsonb       NOT NULL DEFAULT '{}'::jsonb,
    target_amount numeric,
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- STEP 3: PURCHASE ORDERS
-- ============================================================
CREATE TABLE purchase_orders (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id     uuid        NOT NULL REFERENCES suppliers(id),
    order_date      date        NOT NULL,
    purchase_amount numeric     NOT NULL,
    notes           text,
    created_by      uuid        REFERENCES auth.users(id),
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_order_date  ON purchase_orders(order_date);

-- ============================================================
-- STEP 4: CREDIT NOTES
-- ============================================================
CREATE TABLE credit_notes (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id      uuid        NOT NULL REFERENCES suppliers(id),
    rebate_type      text        NOT NULL
                     CHECK (rebate_type IN ('monthly', 'quarterly_base', 'quarterly_bonus', 'yearly', 'rent')),
    period_start     date        NOT NULL,
    period_end       date        NOT NULL,
    expected_amount  numeric     NOT NULL,
    received_amount  numeric     NOT NULL DEFAULT 0,
    status           text        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'received', 'disputed')),
    discrepancy_flag boolean     NOT NULL DEFAULT false,
    verified_by      uuid        REFERENCES auth.users(id),
    verified_at      timestamptz,
    created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_notes_supplier_id ON credit_notes(supplier_id);
CREATE INDEX idx_credit_notes_status      ON credit_notes(status);

-- ============================================================
-- STEP 5: REBATE ACCRUALS
-- ============================================================
CREATE TABLE rebate_accruals (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id     uuid        NOT NULL REFERENCES suppliers(id),
    rebate_type     text        NOT NULL
                    CHECK (rebate_type IN ('monthly', 'quarterly_base', 'quarterly_bonus', 'yearly', 'rent')),
    period_start    date        NOT NULL,
    period_end      date        NOT NULL,
    total_purchases numeric     NOT NULL DEFAULT 0,
    rate            numeric     NOT NULL DEFAULT 0,
    expected_amount numeric     NOT NULL DEFAULT 0,
    status          text        NOT NULL DEFAULT 'accrued'
                    CHECK (status IN ('accrued', 'invoiced', 'received')),
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rebate_accruals_supplier ON rebate_accruals(supplier_id);
CREATE INDEX idx_rebate_accruals_period   ON rebate_accruals(period_start, period_end);

-- ============================================================
-- STEP 6: POINT LEDGER
-- ============================================================
CREATE TABLE point_ledger (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id      uuid        REFERENCES suppliers(id),
    item_description text        NOT NULL,
    points_earned    integer     NOT NULL,
    redeemed         boolean     NOT NULL DEFAULT false,
    redeemed_for     text,
    created_at       timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- STEP 7: USER PROFILES
-- ============================================================
CREATE TABLE user_profiles (
    id         uuid        PRIMARY KEY REFERENCES auth.users(id),
    full_name  text        NOT NULL,
    role       text        NOT NULL
               CHECK (role IN ('accounts', 'purchase_manager')),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- STEP 8: AUTO-SET discrepancy_flag ON credit_notes
-- ============================================================
CREATE OR REPLACE FUNCTION set_discrepancy_flag()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.discrepancy_flag := (NEW.received_amount IS DISTINCT FROM NEW.expected_amount);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_credit_notes_discrepancy
    BEFORE INSERT OR UPDATE ON credit_notes
    FOR EACH ROW
    EXECUTE FUNCTION set_discrepancy_flag();

-- ============================================================
-- STEP 9: DISABLE ROW LEVEL SECURITY (no auth required)
-- ============================================================
ALTER TABLE suppliers        DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders  DISABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes     DISABLE ROW LEVEL SECURITY;
ALTER TABLE rebate_accruals  DISABLE ROW LEVEL SECURITY;
ALTER TABLE point_ledger     DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles    DISABLE ROW LEVEL SECURITY;
