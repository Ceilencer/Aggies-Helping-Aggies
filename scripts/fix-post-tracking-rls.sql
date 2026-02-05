-- Fix RLS Policies for post_tracking table
-- The post limit trigger needs to insert/update records but RLS is blocking it
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/akubcsbzqeqwswpfpfkd/sql

-- Add INSERT policy so the trigger can create tracking records
CREATE POLICY "Users can insert own post tracking"
    ON post_tracking FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Add UPDATE policy so the trigger can update counters
CREATE POLICY "Users can update own post tracking"
    ON post_tracking FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Verify the policies were created
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'post_tracking';
