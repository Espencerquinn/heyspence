// ─── Config ──────────────────────────────────────────────────────────
const CONFIG = {
  notifyEmail: 'espencer.quinn@gmail.com',

  leadsSheetName: 'Leads',
  offersSheetName: 'Offers',

  offerAttachmentsFolderId: '1Gvn-Ru8zTXHaRBbwJHrXj-8z-qjRw-5q',

  brand: 'Timp Vista Circle',
  timezone: 'America/Denver',

  // ─── Lead board (Supabase) forwarding ─────────────────────────────
  // Every submission is forwarded here after the sheet write, so it shows
  // up on the Kanban board and emails the team. The sheet stays as backup.
  board: {
    captureUrl: 'https://blbeomcshzqabprvbygd.supabase.co/functions/v1/capture-lead',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsYmVvbWNzaHpxYWJwcnZieWdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NTE0NTgsImV4cCI6MjA5NjUyNzQ1OH0.QmfBHPbsM-UhF1dhyFL807z3H578ndHAtyROKppdzIM',
    captureSecret: 'd9eee74ff86c79cfdf915fa460d2d2d28cbbe33de59b46d8',
  },

  // ─── Lead-response draft settings ─────────────────────────────────
  leadResponse: {
    // Drive file ID of the property packet PDF (the master packet).
    // Open the PDF in Drive → Share → Copy link. The ID is the part
    // between /d/ and /view in the URL. Set to '' to skip the
    // attachment.
    packetFileId: '1r722E5GbsmK4U3LLcruDuTl1y8WzpDfj',

    // Optional: per-interest overrides. If a buyer's interest matches
    // one of these keys, that file is attached instead of packetFileId.
    // Leave the object empty to always use the master packet.
    perInterestPacketFileId: {
      // 'lot1': 'FILE_ID_OF_LOT_1_PACKET',
      // 'whole_subdivision': 'FILE_ID_OF_WHOLE_PACKET',
    },

    // Calendar booking link (Calendly, Google appointment scheduling,
    // etc.). Leave blank to fall back to "reply with a couple of times".
    calendarUrl: 'https://calendar.app.google/EmdQGMFmcGR1ToX99',

    // What the draft is signed with.
    senderName: 'Spencer Quinn',
    senderPhone: '(480) 403-1577',
  },
};

