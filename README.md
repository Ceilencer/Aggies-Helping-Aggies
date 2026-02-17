# Howdy Helps - Aggies Helping Aggies

> **Project Snapshot**: February 17, 2026

A verified community engagement platform exclusively for Texas A&M University students, alumni, and affiliates. Support fellow Aggies with fundraising, connect through shared experiences, and engage with the Aggie network through a secure, moderated platform.

Built with **Next.js 16**, **Supabase**, **TypeScript**, and official **TAMU branding**.

---

## 🎓 Core Features

### ✅ Implemented Features

#### 🔐 Multi-Tier Verification System
- **Tier 1**: Automatic verification for @tamu.edu and @aggienetwork.com email addresses
- **Tier 2**: Alumni verification questionnaire for former students without TAMU emails

#### 👥 Role-Based Access Control
Four distinct user roles with different posting privileges:

| Role     | Daily Limit | Monthly Limit | Use Case |
|----------|-------------|---------------|----------|
| **Personal** | 2 posts | 60 posts | Students & alumni |
| **Charity** | 1 post | 30 posts | Nonprofit organizations |
| **Business** | N/A | 1 post | Local businesses |
| **Admin** | Unlimited | Unlimited | Platform moderation |

#### 📺 Channel-Based Organization
- 💬 **General Discussion**: Open community conversations
- 💼 **Job Opportunities**: Career postings and networking
- 🎟️ **Football Tickets**: Secure ticket trading (requires MFA)
- 📢 **Promotions & Events**: Business promotions and events
- 📌 **Announcements**: Admin-only announcements (read-only)
- 💍 **Aggie Ring Fundraising**: Support fellow Aggies achieving their ring

#### 📸 Image Upload System
- Upload up to **5 images per post**
- Maximum **5MB per image**
- Support for **JPEG, PNG, GIF, WebP** formats
- Integrated with **Supabase Storage**
- Client-side preview with drag-and-drop support
- Image grid display on posts with lightbox viewer

#### 💬 Comments & Engagement
- **Nested comments** on all posts
- **Like/unlike** functionality for posts and comments
- **Real-time comment counts** with interactive buttons
- **Delete own comments** capability
- Author attribution with profile avatars

