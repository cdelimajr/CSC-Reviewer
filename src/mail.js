// Sends email through an HTTP email API (works on Render's free plan, which blocks SMTP ports).
// Set ONE of these:
//   BREVO_API_KEY   - Brevo (free 300 emails/day, no domain needed; verify your sender email in Brevo)
//   RESEND_API_KEY  - Resend (needs your own verified domain to email other people)
// Plus MAIL_FROM (sender email) and optionally MAIL_FROM_NAME.
// With none set, emails are printed to the server log (for local testing).

const FROM = process.env.MAIL_FROM || '';
const FROM_NAME = process.env.MAIL_FROM_NAME || 'CSE Reviewer';
const provider = process.env.BREVO_API_KEY ? 'brevo' : process.env.RESEND_API_KEY ? 'resend' : null;
const enabled = !!(provider && FROM);
const outbox = []; // last emails (used by tests when no provider is set)

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function layout(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#172033">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#1e40af;color:#fff;padding:16px 20px;border-radius:12px 12px 0 0;font-weight:bold;font-size:18px">CSE Reviewer</div>
    <div style="background:#fff;padding:20px;border-radius:0 0 12px 12px;border:1px solid #e2e6ef;border-top:0">
      <h2 style="margin:0 0 12px;font-size:20px">${esc(title)}</h2>${bodyHtml}
    </div>
    <p style="font-size:12px;color:#5b6478;text-align:center;margin-top:16px">Ipinadala ito ng CSE Reviewer. Kung hindi ikaw ang gumawa ng account na ito, huwag pansinin ang email na ito.</p>
  </div></body></html>`;
}

// attachments: [{ name, content: Buffer }] (optional)
async function send(to, subject, html, text, attachments = []) {
  const msg = { to, subject, html, text, attachments: attachments.map((a) => a.name) };
  if (!enabled) {
    outbox.push(msg);
    if (outbox.length > 50) outbox.shift();
    if (process.env.NODE_ENV !== 'test') console.log(`[email not configured] To: ${to} | ${subject}\n${text}\n`);
    return { ok: true, logged: true };
  }
  const res = provider === 'brevo'
    ? await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: FROM_NAME, email: FROM }, to: [{ email: to }], subject, htmlContent: html, textContent: text,
        ...(attachments.length ? { attachment: attachments.map((a) => ({ name: a.name, content: a.content.toString('base64') })) } : {}) }),
    })
    : await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${FROM_NAME} <${FROM}>`, to: [to], subject, html, text,
        ...(attachments.length ? { attachments: attachments.map((a) => ({ filename: a.name, content: a.content.toString('base64') })) } : {}) }),
    });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error(`Email to ${to} failed (${res.status}): ${detail.slice(0, 300)}`);
    return { ok: false };
  }
  return { ok: true };
}

// Never let an email failure break a request.
const safeSend = (...a) => send(...a).catch((e) => { console.error('Email error:', e.message); return { ok: false }; });

