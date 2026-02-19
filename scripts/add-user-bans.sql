-- =============================================
-- USER BANS FEATURE - MIGRATION
-- =============================================
-- This script adds user ban and timeout functionality
-- Run this safely on your existing database

-- Create user_bans table
CREATE TABLE IF NOT EXISTS user_bans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    banned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    ban_type TEXT NOT NULL DEFAULT 'temporary', -- 'permanent' or 'temporary'
    duration_days INTEGER, -- Only for temporary bans; NULL for permanent
    reason TEXT NOT NULL,
    
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ, -- For temporary bans, calculated as created_at + duration_days
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT ban_type_check CHECK (ban_type IN ('permanent', 'temporary')),
    CONSTRAINT reason_length CHECK (char_length(reason) >= 1 AND char_length(reason) <= 500),
    CONSTRAINT duration_check CHECK ((ban_type = 'temporary' AND duration_days > 0) OR (ban_type = 'permanent' AND duration_days IS NULL))
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_bans_user ON user_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bans_active ON user_bans(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_bans_expires ON user_bans(expires_at) WHERE ban_type = 'temporary' AND is_active = TRUE;

-- Enable RLS on user_bans table
ALTER TABLE user_bans ENABLE ROW LEVEL SECURITY;

-- Admins can view all bans
CREATE POLICY "Admins can view all bans"
    ON user_bans FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Admins can create bans
CREATE POLICY "Admins can create bans"
    ON user_bans FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Admins can update bans
CREATE POLICY "Admins can update bans"
    ON user_bans FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Admins can delete bans
CREATE POLICY "Admins can delete bans"
    ON user_bans FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_bans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_bans_updated_at ON user_bans;
CREATE TRIGGER user_bans_updated_at BEFORE UPDATE ON user_bans
    FOR EACH ROW EXECUTE FUNCTION update_user_bans_updated_at();

-- Create function to check if user is banned
CREATE OR REPLACE FUNCTION is_user_banned(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_bans
        WHERE user_id = p_user_id
        AND is_active = TRUE
        AND (ban_type = 'permanent' OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to auto-deactivate expired bans
CREATE OR REPLACE FUNCTION deactivate_expired_bans()
RETURNS void AS $$
BEGIN
    UPDATE user_bans
    SET is_active = FALSE
    WHERE ban_type = 'temporary'
    AND is_active = TRUE
    AND expires_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule the function to run every hour (optional - can be configured in Supabase dashboard)
-- SELECT cron.schedule('deactivate-expired-bans', '0 * * * *', 'SELECT deactivate_expired_bans()');