#### 🎨 Modern User Interface
- **Responsive design** optimized for mobile and desktop
- **Dark mode support** with system preference detection
- **TAMU-branded color scheme** (Aggie Maroon #500000)
- **Shadcn UI components** for consistent, accessible interface
- **Floating action button** for quick post creation
- **User profile management** with editable fields
- **Avatar system** with initials fallback

#### 🛡️ Content Moderation & Security
- **Profanity filtering** using `obscenity` library
- **Character limits** enforced (titles: 5-200, content: 10-5000, comments: 1-1000)
- **Row-Level Security (RLS)** on all database tables
- **Rate limiting** enforced at database level via PostgreSQL triggers
- **Real-time validation** before content submission
- **XSS protection** through framework-level sanitization

#### 🔒 Database Security
- **PostgreSQL Row-Level Security** policies on all tables
- **Automatic post counter resets** via database triggers
- **User-specific data access** controls
- **Admin permission elevation**
- **Secure API routes** with authentication checks

---

## 🚀 Tech Stack

### Frontend
- **Framework**: Next.js 16.1.6 with React 19.2.4
- **Architecture**: App Router, Server Components, Server Actions
- **Language**: TypeScript 5+ (strict mode)
- **Styling**: Tailwind CSS 3.4+ with custom TAMU color scheme
- **UI Library**: Shadcn UI (Radix UI primitives)
- **Icons**: Lucide React
- **Theme**: Dark mode support with `next-themes`

### Backend & Database
- **BaaS**: Supabase (PostgreSQL 15+)
- **Authentication**: Supabase Auth with email verification
- **Storage**: Supabase Storage for image uploads
- **Real-time**: Supabase Realtime subscriptions (ready for future features)
- **Database**: PostgreSQL with Row-Level Security (RLS)

### Developer Tools
- **Form Handling**: React Hook Form with Zod validation
- **Validation**: Zod schemas for type-safe validation
- **Content Moderation**: Obscenity library for profanity filtering
- **Build Tool**: Next.js with Turbopack
- **Package Manager**: npm/yarn
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

## 📋 Prerequisites

- **Node.js** 18+ and npm/yarn
- **Supabase** account (free tier supported)
- **Git** for version control
- **Code editor** (VS Code recommended)

---

## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Howdy-Helps-Capstone
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Set Up Supabase

#### A. Create a Supabase Project
1. Visit [supabase.com](https://supabase.com) and sign in
2. Create a new project
3. Wait for project provisioning to complete
4. Note your **Project URL** and **anon public key**

#### B. Run the Database Schema
1. Open the **Supabase SQL Editor** (Database → SQL Editor)
2. Copy the contents of `supabase-schema.sql`
3. Execute to create all tables, functions, triggers, and RLS policies
4. Verify tables were created in the **Table Editor**

#### C. Set Up Image Storage (Optional but recommended)
Follow the instructions in `IMAGE_UPLOAD_SETUP.md` to:
1. Create the `post-images` storage bucket
2. Configure bucket permissions
3. Set up CORS policies

#### D. Insert Default Channels
Run the SQL script `scripts/insert-channels.sql` to create the default channels:
```sql
-- See scripts/insert-channels.sql for the full SQL
```

### 4. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace the values with your actual Supabase credentials from the project dashboard.

### 5. Run Development Server

```bash
npm run dev
# or
yarn dev
```

The app will be available at **http://localhost:3000**

### 6. Create Your First User

1. Navigate to http://localhost:3000
2. Click **Join the Community**
3. Sign up with a @tamu.edu or @aggienetwork.com email
4. Check your email for verification link
5. Once verified, you'll have full access to the platform

### 7. Testing Image Upload (Optional)

If you set up Supabase Storage:
1. Create a new post from the dashboard
2. Click the image upload area
3. Select up to 5 images (max 5MB each)
4. Images will upload to Supabase Storage automatically

---

## 📁 Project Structure

```
howdy-helps-capstone/
├── 📱 app/                                    # Next.js App Router
│   ├── globals.css                            # Global styles + TAMU branding
│   ├── layout.tsx                             # Root layout
│   ├── page.tsx                               # Landing page
│   │
│   ├── 🔐 auth/
│   │   └── callback/route.ts                  # OAuth callback handler
│   │
│   ├── 🎓 alumni-verification/
│   │   └── page.tsx                           # Former student verification form
│   │
│   ├── 🔑 login/ & signup/
│   │   └── page.tsx                           # Authentication pages
│   │
│   ├── 📊 dashboard/                          # Protected dashboard area
│   │   ├── layout.tsx                         # Dashboard shell with navigation
│   │   ├── page.tsx                           # Main community feed
│   │   ├── channels/[slug]/page.tsx           # Channel-specific feeds
│   │   ├── posts/[id]/page.tsx                # Individual post view
│   │   ├── my-posts/page.tsx                  # User's post history
│   │   ├── post-creation/page.tsx             # Create new post
│   │   └── profile/page.tsx                   # User profile management
│   │
│   └── 🔌 api/                                # API routes
│       ├── posts/[id]/comments/route.ts       # Post comments endpoint
│       ├── comments/route.ts & [id]/route.ts  # Comment CRUD
│       ├── post-likes/route.ts & [id]/route.ts  # Post likes
│       └── comment-likes/route.ts & [id]/route.ts  # Comment likes
│
├── 🎨 components/                             # React components
│   ├── AnnouncementsSidebar.tsx               # Announcements display
│   ├── CommentCard.tsx                        # Comment UI
│   ├── CommentForm.tsx                        # New comment form
│   ├── CommentLikeButton.tsx                  # Like comments
│   ├── CommentCountButton.tsx                 # Comment count display
│   ├── CommentsSection.tsx                    # Full comments thread
│   ├── DashboardShell.tsx                     # Dashboard layout
│   ├── FloatingCreatePostButton.tsx           # FAB for quick post
│   ├── Header.tsx                             # App header
│   ├── ImagePreview.tsx                       # Image upload preview
│   ├── ImageUploadInput.tsx                   # Image upload interface
│   ├── Logo.tsx                               # TAMU-branded logo
│   ├── PostImageDisplay.tsx                   # Single image viewer
│   ├── PostImageGrid.tsx                      # Multi-image grid
│   ├── PostLikeButton.tsx                     # Like posts
│   ├── UserMenu.tsx                           # User dropdown menu
│   ├── UserProfile.tsx                        # Profile editor
│   ├── theme-provider.tsx                     # Dark mode provider
│   └── ui/                                    # Shadcn UI components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── textarea.tsx
│       └── toast.tsx
│
├── 📚 lib/                                    # Shared utilities
│   ├── profanity-filter.ts                   # Content moderation
│   ├── types.ts                              # TypeScript interfaces
│   ├── utils.ts                              # Helper functions
│   ├── validations.ts                        # Zod schemas
│   ├── hooks/
│   │   ├── use-dark-mode.ts                  # Dark mode hook
│   │   └── useImageUpload.ts                 # Image upload logic
│   └── supabase/
│       ├── client.ts                         # Client-side Supabase
│       ├── middleware.ts                     # Auth middleware
│       └── server.ts                         # Server-side Supabase
│
├── 🗄️ scripts/                               # Database management
│   ├── supabase-schema.sql                   # Full database schema
│   ├── setup-image-upload.sql                # Image upload setup
│   ├── verify-supabase.ts                    # Supabase connection test
│   └── [various RLS & migration scripts]
│
├── 📖 Documentation/
│   ├── README.md                             # This file
│   ├── DEPLOYMENT.md                         # Vercel deployment guide
│   ├── GOOGLE_OAUTH_SETUP.md                 # OAuth configuration
│   ├── IMAGE_UPLOAD_SETUP.md                 # Image upload guide
│   ├── SUPABASE_SETUP.md                     # Database setup
│   ├── USERPROFILE_README.md                 # Profile feature docs
│   ├── POST_CREATION_FIX.md                  # Troubleshooting
│   └── TROUBLESHOOTING.md                    # Common issues
│
├── ⚙️ Configuration/
│   ├── next.config.js                        # Next.js config
│   ├── tailwind.config.js                    # Tailwind + TAMU colors
│   ├── tsconfig.json                         # TypeScript config
│   ├── postcss.config.js                     # PostCSS config
│   ├── middleware.ts                         # Auth middleware
│   └── package.json                          # Dependencies
│
└── 🎨 public/
    └── images/logos/                         # Static assets
```

---

## 🔐 Authentication & User Flow

### TAMU Email Users (Auto-Verification)
1. **Sign up** with @tamu.edu or @aggienetwork.com email
2. **Email verification** link sent by Supabase
3. Click verification link to activate account
4. **Auto-verified** - immediate platform access
5. **Optional**: Enable MFA for sensitive channels (Football Tickets)

### Alumni Without TAMU Email
1. Navigate to **Former Student Verification** page
2. Complete the **Alumni Questionnaire**:
   - Full name
   - Graduation year (1876 - current year + 10)
   - Major/degree program
   - Memorable TAMU tradition (min 20 chars)
   - Connection to TAMU (min 20 chars)
3. **Admin reviews** submission manually
4. **Email notification** sent with decision
5. Upon **approval**, user gains full access

### Multi-Factor Authentication (MFA)
- **TOTP-based** 2FA via Supabase Auth
- **Required** for Football Tickets channel
- **Optional** for other channels
- Configured through user profile settings

---

## 🎨 TAMU Branding & Design

### Color Palette
The platform uses official Texas A&M colors:

```css
/* Primary Brand Color */
--aggie-maroon: #500000;

/* Text & UI Colors */
--gray-dark: #3C3C3C;      /* Secondary text */
--gray-light: #f6f6f6;     /* Background (light mode) */
--background: #ffffff;      /* Card backgrounds */

/* Dark Mode Support */
/* Automatically adjusts based on system preference */
```

### Design Principles
- **Mobile-first** responsive design
- **Accessible** UI components (WCAG 2.1 AA compliant)
- **Consistent** TAMU branding throughout
- **Dark mode** support with system preference detection
- **Fast loading** with Next.js optimization

---

## 🔒 Security & Privacy Features

### Row-Level Security (RLS)
All database tables enforce PostgreSQL RLS policies:
- ✅ Users can **only access/modify their own data**
- ✅ Admins have **elevated permissions** for moderation
- ✅ **Read-only** access to public data (posts, comments)
- ✅ **Soft delete** patterns for data retention
- ✅ **Audit trails** via timestamps

### Multi-Factor Authentication
- **TOTP-based** 2FA using Supabase Auth
- **Step-up authentication** for sensitive channels
- **Required** for Football Tickets channel access
- **QR code** enrollment via authenticator apps

### Content Moderation
- **Real-time profanity filtering** using `obscenity` library
- **Character limits** enforced on all content
- **Input sanitization** to prevent XSS attacks
- **Rate limiting** to prevent spam
- **Admin review** queue for flagged content

### Data Protection
- **Environment variables** for sensitive credentials
- **Server-side** authentication checks on all API routes
- **HTTPS** enforced in production
- **Supabase encryption** at rest and in transit
- **Regular security audits** via dependency scanning

---

## 📊 Database Schema Overview

### Core Tables
- **profiles**: User information and settings
- **verification_requests**: Alumni verification submissions
- **channels**: Discussion categories
- **posts**: User-created content
- **post_images**: Image attachments for posts
- **comments**: Nested discussions on posts
- **post_likes**: Like tracking for posts
- **comment_likes**: Like tracking for comments
- **post_tracking**: Rate limiting counters per user

### Key Features
- **UUID primary keys** for all tables
- **Foreign key constraints** for referential integrity
- **Timestamps** on all records (created_at, updated_at)
- **Cascade deletes** for related data
- **Database triggers** for automatic counter resets
- **Indexes** on frequently queried columns

See `supabase-schema.sql` for the complete schema definition.

---

## 📱 Key Components & Features

### Post Creation & Display
- **Rich text editor** with image upload
- **Multi-image support** (up to 5 images per post)
- **Channel selection** with user-friendly dropdown
- **Real-time profanity filtering**
- **Character count** with validation
- **Floating action button** for quick access

### Image Upload System
Implemented with `useImageUpload` custom hook:
- **Drag-and-drop** interface
- **File validation** (type, size, quantity)
- **Preview** before upload
- **Progress indicators** during upload
- **Supabase Storage** integration
- **Lightbox viewer** for full-size images

### Interactive Engagement
- **Like/Unlike** posts and comments
- **Optimistic UI updates** for instant feedback
- **Comment threads** with nested replies
- **Comment count** badges with click-through
- **Real-time updates** (ready for Supabase Realtime integration)

### User Profile Management
- **Edit profile information** (name, graduation year, major, bio)
- **Avatar display** with initials fallback
- **Role badges** with color coding
- **Post history** view (My Posts page)
- **Account settings** management

### Responsive Navigation
- **Dashboard layout** with channel sidebar
- **Mobile-optimized** navigation menu
- **User dropdown** menu with quick actions
- **Channel-based** content filtering
- **Announcements sidebar** for admin updates

---

## 🚀 Deployment

### Deploying to Vercel (Recommended)

The platform is optimized for **Vercel** deployment with Next.js.

#### Quick Deploy Steps:
1. Push code to GitHub repository
2. Connect repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy automatically on push to main branch

For detailed deployment instructions, see **DEPLOYMENT.md**.

#### Required Environment Variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### Post-Deployment Checklist:
- [ ] Update Supabase Auth redirect URLs
- [ ] Configure custom domain (optional)
- [ ] Test authentication flow
- [ ] Verify image upload functionality
- [ ] Check RLS policies are active
- [ ] Test on mobile devices

---

## 🎯 Future Enhancements & Roadmap

### Planned Features (Prioritized)

#### High Priority
- [ ] **Real-time notifications** using Supabase Realtime
- [ ] **Email notifications** for mentions and replies
- [ ] **Search functionality** across posts and comments
- [ ] **Advanced filtering** (by date, channel, author, likes)
- [ ] **User reputation system** (Aggie Points)
- [ ] **Report/flag** content for moderation
- [ ] **Admin dashboard** for moderation queue

#### Medium Priority
- [ ] **Direct messaging** between verified users
- [ ] **Event calendar** for Aggie events
- [ ] **Fundraising progress** bars for ring campaigns
- [ ] **Saved posts** / bookmarks feature
- [ ] **Share** buttons for social media
- [ ] **User mentions** (@username)
- [ ] **Hashtag support** for organization

#### Low Priority
- [ ] **Mobile app** (React Native or Flutter)
- [ ] **Push notifications** on mobile
- [ ] **Analytics dashboard** for admins
- [ ] **API rate limiting** at application level
- [ ] **Content export** (download your data)
- [ ] **Third-party integrations** (Slack, Discord)
- [ ] **Gamification** elements (badges, achievements)

### Technical Improvements
- [ ] **Image moderation** via Sightengine API
- [ ] **CDN integration** for faster image loading
- [ ] **Caching strategy** with Redis or Upstash
- [ ] **Performance monitoring** with Vercel Analytics
- [ ] **Error tracking** with Sentry
- [ ] **Automated testing** (Jest, Playwright)
- [ ] **CI/CD pipeline** with GitHub Actions

---

## 🐛 Known Issues & Limitations

### Current Limitations

1. **pg_cron Dependency**
   - **Issue**: Automatic daily/monthly post counter resets require `pg_cron`
   - **Impact**: Only available on paid Supabase plans
   - **Workaround**: Counters reset manually via triggers when users attempt to post
   - **Status**: Working as intended on free tier

2. **Image Moderation**
   - **Issue**: Automated image content moderation not implemented
   - **Impact**: Relying on community reporting and admin review
   - **Planned**: Integration with Sightengine API
   - **Status**: Manual moderation currently

3. **Real-time Updates**
   - **Issue**: Posts/comments don't update in real-time without page refresh
   - **Impact**: Users need to refresh to see new content
   - **Planned**: Supabase Realtime integration
   - **Status**: Infrastructure ready, feature pending

4. **Search Functionality**
   - **Issue**: No search feature for finding posts/users
   - **Impact**: Users must scroll or filter by channel only
   - **Planned**: PostgreSQL full-text search implementation
   - **Status**: Planned for next release

### Free Tier Considerations

The application is optimized for **Supabase free tier**:
- ✅ **500MB database** storage (sufficient for MVP)
- ✅ **50,000 monthly active users** (exceeds expected usage)
- ✅ **2GB bandwidth** per month
- ✅ **1GB file storage** for images
- ⚠️ **No pg_cron** (falls back to trigger-based resets)

For production deployment with high traffic, consider upgrading to Supabase Pro.

---

## 🧪 Development & Testing

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Verify Supabase connection
npm run verify-supabase

# Check specific user
npm run check-user
```

### Testing Checklist

Before deploying, test these critical features:
- [ ] User signup with TAMU email
- [ ] Alumni verification form submission
- [ ] Login/logout flow
- [ ] Create post with images
- [ ] Like/unlike posts and comments
- [ ] Comment on posts
- [ ] Edit user profile
- [ ] Channel navigation
- [ ] Dark mode switching
- [ ] Mobile responsiveness
- [ ] Rate limiting (try exceeding daily limit)
- [ ] Profanity filter (try posting inappropriate content)

---

## 📚 Additional Documentation

### Reference Guides
- **[DEPLOYMENT.md](DEPLOYMENT.md)**: Complete Vercel deployment guide
- **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)**: Database configuration
- **[IMAGE_UPLOAD_SETUP.md](IMAGE_UPLOAD_SETUP.md)**: Image storage setup
- **[GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md)**: OAuth configuration (optional)
- **[USERPROFILE_README.md](USERPROFILE_README.md)**: User profile feature details
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)**: Common issues and solutions
- **[POST_CREATION_FIX.md](POST_CREATION_FIX.md)**: Post creation debugging

### Database Scripts
Located in `scripts/` directory:
- `supabase-schema.sql`: Full database schema
- `insert-channels.sql`: Create default channels
- `setup-image-upload.sql`: Configure image storage
- `verify-supabase.ts`: Test database connection
- `check-user.ts`: Debug user accounts
- Various RLS policy scripts

---

## 🤝 Contributing

This project is part of a capstone project for Texas A&M University.

### Development Guidelines
1. **Fork** the repository
2. Create a **feature branch** (`git checkout -b feature/amazing-feature`)
3. Make changes with **proper TypeScript types**
4. Write **meaningful commit messages**
5. Test **thoroughly** on multiple devices
6. Submit a **pull request** with detailed description

### Code Style
- **TypeScript** strict mode enabled
- **ESLint** for code consistency
- **Prettier** for formatting (optional)
- **Conventional Commits** for commit messages
- **Component-first** architecture

---

## 📄 License & Legal

This project is for **educational purposes only** as part of a university capstone project.

### Disclaimers
- ⚠️ **Not officially affiliated** with Texas A&M University
- ⚠️ **Student project** - not an official TAMU platform
- ⚠️ **Educational use only** - not for commercial purposes
- ⚠️ **Trademarks**: All TAMU trademarks belong to Texas A&M University

### Credits & Acknowledgments
- **Texas A&M University** for inspiration and community
- **Supabase** for backend infrastructure and excellent documentation
- **Vercel** for Next.js framework and hosting platform
- **Shadcn UI** for accessible component library
- **Radix UI** for primitive UI components
- **The Aggie community** for feedback and support

---

## 📞 Support & Contact

### Getting Help
1. Check **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** for common issues
2. Review **documentation** files in the repository
3. Search **existing issues** on GitHub
4. Create a **new issue** with detailed description

### Project Status
**Status**: Active Development  
**Version**: 0.1.0 (MVP + Enhancements)  
**Last Updated**: February 17, 2026  
**Deployment**: Vercel-ready  
**Database**: Supabase PostgreSQL  

---

## 🎓 About This Project

**Howdy Helps** (Aggies Helping Aggies) is a capstone project developed to create a verified, secure community platform exclusively for the Texas A&M University network. The platform facilitates:

- 💰 **Fundraising** for Aggie Rings and graduation expenses
- 🤝 **Networking** between students, alumni, and affiliates
- 🎟️ **Resource sharing** (tickets, jobs, opportunities)
- 📢 **Community engagement** around shared Aggie values

Built with modern web technologies and enterprise-grade security practices, this platform demonstrates full-stack development capabilities including authentication, authorization, real-time features, file storage, and content moderation.

---

**Gig 'em! 👍**

*Developed with ❤️ for the Aggie community*
