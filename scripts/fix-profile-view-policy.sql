-- Fix RLS Policy to Allow Users to View Their Own Profile
-- This adds a policy so users can always view their own profile, 
-- regardless of verification status

-- Add policy for users to view their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- This works alongside the existing policy:
-- "Public profiles are viewable by verified users" 
-- which allows viewing OTHER verified users' profiles
