# Ring Program — Google Apps Script

Two scripts that stand up the Google side of the Ring Program application
(see `../RING_PROGRAM_GOOGLE_WORKSPACE_DESIGN.md`):

1. **`BuildForm.gs`** — creates the application Google Form from the requirements
   doc (identity, family, financial, involvement, ring/graduation, story +
   consent, signature) in one run.
2. **`OnSubmitOrganize.gs`** — an `onFormSubmit` trigger that, for each
   submission, creates a per-applicant subfolder in the **Ring Submissions**
   Shared Drive, moves + renames the uploaded documents, and writes the
   questionnaire answers into the folder as a PDF.

> **Known Google limitation:** Apps Script (`FormApp`) **cannot create
> file-upload questions**. `BuildForm.gs` builds everything else and adds a
> "Required Documents" section; you add the 4 upload questions **by hand** in the
> Form editor (exact titles below). `OnSubmitOrganize.gs` then finds them by
> title, so the titles must match.

---

## Setup order

### 1. Build the Form
1. Go to <https://script.google.com> → **New project** (sign in as an
   `@aggieshelpingaggies` account).
2. Paste **`BuildForm.gs`**, run `buildRingProgramForm()`, and authorize.
3. The execution log prints the **Form edit URL** and **Form ID** — open the edit
   URL.

### 2. Add the 4 file-upload questions (manual)
In the Form editor, under the **"Required Documents"** section, add four
**File upload** questions with these **exact titles** (help text suggested):

| Title (must match exactly) | Settings |
|---|---|
| `Photo IDs` | Allow specific types: image + PDF; up to 3 files. Help: "Driver's license/passport **and** TAMU student ID. **Redact all ID numbers.**" |
| `Federal Tax Return` | PDF; 1 file. Help: "Most recent year. **Redact your SSN.**" |
| `Bank Statements` | PDF; up to 3 files. Help: "Last 3 consecutive months, your name as account holder. **Redact account numbers.**" |

(Optional 4th ID doc for former students can go in `Photo IDs` as an extra file.)

File-upload questions require the respondent to be **signed into a Google
account** — expected and fine.

### 3. Wire up the organizer script
1. In the Form editor: **⋮ → Script editor** (creates a script *bound* to the Form).
   - If you instead keep this in the **same standalone project** as `BuildForm.gs`,
     that's fine — just also set `CONFIG.FORM_ID` (next step). A standalone project
     has no "active form," which is why `installTrigger()` otherwise fails with
     *"Unexpected error … ScriptApp.FormTriggerBuilder … create"*.
2. Paste **`OnSubmitOrganize.gs`**.
3. Set `CONFIG.SUBMISSIONS_FOLDER_ID` to the **Ring Submissions** folder ID (from
   its Drive URL: `drive.google.com/drive/folders/<THIS_ID>`), and — if standalone —
   `CONFIG.FORM_ID` (from the Form edit URL: `docs.google.com/forms/d/<THIS_ID>/edit`).
4. Run `installTrigger()` once and authorize. This installs the on-submit trigger.
5. (Optional) set `CONFIG.NOTIFY_GROUP_EMAIL` to `ring-committee@aggieshelpingaggies.org`.

### 4. Test
Submit a test response with dummy files. Confirm a
`LastName.FirstName Ring Cycle <year>/` subfolder appears in **Ring Submissions**
containing the renamed documents + `... Questionnaire.pdf`. Then delete the test
folder.

---

## Notes
- Folder/file naming follows the requirements doc: `LastName.FirstName Ring Cycle
  202x <DocType>`.
- The script relies on separate **`Legal First Name`** / **`Legal Last Name`**
  questions (rather than one "Full Legal Name") so filing is deterministic.
- The Form is **not** restricted to the org (`setRequireLogin` is off) so
  `tamu.edu` and former students can apply; email is still collected + verified.
- Keep these scripts and the Form owned within the Workspace/Shared Drive so
  ownership isn't orphaned when an individual leaves.
