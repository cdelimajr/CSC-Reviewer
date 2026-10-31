const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const compression = require('compression');
const db = require('./db');
const { seed } = require('./seed');
const { SUBJECTS, EXAMS } = require('./blueprint');
const { buildExam, grade } = require('./exam');
const mail = require('./mail');
const sets = require('./sets');
const paymongo = require('./paymongo');
const web = require('./webbuild');

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const SESSION_DAYS = 30;
// Email verification is required when an email provider is set up (or forced with REQUIRE_EMAIL_VERIFICATION=1).
const REQUIRE_VERIFY = process.env.REQUIRE_EMAIL_VERIFICATION ? process.env.REQUIRE_EMAIL_VERIFICATION === '1' : mail.enabled;
const CODE_MINUTES = 15;


/* ------------------------------ helpers ------------------------------ */
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') };
}
function checkPassword(password, user) {
  const h = crypto.scryptSync(password, user.salt, 64);
  return crypto.timingSafeEqual(h, Buffer.from(user.pass_hash, 'hex'));
}
const publicUser = (u) => u && {
  id: u.id, name: u.name, email: u.email, role: u.role, created_at: u.created_at,
  email_verified: !!u.email_verified || !REQUIRE_VERIFY, premium_until: u.premium_until || 0,
};

/* settings (stored in the meta table, edited by the admin) */
const SETTING_DEFAULTS = {
  premium_required: '0', price: '149', plan_days: '30', pay_method: 'GCash', pay_name: '', pay_number: '',
  pay_note: 'Ipadala ang bayad sa napiling account sa itaas, tapos ilagay ang reference number dito.',
  // Free plan (only when Premium is turned on): online only, with these limits.
  free_practice_daily: '3', free_practice_items: '20', free_sets: '1', free_mock_daily: '1',
  // Exam screen: the RA 10173 watermark and the warning line on top (on by default).
  exam_watermark: '1', exam_privacy_strip: '1',
  // Payments: turn online (PayMongo) and manual payments on or off. pay_methods holds the manual
  // payment accounts (GCash, Maya, PayPal, bank...) as JSON; empty means the defaults below.
  pay_online_on: '1', pay_manual_on: '1', pay_methods: '',
  // Ads for the free plan only (never for Premium, never during an exam).
  ads_on: '1', adsense_client: '', adsense_slot: '', admob_banner: '',
};
const LONG_SETTINGS = { pay_methods: 20000 };
async function getSettings() {
  const rows = await db.all(`SELECT key, value FROM meta WHERE key LIKE 'set:%'`);
  const out = { ...SETTING_DEFAULTS };
  rows.forEach((r) => { out[r.key.slice(4)] = r.value; });
  return out;
}
const PAY_TYPES = { gcash: 'GCash', maya: 'Maya', paypal: 'PayPal', bank: 'Bank transfer', gotyme: 'GoTyme', shopeepay: 'ShopeePay', other: 'Iba pa' };
// The manual payment accounts. Before this setting existed there was one GCash account (pay_method, pay_name, pay_number).
function payMethods(st) {
  let list = null;
  try { list = st.pay_methods ? JSON.parse(st.pay_methods) : null; } catch { list = null; }
  if (!Array.isArray(list)) {
    list = [
      { id: 'gcash', type: 'gcash', name: st.pay_method || 'GCash', account_name: st.pay_name, account: st.pay_number, note: '', on: !!st.pay_number || !paymongo.enabled },
      { id: 'maya', type: 'maya', name: 'Maya', on: false },
      { id: 'paypal', type: 'paypal', name: 'PayPal', on: false },
      { id: 'bank', type: 'bank', name: 'Bank transfer', on: false },
    ];
  }
  return list.filter((m) => m && m.id).map((m) => ({
    id: String(m.id).replace(/[^a-z0-9_-]/gi, '').slice(0, 30), type: PAY_TYPES[m.type] ? m.type : 'other',
    name: String(m.name || PAY_TYPES[m.type] || 'Bayad').slice(0, 40), account_name: String(m.account_name || '').slice(0, 80),
    account: String(m.account || '').slice(0, 120), bank: String(m.bank || '').slice(0, 60), note: String(m.note || '').slice(0, 400),
    on: !!m.on, has_qr: !!m.has_qr,
  })).filter((m) => m.id).slice(0, 12);
}
const onlinePayOn = (st) => paymongo.enabled && st.pay_online_on !== '0';
const manualPayOn = (st) => st.pay_manual_on !== '0' && payMethods(st).some((m) => m.on);
const hasPremium = (u, st) => u.role === 'admin' || st.premium_required !== '1' || (u.premium_until || 0) > Date.now();
const freeLimits = (st) => ({
  practice_daily: Math.max(0, Number(st.free_practice_daily) || 0),
  practice_items: Math.max(5, Number(st.free_practice_items) || 20),
  sets: Math.max(0, Number(st.free_sets) || 0),
  mock_daily: Math.max(0, Number(st.free_mock_daily ?? 1) || 0),
});
// Start of today in the Philippines (UTC+8), for the daily practice limit.
const phDayStart = () => { const n = Date.now() + 8 * 3600e3; return n - (n % 864e5) - 8 * 3600e3; };
const practiceToday = async (userId) => (await db.get(`SELECT COUNT(*) AS n FROM attempts WHERE user_id = ? AND mode = 'practice' AND started_at >= ?`, userId, phDayStart())).n;
const mockToday = async (userId) => (await db.get(`SELECT COUNT(*) AS n FROM attempts WHERE user_id = ? AND mode != 'practice' AND started_at >= ?`, userId, phDayStart())).n;
// What the app needs to know about the settings (also kept on the device for offline use).
const clientConfig = (st) => ({
  watermark: st.exam_watermark !== '0', privacy_strip: st.exam_privacy_strip !== '0',
  ads: { on: st.ads_on === '1', adsense_client: st.adsense_client, adsense_slot: st.adsense_slot, admob_banner: st.admob_banner },
});

/* one-time email codes */
async function sendCode(user, purpose) {
  const code = String(crypto.randomInt(100000, 1000000));
  await db.batch([
    ['DELETE FROM email_codes WHERE email = ? AND purpose = ?', [user.email, purpose]],
    ['INSERT INTO email_codes (email, purpose, code_hash, expires_at) VALUES (?, ?, ?, ?)', [user.email, purpose, sha(user.email + ':' + code), Date.now() + CODE_MINUTES * 60000]],
  ]);
  await mail.code(user.email, user.name, code, purpose);
}
async function useCode(email, purpose, code) {
  const row = await db.get('SELECT * FROM email_codes WHERE email = ? AND purpose = ?', email, purpose);
  if (!row || row.expires_at < Date.now() || row.tries >= 5) return false;
  if (row.code_hash !== sha(email + ':' + String(code || '').trim())) {
    await db.run('UPDATE email_codes SET tries = tries + 1 WHERE id = ?', row.id);
    return false;
  }
  await db.run('DELETE FROM email_codes WHERE id = ?', row.id);
  return true;
}
const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 200;

async function createAdminFromEnv() {
  if (!ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) return;
  const u = await db.get('SELECT * FROM users WHERE email = ?', ADMIN_EMAIL);
  if (!u) {
    const { salt, hash } = hashPassword(process.env.ADMIN_PASSWORD);
    await db.run(`INSERT INTO users (name, email, pass_hash, salt, role, email_verified) VALUES (?, ?, ?, ?, 'admin', 1)`, 'Admin', ADMIN_EMAIL, hash, salt);
    console.log(`Admin account created for ${ADMIN_EMAIL}`);
  } else if (u.role !== 'admin') {
    await db.run(`UPDATE users SET role = 'admin' WHERE id = ?`, u.id);
  }
}

