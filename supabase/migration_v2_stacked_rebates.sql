-- ============================================================
-- KNC Discount — Migration v2: Stacked Rebate Layers
--
-- WHAT CHANGED:
-- Each supplier now has ALL rebate layers stacked simultaneously:
--   monthly, quarterly_base, quarterly_bonus, yearly, rent
-- Purchases no longer have a bda_category — they simply accrue.
-- Credit notes must reference a specific rebate_type.
-- New rebate_accruals table tracks each layer per period.
--
-- Run this in the Supabase SQL Editor AFTER the v1 schema.
-- ============================================================

-- 1. SUPPLIERS: drop bda_category, migrate rebate_rules keys
ALTER TABLE suppliers DROP COLUMN IF EXISTS bda_category;

-- Migrate existing rebate_rules JSONB to new key names:
--   monthly_rebate   → monthly_rate
--   quarterly_rebate → quarterly_base_rate
--   yearly_rebate    → yearly_rate
--   yearly_combined  → yearly_rate (if yearly_rebate is null)
--   rent_percent     → rent_value  (with rent_type = 'percentage')
UPDATE suppliers
SET rebate_rules = jsonb_build_object(
    'monthly_rate',         COALESCE((rebate_rules ->> 'monthly_rebate')::numeric, 0),
    'quarterly_base_rate',  COALESCE((rebate_rules ->> 'quarterly_rebate')::numeric, 0),
    'quarterly_bonus_rate', 0,
    'yearly_rate',          COALESCE(
                                (rebate_rules ->> 'yearly_rebate')::numeric,
                                (rebate_rules ->> 'yearly_combined')::numeric,
                                0
                            ),
    'rent_type',            CASE
                                WHEN (rebate_rules ->> 'rent_percent') IS NOT NULL THEN 'percentage'
                                ELSE 'percentage'
                            END,
    'rent_value',           COALESCE((rebate_rules ->> 'rent_percent')::numeric, 0),
    'monthly_target',       (rebate_rules ->> 'monthly_target')::numeric,
    'quarterly_target',     NULL::numeric,
    'yearly_target',        (rebate_rules ->> 'yearly_target')::numeric
);

-- 2. PURCHASE_ORDERS: drop bda_category
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS bda_category;

-- 3. CREDIT_NOTES: add rebate_type column
ALTER TABLE credit_notes
    ADD COLUMN IF NOT EXISTS rebate_type text NOT NULL DEFAULT 'monthly'
    CHECK (rebate_type IN ('monthly', 'quarterly_base', 'quarterly_bonus', 'yearly', 'rent'));

-- 4. NEW TABLE: rebate_accruals
CREATE TABLE IF NOT EXISTS rebate_accruals (
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

CREATE INDEX IF NOT EXISTS idx_rebate_accruals_supplier ON rebate_accruals(supplier_id);
CREATE INDEX IF NOT EXISTS idx_rebate_accruals_period   ON rebate_accruals(period_start, period_end);

-- 5. Disable RLS on new table
ALTER TABLE rebate_accruals DISABLE ROW LEVEL SECURITY;

-- 6. Drop the old single-category BDA function
DROP FUNCTION IF EXISTS calculate_period_bda(uuid, date, date);

-- 7. Drop the old current_user_role function (no auth)
DROP FUNCTION IF EXISTS current_user_role();
