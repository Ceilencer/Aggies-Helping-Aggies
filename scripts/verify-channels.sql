-- Verify channels exist in the database
-- Run this in Supabase SQL Editor to check if channels are set up

SELECT
  id,
  name,
  slug,
  type,
  requires_mfa,
  is_read_only,
  icon
FROM channels
ORDER BY name;
