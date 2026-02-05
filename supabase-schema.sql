-- =============================================
-- AGGIES HELPING AGGIES - SUPABASE SCHEMA
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- =============================================
-- ENUMS
-- =============================================

CREATE TYPE user_role AS ENUM ('Personal', 'Business', 'Charity', 'Admin');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE channel_type AS ENUM ('general', 'jobs', 'tickets', 'promotions', 'announcements', 'aggie_ring');

-- =============================================
-- PROFILES TABLE
-- =============================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role DEFAULT 'Personal' NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    is_alumni BOOLEAN DEFAULT FALSE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Alumni-specific fields
    graduation_year INTEGER,
    major TEXT,
    
    -- Metadata
    last_login TIMESTAMPTZ,
    
    CONSTRAINT email_domain_check CHECK (
        email LIKE '%@tamu.edu' OR 
        email LIKE '%@aggienetwork.com' OR 
        is_alumni = TRUE
    )
);

-- =============================================
-- VERIFICATION REQUESTS TABLE
-- =============================================

CREATE TABLE verification_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    
    -- Former Student Questionnaire Fields
    graduation_year INTEGER NOT NULL,
    major TEXT NOT NULL,
    memorable_tradition TEXT NOT NULL,
    connection_to_tamu TEXT NOT NULL,
    
    status verification_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CHANNELS TABLE
-- =============================================

CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    type channel_type NOT NULL,
    requires_mfa BOOLEAN DEFAULT FALSE,
    is_read_only BOOLEAN DEFAULT FALSE,
    icon TEXT,
    color TEXT DEFAULT '#500000',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- POSTS TABLE
-- =============================================

CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    images TEXT[], -- Array of Supabase Storage URLs
    
    is_pinned BOOLEAN DEFAULT FALSE,
    is_moderated BOOLEAN DEFAULT FALSE,
    moderation_reason TEXT,
    
    view_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT title_length CHECK (char_length(title) >= 5 AND char_length(title) <= 200),
    CONSTRAINT content_length CHECK (char_length(content) >= 10 AND char_length(content) <= 5000)
);

-- =============================================
-- POST TRACKING TABLE (Rate Limiting)
-- =============================================

CREATE TABLE post_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    daily_post_count INTEGER DEFAULT 0,
    monthly_post_count INTEGER DEFAULT 0,
    
    last_daily_reset TIMESTAMPTZ DEFAULT NOW(),
    last_monthly_reset TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- =============================================
