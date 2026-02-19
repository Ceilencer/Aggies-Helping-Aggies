-- Add approval status to posts table
-- This migration adds the approval_status field to track post edits requiring admin approval

ALTER TABLE posts ADD COLUMN approval_status TEXT DEFAULT 'approved' NOT NULL;

-- Create enum type for approval status
CREATE TYPE approval_status_enum AS ENUM ('pending', 'approved', 'rejected');

-- Add constraint to use the enum
ALTER TABLE posts ADD CONSTRAINT approval_status_check CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Create index for pending approvals (useful for admin dashboard)
CREATE INDEX idx_posts_pending_approval ON posts(approval_status) WHERE approval_status = 'pending';

-- Update cached queries - pending posts should check approval_status
-- Admins need to see posts that are:
-- 1. Not moderated (is_moderated = false) AND approval_status != 'rejected'
-- OR
-- 2. Have approval_status = 'pending' (edited posts waiting for re-approval)
