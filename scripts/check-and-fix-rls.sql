-- Comprehensive RLS Policy Check and Fix
-- This shows all current policies and adds any missing ones
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/akubcsbzqeqwswpfpfkd/sql

-- 1. Show all current RLS policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd as operation,
    CASE 
        WHEN cmd = 'SELECT' THEN 'Read'
        WHEN cmd = 'INSERT' THEN 'Create'
        WHEN cmd = 'UPDATE' THEN 'Update'
        WHEN cmd = 'DELETE' THEN 'Delete'
        WHEN cmd = '*' THEN 'All'
    END as operation_type
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- 2. Check which tables have RLS enabled
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 3. Add missing INSERT policy for post_tracking (THIS IS THE FIX)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'post_tracking' 
        AND policyname = 'Users can insert own post tracking'
    ) THEN
        CREATE POLICY "Users can insert own post tracking"
            ON post_tracking FOR INSERT
            TO authenticated
            WITH CHECK (user_id = auth.uid());
        RAISE NOTICE 'Created INSERT policy for post_tracking';
    ELSE
        RAISE NOTICE 'INSERT policy for post_tracking already exists';
    END IF;
END $$;

-- 4. Add missing UPDATE policy for post_tracking (THIS IS THE FIX)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'post_tracking' 
        AND policyname = 'Users can update own post tracking'
    ) THEN
        CREATE POLICY "Users can update own post tracking"
            ON post_tracking FOR UPDATE
            TO authenticated
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());
        RAISE NOTICE 'Created UPDATE policy for post_tracking';
    ELSE
        RAISE NOTICE 'UPDATE policy for post_tracking already exists';
    END IF;
END $$;

-- 5. Verify the fix worked
SELECT 
    policyname, 
    cmd as operation
FROM pg_policies 
WHERE tablename = 'post_tracking'
ORDER BY cmd;

-- You should now see 3 policies for post_tracking:
-- - Users can view own post tracking (SELECT)
-- - Users can insert own post tracking (INSERT)
-- - Users can update own post tracking (UPDATE)