async function newSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  await db.run('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)', sha(token), userId, Date.now() + SESSION_DAYS * 864e5);
  res.cookie('sid', token, { httpOnly: true, sameSite: 'lax', secure: res.req.secure, maxAge: SESSION_DAYS * 864e5, path: '/' });
  // The phone and desktop apps can't use the cookie, so they get the token and send it as "Authorization: Bearer".
  if (res.req.get('X-App')) res.locals.token = token;
}
// Session token from the cookie (website) or the Authorization header (apps).
function sessionToken(req) {
  const h = req.get('authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : readCookie(req, 'sid');
}
const withToken = (res, body) => (res.locals.token ? { ...body, token: res.locals.token } : body);
function readCookie(req, name) {
  const m = (req.headers.cookie || '').split(';').map((s) => s.trim()).find((s) => s.startsWith(name + '='));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
}

// Simple in-memory rate limit for login/register.
const hits = new Map();
function limited(key, max = 10, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const h = (hits.get(key) || []).filter((t) => now - t < windowMs);
  h.push(now); hits.set(key, h);
  return h.length > max;
}

/* ------------------------------ app ------------------------------ */
const app = express();
app.set('trust proxy', 1);
app.use(compression()); // smaller downloads (the offline question pack shrinks about 5x)
// The apps load the screens from the device and call this server from another origin.
// They log in with a token (not a cookie), so allowing any origin is safe here.
app.use('/api', (req, res, next) => {
  if (req.get('origin')) {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-App');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.set('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
// Keep the exact bytes of PayMongo webhooks, which the signature check needs.
app.use(express.json({ limit: '4mb', verify: (req, res, buf) => { if (req.originalUrl.startsWith('/api/payments/paymongo/')) req.rawBody = buf; } }));

app.use(async (req, res, next) => {
  const token = sessionToken(req);
  if (token && req.path.startsWith('/api/')) {
    try {
      const row = await db.get(`SELECT u.*, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`, sha(token));
      if (row && row.expires_at > Date.now() && !row.disabled) req.user = row;
    } catch (e) { console.error(e); }
  }
  next();
});
const auth = (req, res, next) => (req.user ? next() : res.status(401).json({ error: 'Kailangan mong mag-login.' }));
const admin = (req, res, next) => (req.user && req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Para sa admin lamang.' }));
const verified = (req, res, next) => (!REQUIRE_VERIFY || req.user.email_verified ? next()
  : res.status(403).json({ error: 'I-verify muna ang iyong email.', code: 'unverified' }));
const wrap = (fn) => async (req, res, next) => { try { await fn(req, res, next); } catch (e) { console.error(e); if (!res.headersSent) res.status(500).json({ error: 'May nangyaring error. Subukan ulit.' }); } };

/* ------------------------------ auth ------------------------------ */
app.post('/api/auth/register', wrap(async (req, res) => {
  if (limited('reg:' + req.ip, 20)) return res.status(429).json({ error: 'Masyadong maraming subok. Maghintay muna ng ilang minuto.' });
  const name = String(req.body.name || '').trim().slice(0, 80);
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!name) return res.status(400).json({ error: 'Ilagay ang iyong pangalan.' });
  if (!isEmail(email)) return res.status(400).json({ error: 'Ilagay ang wastong email.' });
  if (password.length < 8) return res.status(400).json({ error: 'Ang password ay dapat may hindi bababa sa 8 characters.' });
  if (await db.get('SELECT 1 FROM users WHERE email = ?', email)) return res.status(409).json({ error: 'May account na ang email na ito. Mag-login na lang.' });
  const hasAdmin = await db.get(`SELECT 1 FROM users WHERE role = 'admin'`);
  const role = (ADMIN_EMAIL && email === ADMIN_EMAIL) || (!ADMIN_EMAIL && !hasAdmin) ? 'admin' : 'user';
  const { salt, hash } = hashPassword(password);
  const r = await db.run('INSERT INTO users (name, email, pass_hash, salt, role, email_verified) VALUES (?, ?, ?, ?, ?, ?)', name, email, hash, salt, role, REQUIRE_VERIFY ? 0 : 1);
  await newSession(res, r.lastInsertRowid);
  const user = await db.get('SELECT * FROM users WHERE id = ?', r.lastInsertRowid);
  if (REQUIRE_VERIFY) await sendCode(user, 'verify');
  res.json(withToken(res, { user: publicUser(user) }));
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (limited('login:' + req.ip + email, 10)) return res.status(429).json({ error: 'Masyadong maraming subok. Maghintay ng 10 minuto.' });
  const u = await db.get('SELECT * FROM users WHERE email = ?', email);
  if (!u || !checkPassword(String(req.body.password || ''), u)) return res.status(401).json({ error: 'Mali ang email o password.' });
  if (u.disabled) return res.status(403).json({ error: 'Naka-disable ang account na ito. Makipag-ugnayan sa admin.' });
  await newSession(res, u.id);
  res.json(withToken(res, { user: publicUser(u) }));
}));

app.post('/api/auth/logout', async (req, res) => {
  const token = sessionToken(req);
  if (token) await db.run('DELETE FROM sessions WHERE token = ?', sha(token));
  res.clearCookie('sid', { path: '/' });
  res.json({ ok: true });
});

app.post('/api/auth/verify', auth, wrap(async (req, res) => {
  if (limited('verify:' + req.user.id, 15)) return res.status(429).json({ error: 'Masyadong maraming subok. Maghintay ng ilang minuto.' });
  if (!(await useCode(req.user.email, 'verify', req.body.code))) return res.status(400).json({ error: 'Mali o expired na ang code. Humingi ng bagong code.' });
  await db.run('UPDATE users SET email_verified = 1 WHERE id = ?', req.user.id);
  res.json({ user: publicUser({ ...req.user, email_verified: 1 }) });
}));

app.post('/api/auth/resend', auth, wrap(async (req, res) => {
  if (req.user.email_verified) return res.json({ ok: true });
  if (limited('resend:' + req.user.id, 3, 5 * 60 * 1000)) return res.status(429).json({ error: 'Naipadala na ang code. Maghintay ng ilang minuto bago humingi ulit.' });
  await sendCode(req.user, 'verify');
  res.json({ ok: true });
}));

app.post('/api/auth/forgot', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (limited('forgot:' + req.ip, 8)) return res.status(429).json({ error: 'Masyadong maraming subok. Maghintay muna.' });
  const u = isEmail(email) && (await db.get('SELECT * FROM users WHERE email = ?', email));
  if (u && !u.disabled) await sendCode(u, 'reset');
  res.json({ ok: true }); // Same answer either way, so emails cannot be guessed.
}));

app.post('/api/auth/reset', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (limited('reset:' + req.ip + email, 10)) return res.status(429).json({ error: 'Masyadong maraming subok. Maghintay muna.' });
  if (password.length < 8) return res.status(400).json({ error: 'Ang bagong password ay dapat may 8 characters o higit pa.' });
  const u = await db.get('SELECT * FROM users WHERE email = ?', email);
  if (!u || !(await useCode(email, 'reset', req.body.code))) return res.status(400).json({ error: 'Mali o expired na ang code.' });
  const { salt, hash } = hashPassword(password);
  // Receiving the code proves the email works, so the account also counts as verified.
  await db.batch([
    ['UPDATE users SET pass_hash = ?, salt = ?, email_verified = 1 WHERE id = ?', [hash, salt, u.id]],
    ['DELETE FROM sessions WHERE user_id = ?', [u.id]],
    ['DELETE FROM devices WHERE user_id = ?', [u.id]],
  ]);
  res.json({ ok: true });
}));

/* Login with a one-time code sent to the email (no password needed). */
app.post('/api/auth/otp', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!isEmail(email)) return res.status(400).json({ error: 'Ilagay ang wastong email.' });
  if (limited('otp:' + req.ip, 8) || limited('otp:' + email, 3, 5 * 60 * 1000)) return res.status(429).json({ error: 'Naipadala na ang code. Maghintay ng ilang minuto bago humingi ulit.' });
  const u = await db.get('SELECT * FROM users WHERE email = ?', email);
  if (u && !u.disabled) await sendCode(u, 'login');
  res.json({ ok: true }); // Same answer either way, so emails cannot be guessed.
}));

