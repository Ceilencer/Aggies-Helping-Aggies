-- =============================================
-- REMOVE MFA REQUIREMENT TRIGGER AND FUNCTION
-- =============================================

-- Drop the trigger first
DROP TRIGGER IF EXISTS check_mfa_before_post ON posts;

-- Drop the function
DROP FUNCTION IF EXISTS check_mfa_for_sensitive_channels();

-- Update the Football Tickets channel to not require MFA
UPDATE channels 
SET requires_mfa = FALSE, description = 'Buy, sell, or trade football game tickets'
WHERE slug = 'football-tickets';

-- Verify the changes
SELECT name, slug, requires_mfa, description FROM channels WHERE slug = 'football-tickets';
