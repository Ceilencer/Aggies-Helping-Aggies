-- =============================================
-- MIGRATION: Add admin_reset_post_limits function
-- =============================================
-- SECURITY DEFINER bypasses RLS so the admin can reset any user's counters.
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/akubcsbzqeqwswpfpfkd/sql

CREATE OR REPLACE FUNCTION admin_reset_post_limits(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO post_tracking (
    user_id,
    daily_post_count,
    monthly_post_count,
    last_daily_reset,
    last_monthly_reset
  )
  VALUES (p_user_id, 0, 0, now(), now())
  ON CONFLICT (user_id) DO UPDATE SET
    daily_post_count  = 0,
    monthly_post_count = 0,
    last_daily_reset  = now(),
    last_monthly_reset = now(),
    updated_at        = now();
END;
$$;
