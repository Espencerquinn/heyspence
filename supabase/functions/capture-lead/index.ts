// capture-lead — receives a submission forwarded by the Google Apps Script
// (after it writes the sheet) and records it in Supabase as the primary store.
// Handles both inquiry leads and offers, dedupes by email, and emails the team.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { notifyTeam, openBoardButton } from '../_shared/notify.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sb() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function nowMT(): string {
  return new Date().toLocaleString('en-US', { timeZone: 'America/Denver' });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  // Shared secret: only our Apps Script (which knows the secret) may post here.
  if (req.headers.get('x-capture-secret') !== Deno.env.get('CAPTURE_SECRET')) {
    return new Response('forbidden', { status: 403 });
  }

  let body: any;
  try { body = await req.json(); } catch { return new Response('bad json', { status: 400 }); }

  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const phone = String(body.phone ?? '').trim();
  const interest = String(body.interest ?? '').trim();
  if (!name || !email || !phone || !interest || !EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ ok: false, error: 'invalid' }), { status: 400 });
  }
  const isOffer = body.formType === 'offer';
  const db = sb();

  const { data: existingRows } = await db.from('leads').select('id').eq('email', email).limit(1);
  const existing = existingRows && existingRows[0];

  if (isOffer) {
    const offer_details = {
      amount: String(body.offerAmount ?? ''),
      earnest: String(body.earnestMoney ?? ''),
      financing: String(body.financing ?? ''),
      desired_closing: String(body.desiredClosing ?? ''),
      message: String(body.message ?? ''),
      attachment_url: body.attachmentUrl ? String(body.attachmentUrl) : null,
    };
    let leadId: string;
    if (existing) {
      leadId = existing.id;
      await db.from('leads')
        .update({ kind: 'offer', interest, offer_details, updated_at: new Date().toISOString() })
        .eq('id', leadId);
    } else {
      const { data: ins, error } = await db.from('leads')
        .insert({ name, email, phone, interest, kind: 'offer', source: 'website offer', offer_details })
        .select('id').single();
      if (error) { console.error('offer insert', error); return new Response(JSON.stringify({ ok: true, stored: false }), { status: 200 }); }
      leadId = ins.id;
    }
    await db.from('notes').insert({
      lead_id: leadId, author_email: 'form@timpvistacircle.com', author_name: 'Website form',
      body: `OFFER submitted ${nowMT()} MT — ${interest} · ${offer_details.amount} · ${offer_details.financing}`
        + (offer_details.message ? `\n"${offer_details.message}"` : ''),
    });

    const subject = `🔴 OFFER: ${name} — ${interest} ${offer_details.amount}`;
    await notifyTeam(subject, (_n, url) => `
      <h2>🔴 New OFFER</h2>
      <p><strong>Lot:</strong> ${interest}</p>
      <p><strong>From:</strong> ${name} (${email}, ${phone})</p>
      <p><strong>Amount:</strong> ${offer_details.amount} &nbsp; <strong>Earnest:</strong> ${offer_details.earnest}</p>
      <p><strong>Financing:</strong> ${offer_details.financing} &nbsp; <strong>Desired closing:</strong> ${offer_details.desired_closing}</p>
      ${offer_details.message ? `<p><strong>Message:</strong> ${offer_details.message}</p>` : ''}
      ${offer_details.attachment_url ? `<p><a href="${offer_details.attachment_url}">View attachment</a></p>` : ''}
      ${openBoardButton(url)}`);
    return new Response(JSON.stringify({ ok: true, stored: true, offer: true }), { status: 200 });
  }

  // inquiry
  if (existing) {
    await db.from('notes').insert({
      lead_id: existing.id, author_email: 'form@timpvistacircle.com', author_name: 'Website form',
      body: `Re-submitted ${nowMT()} MT — interest: ${interest}`,
    });
    await db.from('leads').update({ updated_at: new Date().toISOString() }).eq('id', existing.id);
    return new Response(JSON.stringify({ ok: true, stored: true, duplicate: true }), { status: 200 });
  }

  const { error } = await db.from('leads').insert({ name, email, phone, interest, kind: 'inquiry' });
  if (error) { console.error('lead insert', error); return new Response(JSON.stringify({ ok: true, stored: false }), { status: 200 }); }

  await notifyTeam(`New lead: ${name} (${interest})`, (_n, url) => `
    <h2>New lead</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Phone:</strong> ${phone}</p>
    <p><strong>Interest:</strong> ${interest}</p>
    <p><strong>Received:</strong> ${nowMT()} MT</p>
    ${openBoardButton(url)}`);
  return new Response(JSON.stringify({ ok: true, stored: true }), { status: 200 });
});
