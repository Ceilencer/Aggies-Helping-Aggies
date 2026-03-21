-- =============================================
-- ADD CONTACT SYSTEM
-- Run this in Supabase SQL editor
-- =============================================

-- Add contact fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_email_visibility TEXT DEFAULT 'on_request'
    CHECK (contact_email_visibility IN ('public', 'on_request')),
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS phone_number_visibility TEXT DEFAULT 'on_request'
    CHECK (phone_number_visibility IN ('public', 'on_request')),
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
  ADD COLUMN IF NOT EXISTS instagram_visibility TEXT DEFAULT 'on_request'
    CHECK (instagram_visibility IN ('public', 'on_request')),
  ADD COLUMN IF NOT EXISTS discord_username TEXT,
  ADD COLUMN IF NOT EXISTS discord_visibility TEXT DEFAULT 'on_request'
    CHECK (discord_visibility IN ('public', 'on_request')),
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_visibility TEXT DEFAULT 'on_request'
    CHECK (facebook_visibility IN ('public', 'on_request')),
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_visibility TEXT DEFAULT 'on_request'
    CHECK (linkedin_visibility IN ('public', 'on_request')),
  ADD COLUMN IF NOT EXISTS twitter_handle TEXT,
  ADD COLUMN IF NOT EXISTS twitter_visibility TEXT DEFAULT 'on_request'
    CHECK (twitter_visibility IN ('public', 'on_request')),
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS website_visibility TEXT DEFAULT 'on_request'
    CHECK (website_visibility IN ('public', 'on_request'));

