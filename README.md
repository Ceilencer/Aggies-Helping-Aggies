# Howdy Helps - Aggies Helping Aggies

> **Project Snapshot**: April 30, 2026

A verified community engagement platform exclusively for Texas A&M University students, alumni, and affiliates. Support fellow Aggies with fundraising, connect through shared experiences, and engage with the Aggie network through a secure, moderated platform.

Built with **Next.js 16**, **Supabase**, **TypeScript**, and official **TAMU branding**.

---

## Core Features

### Authentication & Verification

#### Multi-Tier Verification System
- **Tier 1**: Automatic verification for @tamu.edu and @aggienetwork.com email addresses
- **Tier 2**: Former Student verification questionnaire for alumni without TAMU emails
- Admin manual review queue for Tier 2 submissions (`/dashboard/admin/pending-verifications`)
- `pending-approval` holding page shown while verification is under review

#### Multi-Factor Authentication (MFA)
- **TOTP-based** 2FA via Supabase Auth
- **Required** for Football Tickets channel
- Optional for all other channels
- Configured through user profile settings

---

### Role-Based Access Control
Four distinct user roles with different posting privileges:

| Role         | Daily Limit | Monthly Limit | Use Case                  |
|--------------|-------------|---------------|---------------------------|
| **Personal** | 2 posts     | 60 posts      | Students & alumni         |
| **Charity**  | 1 post      | 30 posts      | Nonprofit organizations   |
| **Business** | N/A         | 1 post        | Local businesses          |
| **Admin**    | Unlimited   | Unlimited     | Platform moderation       |

---

### Channel-Based Organization
Six discussion channels, each with its own feed and admin announcement banner:

- **General Discussion** — Open community conversations
- **Job Opportunities** — Career postings and networking
- **Football Tickets** — Secure ticket trading (requires MFA)
- **Promotions & Events** — Business promotions and events
- **Announcements** — Admin-only posts (read-only for all other users)
- **Aggie Ring Fundraising** — Support fellow Aggies achieving their ring

---

### Post & Content System

- Create posts with a title, body, channel selection, and optional contact info (email, phone, social media, website)
- Upload up to **5 images per post** (JPEG, PNG, GIF, WebP; max 5MB each) with drag-and-drop preview
- Image grid display on posts with a lightbox viewer
- Edit your own posts after publishing
- Move posts between channels (admin only)
- View full edit history of a post
- Profanity filtering: titles (5–200 chars), content (10–5,000 chars)
- Rate limiting enforced at the database level; counters reset via triggers

---

### Comments & Engagement

- Nested comments on all posts (1–1,000 chars)
- Like/unlike posts and comments with optimistic UI updates
- Edit your own comments
- Delete your own comments
- Real-time comment counts
- Report posts or comments for admin review

---

### User Profiles

- Editable display name, graduation year, major, and bio
- Contact info with per-field visibility controls (public/private)
- Avatar with initials fallback; role/flair badges
- View your own post history (`/dashboard/my-posts`)
- Public profile pages for other users (`/dashboard/profile/[userId]`)
- Request a display name change (subject to admin approval)

---

### Notifications

- In-app notification feed (`/dashboard/notifications`)
- Per-notification read/dismiss actions via the API

---

### Aggie Ring Fundraising

- Dedicated fundraising feed and tracker (`/dashboard/fundraising`)
- Admin ring sponsorship management with per-user tracking
- Full CRUD on sponsorship records

---

### Admin Dashboard

A full suite of moderation and management tools under `/dashboard/admin/`:

| Page | Purpose |
|------|---------|
| `users` | Browse all users; change role, flair, suspend, ban, or delete accounts |
| `pending-verifications` | Review and approve/deny Tier 2 alumni verification requests |
| `reported-posts` | Review reported posts and comments; delete or dismiss |
| `ring-sponsorship` | Track and manage Aggie Ring sponsorships |
| `name-change-requests` | Approve or deny user display name change requests |
| `suspended-users` | View and unsuspend suspended accounts |
| `analytics` | Platform analytics dashboard and action log |

Additional admin capabilities:
- Add private admin notes on any user account
- Post channel announcements (displayed as a pinned banner per channel)
- Reset individual user post-limit counters
- Full user deletion with cascade data cleanup

---

### UI & Design

- Responsive, mobile-first layout
- Dark mode with system preference detection
- TAMU-branded color scheme (Aggie Maroon `#500000`)
- Shadcn UI / Radix UI component library
- Floating action button for quick post creation
- Legal pages: Privacy Policy and Terms of Service
- Data deletion request page (`/data-deletion`)

