# Aggie Ring Program — Google Workspace Application: Design & Requirements

**Status:** Draft for review — no code yet.
**Source of truth for requirements:** `3_22_26 Final AGGIE RING application.docx` (AHA Aggie Ring Program, rev. March 2025).

---

## 1. Goal & guiding principle

Let applicants submit the Ring Program application — including **highly sensitive
documents** (federal tax returns, bank statements, photo IDs) — in a way where
**Google Workspace (owned by the nonprofit) is the system of record for all
sensitive data**, and the app (Vercel + Supabase) never stores, proxies, or logs
that data.

**Guiding principle: sensitive PII stays in Google.** The app's job is to route
applicants to the right place, keep lightweight non-sensitive status, and give
admins a link in. Every design choice below favors *less* sensitive data on our
own infrastructure.

---

## 2. What the requirements doc actually asks for

**Questionnaire:** 25 questions (identity, contact, invoice #, family contact,
income/dependents, obligations, community & university involvement, employment,
graduation/degree, a social-media consent story, etc.).

**Sensitive documents (currently emailed as PDFs):**
- Two photo IDs — driver's license/passport + TAMU student ID (redact ID numbers)
- Most recent **federal tax return** (redact SSN)
- **Last 3 months of bank statements** (redact account number)

**Naming convention:** `LastName.FirstName Ring Cycle 202x <DocType>`

**Cycles:** Current Students / Current Students–Upcoming Graduates / Former
Students (applicant must self-select the correct schedule).

Today these are emailed to `AggiesHelpingAggiesRings@gmail.com`. Moving to a
Workspace-owned Form is a direct security upgrade over shared inbox + attachments.

---

## 3. Current state in the codebase (important — this is not greenfield)

A ring-sponsorship feature already exists:

- `app/api/ring-sponsorship/route.ts` — applicant submit + status read
- `app/api/admin/ring-sponsorship/` — admin list + decision endpoints
- `app/dashboard/admin/ring-sponsorship/` — admin review UI
- Supabase table **`ring_sponsorship_applications`**
- `notifyNewRingApplication` email + `useAdminPendingCount` realtime badge

**What it stores in Supabase today (all in one table):**
identity (full_name, email, phone, full address), **UIN/student ID**,
invoice_number, ring details, **family contact info**, and **financial fields** —
`monthly_income`, `dependents_count`, `household_income`,
`court_ordered_payments`, `monthly_obligations` — plus involvement, employment
history, the consent story, and `social_media_consent`.

It does **not** handle the sensitive *file* uploads (tax returns, bank
statements, IDs) at all.

> **Key tension:** the stated goal is "let Google store the sensitive data," but
> the existing flow already puts financial answers + UIN + family PII in
> Supabase. Any real design has to decide what happens to that. See §7.

---

## 4. Proposed architecture (recommended: "thin link-out + Apps Script")

```
Applicant (signed into app)
   │  1. clicks "Apply for the Ring Program"
   ▼
App dashboard  ──2. builds a PREFILLED Google Form URL (name/email/invoice #)──►  Google Form
                                                                                   (owned by the
                                                                                    nonprofit Workspace)
   ▲                                                                                    │
   │                                                                                    │ 3. applicant fills
   │                                                                                    │    questionnaire +
   │                                                                                    │    uploads 4 sensitive docs
   │                                                                                    ▼
   │                                                                          Form responses → Google Sheet
   │                                                                          File uploads   → Drive (form's folder)
   │                                                                                    │
   │                                                                                    │ 4. on-submit Apps Script trigger
   │                                                                                    ▼
   │                                                                     "Ring Submissions" (Shared Drive)
   │                                                                        └── LastName.FirstName Ring Cycle 202x/
   │                                                                              ├── questionnaire.pdf (answers)
   │                                                                              ├── IDs.*
   │                                                                              ├── Federal Tax Return.*
   │                                                                              └── Bank Statements.*
   │                                                                                    │
   └────5. app shows "Submitted / Under review" status (non-sensitive) ◄────────────────┘
        Admins review inside Drive; app links them in.
```

### Why this shape
- The **Form is owned by the nonprofit Workspace account**, so Google stores all
  responses and files under the nonprofit's tenant, with Workspace admin
  controls, sharing restrictions, and audit logging.
