const clean = value => String(value || '').trim().slice(0, 500);

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.QUOTE_RECIPIENT || 'hello@kontrolwater.com';
  const sender = process.env.QUOTE_FROM || 'KONTROLWATER Website <quotes@kontrolwater.com>';
  if (!apiKey) return response.status(503).json({ error: 'Quote delivery is not configured' });

  const body = request.body || {};
  const name = clean(body.name);
  const email = clean(body.email);
  const phone = clean(body.phone);
  const poolType = clean(body.poolType);
  if (!name || !email || !phone || !poolType) {
    return response.status(400).json({ error: 'Required details are missing' });
  }

  const priorities = Array.isArray(body.priorities)
    ? body.priorities.map(clean).filter(Boolean).join(', ')
    : '';
  const lines = [
    ['Pool type', poolType],
    ['Name', name],
    ['Email', email],
    ['Phone', phone],
    ['Location', clean(body.location)],
    ['Timeframe', clean(body.timeframe)],
    ['Priorities', priorities],
    ['Other priority', clean(body.otherPriority) || 'None provided']
  ];
  const html = `
    <h2>New KONTROLWATER quote request</h2>
    <table style="border-collapse:collapse;font-family:Arial,sans-serif">
      ${lines.map(([label, value]) => `<tr><td style="padding:8px 16px 8px 0;color:#667085">${label}</td><td style="padding:8px 0"><strong>${value.replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[character]))}</strong></td></tr>`).join('')}
    </table>`;

  const result = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: sender, to: [recipient], reply_to: email, subject: `Quote request: ${poolType} · ${name}`, html })
  });

  if (!result.ok) {
    console.error('Quote email failed', result.status, await result.text());
    return response.status(502).json({ error: 'Quote delivery failed' });
  }
  return response.status(200).json({ ok: true });
}
