# Image Upload Setup Guide

This document outlines the setup required to enable image upload functionality for posts in the Aggies Helping Aggies platform.

## Overview

The image upload system allows users to:
- Upload up to 5 images per post
- Upload a maximum of 5MB per image
- Support for JPEG, PNG, GIF, and WebP formats
- Images are stored in Supabase Storage and URLs are saved to the database

## Prerequisites

- Supabase project already set up
- Supabase client configured in your Next.js app
- Admin access to Supabase dashboard

## Setup Steps

### 1. Create the Supabase Storage Bucket

You can create the bucket using either method:

#### Option A: Supabase Dashboard (Recommended for beginners)

1. Log in to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **Create a new bucket**
4. Enter the bucket name: `post-images`
5. Leave it as **Private** for now (we'll configure RLS below)
6. Click **Create bucket**

#### Option B: SQL Query (Advanced)

Run this SQL in your Supabase SQL Editor:

```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, owner, file_size_limit, public)
VALUES (
  'post-images',
  'post-images',
  NULL,
  5242880, -- 5MB in bytes
  false
);
```

### 2. Configure Row-Level Security (RLS) for Storage

The storage bucket needs RLS policies to control access. Run these SQL queries in your Supabase SQL Editor:

```sql
-- Allow authenticated users to upload to their own user directory
CREATE POLICY "Users can upload post images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'post-images'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to read (get public URL)
CREATE POLICY "Users can read post images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'post-images'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Users can delete their own post images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'post-images'
  AND auth.role() = 'authenticated'
);
```

### 3. Make Images Publicly Accessible (Optional)

If you want to make images publicly accessible without authentication, use this alternative RLS policy:

```sql
-- Allow public read access
CREATE POLICY "Public read access to post images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'post-images');

-- Allow authenticated uploads
CREATE POLICY "Authenticated users can upload"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'post-images'
  AND auth.role() = 'authenticated'
);
```

### 4. Configure CORS (Optional but Recommended)

If you're uploading from the browser, configure CORS:

1. Go to your bucket settings (click on `post-images` bucket)
2. Click on **CORS policies**
3. Add a new CORS policy:
   ```json
   {
     "allowedHeaders": ["*"],
     "allowedMethods": ["GET", "POST", "PUT", "DELETE"],
     "allowedOrigins": ["*"],
     "maxAgeSeconds": 3600
   }
   ```

## How It Works

### Image Upload Flow

1. **Client-side validation** (`useImageUpload` hook):
   - Max 5 images per post
   - Max 5MB per file
   - Only image file types allowed

2. **Image preview** (`ImagePreview` component):
   - Shows selected images before submission
   - Users can remove images before posting

3. **Post creation** (`post-creation/page.tsx`):
   - Post is created first without images
   - Images are uploaded to storage in parallel
   - Image URLs are saved to the database

4. **Display in feed** (dashboard):
   - Small grid preview (max 3 images per row)
   - Click to expand and view full size
   - Responsive design for mobile

5. **Full post view**:
   - Larger image display with better sizing
   - Click to open modal preview
   - Navigation between images

### File Organization in Storage

Images are stored with the following path structure:
```
post-images/
├── {post-id}/
│   ├── {uuid}.jpg
│   ├── {uuid}.png
│   └── ...
```

This structure:
- Groups images by post for easier management
- Uses random UUIDs to prevent filename conflicts
- Makes it easy to delete all images for a post

## Database Changes

The `posts` table already has an `images` column defined as `TEXT[]` (array of text).

If your database is missing this column, add it:

```sql
ALTER TABLE posts 
ADD COLUMN images TEXT[] DEFAULT NULL;
```

## Testing

To test the image upload functionality:

1. Navigate to `/dashboard/post-creation`
2. Fill in the post information
3. Click the image upload area to select images
4. Verify that:
   - Max 5 images validation works
   - Max 5MB file size validation works
   - Only image files are accepted
   - Preview displays correctly
5. Submit the post
6. Verify images appear in the post feed (grid view)
7. Click "View Full Post" to see images in full view
8. Verify images are clickable to open preview modal

## Troubleshooting

### Images not uploading

**Problem**: Images fail to upload with CORS or permission errors

**Solution**:
1. Check that the `post-images` bucket exists
2. Verify RLS policies are configured correctly
3. Ensure your Supabase anon key has the required permissions
4. Check browser console for detailed error messages

### Storage bucket not found

**Problem**: Error message: "Bucket not found"

**Solution**:
1. Go to Supabase dashboard → Storage
2. Verify the `post-images` bucket exists
3. Check bucket name matches exactly (case-sensitive)

### Public URLs not working

**Problem**: Image URLs return 401 or 403 errors

**Solution**:
1. Check RLS policies allow `SELECT` for public or authenticated users
2. If using private bucket, ensure RLS policy has `FOR SELECT`
3. Consider making bucket public if appropriate for your use case

### Images too large

**Problem**: Upload fails with size validation error

**Solution**:
- Maximum file size is 5MB per image
- Users should compress images before upload
- Consider using image compression tools

## Component Reference

### `useImageUpload` Hook

Located in `lib/hooks/useImageUpload.ts`

```typescript
const imageUpload = useImageUpload()

// Properties:
imageUpload.uploadedImages    // Array of selected images
imageUpload.error             // Current error message
imageUpload.canAddMore        // Boolean: can add more images
imageUpload.remainingSlots    // Number of remaining image slots

// Methods:
imageUpload.addImages(files)       // Add files from FileList
imageUpload.removeImage(index)     // Remove image by index
imageUpload.uploadImages(postId)   // Upload to storage, returns {success, urls, error}
imageUpload.clearImages()          // Clear all selected images
```

### Components

- **ImageUploadInput**: Drag-and-drop area for file selection
- **ImagePreview**: Preview grid for selected images
- **PostImageGrid**: Compact grid for post listings (3 cols, max 3 images)
- **PostImageDisplay**: Full-size display for post detail view

## Environment Variables Needed

Your `.env.local` file should already have:

```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

No additional environment variables are needed for image uploads.

## Future Enhancements

Potential improvements for the image upload system:

1. **Image Optimization**: Use Supabase image transformation APIs for thumbnails
2. **Progress Indication**: Show upload progress bar during image upload
3. **Advanced Filtering**: Filter by image type, aspect ratio, etc.
4. **Image Compression**: Automatically compress images on client-side
5. **Alt Text**: Allow users to add alt text to images for accessibility
6. **Image Reordering**: Let users reorder images via drag-and-drop
7. **Moderation**: Integrate image moderation API for content safety

## Support

For issues or questions about the image upload functionality:

1. Check the troubleshooting section above
2. Review browser console for error messages
3. Check Supabase logs for server-side errors
4. Consult Supabase documentation: https://supabase.com/docs/guides/storage
