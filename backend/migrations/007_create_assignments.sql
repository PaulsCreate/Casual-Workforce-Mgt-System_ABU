-- 007_create_assignments.sql
-- transfer_id has no FK constraint yet: transfers references assignments
-- (from_assignment_id), so the reverse FK is added in 008 after transfers exists.

CREATE TABLE assignments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    worker_id BIGINT NOT NULL REFERENCES workers(id) ON DELETE RESTRICT,
    division_id BIGINT NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
    operational_unit_id BIGINT NOT NULL REFERENCES operational_units(id) ON DELETE RESTRICT,
    operational_location_id BIGINT NOT NULL REFERENCES operational_locations(id) ON DELETE RESTRICT,
    supervisor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    effective_from DATE NOT NULL,
    effective_to DATE,
    transfer_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

-- Core business rule: a worker may have at most one open (current) assignment
-- at any time. Enforced structurally, not just in application code.
CREATE UNIQUE INDEX one_active_assignment_per_worker
    ON assignments (worker_id)
    WHERE effective_to IS NULL;

CREATE INDEX idx_assignments_worker_id ON assignments(worker_id);
CREATE INDEX idx_assignments_location_id ON assignments(operational_location_id);