app.post('/api/auth/otp/login', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (limited('otplogin:' + req.ip + email, 10)) return res.status(429).json({ error: 'Masyadong maraming subok. Maghintay ng 10 minuto.' });
  const u = await db.get('SELECT * FROM users WHERE email = ?', email);
  if (!u || !(await useCode(email, 'login', req.body.code))) return res.status(400).json({ error: 'Mali o expired na ang code.' });
  if (u.disabled) return res.status(403).json({ error: 'Naka-disable ang account na ito. Makipag-ugnayan sa admin.' });
  // Receiving the code proves the email works.
  if (!u.email_verified) await db.run('UPDATE users SET email_verified = 1 WHERE id = ?', u.id);
  await newSession(res, u.id);
  res.json(withToken(res, { user: publicUser({ ...u, email_verified: 1 }) }));
}));

/* Fingerprint / face login (Premium). The device keeps a secret key that only unlocks after the
   fingerprint, face or Windows Hello check on the device. The server only sees the key. */
const deviceKey = (key) => {
  const m = /^(\d+)\.([a-f0-9]{64})$/.exec(String(key || ''));
  return m && { id: Number(m[1]), secret: m[2] };
};
app.post('/api/auth/device', auth, verified, wrap(async (req, res) => {
  if (!hasPremium(req.user, await getSettings())) return res.status(402).json({ error: 'Para sa Premium ang fingerprint/face login.', code: 'premium' });
  if (limited('device:' + req.user.id, 10, 60 * 60 * 1000)) return res.status(429).json({ error: 'Masyadong maraming subok. Maghintay muna.' });
  const secret = crypto.randomBytes(32).toString('hex');
  const r = await db.run('INSERT INTO devices (user_id, secret_hash, name, created_at) VALUES (?, ?, ?, ?)',
    req.user.id, sha(secret), String(req.body.name || '').slice(0, 60), Date.now());
  res.json({ key: `${r.lastInsertRowid}.${secret}` });
}));
app.post('/api/auth/device/login', wrap(async (req, res) => {
  if (limited('devlogin:' + req.ip, 20)) return res.status(429).json({ error: 'Masyadong maraming subok. Maghintay ng 10 minuto.' });
  const k = deviceKey(req.body.key);
  const d = k && (await db.get('SELECT * FROM devices WHERE id = ?', k.id));
  if (!d || !crypto.timingSafeEqual(Buffer.from(d.secret_hash, 'hex'), Buffer.from(sha(k.secret), 'hex'))) {
    return res.status(401).json({ error: 'Hindi na gumagana ang fingerprint/face login sa device na ito. Mag-login gamit ang password o code.', code: 'device' });
  }
  const u = await db.get('SELECT * FROM users WHERE id = ?', d.user_id);
  if (!u) return res.status(401).json({ error: 'Wala na ang account na ito.', code: 'device' });
  if (u.disabled) return res.status(403).json({ error: 'Naka-disable ang account na ito. Makipag-ugnayan sa admin.' });
  await db.run('UPDATE devices SET last_used_at = ? WHERE id = ?', Date.now(), d.id);
  await newSession(res, u.id);
  res.json(withToken(res, { user: publicUser(u) }));
}));
app.post('/api/auth/device/remove', wrap(async (req, res) => {
  const k = deviceKey(req.body.key);
  const d = k && (await db.get('SELECT * FROM devices WHERE id = ?', k.id));
  if (d && d.secret_hash === sha(k.secret)) await db.run('DELETE FROM devices WHERE id = ?', d.id);
  res.json({ ok: true });
}));

app.get('/api/me', wrap(async (req, res) => {
  const st = await getSettings();
  res.json({
    user: publicUser(req.user) || null,
    config: { verify: REQUIRE_VERIFY, mail: mail.enabled, premium_required: st.premium_required === '1', free: freeLimits(st), online_pay: onlinePayOn(st), ...clientConfig(st) },
    premium: req.user ? hasPremium(req.user, st) : false,
    practice_today: req.user ? await practiceToday(req.user.id) : 0,
    mock_today: req.user ? await mockToday(req.user.id) : 0,
  });
}));

app.post('/api/me/password', auth, wrap(async (req, res) => {
  const { current, password } = req.body;
  if (!checkPassword(String(current || ''), req.user)) return res.status(400).json({ error: 'Mali ang kasalukuyang password.' });
  if (String(password || '').length < 8) return res.status(400).json({ error: 'Ang bagong password ay dapat may 8 characters o higit pa.' });
  const { salt, hash } = hashPassword(String(password));
  await db.run('UPDATE users SET pass_hash = ?, salt = ? WHERE id = ?', hash, salt, req.user.id);
  res.json({ ok: true });
}));

app.get('/api/meta', (req, res) => res.json({ subjects: SUBJECTS, exams: EXAMS }));

/* ------------------------------ attempts ------------------------------ */
// Items sent to the browser. Answers are hidden during a timed mock exam.
function clientItems(items, reveal) {
  return items.map((it) => ({
    subject: it.subject, topic: it.topic, question: it.question, passage: it.passage || '', choices: it.choices,
    ...(reveal ? { answer: it.answer, explanation: it.explanation } : {}),
  }));
}
// lite: free plan review of a finished mock exam. Only the letter of the correct answer, no question,
// choices or explanation (Premium gets the full review, PDF, email and print).
function attemptView(a, full = true, lite = false) {
  const items = JSON.parse(a.items);
  const done = !!a.finished_at;
  const practice = a.mode === 'practice';
  const out = {
    id: a.id, mode: a.mode, title: a.title, total: a.total, score: a.score, time_limit_sec: a.time_limit_sec,
    started_at: a.started_at, finished_at: a.finished_at, breakdown: a.breakdown ? JSON.parse(a.breakdown) : null,
    passing: EXAMS[a.mode]?.passing || 80, now: Date.now(),
  };
  if (full) {
    out.answers = JSON.parse(a.answers || '{}');
    if (lite && done && !practice) { out.lite = true; out.items = items.map((it) => ({ subject: it.subject, answer: it.answer })); }
    else out.items = clientItems(items, done || practice);
  }
  return out;
}
// Free users see the short review of their finished mock exams.
const liteFor = async (req, a) => a.mode !== 'practice' && !hasPremium(req.user, await getSettings());
const getOwnAttempt = (req) => db.get('SELECT * FROM attempts WHERE id = ? AND (user_id = ? OR ? = 1)', Number(req.params.id), req.user.id, req.user.role === 'admin' ? 1 : 0);

