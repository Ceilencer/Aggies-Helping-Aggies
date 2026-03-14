-- =============================================
-- MIGRATION: Add Admin Policy for post_tracking
-- =============================================
-- Allows admins to reset any user's posting limits.
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/akubcsbzqeqwswpfpfkd/sql

-- Allow admins to update any post_tracking row (e.g. to reset limits)
CREATE POLICY "Admins can update any post tracking"
    ON post_tracking FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'Admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Allow admins to insert a post_tracking row for any user
-- (needed for upsert when the row doesn't exist yet)
CREATE POLICY "Admins can insert any post tracking"
    ON post_tracking FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Verify
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'post_tracking';
