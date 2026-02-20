-- Add Home channel for table-based home announcements
-- This FORCE-creates a fresh Home row each run (new id).
-- Note: deleting an existing 'home' row will also delete dependent
-- channel_announcements for that row due to ON DELETE CASCADE.

DELETE FROM channels
WHERE slug = 'home';

INSERT INTO channels (name, slug, description, type, requires_mfa, is_read_only, icon)
VALUES ('Home', 'home', 'Home feed announcements managed by admins', 'general', FALSE, TRUE, '🏠');

SELECT id, name, slug, description, type, requires_mfa, is_read_only, icon
FROM channels
WHERE slug = 'home';
