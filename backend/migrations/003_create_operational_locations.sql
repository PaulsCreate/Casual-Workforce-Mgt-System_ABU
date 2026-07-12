-- 003_create_operational_locations.sql

CREATE TABLE operational_locations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    operational_unit_id BIGINT NOT NULL REFERENCES operational_units(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (operational_unit_id, name)
);

CREATE TRIGGER trg_operational_locations_updated_at
    BEFORE UPDATE ON operational_locations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
