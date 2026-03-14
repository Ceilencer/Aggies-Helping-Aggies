-- =============================================
-- HOWDY HELPS - SUPABASE SCHEMA
-- Last updated: 2026-03-14
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
CREATE TYPE flair_type AS ENUM ('Student', 'Former Student', 'Parent', 'Faculty', 'BCS Local');
CREATE TYPE account_status AS ENUM ('active', 'pending_approval', 'suspended');

-- =============================================
-- PROFILES TABLE
-- =============================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role user_role DEFAULT 'Personal' NOT NULL,
    flair flair_type DEFAULT 'Student' NOT NULL,
    account_status account_status DEFAULT 'active' NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    is_alumni BOOLEAN DEFAULT FALSE,
    graduation_year INTEGER,
    major TEXT,
    last_login TIMESTAMPTZ,
    rules_acknowledged_at TIMESTAMPTZ,
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
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
    images TEXT[],
    is_pinned BOOLEAN DEFAULT FALSE,
    is_moderated BOOLEAN DEFAULT FALSE,
    moderation_reason TEXT,
    likes_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    approval_status TEXT DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- POST TRACKING TABLE (Rate Limiting)
-- =============================================

CREATE TABLE post_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    daily_post_count INTEGER DEFAULT 0,
    monthly_post_count INTEGER DEFAULT 0,
    last_daily_reset TIMESTAMPTZ DEFAULT NOW(),
    last_monthly_reset TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- COMMENTS TABLE
-- =============================================

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_moderated BOOLEAN DEFAULT FALSE,
    moderation_reason TEXT,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- POST LIKES TABLE
-- =============================================

CREATE TABLE post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- =============================================
-- COMMENT LIKES TABLE
-- =============================================

CREATE TABLE comment_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- =============================================
-- POST EDITS TABLE (Pending Edit Proposals)
-- =============================================

CREATE TABLE post_edits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL UNIQUE,
    submitted_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    proposed_title TEXT NOT NULL,
    proposed_content TEXT NOT NULL,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- POST HISTORY TABLE (Audit Log)
-- =============================================

CREATE TABLE post_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    actor_name TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
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
-- ADMIN NOTES TABLE
-- =============================================

CREATE TABLE admin_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CHANNEL ANNOUNCEMENTS TABLE
-- =============================================

CREATE TABLE channel_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- REPORTS TABLE
-- =============================================

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_type TEXT NOT NULL,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    reported_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resolution_action TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER BANS TABLE
-- =============================================

CREATE TABLE user_bans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    banned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    ban_type TEXT DEFAULT 'temporary' NOT NULL, -- 'temporary' | 'permanent'
    duration_days INTEGER,
    reason TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- REJECTED ACCOUNTS TABLE
-- =============================================

CREATE TABLE rejected_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    rejected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    rejected_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    rejection_reason TEXT,
    questionnaire JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- VERIFICATION REQUESTS TABLE
-- =============================================

CREATE TABLE verification_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    graduation_year INTEGER NOT NULL,
    major TEXT NOT NULL,
    memorable_tradition TEXT NOT NULL,
    connection_to_tamu TEXT NOT NULL,
    status verification_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

-- profiles
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_account_status ON profiles(account_status);

-- channels
CREATE INDEX idx_channels_slug_type ON channels(slug, type);

