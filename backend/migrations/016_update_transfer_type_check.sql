-- 016_update_transfer_type_check.sql
-- Allow transfer_type to be 'intra_division' (instant) or 'inter_division' (requires super admin approval),
-- while retaining backwards compatibility with ('internal', 'inter_unit').

ALTER TABLE transfers DROP CONSTRAINT IF EXISTS transfers_transfer_type_check;
ALTER TABLE transfers ADD CONSTRAINT transfers_transfer_type_check 
  CHECK (transfer_type IN ('internal', 'inter_unit', 'intra_division', 'inter_division'));

ALTER TABLE transfers DROP CONSTRAINT IF EXISTS transfers_check;
ALTER TABLE transfers ADD CONSTRAINT transfers_check
  CHECK (
    transfer_type IN ('internal', 'intra_division')
    OR authorized_by IS NOT NULL
    OR status IN ('pending', 'rejected')
  );
