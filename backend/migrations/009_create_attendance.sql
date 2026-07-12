-- 009_create_attendance.sql
-- A row is only inserted when a worker is marked present. Absence is implicit
-- (no row for that assignment/date). Monthly "days worked" totals are a
-- COUNT(*) over this table grouped by assignment and month.

CREATE TABLE attendance (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    assignment_id BIGINT NOT NULL REFERENCES assignments(id) ON DELETE RESTRICT,
    attendance_date DATE NOT NULL,
    capture_method VARCHAR(20) NOT NULL DEFAULT 'web' CHECK (capture_method IN ('web', 'fingerprint', 'facial')),
    marked_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (assignment_id, attendance_date)
);

CREATE INDEX idx_attendance_date ON attendance(attendance_date);
