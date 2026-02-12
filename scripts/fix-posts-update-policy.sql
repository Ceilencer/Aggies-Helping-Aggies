-- =========================================================
-- FIX: RLS Policy for Posts Table Updates
-- =========================================================
-- This script ensures users can update their own posts
-- This is needed for image URL updates after upload

-- Check existing policies
SELECT tablename, policyname FROM pg_policies 
WHERE tablename = 'posts' ORDER BY policyname;

-- Drop existing update policies if they're too restrictive
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "update_own_posts_policy" ON posts;

-- Create comprehensive UPDATE policy that allows users to update their own posts
CREATE POLICY "Users can update their own posts"
ON posts
FOR UPDATE
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- Verify the policy was created
SELECT tablename, policyname, qual, with_check FROM pg_policies 
WHERE tablename = 'posts' AND cmd = 'UPDATE';
