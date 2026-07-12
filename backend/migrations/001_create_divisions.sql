
CREATE TABLE divisions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_divisions_updated_at
    BEFORE UPDATE ON divisions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at()\;