-- posts
CREATE INDEX idx_posts_channel ON posts(channel_id);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_pinned ON posts(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_posts_pinned_created ON posts(created_at DESC) WHERE is_pinned = TRUE;
CREATE INDEX idx_posts_author_created ON posts(author_id, created_at DESC);
CREATE INDEX idx_posts_channel_author ON posts(channel_id, author_id) WHERE is_moderated = TRUE;
CREATE INDEX idx_posts_channel_moderated ON posts(channel_id, is_moderated) WHERE is_moderated = TRUE;
CREATE INDEX idx_posts_channel_moderated_created ON posts(channel_id, is_moderated, created_at DESC) WHERE is_moderated = TRUE;
CREATE INDEX idx_posts_moderated_created ON posts(is_moderated, created_at DESC) WHERE is_moderated = FALSE;
CREATE INDEX idx_posts_moderated_created_author ON posts(is_moderated, created_at DESC, author_id) WHERE is_moderated = FALSE;
CREATE INDEX idx_posts_unmoderated ON posts(created_at DESC, author_id) WHERE is_moderated = FALSE;
CREATE INDEX idx_posts_pending_approval ON posts(approval_status) WHERE approval_status = 'pending';
CREATE INDEX idx_posts_feed_query ON posts(channel_id, is_moderated, created_at DESC)
    INCLUDE (likes_count, comment_count, author_id, title, content)
    WHERE is_moderated = TRUE;

-- comments
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX idx_comments_post_created ON comments(post_id, created_at);
CREATE INDEX idx_comments_post_author_created ON comments(post_id, author_id, created_at DESC);

-- post_likes
CREATE INDEX idx_post_likes_post ON post_likes(post_id);
CREATE INDEX idx_post_likes_user ON post_likes(user_id);
CREATE INDEX idx_post_likes_post_user ON post_likes(post_id, user_id);
CREATE INDEX idx_post_likes_user_post ON post_likes(user_id, post_id);

-- comment_likes
CREATE INDEX idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user ON comment_likes(user_id);

-- post_history
CREATE INDEX idx_post_history_post_id ON post_history(post_id);

-- notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_unread_user ON notifications(user_id, created_at DESC) WHERE is_read = FALSE;

-- admin_notes
CREATE INDEX idx_admin_notes_user ON admin_notes(user_id);
CREATE INDEX idx_admin_notes_created ON admin_notes(created_at DESC);

-- channel_announcements
CREATE INDEX channel_announcements_channel_id_idx ON channel_announcements(channel_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- channel_announcements updated_at
CREATE OR REPLACE FUNCTION update_channel_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- user_bans updated_at
CREATE OR REPLACE FUNCTION update_user_bans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update post likes_count on post_likes insert/delete
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Update comment likes_count on comment_likes insert/delete
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.comment_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Update post comment_count on comments insert/delete
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Get current user's role (used in RLS policies)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Post limit enforcement
CREATE OR REPLACE FUNCTION check_post_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_user_role user_role;
    tracking_record RECORD;
    daily_limit INTEGER;
    monthly_limit INTEGER;
BEGIN
    SELECT role INTO v_user_role FROM profiles WHERE id = NEW.author_id;

    CASE v_user_role
        WHEN 'Personal' THEN
            daily_limit := 2;
            monthly_limit := 60;
        WHEN 'Charity' THEN
            daily_limit := 1;
            monthly_limit := 30;
        WHEN 'Business' THEN
            daily_limit := 0;
            monthly_limit := 1;
        WHEN 'Admin' THEN
            daily_limit := 999;
            monthly_limit := 9999;
        ELSE
            daily_limit := 2;
            monthly_limit := 60;
    END CASE;

    INSERT INTO post_tracking (user_id, daily_post_count, monthly_post_count)
    VALUES (NEW.author_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT * INTO tracking_record FROM post_tracking WHERE user_id = NEW.author_id FOR UPDATE;

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

    IF v_user_role = 'Business' THEN
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

    UPDATE post_tracking
    SET daily_post_count = daily_post_count + 1,
        monthly_post_count = monthly_post_count + 1
    WHERE user_id = NEW.author_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER admin_notes_updated_at
    BEFORE UPDATE ON admin_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER verification_requests_updated_at
    BEFORE UPDATE ON verification_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_channel_announcements_updated_at
    BEFORE UPDATE ON channel_announcements
    FOR EACH ROW EXECUTE FUNCTION update_channel_announcements_updated_at();

CREATE TRIGGER user_bans_updated_at
    BEFORE UPDATE ON user_bans
    FOR EACH ROW EXECUTE FUNCTION update_user_bans_updated_at();

CREATE TRIGGER enforce_post_limits
    BEFORE INSERT ON posts
    FOR EACH ROW EXECUTE FUNCTION check_post_limit();

CREATE TRIGGER trigger_update_likes_count
    AFTER INSERT OR DELETE ON post_likes
    FOR EACH ROW EXECUTE FUNCTION update_likes_count();

CREATE TRIGGER trigger_update_comment_likes_count
    AFTER INSERT OR DELETE ON comment_likes
    FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();

CREATE TRIGGER trigger_update_comment_count
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_comment_count();

-- =============================================
-- INITIAL DATA - CHANNELS
-- =============================================

INSERT INTO channels (name, slug, description, type, requires_mfa, is_read_only, icon) VALUES
    ('General', 'general', 'General community discussions and questions', 'general', FALSE, FALSE, '💬'),
    ('Promotions', 'promotions', 'Business promotions and community events', 'promotions', FALSE, FALSE, '📢'),
    ('Job/Internship/Networking', 'jobs-networking', 'Job opportunities, internships, and networking', 'jobs', FALSE, FALSE, '💼'),
    ('Fundraising', 'fundraising', 'Support Aggie causes and fundraising efforts', 'aggie_ring', FALSE, FALSE, '💍'),
    ('Football Tickets', 'football-tickets', 'Buy, sell, or trade football game tickets', 'tickets', FALSE, FALSE, '🎟️'),
    ('Announcements', 'announcements', 'Official platform announcements (Admin Only)', 'announcements', FALSE, TRUE, '📌');

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE rejected_accounts ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------
-- profiles
-- -----------------------------------------

CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Verified profiles are viewable by all authenticated users"
    ON profiles FOR SELECT TO authenticated
    USING (is_verified = TRUE);

CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (get_my_role() = 'Admin');

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
    ON profiles FOR UPDATE
    USING (get_my_role() = 'Admin')
    WITH CHECK (get_my_role() = 'Admin');

-- -----------------------------------------
-- verification_requests
-- -----------------------------------------

CREATE POLICY "Users can view own verification requests"
    ON verification_requests FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can create verification requests"
    ON verification_requests FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all verification requests"
    ON verification_requests FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'));

CREATE POLICY "Admins can update verification requests"
    ON verification_requests FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'));

-- -----------------------------------------
-- channels
-- -----------------------------------------

CREATE POLICY "Channels are viewable by all authenticated users"
    ON channels FOR SELECT TO authenticated
    USING (TRUE);

-- -----------------------------------------
-- posts
-- -----------------------------------------

CREATE POLICY "Posts are viewable by verified users"
    ON posts FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_verified = TRUE));

CREATE POLICY "Verified users can create posts"
    ON posts FOR INSERT TO authenticated
    WITH CHECK (
        author_id = auth.uid() AND
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_verified = TRUE)
    );

