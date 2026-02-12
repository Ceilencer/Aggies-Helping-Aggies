-- =============================================
-- MIGRATION: Add Comments Likes and Reply Support
-- =============================================

-- 1. Add parent_comment_id column to comments table for nested replies
ALTER TABLE comments ADD COLUMN parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE;

-- 2. Create post_likes table
CREATE TABLE post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(post_id, user_id)
);

-- 3. Create comment_likes table
CREATE TABLE comment_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(comment_id, user_id)
);

-- 4. Create indexes for performance
CREATE INDEX idx_post_likes_post ON post_likes(post_id);
CREATE INDEX idx_post_likes_user ON post_likes(user_id);
CREATE INDEX idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user ON comment_likes(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);

-- 5. Enable RLS on new tables
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for post_likes
CREATE POLICY "Post likes are viewable by verified users"
    ON post_likes FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND is_verified = TRUE
        )
    );

CREATE POLICY "Verified users can like posts"
    ON post_likes FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND is_verified = TRUE
        )
    );

CREATE POLICY "Users can unlike their own post likes"
    ON post_likes FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- 7. RLS Policies for comment_likes
CREATE POLICY "Comment likes are viewable by verified users"
    ON comment_likes FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND is_verified = TRUE
        )
    );

CREATE POLICY "Verified users can like comments"
    ON comment_likes FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND is_verified = TRUE
        )
    );

CREATE POLICY "Users can unlike their own comment likes"
    ON comment_likes FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- 8. Add trigger to update comments timestamp when parent comment is deleted and re-created
CREATE TRIGGER comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
