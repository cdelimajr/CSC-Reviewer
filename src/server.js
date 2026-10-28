const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const db = require('./db');
const { seed } = require('./seed');
const { SUBJECTS, EXAMS } = require('./blueprint');
const { buildExam, grade } = require('./exam');
const { versionOf } = require('./bank');

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const SESSION_DAYS = 30;


/* ------------------------------ helpers ------------------------------ */
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') };
}
function checkPassword(password, user) {
  const h = crypto.scryptSync(password, user.salt, 64);
  return crypto.timingSafeEqual(h, Buffer.from(user.pass_hash, 'hex'));
}
const publicUser = (u) => u && { id: u.id, name: u.name, email: u.email, role: u.role, created_at: u.created_at };
const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 200;

async function createAdminFromEnv() {
  if (!ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) return;
  const u = await db.get('SELECT * FROM users WHERE email = ?', ADMIN_EMAIL);
  if (!u) {
    const { salt, hash } = hashPassword(process.env.ADMIN_PASSWORD);
    await db.run(`INSERT INTO users (name, email, pass_hash, salt, role) VALUES (?, ?, ?, ?, 'admin')`, 'Admin', ADMIN_EMAIL, hash, salt);
    console.log(`Admin account created for ${ADMIN_EMAIL}`);
  } else if (u.role !== 'admin') {
    await db.run(`UPDATE users SET role = 'admin' WHERE id = ?`, u.id);
  }
}

async function newSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  await db.run('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)', sha(token), userId, Date.now() + SESSION_DAYS * 864e5);
  res.cookie('sid', token, { httpOnly: true, sameSite: 'lax', secure: res.req.secure, maxAge: SESSION_DAYS * 864e5, path: '/' });
}
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
app.use(express.json({ limit: '2mb' }));

app.use(async (req, res, next) => {
  const token = readCookie(req, 'sid');
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
const wrap = (fn) => async (req, res) => { try { await fn(req, res); } catch (e) { console.error(e); if (!res.headersSent) res.status(500).json({ error: 'May nangyaring error. Subukan ulit.' }); } };

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
  const r = await db.run('INSERT INTO users (name, email, pass_hash, salt, role) VALUES (?, ?, ?, ?, ?)', name, email, hash, salt, role);
  await newSession(res, r.lastInsertRowid);
  res.json({ user: publicUser(await db.get('SELECT * FROM users WHERE id = ?', r.lastInsertRowid)) });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (limited('login:' + req.ip + email, 10)) return res.status(429).json({ error: 'Masyadong maraming subok. Maghintay ng 10 minuto.' });
  const u = await db.get('SELECT * FROM users WHERE email = ?', email);
  if (!u || !checkPassword(String(req.body.password || ''), u)) return res.status(401).json({ error: 'Mali ang email o password.' });
  if (u.disabled) return res.status(403).json({ error: 'Naka-disable ang account na ito. Makipag-ugnayan sa admin.' });
  await newSession(res, u.id);
  res.json({ user: publicUser(u) });
}));

