# Howdy Helps — Product Roadmap & Todo List

---

## Priority 1 — Core Features

### 1. Channel Restructure
- [x] Remove the Aggie Ring channel
- [x] Add a Housing / Roommates channel

---

### 2. Aggie Ring Sponsorship Feature
**Goal:** Create a dedicated, public-facing home for the nonprofit's ring sponsorship program, including a digital application for sponsorship candidates.

#### 2a. Public-Facing Ring Page & Sponsored Student Showcase
- [ ] Build a static Ring page explaining the program with links to Zeffy application forms
- [ ] Add a public-facing sponsorship sidebar visible to all users, including non-logged-in visitors
- [ ] Each sponsored student card displays: name, photo, goal amount, and admin-managed progress bar
- [ ] Clicking a sponsored student card opens a modal with their full story
- [ ] Cap active sponsored students at 2–3 at a time
- [ ] Build a dedicated admin management page to add, edit, and remove sponsored students
- [ ] Build an archive page of past recipients to showcase nonprofit impact over time

#### 2b. Ring Sponsorship Application (Digital Questionnaire)
**Goal:** Digitize the Aggies Helping Aggies Ring Program application questionnaire. Applicants must be existing Howdy Helps users (platform login is an extra guarantee of student identity).

**Application collects (25 questions from the official form):**
- Personal info: full legal name, address, email, student ID, phone, Ring Office invoice number
- Family member contact info (name, address, email, phone) — acknowledged as not confidential
- Financial info: monthly income, dependents, household income if dependent
- Community & university involvement, court-ordered payments, monthly obligations
- Employment history during student career
- Ring Day cycle, graduation date, degree/major
- Social media consent paragraph (photo + story for Facebook/website)
- Essay: why they should be helped (used in public fundraising posts)

**Sensitive document handling — PENDING TEAM DECISION:**
- Tax returns, bank statements, and ID photos are required by the application but must NOT be stored on platform infrastructure due to security liability (identity theft risk, breach notification laws, nonprofit reputation risk)
- **Recommended approach: Google Drive upload via per-applicant folder**
  - Platform generates a restricted Google Drive upload link per applicant pointing to a board-controlled Shared Drive folder named `LastName.FirstName Ring Cycle YYYY`
  - Documents never touch Supabase storage
  - Board reviews documents directly in Drive
- **Prerequisite: Apply for Google Workspace for Nonprofits (free for 501c3)**
  - AHA qualifies as a registered 501(c)3
  - Apply at google.com/nonprofits — requires TechSoup verification (takes days to weeks)
  - Unlocks: custom domain email (`cindy@aggieshelpingaggies.org`), Shared Drive, Drive API access, admin audit controls
  - Currently domain is owned and Squarespace is forwarding `support@aggieshelpingaggies.org` to Gmail — Workspace would replace this properly
  - Consider creating board member emails (e.g. `board@aggieshelpingaggies.org`) at the same time

**Platform tasks (can be built before Google Workspace is approved):**
- [ ] Design application DB schema: `ring_applications` table (questionnaire answers, status, user_id, timestamps)
- [ ] Build multi-step application form (questionnaire only — documents handled separately)
- [ ] Applicants must be logged-in Howdy Helps users to apply
- [ ] Admin dashboard to review submitted questionnaires and manage application status
- [ ] Admin notifications when a new application is submitted
- [ ] Application status visible to applicant (submitted, under review, approved, rejected)
- [ ] Enforce one active application per user per Ring cycle

**Platform tasks (requires Google Workspace approval first):**
- [ ] Set up Google Workspace for Nonprofits and Shared Drive for ring documents
- [ ] Integrate Google Drive API: auto-create per-applicant folder on submission
- [ ] Generate restricted upload link shown to applicant after questionnaire submission
- [ ] Notify board via email when documents are uploaded to Drive

---

### 3. Comment System & Notifications
**Goal:** Deepen on-platform engagement by improving comment threading and closing notification gaps.

- [x] Increase comment nesting depth — 2 levels of nesting, flattens after that
- [x] Send a notification to a post author when someone comments on their post
- [x] Send a notification to a commenter when someone replies to their comment

---

### 4. Flair Implementation
**Goal:** Give users a visible community identity tied to their affiliation with Texas A&M.

- [ ] Display flairs on posts, comments, and profile pages
- [ ] Give each flair type its own distinct color and styling
- [ ] Gate Student and Faculty flairs behind `@tamu.edu` email verification
- [ ] Make all other flairs (Former Student, Family Member, Aggie Mom, BCS Local) self-selectable
- [ ] Prompt users to complete profile setup, including flair selection, after signup

**Open questions:**
- Hard redirect to profile setup vs. soft dismissable prompt?
- Can flair be changed after initial selection?
- Is having no flair a valid option?
- What is the color scheme per flair type?

---

## Priority 2 — Growth & Presentation

### 5. Landing Page Redesign
**Goal:** Clearly communicate who Howdy Helps is, what it does, and what role the nonprofit plays.

- [ ] Redesign to lead with the nonprofit mission and ring sponsorship program
- [ ] Reflect the student-focused community purpose
- [ ] Feature sponsored students prominently for non-logged-in visitors

**Note:** Full content, copy, and visual scope to be defined in a separate session.

---

## Priority 3 — Future Features

### 6. Email Notification System
**Goal:** Drive user acquisition and retention by alerting subscribers to relevant new posts.

- [ ] Implement automatic post categorization via an LLM API
- [ ] Integrate Resend as the email provider
- [ ] Build per-category email subscription controls for users
- [ ] Build admin-initiated site-wide email broadcast capability

**Note:** Full scope, category list, and LLM provider to be defined in a separate session.

---

### 8. OpenAI Moderation API
**Goal:** Add an AI-based content moderation layer on top of the existing `obscenity` filter.

- [ ] Add `OPENAI_API_KEY` to `.env.local` and Vercel environment variables
- [ ] Integrate `openai` npm package
- [ ] Call `omni-moderation-latest` in the comment POST route before saving to DB
- [ ] Call it in the post creation route as well
- [ ] Decide on behavior: block the request or flag for admin review

**Notes:** The OpenAI Moderation API is free (no token cost). Adds ~300–500ms latency per submission. Catches context-aware hate speech and coded language that regex-based filters miss.

---

### 7. Native Mobile App
**Goal:** Expand platform reach to iOS and Android.

- [ ] Evaluate a Progressive Web App (PWA) as an intermediate step to unlock push notifications sooner
- [ ] Build iOS and Android native apps (React Native preferred given existing web stack)

**Note:** Long-term milestone. PWA should be considered as a near-term bridge.

---

*Last updated: 2026-03-31*
