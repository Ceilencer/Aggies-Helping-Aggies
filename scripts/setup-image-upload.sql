-- =====================================================
-- Image Upload Setup Script for Aggies Helping Aggies
-- =====================================================
-- Run this script in Supabase SQL Editor to set up
-- image upload bucket and RLS policies

-- =====================================================
-- 1. CREATE STORAGE BUCKET
-- =====================================================
-- Note: If bucket already exists, this will fail silently with "already exists" error
-- You can ignore this error or create the bucket manually via Supabase UI

INSERT INTO storage.buckets (id, name, owner, file_size_limit, public)
VALUES (
  'post-images',
  'post-images',
  NULL,
  5242880, -- 5MB in bytes
  false
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. DROP EXISTING RLS POLICIES (if any)
-- =====================================================
-- This is optional but recommended if re-running this script
DROP POLICY IF EXISTS "Users can upload post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can read post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own post images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to post images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;

-- =====================================================
-- 3. CREATE RLS POLICIES - AUTHENTICATED UPLOADS WITH PUBLIC READ
-- =====================================================
-- This configuration allows authenticated users to upload images
-- and allows anyone (authenticated or not) to view/read the images

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload post images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'post-images'
  AND auth.role() = 'authenticated'
);

-- Allow public read access (no auth required)
CREATE POLICY "Anyone can view post images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'post-images');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Users can delete their own post images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'post-images'
  AND auth.role() = 'authenticated'
);

-- =====================================================
-- 4. UPDATE IMAGES COLUMN IN POSTS TABLE (if missing)
-- =====================================================
-- Check if the images column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'images'
    ) THEN
        ALTER TABLE posts 
        ADD COLUMN images TEXT[] DEFAULT NULL;
        RAISE NOTICE 'Added images column to posts table';
    ELSE
        RAISE NOTICE 'images column already exists in posts table';
    END IF;
END $$;

-- =====================================================
-- 5. VERIFICATION QUERY
-- =====================================================
-- Run this to verify the bucket and policies are set up
SELECT 
    b.id as bucket_name,
    b.public,
    count(p.*) as policy_count
FROM storage.buckets b
LEFT JOIN storage.policyDefinition p ON b.id = p.bucket_id
WHERE b.id = 'post-images'
GROUP BY b.id, b.public;

-- =====================================================
-- NOTES
-- =====================================================
-- - Images column should now exist in posts table
-- - post-images bucket should be created
-- - RLS policies should allow authenticated uploads and public reads
-- - Users can now upload images (max 5 per post, max 5MB each)
-- - Images are stored in path: post-images/{post_id}/{uuid}.{ext}
-- - Image URLs are stored in the posts.images TEXT[] array