app.post('/api/attempts', auth, verified, wrap(async (req, res) => {
  const mode = EXAMS[req.body.mode] ? req.body.mode : 'practice';
  const st = await getSettings();
  const premium = hasPremium(req.user, st);
  const free = freeLimits(st);
  const opts = { ...req.body };
  if (!premium && mode === 'practice') {
    if ((await practiceToday(req.user.id)) >= free.practice_daily) {
      return res.status(402).json({ error: `Naubos mo na ang ${free.practice_daily} libreng practice ngayong araw. Bumalik bukas o kumuha ng Premium para walang limit.`, code: 'premium' });
    }
    opts.count = Math.min(Number(opts.count) || 20, free.practice_items);
  }
  if (!premium && mode !== 'practice') {
    const set = req.body.set_id ? await db.get('SELECT number FROM exam_sets WHERE id = ? AND mode = ?', Number(req.body.set_id), mode) : null;
    if (!set || set.number > free.sets) return res.status(402).json({ error: 'Kailangan ng Premium para sa exam set na ito.', code: 'premium' });
    // One mock exam a day on the free plan, counted on the server for the account (not the device).
    if ((await mockToday(req.user.id)) >= free.mock_daily) {
      return res.status(402).json({ error: 'Isang mock exam lang kada araw sa libreng plan. Bumalik bukas o kumuha ng Premium para walang limit.', code: 'mock_daily' });
    }
  }
  let ex, setId = null;
  if (mode !== 'practice' && req.body.set_id) {
    const set = await db.get('SELECT * FROM exam_sets WHERE id = ? AND mode = ?', Number(req.body.set_id), mode);
    if (!set) return res.status(404).json({ error: 'Hindi makita ang exam set.' });
    ex = { title: set.title, items: JSON.parse(set.items), timeLimitSec: EXAMS[mode].minutes * 60 };
    setId = set.id;
  } else {
    ex = await buildExam(mode, opts);
  }
  if (!ex.items.length) return res.status(400).json({ error: 'Wala pang tanong para dito.' });
  const r = await db.run(`INSERT INTO attempts (user_id, mode, title, items, time_limit_sec, started_at, total, set_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    req.user.id, mode, ex.title, JSON.stringify(ex.items), ex.timeLimitSec, Date.now(), ex.items.length, setId);
  res.json(attemptView(await db.get('SELECT * FROM attempts WHERE id = ?', r.lastInsertRowid)));
}));

app.get('/api/sets', auth, verified, wrap(async (req, res) => {
  const mode = EXAMS[req.query.mode] ? req.query.mode : 'pro';
  const rows = await db.all(`SELECT s.id, s.number, s.title, s.created_at,
      (SELECT COUNT(*) FROM attempts a WHERE a.set_id = s.id AND a.user_id = ? AND a.finished_at IS NOT NULL) AS taken,
      (SELECT MAX(score * 100.0 / total) FROM attempts a WHERE a.set_id = s.id AND a.user_id = ? AND a.finished_at IS NOT NULL) AS best
    FROM exam_sets s WHERE s.mode = ? ORDER BY s.number DESC`, req.user.id, req.user.id, mode);
  const st = await getSettings();
  const premium = hasPremium(req.user, st), free = freeLimits(st);
  res.json(rows.map((r) => ({ ...r, best: r.best == null ? null : Math.round(r.best * 10) / 10, locked: !premium && r.number > free.sets })));
}));

app.get('/api/attempts', auth, wrap(async (req, res) => {
  const rows = await db.all('SELECT * FROM attempts WHERE user_id = ? ORDER BY started_at DESC LIMIT 100', req.user.id);
  res.json(rows.map((a) => attemptView(a, false)));
}));

app.get('/api/attempts/:id', auth, verified, wrap(async (req, res) => {
  const a = await getOwnAttempt(req);
  if (!a) return res.status(404).json({ error: 'Hindi makita ang exam.' });
  res.json(attemptView(a, true, await liteFor(req, a)));
}));

/* Premium: email the result with every question and answer, with the PDF attached (same PDF as "Save as PDF"). */
const PDF = require('../public/pdf');
app.post('/api/attempts/:id/email', auth, verified, wrap(async (req, res) => {
  if (!hasPremium(req.user, await getSettings())) return res.status(402).json({ error: 'Para sa Premium ang pag-email ng resulta.', code: 'premium' });
  const a = await getOwnAttempt(req);
  if (!a || a.user_id !== req.user.id || !a.finished_at) return res.status(404).json({ error: 'Hindi makita ang exam.' });
  if (limited('mailres:' + req.user.id, 10, 60 * 60 * 1000)) return res.status(429).json({ error: 'Masyadong marami nang naipadala. Subukan ulit mamaya.' });
  const v = attemptView(a);
  v.items = JSON.parse(a.items); // with answers and explanations
  const lang = req.body.lang === 'en' ? 'en' : 'tl';
  const pdf = Buffer.from(PDF.report(v, { lang, subjects: SUBJECTS, who: `${req.user.name} <${req.user.email}>` }));
  const r = await mail.review(req.user.email, req.user.name, v, SUBJECTS, pdf);
  if (!r.ok) return res.status(502).json({ error: 'Hindi naipadala ang email. Subukan ulit mamaya.' });
  res.json({ ok: true, to: req.user.email });
}));

function cleanAnswers(raw, total) {
  const out = {};
  for (const [k, v] of Object.entries(raw || {})) {
    const i = Number(k), c = Number(v);
    if (Number.isInteger(i) && i >= 0 && i < total && Number.isInteger(c) && c >= 0 && c < 4) out[i] = c;
  }
  return out;
}

app.put('/api/attempts/:id/answers', auth, verified, wrap(async (req, res) => {
  const a = await getOwnAttempt(req);
  if (!a || a.user_id !== req.user.id) return res.status(404).json({ error: 'Hindi makita ang exam.' });
  if (a.finished_at) return res.status(409).json({ error: 'Tapos na ang exam na ito.' });
  await db.run('UPDATE attempts SET answers = ? WHERE id = ?', JSON.stringify(cleanAnswers(req.body.answers, a.total)), a.id);
  res.json({ ok: true });
}));

app.post('/api/attempts/:id/submit', auth, verified, wrap(async (req, res) => {
  const a = await getOwnAttempt(req);
  if (!a || a.user_id !== req.user.id) return res.status(404).json({ error: 'Hindi makita ang exam.' });
  if (!a.finished_at) {
    const answers = req.body.answers ? cleanAnswers(req.body.answers, a.total) : JSON.parse(a.answers || '{}');
    const { score, breakdown } = grade(JSON.parse(a.items), answers);
    let finished = Date.now();
    if (a.time_limit_sec) finished = Math.min(finished, a.started_at + a.time_limit_sec * 1000 + 60000);
    await db.run('UPDATE attempts SET answers = ?, score = ?, breakdown = ?, finished_at = ? WHERE id = ?',
      JSON.stringify(answers), score, JSON.stringify(breakdown), finished, a.id);
    if (a.mode !== 'practice' && req.body.email !== false) {
      mail.result(req.user.email, req.user.name, { title: a.title, score, total: a.total }, breakdown, SUBJECTS);
    }
  }
  res.json(attemptView(await db.get('SELECT * FROM attempts WHERE id = ?', a.id), true, await liteFor(req, a)));
}));

app.delete('/api/attempts/:id', auth, wrap(async (req, res) => {
  await db.run('DELETE FROM attempts WHERE id = ? AND user_id = ?', Number(req.params.id), req.user.id);
  res.json({ ok: true });
}));

async function statsFor(userId) {
  const rows = await db.all('SELECT mode, score, total, breakdown, finished_at FROM attempts WHERE user_id = ? AND finished_at IS NOT NULL ORDER BY finished_at', userId);
  const subj = {};
  for (const r of rows) {
    for (const [s, b] of Object.entries(JSON.parse(r.breakdown || '{}'))) {
      const x = (subj[s] ||= { correct: 0, total: 0 });
      x.correct += b.correct; x.total += b.total;
    }
  }
  const mocks = rows.filter((r) => r.mode !== 'practice').map((r) => ({ mode: r.mode, pct: Math.round((r.score / r.total) * 1000) / 10, at: r.finished_at }));
  return { attempts: rows.length, subjects: subj, mocks };
}
app.get('/api/stats', auth, verified, wrap(async (req, res) => res.json(await statsFor(req.user.id))));

/* ------------------------------ offline use ------------------------------ */
// Questions the app keeps on the device so it works without internet.
const OFFLINE_PRACTICE = Number(process.env.OFFLINE_PRACTICE ?? 200); // per subject
const OFFLINE_SETS = Number(process.env.OFFLINE_SETS ?? 5); // newest sets per level
const OFFLINE_DAYS = 30; // the app must go online at least this often
const fullItems = (items) => items.map((it) => ({
  subject: it.subject, topic: it.topic, question: it.question, passage: it.passage || '', choices: it.choices,
  answer: it.answer, explanation: it.explanation || '',
}));

// Offline use is a Premium feature.
const premiumOnly = wrap(async (req, res, next) => {
  if (hasPremium(req.user, await getSettings())) return next();
  res.status(402).json({ error: 'Para sa Premium lang ang offline na paggamit.', code: 'premium' });
});

app.get('/api/offline/pack', auth, verified, premiumOnly, wrap(async (req, res) => {
  const st = await getSettings();
  const practice = {};
  await Promise.all(Object.keys(SUBJECTS).map(async (subject) => {
    const level = subject === 'clerical' ? 'subpro' : 'pro';
    const parts = await Promise.all([100, OFFLINE_PRACTICE - 100].filter((n) => n > 0).map((count) => buildExam('practice', { subject, count, level })));
    practice[subject] = fullItems(parts.flatMap((p) => p.items));
  }));
  const setsOut = [];
  for (const mode of Object.keys(EXAMS)) {
    const rows = await db.all('SELECT * FROM exam_sets WHERE mode = ? ORDER BY number DESC LIMIT ?', mode, OFFLINE_SETS);
    // Set 1 is always on the device too, next to the newest sets.
    if (!rows.some((r) => r.number === 1)) rows.push(...(await db.all('SELECT * FROM exam_sets WHERE mode = ? AND number = 1', mode)));
    rows.forEach((r) => setsOut.push({ id: r.id, mode, number: r.number, title: r.title, created_at: r.created_at, items: fullItems(JSON.parse(r.items)) }));
  }
  // How long the app may stay offline: until Premium ends, at most OFFLINE_DAYS.
  const limit = Date.now() + OFFLINE_DAYS * 864e5;
  const paidOnly = req.user.role !== 'admin' && st.premium_required === '1';
  const valid_until = paidOnly ? Math.min(limit, req.user.premium_until || 0) : limit;
  res.json({ user_id: req.user.id, created_at: Date.now(), premium: true, valid_until, practice, sets: setsOut });
}));

// Save exams that were taken offline. Each one has a client_id so it is saved only once.
function offlineItems(items, max = 100) {
  if (!Array.isArray(items) || !items.length || items.length > max) return null;
  const out = [];
  for (const it of items) {
    if (!it || !SUBJECTS[it.subject] || typeof it.question !== 'string' || !Array.isArray(it.choices) || it.choices.length !== 4) return null;
    const answer = Number(it.answer);
    if (!Number.isInteger(answer) || answer < 0 || answer > 3) return null;
    out.push({ subject: it.subject, topic: String(it.topic || '').slice(0, 80), question: it.question.slice(0, 4000), passage: String(it.passage || '').slice(0, 8000),
      choices: it.choices.map((c) => String(c).slice(0, 1000)), answer, explanation: String(it.explanation || '').slice(0, 4000) });
  }
  return out;
}

app.post('/api/offline/sync', auth, verified, premiumOnly, wrap(async (req, res) => {
  const list = Array.isArray(req.body.attempts) ? req.body.attempts.slice(0, 50) : [];
  const st = await getSettings();
  const saved = {}, rejected = {};
  for (const x of list) {
    const cid = String(x.client_id || '').slice(0, 64);
    if (!cid) continue;
    const dup = await db.get('SELECT id FROM attempts WHERE user_id = ? AND client_id = ?', req.user.id, cid);
    if (dup) { saved[cid] = dup.id; continue; }
    const mode = EXAMS[x.mode] ? x.mode : 'practice';
    const started = Math.min(Number(x.started_at) || Date.now(), Date.now());
    let items, title, setId = null, limit = Math.max(0, Number(x.time_limit_sec) || 0);
    if (mode !== 'practice') {
      // Mock exams count only if the user had Premium when they took it.
      const allowed = hasPremium(req.user, st) || (req.user.premium_until || 0) >= started;
      if (!allowed) { rejected[cid] = 'premium'; continue; }
      limit = EXAMS[mode].minutes * 60;
      if (x.set_id) {
        const set = await db.get('SELECT * FROM exam_sets WHERE id = ? AND mode = ?', Number(x.set_id), mode);
        if (!set) { rejected[cid] = 'set'; continue; }
        items = JSON.parse(set.items); title = set.title; setId = set.id;
      } else {
        // "Bagong halo" mock exam made on the device from the saved questions.
        items = offlineItems(x.items, EXAMS[mode].items);
        if (!items) { rejected[cid] = 'items'; continue; }
        title = EXAMS[mode].title;
      }
    } else {
      items = offlineItems(x.items);
      if (!items) { rejected[cid] = 'items'; continue; }
      title = String(x.title || 'Practice').slice(0, 120);
    }
    const answers = cleanAnswers(x.answers, items.length);
    const { score, breakdown } = grade(items, answers);
    let finished = Math.min(Number(x.finished_at) || Date.now(), Date.now());
    if (finished < started) finished = started;
    if (limit) finished = Math.min(finished, started + limit * 1000 + 60000);
    const r = await db.run(`INSERT INTO attempts (user_id, mode, title, items, answers, time_limit_sec, started_at, finished_at, score, total, breakdown, set_id, client_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, req.user.id, mode, title, JSON.stringify(items), JSON.stringify(answers), limit, started, finished,
      score, items.length, JSON.stringify(breakdown), setId, cid);
    saved[cid] = r.lastInsertRowid;
    if (mode !== 'practice') mail.result(req.user.email, req.user.name, { title, score, total: items.length }, breakdown, SUBJECTS);
  }
  res.json({ saved, rejected });
}));

