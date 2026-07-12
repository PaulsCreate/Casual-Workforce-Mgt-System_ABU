-- 000_setup_functions.sql
-- Shared trigger function to auto-update the updated_at column on mutable tables.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
