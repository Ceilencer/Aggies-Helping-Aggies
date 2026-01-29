# Aggies Helping Aggies - MVP

A verified community engagement platform exclusively for Texas A&M University affiliates. Built with Next.js 15, Supabase, and TAMU branding.

## 🎓 Features

### Multi-Tier Verification Engine
- **Tier 1**: Automatic verification for @tamu.edu email addresses
- **Tier 2**: Former Student Questionnaire for alumni without TAMU emails
- **Tier 3**: Optional Two-Factor Authentication (TOTP) via Supabase Auth

### Role-Based Access Control
- **Personal**: Standard community members (2 posts/day, 60/month)
- **Charity**: Nonprofit organizations (1 post/day, 30/month)
- **Business**: Local businesses (1 post/month)
- **Admin**: Platform administrators (unlimited posting)

### Channel System
- 💬 **General Discussion**: Community discussions
- 💼 **Job Opportunities**: Career postings
- 🎟️ **Football Tickets**: Ticket trading (requires MFA)
- 📢 **Promotions & Events**: Business promotions
- 📌 **Announcements**: Read-only admin announcements
- 💍 **Aggie Ring Fundraising**: Support fellow Aggies

### Content Moderation
- Deterministic profanity filtering using `obscenity` library
- Real-time validation before post submission
- Admin moderation capabilities
- Stubbed image moderation endpoint

### Post Rate Limiting
- Database-enforced limits via PostgreSQL triggers
- Daily and monthly counters with automatic resets
- Role-based limit configuration

## 🚀 Tech Stack

- **Framework**: Next.js 15 (App Router, Server Components, Server Actions)
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Styling**: Tailwind CSS with TAMU branding (Aggie Maroon #500000)
- **UI Components**: Shadcn UI (accessible, mobile-first)
- **Validation**: Zod for schema validation
- **Content Moderation**: Obscenity library for profanity filtering
- **Language**: TypeScript for type safety

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account (free tier works)
- Git

## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd aggies-helping-aggies
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Set Up Supabase

#### Create a Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

#### Run the Database Schema
1. Open the Supabase SQL Editor
2. Copy the contents of `supabase-schema.sql`
3. Execute the SQL to create all tables, functions, triggers, and RLS policies

#### Enable Required Extensions
In the Supabase SQL Editor, run:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- pg_cron is available on paid plans for automatic counter resets
```

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Run the Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
aggies-helping-aggies/
├── app/
│   ├── dashboard/          # Protected dashboard routes
│   │   ├── page.tsx        # Main community feed
│   │   ├── create-post/    # Post creation
│   │   ├── layout.tsx      # Dashboard layout with nav
│   │   └── ...
│   ├── login/              # Login page
│   ├── signup/             # Signup with TAMU email
│   ├── alumni-verification/ # Former student verification
│   ├── globals.css         # Global styles with TAMU branding
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Landing page
├── components/
│   └── ui/                 # Shadcn UI components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       └── ...
├── lib/
│   ├── supabase/          # Supabase client utilities
│   │   ├── client.ts      # Client-side Supabase
│   │   └── server.ts      # Server-side Supabase
│   ├── profanity-filter.ts # Content moderation
│   ├── types.ts           # TypeScript types
│   ├── utils.ts           # Utility functions
│   └── validations.ts     # Zod schemas
├── middleware.ts          # Auth middleware
├── supabase-schema.sql    # Database schema
└── ...
```

## 🔐 Authentication Flow

### TAMU Email Users
1. Sign up with @tamu.edu or @aggienetwork.com email
2. Email verification (handled by Supabase)
3. Auto-verified and can immediately access platform
4. Optional: Enable MFA for sensitive channels

### Alumni Without TAMU Email
1. Submit Former Student Questionnaire
2. Admin reviews responses
3. Manual approval/rejection
4. Email notification upon decision
5. Access granted after approval

## 🎨 TAMU Branding

The platform uses official Texas A&M colors:
- **Aggie Maroon**: #500000 (primary brand color)
- **Gray**: #3C3C3C (secondary text)
- **Background**: #f6f6f6 (Gray 100)

All UI components are styled with these colors for brand consistency.

## 🔒 Security Features

### Row-Level Security (RLS)
- All database tables have RLS enabled
- Users can only access/modify their own data
- Admins have elevated permissions

### Multi-Factor Authentication
- TOTP-based 2FA via Supabase
- Required for sensitive channels (Football Tickets)
- Step-up authentication pattern

### Content Moderation
- Real-time profanity filtering
- Character limits enforced (title: 5-200, content: 10-5000)
- Post rate limiting via database triggers

## 📊 Post Rate Limits

Enforced at the database level via PostgreSQL triggers:

| Role     | Daily Limit | Monthly Limit |
|----------|-------------|---------------|
| Personal | 2 posts     | 60 posts      |
| Charity  | 1 post      | 30 posts      |
| Business | N/A         | 1 post        |
| Admin    | Unlimited   | Unlimited     |

## 🎯 Future Enhancements

### Planned Features
- [ ] Image upload with Supabase Storage
- [ ] Image moderation via Sightengine API
- [ ] Real-time chat with Supabase Realtime
- [ ] Push notifications
- [ ] Advanced search and filtering
- [ ] User reputation system
- [ ] Email notifications for comments/mentions
- [ ] Mobile app (React Native)

### Optimization for Free Tier
The current implementation is optimized for Supabase's free tier:
- 500MB database storage
- 50,000 monthly active users
- 2GB bandwidth
- No pg_cron (manual counter resets required)

## 🐛 Known Issues & Limitations

1. **pg_cron**: The automatic daily/monthly post counter resets require `pg_cron`, which is only available on paid Supabase plans. On the free tier, counters reset manually via the triggers when a user tries to post.

2. **Image Upload**: Currently stubbed out. Implementation requires Supabase Storage setup and client-side upload logic.

3. **Email Notifications**: Not yet implemented. Would require Supabase Edge Functions or third-party email service.

## 🤝 Contributing

This is an MVP. Contributions are welcome! Please follow these guidelines:
1. Fork the repository
2. Create a feature branch
3. Make your changes with proper TypeScript types
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is for educational purposes. Not officially affiliated with Texas A&M University.

## 🙏 Acknowledgments

- Texas A&M University for the inspiration
- Supabase for the backend infrastructure
- Shadcn UI for the component library
- The Aggie community for feedback and support

---

**Gig 'em! 👍**
