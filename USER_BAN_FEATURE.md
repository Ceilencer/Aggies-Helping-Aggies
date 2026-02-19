# User Ban and Timeout Feature

This feature allows administrators to ban users or temporarily timeout users from posting and commenting on the Howdy Helps platform.

## Overview

The ban system supports two types of bans:

- **Permanent Ban**: Users cannot post or comment indefinitely
- **Temporary Timeout**: Users are restricted for a specified number of days

## Database Schema

### `user_bans` Table

```sql
CREATE TABLE user_bans (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    banned_by UUID REFERENCES profiles(id),
    ban_type TEXT ('permanent' | 'temporary'),
    duration_days INTEGER (required for temporary),
    reason TEXT (max 500 chars),
    is_active BOOLEAN,
    expires_at TIMESTAMPTZ (for temporary bans),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
```

## API Endpoints

### Create a Ban
**POST** `/api/admin/user-bans`

Request body:
```json
{
  "user_id": "uuid-string",
  "ban_type": "permanent" | "temporary",
  "duration_days": 7,  // required for temporary bans
  "reason": "Reason for the ban"
}
```

Response: Returns the created ban object

**Errors:**
- `400`: Missing required fields or invalid ban_type
- `401`: Not authenticated
- `403`: User is not an admin

### List All Bans or Filter by User
**GET** `/api/admin/user-bans?user_id=uuid-string`

Query parameters:
- `user_id` (optional): Filter bans for a specific user

Response: Returns array of ban objects with related user and admin data

### Get Ban Details / Check if User is Banned
**GET** `/api/admin/user-bans/check/{userId}`

Response:
```json
{
  "is_banned": true,
  "ban": { ...ban object },
  "expires_at": "2026-03-20T...",
  "ban_type": "temporary",
  "reason": "Spamming"
}
```

### Update a Ban (Lift or Reactivate)
**PUT** `/api/admin/user-bans/{banId}`

Request body:
```json
{
  "is_active": false  // Set to false to lift a ban
}
```

### Delete/Lift a Ban
**DELETE** `/api/admin/user-bans/{banId}`

This soft-deletes the ban by setting `is_active` to false.

## Admin Interface

### Access Ban Manager
1. Navigate to `/dashboard/admin/users`
2. You'll see two sections:
   - **Search User**: Find a specific user to manage their bans
   - **Ban Manager**: Create new bans and view active bans

### Create a Ban
1. Click "Create New Ban" button
2. Enter the user ID you want to ban
3. Select ban type:
   - **Temporary (Timeout)**: Enter number of days (e.g., 7 for a week ban)
   - **Permanent Ban**: No duration needed
4. Enter a reason (visible to the banned user)
5. Click "Create Ban"

### Lift a Ban
1. Find the active ban in the list
2. Click "Lift Ban" button next to the ban
3. The ban will be deactivated immediately

## Client-Side Enforcement

When a banned user tries to:

### Create a Post
- A check is performed before submitting
- If banned, they see: "You are [permanently/temporarily] banned from this platform. Reason: {reason}"

### Post a Comment
- The API returns a 403 error with the ban message
- The user cannot complete the action

## Database Utilities

### Check if User is Banned
```typescript
import { checkUserBan } from '@/lib/supabase/ban-utils'

const { isBanned, ban } = await checkUserBan(userId, supabase)
```

### Format Ban Message
```typescript
import { formatBanMessage } from '@/lib/supabase/ban-utils'

const message = formatBanMessage(ban)
// Returns: "You are temporarily banned for 5 more days. Reason: ..."
```

## Automatic Expiration

Temporary bans are automatically deactivated when their expiration date is reached. This happens:

1. When a user is checked for a ban (via the check endpoint)
2. Via a background function `deactivate_expired_bans()` that can be scheduled

To schedule automatic cleanup in Supabase:
```sql
SELECT cron.schedule('deactivate-expired-bans', '0 * * * *', 'SELECT deactivate_expired_bans()');
```

This runs every hour at the top of the hour.

## Types

```typescript
export type BanType = 'permanent' | 'temporary'

export interface UserBan {
  id: string
  user_id: string
  banned_by: string
  ban_type: BanType
  duration_days?: number | null
  reason: string
  is_active: boolean
  expires_at?: string | null
  created_at: string
  updated_at: string
  // Relations
  user?: Profile
  admin?: Profile
}
```

## Security

- All ban operations require admin role
- RLS policies enforce that only admins can:
  - View all bans
  - Create bans
  - Update bans
  - Delete bans
- Users cannot view other users' bans, only see messages when they're banned

## Implementation Files

1. **Database Migration**: `scripts/add-user-bans.sql`
2. **API Routes**:
   - `app/api/admin/user-bans/route.ts` - Create and list bans
   - `app/api/admin/user-bans/[id]/route.ts` - Update/delete specific ban
   - `app/api/admin/user-bans/check/[userId]/route.ts` - Check if user is banned
3. **Components**:
   - `components/UserBanManager.tsx` - Admin UI for managing bans
   - `app/dashboard/admin/users/page.tsx` - User management page
4. **Utilities**:
   - `lib/supabase/ban-utils.ts` - Helper functions for ban checks
   - `lib/types.ts` - TypeScript types (UserBan, BanType)
5. **API Integration**:
   - `components/CreatePostForm.tsx` - Check before posting
   - `app/api/comments/route.ts` - Check before commenting

## Example Usage

### Admin Creates a 7-Day Timeout
```typescript
const response = await fetch('/api/admin/user-bans', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: 'user-uuid-123',
    ban_type: 'temporary',
    duration_days: 7,
    reason: 'Violating community guidelines'
  })
})
```

### Check if User is Banned
```typescript
const response = await fetch('/api/admin/user-bans/check/user-uuid-123')
const { is_banned, reason, expires_at } = await response.json()

if (is_banned) {
  console.log(`User is banned. Reason: ${reason}`)
}
```

### Lift a Ban
```typescript
const response = await fetch(`/api/admin/user-bans/${banId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ is_active: false })
})
```

## Testing the Feature

### Setup
1. Run the migration: `scripts/add-user-bans.sql`
2. Ensure you're logged in as an admin

### Test a Temporary Ban
1. Go to `/dashboard/admin/users`
2. Search for a test user ID
3. Create a 1-day temporary ban with reason "Test ban"
4. Try to post as that user - should be blocked
5. Try to comment as that user - should be blocked

### Test a Permanent Ban
1. Create a permanent ban with reason "Test permanent"
2. Verify user cannot post or comment
3. Lift the ban from the admin UI
4. Verify user can post and comment again

## Troubleshooting

### Ban check not working
- Ensure the migration script was run successfully
- Check that the user_bans table exists: `SELECT * FROM user_bans LIMIT 1`
- Verify RLS policies are configured: `SELECT * FROM pg_policies WHERE tablename = 'user_bans'`

### User can still post/comment despite being banned
- Check if the ban is marked as `is_active = true`
- Verify `expires_at` is in the future for temporary bans
- Check browser console for API errors

### Ban creation fails with permission denied
- Verify your user has role = 'Admin' in the profiles table
- Check that RLS is enabled on user_bans table

## Future Enhancements

- [ ] Appeal system for banned users
- [ ] Ban history/audit log
- [ ] Automated bans for content violations
- [ ] Email notifications to users when banned
- [ ] Dashboard widget showing active bans
- [ ] Ban statistics and analytics
- [ ] Progressive enforcement (warnings → timeout → permanent)