app.post('/api/auth/logout', async (req, res) => {
  const token = readCookie(req, 'sid');
  if (token) await db.run('DELETE FROM sessions WHERE token = ?', sha(token));
  res.clearCookie('sid', { path: '/' });
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => res.json({ user: publicUser(req.user) || null }));

app.post('/api/me/password', auth, wrap(async (req, res) => {
  const { current, password } = req.body;
  if (!checkPassword(String(current || ''), req.user)) return res.status(400).json({ error: 'Mali ang kasalukuyang password.' });
  if (String(password || '').length < 8) return res.status(400).json({ error: 'Ang bagong password ay dapat may 8 characters o higit pa.' });
  const { salt, hash } = hashPassword(String(password));
  await db.run('UPDATE users SET pass_hash = ?, salt = ? WHERE id = ?', hash, salt, req.user.id);
  res.json({ ok: true });
}));

app.get('/api/meta', (req, res) => res.json({ subjects: SUBJECTS, exams: EXAMS }));

// Public list of active questions, used by the offline version to update itself when online.
app.get('/api/public/questions', wrap(async (req, res) => {
  const rows = await db.all('SELECT * FROM questions WHERE active = 1 ORDER BY id');
  const questions = rows.map((r) => {
    const choices = JSON.parse(r.choices);
    return { s: r.subject, t: r.topic, l: r.level, q: r.question, a: choices[r.answer], d: choices.filter((_, i) => i !== r.answer), e: r.explanation, p: r.passage };
  });
  res.set('Access-Control-Allow-Origin', '*').set('Cache-Control', 'no-store');
  res.json({ version: versionOf(questions), count: questions.length, questions });
}));

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

app.post('/api/attempts', auth, wrap(async (req, res) => {
  const mode = EXAMS[req.body.mode] ? req.body.mode : 'practice';
  const ex = await buildExam(mode, req.body);
  if (!ex.items.length) return res.status(400).json({ error: 'Wala pang tanong para dito.' });
  const r = await db.run(`INSERT INTO attempts (user_id, mode, title, items, time_limit_sec, started_at, total) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    req.user.id, mode, ex.title, JSON.stringify(ex.items), ex.timeLimitSec, Date.now(), ex.items.length);
  res.json(attemptView(await db.get('SELECT * FROM attempts WHERE id = ?', r.lastInsertRowid)));
}));

app.get('/api/attempts', auth, wrap(async (req, res) => {
  const rows = await db.all('SELECT * FROM attempts WHERE user_id = ? ORDER BY started_at DESC LIMIT 100', req.user.id);
  res.json(rows.map((a) => attemptView(a, false)));
}));

app.get('/api/attempts/:id', auth, wrap(async (req, res) => {
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

app.put('/api/attempts/:id/answers', auth, wrap(async (req, res) => {
  const a = await getOwnAttempt(req);
  if (!a || a.user_id !== req.user.id) return res.status(404).json({ error: 'Hindi makita ang exam.' });
  if (a.finished_at) return res.status(409).json({ error: 'Tapos na ang exam na ito.' });
  await db.run('UPDATE attempts SET answers = ? WHERE id = ?', JSON.stringify(cleanAnswers(req.body.answers, a.total)), a.id);
  res.json({ ok: true });
}));

app.post('/api/attempts/:id/submit', auth, wrap(async (req, res) => {
  const a = await getOwnAttempt(req);
  if (!a || a.user_id !== req.user.id) return res.status(404).json({ error: 'Hindi makita ang exam.' });
  if (!a.finished_at) {
    const answers = req.body.answers ? cleanAnswers(req.body.answers, a.total) : JSON.parse(a.answers || '{}');
    const { score, breakdown } = grade(JSON.parse(a.items), answers);
    let finished = Date.now();
    if (a.time_limit_sec) finished = Math.min(finished, a.started_at + a.time_limit_sec * 1000 + 60000);
    await db.run('UPDATE attempts SET answers = ?, score = ?, breakdown = ?, finished_at = ? WHERE id = ?',
      JSON.stringify(answers), score, JSON.stringify(breakdown), finished, a.id);
  }
  res.json(attemptView(await db.get('SELECT * FROM attempts WHERE id = ?', a.id)));
}));

app.delete('/api/attempts/:id', auth, wrap(async (req, res) => {
  await db.run('DELETE FROM attempts WHERE id = ? AND user_id = ?', Number(req.params.id), req.user.id);
  res.json({ ok: true });
}));

app.get('/api/stats', auth, wrap(async (req, res) => {
  const rows = await db.all('SELECT mode, score, total, breakdown, finished_at FROM attempts WHERE user_id = ? AND finished_at IS NOT NULL ORDER BY finished_at', req.user.id);
  const subj = {};
  for (const r of rows) {
    for (const [s, b] of Object.entries(JSON.parse(r.breakdown || '{}'))) {
      const x = (subj[s] ||= { correct: 0, total: 0 });
      x.correct += b.correct; x.total += b.total;
    }
  }
  const mocks = rows.filter((r) => r.mode !== 'practice').map((r) => ({ mode: r.mode, pct: Math.round((r.score / r.total) * 1000) / 10, at: r.finished_at }));
  res.json({ attempts: rows.length, subjects: subj, mocks });
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
  });
}));

app.get('/api/admin/users', admin, wrap(async (req, res) => {
  const q = `%${String(req.query.q || '').trim()}%`;
  res.json(await db.all(`SELECT u.id, u.name, u.email, u.role, u.disabled, u.created_at,
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
  await db.batch([['DELETE FROM attempts WHERE user_id = ?', [id]], ['DELETE FROM sessions WHERE user_id = ?', [id]], ['DELETE FROM users WHERE id = ?', [id]]]);
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
app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'], maxAge: '1h' }));
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
})();

if (require.main === module) {
  app.ready.then(() => app.listen(PORT, () => console.log(`CSE Reviewer running on http://localhost:${PORT}`)))
    .catch((e) => { console.error('Database setup failed:', e); process.exit(1); });
}
module.exports = app;
