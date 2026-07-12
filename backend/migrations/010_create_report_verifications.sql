-- 010_create_report_verifications.sql

CREATE TABLE report_verifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    operational_location_id BIGINT NOT NULL REFERENCES operational_locations(id) ON DELETE RESTRICT,
    period_month SMALLINT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year SMALLINT NOT NULL CHECK (period_year >= 2020),
    status VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'verified')),
    submitted_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    verified_by BIGINT REFERENCES users(id) ON DELETE RESTRICT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (operational_location_id, period_month, period_year)
);
