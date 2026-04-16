-- Migration v3: Prevent duplicate credit notes
-- Adds a unique constraint on (supplier_id, rebate_type, period_start, period_end)
-- so only one credit note can exist per supplier + rebate layer + period.
--
-- Run this in the Supabase SQL Editor.

-- Step 1: Remove existing duplicates, keeping only the most recent row per group
DELETE FROM credit_notes
WHERE id NOT IN (
  SELECT DISTINCT ON (supplier_id, rebate_type, period_start, period_end) id
  FROM credit_notes
  ORDER BY supplier_id, rebate_type, period_start, period_end, created_at DESC
);

-- Step 2: Add unique constraint
ALTER TABLE credit_notes
  ADD CONSTRAINT uq_credit_notes_supplier_period
  UNIQUE (supplier_id, rebate_type, period_start, period_end);

-- Verify
SELECT conname, contype
  FROM pg_constraint
 WHERE conrelid = 'credit_notes'::regclass
   AND conname = 'uq_credit_notes_supplier_period';