- **Per-applicant subfolders** (the "submissions folder → one subfolder per
  applicant" goal) are created by a **Google Apps Script `onFormSubmit`
  trigger** — a plain Form dumps every upload into one flat folder, so this
  automation is required to get the structure you described.
- The app holds **only non-sensitive status** (applied / under review / selected
  / funded) and a link. No document ever touches Vercel or Supabase.

---

## 5. Integration depth — the decision to make during planning

### Option A — Thin link-out (recommended)
- App generates a **prefilled Form link** for the signed-in user and records a
  minimal status row.
- Apps Script (inside Google) does subfoldering, renames files to the required
  convention, and writes the questionnaire answers as a PDF into the subfolder.
- Admins review in Drive; the admin dashboard just deep-links to the folder.
- **Pros:** minimal app code; **no Google API credentials on our infra**;
  sensitive data never reaches us; fastest; smallest attack surface — most
  aligned with the security goal.
- **Cons:** application status in the app is manual/coarse unless an admin
  updates it; no automated per-applicant reconciliation.

### Option B — Google API integration
- A nonprofit **service account** (Drive/Forms/Sheets APIs, ideally scoped to a
  **Shared Drive**, not domain-wide delegation) lets the app create folders,
  read submission status, and mirror it into the admin dashboard.
- **Pros:** automated status sync; richer admin dashboard; can enforce structure
  from our side.
- **Cons:** introduces **Google service-account credentials** we must store and
  secure (Vercel env), a real integration to build/maintain, and a path by which
  our infra can *read* sensitive Drive content — which cuts against "keep it in
  Google." More surface, more to get wrong.

**Recommendation:** start with **Option A**. It satisfies the security intent
with the least risk. Only add Option B pieces later if admins genuinely need
in-app status automation, and even then keep the service account **read-limited
and Shared-Drive-scoped** (never reading document *contents* into our app).

---

## 6. Per-applicant subfolder — mechanism detail (Apps Script)

Installable `onFormSubmit` trigger on the responses Sheet/Form:

1. Read the new response row (name, email, invoice #, cycle).
2. Compute folder name: `LastName.FirstName Ring Cycle <YYYY>`.
3. `getOrCreate` that subfolder under the **"Ring Submissions"** Shared Drive
   folder.
4. Move the response's uploaded files out of the Form's default upload folder
   into the subfolder, renaming to the doc convention (`… IDs`, `… Federal Tax
   Return`, `… Bank Statements`).
5. Render the questionnaire answers to a PDF (or Doc) and drop it in the subfolder.
6. (Optional) set folder sharing to the **Ring Committee group** only; notify the
   committee.

Notes:
- Requires **file-upload questions**, which force respondents to be **signed into
  a Google account**. `tamu.edu` is Google Workspace ✓; **former students on a
  personal email need any Google account** — confirm this is acceptable or define
  a fallback (see open questions).
- Use a **Shared Drive** (not a personal My Drive folder) so ownership survives
  individuals leaving and access is group-managed.

---

## 7. What happens to the existing Supabase data (must decide)

Three coherent end-states:

1. **Google-only (max security):** the Form captures the full questionnaire +
   files. Retire the sensitive Supabase columns (`monthly_income`,
   `household_income`, `court_ordered_payments`, `monthly_obligations`, UIN,
   family PII). Keep only a tiny `ring_applications` status row
   (`user_id`, `cycle`, `status`, `submitted_at`, `drive_folder_url`).
2. **Split:** keep the current questionnaire in Supabase; add Google **only for
   the sensitive files**. Least rework, but financial PII + UIN keep living in
   Supabase (partially defeats the goal).
3. **Status quo + files:** don't touch the existing flow at all; bolt file
   uploads onto Google. Fastest, weakest privacy posture.

The security goal points at **(1)**. Whichever we pick, the existing admin UI and
`useAdminPendingCount` badge need to be reconciled with the new flow.

---

## 8. Security, privacy & compliance considerations

- **Never** store, log, cache, or proxy tax returns / bank statements / IDs
  through Vercel or Supabase. No document bytes or download URLs in our DB or logs.
- **Redaction reminders** (SSN, license #, account #) must be restated in the
  Form, matching the doc.
- **Access control:** restrict the Ring Submissions Shared Drive to a named
  **Ring Committee Google group**; enforce **2FA** on those Workspace accounts;
  enable **Drive audit logging**.
- **Least privilege:** if Option B is ever added, scope the service account to
  the Shared Drive; avoid domain-wide delegation; never grant content read of
  submissions to the app.
- **Retention & deletion:** define how long documents are kept and a deletion
  procedure (ties into the app's existing `/data-deletion` page and privacy
  policy). Financial documents shouldn't live forever.
- **Consent:** preserve the social-media/story consent language from the doc.
- **Mapping "admins":** decide whether app `Admin` role == Ring Committee, or
  whether the committee is a separate, smaller Workspace group (recommended —
  fewer people should see tax returns than moderate posts).

---

## 9. Open questions (need answers before building)

1. **Which Workspace account/domain** owns the Form + Shared Drive? Is there a
   nonprofit Google Workspace already, or is it the `AggiesHelpingAggiesRings@
   gmail.com` mailbox (a personal Gmail, which is **not** a Workspace and lacks
   Shared Drives / admin audit)? This materially affects the design.
2. **Former students without a Google account** — acceptable to require one for
   file upload, or do we need a fallback path?
3. **Retention period** for sensitive documents, and who runs deletions?
4. **Who is on the Ring Committee** (the only people who should see documents),
   and how does that map to the app's `Admin` role?
5. **Which end-state from §7** (Google-only / split / status-quo+files)?
6. **Integration depth** — confirm Option A (thin) to start, or is in-app status
   automation (Option B) a hard requirement now?
7. **Cycle handling** — do we run one Form with a cycle question, or separate
   Forms per schedule?

---

## 10. Suggested phasing (once decisions are made)

- **Phase 0 — Decisions + Workspace setup:** answer §9; create the nonprofit
  Workspace (if needed), Shared Drive, Ring Committee group, permissions.
- **Phase 1 — Google build (no app code):** build the Form to match the 25
  questions + 4 file uploads; write the Apps Script for per-applicant subfolders,
  file renaming, and questionnaire PDF; restrict sharing.
- **Phase 2 — App integration (thin):** "Apply" entry point that opens the
  prefilled Form; minimal status row; admin dashboard deep-link into Drive.
- **Phase 3 — Reconcile Supabase:** per §7 decision, trim sensitive columns and
  update the existing admin UI / pending-count badge; document retention/deletion.

---

## 11. My recommendation in one line

Go **Google-only (§7 option 1)** with a **Workspace-owned Form + Shared Drive +
Apps Script subfoldering (Option A)**, app limited to a prefilled entry point and
a non-sensitive status row — but first confirm whether a real nonprofit
**Google Workspace** exists (open question #1), because a personal Gmail can't
provide Shared Drives, group access control, or audit logging.
