# Troubleshooting Guide

## Issues Fixed

### 1. Channel pages redirecting to login
**Problem**: Clicking on channels in the sidebar redirected to the login page even when logged in with Google OAuth.

**Root Cause**: The channel page (`app/dashboard/channels/[slug]/page.tsx`) only worked with mock admin sessions and didn't support real Supabase authentication.

**Fix**: Updated the channel page to support both mock admin sessions AND real Supabase authentication. Now it will:
- Check for both admin session cookies and Supabase auth
- Load channel data from Supabase database when authenticated with Google OAuth
- Load posts filtered by the selected channel

### 2. Posts always going to announcements
**Problem**: Posts created in any channel were showing up in the announcements section.

**Potential Root Causes**:
1. Channels might not exist in the database
2. Post creation might be using wrong channel IDs
3. Race condition in loading user role and channels

**Fixes Applied**:
1. Fixed race condition in post-creation page where user role wasn't loaded before channels
2. Added extensive debugging logs to track channel selection
3. Added logging to dashboard to see which posts are being categorized where

## Debugging Steps

### Step 1: Verify Channels Exist in Database

Run this query in your Supabase SQL Editor:

```bash
# Check if channels exist
cat scripts/verify-channels.sql
```

If channels don't exist, run:

```bash
# Insert default channels
cat scripts/insert-channels.sql
```

Copy the INSERT statement and run it in Supabase SQL Editor at:
https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql

### Step 2: Debug Post Channel Assignments

Run the debugging script in Supabase SQL Editor:

```bash
cat scripts/debug-posts.sql
```

This will show you:
1. All channels in the database
2. All posts with their actual channel assignments
3. Count of posts per channel
4. Details about the announcements channel

### Step 3: Check Browser Console Logs

1. Open your browser's developer tools (F12)
2. Go to the Console tab
3. Navigate to `/post-creation`
4. Look for these log messages:
   - "Loaded channels from database:" - Shows what channels were loaded
   - "Selected channel:" - Shows which channel you selected
   - "Inserting post with data:" - Shows the actual data being sent

5. After creating a post, go to `/dashboard` and look for:
   - "Loaded posts (non-announcements):" - Shows posts in community feed
   - "Loaded announcements:" - Shows posts in announcements section

### Step 4: Verify Channel IDs

The issue might be that you're selecting one channel but the database is receiving a different channel_id.

Expected behavior:
- When you select "General" channel, the channel_id should be a UUID like `a1b2c3d4-...`
- NOT a string like "1" or "general"

Check the console logs for "Inserting post with data:" and verify:
1. The `channel_id` is a valid UUID format
2. It matches the ID of the channel you selected

## Common Issues

### Issue: "No channels available"

**Solution**: Run `scripts/insert-channels.sql` in Supabase SQL Editor

### Issue: Posts still going to wrong channel

**Debug steps**:
1. Check console logs to see what channel_id is being sent
2. Run `scripts/debug-posts.sql` to see where posts are actually being saved
3. Verify the channel_id in the posts table matches the intended channel

### Issue: Cannot see channels in sidebar

**Possible causes**:
1. Not logged in (check authentication)
2. Channels not in database
3. RLS (Row Level Security) blocking access

**Solution**:
- Ensure you're logged in with Google OAuth
- Run `scripts/verify-channels.sql` to check if channels exist
- Check Supabase logs for RLS policy violations

## Database Schema Notes

The posts table has these key fields:
- `channel_id` - UUID foreign key to channels.id
- `author_id` - UUID foreign key to profiles.id

The dashboard filters posts by joining with the channels table:
- Community feed: `.neq('channel.slug', 'announcements')` - Shows all posts EXCEPT announcements
- Announcements: `.eq('channel.slug', 'announcements')` - Shows ONLY announcements

If all posts show up in announcements, it means all posts have channel_id pointing to the announcements channel UUID.

## Next Steps

1. Run the debugging scripts in order
2. Check browser console logs
3. Create a test post and verify:
   - Console shows correct channel_id being sent
   - Database shows post saved with correct channel_id
   - Dashboard shows post in correct section

If issues persist after these steps, share:
1. Output from `scripts/debug-posts.sql`
2. Console log output from post creation
3. Console log output from dashboard page