CREATE POLICY "Users can update own posts"
    ON posts FOR UPDATE TO authenticated
    USING (author_id = auth.uid());

CREATE POLICY "Users can update their own posts"
    ON posts FOR UPDATE
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own posts"
    ON posts FOR DELETE TO authenticated
    USING (author_id = auth.uid());

CREATE POLICY "Admins can update any post"
    ON posts FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'));

CREATE POLICY "Admins can delete any post"
    ON posts FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'));

-- -----------------------------------------
-- post_tracking
-- -----------------------------------------

CREATE POLICY "Users can view own post tracking"
    ON post_tracking FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own post tracking"
    ON post_tracking FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own post tracking"
    ON post_tracking FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- -----------------------------------------
-- post_likes
-- -----------------------------------------

CREATE POLICY "Post likes are viewable by verified users"
    ON post_likes FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_verified = TRUE));

CREATE POLICY "Verified users can like posts"
    ON post_likes FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_verified = TRUE)
    );

CREATE POLICY "Users can unlike their own post likes"
    ON post_likes FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- -----------------------------------------
-- post_edits
-- -----------------------------------------

CREATE POLICY "Users can view own post edits"
    ON post_edits FOR SELECT TO authenticated
    USING (submitted_by = auth.uid());

CREATE POLICY "Users can insert own post edits"
    ON post_edits FOR INSERT TO authenticated
    WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Users can delete own post edits"
    ON post_edits FOR DELETE TO authenticated
    USING (submitted_by = auth.uid());

CREATE POLICY "Admins can view all post edits"
    ON post_edits FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'));

CREATE POLICY "Admins can delete post edits"
    ON post_edits FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'));

-- -----------------------------------------
-- post_history
-- -----------------------------------------

CREATE POLICY "Post author can view own post history"
    ON post_history FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM posts WHERE posts.id = post_history.post_id AND posts.author_id = auth.uid()));

