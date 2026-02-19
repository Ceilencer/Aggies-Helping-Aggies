# First-Time User Rules Acknowledgment Feature

## Overview

A comprehensive first-time user rules popup has been implemented that displays community posting guidelines when a user logs in for the first time. Users must acknowledge the rules before they can create or view posts on the platform.

## Implementation Details

### 1. **Components Created**

#### `RulesAcknowledgmentModal.tsx`
- Modal component that displays all community posting guidelines
- Features an acceptance checkbox that must be checked
- Button is disabled until the checkbox is checked
- Styled with Aggie colors (#500000) and responsive design
- Includes visual icons for each guideline section
- Modal prevents interaction with the rest of the app until acknowledged

**Guidelines Displayed:**
- ✅ One post per day limit
- ✅ Content restrictions (no profanity/inappropriate images)
- ✅ No political commentary
- ✅ Channel selection requirements (General Discussion, Aggie Ring, Football Tickets, Job Opportunities, Promotions & Events)
- ✅ Respectful interactions requirement
- ✅ Consequences for non-compliance

### 2. **Database Migration**

Created migration script: `scripts/add-rules-acknowledgment-field.sql`

**SQL Changes:**
```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS rules_acknowledged_at TIMESTAMPTZ;
```

This adds a `rules_acknowledged_at` column to the `profiles` table that:
- Tracks when a user first acknowledged the rules
- Is NULL for users who haven't acknowledged
- Gets updated automatically when rules are acknowledged

**Important:** You must run this migration on your Supabase instance before deploying the feature.

### 3. **API Endpoint**

Created: `app/api/acknowledge-rules/route.ts`

**Functionality:**
- Accepts POST requests only
- Requires authenticated user
- Updates the user's `rules_acknowledged_at` timestamp
- Returns success/error response
- Endpoint: `POST /api/acknowledge-rules`

### 4. **Type Updates**

Modified: `lib/types.ts`

**Changes:**
- Added `rules_acknowledged_at?: string` to the `Profile` interface
- This optional field stores the timestamp of acknowledgment

### 5. **Integration with Dashboard**

Modified: `components/DashboardClient.tsx`

**Changes:**
- Imported `RulesAcknowledgmentModal` component
- Added `useEffect` hook to check if user needs to acknowledge rules
- Shows modal automatically if `profile.rules_acknowledged_at` is null
- Handles acknowledgment via API call
- Modal prevents all other dashboard interactions until acknowledged

**Flow:**
1. User logs in and navigates to dashboard
2. DashboardClient mounts and checks `profile.rules_acknowledged_at`
3. If null, `RulesAcknowledgmentModal` is shown
4. User must read guidelines and check the acknowledgment checkbox
5. User clicks "I Acknowledge and Accept" button
6. Modal makes POST request to `/api/acknowledge-rules`
7. API updates the `rules_acknowledged_at` timestamp
8. Modal closes and dashboard becomes fully accessible
9. User can now create and view posts

## How to Deploy

### Step 0: Install Required Dependencies

If you don't already have `@radix-ui/react-checkbox`, install it:

```bash
npm install @radix-ui/react-checkbox
# or
yarn add @radix-ui/react-checkbox
```

### Step 1: Run Database Migration

You have two options:

**Option A: Via Supabase Dashboard**
1. Go to your Supabase project → SQL Editor
2. Create a new query
3. Copy and paste the contents of `scripts/add-rules-acknowledgment-field.sql`
4. Click "Run"

**Option B: Via Supabase CLI**
```bash
supabase migration add add_rules_acknowledgment
# This creates a migration file
# Then run: supabase db push
```

### Step 2: Deploy the Code

1. Commit all changes:
```bash
git add .
git commit -m "Add first-time user rules acknowledgment feature"
```

2. Push to your repository and deploy as usual

3. No environment variables needed

## User Experience

1. **First-Time Users**: Will see the modal on their first dashboard visit
2. **Existing Users**: Will see the modal if their `rules_acknowledged_at` is NULL
3. **Returning Users**: Modal will not show once acknowledged
4. **Non-Dismissible**: Users cannot close the modal without accepting
5. **Permanent Once Accepted**: The acknowledgment date is stored in the database

## Testing

To test the feature:

1. **Test with new user:**
   - Create a new account and log in
   - Modal should immediately appear
   - Try clicking "I Acknowledge and Accept" without checking the box (should be disabled)
   - Check the box and click the button
   - Modal should close and you should see the dashboard

2. **Test with existing user:**
   - If you have existing users, they'll see the modal once
   - The `rules_acknowledged_at` field will be populated in their profile

3. **Test persistence:**
   - Log out and log back in
   - Modal should not appear after first acknowledgment

## Database Impact

- **New Column**: `rules_acknowledged_at TIMESTAMPTZ` in `profiles` table
- **Storage**: Minimal - only stores one timestamp per user
- **No Performance Impact**: Simple nullable timestamp field

## Notes

- The modal uses a custom Checkbox component built from Radix UI primitives (created in `components/ui/checkbox.tsx`)
- Styling matches your existing design system with Aggie colors
- The feature is fully typed with TypeScript
- Requires `@radix-ui/react-checkbox` dependency (see deployment step 0)

## Future Enhancements

Possible future improvements:
- Admin interface to reset users' acknowledgments if guidelines change
- Different rule sets based on user role (e.g., different rules for Admins)
- Version tracking for rules (show modal again if guidelines are updated)
- Audit log of who acknowledged rules and when
