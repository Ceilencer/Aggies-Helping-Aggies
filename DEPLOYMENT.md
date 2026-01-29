# Deployment Guide for Aggies Helping Aggies

This guide covers deploying the Aggies Helping Aggies platform to production.

## 🚀 Quick Deploy to Vercel

### Prerequisites
- GitHub account
- Vercel account (free tier works)
- Supabase project set up with schema

### Steps

1. **Push Code to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables**
   In Vercel project settings, add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy automatically
   - You'll get a production URL (e.g., `your-app.vercel.app`)

## 🔧 Post-Deployment Configuration

### 1. Update Supabase Auth Settings

In your Supabase project dashboard:
1. Go to Authentication → URL Configuration
2. Add your Vercel URL to Site URL: `https://your-app.vercel.app`
3. Add redirect URLs:
   - `https://your-app.vercel.app/**`
   - `http://localhost:3000/**` (for development)

### 2. Create Admin Account

After deployment, create your first admin account:

```sql
-- In Supabase SQL Editor
-- First, sign up normally through the UI, then run:
UPDATE profiles
SET role = 'Admin'
WHERE email = 'your-admin-email@tamu.edu';
```

### 3. Test Core Features
- [ ] User signup with TAMU email
- [ ] Alumni verification submission
- [ ] Login/logout
- [ ] Create post (check rate limiting)
- [ ] Content moderation (try posting profanity)
- [ ] Channel navigation
- [ ] MFA enrollment (for sensitive channels)

## 📊 Monitoring & Maintenance

### Supabase Dashboard
Monitor in Supabase:
- Database usage (500MB free tier limit)
- Active users
- Storage usage
- API requests

### Vercel Analytics
Enable in Vercel dashboard for:
- Page load times
- Geographic distribution
- Core Web Vitals

### Regular Maintenance Tasks

**Weekly:**
- Review verification requests (admin panel)
- Monitor post volume and rate limits
- Check for spam or inappropriate content

**Monthly:**
- Review database size
- Analyze user growth
- Update post limit policies if needed

## 🔐 Security Best Practices

### Environment Variables
- Never commit `.env.local` to Git
- Use different Supabase projects for dev/staging/prod
- Rotate anon keys if they're exposed

### Database Security
- Keep RLS policies enabled
- Regularly backup database
- Monitor for unusual activity

### Content Moderation
- Review flagged posts regularly
- Update profanity filter as needed
- Engage with community for feedback

## 📈 Scaling Considerations

### Free Tier Limits (Supabase)
- 500MB database
- 50,000 MAU
- 2GB bandwidth
- No pg_cron

### When to Upgrade
Consider upgrading when:
- Database exceeds 400MB (80% capacity)
- Monthly active users exceed 40,000
- Need automatic counter resets (pg_cron)
- Require more than 2GB bandwidth

### Optimization Tips
- Use Supabase Edge Functions for heavy operations
- Implement pagination for post feeds
- Archive old posts to reduce database size
- Use CDN for images (when implemented)

## 🆘 Troubleshooting

### Common Issues

**"User not found" error after signup**
- Check RLS policies are enabled
- Verify profile was created in profiles table
- Check middleware.ts is working

**Rate limit not working**
- Ensure triggers are properly installed
- Check post_tracking table exists
- Verify user has tracking record

**MFA not enforcing for tickets channel**
- Check channel `requires_mfa` is TRUE
- Verify trigger `check_mfa_before_post` exists
- Ensure profile has correct `mfa_enabled` value

**Posts not appearing**
- Check RLS policies allow SELECT
- Verify user is verified (`is_verified = TRUE`)
- Check post wasn't moderated

### Getting Help
1. Check Supabase logs for errors
2. Review Vercel deployment logs
3. Use browser DevTools console
4. Check this README and inline comments

## 🔄 Continuous Deployment

Every push to `main` branch automatically deploys to Vercel:
1. Push changes to GitHub
2. Vercel detects changes
3. Builds and deploys automatically
4. New version goes live in ~2 minutes

### Branch Deployments
Create preview deployments for testing:
```bash
git checkout -b feature/new-feature
git push origin feature/new-feature
```
Vercel creates a preview URL for each branch.

## 📝 Custom Domain (Optional)

### Add Custom Domain in Vercel
1. Go to project settings → Domains
2. Add your domain (e.g., `aggieshelpingaggies.com`)
3. Follow DNS configuration instructions
4. Update Supabase auth URLs to use custom domain

## 🎯 Production Checklist

Before going live:
- [ ] All environment variables set in Vercel
- [ ] Database schema deployed to production Supabase
- [ ] RLS policies verified and tested
- [ ] Admin account created
- [ ] Test all user flows (signup, login, post creation)
- [ ] Content moderation tested
- [ ] Rate limiting tested
- [ ] MFA flow tested
- [ ] Custom domain configured (if applicable)
- [ ] Monitoring enabled
- [ ] Backup strategy in place

## 🎉 Launch

Once everything is tested and working:
1. Announce to target audience (TAMU community)
2. Monitor closely for first 48 hours
3. Be responsive to user feedback
4. Iterate and improve based on usage

---

**Good luck with your deployment! Gig 'em! 👍**
