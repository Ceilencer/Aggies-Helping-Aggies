# Google OAuth Setup Guide

## Overview
This guide will walk you through setting up Google OAuth authentication for your Howdy Helps application.

## Prerequisites
- Google Cloud Console account
- Supabase project
- Access to your application's environment variables

## Step 1: Configure Google Cloud Console

### 1.1 Create OAuth 2.0 Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Select **Web application** as the application type

### 1.2 Configure OAuth Consent Screen
1. Go to **OAuth consent screen** in the left menu
2. Choose **External** user type (unless you have a Google Workspace)
3. Fill in the required fields:
   - **App name**: Howdy Helps (or your preferred name)
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Add scopes (recommended):
   - `email`
   - `profile`
   - `openid`
5. Save and continue

### 1.3 Set Authorized Redirect URIs
Add the following URIs in your OAuth client configuration:

**For Development:**
```
http://localhost:3000/auth/callback
```

**For Production:**
```
https://your-domain.com/auth/callback
```

### 1.4 Copy Your Credentials
After creating the OAuth client, you'll see:
- **Client ID**: Something like `xxxxx-xxxxx.apps.googleusercontent.com`
- **Client Secret**: A random string

**Keep these safe - you'll need them for Supabase!**

## Step 2: Configure Supabase

### 2.1 Enable Google Provider
1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find **Google** in the list and click to enable it

### 2.2 Add Google Credentials
1. Toggle **Enable Google provider** to ON
2. Enter your **Client ID** from Google Cloud Console
3. Enter your **Client Secret** from Google Cloud Console
4. Click **Save**

### 2.3 Configure Redirect URLs (Optional)
In Supabase, go to **Authentication** > **URL Configuration** and add:
- **Site URL**: Your production URL (e.g., `https://your-domain.com`)
- **Redirect URLs**: Add both development and production callback URLs:
  - `http://localhost:3000/auth/callback`
  - `https://your-domain.com/auth/callback`

## Step 3: Update Environment Variables

Create a `.env.local` file in your project root (if you don't have one):

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-supabase-anon-key
```

You can find these values in your Supabase project settings under **Settings** > **API**.

## Step 4: Test the Integration

### 4.1 Start Your Development Server
```bash
npm run dev
```

### 4.2 Test Sign-In Flow
1. Navigate to `http://localhost:3000/login`
2. Click **Sign in with Google**
3. You should be redirected to Google's consent screen
4. After authorizing, you should be redirected back to your dashboard

### 4.3 Verify Profile Creation
- Check your Supabase dashboard under **Authentication** > **Users**
- You should see the new user with their Google email
- Check the **profiles** table to ensure a profile was created

## Step 5: Email Domain Restriction (Optional)

The implementation includes TAMU email validation. The code will:
- Accept emails ending with `@tamu.edu`
- Accept emails ending with `@aggienetwork.com`
- Reject all other email domains

If you want to modify the Google sign-in to ONLY show TAMU emails in the Google picker, the `hd` parameter is already set in the code:

```typescript
queryParams: {
  hd: 'tamu.edu', // Hosted domain restriction
}
```

**Note:** The `hd` parameter is a hint to Google but not enforced. Server-side validation (already implemented in the callback) provides actual security.

## Troubleshooting

### Issue: "redirect_uri_mismatch" error
**Solution:** Ensure the redirect URI in Google Cloud Console exactly matches the one being used by your app:
- Development: `http://localhost:3000/auth/callback`
- Production: `https://your-domain.com/auth/callback`

### Issue: User gets signed in but profile is not created
**Solution:** Check your Supabase database logs and ensure:
1. The `profiles` table exists
2. The RLS (Row Level Security) policies allow insertion
3. Check the browser console for any errors

### Issue: "Invalid email" error after Google sign-in
**Solution:** This means the user's Google email doesn't end with `@tamu.edu` or `@aggienetwork.com`. This is intentional to restrict access.

### Issue: User redirected to login with error parameter
**Solution:** Check the URL for the error parameter:
- `?error=invalid_email` - User tried to sign in with non-TAMU email
- `?error=auth_failed` - General authentication failure

## Security Considerations

1. **Email Domain Validation**: The callback handler validates email domains server-side for security
2. **Profile Creation**: Profiles are automatically created for new users
3. **Alumni Detection**: Users with `@aggienetwork.com` emails are marked as alumni
4. **Session Management**: Supabase handles session tokens and refresh tokens automatically

## What Changed in Your Code

### New Files Created:
1. `app/auth/callback/route.ts` - Handles OAuth callback and profile creation
2. `.env.local.example` - Template for environment variables
3. `GOOGLE_OAUTH_SETUP.md` - This guide

### Modified Files:
1. `app/login/page.tsx` - Added Google sign-in button and handler
2. `app/signup/page.tsx` - Added Google sign-up button and handler

### Key Features:
- Single Sign-On with Google
- Automatic profile creation
- TAMU email validation
- Alumni detection
- Error handling and user feedback
- Consistent UI with your existing design

## Next Steps

1. Test the Google OAuth flow in development
2. Verify profile creation in Supabase
3. Test with different email domains to ensure validation works
4. Deploy to production and update redirect URIs
5. Consider adding additional OAuth providers (Microsoft, etc.) if needed

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Check Supabase logs in the dashboard
3. Verify all credentials are correct
4. Ensure redirect URIs match exactly
