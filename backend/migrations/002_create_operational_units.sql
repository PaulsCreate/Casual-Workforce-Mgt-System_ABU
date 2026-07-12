-- 002_create_operational_units.sql

CREATE TABLE operational_units (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    division_id BIGINT NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (division_id, name)
);

CREATE TRIGGER trg_operational_units_updated_at
    BEFORE UPDATE ON operational_units
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
