-- Migration: Replace Aggie Ring channel with Housing & Roommates
-- Run this in the Supabase SQL editor

-- 1. Add the new enum value
ALTER TYPE channel_type ADD VALUE IF NOT EXISTS 'housing';

-- 2. Update the channel record (handles both the original 'fundraising' slug and the renamed 'aggie-ring' slug)
UPDATE channels
SET
  slug        = 'housing',
  name        = 'Housing & Roommates',
  description = 'Find housing, roommates, and subletting opportunities',
  type        = 'housing'
WHERE slug IN ('aggie-ring', 'fundraising');
