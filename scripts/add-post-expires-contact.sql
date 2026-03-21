-- =============================================
-- ADD POST EXPIRY + CONTACT INFO
-- Run this in Supabase SQL editor
-- =============================================

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  ADD COLUMN IF NOT EXISTS post_contact JSONB DEFAULT '[]'::jsonb;

-- Backfill existing posts: keep the 14-day window they were shown in the UI
UPDATE posts
SET expires_at = created_at + INTERVAL '14 days'
WHERE expires_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_posts_expires_at ON posts(expires_at);
