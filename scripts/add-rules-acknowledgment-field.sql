-- Add rules_acknowledged_at column to profiles table
-- This tracks when a user first acknowledges the community posting guidelines

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS rules_acknowledged_at TIMESTAMPTZ;

-- Update the updated_at timestamp
UPDATE profiles SET updated_at = NOW() WHERE rules_acknowledged_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.rules_acknowledged_at IS 'Timestamp when user first acknowledged the community posting guidelines. NULL means user has not yet acknowledged.';
