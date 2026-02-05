-- Debug script to check posts and their channel assignments
-- Run this in Supabase SQL Editor to see which channels posts are actually assigned to

-- 1. Check all channels
SELECT 'CHANNELS' as section, id, name, slug, type, is_read_only
FROM channels
ORDER BY name;

-- 2. Check all posts with their channel info
SELECT
  'POSTS' as section,
  p.id,
  p.title,
  p.channel_id,
  c.name as channel_name,
  c.slug as channel_slug,
  c.type as channel_type,
  p.created_at
FROM posts p
LEFT JOIN channels c ON p.channel_id = c.id
ORDER BY p.created_at DESC
LIMIT 20;

-- 3. Count posts by channel
SELECT
  'POST COUNTS' as section,
  c.name as channel_name,
  c.slug as channel_slug,
  COUNT(p.id) as post_count
FROM channels c
LEFT JOIN posts p ON p.channel_id = c.id
GROUP BY c.id, c.name, c.slug
ORDER BY c.name;

-- 4. Check if announcements channel exists and get its ID
SELECT
  'ANNOUNCEMENTS CHANNEL' as section,
  id,
  name,
  slug,
  is_read_only
FROM channels
WHERE slug = 'announcements';
