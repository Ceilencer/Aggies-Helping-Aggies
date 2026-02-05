# Supabase Database Setup Guide

## Quick Setup

### Step 1: Apply the Database Schema

1. Open your Supabase project in the dashboard:
   - URL: https://supabase.com/dashboard/project/akubcsbzqeqwswpfpfkd

2. Navigate to **SQL Editor** in the left sidebar

3. Click **"New Query"**

4. Copy the entire contents of `supabase-schema.sql` and paste it into the editor

5. Click **"Run"** (or press Ctrl+Enter)

6. Wait for the query to complete successfully

### Step 2: Verify the Setup

Run the verification script to check if everything is configured correctly:

```bash
npm install -D tsx
npx tsx scripts/verify-supabase.ts
```

This will check:
- ✅ Database connection
- ✅ All required tables exist
- ✅ Initial channel data is loaded
- ✅ Row Level Security policies are in place

### Step 3: Create Your Test User

1. Sign up through your application at `/signup`
2. Your profile will be automatically created
3. To test posting, you'll need to be verified

#### Option A: Verify via Admin (Recommended for Production)
- Wait for an admin to verify your account
- Or use the alumni verification process

#### Option B: Manual Verification for Testing
Run this in the Supabase SQL Editor:

```sql
-- Find your user ID
SELECT id, email, is_verified FROM profiles;

-- Verify your account (replace YOUR_USER_ID with actual ID)
UPDATE profiles 
SET is_verified = TRUE, is_alumni = TRUE 
WHERE id = 'YOUR_USER_ID';
```

## Database Structure

### Key Tables

1. **profiles** - User information and roles
2. **channels** - Discussion categories
3. **posts** - User-created content
4. **comments** - Post replies
5. **post_tracking** - Rate limiting data
6. **verification_requests** - Alumni verification queue
7. **notifications** - User notifications

### Default Channels

- 💬 **General** - Community discussions
- 📢 **Promotions** - Business promotions
- 💼 **Job/Internship/Networking** - Career opportunities
- 💍 **Fundraising** - Support Aggie causes
- 🎟️ **Football Tickets** - Ticket exchange (requires MFA)
- 📌 **Announcements** - Admin-only announcements

## Row Level Security (RLS)

The database uses PostgreSQL Row Level Security:

- **Posts**: Only verified users can create/view posts
- **Comments**: Only verified users can comment
- **Channels**: All authenticated users can view
- **Profiles**: Users can update their own profile

## Posting Limits

Enforced by database triggers:

| Role | Daily Limit | Monthly Limit |
|------|-------------|---------------|
| Personal | 2 posts | 60 posts |
| Charity | 1 post | 30 posts |
| Business | No daily limit | 1 post |
| Admin | Unlimited | Unlimited |

## Troubleshooting

### Error: "Failed to create post"

1. **Check if user is verified:**
   ```sql
   SELECT id, email, is_verified FROM profiles WHERE email = 'your@email.com';
   ```

2. **Check posting limits:**
   ```sql
   SELECT * FROM post_tracking WHERE user_id = 'YOUR_USER_ID';
   ```

3. **View recent errors in Supabase logs:**
   - Go to: Logs > Postgres Logs in your dashboard

### Error: "Channel requires MFA"

- Enable Two-Factor Authentication in your security settings
- Or choose a different channel that doesn't require MFA

### Connection Issues

1. Verify your `.env.local` has correct values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://akubcsbzqeqwswpfpfkd.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
   ```

2. Restart your development server:
   ```bash
   npm run dev
   ```

## Testing Checklist

- [ ] Schema applied successfully
- [ ] All 6 channels appear in database
- [ ] User profile created on signup
- [ ] User account verified (for testing)
- [ ] Can create posts in General channel
- [ ] Posts appear in dashboard
- [ ] Post limits are enforced
- [ ] Comments work on posts

## Next Steps

After setup is complete:

1. Test creating a post in the General channel
2. Test the posting limits by creating multiple posts
3. Test MFA-protected channels (Football Tickets)
4. Implement the alumni verification flow
5. Add image upload functionality for posts
6. Implement comment functionality
