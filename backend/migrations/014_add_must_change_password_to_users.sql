-- Migration 014: Add must_change_password and last_login_at to users table

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
