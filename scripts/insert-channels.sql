-- Quick setup: Insert default channels if they don't exist
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/akubcsbzqeqwswpfpfkd/sql

INSERT INTO channels (name, slug, description, type, requires_mfa, is_read_only, icon) 
VALUES
    ('General', 'general', 'General community discussions and questions', 'general', FALSE, FALSE, '💬'),
    ('Promotions', 'promotions', 'Business promotions and community events', 'promotions', FALSE, FALSE, '📢'),
    ('Job/Internship/Networking', 'jobs-networking', 'Job opportunities, internships, and networking', 'jobs', FALSE, FALSE, '💼'),
    ('Fundraising', 'fundraising', 'Support Aggie causes and fundraising efforts', 'aggie_ring', FALSE, FALSE, '💍'),
    ('Football Tickets', 'football-tickets', 'Buy, sell, or trade football game tickets', 'tickets', FALSE, FALSE, '🎟️'),
    ('Announcements', 'announcements', 'Official platform announcements (Admin Only)', 'announcements', FALSE, TRUE, '📌')
ON CONFLICT (name) DO NOTHING;
