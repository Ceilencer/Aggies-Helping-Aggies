-- Migration: add_account_status_and_relax_email_constraint
-- Applied: 2026-03-01
-- Description:
--   1. Adds account_status enum (active, pending_approval, suspended) to profiles.
--   2. Drops the email_domain_check constraint so any OAuth domain can register.
--   3. Adds flair and rules_acknowledged_at columns if missing.
--   4. Creates an index on account_status for admin queries.

-- Add account_status enum
CREATE TYPE account_status AS ENUM ('active', 'pending_approval', 'suspended');

-- Add account_status column to profiles (all existing users → active)
ALTER TABLE profiles
  ADD COLUMN account_status account_status NOT NULL DEFAULT 'active';

-- Drop the restrictive email domain check so any OAuth domain can be stored
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS email_domain_check;

-- Add flair column if it doesn't exist
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS flair TEXT;

-- Add rules_acknowledged_at if it doesn't exist
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS rules_acknowledged_at TIMESTAMPTZ;

-- Add an index on account_status for admin queries
CREATE INDEX idx_profiles_account_status ON profiles(account_status);
