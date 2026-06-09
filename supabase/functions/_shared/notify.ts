// Sends one personalized email per team member, each with a one-click magic
// link that signs them straight into the board. Falls back to the plain app
// URL if a magic link can't be generated. Shared by capture-lead and daily-digest.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const APP_URL = 'https://app.timpvistacircle.com';
export const RECIPIENTS = [
  { email: 'espencer.quinn@gmail.com', name: 'Spencer' },
  { email: 'carissaquinn02@gmail.com', name: 'Carissa' },
  { email: 'morganeadsrealestate@gmail.com', name: 'Morgan' },
];

function admin() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function magicLink(email: string): Promise<string> {
  try {
    const { data, error } = await admin().auth.admin.generateLink({
      type: 'magiclink', email, options: { redirectTo: APP_URL },
    });
    const link = data?.properties?.action_link;
    if (error || !link) return APP_URL;
    return link;
  } catch {
    return APP_URL;
  }
}

async function sendOne(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Timp Vista Circle <info@timpvistacircle.com>',
      to: [to],
      reply_to: 'spencer@heyspence.me',
      subject,
      html,
    }),
  });
  if (!res.ok) console.error(`Resend ${res.status} for ${to}: ${await res.text()}`);
}

// buildHtml(recipientName, openBoardUrl) -> full HTML body. Each recipient gets
// their own magic link substituted as openBoardUrl.
export async function notifyTeam(
  subject: string,
  buildHtml: (name: string, openUrl: string) => string,
): Promise<void> {
  for (const r of RECIPIENTS) {
    const link = await magicLink(r.email);
    await sendOne(r.email, subject, buildHtml(r.name, link));
  }
}

const BTN =
  'display:inline-block;padding:10px 18px;background:#1f6feb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600';
export function openBoardButton(url: string): string {
  return `<p style="margin:20px 0"><a href="${url}" style="${BTN}">Open the board →</a></p>
  <p style="font-size:12px;color:#888">This button signs you in automatically. Don't forward this email.</p>`;
}
