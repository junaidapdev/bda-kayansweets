-- Migration v4: Soft-delete for credit notes
-- Adds a deleted_at column instead of permanently deleting rows.
-- Deleted records are preserved for audit but excluded from all queries.
--
-- Run this in the Supabase SQL Editor.

-- Step 1: Add deleted_at column (NULL = not deleted)
ALTER TABLE credit_notes
  ADD COLUMN deleted_at timestamptz DEFAULT NULL;

-- Step 2: Drop and recreate the unique constraint to include deleted_at IS NULL.
-- We use a partial unique index so only non-deleted rows enforce uniqueness.
-- This allows re-creation of a credit note after soft-deleting the original.
ALTER TABLE credit_notes
  DROP CONSTRAINT IF EXISTS uq_credit_notes_supplier_period;

CREATE UNIQUE INDEX uq_credit_notes_supplier_period
  ON credit_notes (supplier_id, rebate_type, period_start, period_end)
  WHERE deleted_at IS NULL;

-- Verify
SELECT indexname, indexdef
  FROM pg_indexes
 WHERE tablename = 'credit_notes'
   AND indexname = 'uq_credit_notes_supplier_period';