/* ------------------------------ premium & payments ------------------------------ */
app.get('/api/premium', auth, wrap(async (req, res) => {
  const st = await getSettings();
  // If the user just came back from the PayMongo checkout, check it now (in case the webhook is late).
  let user = req.user;
  if (paymongo.enabled) {
    const open = await db.all(`SELECT * FROM payments WHERE user_id = ? AND provider = 'paymongo' AND status = 'checkout' ORDER BY id DESC LIMIT 3`, user.id);
    for (const p of open) await syncCheckout(p).catch((e) => console.error('PayMongo check failed:', e.message));
    if (open.length) user = await db.get('SELECT * FROM users WHERE id = ?', user.id);
  }
  const payments = await db.all(`SELECT id, amount, method, reference, status, note, created_at, decided_at, provider, (proof IS NOT NULL) AS has_proof,
    CASE WHEN status = 'checkout' THEN checkout_url END AS checkout_url FROM payments
    WHERE user_id = ? AND NOT (provider = 'xendit' AND status = 'checkout') ORDER BY created_at DESC LIMIT 20`, user.id);
  res.json({
    required: st.premium_required === '1', active: hasPremium(user, st), until: user.premium_until || 0, online: onlinePayOn(st),
    manual: manualPayOn(st), methods: manualPayOn(st) ? payMethods(st).filter((m) => m.on) : [],
    price: st.price, plan_days: Number(st.plan_days) || 30, note: st.pay_note, payments,
  });
}));

// QR code of a manual payment account (for scanning in GCash, Maya, a bank app...). Not secret, so no login needed.
app.get('/api/pay/qr/:id', wrap(async (req, res) => {
  const row = await db.get('SELECT value FROM meta WHERE key = ?', 'qr:' + String(req.params.id).replace(/[^a-z0-9_-]/gi, ''));
  const m = row && /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(row.value);
  if (!m) return res.status(404).json({ error: 'Not found' });
  res.set('Cache-Control', 'no-cache').type(m[1]).send(Buffer.from(m[2], 'base64'));
}));

