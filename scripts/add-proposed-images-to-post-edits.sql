-- Add proposed_images column to post_edits table
-- This allows users to propose image changes alongside text edits

ALTER TABLE post_edits
  ADD COLUMN IF NOT EXISTS proposed_images TEXT[];
