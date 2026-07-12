-- 008_create_transfers.sql

CREATE TABLE transfers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    worker_id BIGINT NOT NULL REFERENCES workers(id) ON DELETE RESTRICT,
    from_assignment_id BIGINT NOT NULL REFERENCES assignments(id) ON DELETE RESTRICT,
    to_division_id BIGINT NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
    to_operational_unit_id BIGINT NOT NULL REFERENCES operational_units(id) ON DELETE RESTRICT,
    to_operational_location_id BIGINT NOT NULL REFERENCES operational_locations(id) ON DELETE RESTRICT,
    transfer_type VARCHAR(20) NOT NULL CHECK (transfer_type IN ('internal', 'inter_unit')),
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    requested_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    authorized_by BIGINT REFERENCES users(id) ON DELETE RESTRICT,
    transfer_letter_reference VARCHAR(150),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at TIMESTAMPTZ,
    -- Inter-unit transfers must carry an authorizing user before they can be
    -- approved or completed; internal transfers do not require this.
    CHECK (
        transfer_type = 'internal'
        OR authorized_by IS NOT NULL
        OR status IN ('pending', 'rejected')
    )
);

ALTER TABLE assignments
    ADD CONSTRAINT fk_assignments_transfer
    FOREIGN KEY (transfer_id) REFERENCES transfers(id) ON DELETE SET NULL;

CREATE INDEX idx_transfers_worker_id ON transfers(worker_id);
CREATE INDEX idx_transfers_status ON transfers(status);
