/**
 * OnSubmitOrganize.gs — bound to the Ring Program Form.
 *
 * On each submission it:
 *   1. builds the folder name  "LastName.FirstName Ring Cycle <year>"
 *   2. creates that subfolder under the Ring Submissions Shared Drive folder
 *   3. moves + renames the uploaded documents into it (per the doc's convention)
 *   4. writes the questionnaire answers into the folder as a PDF
 *   5. (optional) emails the committee group
 *
 * Setup: paste into the Form's bound script, set CONFIG below, run
 * installTrigger() once. See README.
 */

var CONFIG = {
  // Ring Submissions folder ID (from its Drive URL: /folders/<THIS_ID>).
  SUBMISSIONS_FOLDER_ID: 'PASTE_RING_SUBMISSIONS_FOLDER_ID_HERE',

  // Optional: notify this group on each submission. '' to disable.
  NOTIFY_GROUP_EMAIL: '',

  // Force a specific cycle year in folder/file names. null = use submission year.
  YEAR_OVERRIDE: null,

  // Form question titles used for filing. Must match the Form exactly.
  FIRST_NAME_TITLE: 'Legal First Name',
  LAST_NAME_TITLE:  'Legal Last Name',

  // File-upload question title  ->  document label used in the filename.
  FILE_ITEMS: {
    'Photo IDs':          'IDs',
    'Federal Tax Return': 'Federal Tax Return',
    'Bank Statements':    'Bank Statements',
  },
};

/** Run ONCE to install the on-submit trigger. */
function installTrigger() {
  var form = FormApp.getActiveForm();
  // Avoid duplicates.
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'onRingFormSubmit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onRingFormSubmit').forForm(form).onFormSubmit().create();
  Logger.log('Trigger installed on form: ' + form.getTitle());
}

/** Trigger handler. */
function onRingFormSubmit(e) {
  try {
    var response = e.response;                 // FormResponse
    var itemResponses = response.getItemResponses();

    // Index answers by question title.
    var answers = {};
    itemResponses.forEach(function (ir) {
      answers[ir.getItem().getTitle()] = ir;
    });

    var first = sanitize(getText(answers, CONFIG.FIRST_NAME_TITLE)) || 'Unknown';
    var last  = sanitize(getText(answers, CONFIG.LAST_NAME_TITLE))  || 'Unknown';
    var year  = CONFIG.YEAR_OVERRIDE || new Date().getFullYear();

    var base = last + '.' + first + ' Ring Cycle ' + year;   // per requirements doc

    var parent = DriveApp.getFolderById(CONFIG.SUBMISSIONS_FOLDER_ID);
    var folder = getOrCreateFolder(parent, base);

    // 1) Move + rename uploaded documents.
    itemResponses.forEach(function (ir) {
      if (ir.getItem().getType() !== FormApp.ItemType.FILE_UPLOAD) return;
      var label = CONFIG.FILE_ITEMS[ir.getItem().getTitle()] || sanitize(ir.getItem().getTitle());
      var fileIds = ir.getResponse();          // array of Drive file IDs
      if (!Array.isArray(fileIds)) fileIds = [fileIds];

      fileIds.forEach(function (id, i) {
        var file = DriveApp.getFileById(id);
        var ext = extensionOf(file.getName());
        var suffix = fileIds.length > 1 ? ' (' + (i + 1) + ')' : '';
        file.setName(base + ' ' + label + suffix + ext);
        file.moveTo(folder);
      });
    });

    // 2) Write the questionnaire answers as a PDF (exclude file uploads).
    writeQuestionnairePdf(folder, base, response);

    // 3) Optional notification.
    if (CONFIG.NOTIFY_GROUP_EMAIL) {
      MailApp.sendEmail({
        to: CONFIG.NOTIFY_GROUP_EMAIL,
        subject: 'New Ring Program application — ' + last + ', ' + first,
        body: 'A new application was filed to:\n' + folder.getUrl(),
      });
    }
  } catch (err) {
    // Never let a filing error silently swallow a submission — log it loudly.
    console.error('onRingFormSubmit failed: ' + err + '\n' + (err && err.stack));
    throw err;
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

function getText(answers, title) {
  var ir = answers[title];
  return ir ? String(ir.getResponse()) : '';
}

function getOrCreateFolder(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function sanitize(s) {
  // Strip characters that are awkward in Drive names.
  return String(s || '').replace(/[\\/:*?"<>|]/g, '').trim();
}

function extensionOf(name) {
  var m = /(\.[A-Za-z0-9]+)$/.exec(name || '');
  return m ? m[1] : '';
}

function writeQuestionnairePdf(folder, base, response) {
  var doc = DocumentApp.create(base + ' Questionnaire (tmp)');
  var body = doc.getBody();
  body.appendParagraph('Aggies Helping Aggies — Ring Program Application')
      .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(base).setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Submitted: ' + new Date(response.getTimestamp()).toString());
  var email = response.getRespondentEmail();
  if (email) body.appendParagraph('Respondent email: ' + email);
  body.appendHorizontalRule();

  response.getItemResponses().forEach(function (ir) {
    if (ir.getItem().getType() === FormApp.ItemType.FILE_UPLOAD) return; // don't dump file ids
    body.appendParagraph(ir.getItem().getTitle())
        .setHeading(DocumentApp.ParagraphHeading.HEADING3);
    var val = ir.getResponse();
    body.appendParagraph(Array.isArray(val) ? val.join(', ') : String(val));
  });

  doc.saveAndClose();
  var pdf = DriveApp.getFileById(doc.getId()).getAs('application/pdf');
  folder.createFile(pdf).setName(base + ' Questionnaire.pdf');
  DriveApp.getFileById(doc.getId()).setTrashed(true); // remove the temp Doc
}