CREATE POLICY "Post author can insert own post history"
    ON post_history FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM posts WHERE posts.id = post_history.post_id AND posts.author_id = auth.uid()));

CREATE POLICY "Admins can view all post history"
    ON post_history FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'));

CREATE POLICY "Admins can insert post history"
    ON post_history FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'));

-- -----------------------------------------
-- comments
-- -----------------------------------------

CREATE POLICY "Comments are viewable by verified users"
    ON comments FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_verified = TRUE));

CREATE POLICY "Verified users can create comments"
    ON comments FOR INSERT TO authenticated
    WITH CHECK (
        author_id = auth.uid() AND
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_verified = TRUE)
    );

CREATE POLICY "Users can update own comments"
    ON comments FOR UPDATE TO authenticated
    USING (author_id = auth.uid());

CREATE POLICY "Users can delete own comments"
    ON comments FOR DELETE TO authenticated
    USING (author_id = auth.uid());

CREATE POLICY "Admins can delete any comment"
    ON comments FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'));

-- -----------------------------------------
-- comment_likes
-- -----------------------------------------

CREATE POLICY "Comment likes are viewable by verified users"
    ON comment_likes FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_verified = TRUE));

CREATE POLICY "Verified users can like comments"
    ON comment_likes FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_verified = TRUE)
    );

CREATE POLICY "Users can unlike their own comment likes"
    ON comment_likes FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- -----------------------------------------
-- notifications
-- -----------------------------------------

CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

-- -----------------------------------------
-- admin_notes
-- -----------------------------------------

CREATE POLICY "Only admins can view admin notes"
    ON admin_notes FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'));

CREATE POLICY "Only admins can create admin notes"
    ON admin_notes FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'));

CREATE POLICY "Only admins can update admin notes"
    ON admin_notes FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'));

CREATE POLICY "Only admins can delete admin notes"
    ON admin_notes FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'));

-- -----------------------------------------
-- channel_announcements
-- -----------------------------------------

CREATE POLICY "Authenticated users can view channel announcements"
    ON channel_announcements FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can create channel announcements"
    ON channel_announcements FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'Admin'));

CREATE POLICY "Admins can update channel announcements"
    ON channel_announcements FOR UPDATE
    USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'Admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'Admin'));

-- -----------------------------------------
-- reports
-- -----------------------------------------

CREATE POLICY "Reports are viewable by authenticated users"
    ON reports FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create reports"
    ON reports FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND reported_by = auth.uid());

CREATE POLICY "Only admins can resolve reports"
    ON reports FOR UPDATE
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'));

-- -----------------------------------------
-- user_bans
-- -----------------------------------------

CREATE POLICY "Admins can view all bans"
    ON user_bans FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'));

CREATE POLICY "Admins can create bans"
    ON user_bans FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'));

CREATE POLICY "Admins can update bans"
    ON user_bans FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'));

CREATE POLICY "Admins can delete bans"
    ON user_bans FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'));

-- -----------------------------------------
-- rejected_accounts
-- -----------------------------------------

CREATE POLICY "Admins can view rejected accounts"
    ON rejected_accounts FOR SELECT
    USING (get_my_role() = 'Admin');

CREATE POLICY "Admins can insert rejected accounts"
    ON rejected_accounts FOR INSERT
    WITH CHECK (get_my_role() = 'Admin');

-- =============================================
-- CRON JOBS (requires pg_cron extension)
-- =============================================

-- Daily reset for post counters (runs at midnight CST)
-- SELECT cron.schedule(
--     'reset-daily-post-counts',
--     '0 0 * * *',
--     $$
--     UPDATE post_tracking
--     SET daily_post_count = 0, last_daily_reset = NOW()
--     WHERE last_daily_reset < CURRENT_DATE;
--     $$
-- );

-- Monthly reset for post counters (runs on 1st of each month)
-- SELECT cron.schedule(
--     'reset-monthly-post-counts',
--     '0 0 1 * *',
--     $$
--     UPDATE post_tracking
--     SET monthly_post_count = 0, last_monthly_reset = NOW()
--     WHERE DATE_TRUNC('month', last_monthly_reset) < DATE_TRUNC('month', NOW());
--     $$
-- );