---

## Tech Stack

### Frontend
- **Framework**: Next.js 16.1.6 with React 19.2.4
- **Architecture**: App Router, Server Components
- **Language**: TypeScript 5+ (strict mode)
- **Styling**: Tailwind CSS 3.4+ with custom TAMU color scheme
- **UI Library**: Shadcn UI (Radix UI primitives)
- **Icons**: Lucide React
- **Theme**: Dark mode via `next-themes`

### Backend & Database
- **BaaS**: Supabase (PostgreSQL 15+)
- **Authentication**: Supabase Auth with email verification and TOTP MFA
- **Storage**: Supabase Storage for image uploads
- **Real-time**: Supabase Realtime (infrastructure ready)
- **Security**: PostgreSQL Row-Level Security (RLS) on all tables

### Developer Tools
- **Form Handling**: React Hook Form with `@hookform/resolvers`
- **Validation**: Zod schemas
- **Content Moderation**: `obscenity` library for profanity filtering
- **Build Tool**: Next.js with Turbopack
- **Linting**: ESLint with Next.js config

### Key Libraries
```json
{
  "@supabase/supabase-js": "^2.39.3",
  "@supabase/ssr": "^0.5.2",
  "next": "16.1.6",
  "react": "19.2.4",
  "obscenity": "^0.3.0",
  "zod": "^3.22.4",
  "lucide-react": "^0.321.0",
  "next-themes": "^0.4.6"
}
```

---

## Prerequisites

- **Node.js** 18+ and npm/yarn
- **Supabase** account (free tier supported)
- **Git** for version control
- **Code editor** (VS Code recommended)

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Howdy-Helps-Capstone
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

