# UserProfile Component Documentation

## Overview
The `UserProfile` component provides a comprehensive user profile management interface. It allows logged-in users to view their profile details and edit specific fields while maintaining security by keeping sensitive fields read-only.

## Files Created
1. **`components/UserProfile.tsx`** - Main profile component
2. **`components/ui/toast.tsx`** - Toast notification system
3. **`app/profile/page.tsx`** - Profile page route
4. **`scripts/user-profile-rls.sql`** - Required RLS policies

## Features

### ✅ Data Fetching & State Management
- Fetches profile data on component mount using Supabase client
- Loading state with spinner animation
- Error handling with retry functionality
- Automatic state synchronization after updates

### ✅ View vs. Edit Mode
- **View Mode (Default)**: All data displayed in read-only format
- **Edit Mode**: Editable fields transform into input controls
- Smooth toggle between modes with "Edit Profile" / "Save Changes" buttons
- Cancel button to discard changes

### ✅ Field Management

#### Read-Only Fields:
- **Email** - Disabled with explanation text (security reason)
- **Role** - Displayed as a colored badge (Personal/Business/Charity/Admin)
- **Verification Status** - Green checkmark badge if verified

#### Editable Fields:
- **Full Name** - Text input
- **Major** - Text input
- **Graduation Year** - Number input (1900-2100 range)
- **Alumni Status** - Toggle switch (is_alumni)
- **MFA Enabled** - Toggle switch (UI only for now)

### ✅ Visual Design
- Card-based layout using shadcn/ui components
- Tailwind CSS styling with Texas A&M maroon theme
- Role badges with color coding:
  - Personal: Blue
  - Business: Purple
  - Charity: Green
  - Admin: Red
- Verification badge in green when verified
- Warning banner (yellow) when account is pending verification

### ✅ Notifications
- Success toast on profile update
- Error toast on save failure
- Auto-dismiss after 3 seconds
- Manual dismiss option

### ✅ Additional Info
- Account creation date
- Last update timestamp

## Usage

### Basic Usage
```tsx
import { UserProfile } from "@/components/UserProfile"

export default function ProfilePage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <UserProfile />
    </div>
  )
}
```

### Access the Profile Page
Navigate to `/profile` in your application

## Database Setup

### Required RLS Policies
Run the SQL script to set up proper Row Level Security:

```bash
# Using Supabase CLI
supabase db execute -f scripts/user-profile-rls.sql

# Or execute the SQL directly in Supabase Dashboard
```

The script creates two policies:
1. **"Users can update own profile"** - Allows users to update only their profile (WHERE auth.uid() = id)
2. **"Users can view own profile"** - Allows users to view their own profile data

### Database Schema Reference
The component expects the `public.profiles` table with:

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL, -- 'Personal' | 'Business' | 'Charity' | 'Admin'
  is_verified BOOLEAN DEFAULT FALSE,
  is_alumni BOOLEAN DEFAULT FALSE,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  graduation_year INTEGER,
  major TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Security Considerations

### Email Updates
The email field is intentionally disabled because:
- Supabase treats email changes as security events
- Requires email confirmation on the new address
- Could lock users out during demos/development
- Use Supabase auth methods for email changes

### RLS Policies
The component relies on RLS policies to ensure:
- Users can only view their own profile
- Users can only update their own profile
- No unauthorized access to other users' data

## Styling & Theming

The component uses:
- **Tailwind CSS** for styling
- **Texas A&M Maroon** (`#500000`) as primary color
- **shadcn/ui** component library for consistent design
- Responsive layout with max-width container

### Custom Colors
```css
/* Maroon theme already configured in tailwind.config.js */
- Primary: maroon (#500000)
- Hover: maroon-800
- Focus: ring-maroon
```

## Error Handling

The component handles:
1. **Authentication errors** - Shows error if no user is logged in
2. **Fetch errors** - Displays error card with retry button
3. **Update errors** - Shows error toast with descriptive message
4. **Network errors** - Gracefully handled with error messages

## Future Enhancements

### MFA Implementation
Currently `mfa_enabled` is UI-only. To implement fully:
1. Integrate with Supabase MFA API
2. Add MFA setup wizard
3. Require MFA verification on sensitive actions

### Additional Features
- Profile picture upload
- Password change functionality
- Email change with verification flow
- Account deletion option
- Activity log viewer

## Troubleshooting

### Profile Not Loading
1. Check if user is authenticated
2. Verify RLS policies are applied
3. Check browser console for errors
4. Verify Supabase connection

### Cannot Update Profile
1. Ensure RLS policy "Users can update own profile" exists
2. Check if user ID matches profile ID
3. Verify Supabase client is properly configured
4. Check for validation errors in form data

### Toast Not Appearing
1. Ensure `ToastContainer` is rendered
2. Check z-index conflicts
3. Verify Tailwind animation classes are working

## Dependencies

```json
{
  "@supabase/ssr": "^latest",
  "@supabase/supabase-js": "^latest",
  "@radix-ui/react-label": "^latest",
  "@radix-ui/react-slot": "^latest",
  "class-variance-authority": "^latest",
  "tailwindcss": "^latest",
  "react": "^latest",
  "next": "^latest"
}
```

## Component API

### UserProfile Component

No props required - the component is self-contained and manages its own state.

```tsx
<UserProfile />
```

### Toast Hook

```tsx
const { showToast, ToastContainer } = useToast()

// Show a toast
showToast({
  message: "Profile updated!",
  type: "success", // "success" | "error" | "info"
  duration: 3000, // milliseconds (default: 3000)
})

// Render container
<ToastContainer />
```

## License
MIT
