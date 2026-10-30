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
  pay_note: 'Ipadala ang bayad sa GCash number sa itaas, tapos ilagay ang reference number dito.',
  // Free plan (only when Premium is turned on): online only, with these limits.
  free_practice_daily: '3', free_practice_items: '20', free_sets: '1',
};
async function getSettings() {
  const rows = await db.all(`SELECT key, value FROM meta WHERE key LIKE 'set:%'`);
  const out = { ...SETTING_DEFAULTS };
  rows.forEach((r) => { out[r.key.slice(4)] = r.value; });
  return out;
}
const hasPremium = (u, st) => u.role === 'admin' || st.premium_required !== '1' || (u.premium_until || 0) > Date.now();
const freeLimits = (st) => ({
  practice_daily: Math.max(0, Number(st.free_practice_daily) || 0),
  practice_items: Math.max(5, Number(st.free_practice_items) || 20),
  sets: Math.max(0, Number(st.free_sets) || 0),
});
// Start of today in the Philippines (UTC+8), for the daily practice limit.
const phDayStart = () => { const n = Date.now() + 8 * 3600e3; return n - (n % 864e5) - 8 * 3600e3; };
const practiceToday = async (userId) => (await db.get(`SELECT COUNT(*) AS n FROM attempts WHERE user_id = ? AND mode = 'practice' AND started_at >= ?`, userId, phDayStart())).n;

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
app.use(express.json({ limit: '4mb' }));

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
  ]);
  res.json({ ok: true });
}));

app.get('/api/me', wrap(async (req, res) => {
  const st = await getSettings();
  res.json({
    user: publicUser(req.user) || null,
    config: { verify: REQUIRE_VERIFY, mail: mail.enabled, premium_required: st.premium_required === '1', free: freeLimits(st) },
    premium: req.user ? hasPremium(req.user, st) : false,
    practice_today: req.user ? await practiceToday(req.user.id) : 0,
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
function attemptView(a, full = true) {
  const items = JSON.parse(a.items);
  const done = !!a.finished_at;
  const practice = a.mode === 'practice';
  const out = {
    id: a.id, mode: a.mode, title: a.title, total: a.total, score: a.score, time_limit_sec: a.time_limit_sec,
    started_at: a.started_at, finished_at: a.finished_at, breakdown: a.breakdown ? JSON.parse(a.breakdown) : null,
    passing: EXAMS[a.mode]?.passing || 80, now: Date.now(),
  };
  if (full) { out.items = clientItems(items, done || practice); out.answers = JSON.parse(a.answers || '{}'); }
  return out;
}
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
  res.json(attemptView(a));
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
  res.json(attemptView(await db.get('SELECT * FROM attempts WHERE id = ?', a.id)));
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
  const payments = await db.all('SELECT id, amount, method, reference, status, note, created_at, decided_at FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', req.user.id);
  res.json({
    required: st.premium_required === '1', active: hasPremium(req.user, st), until: req.user.premium_until || 0,
    price: st.price, plan_days: Number(st.plan_days) || 30, method: st.pay_method, pay_name: st.pay_name, pay_number: st.pay_number, note: st.pay_note, payments,
  });
}));

app.post('/api/payments', auth, verified, wrap(async (req, res) => {
  const reference = String(req.body.reference || '').trim().slice(0, 60);
  if (reference.length < 4) return res.status(400).json({ error: 'Ilagay ang reference number ng bayad.' });
  if (limited('pay:' + req.user.id, 5, 60 * 60 * 1000)) return res.status(429).json({ error: 'Masyadong marami nang naipadala. Hintayin ang sagot ng admin.' });
  if (await db.get(`SELECT 1 FROM payments WHERE user_id = ? AND status = 'pending'`, req.user.id)) {
    return res.status(409).json({ error: 'May nakabinbin ka pang bayad na hinihintay ma-check.' });
  }
  const st = await getSettings();
  const p = { amount: String(req.body.amount || st.price).slice(0, 20), method: st.pay_method || 'GCash', reference };
  await db.run('INSERT INTO payments (user_id, amount, method, reference, created_at) VALUES (?, ?, ?, ?, ?)', req.user.id, p.amount, p.method, p.reference, Date.now());
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
  await db.run('DELETE FROM sessions WHERE user_id = ?', Number(req.params.id));
  res.json({ ok: true });
}));

app.delete('/api/admin/users/:id', admin, wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'Hindi mo mabubura ang sarili mong account.' });
  await db.batch([['DELETE FROM payments WHERE user_id = ?', [id]], ['DELETE FROM attempts WHERE user_id = ?', [id]], ['DELETE FROM sessions WHERE user_id = ?', [id]], ['DELETE FROM users WHERE id = ?', [id]]]);
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
  res.json(await db.all(`SELECT p.*, u.name, u.email, u.premium_until FROM payments p JOIN users u ON u.id = p.user_id
    WHERE p.status = ? ORDER BY p.created_at DESC LIMIT 200`, status));
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

app.get('/api/admin/settings', admin, wrap(async (req, res) => res.json(await getSettings())));
app.put('/api/admin/settings', admin, wrap(async (req, res) => {
  const stmts = Object.keys(SETTING_DEFAULTS).filter((k) => req.body[k] !== undefined)
    .map((k) => [`INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, ['set:' + k, String(req.body[k]).slice(0, 500)]]);
  if (stmts.length) await db.batch(stmts);
  res.json(await getSettings());
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
