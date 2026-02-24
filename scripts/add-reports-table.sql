-- =============================================
-- MIGRATION: Add Reports Table for Posts and Comments
-- =============================================

-- Create reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Report target type and IDs
    report_type TEXT NOT NULL CHECK (report_type IN ('post', 'comment')),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    
    -- Reporter information
    reported_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Report details
    reason TEXT NOT NULL,
    description TEXT,
    
    -- Resolution status
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resolution_action TEXT, -- 'deleted', 'dismissed', etc.
    resolved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT post_or_comment_check CHECK (
        (report_type = 'post' AND post_id IS NOT NULL AND comment_id IS NULL) OR
        (report_type = 'comment' AND comment_id IS NOT NULL AND post_id IS NULL)
    ),
    CONSTRAINT reason_length CHECK (char_length(reason) >= 5 AND char_length(reason) <= 100),
    CONSTRAINT description_length CHECK (description IS NULL OR (char_length(description) >= 0 AND char_length(description) <= 500))
);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reports
-- Users can view all reports (for now, admins will review)
CREATE POLICY "Reports are viewable by authenticated users"
    ON reports FOR SELECT
    USING (auth.role() = 'authenticated_user');

-- Only authenticated users can create reports
CREATE POLICY "Authenticated users can create reports"
    ON reports FOR INSERT
    WITH CHECK (auth.role() = 'authenticated_user' AND reported_by = auth.uid());

-- Only admins can update/resolve reports
CREATE POLICY "Only admins can resolve reports"
    ON reports FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'Admin'
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'Admin'
    ));

-- Create indexes for performance
CREATE INDEX idx_reports_post ON reports(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX idx_reports_comment ON reports(comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX idx_reports_type ON reports(report_type);
CREATE INDEX idx_reports_resolved ON reports(is_resolved) WHERE is_resolved = FALSE;
CREATE INDEX idx_reports_reported_by ON reports(reported_by);
CREATE INDEX idx_reports_created ON reports(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
