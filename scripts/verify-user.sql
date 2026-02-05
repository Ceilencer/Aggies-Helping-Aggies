-- Verify User Account for Testing
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/akubcsbzqeqwswpfpfkd/sql

-- 1. First, find your user
SELECT id, email, full_name, role, is_verified, is_alumni, mfa_enabled
FROM profiles
ORDER BY created_at DESC;

-- 2. Copy the user ID from above, then run this (replace YOUR_USER_ID):
-- UPDATE profiles 
-- SET is_verified = TRUE, is_alumni = TRUE 
-- WHERE id = 'YOUR_USER_ID';

-- 3. Or verify by email (replace YOUR_EMAIL):
-- UPDATE profiles 
-- SET is_verified = TRUE, is_alumni = TRUE 
-- WHERE email = 'YOUR_EMAIL';

-- 4. Verify it worked:
-- SELECT id, email, is_verified, is_alumni FROM profiles WHERE email = 'YOUR_EMAIL';
