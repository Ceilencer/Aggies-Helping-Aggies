/**
 * BuildForm.gs — creates the AHA Aggie Ring Program application Form.
 *
 * Run buildRingProgramForm() once from a standalone Apps Script project.
 * It builds every question from the requirements doc EXCEPT the 4 file-upload
 * questions (Apps Script cannot create those). It adds a "Required Documents"
 * section header; add the upload questions manually beneath it (see README).
 *
 * Re-running creates a NEW form each time. Build once, then edit in the UI.
 */

function buildRingProgramForm() {
  const form = FormApp.create('Aggies Helping Aggies — Aggie Ring Program Application');

  form.setDescription(
    'Application for the Aggies Helping Aggies (AHA) Aggie Ring Program. ' +
    'Ring-eligible graduate/undergraduate students and Former Students may apply. ' +
    'You will be asked to upload sensitive documents at the end — please REDACT ' +
    'all Social Security numbers, ID numbers, and bank account numbers before uploading. ' +
    'Only complete applications are reviewed.'
  );

  // Collect (and verify) the respondent's email. Do NOT restrict to the org —
  // applicants use tamu.edu / personal Google accounts.
  form.setCollectEmail(true);
  form.setProgressBar(true);
  form.setAllowResponseEdits(false);

  // ── Section 1: Identity & contact (Q1–Q6) ────────────────────────────────
  form.addSectionHeaderItem()
    .setTitle('1. Applicant Information');

  form.addTextItem().setTitle('Legal First Name').setRequired(true);
  form.addTextItem().setTitle('Legal Last Name').setRequired(true);
  form.addParagraphTextItem().setTitle('Mailing Address').setRequired(true);
  form.addTextItem()
    .setTitle('Texas A&M Student ID (UIN)')
    .setHelpText('9-digit UIN.')
    .setRequired(true);
  form.addTextItem().setTitle('Phone Number').setRequired(true);
  form.addTextItem()
    .setTitle('Ring Office Invoice Number')
    .setHelpText('From the Association of Former Students Ring Office. Leave blank if not yet ordered.')
    .setRequired(false);

  // Ring schedule / cycle (Q19 + the three schedules from the doc).
  form.addMultipleChoiceItem()
    .setTitle('Which Ring schedule applies to you?')
    .setChoiceValues([
      'Current Students',
      'Current Students — Upcoming Graduates',
      'Former Students / Ring Replacements',
    ])
    .setRequired(true);
  form.addTextItem()
    .setTitle('For which Ring Day are you ordering?')
    .setHelpText('e.g. the specific Ring Day date/cycle you are ordering for.')
    .setRequired(false);

  // ── Section 2: Family contact (Q7–Q10) ───────────────────────────────────
  form.addPageBreakItem().setTitle('2. Family Contact');
  form.addSectionHeaderItem()
    .setTitle('Family Contact')
    .setHelpText(
      'Family members may be contacted to verify your identity or in the event of ' +
      'unforeseen circumstances. You acknowledge that information about the named ' +
      'family member will NOT be kept confidential in this application.'
    );
  form.addTextItem().setTitle('Family Member Name').setRequired(true);
  form.addParagraphTextItem().setTitle('Family Member Address').setRequired(false);
  form.addTextItem().setTitle('Family Member Email').setRequired(false);
  form.addTextItem().setTitle('Family Member Phone').setRequired(false);

  // ── Section 3: Financial (Q11–Q13, Q16–Q18) ──────────────────────────────
  form.addPageBreakItem().setTitle('3. Financial Information');
  form.addTextItem().setTitle('Your current monthly income').setRequired(true);
  form.addTextItem().setTitle('Number of dependents you have, if any').setRequired(false);
  form.addParagraphTextItem()
    .setTitle('If you are a dependent of another person')
    .setHelpText(
      'State their monthly income for the current calendar year, list the number of ' +
      'dependents in their household, and provide any information helpful to your situation.'
    )
    .setRequired(false);
  form.addParagraphTextItem()
    .setTitle('Please list any court-ordered payments you make')
    .setRequired(false);
  form.addMultipleChoiceItem()
    .setTitle('Are you current on those listed payments?')
    .setChoiceValues(['Yes', 'No', 'Not applicable'])
    .setRequired(false);
  form.addParagraphTextItem()
    .setTitle('Please list your monthly financial obligations')
    .setRequired(true);

  // ── Section 4: Involvement & employment (Q14, Q15, Q20, Q21) ──────────────
  form.addPageBreakItem().setTitle('4. Involvement & Employment');
  form.addParagraphTextItem()
    .setTitle('What has been your involvement in your community during your time at A&M?')
    .setRequired(true);
  form.addParagraphTextItem()
    .setTitle('What has been your involvement in Texas A&M University service activities and other groups?')
    .setRequired(true);
  form.addParagraphTextItem()
    .setTitle('Have you been employed during your student career? If so, describe it.')
    .setHelpText('What specific jobs, which companies, for how long, and average hours per week?')
    .setRequired(false);
  form.addParagraphTextItem()
    .setTitle('In which academic, athletic, service, social, or other groups have you been involved?')
    .setRequired(false);

  // ── Section 5: Graduation & degree (Q24, Q25) ────────────────────────────
  form.addPageBreakItem().setTitle('5. Graduation & Degree');
  form.addTextItem()
    .setTitle('When are you scheduled to graduate, or what was your graduation date?')
    .setRequired(true);
  form.addParagraphTextItem()
    .setTitle('What degree and major are you seeking (or did you earn)?')
    .setHelpText('Be specific — undergraduate, graduate, or doctoral.')
    .setRequired(true);

  // ── Section 6: Story & consent (Q22, Q23) ────────────────────────────────
  form.addPageBreakItem().setTitle('6. Your Story & Consent');
  form.addParagraphTextItem()
    .setTitle('Tell the AHA community why you should be helped')
    .setHelpText(
      'If chosen, you consent to share your photo and story on Aggies Helping Aggies ' +
      'social media and website. Write a strong, specific paragraph to help members ' +
      'understand your situation and be inclined to donate.'
    )
    .setRequired(true);
  form.addParagraphTextItem()
    .setTitle('How can you assist other Aggies with time, talent, or treasure in the future?')
    .setRequired(false);
  form.addMultipleChoiceItem()
    .setTitle('Do you consent to AHA using your image and story on its Facebook page and website if selected?')
    .setChoiceValues(['Yes, I consent', 'No, I do not consent'])
    .setRequired(true);

  // ── Section 7: Signature ─────────────────────────────────────────────────
  form.addPageBreakItem().setTitle('7. Certification');
  form.addSectionHeaderItem()
    .setTitle('Certification')
    .setHelpText(
      'By typing your name below you certify that you have fully read and understood ' +
      'this application and that all information provided is true and correct.'
    );
  form.addTextItem().setTitle('Printed / typed full name (signature)').setRequired(true);
  form.addDateItem().setTitle('Date').setRequired(true);

  // ── Section 8: Required Documents (add file uploads MANUALLY here) ────────
  form.addPageBreakItem().setTitle('8. Required Documents');
  form.addSectionHeaderItem()
    .setTitle('Required Documents')
    .setHelpText(
      'Upload the following. REDACT sensitive numbers before uploading:\n' +
      '• Photo IDs — driver\'s license/passport AND TAMU student ID (redact ID numbers)\n' +
      '• Federal Tax Return — most recent year (redact SSN)\n' +
      '• Bank Statements — last 3 consecutive months in your name (redact account numbers)\n\n' +
      'NOTE TO ADMIN: add the 3 File Upload questions beneath this section with the exact ' +
      'titles "Photo IDs", "Federal Tax Return", "Bank Statements" (see README).'
    );

  Logger.log('✅ Form created.');
  Logger.log('Edit URL:      ' + form.getEditUrl());
  Logger.log('Published URL: ' + form.getPublishedUrl());
  Logger.log('Form ID:       ' + form.getId());
  Logger.log('NEXT: add the 3 File Upload questions manually under "Required Documents", then set up OnSubmitOrganize.gs.');
}
