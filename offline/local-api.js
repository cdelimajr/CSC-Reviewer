/* Offline backend: runs the same API as the server, but inside the browser.
   Data is saved in this browser's localStorage. Used only by the offline test build. */
(function () {
  'use strict';
  // Must be defined before the exam module loads. The exam builder reads questions through this tiny "db".
  __define('./db', {
    all: async (sql, subject, level) => load().questions.filter((q) => q.active && q.subject === subject && (q.level === 'both' || q.level === level)),
  });

  const { SUBJECTS, EXAMS } = __require('./blueprint');
  const { shuffle } = __require('./generators');
  const { buildExam, grade } = __require('./exam');
  const KEY = 'cse-offline-db-v1';
  const SKEY = 'cse-offline-session';

  /* ---------- storage ---------- */
  let mem = null;
  function load() {
    if (mem) return mem;
    try { mem = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { mem = null; }
    if (!mem) {
      mem = { seq: { users: 0, questions: 0, attempts: 0 }, users: [], questions: [], attempts: [] };
      const add = (x, subject) => {
        const choices = shuffle([x.a, ...x.d]);
        mem.questions.push({ id: ++mem.seq.questions, subject: x.s || subject, topic: x.t || '', level: x.l || 'both', question: x.q,
          choices: JSON.stringify(choices), answer: choices.indexOf(x.a), explanation: x.e || '', passage: x.p || '', source: 'seed', active: 1, created_at: now() });
      };
      __require('./bank-general').forEach((x) => add(x, 'general'));
      __require('./bank-verbal').forEach((x) => add(x, 'verbal'));
      save();
    }
    return mem;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { console.warn('Hindi ma-save:', e); }
  }
  const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
  const currentUser = () => {
    let id = null;
    try { id = Number(localStorage.getItem(SKEY)); } catch { /* ignore */ }
    const u = load().users.find((x) => x.id === id);
    return u && !u.disabled ? u : null;
  };
  const setSession = (id) => { try { id ? localStorage.setItem(SKEY, String(id)) : localStorage.removeItem(SKEY); } catch { /* ignore */ } };

  async function hash(pw, salt) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pw));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  const randSalt = () => [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const publicUser = (u) => u && { id: u.id, name: u.name, email: u.email, role: u.role, created_at: u.created_at };
  const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
  const fail = (status, msg) => { throw new HttpError(status, msg); };

  function attemptView(a, full = true) {
    const done = !!a.finished_at;
    const out = { id: a.id, mode: a.mode, title: a.title, total: a.total, score: a.score, time_limit_sec: a.time_limit_sec,
      started_at: a.started_at, finished_at: a.finished_at, breakdown: a.breakdown, passing: EXAMS[a.mode]?.passing || 80, now: Date.now() };
    if (full) {
      const reveal = done || a.mode === 'practice';
      out.items = a.items.map((it) => ({ subject: it.subject, topic: it.topic, question: it.question, passage: it.passage || '', choices: it.choices,
        ...(reveal ? { answer: it.answer, explanation: it.explanation } : {}) }));
      out.answers = a.answers;
    }
    return out;
  }
  function cleanAnswers(raw, total) {
    const out = {};
    for (const [k, v] of Object.entries(raw || {})) {
      const i = Number(k), c = Number(v);
      if (Number.isInteger(i) && i >= 0 && i < total && Number.isInteger(c) && c >= 0 && c < 4) out[i] = c;
    }
    return out;
  }
  function validQuestion(b) {
    const choices = Array.isArray(b.choices) ? b.choices.map((c) => String(c).trim()) : [];
    if (!SUBJECTS[b.subject]) return 'Piliin ang subject.';
    if (!String(b.question || '').trim()) return 'Ilagay ang tanong.';
    if (choices.length !== 4 || choices.some((c) => !c)) return 'Kailangan ng apat (4) na pagpipilian.';
    if (new Set(choices).size !== 4) return 'Hindi dapat magkapareho ang mga pagpipilian.';
    if (!(Number(b.answer) >= 0 && Number(b.answer) < 4)) return 'Piliin ang tamang sagot.';
    return null;
  }
  const qFields = (b) => ({ subject: b.subject, topic: String(b.topic || '').trim(), level: ['pro', 'subpro'].includes(b.level) ? b.level : 'both',
    question: String(b.question).trim(), choices: JSON.stringify(b.choices.map((c) => String(c).trim())), answer: Number(b.answer),
    explanation: String(b.explanation || '').trim(), passage: String(b.passage || '').trim() });
  const finished = (a) => a.finished_at != null;
  const avg = (arr) => (arr.length ? Math.round((arr.reduce((x, y) => x + y, 0) / arr.length) * 10) / 10 : null);

  /* ---------- routes ---------- */
  async function handle(method, path, query, body) {
    const db = load();
    const me = currentUser();
    const needUser = () => me || fail(401, 'Kailangan mong mag-login.');
    const needAdmin = () => (me && me.role === 'admin') || fail(403, 'Para sa admin lamang.');
    const findAttempt = (id) => db.attempts.find((a) => a.id === Number(id) && (a.user_id === me.id || me.role === 'admin')) || fail(404, 'Hindi makita ang exam.');
    let m;

    if (method === 'GET' && path === '/api/me') return { user: publicUser(me) };
    if (method === 'GET' && path === '/api/meta') return { subjects: SUBJECTS, exams: EXAMS };

    if (method === 'POST' && path === '/api/auth/register') {
      const name = String(body.name || '').trim().slice(0, 80);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!name) fail(400, 'Ilagay ang iyong pangalan.');
      if (!isEmail(email)) fail(400, 'Ilagay ang wastong email.');
      if (password.length < 8) fail(400, 'Ang password ay dapat may hindi bababa sa 8 characters.');
      if (db.users.some((u) => u.email === email)) fail(409, 'May account na ang email na ito. Mag-login na lang.');
      const salt = randSalt();
      const u = { id: ++db.seq.users, name, email, salt, pass_hash: await hash(password, salt), role: db.users.some((x) => x.role === 'admin') ? 'user' : 'admin', disabled: 0, created_at: now() };
      db.users.push(u); save(); setSession(u.id);
      return { user: publicUser(u) };
    }
    if (method === 'POST' && path === '/api/auth/login') {
      const u = db.users.find((x) => x.email === String(body.email || '').trim().toLowerCase());
      if (!u || (await hash(String(body.password || ''), u.salt)) !== u.pass_hash) fail(401, 'Mali ang email o password.');
      if (u.disabled) fail(403, 'Naka-disable ang account na ito. Makipag-ugnayan sa admin.');
      setSession(u.id);
      return { user: publicUser(u) };
    }
    if (method === 'POST' && path === '/api/auth/logout') { setSession(null); return { ok: true }; }
    if (method === 'POST' && path === '/api/me/password') {
      needUser();
      if ((await hash(String(body.current || ''), me.salt)) !== me.pass_hash) fail(400, 'Mali ang kasalukuyang password.');
      if (String(body.password || '').length < 8) fail(400, 'Ang bagong password ay dapat may 8 characters o higit pa.');
      me.salt = randSalt(); me.pass_hash = await hash(String(body.password), me.salt); save();
      return { ok: true };
    }

    /* attempts */
    if (method === 'POST' && path === '/api/attempts') {
      needUser();
      const mode = EXAMS[body.mode] ? body.mode : 'practice';
      const ex = await buildExam(mode, body);
      if (!ex.items.length) fail(400, 'Wala pang tanong para dito.');
      const a = { id: ++db.seq.attempts, user_id: me.id, mode, title: ex.title, items: ex.items, answers: {}, time_limit_sec: ex.timeLimitSec,
        started_at: Date.now(), finished_at: null, score: null, total: ex.items.length, breakdown: null };
      db.attempts.push(a); save();
      return attemptView(a);
    }
    if (method === 'GET' && path === '/api/attempts') {
      needUser();
      return db.attempts.filter((a) => a.user_id === me.id).sort((x, y) => y.started_at - x.started_at).slice(0, 100).map((a) => attemptView(a, false));
    }
    if ((m = path.match(/^\/api\/attempts\/(\d+)$/))) {
      needUser();
      if (method === 'GET') return attemptView(findAttempt(m[1]));
      if (method === 'DELETE') { db.attempts = db.attempts.filter((a) => !(a.id === Number(m[1]) && a.user_id === me.id)); save(); return { ok: true }; }
    }
    if ((m = path.match(/^\/api\/attempts\/(\d+)\/answers$/)) && method === 'PUT') {
      needUser();
      const a = findAttempt(m[1]);
      if (a.user_id !== me.id) fail(404, 'Hindi makita ang exam.');
      if (finished(a)) fail(409, 'Tapos na ang exam na ito.');
      a.answers = cleanAnswers(body.answers, a.total); save();
      return { ok: true };
    }
    if ((m = path.match(/^\/api\/attempts\/(\d+)\/submit$/)) && method === 'POST') {
      needUser();
      const a = findAttempt(m[1]);
      if (a.user_id !== me.id) fail(404, 'Hindi makita ang exam.');
      if (!finished(a)) {
        a.answers = body.answers ? cleanAnswers(body.answers, a.total) : a.answers;
        const g = grade(a.items, a.answers);
        a.score = g.score; a.breakdown = g.breakdown;
        a.finished_at = a.time_limit_sec ? Math.min(Date.now(), a.started_at + a.time_limit_sec * 1000 + 60000) : Date.now();
        save();
      }
      return attemptView(a);
    }
    if (method === 'GET' && path === '/api/stats') {
      needUser();
      const rows = db.attempts.filter((a) => a.user_id === me.id && finished(a)).sort((x, y) => x.finished_at - y.finished_at);
      const subjects = {};
      rows.forEach((r) => Object.entries(r.breakdown || {}).forEach(([s, b]) => { const x = (subjects[s] ||= { correct: 0, total: 0 }); x.correct += b.correct; x.total += b.total; }));
      return { attempts: rows.length, subjects, mocks: rows.filter((r) => r.mode !== 'practice').map((r) => ({ mode: r.mode, pct: Math.round((r.score / r.total) * 1000) / 10, at: r.finished_at })) };
    }

    /* admin */
    if (path.startsWith('/api/admin/')) needAdmin();
    const done = db.attempts.filter(finished);
    const mocks = done.filter((a) => a.mode !== 'practice');
    if (method === 'GET' && path === '/api/admin/overview') {
      const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().replace('T', ' ').slice(0, 19);
      const counts = {};
      db.questions.filter((q) => q.active).forEach((q) => (counts[q.subject] = (counts[q.subject] || 0) + 1));
      return { users: db.users.length, newUsers7d: db.users.filter((u) => u.created_at >= weekAgo).length, attempts: done.length, mockAttempts: mocks.length,
        passed: mocks.filter((a) => (a.score * 100) / a.total >= 80).length, avgMock: avg(mocks.map((a) => (a.score * 100) / a.total)),
        questions: Object.entries(counts).sort().map(([subject, n]) => ({ subject, n })) };
    }
    if (method === 'GET' && path === '/api/admin/users') {
      const q = String(query.get('q') || '').toLowerCase();
      return db.users.filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.includes(q)).sort((x, y) => (x.created_at < y.created_at ? 1 : -1)).map((u) => {
        const mine = db.attempts.filter((a) => a.user_id === u.id);
        return { id: u.id, name: u.name, email: u.email, role: u.role, disabled: u.disabled, created_at: u.created_at, attempts: mine.filter(finished).length,
          avg_mock: avg(mine.filter((a) => finished(a) && a.mode !== 'practice').map((a) => (a.score * 100) / a.total)),
          last_active: mine.length ? Math.max(...mine.map((a) => a.started_at)) : null };
      });
    }
    if ((m = path.match(/^\/api\/admin\/users\/(\d+)$/))) {
      const id = Number(m[1]);
      if (id === me.id) fail(400, method === 'DELETE' ? 'Hindi mo mabubura ang sarili mong account.' : 'Hindi mo mababago ang sarili mong role o status dito.');
      const u = db.users.find((x) => x.id === id) || fail(404, 'Walang ganitong user.');
      if (method === 'PATCH') {
        if (body.role !== undefined) u.role = body.role === 'admin' ? 'admin' : 'user';
        if (body.disabled !== undefined) u.disabled = body.disabled ? 1 : 0;
        save(); return { ok: true };
      }
      if (method === 'DELETE') { db.users = db.users.filter((x) => x.id !== id); db.attempts = db.attempts.filter((a) => a.user_id !== id); save(); return { ok: true }; }
    }
    if ((m = path.match(/^\/api\/admin\/users\/(\d+)\/password$/)) && method === 'POST') {
      const u = db.users.find((x) => x.id === Number(m[1])) || fail(404, 'Walang ganitong user.');
      if (String(body.password || '').length < 8) fail(400, 'Ang password ay dapat may 8 characters o higit pa.');
      u.salt = randSalt(); u.pass_hash = await hash(String(body.password), u.salt); save();
      return { ok: true };
    }
    if ((m = path.match(/^\/api\/admin\/users\/(\d+)\/attempts$/))) {
      return db.attempts.filter((a) => a.user_id === Number(m[1])).sort((x, y) => y.started_at - x.started_at).map((a) => attemptView(a, false));
    }
    if (method === 'GET' && path === '/api/admin/questions') {
      const subject = query.get('subject'); const q = String(query.get('q') || '').toLowerCase(); const page = Math.max(0, Number(query.get('page')) || 0);
      const rows = db.questions.filter((x) => x.active && (!SUBJECTS[subject] || x.subject === subject) && (!q || x.question.toLowerCase().includes(q) || x.topic.toLowerCase().includes(q)))
        .sort((x, y) => y.id - x.id);
      return { total: rows.length, page, rows: rows.slice(page * 50, page * 50 + 50).map((r) => ({ ...r, choices: JSON.parse(r.choices) })) };
    }
    if (method === 'POST' && path === '/api/admin/questions') {
      const err = validQuestion(body); if (err) fail(400, err);
      const q = { id: ++db.seq.questions, ...qFields(body), source: 'admin', active: 1, created_at: now() };
      db.questions.push(q); save(); return { id: q.id };
    }
    if ((m = path.match(/^\/api\/admin\/questions\/(\d+)$/))) {
      const q = db.questions.find((x) => x.id === Number(m[1])) || fail(404, 'Walang ganitong tanong.');
      if (method === 'PUT') { const err = validQuestion(body); if (err) fail(400, err); Object.assign(q, qFields(body), { source: 'admin' }); save(); return { ok: true }; }
      if (method === 'DELETE') { q.active = 0; q.source = 'admin'; save(); return { ok: true }; }
    }
    if (method === 'POST' && path === '/api/admin/questions/import') {
      const list = Array.isArray(body) ? body : body.questions;
      if (!Array.isArray(list)) fail(400, 'Dapat JSON array ng mga tanong.');
      let added = 0; const errors = [];
      list.slice(0, 2000).forEach((b, i) => {
        const err = validQuestion(b);
        if (err) errors.push(`#${i + 1}: ${err}`);
        else { db.questions.push({ id: ++db.seq.questions, ...qFields(b), source: 'admin', active: 1, created_at: now() }); added++; }
      });
      save(); return { added, errors: errors.slice(0, 20) };
    }
    if (method === 'GET' && path === '/api/admin/attempts') {
      return done.sort((x, y) => y.finished_at - x.finished_at).slice(0, 200).map((a) => {
        const u = db.users.find((x) => x.id === a.user_id) || { name: '(nabura)', email: '' };
        return { id: a.id, mode: a.mode, title: a.title, score: a.score, total: a.total, started_at: a.started_at, finished_at: a.finished_at, name: u.name, email: u.email };
      });
    }
    fail(404, 'Not found');
  }

  // Route the app's fetch('/api/...') calls to the offline backend.
  const realFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = async (url, opts = {}) => {
    const u = new URL(url, 'http://offline.local');
    if (!u.pathname.startsWith('/api/')) return realFetch(url, opts);
    let status = 200, data;
    try {
      data = await handle((opts.method || 'GET').toUpperCase(), u.pathname, u.searchParams, opts.body ? JSON.parse(opts.body) : {});
    } catch (e) {
      status = e.status || 500; data = { error: e.status ? e.message : 'May nangyaring error: ' + e.message };
      if (!e.status) console.error(e);
    }
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  };

  window.cseOfflineReset = () => { localStorage.removeItem(KEY); localStorage.removeItem(SKEY); location.reload(); };
})();