#### A. Create a Supabase Project
1. Visit [supabase.com](https://supabase.com) and sign in
2. Create a new project
3. Note your **Project URL** and **anon public key**

#### B. Run the Database Schema
1. Open the **Supabase SQL Editor** (Database → SQL Editor)
2. Copy and execute `supabase-schema.sql` to create all tables, functions, triggers, and RLS policies
3. Verify tables were created in the **Table Editor**

#### C. Set Up Image Storage
Follow `IMAGE_UPLOAD_SETUP.md` to:
1. Create the `post-images` storage bucket
2. Configure bucket permissions and CORS policies

#### D. Insert Default Channels
Run `scripts/insert-channels.sql` in the SQL Editor to create the six default channels.

### 4. Configure Environment Variables

Create `.env.local` in the project root:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional (server-side operations and cron protection)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=your-cron-secret
```

### 5. Run the Development Server

```bash
npm run dev
```

The app will be available at **http://localhost:3000**

### 6. Create Your First User

1. Navigate to http://localhost:3000
2. Click **Join the Community**
3. Sign up with a @tamu.edu or @aggienetwork.com email
4. Verify your email via the link sent by Supabase
5. Once verified, you have full access to the platform

---

## Project Structure

```
howdy-helps-capstone/
├── app/                                       # Next.js App Router
│   ├── globals.css                            # Global styles + TAMU branding
│   ├── layout.tsx                             # Root layout
│   ├── page.tsx                               # Landing / login page
│   │
│   ├── auth/
│   │   ├── callback/route.ts                  # OAuth callback handler
│   │   └── signout/route.ts                   # Sign-out handler
│   │
│   ├── collect-email/page.tsx                 # Email collection for OAuth users
│   ├── pending-approval/page.tsx              # Holding page for pending verifications
│   ├── verification-questionnaire/page.tsx    # Alumni verification form
│   ├── data-deletion/page.tsx                 # Data deletion request page
│   ├── privacy-policy/page.tsx
│   ├── terms/page.tsx
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   │
│   ├── dashboard/                             # Protected dashboard area
│   │   ├── layout.tsx                         # Dashboard shell with navigation
│   │   ├── page.tsx                           # Main community feed (General)
│   │   ├── channels/[slug]/page.tsx           # Channel-specific feeds
│   │   ├── posts/[id]/page.tsx                # Individual post view
│   │   ├── post-creation/page.tsx             # Create new post
│   │   ├── my-posts/page.tsx                  # User's post history
│   │   ├── notifications/page.tsx             # In-app notifications
│   │   ├── fundraising/page.tsx               # Aggie Ring fundraising feed
│   │   ├── profile/page.tsx                   # Own profile management
│   │   ├── profile/[userId]/page.tsx          # Public profile view
│   │   └── admin/                             # Admin-only pages
│   │       ├── page.tsx                       # Admin home / moderation queue
│   │       ├── users/page.tsx                 # User management
│   │       ├── pending-verifications/page.tsx # Tier 2 review queue
│   │       ├── reported-posts/page.tsx        # Reported content review
│   │       ├── ring-sponsorship/page.tsx      # Ring sponsorship tracker
│   │       ├── name-change-requests/page.tsx  # Name change approvals
│   │       ├── suspended-users/page.tsx       # Suspended accounts
│   │       └── analytics/page.tsx             # Platform analytics
│   │
│   ├── users/[id]/page.tsx                    # Public user profile (non-dashboard)
│   │
│   └── api/                                   # API routes (50+)
│       ├── posts/[id]/                        # Post CRUD, edit, report, history, change-channel
│       ├── posts/feed/                        # Feed query
│       ├── comments/[id]/                     # Comment CRUD, edit, report, admin-delete
│       ├── post-likes/ & comment-likes/       # Like tracking
│       ├── channels/[slug]/announcement/      # Channel announcements
│       ├── notifications/[id]/                # Notification management
│       ├── ring-sponsorship/                  # Fundraising endpoints
│       ├── name-change-requests/              # Name change workflow
│       ├── admin-notes/                       # Private admin notes on users
│       ├── admin/                             # Admin: users, analytics, moderation
│       ├── auth/set-email/                    # Email update
│       ├── user/flair/ & rejection-status/    # User flair and rejection info
│       └── cron/cleanup & expire-posts/       # Scheduled maintenance tasks
│
├── components/                                # 65+ React components
│   ├── ui/                                    # Shadcn UI primitives
│   └── [feature components]
│
├── lib/                                       # Shared utilities
│   ├── hooks/                                 # 12+ custom hooks
│   │   ├── useHomeFeedState.ts
│   │   ├── useChannelFeedState.ts
│   │   ├── useCreatePostForm.ts
│   │   ├── useUserProfilePanelState.ts
│   │   └── useImageUpload.ts
│   ├── utils/
│   │   └── api-auth.ts                        # Shared auth/admin guards
│   ├── supabase/
│   │   ├── client.ts                          # Browser Supabase client
│   │   └── server.ts                          # Server-side Supabase client
│   ├── profanity-filter.ts
│   ├── types.ts
│   ├── validations.ts
│   └── utils.ts
│
├── scripts/                                   # Database scripts
│   ├── supabase-schema.sql                    # Full database schema
│   ├── insert-channels.sql                    # Default channels
│   ├── setup-image-upload.sql                 # Image storage setup
│   ├── verify-supabase.ts                     # Connection test
│   └── check-user.ts                          # User debug tool
│
└── public/images/logos/                       # Static assets
```

---

## Authentication & User Flow

### TAMU Email Users (Auto-Verification)
1. Sign up with @tamu.edu or @aggienetwork.com email
2. Click email verification link from Supabase
3. Auto-verified — immediate platform access
4. Optionally enable MFA for Football Tickets channel

### Alumni Without TAMU Email
1. Navigate to `/verification-questionnaire`
2. Complete the Alumni Questionnaire (name, graduation year, major, a memorable TAMU tradition, connection to TAMU)
3. Account enters **pending_approval** state
4. Admin reviews submission at `/dashboard/admin/pending-verifications`
5. Upon approval, user gains full platform access

---

## Database Schema Overview

### Core Tables
| Table | Purpose |
|-------|---------|
| `profiles` | User info, roles, verification status, contact details |
| `verification_requests` | Tier 2 alumni verification submissions |
| `channels` | Discussion categories |
| `posts` | User-created content |
| `post_images` | Image attachments |
| `comments` | Nested discussions |
| `post_likes` / `comment_likes` | Like tracking |
| `post_tracking` | Per-user rate-limiting counters |
| `channel_announcements` | Admin banners per channel |
| `admin_notes` | Private admin notes on users |
| `user_bans` | Ban records |
| `rejected_accounts` | Rejected signup records |
| `name_change_requests` | User name change submissions |
| `ring_sponsorship` | Aggie Ring fundraising tracking |
| `reported_posts` / `reported_comments` | Content reports awaiting review |

### Key Database Features
- UUID primary keys on all tables
- PostgreSQL Row-Level Security (RLS) on every table
- Foreign key constraints with cascade deletes
- Database triggers for automatic post counter resets and timestamps
- Indexes on frequently queried columns
- Supabase Storage for image uploads

See `supabase-schema.sql` for the complete schema.

---

## Security & Privacy

### Row-Level Security
- Users can only read/modify their own data
- Admins have elevated permissions for moderation
- Public content (posts, comments) is read-accessible
- Soft delete patterns (`is_deleted` flags) preserve audit trails

### Content Moderation
- Real-time profanity filtering via the `obscenity` library
- Character limits enforced on all user input
- Community reporting system with admin review queue
- Server-side input validation with Zod before any database write
- XSS protection via framework-level sanitization

### API Security
- All routes validate auth via shared guards in `lib/utils/api-auth.ts`
- Admin routes require admin role verification server-side
- Service role key is never exposed to the client
- Cron routes protected by `CRON_SECRET` header

---

## TAMU Branding & Design

### Color Palette
```css
--aggie-maroon: #500000;   /* Primary brand color */
--gray-dark:    #3C3C3C;   /* Secondary text */
--gray-light:   #f6f6f6;   /* Light mode background */
--background:   #ffffff;   /* Card backgrounds */
/* Dark mode adjusts automatically based on system preference */
```

---

## Deployment

### Deploying to Vercel (Recommended)

1. Push code to a GitHub repository
2. Connect the repository to Vercel
3. Add environment variables in the Vercel dashboard
4. Vercel automatically deploys on push to `main`

Required environment variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # for server-side routes
CRON_SECRET=your-cron-secret                     # for scheduled cleanup routes
```

Post-deployment checklist:
- [ ] Update Supabase Auth redirect URLs to your production domain
- [ ] Test the full sign-up and email verification flow
- [ ] Verify image uploads work end-to-end
- [ ] Confirm RLS policies are active
- [ ] Test on mobile devices

See **DEPLOYMENT.md** for full details.

---

## Available Scripts

```bash
npm run dev             # Start dev server (Turbopack)
npm run build           # Build for production
npm start               # Start production server
npm run lint            # Run ESLint
npm run verify-supabase # Test Supabase connection and table access
npm run check-user      # Debug a specific user account
```

---

## Known Limitations

1. **Real-time updates** — Posts and comments don't refresh automatically; users need to reload to see new content. Supabase Realtime infrastructure is in place for a future integration.

2. **Image moderation** — Automated image content moderation is not implemented. The platform relies on community reporting and admin review.

3. **Search** — No search feature across posts or users. PostgreSQL full-text search is planned for a future release.

4. **pg_cron** — Automatic scheduled counter resets require `pg_cron`, which is only available on paid Supabase plans. On the free tier, counters reset via database triggers when users attempt to post. This works correctly in practice.

### Free Tier Supabase Considerations
- 500MB database storage (sufficient for MVP)
- 1GB file storage for images
- 2GB bandwidth/month
- No `pg_cron` (trigger-based resets used instead)

---

## Additional Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** — Complete Vercel deployment guide
- **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** — Database configuration
- **[IMAGE_UPLOAD_SETUP.md](IMAGE_UPLOAD_SETUP.md)** — Image storage setup
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** — Common issues and solutions

### Database Scripts (`scripts/`)
- `supabase-schema.sql` — Full database schema
- `insert-channels.sql` — Create default channels
- `setup-image-upload.sql` — Configure image storage bucket
- `verify-supabase.ts` — Test database connection
- `check-user.ts` — Debug user accounts

---

## Contributing

This project is part of a capstone for Texas A&M University.

### Development Guidelines
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Use proper TypeScript types; strict mode is enabled
4. Write meaningful commit messages
5. Test on multiple devices before submitting a PR

---

## License & Legal

This project is for **educational purposes only** as part of a university capstone.

- Not officially affiliated with Texas A&M University
- Student project — not an official TAMU platform
- Educational use only — not for commercial purposes
- All TAMU trademarks belong to Texas A&M University

### Credits
- **Texas A&M University** — inspiration and community
- **Supabase** — backend infrastructure
- **Vercel / Next.js** — framework and hosting
- **Shadcn UI / Radix UI** — component library

---

## Project Status

**Status**: Active Development  
**Version**: 0.1.0  
**Last Updated**: April 30, 2026  
**Deployment**: Vercel-ready  
**Database**: Supabase PostgreSQL  

---

*Developed with love for the Aggie community. Gig 'em!*