/* Online payments (PayMongo): checkout page, then the webhook turns on Premium. */
const publicUrl = (req) => (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
const METHOD_NAMES = { gcash: 'GCash', paymaya: 'Maya', card: 'Card', grab_pay: 'GrabPay', qrph: 'QR Ph', shopee_pay: 'ShopeePay', billease: 'BillEase', dob: 'BPI Online', dob_ubp: 'UnionBank Online' };

// Mark an online payment as paid and add the plan days to the user's Premium. Safe to call more than once.
async function markPaid(p, method) {
  const r = await db.run(`UPDATE payments SET status = 'approved', method = ?, decided_at = ? WHERE id = ? AND status IN ('checkout', 'expired')`,
    String(method || 'Online').slice(0, 40), Date.now(), p.id);
  if (r.changes !== 1) return false; // already done
  const days = Number(p.days) || Number((await getSettings()).plan_days) || 30;
  await db.run('UPDATE users SET premium_until = MAX(premium_until, ?) + ? WHERE id = ?', Date.now(), days * 864e5, p.user_id);
  const u = await db.get('SELECT * FROM users WHERE id = ?', p.user_id);
  if (u) mail.payment(u.email, u.name, 'approved', u.premium_until);
  return true;
}

// Read the checkout from PayMongo (never trust the webhook body alone) and update our record.
async function syncCheckout(p) {
  if (!p.invoice_id) return;
  const cs = await paymongo.getCheckout(p.invoice_id);
  const at = cs.attributes || {};
  if (at.reference_number !== p.reference) return;
  const paid = (at.payments || []).filter((x) => x.attributes && x.attributes.status === 'paid');
  if (paid.length) {
    const cents = paid.reduce((n, x) => n + Number(x.attributes.amount || 0), 0);
    if (cents < Math.round(Number(p.amount) * 100)) { console.error(`PayMongo checkout ${cs.id}: paid ${cents / 100}, expected ${p.amount}`); return; }
    const type = at.payment_method_used || (paid[0].attributes.source && paid[0].attributes.source.type) || '';
    await markPaid(p, METHOD_NAMES[type] || type || 'Online');
  } else if (at.status === 'expired') {
    await db.run(`UPDATE payments SET status = 'expired', decided_at = ? WHERE id = ? AND status = 'checkout'`, Date.now(), p.id);
  }
}

app.post('/api/payments/checkout', auth, verified, wrap(async (req, res) => {
  const st = await getSettings();
  if (!onlinePayOn(st)) return res.status(404).json({ error: 'Hindi pa naka-set up ang online na bayad.' });
  const amount = Number(st.price);
  // PayMongo's smallest payment is ₱20.
  if (!(amount >= 20)) return res.status(400).json({ error: 'Kailangang ₱20 o higit pa ang presyo ng Premium. Makipag-ugnayan sa admin.' });
  // Reuse an unpaid checkout from the last 23 hours (the link lasts 24 hours).
  const open = await db.get(`SELECT * FROM payments WHERE user_id = ? AND provider = 'paymongo' AND status = 'checkout' AND created_at > ? ORDER BY id DESC LIMIT 1`,
    req.user.id, Date.now() - 23 * 3600e3);
  if (open && Number(open.amount) === amount && open.checkout_url) return res.json({ url: open.checkout_url });
  if (limited('checkout:' + req.user.id, 10, 60 * 60 * 1000)) return res.status(429).json({ error: 'Masyadong maraming subok. Maghintay muna.' });
  const days = Number(st.plan_days) || 30;
  const reference = `cse-${req.user.id}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  let cs;
  try {
    cs = await paymongo.createCheckout({
      reference, amount, email: req.user.email, name: req.user.name,
      description: `CSE Reviewer Premium (${days} araw)`, returnUrl: publicUrl(req) + '/#/premium',
    });
  } catch (e) {
    console.error('PayMongo checkout failed:', e.message);
    return res.status(502).json({ error: 'Hindi mabuksan ang bayaran ngayon. Subukan ulit mamaya.' });
  }
  const url = cs.attributes.checkout_url;
  await db.run(`INSERT INTO payments (user_id, amount, method, reference, status, provider, invoice_id, checkout_url, days, created_at)
    VALUES (?, ?, 'Online', ?, 'checkout', 'paymongo', ?, ?, ?, ?)`, req.user.id, String(amount), reference, cs.id, url, days, Date.now());
  res.json({ url });
}));

// PayMongo calls this when a checkout is paid. Add it in PayMongo → Developers → Webhooks
// with the event "checkout_session.payment.paid".
app.post('/api/payments/paymongo/webhook', wrap(async (req, res) => {
  if (!paymongo.webhookReady) return res.status(503).json({ error: 'PayMongo is not set up' });
  if (!paymongo.checkSignature(req.get('paymongo-signature'), req.rawBody)) return res.status(401).json({ error: 'Invalid signature' });
  const ev = (req.body && req.body.data && req.body.data.attributes) || {};
  const csId = String((ev.data && ev.data.id) || '');
  if (ev.type === 'checkout_session.payment.paid' && csId) {
    const p = await db.get(`SELECT * FROM payments WHERE provider = 'paymongo' AND invoice_id = ?`, csId);
    if (p) await syncCheckout(p); // unknown checkouts are accepted and ignored
  }
  res.json({ ok: true });
}));

// Manual payment: the user sends money to one of the admin's accounts, then sends the reference number
// and (optional) a screenshot of the receipt. The admin checks it and approves it.
const proofOk = (s) => typeof s === 'string' && s.length <= 1500000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s);
app.post('/api/payments', auth, verified, wrap(async (req, res) => {
  const st = await getSettings();
  if (st.pay_manual_on === '0') return res.status(403).json({ error: 'Naka-off ang manual na bayad. Gamitin ang online na bayad.' });
  const methods = payMethods(st).filter((m) => m.on);
  const m = methods.find((x) => x.id === req.body.method_id) || (!req.body.method_id && methods[0]);
  if (!m) return res.status(400).json({ error: 'Piliin ang paraan ng bayad.' });
  const reference = String(req.body.reference || '').trim().slice(0, 60);
  if (reference.length < 4) return res.status(400).json({ error: 'Ilagay ang reference number ng bayad.' });
  const proof = req.body.proof ? String(req.body.proof) : null;
  if (proof && !proofOk(proof)) return res.status(400).json({ error: 'Hindi mabasa ang larawan ng resibo. Subukan ang ibang larawan.' });
  if (limited('pay:' + req.user.id, 5, 60 * 60 * 1000)) return res.status(429).json({ error: 'Masyadong marami nang naipadala. Hintayin ang sagot ng admin.' });
  if (await db.get(`SELECT 1 FROM payments WHERE user_id = ? AND status = 'pending'`, req.user.id)) {
    return res.status(409).json({ error: 'May nakabinbin ka pang bayad na hinihintay ma-check.' });
  }
  const p = { amount: String(req.body.amount || st.price).slice(0, 20), method: m.name, reference };
  await db.run('INSERT INTO payments (user_id, amount, method, reference, created_at, proof) VALUES (?, ?, ?, ?, ?, ?)', req.user.id, p.amount, p.method, p.reference, Date.now(), proof);
  const admins = await db.all(`SELECT email FROM users WHERE role = 'admin' AND disabled = 0`);
  admins.forEach((a) => mail.newPayment(a.email, req.user, p));
  res.json({ ok: true });
}));

/* ------------------------------ admin ------------------------------ */
app.get('/api/admin/overview', admin, wrap(async (req, res) => {
  const one = async (sql) => Object.values(await db.get(sql))[0];
  res.json({
    users: await one('SELECT COUNT(*) FROM users'),
    newUsers7d: await one(`SELECT COUNT(*) FROM users WHERE created_at >= datetime('now','-7 days')`),
    attempts: await one('SELECT COUNT(*) FROM attempts WHERE finished_at IS NOT NULL'),
    mockAttempts: await one(`SELECT COUNT(*) FROM attempts WHERE finished_at IS NOT NULL AND mode != 'practice'`),
    passed: await one(`SELECT COUNT(*) FROM attempts WHERE finished_at IS NOT NULL AND mode != 'practice' AND score * 100.0 / total >= 80`),
    avgMock: await one(`SELECT ROUND(AVG(score * 100.0 / total), 1) FROM attempts WHERE finished_at IS NOT NULL AND mode != 'practice'`),
    questions: await db.all('SELECT subject, COUNT(*) AS n FROM questions WHERE active = 1 GROUP BY subject'),
    premiumUsers: await one(`SELECT COUNT(*) FROM users WHERE premium_until > ${Date.now()}`),
    pendingPayments: await one(`SELECT COUNT(*) FROM payments WHERE status = 'pending'`),
    mail: { enabled: mail.enabled, provider: mail.provider, verify: REQUIRE_VERIFY },
  });
}));

app.get('/api/admin/users', admin, wrap(async (req, res) => {
  const q = `%${String(req.query.q || '').trim()}%`;
  res.json(await db.all(`SELECT u.id, u.name, u.email, u.role, u.disabled, u.created_at, u.email_verified, u.premium_until,
      (SELECT COUNT(*) FROM attempts a WHERE a.user_id = u.id AND a.finished_at IS NOT NULL) AS attempts,
      (SELECT ROUND(AVG(score * 100.0 / total), 1) FROM attempts a WHERE a.user_id = u.id AND a.finished_at IS NOT NULL AND a.mode != 'practice') AS avg_mock,
      (SELECT MAX(started_at) FROM attempts a WHERE a.user_id = u.id) AS last_active
    FROM users u WHERE u.name LIKE ? OR u.email LIKE ? ORDER BY u.created_at DESC LIMIT 500`, q, q));
}));

app.patch('/api/admin/users/:id', admin, wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'Hindi mo mababago ang sarili mong role o status dito.' });
  if (req.body.role !== undefined) await db.run('UPDATE users SET role = ? WHERE id = ?', req.body.role === 'admin' ? 'admin' : 'user', id);
  if (req.body.disabled !== undefined) {
    await db.run('UPDATE users SET disabled = ? WHERE id = ?', req.body.disabled ? 1 : 0, id);
    if (req.body.disabled) await db.run('DELETE FROM sessions WHERE user_id = ?', id);
  }
  if (req.body.premium_days !== undefined) {
    const days = Number(req.body.premium_days);
    const u = await db.get('SELECT premium_until FROM users WHERE id = ?', id);
    const until = days > 0 ? Math.max(Date.now(), u?.premium_until || 0) + days * 864e5 : 0;
    await db.run('UPDATE users SET premium_until = ? WHERE id = ?', until, id);
  }
  if (req.body.email_verified !== undefined) await db.run('UPDATE users SET email_verified = ? WHERE id = ?', req.body.email_verified ? 1 : 0, id);
  res.json({ ok: true });
}));

app.post('/api/admin/users/:id/password', admin, wrap(async (req, res) => {
  const pw = String(req.body.password || '');
  if (pw.length < 8) return res.status(400).json({ error: 'Ang password ay dapat may 8 characters o higit pa.' });
  const { salt, hash } = hashPassword(pw);
  await db.run('UPDATE users SET pass_hash = ?, salt = ? WHERE id = ?', hash, salt, Number(req.params.id));
  await db.batch([['DELETE FROM sessions WHERE user_id = ?', [Number(req.params.id)]], ['DELETE FROM devices WHERE user_id = ?', [Number(req.params.id)]]]);
  res.json({ ok: true });
}));

app.delete('/api/admin/users/:id', admin, wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'Hindi mo mabubura ang sarili mong account.' });
  await db.batch([['DELETE FROM payments WHERE user_id = ?', [id]], ['DELETE FROM attempts WHERE user_id = ?', [id]], ['DELETE FROM sessions WHERE user_id = ?', [id]], ['DELETE FROM devices WHERE user_id = ?', [id]], ['DELETE FROM users WHERE id = ?', [id]]]);
  res.json({ ok: true });
}));

app.post('/api/admin/users/:id/report', admin, wrap(async (req, res) => {
  const u = await db.get('SELECT * FROM users WHERE id = ?', Number(req.params.id));
  if (!u) return res.status(404).json({ error: 'Walang ganitong user.' });
  const r = await mail.report(u.email, u.name, await statsFor(u.id), SUBJECTS);
  if (!r.ok) return res.status(502).json({ error: 'Hindi naipadala ang email. I-check ang email settings.' });
  res.json({ ok: true, logged: !!r.logged });
}));

app.get('/api/admin/payments', admin, wrap(async (req, res) => {
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
  res.json(await db.all(`SELECT p.id, p.user_id, p.amount, p.method, p.reference, p.status, p.note, p.created_at, p.decided_at, p.provider,
      (p.proof IS NOT NULL) AS has_proof, u.name, u.email, u.premium_until FROM payments p JOIN users u ON u.id = p.user_id
    WHERE p.status = ? ORDER BY p.created_at DESC LIMIT 200`, status));
}));

app.get('/api/admin/payments/:id/proof', admin, wrap(async (req, res) => {
  const p = await db.get('SELECT proof FROM payments WHERE id = ?', Number(req.params.id));
  if (!p || !p.proof) return res.status(404).json({ error: 'Walang larawan ng resibo.' });
  res.json({ proof: p.proof });
}));

app.post('/api/admin/payments/:id', admin, wrap(async (req, res) => {
  const p = await db.get('SELECT * FROM payments WHERE id = ?', Number(req.params.id));
  if (!p) return res.status(404).json({ error: 'Walang ganitong bayad.' });
  if (p.status !== 'pending') return res.status(409).json({ error: 'Na-check na ang bayad na ito.' });
  const approve = req.body.action === 'approve';
  const note = String(req.body.note || '').slice(0, 300);
  const u = await db.get('SELECT * FROM users WHERE id = ?', p.user_id);
  let until = u?.premium_until || 0;
  const stmts = [['UPDATE payments SET status = ?, note = ?, decided_at = ? WHERE id = ?', [approve ? 'approved' : 'rejected', note, Date.now(), p.id]]];
  if (approve && u) {
    const days = Number(req.body.days) || Number((await getSettings()).plan_days) || 30;
    until = Math.max(Date.now(), until) + days * 864e5;
    stmts.push(['UPDATE users SET premium_until = ? WHERE id = ?', [until, u.id]]);
  }
  await db.batch(stmts);
  if (u) mail.payment(u.email, u.name, approve ? 'approved' : 'rejected', until, note);
  res.json({ ok: true, until });
}));

const adminSettings = async () => { const st = await getSettings(); return { ...st, pay_methods: payMethods(st), online_ready: paymongo.enabled }; };
app.get('/api/admin/settings', admin, wrap(async (req, res) => res.json(await adminSettings())));
app.put('/api/admin/settings', admin, wrap(async (req, res) => {
  const body = { ...req.body };
  if (body.pay_methods !== undefined) {
    const qr = new Set((await db.all(`SELECT key FROM meta WHERE key LIKE 'qr:%'`)).map((r) => r.key.slice(3)));
    const list = payMethods({ pay_methods: JSON.stringify(Array.isArray(body.pay_methods) ? body.pay_methods : []) }).map((m) => ({ ...m, has_qr: qr.has(m.id) }));
    body.pay_methods = JSON.stringify(list);
  }
  const stmts = Object.keys(SETTING_DEFAULTS).filter((k) => body[k] !== undefined)
    .map((k) => [`INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, ['set:' + k, String(body[k]).slice(0, LONG_SETTINGS[k] || 500)]]);
  if (stmts.length) await db.batch(stmts);
  res.json(await adminSettings());
}));
// Upload (data URL) or remove (empty) the QR code of a manual payment account.
app.put('/api/admin/pay-qr/:id', admin, wrap(async (req, res) => {
  const id = String(req.params.id).replace(/[^a-z0-9_-]/gi, '').slice(0, 30);
  const data = req.body.data ? String(req.body.data) : '';
  if (data && !proofOk(data)) return res.status(400).json({ error: 'Hindi mabasa ang larawan. Gumamit ng PNG o JPG.' });
  if (data) await db.run(`INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, 'qr:' + id, data);
  else await db.run('DELETE FROM meta WHERE key = ?', 'qr:' + id);
  const st = await getSettings();
  const list = payMethods(st).map((m) => (m.id === id ? { ...m, has_qr: !!data } : m));
  await db.run(`INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, 'set:pay_methods', JSON.stringify(list));
  res.json({ ok: true, has_qr: !!data });
}));

