-- =============================================
-- MIGRATION: Add expires_at to channel_announcements
-- =============================================
-- Allows admins to set an optional expiry date/time on announcements.
-- Expired announcements are treated as non-existent by the application.
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/akubcsbzqeqwswpfpfkd/sql

ALTER TABLE channel_announcements
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NULL;

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'channel_announcements'
ORDER BY ordinal_position;
