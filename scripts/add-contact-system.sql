-- =============================================
-- ADD CONTACT SYSTEM
-- Run this in Supabase SQL editor
-- =============================================

-- Add contact fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_email_visibility TEXT DEFAULT 'private'
    CHECK (contact_email_visibility IN ('public', 'private')),
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS phone_number_visibility TEXT DEFAULT 'private'
    CHECK (phone_number_visibility IN ('public', 'private')),
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
  ADD COLUMN IF NOT EXISTS instagram_visibility TEXT DEFAULT 'private'
    CHECK (instagram_visibility IN ('public', 'private')),
  ADD COLUMN IF NOT EXISTS discord_username TEXT,
  ADD COLUMN IF NOT EXISTS discord_visibility TEXT DEFAULT 'private'
    CHECK (discord_visibility IN ('public', 'private')),
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_visibility TEXT DEFAULT 'private'
    CHECK (facebook_visibility IN ('public', 'private')),
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_visibility TEXT DEFAULT 'private'
    CHECK (linkedin_visibility IN ('public', 'private')),
  ADD COLUMN IF NOT EXISTS twitter_handle TEXT,
  ADD COLUMN IF NOT EXISTS twitter_visibility TEXT DEFAULT 'private'
    CHECK (twitter_visibility IN ('public', 'private')),
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS website_visibility TEXT DEFAULT 'private'
    CHECK (website_visibility IN ('public', 'private'));