const templates = {
  code(to, name, code, purpose) {
    const what = { reset: 'i-reset ang iyong password', login: 'mag-login sa CSE Reviewer' }[purpose] || 'i-verify ang iyong email';
    const subject = { reset: `Code para sa bagong password: ${code}`, login: `Login code: ${code}` }[purpose] || `Verification code: ${code}`;
    const title = { reset: 'I-reset ang password', login: 'Login code' }[purpose] || 'I-verify ang iyong email';
    return safeSend(to, subject,
      layout(title, `<p>Hi ${esc(name || '')},</p>
        <p>Gamitin ang code na ito para ${what}:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#e8eefc;color:#1e40af;text-align:center;padding:14px;border-radius:10px">${code}</p>
        <p style="color:#5b6478;font-size:14px">Mag-e-expire ito sa loob ng 15 minuto.</p>`),
      `Hi ${name || ''},\n\nAng iyong code para ${what}: ${code}\nMag-e-expire ito sa loob ng 15 minuto.`);
  },
  result(to, name, a, breakdown, subjects) {
    const pct = Math.round((a.score / a.total) * 1000) / 10;
    const pass = pct >= 80;
    const rows = Object.entries(breakdown || {}).map(([k, b]) => `<tr><td style="padding:6px 0">${esc(subjects[k]?.name || k)}</td><td style="text-align:right">${b.correct}/${b.total} (${Math.round((b.correct / b.total) * 1000) / 10}%)</td></tr>`).join('');
    return safeSend(to, `Resulta: ${a.title} - ${pct}%`,
      layout('Resulta ng iyong mock exam', `<p>Hi ${esc(name)},</p><p>Natapos mo ang <b>${esc(a.title)}</b>.</p>
        <p style="font-size:28px;font-weight:bold;color:${pass ? '#0f8a5f' : '#c62f3b'};margin:8px 0">${pct}% · ${pass ? 'PASADO' : 'Hindi pa pasado'}</p>
        <p>${a.score} tama sa ${a.total} na tanong (passing: 80%).</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>`),
      `Hi ${name},\n\n${a.title}: ${pct}% (${a.score}/${a.total}) - ${pass ? 'PASADO' : 'Hindi pa pasado'}.`);
  },
  // Premium: the result with every question and answer, as an attached PDF.
  review(to, name, a, subjects, pdf) {
    const pct = Math.round((a.score / a.total) * 1000) / 10;
    const practice = a.mode === 'practice';
    const pass = pct >= (a.passing || 80);
    const rows = Object.entries(a.breakdown || {}).map(([k, b]) => `<tr><td style="padding:6px 0">${esc(subjects[k]?.name || k)}</td><td style="text-align:right">${b.correct}/${b.total} (${Math.round((b.correct / b.total) * 1000) / 10}%)</td></tr>`).join('');
    const file = `${a.title.replace(/[^\w ·-]+/g, '').replace(/[ ·]+/g, '-')}-${new Date(a.finished_at || Date.now()).toISOString().slice(0, 10)}.pdf`;
    return safeSend(to, `Mga tanong at sagot: ${a.title} - ${pct}%`,
      layout('Resulta na may mga tanong at sagot', `<p>Hi ${esc(name)},</p><p>Narito ang resulta ng <b>${esc(a.title)}</b>.</p>
        <p style="font-size:24px;font-weight:bold;color:${practice ? '#1e40af' : pass ? '#0f8a5f' : '#c62f3b'};margin:8px 0">${pct}% (${a.score}/${a.total})${practice ? '' : ` · ${pass ? 'PASADO' : 'Hindi pa pasado'}`}</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
        <p>Nasa nakalakip na PDF ang lahat ng tanong, ang sagot mo, ang tamang sagot, at ang paliwanag. Para sa personal na review lamang (RA 10173).</p>`),
      `Hi ${name},\n\n${a.title}: ${pct}% (${a.score}/${a.total}). Nasa nakalakip na PDF ang lahat ng tanong at sagot.`,
      [{ name: file, content: pdf }]);
  },
  report(to, name, stats, subjects) {
    const rows = Object.entries(stats.subjects).map(([k, b]) => `<tr><td style="padding:6px 0">${esc(subjects[k]?.name || k)}</td><td style="text-align:right">${b.total ? Math.round((b.correct / b.total) * 1000) / 10 : 0}%</td></tr>`).join('');
    const last = stats.mocks.slice(-5).map((m) => `${m.pct}%`).join(', ') || 'wala pa';
    return safeSend(to, 'Ang iyong progress report sa CSE Reviewer',
      layout('Progress report', `<p>Hi ${esc(name)},</p>
        <p>Natapos na exam at practice: <b>${stats.attempts}</b><br>Huling mga mock exam: <b>${esc(last)}</b></p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
        <p>Ituloy lang ang pag-review!</p>`),
      `Hi ${name},\n\nNatapos na exam: ${stats.attempts}. Huling mock exams: ${last}.`);
  },
  payment(to, name, status, until, note) {
    const ok = status === 'approved';
    const untilText = until ? new Date(until).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    return safeSend(to, ok ? 'Aktibo na ang Premium mo' : 'Tungkol sa iyong bayad',
      layout(ok ? 'Salamat! Aktibo na ang Premium' : 'Hindi na-approve ang bayad', ok
        ? `<p>Hi ${esc(name)},</p><p>Na-confirm na ang bayad mo. Pwede mo nang gamitin ang lahat ng mock exam hanggang <b>${esc(untilText)}</b>.</p>${note ? `<p>${esc(note)}</p>` : ''}`
        : `<p>Hi ${esc(name)},</p><p>Hindi namin ma-confirm ang bayad mo.</p>${note ? `<p>Dahilan: ${esc(note)}</p>` : ''}<p>Pakisubukan ulit o mag-reply sa email na ito.</p>`),
      ok ? `Hi ${name}, aktibo na ang Premium mo hanggang ${untilText}.` : `Hi ${name}, hindi na-approve ang bayad mo. ${note || ''}`);
  },
  newPayment(to, user, p) {
    return safeSend(to, `Bagong bayad: ${user.name} (${p.reference})`,
      layout('May bagong bayad na kailangang i-check', `<p><b>${esc(user.name)}</b> (${esc(user.email)})</p>
        <p>Halaga: ₱${esc(p.amount)}<br>Paraan: ${esc(p.method)}<br>Reference no.: <b>${esc(p.reference)}</b></p>
        <p>Buksan ang Admin → Payments para i-approve o i-reject.</p>`),
      `Bagong bayad mula kay ${user.name} (${user.email}): ₱${p.amount}, ${p.method}, ref ${p.reference}.`);
  },
};

module.exports = { enabled, provider, outbox, send: safeSend, ...templates };
