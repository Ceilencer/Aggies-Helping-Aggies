-- =============================================
-- MIGRATION: Add Admin Delete Policies for Posts and Comments
-- =============================================
-- Run this in your Supabase SQL editor to fix the reporting system
-- This allows admins to delete posts and comments for moderation

-- For posts table
CREATE POLICY "Admins can delete any post"
    ON posts FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- For comments table
CREATE POLICY "Admins can delete any comment"
    ON comments FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );
