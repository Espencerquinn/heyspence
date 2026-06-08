// submit-lead.js
import { createClient } from '@supabase/supabase-js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Pure, unit-testable. `company` is a honeypot field hidden from humans.
export function validateLead(input) {
  if (input && typeof input.company === 'string' && input.company.trim() !== '') {
    return { ok: false, spam: true };
  }
  const name = (input?.name ?? '').trim();
  const email = (input?.email ?? '').trim().toLowerCase();
  const phone = (input?.phone ?? '').trim();
  const interest = (input?.interest ?? '').trim();
  if (!name || !email || !phone || !interest) return { ok: false };
  if (!EMAIL_RE.test(email)) return { ok: false };
  return { ok: true, value: { name, email, phone, interest } };
}

async function sendInstantEmail(lead) {
  const recipients = [
    'espencer.quinn@gmail.com',
    'carissaquinn02@gmail.com',
    'morganeadsrealestate@gmail.com',
  ];
  const appUrl = 'https://app.timpviewcircle.com';
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Timpview Circle <info@timpviewcircle.com>',
      to: recipients,
      reply_to: 'spencer@heyspence.me',
      subject: `New lead: ${lead.name} (${lead.interest})`,
      html: `<h2>New lead</h2>
        <p><strong>Name:</strong> ${lead.name}</p>
        <p><strong>Email:</strong> ${lead.email}</p>
        <p><strong>Phone:</strong> ${lead.phone}</p>
        <p><strong>Interest:</strong> ${lead.interest}</p>
        <p><strong>Received:</strong> ${new Date(lead.created_at).toLocaleString('en-US', { timeZone: 'America/Denver' })} MT</p>
        <p><a href="${appUrl}">Open the board →</a></p>`,
    }),
  });
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  let input;
  try { input = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: 'Bad JSON' }; }

  const result = validateLead(input);
  if (!result.ok) {
    // Spam (honeypot) and validation both return 200 so bots/users get no signal,
    // but spam is silently dropped and never stored.
    if (result.spam) return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'invalid' }) };
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from('leads')
    .insert(result.value)
    .select('id, name, email, phone, interest, created_at')
    .single();

  if (error) {
    // Do not fail the visitor: the Google Form backup already captured the lead.
    console.error('lead insert failed', error);
    return { statusCode: 200, body: JSON.stringify({ ok: true, stored: false }) };
  }

  try { await sendInstantEmail(data); }
  catch (e) { console.error('instant email failed', e); } // non-fatal

  return { statusCode: 200, body: JSON.stringify({ ok: true, stored: true }) };
}
