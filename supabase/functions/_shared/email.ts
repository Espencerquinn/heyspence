export async function sendEmail(opts: { subject: string; html: string }): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Timp Vista Circle <info@timpvistacircle.com>',
      to: ['espencer.quinn@gmail.com', 'carissaquinn02@gmail.com', 'morganeadsrealestate@gmail.com'],
      reply_to: 'spencer@heyspence.me',
      subject: opts.subject,
      html: opts.html,
    }),
  });
  if (!res.ok) throw new Error(`Resend failed: ${res.status} ${await res.text()}`);
}