-- COMMENTS TABLE
-- =============================================

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    content TEXT NOT NULL,
    
    is_moderated BOOLEAN DEFAULT FALSE,
    moderation_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT comment_length CHECK (char_length(content) >= 1 AND char_length(content) <= 1000)
);

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    type TEXT NOT NULL, -- 'comment', 'mention', 'admin', 'verification'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    
    is_read BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_posts_channel ON posts(channel_id);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_pinned ON posts(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER verification_requests_updated_at BEFORE UPDATE ON verification_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- POST LIMIT ENFORCEMENT FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION check_post_limit()
RETURNS TRIGGER AS $$
DECLARE
    user_role user_role;
    tracking_record RECORD;
    daily_limit INTEGER;
    monthly_limit INTEGER;
BEGIN
    -- Get user role
    SELECT role INTO user_role FROM profiles WHERE id = NEW.author_id;
    
    -- Set limits based on role
    CASE user_role
        WHEN 'Personal' THEN
            daily_limit := 2;
            monthly_limit := 60; -- 2/day * 30 days
        WHEN 'Charity' THEN
            daily_limit := 1;
            monthly_limit := 30;
        WHEN 'Business' THEN
            daily_limit := 0; -- No daily limit enforced separately
            monthly_limit := 1;
        WHEN 'Admin' THEN
            daily_limit := 999; -- Unlimited
            monthly_limit := 9999;
        ELSE
            daily_limit := 2;
            monthly_limit := 60;
    END CASE;
    
    -- Get or create tracking record
    INSERT INTO post_tracking (user_id, daily_post_count, monthly_post_count)
    VALUES (NEW.author_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    SELECT * INTO tracking_record FROM post_tracking WHERE user_id = NEW.author_id FOR UPDATE;
    
    -- Reset counters if needed
    IF tracking_record.last_daily_reset < CURRENT_DATE THEN
        UPDATE post_tracking 
        SET daily_post_count = 0, last_daily_reset = NOW()
        WHERE user_id = NEW.author_id;
        tracking_record.daily_post_count := 0;
    END IF;
    
    IF DATE_TRUNC('month', tracking_record.last_monthly_reset) < DATE_TRUNC('month', NOW()) THEN
        UPDATE post_tracking 
        SET monthly_post_count = 0, last_monthly_reset = NOW()
        WHERE user_id = NEW.author_id;
        tracking_record.monthly_post_count := 0;
    END IF;
    
    -- Check limits (Business accounts only check monthly)
    IF user_role = 'Business' THEN
        IF tracking_record.monthly_post_count >= monthly_limit THEN
            RAISE EXCEPTION 'Monthly post limit reached for Business accounts (% posts/month)', monthly_limit;
        END IF;
    ELSE
        IF tracking_record.daily_post_count >= daily_limit THEN
            RAISE EXCEPTION 'Daily post limit reached (% posts/day)', daily_limit;
        END IF;
        
        IF tracking_record.monthly_post_count >= monthly_limit THEN
            RAISE EXCEPTION 'Monthly post limit reached (% posts/month)', monthly_limit;
        END IF;
    END IF;
    
    -- Increment counters
    UPDATE post_tracking 
    SET 
        daily_post_count = daily_post_count + 1,
        monthly_post_count = monthly_post_count + 1
    WHERE user_id = NEW.author_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_post_limits
    BEFORE INSERT ON posts
    FOR EACH ROW
    EXECUTE FUNCTION check_post_limit();

-- =============================================
-- MFA REQUIREMENT CHECK FOR SENSITIVE CHANNELS
-- =============================================

CREATE OR REPLACE FUNCTION check_mfa_for_sensitive_channels()
RETURNS TRIGGER AS $$
DECLARE
    channel_requires_mfa BOOLEAN;
    user_has_mfa BOOLEAN;
BEGIN
    -- Check if channel requires MFA
    SELECT requires_mfa INTO channel_requires_mfa 
    FROM channels 
    WHERE id = NEW.channel_id;
    
    -- Check if user has MFA enabled
    SELECT mfa_enabled INTO user_has_mfa 
    FROM profiles 
    WHERE id = NEW.author_id;
    
    IF channel_requires_mfa AND NOT user_has_mfa THEN
        RAISE EXCEPTION 'This channel requires Two-Factor Authentication (MFA) to be enabled';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_mfa_before_post
    BEFORE INSERT ON posts
    FOR EACH ROW
    EXECUTE FUNCTION check_mfa_for_sensitive_channels();

-- =============================================
-- INITIAL DATA - CHANNELS
-- =============================================

INSERT INTO channels (name, slug, description, type, requires_mfa, is_read_only, icon) VALUES
    ('General', 'general', 'General community discussions and questions', 'general', FALSE, FALSE, '💬'),
    ('Promotions', 'promotions', 'Business promotions and community events', 'promotions', FALSE, FALSE, '📢'),
    ('Job/Internship/Networking', 'jobs-networking', 'Job opportunities, internships, and networking', 'jobs', FALSE, FALSE, '💼'),
    ('Fundraising', 'fundraising', 'Support Aggie causes and fundraising efforts', 'aggie_ring', FALSE, FALSE, '💍'),
    ('Football Tickets', 'football-tickets', 'Buy, sell, or trade football game tickets (MFA Required)', 'tickets', TRUE, FALSE, '🎟️'),
    ('Announcements', 'announcements', 'Official platform announcements (Admin Only)', 'announcements', FALSE, TRUE, '📌');

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by verified users"
    ON profiles FOR SELECT
    TO authenticated
    USING (is_verified = TRUE);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Verification requests policies
CREATE POLICY "Users can view own verification requests"
    ON verification_requests FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can create verification requests"
    ON verification_requests FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all verification requests"
    ON verification_requests FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

CREATE POLICY "Admins can update verification requests"
    ON verification_requests FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Channels policies
CREATE POLICY "Channels are viewable by all authenticated users"
    ON channels FOR SELECT
    TO authenticated
    USING (TRUE);

-- Posts policies
CREATE POLICY "Posts are viewable by verified users"
    ON posts FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND is_verified = TRUE
        )
    );

CREATE POLICY "Verified users can create posts"
    ON posts FOR INSERT
    TO authenticated
    WITH CHECK (
        author_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND is_verified = TRUE
        )
    );

CREATE POLICY "Users can update own posts"
    ON posts FOR UPDATE
    TO authenticated
    USING (author_id = auth.uid());

CREATE POLICY "Users can delete own posts"
    ON posts FOR DELETE
    TO authenticated
    USING (author_id = auth.uid());

CREATE POLICY "Admins can update any post"
    ON posts FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Comments policies
CREATE POLICY "Comments are viewable by verified users"
    ON comments FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND is_verified = TRUE
        )
    );

CREATE POLICY "Verified users can create comments"
    ON comments FOR INSERT
    TO authenticated
    WITH CHECK (
        author_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND is_verified = TRUE
        )
    );

CREATE POLICY "Users can update own comments"
    ON comments FOR UPDATE
    TO authenticated
    USING (author_id = auth.uid());

CREATE POLICY "Users can delete own comments"
    ON comments FOR DELETE
    TO authenticated
    USING (author_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Post tracking policies
CREATE POLICY "Users can view own post tracking"
    ON post_tracking FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own post tracking"
    ON post_tracking FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own post tracking"
    ON post_tracking FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =============================================
-- CRON JOBS (requires pg_cron extension)
-- =============================================

-- Daily reset for post counters (runs at midnight CST)
-- Note: This requires pg_cron to be enabled in Supabase project settings
-- SELECT cron.schedule(
--     'reset-daily-post-counts',
--     '0 0 * * *', -- Every day at midnight
--     $$
--     UPDATE post_tracking 
--     SET daily_post_count = 0, last_daily_reset = NOW()
--     WHERE last_daily_reset < CURRENT_DATE;
--     $$
-- );

-- Monthly reset for post counters (runs on 1st of each month)
-- SELECT cron.schedule(
--     'reset-monthly-post-counts',
--     '0 0 1 * *', -- First day of each month at midnight
--     $$
--     UPDATE post_tracking 
--     SET monthly_post_count = 0, last_monthly_reset = NOW()
--     WHERE DATE_TRUNC('month', last_monthly_reset) < DATE_TRUNC('month', NOW());
--     $$
-- );