app.get('/api/admin/sets', admin, wrap(async (req, res) => {
  res.json(await db.all(`SELECT s.id, s.mode, s.number, s.title, s.created_at,
    (SELECT COUNT(*) FROM attempts a WHERE a.set_id = s.id AND a.finished_at IS NOT NULL) AS taken
    FROM exam_sets s ORDER BY s.mode, s.number DESC`));
}));
app.post('/api/admin/sets', admin, wrap(async (req, res) => {
  if (!EXAMS[req.body.mode]) return res.status(400).json({ error: 'Piliin ang Professional o Subprofessional.' });
  res.json(await sets.createSet(req.body.mode));
}));
app.delete('/api/admin/sets/:id', admin, wrap(async (req, res) => {
  await db.run('DELETE FROM exam_sets WHERE id = ?', Number(req.params.id));
  res.json({ ok: true });
}));

app.get('/api/admin/users/:id/attempts', admin, wrap(async (req, res) => {
  const rows = await db.all('SELECT * FROM attempts WHERE user_id = ? ORDER BY started_at DESC LIMIT 100', Number(req.params.id));
  res.json(rows.map((a) => attemptView(a, false)));
}));

function validQuestion(b) {
  const choices = Array.isArray(b.choices) ? b.choices.map((c) => String(c).trim()) : [];
  const answer = Number(b.answer);
  if (!SUBJECTS[b.subject]) return 'Piliin ang subject.';
  if (!String(b.question || '').trim()) return 'Ilagay ang tanong.';
  if (choices.length !== 4 || choices.some((c) => !c)) return 'Kailangan ng apat (4) na pagpipilian.';
  if (new Set(choices).size !== 4) return 'Hindi dapat magkapareho ang mga pagpipilian.';
  if (!(answer >= 0 && answer < 4)) return 'Piliin ang tamang sagot.';
  return null;
}
const qParams = (b) => [b.subject, String(b.topic || '').trim(), ['pro', 'subpro'].includes(b.level) ? b.level : 'both', String(b.question).trim(),
  JSON.stringify(b.choices.map((c) => String(c).trim())), Number(b.answer), String(b.explanation || '').trim(), String(b.passage || '').trim()];

