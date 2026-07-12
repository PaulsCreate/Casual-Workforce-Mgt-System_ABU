-- 005_create_location_supervisors.sql
-- Join table: a location can have more than one supervisor, and a supervisor
-- can be responsible for more than one location.
-- Application layer must enforce that user_id references a user with role = 'supervisor'.

CREATE TABLE location_supervisors (
    location_id BIGINT NOT NULL REFERENCES operational_locations(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (location_id, user_id)
);
