-- Migration 015: Absence Logs
-- Stores supervisor-logged absence reasons for audit/accountability purposes.
-- Does NOT create an attendance record; pay register is unaffected.

CREATE TABLE IF NOT EXISTS absence_logs (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    assignment_id   BIGINT      NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    absence_date    DATE        NOT NULL,
    reason          TEXT        NOT NULL,
    logged_by       BIGINT      NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (assignment_id, absence_date)
);

CREATE INDEX IF NOT EXISTS idx_absence_logs_assignment ON absence_logs (assignment_id);
CREATE INDEX IF NOT EXISTS idx_absence_logs_date ON absence_logs (absence_date);