// ─── Entry point ─────────────────────────────────────────────────────
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('No post data received.');
    }
    console.log('postData.type:', e.postData.type);
    console.log('postData.length:', e.postData.length);

    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr, 'Raw:', e.postData.contents);
      throw new Error('Invalid JSON body.');
    }

    const formType = data.formType || 'lead';
    console.log('formType:', formType);

    if (formType === 'offer') {
      handleOffer_(data);
    } else {
      handleLead_(data);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('doPost error:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── Leads ───────────────────────────────────────────────────────────
function handleLead_(data) {
  ['name','email','phone','interest'].forEach(k => {
    if (typeof data[k] === 'undefined') console.warn('Missing lead field:', k);
  });

  const ss = SpreadsheetApp.getActive();
  const sheet = ensureSheet_(ss, CONFIG.leadsSheetName, [
    'Timestamp', 'Name', 'Email', 'Phone', 'Interest'
  ]);
  sheet.appendRow([
    new Date(),
    data.name || '', data.email || '', data.phone || '', data.interest || ''
  ]);

  // Forward to the lead board (Supabase). Sheet row above is the backup.
  forwardToBoard_(data);

  const remaining = MailApp.getRemainingDailyQuota();
  console.log('Mail quota remaining:', remaining);
  if (remaining > 0) {
    sendLeadEmail_(data);
  } else {
    console.warn('Skipping lead email: no remaining MailApp quota.');
  }

  // Create a Gmail draft so Spencer has a personalized response ready
  // to review and send. Failure here doesn't break the lead capture.
  try {
    createLeadResponseDraft_(data);
  } catch (err) {
    console.error('Draft creation failed:', err);
  }
}

function sendLeadEmail_(data) {
  const subject = '🏡 New ' + CONFIG.brand + ' Lead: ' + (data.name || '(no name)');
  const submitted = formatSubmittedAt_();

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c5530;">New Lead Submission</h2>
      <p>You have received a new inquiry for ${CONFIG.brand} lots. A response draft has been created in your Gmail drafts.</p>
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1e293b;">Contact Information</h3>
        <p><strong>Name:</strong> ${escape_(data.name)}</p>
        <p><strong>Email:</strong> <a href="mailto:${escape_(data.email)}">${escape_(data.email)}</a></p>
        <p><strong>Phone:</strong> <a href="tel:${escape_(data.phone)}">${escape_(data.phone)}</a></p>
        <p><strong>Interest:</strong> ${escape_(data.interest)}</p>
      </div>
      <p style="color: #666; font-size: 14px;">Submitted on: ${submitted}</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">
        This email was automatically generated from your ${CONFIG.brand} website form.
      </p>
    </div>`;

  const plainBody = [
    'New Lead Submission — ' + CONFIG.brand, '',
    'Name: '     + (data.name     || ''),
    'Email: '    + (data.email    || ''),
    'Phone: '    + (data.phone    || ''),
    'Interest: ' + (data.interest || ''), '',
    'Submitted on: ' + submitted,
    '',
    'A response draft has been created in your Gmail drafts.'
  ].join('\n');

  try {
    MailApp.sendEmail({
      to: CONFIG.notifyEmail,
      subject: subject,
      body: plainBody,
      htmlBody: htmlBody,
      name: CONFIG.brand,
      replyTo: data.email || CONFIG.notifyEmail
    });
    console.log('Lead mail sent to:', CONFIG.notifyEmail);
  } catch (err) {
    console.error('Lead mail send failed:', err);
    throw err;
  }
}

// ─── Lead response draft ─────────────────────────────────────────────
const LEAD_GREETINGS = {
  lot1:
"Thanks for reaching out about Lot 1. You're looking at the parcel with the existing move-in-ready home — 2.49 acres, private well, fiber internet, connected utilities, and the horseshoe driveway out front. The attached packet has the full property details.",
  lot2:
"Thanks for the interest in Lot 2. It's the 2.027-acre parcel on the private cul-de-sac — mountain views, premium positioning, and ready to build on your spec. The attached packet has the plat, recording details, and lot specifics.",
  lot3:
"Thanks for reaching out about Lot 3. 1.631 acres on the private cul-de-sac, sized for a custom single-family build. The attached packet has the plat, recording details, and lot specifics.",
  whole_subdivision:
"Thanks for asking about the full subdivision. Three contiguous lots, about 6.16 acres, with the existing home on Lot 1 included. That keeps the entire cul-de-sac private and lets you shape the whole property. Packet attached.",
  general:
"Thanks for reaching out about Timp Vista Circle. The attached packet covers the three lots, the recorded plat, and what's around the property."
};

function createLeadResponseDraft_(data) {
  if (!data.email) {
    console.warn('No email on lead — skipping draft.');
    return;
  }

  const interest = data.interest || 'general';
  const greeting = LEAD_GREETINGS[interest] || LEAD_GREETINGS.general;
  const firstName = (data.name || '').split(' ')[0] || 'there';

  const calendarBlock = CONFIG.leadResponse.calendarUrl
    ? "\n\nIf you'd like to walk the property, you can grab a time here:\n" + CONFIG.leadResponse.calendarUrl
    : "\n\nHappy to walk the property whenever it works — just reply with a couple of times that suit you.";

  const body =
    'Hi ' + firstName + ',\n\n' +
    greeting +
    calendarBlock +
    '\n\nReach me anytime: ' + CONFIG.leadResponse.senderPhone + '.' +
    '\n\nBest,\n' + CONFIG.leadResponse.senderName;

  // Attach the right packet PDF. Per-interest override beats the
  // default packet if both are set.
  const overrides = CONFIG.leadResponse.perInterestPacketFileId || {};
  const fileId = overrides[interest] || CONFIG.leadResponse.packetFileId;
  const attachments = [];
  if (fileId && fileId !== 'PASTE_PACKET_PDF_FILE_ID') {
    try {
      const blob = DriveApp.getFileById(fileId).getBlob();
      attachments.push(blob);
    } catch (err) {
      console.error('Could not load packet PDF (' + fileId + '):', err);
    }
  } else {
    console.warn('Packet PDF not configured — draft will go out without attachment.');
  }

  const options = {
    name: CONFIG.leadResponse.senderName,
  };
  if (attachments.length) options.attachments = attachments;

  GmailApp.createDraft(
    data.email,
    CONFIG.brand + ' — pricing and details',
    body,
    options
  );
  console.log('Lead response draft created for:', data.email);
}

// ─── Offers ──────────────────────────────────────────────────────────
function handleOffer_(data) {
  let attachmentUrl = '';
  let attachmentBlob = null;
  let attachmentName = '';

  if (data.attachment && data.attachment.base64data) {
    try {
      const folder = DriveApp.getFolderById(CONFIG.offerAttachmentsFolderId);
      const decoded = Utilities.base64Decode(data.attachment.base64data);
      attachmentName = data.attachment.name || 'offer.pdf';
      attachmentBlob = Utilities.newBlob(
        decoded,
        data.attachment.mimeType || 'application/pdf',
        attachmentName
      );
      const file = folder.createFile(attachmentBlob);
      attachmentUrl = file.getUrl();
      console.log('Attachment saved to Drive:', attachmentUrl);
    } catch (err) {
      console.error('Attachment save failed:', err);
    }
  }

  const ss = SpreadsheetApp.getActive();
  const sheet = ensureSheet_(ss, CONFIG.offersSheetName, [
    'Timestamp', 'Name', 'Email', 'Phone', 'Interest',
    'Offer Amount', 'Earnest Money', 'Financing', 'Desired Closing',
    'Message', 'Attachment'
  ]);
  sheet.appendRow([
    new Date(),
    data.name           || '',
    data.email          || '',
    data.phone          || '',
    data.interest       || '',
    data.offerAmount    || '',
    data.earnestMoney   || '',
    data.financing      || '',
    data.desiredClosing || '',
    data.message        || '',
    attachmentUrl
  ]);

  // Forward to the lead board (Supabase) with the Drive link, minus the
  // large base64 payload. Sheet row above is the backup.
  const boardPayload = Object.assign({}, data, { attachmentUrl: attachmentUrl });
  delete boardPayload.attachment;
  forwardToBoard_(boardPayload);

  const remaining = MailApp.getRemainingDailyQuota();
  console.log('Mail quota remaining:', remaining);
  if (remaining > 0) {
    sendOfferEmail_(data, attachmentUrl, attachmentBlob, attachmentName);
  } else {
    console.warn('Skipping offer email: no remaining MailApp quota.');
  }

  try {
    createOfferResponseDraft_(data);
  } catch (err) {
    console.error('Offer draft creation failed:', err);
  }
}

function sendOfferEmail_(data, attachmentUrl, attachmentBlob, attachmentName) {
  const hasEarnest = (data.earnestMoney || '').trim().length > 0
    && data.earnestMoney.toLowerCase() !== 'none';
  const subjectPrefix = hasEarnest ? '🔥 OFFER + EARNEST' : '📝 New Offer';
  const subject = subjectPrefix + ' — ' + (data.name || '(no name)')
    + ' — ' + (data.interest || 'unspecified');
  const submitted = formatSubmittedAt_();

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c5530;">New Offer Submission</h2>
      <p>You have received a new offer for ${CONFIG.brand} lots. An acknowledgment draft has been created in your Gmail drafts.</p>

      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1e293b;">Buyer</h3>
        <p><strong>Name:</strong> ${escape_(data.name)}</p>
        <p><strong>Email:</strong> <a href="mailto:${escape_(data.email)}">${escape_(data.email)}</a></p>
        <p><strong>Phone:</strong> <a href="tel:${escape_(data.phone)}">${escape_(data.phone)}</a></p>
      </div>

      <div style="background-color: #fff8e6; border-left: 4px solid #b88500; padding: 20px; border-radius: 4px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1e293b;">Offer Details</h3>
        <p><strong>Lot(s):</strong> ${escape_(data.interest)}</p>
        <p><strong>Offer Amount:</strong> ${escape_(data.offerAmount)}</p>
        <p><strong>Earnest Money:</strong> ${escape_(data.earnestMoney || 'none')}</p>
        <p><strong>Financing:</strong> ${escape_(data.financing)}</p>
        <p><strong>Desired Closing:</strong> ${escape_(data.desiredClosing)}</p>
        ${data.message ? `<p><strong>Notes:</strong><br>${escape_(data.message).replace(/\n/g,'<br>')}</p>` : ''}
        ${attachmentUrl ? `<p><strong>Attached PDF:</strong> <a href="${attachmentUrl}">${escape_(attachmentName)}</a></p>` : ''}
      </div>

      <p style="color: #666; font-size: 14px;">Submitted on: ${submitted}</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">
        This email was automatically generated from your ${CONFIG.brand} website form.
      </p>
    </div>`;

  const plainBody = [
    'New Offer Submission — ' + CONFIG.brand, '',
    'BUYER',
    'Name: '  + (data.name  || ''),
    'Email: ' + (data.email || ''),
    'Phone: ' + (data.phone || ''), '',
    'OFFER',
    'Lot(s): '          + (data.interest       || ''),
    'Offer Amount: '    + (data.offerAmount    || ''),
    'Earnest Money: '   + (data.earnestMoney   || 'none'),
    'Financing: '       + (data.financing      || ''),
    'Desired Closing: ' + (data.desiredClosing || ''),
    data.message  ? 'Notes:\n' + data.message  : '',
    attachmentUrl ? 'Attachment: ' + attachmentUrl : '',
    '',
    'Submitted on: ' + submitted,
    '',
    'An acknowledgment draft has been created in your Gmail drafts.'
  ].filter(Boolean).join('\n');

  const options = {
    to: CONFIG.notifyEmail,
    subject: subject,
    body: plainBody,
    htmlBody: htmlBody,
    name: CONFIG.brand,
    replyTo: data.email || CONFIG.notifyEmail
  };
  if (attachmentBlob) options.attachments = [attachmentBlob];

  try {
    MailApp.sendEmail(options);
    console.log('Offer mail sent to:', CONFIG.notifyEmail);
  } catch (err) {
    console.error('Offer mail send failed:', err);
    throw err;
  }
}

// ─── Offer response draft ────────────────────────────────────────────
function createOfferResponseDraft_(data) {
  if (!data.email) {
    console.warn('No email on offer — skipping draft.');
    return;
  }

  const firstName = (data.name || '').split(' ')[0] || 'there';
  const interestLabel =
    data.interest === 'whole_subdivision' ? 'the full subdivision' :
    data.interest === 'lot1' ? 'Lot 1' :
    data.interest === 'lot2' ? 'Lot 2' :
    data.interest === 'lot3' ? 'Lot 3' :
    'Timp Vista Circle';

  const body =
    'Hi ' + firstName + ',\n\n' +
    'Got your offer on ' + interestLabel + ' — thank you. ' +
    'I\'ll review the terms and be back to you within 24 hours, ' +
    'either with questions or with next steps on routing through ' +
    'a Wasatch County title company.\n\n' +
    'If anything urgent comes up before then, reach me at ' +
    CONFIG.leadResponse.senderPhone + '.\n\n' +
    'Best,\n' + CONFIG.leadResponse.senderName;

  GmailApp.createDraft(
    data.email,
    'Re: Your offer on ' + CONFIG.brand,
    body,
    { name: CONFIG.leadResponse.senderName }
  );
  console.log('Offer response draft created for:', data.email);
}

// ─── Forward to the lead board (Supabase) ────────────────────────────
// POSTs the submission to the capture-lead edge function so it lands on
// the Kanban board and emails the team. Never throws — a forwarding
// failure must not block the sheet write or the notification email.
function forwardToBoard_(payload) {
  try {
    UrlFetchApp.fetch(CONFIG.board.captureUrl, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + CONFIG.board.anonKey,
        'x-capture-secret': CONFIG.board.captureSecret
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (err) {
    console.error('Board forward failed:', err);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────
function ensureSheet_(ss, name, headerRow) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headerRow);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function escape_(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatSubmittedAt_() {
  return new Date().toLocaleString('en-US', {
    timeZone: CONFIG.timezone,
    dateStyle: 'full',
    timeStyle: 'short'
  });
}

// ─── Auth-priming helper ─────────────────────────────────────────────
/**
 * Run this once from the editor (▶) after pasting the new code. It
 * forces auth for MailApp, Sheets, Drive, and Gmail-draft creation.
 * Verifies the offer-attachments folder is reachable and the packet
 * PDF is loadable.
 */
function testEmailAuth() {
  const remaining = MailApp.getRemainingDailyQuota();
  console.log('Remaining quota BEFORE test:', remaining);

  let driveFolderCheck = 'folder not configured';
  if (CONFIG.offerAttachmentsFolderId
      && CONFIG.offerAttachmentsFolderId !== 'PASTE_FOLDER_ID_HERE') {
    try {
      driveFolderCheck = 'OK — ' + DriveApp.getFolderById(CONFIG.offerAttachmentsFolderId).getName();
    } catch (err) {
      driveFolderCheck = 'ERROR — ' + err.message;
    }
  }

  let packetCheck = 'packet not configured';
  const packetId = CONFIG.leadResponse.packetFileId;
  if (packetId && packetId !== 'PASTE_PACKET_PDF_FILE_ID') {
    try {
      packetCheck = 'OK — ' + DriveApp.getFileById(packetId).getName();
    } catch (err) {
      packetCheck = 'ERROR — ' + err.message;
    }
  }

  MailApp.sendEmail(
    Session.getActiveUser().getEmail() || CONFIG.notifyEmail,
    'Test: Apps Script auth (' + CONFIG.brand + ')',
    'MailApp: OK\n' +
    'Offer attachments folder: ' + driveFolderCheck + '\n' +
    'Packet PDF: ' + packetCheck
  );
  console.log('Test email sent.', { driveFolderCheck, packetCheck });
}

// ─── Board-forward auth/test helper ──────────────────────────────────
/**
 * Run this once from the editor (▶) after pasting. It authorizes the new
 * "connect to an external service" (UrlFetch) scope and sends a test lead
 * to the board. Tell your dev so they can confirm it arrived and delete
 * the test row.
 */
function testBoardForward() {
  forwardToBoard_({
    formType: 'lead',
    name: 'Board Test',
    email: 'board-test@example.com',
    phone: '8015550000',
    interest: 'lot1'
  });
  console.log('Test lead forwarded to board.');
}
