# Howdy Helps — Product Roadmap & Todo List

---

## Priority 1 — Core Features

### 1. Channel Restructure
- [ ] Remove the Aggie Ring channel
- [ ] Add a Housing / Roommates channel

---

### 2. Aggie Ring Sponsorship Feature
**Goal:** Create a dedicated, public-facing home for the nonprofit's ring sponsorship program.

- [ ] Build a static Ring page explaining the program with links to Zeffy application forms
- [ ] Add a public-facing sponsorship sidebar visible to all users, including non-logged-in visitors
- [ ] Each sponsored student card displays: name, photo, goal amount, and admin-managed progress bar
- [ ] Clicking a sponsored student card opens a modal with their full story
- [ ] Cap active sponsored students at 2–3 at a time
- [ ] Build a dedicated admin management page to add, edit, and remove sponsored students
- [ ] Build an archive page of past recipients to showcase nonprofit impact over time

---

### 3. Comment System & Notifications
**Goal:** Deepen on-platform engagement by improving comment threading and closing notification gaps.

- [ ] Increase comment nesting depth from 1 level to 3 levels
- [ ] Send a notification to a post author when someone comments on their post
- [ ] Send a notification to a commenter when someone replies to their comment

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

### 7. Native Mobile App
**Goal:** Expand platform reach to iOS and Android.

- [ ] Evaluate a Progressive Web App (PWA) as an intermediate step to unlock push notifications sooner
- [ ] Build iOS and Android native apps (React Native preferred given existing web stack)

**Note:** Long-term milestone. PWA should be considered as a near-term bridge.

---

*Last updated: 2026-03-21*