app.get('/api/admin/questions', admin, wrap(async (req, res) => {
  const where = ['active = 1'];
  const args = [];
  if (SUBJECTS[req.query.subject]) { where.push('subject = ?'); args.push(req.query.subject); }
  if (req.query.q) { where.push('(question LIKE ? OR topic LIKE ?)'); args.push(`%${req.query.q}%`, `%${req.query.q}%`); }
  const page = Math.max(0, Number(req.query.page) || 0);
  const total = (await db.get(`SELECT COUNT(*) AS n FROM questions WHERE ${where.join(' AND ')}`, ...args)).n;
  const rows = await db.all(`SELECT * FROM questions WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT 50 OFFSET ?`, ...args, page * 50);
  res.json({ total, page, rows: rows.map((r) => ({ ...r, choices: JSON.parse(r.choices) })) });
}));

app.post('/api/admin/questions', admin, wrap(async (req, res) => {
  const err = validQuestion(req.body);
  if (err) return res.status(400).json({ error: err });
  const r = await db.run(`INSERT INTO questions (subject, topic, level, question, choices, answer, explanation, passage, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'admin')`, ...qParams(req.body));
  res.json({ id: r.lastInsertRowid });
}));

app.put('/api/admin/questions/:id', admin, wrap(async (req, res) => {
  const err = validQuestion(req.body);
  if (err) return res.status(400).json({ error: err });
  await db.run(`UPDATE questions SET subject = ?, topic = ?, level = ?, question = ?, choices = ?, answer = ?, explanation = ?, passage = ?, source = 'admin' WHERE id = ?`,
    ...qParams(req.body), Number(req.params.id));
  res.json({ ok: true });
}));

app.delete('/api/admin/questions/:id', admin, wrap(async (req, res) => {
  // Hide instead of hard delete, so a bank update does not bring it back.
  await db.run(`UPDATE questions SET active = 0, source = 'admin' WHERE id = ?`, Number(req.params.id));
  res.json({ ok: true });
}));

app.post('/api/admin/questions/import', admin, wrap(async (req, res) => {
  const list = Array.isArray(req.body) ? req.body : req.body.questions;
  if (!Array.isArray(list)) return res.status(400).json({ error: 'Dapat JSON array ng mga tanong.' });
  const INS = `INSERT INTO questions (subject, topic, level, question, choices, answer, explanation, passage, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'admin')`;
  const stmts = [];
  let added = 0; const errors = [];
  list.slice(0, 2000).forEach((b, i) => {
    const err = validQuestion(b);
    if (err) errors.push(`#${i + 1}: ${err}`); else { stmts.push([INS, qParams(b)]); added++; }
  });
  for (let i = 0; i < stmts.length; i += 200) await db.batch(stmts.slice(i, i + 200));
  res.json({ added, errors: errors.slice(0, 20) });
}));

app.get('/api/admin/attempts', admin, wrap(async (req, res) => {
  const rows = await db.all(`SELECT a.id, a.mode, a.title, a.score, a.total, a.started_at, a.finished_at, u.name, u.email
    FROM attempts a JOIN users u ON u.id = a.user_id WHERE a.finished_at IS NOT NULL ORDER BY a.finished_at DESC LIMIT 200`);
  res.json(rows);
}));

/* --------------------------- app updates --------------------------- */
// The screens' version changes whenever public/ changes (a new deploy). The website's service worker
// and the phone app use it to download the new screens in the background and switch at a safe time.
const WEB_VERSION = web.versionOf();
const SW_JS = fs.readFileSync(path.join(web.DIR, 'sw.js'), 'utf8').replaceAll('__VERSION__', WEB_VERSION);
const bundles = new Map(); // server address -> zip
app.get('/sw.js', (req, res) => {
  res.set('Cache-Control', 'no-cache').type('application/javascript').send(SW_JS);
});
app.get('/api/app/update', (req, res) => {
  res.set('Cache-Control', 'no-cache').json({ version: WEB_VERSION, url: `/api/app/bundle/${WEB_VERSION}.zip` });
});
app.get('/api/app/bundle/:file', (req, res) => {
  if (req.params.file !== `${WEB_VERSION}.zip`) return res.status(404).json({ error: 'Not found' });
  const api = `${req.protocol}://${req.get('host')}`;
  if (!bundles.has(api)) bundles.set(api, web.zip(api));
  res.set('Cache-Control', 'public, max-age=31536000, immutable').type('application/zip').send(bundles.get(api));
});

/* ------------------------------ ads ------------------------------ */
// Google AdSense checks this file on the website. It is made from the AdSense ID in Admin → Settings → Ads.
app.get('/ads.txt', wrap(async (req, res) => {
  const pub = /pub-\d{10,20}/.exec((await getSettings()).adsense_client || '');
  res.type('text/plain').send(pub ? `google.com, ${pub[0]}, DIRECT, f08c47fec0942fa0\n` : '');
}));

/* ------------------------------ static ------------------------------ */
app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'], maxAge: '10m' }));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

// Clean expired sessions every hour.
setInterval(() => db.run('DELETE FROM sessions WHERE expires_at < ?', Date.now()), 3600e3).unref();

// Prepare the database before serving requests.
app.ready = (async () => {
  await db.init();
  const seeded = await seed();
  if (seeded) console.log(`Loaded ${seeded} built-in questions.`);
  await createAdminFromEnv();
  await sets.ensureSets();
})();
// Render's free plan puts the server to sleep after 15 minutes without visitors, and the next visit
// then waits about a minute. Visiting our own public address every 10 minutes keeps it awake
// (one always-on service fits in Render's 750 free hours a month). Turn off with KEEP_AWAKE=0.
if (process.env.RENDER_EXTERNAL_URL && process.env.KEEP_AWAKE !== '0') {
  setInterval(() => fetch(process.env.RENDER_EXTERNAL_URL + '/api/meta').catch(() => {}), 10 * 60e3).unref();
}
// Publish a new exam set automatically when the latest one is older than SET_INTERVAL_DAYS.
setInterval(() => sets.ensureSets().catch((e) => console.error('Exam set error:', e)), 3600e3).unref();

if (require.main === module) {
  app.ready.then(() => app.listen(PORT, () => console.log(`CSE Reviewer running on http://localhost:${PORT}`)))
    .catch((e) => { console.error('Database setup failed:', e); process.exit(1); });
}
module.exports = app;
