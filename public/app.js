/* CSE Reviewer front end (no build step). */
(() => {
  'use strict';
  const $app = document.getElementById('app');
  const LETTERS = ['A', 'B', 'C', 'D'];
  const APP_VERSION = '1.17.1'; // keep in step with package.json and docs/DOKUMENTASYON.md
  const S = { user: null, meta: null, exam: null, timer: null, saveT: null };

  /* ---------------- helpers ---------------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  // The website calls its own server. The phone/desktop apps set window.CSE_API (see config.js) and log in with a token.
  const API = String(window.CSE_API || '').replace(/\/$/, '');
  const IS_APP = !!API;

  /* Small wrapper around localStorage (it can be full or blocked). */
  const store = {
    get(k, def = null) { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  };
  const uk = (k) => `${k}-${S.user ? S.user.id : 0}`; // key for the logged-in user

  /* ---------------- language: Tagalog or English ----------------
     Every text on screen is written in both languages side by side: L('Tagalog', 'English').
     The choice is saved on this device, so it works offline and before login. Tagalog is the default.
     Only the app's own text changes. Exam questions, choices and explanations stay as they are. */
  const LANGS = [['tl', 'Tagalog'], ['en', 'English']];
  /* The language switch is a flag. The flag shows the language in use:
     Philippine flag = Tagalog, US flag = English. Tapping it switches to the other language. */
  const US_STARS = Array.from({ length: 20 }, (_, i) => `<circle cx="${7 + (i % 5) * 15}" cy="${6.5 + Math.floor(i / 5) * 13.5}" r="2.6"/>`).join('');
  const FLAG = {
    tl: '<svg viewBox="0 0 180 90" aria-hidden="true"><rect width="180" height="45" fill="#0038A8"/><rect y="45" width="180" height="45" fill="#CE1126"/>'
      + '<path d="M0 0L78 45 0 90z" fill="#fff"/><g fill="#FCD116"><circle cx="26" cy="45" r="9"/><circle cx="8" cy="9.5" r="3.3"/><circle cx="8" cy="80.5" r="3.3"/><circle cx="66" cy="45" r="3.3"/>'
      + '<path d="M26 29v32M10 45h32M14.7 33.7l22.6 22.6M14.7 56.3l22.6-22.6" stroke="#FCD116" stroke-width="2.4"/></g></svg>',
    en: '<svg viewBox="0 0 190 100" aria-hidden="true"><rect width="190" height="100" fill="#B22234"/>'
      + '<path d="M0 11.5h190M0 26.9h190M0 42.3h190M0 57.7h190M0 73.1h190M0 88.5h190" stroke="#fff" stroke-width="7.7"/>'
      + `<rect width="76" height="53.8" fill="#3C3B6E"/><g fill="#fff">${US_STARS}</g></svg>`,
  };
  const flagBtn = (cls = '') => {
    const tip = lang === 'en' ? 'English (tap for Tagalog)' : 'Tagalog (pindutin para sa English)';
    return `<button type="button" class="lang-flag ${cls}" data-lang="${lang === 'en' ? 'tl' : 'en'}" title="${tip}" aria-label="${tip}">${FLAG[lang]}</button>`;
  };
  let lang = store.get('cse-lang') === 'en' ? 'en' : 'tl';
  const L = (tl, en) => (lang === 'en' ? en : tl);
  const setHtmlLang = () => { document.documentElement.lang = lang === 'en' ? 'en' : 'fil'; };
  setHtmlLang();
  function setLang(l) {
    lang = l === 'en' ? 'en' : 'tl';
    store.set('cse-lang', lang);
    setHtmlLang();
    Prefs.touched();
    route();
  }
  // Messages from the server are in Tagalog. In English mode they are shown in English.
  const SERVER_EN = {
    'Kailangan mong mag-login.': 'Please log in.',
    'Para sa admin lamang.': 'For admins only.',
    'I-verify muna ang iyong email.': 'Please verify your email first.',
    'May nangyaring error. Subukan ulit.': 'Something went wrong. Please try again.',
    'Masyadong maraming subok. Maghintay muna ng ilang minuto.': 'Too many tries. Please wait a few minutes.',
    'Masyadong maraming subok. Maghintay ng 10 minuto.': 'Too many tries. Please wait 10 minutes.',
    'Masyadong maraming subok. Maghintay ng ilang minuto.': 'Too many tries. Please wait a few minutes.',
    'Masyadong maraming subok. Maghintay muna.': 'Too many tries. Please wait a while.',
    'Ilagay ang iyong pangalan.': 'Please enter your name.',
    'Ilagay ang wastong email.': 'Please enter a valid email.',
    'Ang password ay dapat may hindi bababa sa 8 characters.': 'The password must have at least 8 characters.',
    'Ang password ay dapat may 8 characters o higit pa.': 'The password must have 8 or more characters.',
    'Ang bagong password ay dapat may 8 characters o higit pa.': 'The new password must have 8 or more characters.',
    'May account na ang email na ito. Mag-login na lang.': 'This email already has an account. Please log in.',
    'Mali ang email o password.': 'Wrong email or password.',
    'Naka-disable ang account na ito. Makipag-ugnayan sa admin.': 'This account is disabled. Please contact the admin.',
    'Mali o expired na ang code. Humingi ng bagong code.': 'The code is wrong or expired. Ask for a new code.',
    'Mali o expired na ang code.': 'The code is wrong or expired.',
    'Naipadala na ang code. Maghintay ng ilang minuto bago humingi ulit.': 'The code was already sent. Wait a few minutes before asking again.',
    'Para sa Premium ang fingerprint/face login.': 'Fingerprint/face login is for Premium.',
    'Hindi na gumagana ang fingerprint/face login sa device na ito. Mag-login gamit ang password o code.': 'Fingerprint/face login no longer works on this device. Log in with your password or a code.',
    'Wala na ang account na ito.': 'This account no longer exists.',
    'Mali ang kasalukuyang password.': 'The current password is wrong.',
    'Kailangan ng Premium para sa exam set na ito.': 'This exam set needs Premium.',
    'Hindi makita ang exam set.': 'Exam set not found.',
    'Wala pang tanong para dito.': 'There are no questions for this yet.',
    'Hindi makita ang exam.': 'Exam not found.',
    'Tapos na ang exam na ito.': 'This exam is already finished.',
    'Para sa Premium lang ang offline na paggamit.': 'Offline use is for Premium only.',
    'Hindi pa naka-set up ang online na bayad.': 'Online payment is not set up yet.',
    'Kailangang ₱20 o higit pa ang presyo ng Premium. Makipag-ugnayan sa admin.': 'The Premium price must be ₱20 or more. Please contact the admin.',
    'Hindi mabuksan ang bayaran ngayon. Subukan ulit mamaya.': 'The payment page cannot open right now. Please try again later.',
    'Ilagay ang reference number ng bayad.': 'Enter the reference number of your payment.',
    'Masyadong marami nang naipadala. Hintayin ang sagot ng admin.': 'You have sent too many. Please wait for the admin to reply.',
    'May nakabinbin ka pang bayad na hinihintay ma-check.': 'You still have a payment waiting to be checked.',
    'Hindi mo mababago ang sarili mong role o status dito.': 'You cannot change your own role or status here.',
    'Hindi mo mabubura ang sarili mong account.': 'You cannot delete your own account.',
    'Walang ganitong user.': 'No such user.',
    'Hindi naipadala ang email. I-check ang email settings.': 'The email was not sent. Check the email settings.',
    'Walang ganitong bayad.': 'No such payment.',
    'Na-check na ang bayad na ito.': 'This payment was already checked.',
    'Piliin ang Professional o Subprofessional.': 'Choose Professional or Subprofessional.',
    'Dapat JSON array ng mga tanong.': 'It must be a JSON array of questions.',
    'Isang mock exam lang kada araw sa libreng plan. Bumalik bukas o kumuha ng Premium para walang limit.': 'One mock exam a day on the free plan. Come back tomorrow, or get Premium for no limit.',
    'Para sa Premium ang pag-email ng resulta.': 'Emailing the result is for Premium.',
    'Masyadong marami nang naipadala. Subukan ulit mamaya.': 'Too many sent. Please try again later.',
    'Hindi naipadala ang email. Subukan ulit mamaya.': 'The email was not sent. Please try again later.',
    'Naka-off ang manual na bayad. Gamitin ang online na bayad.': 'Manual payment is off. Please pay online.',
    'Piliin ang paraan ng bayad.': 'Choose a payment method.',
    'Hindi mabasa ang larawan ng resibo. Subukan ang ibang larawan.': 'The receipt picture cannot be read. Try another picture.',
    'Walang larawan ng resibo.': 'No receipt picture.',
    'Hindi mabasa ang larawan. Gumamit ng PNG o JPG.': 'The picture cannot be read. Use PNG or JPG.',
    'Na-logout ka dahil nag-login ang account mo sa ibang device. Isang device lang ang pwedeng naka-login.': 'You were logged out because your account logged in on another device. Only one device can be logged in at a time.',
    'Hindi mabubura ang Set 1. Ito ang libreng set na nasa Home ng lahat.': 'Set 1 cannot be deleted. It is the free set on everyone\'s Home.',
    'Masyadong malaki ang backup.': 'The backup is too big.',
    'Walang resibo para dito.': 'There is no receipt for this.',
  };
  const serverText = (m) => {
    if (lang !== 'en' || !m) return m;
    if (SERVER_EN[m]) return SERVER_EN[m];
    const d = /^Naubos mo na ang (\d+) libreng practice ngayong araw/.exec(m);
    if (d) return `You have used your ${d[1]} free practice sessions for today. Come back tomorrow, or get Premium for no limit.`;
    return m;
  };

  async function api(method, url, body) {
    // Logged in offline: log in online first (in the background), then make the call.
    if (S.offAuth && !url.startsWith('/api/auth/') && url !== '/api/meta') {
      if (navigator.onLine) await OffAuth.resume();
      if (S.offAuth) { setOffline(true); const e = new Error(L('Walang internet. Kailangan ng internet para dito.', 'No internet. This needs an internet connection.')); e.offline = true; throw e; }
    }
    let res;
    const headers = body ? { 'Content-Type': 'application/json' } : {};
    if (IS_APP) {
      headers['X-App'] = '1';
      const t = store.get('cse-token');
      if (t) headers.Authorization = 'Bearer ' + t;
    }
    try {
      res = await fetch(API + url, { method, headers, body: body ? JSON.stringify(body) : undefined, credentials: IS_APP ? 'omit' : 'same-origin' });
    } catch {
      setOffline(true);
      const e = new Error(L('Walang internet. Kailangan ng internet para dito.', 'No internet. This needs an internet connection.')); e.offline = true; throw e;
    }
    setOffline(false);
    let data = null;
    try { data = await res.json(); } catch { /* empty */ }
    if (data && data.token) store.set('cse-token', data.token);
    if (!res.ok) {
      const e = new Error(serverText(data && data.error) || L('May problema sa koneksyon.', 'There is a connection problem.')); e.status = res.status; e.code = data && data.code;
      if (e.code === 'replaced') endedElsewhere();
      throw e;
    }
    return data;
  }
  /* One login at a time: when the account logs in on another device, this device is logged out
     (the server ends the old session) and the login screen says why. */
  const ELSEWHERE = () => L('Na-logout ka dahil nag-login ang account mo sa ibang device. Isang device lang ang pwedeng naka-login sa isang account.',
    'You were logged out because your account logged in on another device. Only one device can be logged in to an account.');
  // Answers given so far stay on this device (saved on every tap), so nothing is lost.
  function endedElsewhere(note = ELSEWHERE()) {
    if (!S.user) return;
    Live.stop();
    clearTimeout(S.saveT); stopTimer();
    S.exam = null; document.onkeydown = null;
    store.del('cse-token'); store.del('cse-boot'); store.del('cse-offauth'); S.offAuth = null;
    S.user = null; S.authNote = note;
    Tour.stop();
    document.querySelectorAll('.modal-bg').forEach((m) => m.remove());
    setTimeout(() => go('#/login'));
  }
  /* Live logout: while logged in, the screen keeps one open line to the server (/api/session/live).
     When the account logs in on another device, the server tells this screen at once and it logs out
     within a second. As a backup (the line can drop on mobile data or while the app sleeps), the screen
     also asks /api/session when it comes back to the front, when the internet comes back, and every
     20 seconds while it is open. Same speed for Free and Premium: this is about account safety. */
  const Live = (() => {
    let ctl = null, retry = 0, retryT = 0, pollT = 0, lastCheck = 0, on = false;
    const headers = () => { const h = {}; if (IS_APP) { h['X-App'] = '1'; const t = store.get('cse-token'); if (t) h.Authorization = 'Bearer ' + t; } return h; };
    async function check(force) {
      if (!S.user || S.offAuth || S.offline && !force) return;
      if (!force && Date.now() - lastCheck < 1500) return;
      lastCheck = Date.now();
      try {
        const res = await fetch(API + '/api/session', { headers: headers(), credentials: IS_APP ? 'omit' : 'same-origin', cache: 'no-store' });
        if (res.status === 401) { const d = await res.json().catch(() => ({})); endedElsewhere(d.code === 'replaced' ? ELSEWHERE() : L('Na-logout ka. Mag-login ulit.', 'You were logged out. Please log in again.')); }
      } catch { /* offline: try again later */ }
    }
    async function connect() {
      clearTimeout(retryT);
      if (!on || ctl || !S.user || S.offAuth || !window.ReadableStream) return;
      const me = ctl = new AbortController();
      try {
        const res = await fetch(API + '/api/session/live', { headers: headers(), credentials: IS_APP ? 'omit' : 'same-origin', cache: 'no-store', signal: me.signal });
        if (res.status === 401) { ctl = null; return check(true); }
        if (!res.ok || !res.body) throw new Error('no stream');
        retry = 0;
        const rd = res.body.getReader(), dec = new TextDecoder();
        let buf = '';
        for (;;) {
          const { value, done } = await rd.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const m = /event: (\w+)/.exec(buf);
          if (m) { ctl = null; if (m[1] === 'replaced') endedElsewhere(); else check(true); return; }
          if (buf.length > 4096) buf = buf.slice(-200);
        }
      } catch { /* dropped or offline */ }
      if (ctl !== me) return; // stopped on purpose
      ctl = null;
      if (!on) return;
      check(true);
      retryT = setTimeout(connect, Math.min(30e3, 1000 * 2 ** retry++));
    }
    function start() {
      if (on) return;
      on = true; connect();
      clearInterval(pollT); pollT = setInterval(() => { if (!document.hidden) check(); }, 20e3);
    }
    function stop() { on = false; clearTimeout(retryT); clearInterval(pollT); if (ctl) { const c = ctl; ctl = null; c.abort(); } }
    const wake = () => { if (!on || document.hidden) return; check(); if (!ctl) connect(); };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('focus', wake);
    window.addEventListener('online', wake);
    window.addEventListener('pageshow', wake);
    document.addEventListener('resume', wake); // phone app back from the background
    return { sync: () => (S.user && !S.offAuth ? start() : stop()), stop, check };
  })();

  // GET that remembers the last answer, so the screen still works offline.
  async function cachedGet(url) {
    const key = uk('cse-c') + url;
    try { const d = await api('GET', url); store.set(key, d); return d; } catch (e) {
      const d = e.offline ? store.get(key) : null;
      if (d) return d;
      throw e;
    }
  }

  // Show the saved copy right away, then update the screen when the server answers ("no waiting").
  // urls: one URL or a list; paint gets the data (or a list of data) in the same order.
  async function swr(urls, paint, fallback) {
    const many = Array.isArray(urls), list = many ? urls : [urls];
    const keys = list.map((u) => uk('cse-c') + u), hash = location.hash;
    const old = keys.map((k) => store.get(k));
    const have = old.every((x) => x != null);
    const call = (d, again) => { S.keepScroll = again; try { paint(many ? d : d[0]); } finally { S.keepScroll = false; } };
    if (have) call(old, false);
    else if (!S.offline) shell(null, `<div class="empty">${L('Naglo-load…', 'Loading…')}</div>`);
    try {
      const fresh = await Promise.all(list.map((u) => api('GET', u)));
      fresh.forEach((d, i) => store.set(keys[i], d));
      if (location.hash === hash && !S.exam && JSON.stringify(fresh) !== JSON.stringify(old)) call(fresh, have);
    } catch (e) {
      if (have) return;
      if (e.offline && fallback) return call(list.map((_, i) => old[i] ?? fallback(i)), false);
      throw e;
    }
  }

  /* Premium is faster: the data behind the main screens is fetched ahead of time (when the app opens,
     comes back to the front, or a finger touches a menu link), so those screens open with fresh data
     and no "Loading…". Free uses the same saved copies, just without fetching ahead. */
  const PREFETCH = {
    home: () => ['/api/attempts', '/api/stats'], history: () => ['/api/attempts', '/api/stats'],
    sets: () => ['/api/sets?mode=' + myLevel()],
  };
  const warmAt = {};
  function prefetch(names) {
    if (!S.premium || !S.user || S.offline || S.offAuth || document.hidden) return;
    const urls = [...new Set(names.flatMap((n) => (PREFETCH[n] ? PREFETCH[n]() : [])))];
    urls.forEach((u) => {
      if (Date.now() - (warmAt[u] || 0) < 15e3) return;
      warmAt[u] = Date.now();
      api('GET', u).then((d) => store.set(uk('cse-c') + u, d)).catch(() => { warmAt[u] = 0; });
    });
  }
  const linkScreen = (href) => (href === '#/' ? 'home' : /^#\/history/.test(href) ? 'history' : /^#\/sets\//.test(href) ? 'sets' : null);
  document.addEventListener('pointerdown', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#/"]');
    const n = a && linkScreen(a.getAttribute('href'));
    if (n) prefetch([n]);
  }, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) prefetch(['home', 'sets']); });

  /* Offline: a small banner on top. Practice and downloaded exam sets keep working. */
  function setOffline(on) {
    if (!!S.offline === on) return;
    S.offline = on;
    let el = document.getElementById('offline');
    if (!on) { if (el) el.remove(); if (S.offAuth) OffAuth.resume(); syncSoon(); if (S.locked) route(); return; }
    if (el) return;
    el = document.createElement('div');
    el.id = 'offline';
    el.className = 'offline-bar';
    el.innerHTML = !S.user ? L('📡 <b>Walang internet.</b>', '📡 <b>No internet.</b>') : canOffline() ? L('📡 <b>Offline ka.</b> Gumagana pa rin ang lahat ng practice at mock exam. Ise-save online ang mga resulta mo kapag may internet na.',
      '📡 <b>You are offline.</b> All practice and mock exams still work. Your results will be saved online when the internet is back.')
      : L('📡 <b>Walang internet.</b> Para sa Premium lang ang offline na paggamit.', '📡 <b>No internet.</b> Offline use is for Premium only.');
    document.body.prepend(el);
    if (S.user && S.meta && !canOffline() && !S.exam) setTimeout(route);
  }
  window.addEventListener('offline', () => setOffline(true));
  window.addEventListener('online', () => { if (S.offAuth) OffAuth.resume(); syncSoon(); if (!S.meta) init(); });

  /* Exams taken offline are kept on the device until they are saved online. */
  const local = {
    all: () => store.get(uk('cse-local'), []),
    get: (id) => local.all().find((a) => a.id === id),
    save(a) { const list = local.all().filter((x) => x.id !== a.id); list.push(a); if (!store.set(uk('cse-local'), list)) toast(L('Puno na ang storage ng device.', 'The device storage is full.')); },
    del(id) { store.set(uk('cse-local'), local.all().filter((x) => x.id !== id)); },
  };
  const isLocal = (id) => String(id).startsWith('L');
  // Saved questions for offline use (Premium only), valid until Premium ends (max 30 days without going online).
  const pack = () => { const p = store.get(uk('cse-pack')); return p && S.user && p.user_id === S.user.id && (p.valid_until || 0) > Date.now() ? p : null; };
  const canOffline = () => !!(S.premium && pack());
  const isFree = () => !!(S.config && S.config.premium_required && !S.premium);

  async function refreshPack(force) {
    if (!S.user || (S.config.verify && !S.user.email_verified)) return;
    if (!S.premium) { store.del(uk('cse-pack')); return; }
    const p = pack();
    if (!force && p && Date.now() - p.created_at < 6 * 3600e3) return;
    try {
      const fresh = await api('GET', '/api/offline/pack');
      if (!store.set(uk('cse-pack'), fresh)) {
        // Not enough space: keep fewer practice questions.
        Object.keys(fresh.practice).forEach((k) => (fresh.practice[k] = fresh.practice[k].slice(0, 60)));
        store.set(uk('cse-pack'), fresh);
      }
    } catch { /* try again later */ }
  }

  // Send offline results to the server, then download fresh questions.
  let syncing = null, syncT = null;
  function syncSoon() { clearTimeout(syncT); syncT = setTimeout(() => syncNow(), 800); }
  async function syncNow() {
    if (syncing || !S.user || S.offAuth || (S.config.verify && !S.user.email_verified)) return syncing;
    syncing = (async () => {
      let n = 0;
      for (const p of store.get(uk('cse-psub'), [])) {
        try {
          await api('POST', `/api/attempts/${p.id}/submit`, { answers: p.answers, times: p.times });
          store.set(uk('cse-psub'), store.get(uk('cse-psub'), []).filter((x) => x.id !== p.id));
          store.del('cse-ans-' + p.id); n++;
        } catch (e) { if (e.offline) return; if (e.status === 404 || e.status === 409) store.set(uk('cse-psub'), store.get(uk('cse-psub'), []).filter((x) => x.id !== p.id)); }
      }
      const done = local.all().filter((a) => a.finished_at);
      if (done.length) {
        try {
          const r = await api('POST', '/api/offline/sync', { attempts: done });
          const map = store.get(uk('cse-map'), {});
          for (const [cid, id] of Object.entries(r.saved)) { map[cid] = id; local.del(cid); n++; }
          for (const cid of Object.keys(r.rejected)) local.del(cid);
          store.set(uk('cse-map'), map);
        } catch (e) { if (e.offline) return; }
      }
      if (n) toast(L(`Na-save na online ang ${n} exam na ginawa mo habang offline.`, `${n} exam(s) you took offline are now saved online.`));
      await sendMailQueue();
      await refreshPack();
    })().finally(() => { syncing = null; });
    return syncing;
  }

  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600);
    Sound.play('notify');
  }

  /* ---------------- sounds (all users) ----------------
     Short tunes made by the device itself (Web Audio), so there are no sound files to download
     and they work offline. Account → Sounds: on/off, volume, and the tone (Soft, Marimba, Retro). */
  const Sound = (() => {
    const KEY = 'cse-sound';
    const get = () => ({ on: true, vol: 0.5, theme: 'soft', ...(store.get(KEY) || {}) });
    const TONES = { soft: { wave: 'sine', tail: 0.18, gain: 1 }, marimba: { wave: 'triangle', tail: 0.08, gain: 1.2 }, retro: { wave: 'square', tail: 0.05, gain: 0.3 } };
    // [frequency (Hz), start (s), length (s)]
    const TUNES = {
      tap: [[1320, 0, 0.03]],
      correct: [[784, 0, 0.09], [1175, 0.08, 0.16]],
      wrong: [[330, 0, 0.12], [247, 0.11, 0.2]],
      finish: [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1047, 0.3, 0.3]],
      notify: [[988, 0, 0.06], [1319, 0.06, 0.12]],
      warn: [[880, 0, 0.12], [880, 0.22, 0.12]],
    };
    let ctx = null;
    function play(name) {
      const st = get();
      if (!st.on || !(st.vol > 0) || !TUNES[name]) return;
      try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        const tone = TONES[st.theme] || TONES.soft, t0 = ctx.currentTime + 0.01;
        const peak = Math.max(0.0002, st.vol * 0.22 * tone.gain * (name === 'tap' ? 0.45 : name === 'notify' ? 0.6 : 1));
        for (const [f, at, len] of TUNES[name]) {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = tone.wave; o.frequency.value = f;
          const start = t0 + at, end = start + len + tone.tail;
          g.gain.setValueAtTime(0.0001, start);
          g.gain.exponentialRampToValueAtTime(peak, start + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, end);
          o.connect(g); g.connect(ctx.destination);
          o.start(start); o.stop(end + 0.02);
        }
      } catch { /* no sound on this device */ }
    }
    // A page of paper being turned: a short rustle of noise that sweeps up, then a soft landing.
    // Made on the device like the other sounds, so it works offline. Follows the Sounds on/off and volume.
    let noise = null;
    function flip() {
      const st = get();
      if (!st.on || !(st.vol > 0)) return;
      try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        if (!noise) {
          noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.4), ctx.sampleRate);
          const d = noise.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / 37)); // a little grain
        }
        const t0 = ctx.currentTime + 0.005, v = Math.max(0.0002, st.vol * 0.5);
        const burst = (at, len, f0, f1, q, peak) => {
          const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
          src.buffer = noise; bp.type = 'bandpass'; bp.Q.value = q;
          bp.frequency.setValueAtTime(f0, t0 + at); bp.frequency.exponentialRampToValueAtTime(f1, t0 + at + len);
          g.gain.setValueAtTime(0.0001, t0 + at);
          g.gain.exponentialRampToValueAtTime(peak, t0 + at + len * 0.25);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + len);
          src.connect(bp); bp.connect(g); g.connect(ctx.destination);
          src.start(t0 + at, Math.random() * 0.1); src.stop(t0 + at + len + 0.02);
        };
        burst(0, 0.17, 1400, 4200, 0.9, v);          // the page sweeping over
        burst(0.12, 0.12, 900, 500, 0.7, v * 0.45);  // and landing
      } catch { /* no sound on this device */ }
    }
    // A very short buzz on Android phones when something is tapped (Account → Sounds → Vibrate).
    const buzz = (ms = 8) => { if (get().buzz !== false && navigator.vibrate) try { navigator.vibrate(ms); } catch { /* not allowed */ } };
    return { get, set: (v) => { store.set(KEY, { ...get(), ...v }); Prefs.touched(); }, play, flip, buzz, TONES };
  })();
  // A soft tap for buttons and menus. Exam choices have their own sounds (see choose()).
  const PRESS = '.btn, .seg button, .tabs button, .bottomnav a, .topbar a, .topbar button, .subject-btn, details.fold > summary, .navgrid button, .lvl-opt, .lang-flag, .choice, .list-item, .exam-card, .logout-btn';
  document.addEventListener('click', (e) => {
    const el = e.target.closest && e.target.closest(PRESS);
    if (el && !el.disabled && !el.classList.contains('choice')) Sound.play('tap');
  }, true);
  /* Every button and choice shows the tap: it dips and darkens while pressed, a ripple spreads from the
     finger, and Android phones give a tiny buzz. A quick tap still shows for a moment, so you can see it. */
  document.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    const el = e.target.closest && e.target.closest(PRESS);
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    el.classList.add('pressed'); el._pt = Date.now();
    const r = el.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2.2;
    const rp = document.createElement('span');
    rp.className = 'ripple';
    rp.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    el.appendChild(rp);
    setTimeout(() => rp.remove(), 520);
    if (e.pointerType === 'touch') Sound.buzz();
    const up = () => {
      setTimeout(() => el.classList.remove('pressed'), Math.max(0, 130 - (Date.now() - el._pt)));
      removeEventListener('pointerup', up, true); removeEventListener('pointercancel', up, true);
    };
    addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true);
  }, { passive: true });
  document.addEventListener('touchstart', () => {}, { passive: true }); // lets iPhone show :active

  /* ---------------- level: Professional or Subprofessional (shown everywhere, for every user) ----------------
     Free and Premium users have the same screens. What differs is what is open (all exam sets, full review,
     PDF/email/print, offline, quick login), not how the app looks. */
  const LEVELS = { pro: ['PRO', 'Professional'], subpro: ['SUBPRO', 'Subprofessional'] };
  const myLevel = () => (store.get(uk('cse-level')) === 'subpro' ? 'subpro' : 'pro');
  const setLevel = (lv) => { store.set(uk('cse-level'), lv === 'subpro' ? 'subpro' : 'pro'); Prefs.touched(); };
  const showLevel = () => !!S.user;
  // The level of an exam: from the mock exam itself, or from the practice title "Practice (Subpro): ...".
  const levelOf = (a) => (a && LEVELS[a.mode] ? a.mode : /^Practice \((Pro|Subpro)\)/.exec((a && a.title) || '')?.[1] === 'Subpro' ? 'subpro'
    : /^Practice \(Pro\)/.test((a && a.title) || '') ? 'pro' : null);
  const levelChip = (lv, cls = '') => (lv ? `<span class="lvl-chip ${lv} ${cls}" title="${LEVELS[lv][1]}">${LEVELS[lv][0]}</span>` : '');
  const setNo = (a) => (/Set (\d+)/.exec((a && a.title) || '') || [])[1];
  const setChip = (a) => (setNo(a) ? `<span class="set-chip">Set ${setNo(a)}</span>` : '');

  /* ---------------- files: save or share a PDF ----------------
     Website and Windows app: the browser's download (Save as). Android/iPhone app: the file is made on
     the phone and the share menu opens, to save it (Files, Drive) or open it in a PDF/print app. */
  const capPlugin = (name) => (window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform() && Capacitor.isPluginAvailable && Capacitor.isPluginAvailable(name)
    ? (Capacitor.Plugins[name] || Capacitor.registerPlugin(name)) : null);
  const toB64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  async function saveFile(name, bytes, mime) {
    if (window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
      const FS = capPlugin('Filesystem'), SH = capPlugin('Share');
      if (!FS || !SH) throw new Error(L('I-install ang bagong bersyon ng app (APK) para makapag-save ng PDF. Pwede mo munang i-email ang resulta.', 'Install the new version of the app (APK) to save a PDF. You can email the result for now.'));
      const r = await FS.writeFile({ path: name, data: toB64(bytes), directory: 'CACHE' });
      await SH.share({ title: name, url: r.uri, dialogTitle: name });
      return 'shared';
    }
    const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return 'saved';
  }
  // A picture from the phone or computer, made smaller (for receipts and QR codes).
  async function readImage(file, max = 1280, png = false) {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image(); img.src = url; await img.decode();
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.75);
    } finally { URL.revokeObjectURL(url); }
  }

  /* ---------------- ads (free plan only) ----------------
     Never for Premium, never during an exam or practice, never on Account, Premium or Admin.
     - Website: Google AdSense (Admin → Settings → Ads: publisher ID ca-pub-… and an ad unit ID).
     - Android app: Google AdMob banner (needs the ADMOB_APP_ID variable when the APK is built, and the banner ID in Admin).
     - Otherwise (Windows app, or no IDs yet): a small "Premium" card in the same spot. */
  const Ads = (() => {
    const PAGES = new Set(['home', 'practice', 'history']);
    let bannerOn = false, shownOnce = false, ready = null, scriptAdded = false;
    const cfg = () => (S.config && S.config.ads) || {};
    const on = () => !!(S.user && isFree() && cfg().on);
    const admob = () => (cfg().admob_banner ? capPlugin('AdMob') : null);
    function hide() {
      document.body.classList.remove('native-ad');
      const A = capPlugin('AdMob');
      if (A && bannerOn) { bannerOn = false; A.hideBanner().catch(() => {}); }
    }
    async function showBanner(A) {
      document.body.classList.add('native-ad');
      try {
        ready = ready || A.initialize({}).catch(() => {});
        await ready;
        if (!$('#adBox')) return hide();
        if (bannerOn) return;
        bannerOn = true;
        if (shownOnce) await A.resumeBanner();
        else { await A.showBanner({ adId: cfg().admob_banner, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 64 }); shownOnce = true; }
      } catch { bannerOn = false; document.body.classList.remove('native-ad'); }
    }
    function mount() {
      const box = $('#adBox');
      if (!box) return hide();
      const c = cfg(), A = admob();
      if (A) { box.classList.add('native'); return showBanner(A); }
      hide();
      if (!IS_APP && /^ca-pub-\d{10,20}$/.test(c.adsense_client || '') && /^\d{5,20}$/.test(c.adsense_slot || '') && navigator.onLine) {
        if (!scriptAdded) {
          scriptAdded = true;
          const sc = document.createElement('script');
          sc.async = true; sc.crossOrigin = 'anonymous';
          sc.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(c.adsense_client);
          document.head.appendChild(sc);
        }
        box.innerHTML = `<div class="ad-label">${L('Patalastas', 'Advertisement')}</div><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(c.adsense_client)}" data-ad-slot="${esc(c.adsense_slot)}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* blocked */ }
        return;
      }
      box.innerHTML = `<a class="house-ad" href="#/premium"><span class="ad-label">Premium</span>${L('⭐ <b>Walang ads sa Premium.</b> Lahat ng exam set, buong review na may paliwanag, PDF/print/email ng resulta, at gumagana offline. Kumuha ng Premium →',
        '⭐ <b>No ads with Premium.</b> All exam sets, full review with explanations, PDF/print/email of results, and works offline. Get Premium →')}</a>`;
    }
    return { slot: (active) => (on() && PAGES.has(active) ? '<div class="ad-box" id="adBox"></div>' : ''), mount, hide };
  })();
  const fmtTime = (sec) => {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
  };
  const fmtDur = (min) => {
    const h = Math.floor(min / 60), m = min % 60;
    if (lang === 'en') return h ? `${h} hr${h > 1 ? 's' : ''}${m ? ` ${m} min` : ''}` : `${m} min`;
    return h ? `${h} oras${m ? ` ${m} minuto` : ''}` : `${m} minuto`;
  };
  const fmtDate = (ms) => new Date(ms).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
  const subjName = (k) => (S.meta?.subjects[k]?.name) || k;
  const SUBJ_EN = {
    verbal: 'Vocabulary, grammar, analogy, reading comprehension (English and Filipino)',
    clerical: 'Filing, alphabetizing, spelling, data matching',
    general: '1987 Constitution, RA 6713, human rights, environment, peace',
  };
  const subjDesc = (k) => (lang === 'en' && SUBJ_EN[k]) || (S.meta?.subjects[k]?.desc) || '';
  const go = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };
  function stopTimer() { clearInterval(S.timer); S.timer = null; }
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function gradeLocal(items, answers) {
    const breakdown = {}; let score = 0;
    items.forEach((it, i) => {
      const b = (breakdown[it.subject] ||= { correct: 0, total: 0 }); b.total++;
      if (answers[i] !== undefined && Number(answers[i]) === it.answer) { b.correct++; score++; }
    });
    return { score, breakdown };
  }
  // Results saved on the device but not yet online, added to the list and stats from the server.
  function withLocal(list, stats) {
    const mine = local.all();
    const view = mine.map((a) => ({ ...a, passing: S.meta.exams[a.mode]?.passing || 80, items: undefined, pending: true }));
    list = [...view, ...(list || [])].sort((a, b) => (b.finished_at || b.started_at) - (a.finished_at || a.started_at));
    stats = JSON.parse(JSON.stringify(stats || { attempts: 0, subjects: {}, mocks: [] }));
    for (const a of mine.filter((x) => x.finished_at)) {
      stats.attempts++;
      for (const [k, b] of Object.entries(a.breakdown || {})) { const x = (stats.subjects[k] ||= { correct: 0, total: 0 }); x.correct += b.correct; x.total += b.total; }
      if (a.mode !== 'practice') stats.mocks.push({ mode: a.mode, pct: pct(a.score, a.total), at: a.finished_at });
    }
    stats.mocks.sort((a, b) => a.at - b.at);
    return { list, stats };
  }

  // A window on top of the screen. For screen readers: it is named by its first heading, the focus moves
  // into it, Esc closes it, and the focus goes back to the button that opened it.
  function modal(html, onMount) {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    const id = 'm' + Math.random().toString(36).slice(2, 8);
    bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="${id}">${html}</div>`;
    const back = document.activeElement;
    const h = bg.querySelector('h1, h2, h3'); if (h) h.id = id;
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); bg.dispatchEvent(new Event('esc')); } };
    const close = () => { bg.remove(); document.removeEventListener('keydown', onKey, true); if (back && back.isConnected && back.focus) back.focus({ preventScroll: true }); };
    // A tap outside the window works like its Back/Close button, so a question that waits for an answer gets "no"
    // (before, the window closed but the question stayed open, and the button that asked it stayed disabled).
    bg.addEventListener('click', (e) => { if (e.target === bg) bg.dispatchEvent(new Event('esc')); });
    bg.addEventListener('esc', () => { const x = bg.querySelector('[data-x]'); if (x) x.click(); else close(); });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(bg);
    onMount && onMount(bg, close);
    const first = bg.querySelector('[data-ok], button:not([disabled]), input, select, textarea, a[href]');
    if (first && !bg.contains(document.activeElement)) first.focus({ preventScroll: true });
    return close;
  }
  function confirmBox(title, body, okText = L('Oo', 'Yes'), danger = false) {
    return new Promise((resolve) => {
      modal(`<h2 style="margin-top:0">${esc(title)}</h2><p class="muted">${body}</p>
        <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn ghost" data-x>${L('Bumalik', 'Back')}</button><button class="btn ${danger ? 'danger' : ''}" data-ok>${esc(okText)}</button></div>`,
      (bg, close) => {
        $('[data-x]', bg).onclick = () => { close(); resolve(false); };
        $('[data-ok]', bg).onclick = () => { close(); resolve(true); };
      });
    });
  }

  /* ---------------- look: comfortable colors and pinch zoom (every user) ----------------
     Soft, easy-on-the-eyes colors (or sepia / dark), and the screens zoom
     with two fingers (or Ctrl + scroll / touchpad pinch on a computer). No zoom buttons.
     The choice is saved on the device, so the login screen keeps the same look. */
  const THEMES = () => [['auto', L('Auto (sundan ang phone)', 'Auto (follow the phone)')], ['comfort', L('Maliwanag', 'Light')], ['sepia', 'Sepia'], ['dark', L('Madilim', 'Dark')]];
  /* Accessibility (every user, also before login, never Premium-only): text size, stronger contrast, less motion.
     Saved on this device and in the account (see Prefs). The phone's own "reduce motion" and "more contrast"
     settings are followed too. */
  const A11Y_SIZES = [[1, 'A'], [1.15, 'A+'], [1.3, 'A++'], [1.5, 'A+++']];
  const a11y = () => ({ fs: 1, contrast: false, motion: false, ...(store.get('cse-a11y') || {}) });
  const setA11y = (v) => { store.set('cse-a11y', { ...a11y(), ...v }); applyLook(); Prefs.touched(); };
  const ZMIN = 0.8, ZMAX = 1.6;
  const look = () => store.get('cse-look');
  const lookOn = () => !!S.user || !!look();
  const darkMQ = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  let zoomNow = 1;
  function setZoom(z) {
    z = Math.round(Math.min(ZMAX, Math.max(ZMIN, z)) * 100) / 100;
    if (z === zoomNow) return z;
    const y = window.scrollY * (z / zoomNow);
    zoomNow = z;
    // Only the content zooms (styles.css: main, .modal). The top bar, bottom menu and exam buttons keep their size.
    document.documentElement.style.setProperty('--z', String(z));
    window.scrollTo(0, y);
    return z;
  }
  function applyLook() {
    const on = lookOn();
    let L = look();
    if (on && S.user && !L) { L = { theme: 'auto', zoom: 1 }; store.set('cse-look', L); }
    const root = document.documentElement;
    const theme = on ? (L.theme === 'auto' ? (darkMQ && darkMQ.matches ? 'dark' : 'comfort') : L.theme) : '';
    if ((root.dataset.theme || '') !== theme) {
      if (theme) root.dataset.theme = theme; else delete root.dataset.theme;
      const meta = document.querySelector('meta[name=theme-color]');
      if (meta) meta.content = theme ? getComputedStyle(root).getPropertyValue('--bar').trim() || '#1e40af' : '#1e40af';
    }
    setZoom(on ? Number(L.zoom) || 1 : 1);
    const ax = a11y();
    root.style.setProperty('--fs', String(A11Y_SIZES.some(([v]) => v === Number(ax.fs)) ? Number(ax.fs) : 1));
    if (ax.contrast) root.dataset.contrast = 'more'; else delete root.dataset.contrast;
    if (ax.motion) root.dataset.motion = 'reduce'; else delete root.dataset.motion;
  }
  if (darkMQ && darkMQ.addEventListener) darkMQ.addEventListener('change', applyLook);
  (() => {
    let start = null, want = 1, raf = 0;
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const paint = () => { raf = 0; setZoom(want); };
    const save = () => { const L = look(); if (L && L.zoom !== zoomNow) { store.set('cse-look', { ...L, zoom: zoomNow }); Prefs.touched(); toast(`Zoom ${Math.round(zoomNow * 100)}%`); } };
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2 && lookOn()) start = { d: dist(e.touches) || 1, z: zoomNow };
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (!start || e.touches.length !== 2) return;
      e.preventDefault(); // our zoom instead of the browser's
      want = start.z * (dist(e.touches) / start.d);
      if (!raf) raf = requestAnimationFrame(paint);
    }, { passive: false });
    document.addEventListener('touchend', (e) => { if (start && e.touches.length < 2) { start = null; save(); } }, { passive: true });
    document.addEventListener('touchcancel', () => { if (start) { start = null; save(); } }, { passive: true });
    // Safari's own pinch gesture
    document.addEventListener('gesturestart', (e) => { if (lookOn()) e.preventDefault(); });
    // Computer: Ctrl + mouse wheel, or pinching on the touchpad (sent as Ctrl + wheel).
    let wheelT = 0;
    window.addEventListener('wheel', (e) => {
      if (!e.ctrlKey || !lookOn()) return;
      e.preventDefault();
      want = zoomNow * Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0025));
      if (!raf) raf = requestAnimationFrame(paint);
      clearTimeout(wheelT); wheelT = setTimeout(save, 400);
    }, { passive: false });
  })();

  /* ---------------- fingerprint / face login (Premium) ----------------
     The server gives this device a secret login key. It is kept behind the device's own lock:
     - Android/iPhone app: fingerprint or face (key stored in the phone's secure storage)
     - Windows app: Windows Hello (fingerprint, face or PIN; key encrypted for this Windows account)
     - Browsers: the device's fingerprint/face/PIN through the browser (passkey check)
     Only one account per device. Logging out keeps it, so the user can log back in with a touch. */
  const capNative = !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
  const NB = capNative && Capacitor.isPluginAvailable && Capacitor.isPluginAvailable('NativeBiometric')
    ? (Capacitor.Plugins.NativeBiometric || Capacitor.registerPlugin('NativeBiometric')) : null;
  const DESK = window.cseDesktop && window.cseDesktop.hello ? window.cseDesktop : null;
  const BIO_SERVER = 'cse-reviewer';
  const b64 = { to: (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))), from: (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)) };
  const rand = (n) => crypto.getRandomValues(new Uint8Array(n));
  /* Face or fingerprint: the user picks one, but the device's own prompt decides what it accepts.
     - iPhone: Face ID or Touch ID, whichever the phone has.
     - Android: face works only on phones whose face unlock is "strong" (Class 3, e.g. Pixel 8 and newer).
       On other phones Android allows only the fingerprint for apps, so the prompt asks for the fingerprint.
     - Windows Hello and browsers: the same prompt for face, fingerprint or PIN. */
  const METHODS = { face: ['🙂', 'Face'], finger: ['👆', 'Fingerprint'] };
  const Bio = {
    saved: () => store.get('cse-bio'),
    // Which options to offer on this device: ['face'], ['finger'] or both.
    async methods() {
      const kind = await this.kind();
      if (!kind) return [];
      if (kind !== 'native') return ['face', 'finger'];
      let t = 0;
      try { t = (await NB.isAvailable()).biometryType; } catch { /* unknown */ }
      return t === 2 || t === 4 ? ['face'] : t === 6 ? ['face', 'finger'] : ['finger'];
    },
    btn(rec) { const [ic, l] = METHODS[(rec && rec.method) || 'finger']; return rec && rec.kind === 'desktop' && !rec.method ? '🔐 Windows Hello' : `${ic} ${l}`; },
    async kind() {
      if (NB) { try { const r = await NB.isAvailable(); return r.isAvailable ? 'native' : null; } catch { return null; } }
      if (DESK) { try { return (await DESK.hello.available()) ? 'desktop' : null; } catch { return null; } }
      if (!IS_APP && window.PublicKeyCredential && window.isSecureContext && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        try { return (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()) ? 'web' : null; } catch { return null; }
      }
      return null;
    },
    async check(reason, method) {
      const hint = method === 'face' ? L('Tumingin sa camera', 'Look at the camera') : method === 'finger' ? L('Idikit ang daliri sa sensor', 'Touch the sensor') : reason;
      if (NB) { await NB.verifyIdentity({ reason, title: 'CSE Reviewer', subtitle: reason, description: hint, negativeButtonText: L('Kanselahin', 'Cancel') }); return; }
      if (DESK) { if (!(await DESK.hello.verify(`${reason}. ${hint}.`))) throw new Error(L('Hindi na-verify.', 'Not verified.')); }
    },
    async enable(method) {
      const kind = await this.kind();
      if (!kind) throw new Error(L('Walang face, fingerprint, o Windows Hello sa device na ito.', 'This device has no face, fingerprint, or Windows Hello.'));
      if (!method) method = (await this.methods())[0] || 'finger';
      await this.check(L('I-on ang mabilis na login', 'Turn on quick login'), method);
      const { key } = await api('POST', '/api/auth/device', { name: (kind === 'native' ? 'Phone app' : kind === 'desktop' ? 'Windows app' : 'Browser') + (method === 'face' ? ' (face)' : '') });
      const rec = { kind, method, email: S.user.email, name: S.user.name.split(' ')[0] };
      try {
        if (kind === 'native') await NB.setCredentials({ username: S.user.email, password: key, server: BIO_SERVER });
        else if (kind === 'desktop') rec.data = await DESK.protect(key);
        else {
          const cred = await navigator.credentials.create({ publicKey: {
            rp: { name: 'CSE Reviewer' }, user: { id: rand(16), name: S.user.email, displayName: S.user.name },
            challenge: rand(32), pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
            authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' }, timeout: 60000,
          } });
          rec.cred = b64.to(cred.rawId); rec.data = key;
        }
      } catch (e) { api('POST', '/api/auth/device/remove', { key }).catch(() => {}); throw e; }
      if (!rec.data) rec.data = 'native';
      store.set('cse-bio', rec);
      return rec;
    },
    async unlock() {
      const rec = this.saved();
      if (!rec) throw new Error(L('Walang naka-save na face/fingerprint login.', 'No face/fingerprint login is saved.'));
      const why = L('Mag-login sa CSE Reviewer', 'Log in to CSE Reviewer');
      if (rec.kind === 'native') { await this.check(why, rec.method); return (await NB.getCredentials({ server: BIO_SERVER })).password; }
      if (rec.kind === 'desktop') { await this.check(why, rec.method); return DESK.unprotect(rec.data); }
      await navigator.credentials.get({ publicKey: { challenge: rand(32), allowCredentials: [{ type: 'public-key', id: b64.from(rec.cred) }], userVerification: 'required', timeout: 60000 } });
      return rec.data;
    },
    async login() {
      const key = await this.unlock();
      // No internet: face/fingerprint was checked on this device, so Premium can log in offline (see OffAuth).
      if (!navigator.onLine) return { offlineKey: key };
      try { return await api('POST', '/api/auth/device/login', { key }); } catch (e) {
        if (e.offline) return { offlineKey: key };
        if (e.code === 'device') this.forget(true);
        throw e;
      }
    },
    async forget(localOnly) {
      const rec = this.saved();
      store.del('cse-bio');
      if (!rec) return;
      let key = rec.kind === 'web' ? rec.data : null;
      if (rec.kind === 'native') { try { key = !localOnly && (await NB.getCredentials({ server: BIO_SERVER })).password; } catch { /* gone */ } NB.deleteCredentials({ server: BIO_SERVER }).catch(() => {}); }
      if (rec.kind === 'desktop' && !localOnly) { try { key = await DESK.unprotect(rec.data); } catch { /* gone */ } }
      if (key && !localOnly) api('POST', '/api/auth/device/remove', { key }).catch(() => {});
    },
  };
  const bioErr = (e) => (e && e.name === 'NotAllowedError') || /cancel/i.test(String(e && (e.message || e.code)))
    ? L('Kinansela.', 'Cancelled.') : (e && e.message) || L('Hindi gumana ang face/fingerprint login.', 'Face/fingerprint login did not work.');
  // Switch between face and fingerprint without a new device key (same secret, only the label and the prompt change).
  function setBioMethod(method) { const rec = Bio.saved(); if (rec) store.set('cse-bio', { ...rec, method }); }

  /* ---------------- offline login (Premium) ----------------
     A Premium account can log in even without internet, on a device where it logged in online before:
     - After each online login (and each check with the server) this device keeps the account's details,
       and after a password login a salted PBKDF2 hash of the password (never the password itself).
     - Offline, the password is checked against that hash on the device, or face/fingerprint is used
       (quick login). It opens at once: no server to wait for.
     - It works for 30 days after the last time the account was online on this device, and only while
       Premium and the saved questions are still valid. Free accounts need internet to log in.
     - Back online, the app logs in to the server in the background (the password or quick-login key is
       kept in memory only, for this). If the account logged in on another device after the offline
       login, the newer login wins and this device is logged out (one login at a time). Results made
       offline stay on the device and are saved online after the next login. */
  const OffAuth = (() => {
    const KEY = 'cse-offline-login', DAYS = 30, ROUNDS = 150000;
    const norm = (e) => String(e || '').trim().toLowerCase();
    const all = () => store.get(KEY, {}) || {};
    const put = (m) => store.set(KEY, m);
    const ok = () => !!(window.crypto && crypto.subtle && window.TextEncoder);
    async function derive(pw, salt) {
      const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
      return b64.to(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: b64.from(salt), iterations: ROUNDS }, k, 256));
    }
    const get = (email) => { const r = all()[norm(email)]; return r && r.until > Date.now() ? r : null; };
    const packOk = (uid) => { const p = store.get(`cse-pack-${uid}`); return !!(p && p.user_id === uid && (p.valid_until || 0) > Date.now()); };
    const forget = (email) => { const m = all(); delete m[norm(email)]; put(m); };
    let resuming = null;
    const noInternet = () => L('Walang internet.', 'No internet.');
    const offErr = (m) => Object.assign(new Error(m), { offlineLogin: true });
    function enter(rec, secret) {
      S.authNote = null;
      S.offAuth = { email: rec.email, at: Date.now(), ...secret };
      store.set('cse-offauth', { email: rec.email, at: S.offAuth.at }); // no password here
      applyMe(rec.me);
      S.meta = S.meta || store.get('cse-meta');
      store.set('cse-boot', rec.me); store.set('cse-last-email', rec.email);
      const bar = document.getElementById('offline'); if (bar) bar.remove();
      S.offline = false; setOffline(true); // banner text for a logged-in Premium account
      toast(L('Naka-login ka offline. Ise-save online ang mga resulta mo kapag may internet na.', 'You are logged in offline. Your results will be saved online when the internet is back.'));
      go('#/');
    }
    // Why offline login is not possible for this email, or the saved record.
    function usable(email) {
      const r = get(email);
      if (!r) {
        const old = all()[norm(email)];
        throw offErr(old ? L('Lumipas na ang 30 araw mula nang huling mag-online ang account na ito sa device na ito. Kumonekta sa internet para mag-login.', 'It has been over 30 days since this account was last online on this device. Connect to the internet to log in.')
          : `${noInternet()} ${L('Para sa Premium ang offline na login, sa device na nag-login na online dati.', 'Offline login is for Premium, on a device that logged in online before.')}`);
      }
      if (!r.me || !r.me.premium) throw offErr(`${noInternet()} ${L('Para sa Premium ang offline na login.', 'Offline login is for Premium.')}`);
      if (!packOk(r.uid) || !store.get('cse-meta')) throw offErr(L('Kailangang kumonekta sa internet para ma-update ang Premium at mga tanong mo (kahit isang beses bawat 30 araw).', 'Connect to the internet to update your Premium and questions (at least once every 30 days).'));
      return r;
    }
    const self = {
      // After an online login or check (Premium only). pw: the password, when the login used one.
      async remember(pw) {
        if (!S.user || !S.premium || !ok()) return;
        const m = all(), e = norm(S.user.email), old = m[e] && m[e].uid === S.user.id ? m[e] : {};
        let { salt, hash } = old;
        if (pw) { salt = b64.to(rand(16)); hash = await derive(pw, salt); }
        m[e] = { uid: S.user.id, email: e, salt, hash, me: store.get('cse-boot'), until: Date.now() + DAYS * 864e5 };
        put(m);
      },
      // Each check with the server: keep the details fresh; drop them when Premium ended.
      touch(me) {
        if (!me || !me.user) return;
        const e = norm(me.user.email), m = all();
        if (!me.premium) { if (m[e]) forget(e); return; }
        if (!m[e] || m[e].uid !== me.user.id) return;
        m[e] = { ...m[e], me, until: Date.now() + DAYS * 864e5 }; put(m);
      },
      forget,
      any: () => Object.values(all()).some((r) => r.until > Date.now() && r.me && r.me.premium),
      has: (email) => !!get(email),
      async login(email, pw) {
        const r = usable(email);
        if (!r.hash) throw offErr(L('Offline, gamitin ang face/fingerprint (o mag-login muna online gamit ang password).', 'Offline, use face/fingerprint (or log in online with your password first).'));
        if (!ok() || (await derive(String(pw || ''), r.salt)) !== r.hash) throw offErr(L('Mali ang email o password.', 'Wrong email or password.'));
        enter(r, { pw });
      },
      bio(email, key) { enter(usable(email), { key }); },
      // Back online: log in to the server, then save the offline results.
      resume() {
        const s = S.offAuth;
        if (!s) return Promise.resolve();
        if (resuming) return resuming;
        resuming = (async () => {
          try {
            let r;
            if (s.pw) r = await api('POST', '/api/auth/login', { email: s.email, password: s.pw, since: s.at });
            else if (s.key) r = await api('POST', '/api/auth/device/login', { key: s.key, since: s.at });
            else { await api('GET', '/api/meta'); throw Object.assign(new Error(L('Mag-login ulit para ma-save online ang mga exam na ginawa mo offline.', 'Please log in again to save the exams you took offline.')), { relogin: true }); }
            S.offAuth = null; store.del('cse-offauth');
            if (r && r.user) store.set('cse-last-email', r.user.email);
            await refreshMe();
            if (s.pw) self.remember(s.pw).catch(() => {});
            if (r && r.others) toast(L('Naka-online ka na. Na-logout ang account mo sa ibang device.', 'You are online. Your account was logged out on the other device.'));
          } catch (e) {
            if (e.offline) return;
            S.offAuth = null; store.del('cse-offauth');
            if (e.code === 'device') Bio.forget(true);
            if (!e.relogin && e.code !== 'replaced' && (e.status === 401 || e.status === 403)) forget(s.email); // password changed or account disabled
            if (e.code !== 'replaced') endedElsewhere(e.message); // "replaced": api() already logged out with the reason
          }
        })().finally(() => { resuming = null; });
        return resuming;
      },
    };
    return self;
  })();

  /* ---------------- backup and sync of settings (every account) ----------------
     The settings of the app (language, look, text size, sounds, level, study reminder) are saved in the
     account, so a new phone or a reinstalled app gets them back right after login. The newer copy wins
     (each change is stamped with its time). Results are always saved online already; results made offline
     (Premium) are saved online when the internet is back. Premium can also download a backup file that
     works without internet (Account → Backup). */
  const Prefs = (() => {
    let pushT = 0, lastPull = 0;
    const atKey = () => uk('cse-prefs-at');
    const collect = () => ({
      lang, look: look() || null, a11y: store.get('cse-a11y'), sound: store.get('cse-sound'),
      level: store.get(uk('cse-level')), remind: store.get(uk('cse-remind')),
    });
    function apply(d) {
      if (!d || typeof d !== 'object') return;
      if (d.lang === 'en' || d.lang === 'tl') { lang = d.lang; store.set('cse-lang', lang); setHtmlLang(); }
      if (d.look && typeof d.look === 'object') store.set('cse-look', d.look);
      if (d.a11y && typeof d.a11y === 'object') store.set('cse-a11y', d.a11y);
      if (d.sound && typeof d.sound === 'object') store.set('cse-sound', d.sound);
      if (d.level === 'pro' || d.level === 'subpro') store.set(uk('cse-level'), d.level);
      if (d.remind && typeof d.remind === 'object') store.set(uk('cse-remind'), d.remind);
      applyLook(); Reminders.sync();
    }
    async function push() {
      clearTimeout(pushT);
      if (!S.user || S.offAuth || S.offline) return;
      const r = Reminders.get();
      const out = await api('PUT', '/api/me/prefs', { data: collect(), updated_at: store.get(atKey(), Date.now()), remind_email: !!(r.on && r.email), remind_min: Reminders.minutes(r.time) });
      store.set(uk('cse-prefs-sync'), Date.now());
      return out;
    }
    // A setting changed on this device: save it in the account a moment later.
    function touched() {
      if (!S.user) return;
      store.set(atKey(), Date.now());
      clearTimeout(pushT); pushT = setTimeout(() => push().catch(() => {}), 1500);
    }
    // After login and when the app opens: take the account's copy if it is newer, or send ours if ours is newer.
    async function pull(force) {
      if (!S.user || S.offAuth || (!force && Date.now() - lastPull < 10 * 60e3)) return;
      lastPull = Date.now();
      const srv = await api('GET', '/api/me/prefs');
      const mine = store.get(atKey(), 0);
      if (srv.updated_at > mine) {
        const before = JSON.stringify(collect());
        apply(srv.data); store.set(atKey(), srv.updated_at);
        store.set(uk('cse-prefs-sync'), Date.now());
        if (JSON.stringify(collect()) !== before && !S.exam) { toast(L('Naibalik ang settings mo mula sa account.', 'Your settings were restored from your account.')); route(); }
      } else if (mine > srv.updated_at) await push();
      else store.set(uk('cse-prefs-sync'), Date.now());
    }
    // Premium: a backup file with the settings and the results not yet saved online (works offline).
    function file() {
      return { app: 'cse-reviewer', v: 1, at: Date.now(), user_id: S.user.id, email: S.user.email, version: APP_VERSION,
        prefs: collect(), local: local.all(), psub: store.get(uk('cse-psub'), []), mailq: store.get(uk('cse-mailq'), []) };
    }
    function restore(f) {
      if (!f || f.app !== 'cse-reviewer' || !Array.isArray(f.local)) throw new Error(L('Hindi backup file ng CSE Reviewer ito.', 'This is not a CSE Reviewer backup file.'));
      if (String(f.email).toLowerCase() !== String(S.user.email).toLowerCase()) throw new Error(L(`Para sa ibang account ang backup na ito (${f.email}).`, `This backup is for another account (${f.email}).`));
      const map = store.get(uk('cse-map'), {}), have = new Set(local.all().map((a) => a.id));
      let n = 0;
      for (const a of f.local) if (a && a.id && isLocal(a.id) && !have.has(a.id) && !map[a.id] && Array.isArray(a.items)) { local.save(a); n++; }
      const ps = store.get(uk('cse-psub'), []);
      for (const x of f.psub || []) if (x && x.id && !ps.some((y) => y.id === x.id)) { ps.push(x); n++; }
      store.set(uk('cse-psub'), ps);
      if (f.prefs) { apply(f.prefs); touched(); }
      syncSoon();
      return n;
    }
    return { touched, pull, push, apply, file, restore, last: () => store.get(uk('cse-prefs-sync')) };
  })();

  /* ---------------- study streak and daily reminder (every user) ----------------
     Streak: days in a row with at least one finished exam or practice (Philippine time), from the server's
     results plus the ones made offline on this device.
     Reminder at the chosen time, only on days without study yet:
     - Android/iPhone app: a phone notification, even when the app is closed (scheduled on the phone, works offline).
     - Website and Windows app: a notification while the app is open or in the background, and a reminder on Home.
     - Email (optional, any device): sent by the server at the chosen time, even when the app is closed.
     Premium also gets a phone notification a day before Premium ends. */
  const phDay = (ms = Date.now()) => Math.floor((ms + 8 * 3600e3) / 864e5);
  function streakOf(days) {
    const set = new Set(days), today = phDay();
    let current = 0;
    for (let d = set.has(today) ? today : today - 1; set.has(d); d--) current++;
    let best = 0, run = 0, prev = null;
    for (const d of [...set].sort((a, b) => a - b)) { run = prev !== null && d === prev + 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; }
    return { current, best, today: set.has(today) };
  }
  // Study days known on this device: from the server's stats, plus results made here (also offline).
  const studyDays = () => [...new Set([...(store.get(uk('cse-days'), []) || []), ...local.all().filter((a) => a.finished_at).map((a) => phDay(a.finished_at))])];
  const markStudied = () => { const d = store.get(uk('cse-days'), []) || []; if (!d.includes(phDay())) { d.push(phDay()); store.set(uk('cse-days'), d.slice(-400)); } Reminders.sync(); };
  const Reminders = (() => {
    const IDS = Array.from({ length: 14 }, (_, i) => 1001 + i), EXPIRY_ID = 2001;
    const get = () => ({ on: false, time: '20:00', email: false, ...(S.user ? store.get(uk('cse-remind')) || {} : {}) });
    const minutes = (t) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '')); return m ? Math.min(1439, Number(m[1]) * 60 + Number(m[2])) : 1200; };
    const LN = () => capPlugin('LocalNotifications');
    const text = () => {
      const st = streakOf(studyDays());
      return { title: st.current > 1 ? L(`🔥 ${st.current} araw na! Tuloy ang streak`, `🔥 ${st.current} days! Keep the streak`) : L('Oras na para mag-review 📚', 'Time to review 📚'),
        body: L('Kahit 10 tanong lang ngayon, malaking tulong na sa CSE.', 'Even 10 questions today helps a lot for the CSE.') };
    };
    async function syncNative() {
      const N = LN(); if (!N) return false;
      try {
        await N.cancel({ notifications: [...IDS, EXPIRY_ID].map((id) => ({ id })) }).catch(() => {});
        const r = get(), list = [];
        if (r.on && S.user) {
          const perm = await N.checkPermissions();
          if (perm.display !== 'granted' && (await N.requestPermissions()).display !== 'granted') return true;
          const m = minutes(r.time), studied = streakOf(studyDays()).today, t = text();
          for (let i = 0; i < IDS.length; i++) {
            const day = phDay() + i, at = day * 864e5 - 8 * 3600e3 + m * 60e3;
            if (at <= Date.now() + 30e3 || (i === 0 && studied)) continue;
            list.push({ id: IDS[i], title: t.title, body: t.body, schedule: { at: new Date(at), allowWhileIdle: true } });
          }
        }
        // Premium ends tomorrow: a reminder at 9 AM the day before.
        const until = S.user && S.user.role !== 'admin' && S.config && S.config.premium_required ? S.user.premium_until || 0 : 0;
        const pre = until - 864e5;
        if (until && pre > Date.now() + 60e3) {
          const at = Math.max(Date.now() + 60e3, phDay(pre) * 864e5 - 8 * 3600e3 + 9 * 3600e3);
          list.push({ id: EXPIRY_ID, title: L('⭐ Malapit nang matapos ang Premium', '⭐ Premium ends soon'), body: L('Matatapos bukas ang Premium mo. I-extend sa Account → Premium.', 'Your Premium ends tomorrow. Extend it in Account → Premium.'), schedule: { at: new Date(at), allowWhileIdle: true } });
        }
        if (list.length) await N.schedule({ notifications: list });
      } catch { /* the phone did not allow it */ }
      return true;
    }
    // Website / Windows app: check every minute while the app is open.
    let tick = 0;
    function check() {
      const r = get();
      if (!r.on || !S.user || !window.Notification || Notification.permission !== 'granted') return;
      const now = Date.now(), today = phDay(now), mins = Math.floor(((now + 8 * 3600e3) % 864e5) / 60e3);
      if (mins < minutes(r.time) || streakOf(studyDays()).today || store.get(uk('cse-remind-shown')) === today) return;
      store.set(uk('cse-remind-shown'), today);
      show(text());
    }
    async function show(t) {
      try {
        const reg = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
        if (reg && reg.showNotification) return reg.showNotification(t.title, { body: t.body, icon: 'icons/icon-192.png', tag: 'cse-remind' });
        new Notification(t.title, { body: t.body, icon: 'icons/icon-192.png' });
      } catch { /* not allowed here */ }
    }
    function sync() {
      if (LN()) { syncNative(); return; }
      clearInterval(tick);
      if (get().on && S.user) { tick = setInterval(check, 60e3); check(); }
    }
    async function set(v) {
      const r = { ...get(), ...v };
      store.set(uk('cse-remind'), r);
      if (r.on && !LN() && window.Notification && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch { /* ignore */ } }
      Prefs.touched(); sync();
      return r;
    }
    const native = () => !!LN();
    // Shown on Home after the reminder time when there was no study yet today.
    const due = () => { const r = get(); const mins = Math.floor(((Date.now() + 8 * 3600e3) % 864e5) / 60e3); return r.on && mins >= minutes(r.time) && !streakOf(studyDays()).today; };
    return { get, set, sync, minutes, native, due, test: () => (LN() ? LN().schedule({ notifications: [{ id: 3001, ...text(), schedule: { at: new Date(Date.now() + 5000) } }] }) : show(text())) };
  })();
  const fmtClock = (t) => { const m = Reminders.minutes(t), h = Math.floor(m / 60), mm = String(m % 60).padStart(2, '0'); return `${((h + 11) % 12) + 1}:${mm} ${h < 12 ? 'AM' : 'PM'}`; };

  /* ---------------- drop down / up sections ----------------
     A section that opens and closes when its title is tapped (<details>, so it opens instantly).
     - All sections start closed.
     - Only one is open at a time: opening one closes the others on the screen.
     - An open section closes by itself after 10 seconds. The 10 seconds start over while the user is using it
       (tapping, typing, scrolling inside it), and it stays open while a box in it is being filled in. */
  const FOLD_MS = 10000;
  const F = { key: null, el: null, t: 0 }; // the open section; its key survives a refresh of the same screen
  store.del('cse-fold'); // older versions remembered open sections
  // stay: the section does not close by itself after 10 seconds (Admin → Settings, where the admin fills in forms).
  function fold(key, title, body, { card = true, id = '', stay = false } = {}) {
    return `<details class="fold${card ? ' card' : ' plain'}" data-fold="${key}"${id ? ` id="${id}"` : ''}${stay ? ' data-stay="1"' : ''}${F.key === key ? ' open' : ''}>
      <summary><span class="fold-title">${title}</span><span class="chev" aria-hidden="true"></span></summary><div class="fold-body">${body}</div></details>`;
  }
  const topGap = () => { const bar = $('.topbar'); return (bar ? bar.getBoundingClientRect().bottom : 0) + 8; };
  function foldClose(d) {
    const top = d.getBoundingClientRect().top;
    d.open = false;
    if (top < topGap()) window.scrollBy(0, top - topGap()); // was reading far down inside it: bring its title back into view
  }
  function foldTimer() {
    clearTimeout(F.t);
    const d = F.el;
    if (!d || !d.open || !d.isConnected || d.dataset.stay) return;
    F.t = setTimeout(() => {
      if (!d.open || !d.isConnected) return;
      const a = document.activeElement;
      if ((a && d.contains(a) && a.matches('input, textarea, select')) || document.querySelector('.modal-bg')) return foldTimer(); // busy: wait
      foldClose(d);
    }, FOLD_MS);
  }
  // After a screen is drawn: a section kept open (same screen, fresh data) gets a new timer.
  function foldSync() { F.el = $('details.fold[open]'); if (!F.el) F.key = null; foldTimer(); }
  // The others close on the tap itself, before this one opens, so two are never open together.
  document.addEventListener('click', (e) => {
    const sum = e.target.closest && e.target.closest('details.fold > summary');
    const d = sum && sum.parentNode;
    if (!d || d.open) return;
    const before = d.getBoundingClientRect().top;
    $$('details.fold[open]').forEach((x) => { if (x !== d && !x.contains(d)) x.open = false; });
    const moved = d.getBoundingClientRect().top - before;
    if (moved) window.scrollBy(0, moved); // a section above it closed: keep this title under the finger
  }, true);
  document.addEventListener('toggle', (e) => {
    const d = e.target;
    if (!d.matches || !d.matches('details.fold')) return;
    if (d.open) { F.key = d.dataset.fold; F.el = d; foldTimer(); } else if (d === F.el) { clearTimeout(F.t); F.el = null; F.key = null; }
  }, true);
  // Using the open section starts the 10 seconds over.
  ['pointerdown', 'keydown', 'input', 'wheel', 'touchmove', 'focusin'].forEach((ev) => document.addEventListener(ev, (e) => {
    if (F.el && e.target && e.target.nodeType === 1 && F.el.contains(e.target)) foldTimer();
  }, { capture: true, passive: true }));

  /* ---------------- show / hide password ----------------
     Every password box gets an eye button, on every screen (login, register, new password, Account). */
  function addEye(input) {
    input.dataset.eye = '1';
    const wrap = document.createElement('span');
    wrap.className = 'pw-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pw-eye';
    const paint = () => {
      const shown = input.type === 'text';
      b.textContent = shown ? '🙈' : '👁️';
      b.setAttribute('aria-label', shown ? L('Itago ang password', 'Hide password') : L('Ipakita ang password', 'Show password'));
      b.setAttribute('aria-pressed', String(shown));
    };
    b.onmousedown = (e) => e.preventDefault(); // keep the keyboard open on phones
    b.onclick = () => {
      const pos = input.selectionStart;
      input.type = input.type === 'password' ? 'text' : 'password';
      paint();
      if (document.activeElement === input && pos != null) try { input.setSelectionRange(pos, pos); } catch { /* ignore */ }
    };
    paint();
    wrap.appendChild(b);
  }
  const eyes = (root = document) => $$('input[type=password]:not([data-eye])', root).forEach(addEye);
  /* Screen readers: a <label> right before its box names that box (the screens write labels without "for"). */
  let lbN = 0;
  const labels = () => $$('label:not([for]):not(.check):not(.btn)').forEach((lb) => {
    const n = lb.nextElementSibling, box = n && (n.matches('input, select, textarea') ? n : n.matches('.pw-wrap') ? n.querySelector('input') : null);
    if (!box) return;
    if (!box.id) box.id = 'f' + ++lbN;
    lb.htmlFor = box.id;
  });
  new MutationObserver(() => { eyes(); labels(); }).observe(document.body, { childList: true, subtree: true });

  /* ---------------- shell ---------------- */
  const LOGOUT_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>';
  function shell(active, body) {
    const isAdmin = S.user && S.user.role === 'admin';
    const links = [['home', '#/', 'Home', '🏠'], ['practice', '#/practice', 'Practice', '📝'], ['history', '#/history', L('Resulta', 'Results'), '📊'], ...(isAdmin ? [['admin', '#/admin', 'Admin', '🛠️']] : []), ['account', '#/account', 'Account', '👤']];
    // "CSE Reviewer" at the top left, the menu in the center (computer; on phones it is the bottom menu, also centered),
    // and on the right the language flag and a red "Log out" button that is easy to find.
    // (Level is chosen on Home, Practice and Account; Help is in Account.)
    $app.innerHTML = `
      <a class="skip-link" href="#main" data-skip>${L('Lumaktaw sa nilalaman', 'Skip to content')}</a>
      <header class="topbar">
        <a class="brand" href="#/"><img src="icons/icon.svg" alt="">CSE Reviewer</a>
        <nav class="nav-desktop" aria-label="Menu">${links.map(([k, h, l]) => `<a class="link ${active === k ? 'active' : ''}" href="${h}">${l}</a>`).join('')}</nav>
        <div class="top-right">${flagBtn()}${S.user ? `<button type="button" class="logout-btn" id="topLogout" title="${L('Mag-logout', 'Log out')}" aria-label="${L('Mag-logout', 'Log out')}">${LOGOUT_ICON}<span>${L('Logout', 'Log out')}</span></button>` : ''}</div>
      </header>
      <main class="wrap${S.keepScroll ? '' : ' page-in'}" id="main" tabindex="-1">${body}${Ads.slot(active)}</main>
      <nav class="bottomnav" aria-label="Menu">${links.map(([k, h, l, ic]) => `<a class="${active === k ? 'active' : ''}" href="${h}"${active === k ? ' aria-current="page"' : ''}><span class="ic" aria-hidden="true">${ic}</span>${l}</a>`).join('')}</nav>`;
    $('[data-skip]').onclick = (e) => { e.preventDefault(); $('#main').focus(); };
    if ($('#topLogout')) $('#topLogout').onclick = () => logout();
    Ads.mount();
    foldSync();
    if (!S.keepScroll) window.scrollTo(0, 0);
  }

  /* ---------------- dropdown menu ----------------
     A button that shows the current choice; tapping it opens a list below it. Picking an item, tapping
     outside, or Esc closes it. Used for the Admin tabs. */
  function ddMenu(id, items, cur) {
    const it = items.find(([k]) => k === cur) || items[0];
    return `<div class="dd" id="${id}"><button type="button" class="dd-btn" aria-haspopup="menu" aria-expanded="false"><span class="dd-cur">${it[2] || ''} ${it[1]}</span><span class="chev" aria-hidden="true"></span></button>
      <div class="dd-list" role="menu" hidden>${items.map(([k, l, ic]) => `<button type="button" role="menuitem" data-t="${k}" class="${k === it[0] ? 'active' : ''}">${ic || ''} ${l}</button>`).join('')}</div></div>`;
  }
  function ddPick(dd, key) {
    const b = $(`[data-t="${key}"]`, dd);
    if (!b) return;
    $$('[data-t]', dd).forEach((x) => x.classList.toggle('active', x === b));
    $('.dd-cur', dd).innerHTML = b.innerHTML;
  }
  const ddClose = (except) => $$('.dd.open').forEach((d) => { if (d !== except) { d.classList.remove('open'); $('.dd-list', d).hidden = true; $('.dd-btn', d).setAttribute('aria-expanded', 'false'); } });
  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('.dd-btn');
    const dd = btn && btn.parentNode;
    ddClose(dd);
    if (!dd) return;
    const open = !dd.classList.contains('open');
    dd.classList.toggle('open', open); $('.dd-list', dd).hidden = !open; btn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') ddClose(); });

  /* ---------------- auth screens ----------------
     One screen, no scrolling on a phone: name of the app, the form, quick login options,
     and "Gumawa ng account" at the bottom. The language button is at the top right. */
  function authShell(inner, foot = '') {
    Ads.hide();
    $app.innerHTML = `<main class="auth-screen">${flagBtn('lang-btn')}
      <div class="auth-head"><img class="logo" src="icons/icon.svg" alt=""><h1>CSE Reviewer</h1></div>
      <div class="auth-body">${inner}</div>
      ${foot ? `<div class="auth-foot">${foot}</div>` : ''}</main>`;
    window.scrollTo(0, 0);
  }
  // Any button with data-lang switches the language (login screens and Account).
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-lang]');
    if (b && b.dataset.lang !== lang) setLang(b.dataset.lang);
  });
  const lastEmail = () => (Bio.saved() && Bio.saved().email) || store.get('cse-last-email') || '';
  async function afterLogin(r, msg, pw) {
    if (r && r.user) store.set('cse-last-email', r.user.email);
    S.authNote = null;
    await refreshMe();
    Prefs.pull(true).catch(() => {}); // settings saved in the account (new phone: they come back here)
    OffAuth.remember(pw).catch(() => {}); // Premium: this device can log in offline next time
    // One login at a time: say so when this login logged out another device.
    toast(r && r.others ? `${msg} ${L('Na-logout ang account mo sa ibang device.', 'Your account was logged out on the other device.')}` : msg);
    go('#/');
    setTimeout(offerBio, 700);
  }
  // After a password or code login: offer fingerprint/face login once (Premium, on devices that have it).
  async function offerBio() {
    if (!S.user || !S.premium || S.exam || Tour.active() || Tour.due() || Bio.saved() || store.get('cse-bio-asked') || (S.config.verify && !S.user.email_verified)) return;
    const ms = await Bio.methods();
    if (!ms.length) return;
    store.set('cse-bio-asked', 1);
    const name = ms.map((m) => METHODS[m][1].toLowerCase()).join(L(' o ', ' or '));
    if (!(await confirmBox(L('Mas mabilis na login', 'Faster login'), L(`Sa susunod, mag-login gamit lang ang <b>${esc(name)}</b>, walang password. Mapipili mo kung Face o Fingerprint sa Account → Mabilis na login.`,
      `Next time, log in with just your <b>${esc(name)}</b>, no password. You can choose Face or Fingerprint in Account → Quick login.`), L('I-on', 'Turn on')))) return;
    try { await Bio.enable(ms[0]); toast(L('Naka-on na ang mabilis na login.', 'Quick login is on.')); } catch (e) { toast(bioErr(e)); }
  }

  function viewAuth(mode) {
    const reg = mode === 'register';
    const bio = !reg && Bio.saved();
    const offHint = !reg && !navigator.onLine && OffAuth.any()
      ? `<div class="notice auth-offline">📡 ${L('Offline ka. Pwede pa ring mag-login ang Premium account na nag-login na sa device na ito.', 'You are offline. A Premium account that logged in on this device before can still log in.')}</div>` : '';
    authShell(`${S.authNote ? `<div class="notice auth-kicked" role="alert">🔒 ${esc(S.authNote)}</div>` : offHint}
      <form id="authForm" class="auth-form" novalidate>
        ${reg ? `<input id="name" type="text" autocomplete="name" required placeholder="${L('Pangalan', 'Name')}" aria-label="${L('Pangalan', 'Name')}">` : ''}
        <input id="email" type="email" autocomplete="${reg ? 'email' : 'username'}" required placeholder="Email" aria-label="Email" value="${reg ? '' : esc(lastEmail())}">
        <input id="pw" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}" required placeholder="${reg ? L('Password (8 characters pataas)', 'Password (8 characters or more)') : 'Password'}" aria-label="Password">
        <div class="err" id="err"></div>
        <button class="btn block" type="submit">${reg ? L('Gumawa ng account', 'Create account') : L('Mag-login', 'Log in')}</button>
      </form>
      ${reg ? `<p class="muted small auth-note">${L('Gumamit ng aktibong email. Padadalhan ka ng code para ma-verify ito.', 'Use an active email. We will send you a code to verify it.')}</p>` : `
      <div class="auth-alt">
        <a class="btn secondary" href="#/otp">✉️ ${L('Code sa email', 'Email code')}</a>
        ${bio ? `<button class="btn secondary" id="bio" type="button">${Bio.btn(bio)}</button>` : ''}
      </div>
      <a class="auth-link" href="#/forgot">${L('Nakalimutan ang password?', 'Forgot password?')}</a>`}`,
    reg ? `<span class="muted small">${L('May account na?', 'Have an account?')}</span><a class="btn ghost block" href="#/login">${L('Mag-login', 'Log in')}</a>`
      : noAccount());
    if (!reg) $(lastEmail() ? '#pw' : '#email').focus({ preventScroll: true });
    $('#authForm').onsubmit = async (e) => {
      e.preventDefault();
      const btn = $('button[type=submit]', e.target);
      btn.disabled = true; $('#err').textContent = '';
      try {
        const body = { email: $('#email').value, password: $('#pw').value };
        if (reg) body.name = $('#name').value;
        // No internet (Premium, on a device that logged in online before): check the password on the device, instantly.
        if (!reg && !navigator.onLine) return await OffAuth.login(body.email, body.password);
        let r;
        try { r = await api('POST', reg ? '/api/auth/register' : '/api/auth/login', body); } catch (err) {
          if (!reg && err.offline) return await OffAuth.login(body.email, body.password);
          throw err;
        }
        await afterLogin(r, reg ? L(`Maligayang pagdating, ${r.user.name}!`, `Welcome, ${r.user.name}!`) : loggedIn(), body.password);
      } catch (err) { $('#err').textContent = err.message; btn.disabled = false; }
    };
    if ($('#bio')) $('#bio').onclick = async (e) => {
      e.target.disabled = true; $('#err').textContent = '';
      try {
        const r = await Bio.login();
        if (r.offlineKey) return OffAuth.bio(Bio.saved().email, r.offlineKey);
        await afterLogin(r, loggedIn());
      } catch (err) { $('#err').textContent = bioErr(err); e.target.disabled = false; if (!Bio.saved()) e.target.remove(); }
    };
  }

  // A link with data-open="<section>" opens that section on the next screen (e.g. Home → Account → Reminder).
  document.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('[data-open]'); if (a) S.openFold = a.dataset.open; }, true);
  const loggedIn = () => L('Naka-login ka na.', 'You are logged in.');
  const noAccount = () => `<span class="muted small">${L('Wala pang account?', 'No account yet?')}</span><a class="btn ghost block" href="#/register">${L('Gumawa ng account', 'Create account')}</a>`;
  const codeSent = () => L('Naipadala ang bagong code.', 'A new code was sent.');

  // Login with a 6-digit code sent to the email, no password needed.
  function viewOtp() {
    let email = lastEmail();
    const ask = () => {
      authShell(`<p class="muted small auth-note" style="margin-top:0">${L('Magpapadala kami ng 6-digit na code sa email mo. Iyon ang gagamitin mo para mag-login.', 'We will send a 6-digit code to your email. Use it to log in.')}</p>
        <form id="of" class="auth-form" novalidate>
          <input id="email" type="email" autocomplete="username" placeholder="Email" aria-label="Email" value="${esc(email)}">
          <div class="err" id="err"></div>
          <button class="btn block" type="submit">${L('Ipadala ang code', 'Send code')}</button>
        </form><a class="auth-link" href="#/login">${L('Gamitin ang password', 'Use password')}</a>`,
      noAccount());
      $('#email').focus({ preventScroll: true });
      $('#of').onsubmit = async (e) => {
        e.preventDefault();
        const btn = $('button[type=submit]', e.target); btn.disabled = true; $('#err').textContent = '';
        email = $('#email').value.trim();
        try { await api('POST', '/api/auth/otp', { email }); enter(); } catch (err) { $('#err').textContent = err.message; btn.disabled = false; }
      };
    };
    const enter = () => {
      authShell(`<p class="muted small auth-note" style="margin-top:0">${L(`Kung may account ang <b>${esc(email)}</b>, may code nang dumating doon. Tingnan din ang Spam o Promotions.`, `If <b>${esc(email)}</b> has an account, a code was sent there. Also check Spam or Promotions.`)}</p>
        <form id="cf" class="auth-form" novalidate>
          <input id="code" class="code-input" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456" aria-label="Code">
          <div class="err" id="err"></div>
          <button class="btn block" type="submit">${L('Mag-login', 'Log in')}</button>
        </form>
        <div class="auth-alt"><button class="btn ghost" id="again" type="button">${L('Ipadala ulit', 'Send again')}</button><button class="btn ghost" id="other" type="button">${L('Ibang email', 'Other email')}</button></div>`);
      const code = $('#code');
      code.focus({ preventScroll: true });
      code.oninput = () => { if (/^\d{6}$/.test(code.value.trim())) $('#cf').requestSubmit(); };
      $('#cf').onsubmit = async (e) => {
        e.preventDefault();
        const btn = $('button[type=submit]', e.target); btn.disabled = true; $('#err').textContent = '';
        try { await afterLogin(await api('POST', '/api/auth/otp/login', { email, code: code.value }), loggedIn()); } catch (err) { $('#err').textContent = err.message; btn.disabled = false; }
      };
      $('#again').onclick = async () => { try { await api('POST', '/api/auth/otp', { email }); toast(codeSent()); } catch (err) { $('#err').textContent = err.message; } };
      $('#other').onclick = ask;
    };
    ask();
  }

  function viewVerify() {
    authShell(`<p class="muted small auth-note" style="margin-top:0">${L(`Nagpadala kami ng 6-digit na code sa <b>${esc(S.user.email)}</b> para ma-verify ang email mo. Tingnan din ang Spam o Promotions.`, `We sent a 6-digit code to <b>${esc(S.user.email)}</b> to verify your email. Also check Spam or Promotions.`)}</p>
      <form id="vf" class="auth-form"><input id="code" class="code-input" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456" aria-label="Code">
        <div class="err" id="err"></div><button class="btn block" type="submit">${L('I-verify', 'Verify')}</button></form>
      <div class="auth-alt"><button class="btn ghost" id="resend" type="button">${L('Ipadala ulit', 'Send again')}</button><button class="btn ghost" id="out" type="button">${L('Mag-logout', 'Log out')}</button></div>`);
    $('#vf').onsubmit = async (e) => {
      e.preventDefault();
      try { await api('POST', '/api/auth/verify', { code: $('#code').value }); await refreshMe(); toast(L('Na-verify na ang email mo!', 'Your email is verified!')); go('#/'); setTimeout(offerBio, 700); } catch (err) { $('#err').textContent = err.message; }
    };
    $('#resend').onclick = async () => { try { await api('POST', '/api/auth/resend'); toast(codeSent()); } catch (err) { $('#err').textContent = err.message; } };
    $('#out').onclick = () => logout(false);
  }

  function viewForgot() {
    let email = lastEmail();
    authShell(`<p class="muted small auth-note" style="margin-top:0">${L('Magpapadala kami ng code sa email mo para makagawa ka ng bagong password.', 'We will send a code to your email so you can make a new password.')}</p>
      <div id="fbox"><form id="ff" class="auth-form"><input id="email" type="email" autocomplete="email" placeholder="Email" aria-label="Email" value="${esc(email)}">
        <div class="err" id="err"></div><button class="btn block" type="submit">${L('Ipadala ang code', 'Send code')}</button></form></div>
      <a class="auth-link" href="#/login">${L('Bumalik sa login', 'Back to login')}</a>`);
    $('#ff').onsubmit = async (e) => {
      e.preventDefault();
      email = $('#email').value.trim();
      try {
        await api('POST', '/api/auth/forgot', { email });
        $('#fbox').innerHTML = `<p class="small" style="margin-top:0">${L(`Kung may account ang <b>${esc(email)}</b>, may code nang dumating doon.`, `If <b>${esc(email)}</b> has an account, a code was sent there.`)}</p>
          <form id="rf" class="auth-form"><input id="code" class="code-input" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="123456" aria-label="Code">
          <input id="npw" type="password" autocomplete="new-password" placeholder="${L('Bagong password (8 characters pataas)', 'New password (8 characters or more)')}" aria-label="${L('Bagong password', 'New password')}">
          <div class="err" id="err"></div><button class="btn block" type="submit">${L('I-save ang bagong password', 'Save new password')}</button></form>`;
        $('#rf').onsubmit = async (ev) => {
          ev.preventDefault();
          try { await api('POST', '/api/auth/reset', { email, code: $('#code').value, password: $('#npw').value }); Bio.forget(true); toast(L('Napalitan na ang password. Mag-login na.', 'Password changed. Please log in.')); go('#/login'); } catch (err) { $('#err').textContent = err.message; }
        };
      } catch (err) { $('#err').textContent = err.message; }
    };
  }

  async function viewSets(mode) {
    const e = S.meta.exams[mode];
    if (!e) return go('#/');
    const saved = (pack()?.sets || []).filter((x) => x.mode === mode);
    const local = canOffline();
    const paint = (sets) => {
      if (!sets) sets = saved.map((x) => ({ id: x.id, number: x.number, created_at: x.created_at, taken: 0 }));
      if (S.offline) sets = sets.filter((x) => saved.some((y) => y.id === x.id));
      const free = isFree();
      const usedUp = free && (S.mockToday || 0) >= S.config.free.mock_daily;
      // Set 1 is pinned on top (it is the free set and the one on Home), then the others from newest to oldest.
      const one = sets.find((x) => x.number === 1), rest = sets.filter((x) => x.number !== 1);
      const newest = Math.max(0, ...sets.map((x) => x.number));
      const row = (x) => `
        <div class="list-item${x.number === 1 ? ' set-one' : ''}">
          <div class="grow"><div class="row" style="gap:6px"><b>Set ${x.number}</b>${x.number === newest ? `<span class="pill ok">${L('Pinakabago', 'Newest')}</span>` : ''}${x.number === 1 ? `<span class="pill">${L('Simulan dito', 'Start here')}</span>` : ''}${free && !x.locked ? `<span class="pill">${L('Libre', 'Free')}</span>` : ''}</div>
          <div class="muted small">${L('Inilabas', 'Released')} ${new Date(x.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}${x.taken ? L(` · Nasubukan ${x.taken}x · Best ${x.best}%`, ` · Taken ${x.taken}x · Best ${x.best}%`) : ''}${local && saved.some((y) => y.id === x.id) ? L(' · ⚡ Naka-save sa device', ' · ⚡ Saved on device') : ''}</div></div>
          <button class="btn small ${x.locked ? 'secondary' : ''}" data-set="${x.id}" data-locked="${x.locked ? 1 : ''}" ${usedUp && !x.locked ? 'disabled' : ''}>${x.locked ? '🔒 Premium' : x.taken ? L('Ulitin', 'Retake') : L('Simulan', 'Start')}</button>
        </div>`;
      shell('home', `
      <p class="small" style="margin:0"><a href="#/">‹ Home</a></p>
      <div class="row" style="gap:10px;flex-wrap:nowrap"><h1 style="margin:8px 0 4px">${esc(e.title.replace(' Mock Exam', ''))}</h1>${showLevel() ? levelChip(mode, 'big') : ''}</div>
      <p class="muted" style="margin-top:0">${L(`${e.items} tanong · ${fmtDur(e.minutes)} · Passing ${e.passing}%. Pumili ng exam set, mula pinakabago hanggang pinakaluma.`, `${e.items} questions · ${fmtDur(e.minutes)} · Passing ${e.passing}%. Choose an exam set, newest first.`)}</p>
      ${free ? `<div class="notice" style="margin:12px 0">${L(`🔓 Libre ang <b>Set ${S.config.free.sets > 1 ? '1 hanggang ' + S.config.free.sets : '1'}</b> para masubukan mo. Para sa lahat ng set, Bagong halo, at offline na paggamit, <a href="#/premium">kumuha ng Premium →</a>`,
        `🔓 <b>Set ${S.config.free.sets > 1 ? '1 to ' + S.config.free.sets : '1'}</b> is free so you can try it. For all sets, New mix, and offline use, <a href="#/premium">get Premium →</a>`)}
        ${usedUp ? `<br><b>${L('Nagamit mo na ang libreng mock exam ngayong araw.', 'You have used today\'s free mock exam.')}</b> ${L('Bumalik bukas.', 'Come back tomorrow.')}` : ''}</div>` : ''}
      ${one ? `<div class="list" style="margin-bottom:12px">${row(one)}</div>` : ''}
      ${S.offline && !local ? `<div class="notice" style="margin-bottom:12px">${L('Walang internet. Para sa Premium lang ang offline na paggamit.', 'No internet. Offline use is for Premium only.')}</div>` : `
      <div class="card" style="margin-bottom:12px"><div class="row between"><div><h3>${L('Bagong halo ng tanong', 'New mix of questions')}</h3><p class="muted small" style="margin:0">${L(`Bagong random na ${e.items} tanong.`, `${e.items} new random questions.`)}</p></div>
        <button class="btn secondary" data-random>${free ? '🔒 ' : ''}${L('Simulan', 'Start')}</button></div></div>`}
      ${rest.length ? `<h3 style="margin:4px 0 8px">${L('Iba pang exam set (pinakabago muna)', 'Other exam sets (newest first)')}</h3>` : ''}
      <div class="list">${rest.map(row).join('') || (one ? '' : `<div class="card empty">${L('Wala pang exam set.', 'No exam sets yet.')}</div>`)}</div>`);
      if ($('[data-random]')) $('[data-random]').onclick = () => (free ? go('#/premium') : startExam(mode));
      $$('[data-set]').forEach((b) => (b.onclick = () => (b.dataset.locked ? go('#/premium') : startExam(mode, { set_id: +b.dataset.set }))));
    };
    await swr('/api/sets?mode=' + mode, paint, () => null);
  }

  async function viewPremium() {
    shell('account', `<div class="empty">${L('Naglo-load…', 'Loading…')}</div>`);
    const p = await api('GET', '/api/premium');
    const until = p.until > Date.now() ? new Date(p.until).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    const pending = p.payments.find((x) => x.status === 'pending');
    const openPay = p.payments.find((x) => x.status === 'checkout' && x.checkout_url);
    const manual = p.manual && p.methods.length; // manual payment: on in Admin → Settings, with at least one account
    const statusPill = { pending: `<span class="pill warn">${L('Hinihintay', 'Waiting')}</span>`, checkout: `<span class="pill warn">${L('Hindi pa bayad', 'Not paid yet')}</span>`, approved: `<span class="pill ok">${L('Bayad na', 'Paid')}</span>`, rejected: `<span class="pill bad">${L('Hindi approved', 'Not approved')}</span>`, expired: '<span class="pill">Expired</span>' };
    if (S.user.role !== 'admin' && p.active && p.until !== S.user.premium_until) refreshMe().catch(() => {}); // Premium just started or was extended
    shell('account', `
      <h1>Premium</h1>
      ${premiumNotice()}
      <div class="card">
        ${S.user.role === 'admin' ? `<p class="muted" style="margin:0">${L('Admin ka, kaya bukas sa iyo ang lahat ng mock exam.', 'You are an admin, so all mock exams are open to you.')}</p>`
          : p.active && until ? `<h3 style="color:var(--ok)">✅ ${L('Aktibo ang Premium mo', 'Your Premium is active')}</h3><p class="muted" style="margin:0">${L(`Hanggang <b>${esc(until)}</b>. Pwede mo itong i-extend anumang oras.`, `Until <b>${esc(until)}</b>. You can extend it any time.`)}</p>`
          : !p.required ? `<p class="muted" style="margin:0">${L('Libre pa ang lahat ng mock exam sa ngayon.', 'All mock exams are free for now.')}</p>`
          : `<h3>🔒 ${L('Wala ka pang Premium', 'You do not have Premium yet')}</h3>
            <table class="small" style="width:100%;margin-top:8px"><tr><th></th><th>${L('Libre', 'Free')}</th><th>Premium</th></tr>
            <tr><td>${L('Practice kada subject', 'Practice by subject')}</td><td>${L(`${S.config.free.practice_daily}x kada araw, hanggang ${S.config.free.practice_items} tanong`, `${S.config.free.practice_daily}x a day, up to ${S.config.free.practice_items} questions`)}</td><td>${L('Walang limit', 'No limit')}</td></tr>
            <tr><td>${L('Mock exam (Pro at Subpro)', 'Mock exam (Pro and Subpro)')}</td><td>${L(`Set 1 lang, ${S.config.free.mock_daily ?? 1}x kada araw`, `Set 1 only, ${S.config.free.mock_daily ?? 1}x a day`)}</td><td>${L('Lahat ng set + Bagong halo, walang limit', 'All sets + New mix, no limit')}</td></tr>
            <tr><td>${L('Review ng mock exam', 'Mock exam review')}</td><td>${L('Score kada subject + letra ng tamang sagot', 'Score by subject + letter of the correct answer')}</td><td>${L('Buong tanong, paliwanag, score kada topic, PDF / email / print', 'Full questions, explanations, score by topic, PDF / email / print')}</td></tr>
            <tr><td>Ads</td><td>${L('Mayroon', 'Yes')}</td><td>${L('Wala', 'None')}</td></tr>
            <tr><td>${L('Offline (walang internet)', 'Offline (no internet)')}</td><td>${L('Hindi', 'No')}</td><td>${L('Oo, buong app', 'Yes, the whole app')}</td></tr>
            <tr><td>${L('Bilis', 'Speed')}</td><td>${L('Hinihintay ang server', 'Waits for the server')}</td><td>${L('Agad-agad (naka-save sa device)', 'Instant (saved on the device)')}</td></tr>
            <tr><td>Login</td><td>${L('Password o code sa email', 'Password or email code')}</td><td>${L('Pati fingerprint / face / Windows Hello', 'Also fingerprint / face / Windows Hello')}</td></tr></table>`}
      </div>
      ${S.user.role === 'admin' ? '' : `<div class="card" style="margin-top:12px">
        <h3>${p.active && until ? L('I-extend ang Premium', 'Extend Premium') : L('Kumuha ng Premium', 'Get Premium')}</h3>
        <p style="margin:6px 0"><span class="pill warn" style="font-size:15px">${L(`₱${esc(p.price)} para sa ${p.plan_days} araw`, `₱${esc(p.price)} for ${p.plan_days} days`)}</span></p>
        ${p.online ? `
        <p class="small" style="margin:8px 0">${L('Magbayad online gamit ang <b>GCash, Maya, card, GrabPay, o QR Ph</b> (para sa bank apps) at iba pa. Awtomatikong bubukas ang Premium pagkatapos magbayad.', 'Pay online with <b>GCash, Maya, card, GrabPay, or QR Ph</b> (for bank apps) and more. Premium opens automatically after you pay.')}</p>
        ${openPay ? `<div class="notice" style="margin-bottom:10px">${L('May bukas kang bayaran. Kung nakapagbayad ka na, pindutin ang <b>I-check ang bayad</b>.', 'You have an open payment. If you already paid, tap <b>Check payment</b>.')}</div>` : ''}
        <div class="err" id="perr"></div>
        <button class="btn block" id="paynow">💳 ${openPay ? L('Ituloy ang pagbayad', 'Continue payment') : L('Magbayad online', 'Pay online')}</button>
        ${openPay ? `<button class="btn block secondary" id="paycheck" style="margin-top:8px">${L('I-check ang bayad', 'Check payment')}</button>` : ''}` : ''}
        ${manual ? `${p.online ? `<h3 style="margin-top:18px">${L('O magbayad nang manual', 'Or pay manually')}</h3>` : ''}
        <p class="small" style="margin:6px 0">${L('Pumili kung saan magbabayad:', 'Choose where to pay:')}</p>
        <div class="seg" id="pmSel">${p.methods.map((m, i) => `<button type="button" data-pm="${esc(m.id)}" class="${i ? '' : 'active'}">${esc(m.name)}${p.methods.filter((x) => x.name === m.name).length > 1 && m.account ? ` <span class="small muted">…${esc(m.account.replace(/\s/g, '').slice(-4))}</span>` : ''}</button>`).join('')}</div>
        <div id="pmInfo"></div>
        ${p.note ? `<p class="muted small">${esc(p.note)}</p>` : ''}
        ${pending ? `<div class="notice">${L('Hinihintay pang ma-check ang bayad mo', 'Your payment is still waiting to be checked')} (${esc(pending.method)}, ref: <b>${esc(pending.reference)}</b>).</div>` : `
        <form id="payf"><label>Reference number</label><input type="text" id="ref" placeholder="${L('hal.', 'e.g.')} 1012 345 678901" autocomplete="off">
          <label>${L('Screenshot ng resibo (opsyonal, pero mas mabilis ma-approve)', 'Screenshot of the receipt (optional, but approved faster)')}</label>
          <input type="file" id="proof" accept="image/*"><img id="proofPrev" class="proof-prev" alt="" hidden>
          <div class="err" id="err"></div><button class="btn block ${p.online ? 'secondary' : ''}" type="submit">${L('Ipadala', 'Send')}</button></form>`}` : ''}
        ${!p.online && !manual ? `<div class="notice">${L('Wala pang bukas na paraan ng bayad. Makipag-ugnayan sa admin.', 'No payment method is open yet. Please contact the admin.')}</div>` : ''}
      </div>`}
      ${p.payments.length ? `<h2>${L('Mga bayad mo', 'Your payments')}</h2><div class="list">${p.payments.map((x) => `<div class="list-item"><div class="grow"><b>₱${esc(x.amount)}</b> · ${esc(x.method)}${x.provider && x.provider !== 'manual' ? '' : ' · ref ' + esc(x.reference)}
        <div class="muted small">${fmtDate(x.created_at)}${x.note ? ' · ' + esc(x.note) : ''}</div></div>${statusPill[x.status] || ''}${x.status === 'approved' ? `<button type="button" class="btn ghost small" data-rc="${x.id}" aria-label="${L('Resibo', 'Receipt')} ₱${esc(x.amount)}">🧾 ${L('Resibo', 'Receipt')}</button>` : ''}</div>`).join('')}</div>` : ''}`);
    $$('[data-rc]').forEach((b) => (b.onclick = () => showReceipt(+b.dataset.rc)));
    // PayMongo's checkout page. In the phone and desktop apps it opens in the browser.
    if ($('#paynow')) $('#paynow').onclick = async (e) => {
      e.target.disabled = true;
      try { const r = await api('POST', '/api/payments/checkout', {}); location.href = r.url; } catch (err) { $('#perr').textContent = err.message; e.target.disabled = false; }
    };
    if ($('#paycheck')) $('#paycheck').onclick = () => viewPremium();
    // Manual payment: the chosen account's details and QR code.
    let pm = p.methods[0], proof = null;
    const pmInfo = () => {
      if (!pm || !$('#pmInfo')) return;
      const acct = /^https?:\/\//.test(pm.account) ? `<a href="${esc(pm.account)}" target="_blank" rel="noopener">${esc(pm.account)}</a>` : `<b>${esc(pm.account)}</b>`;
      $('#pmInfo').innerHTML = `<ol class="small" style="padding-left:18px">
        <li>${L('Magpadala ng', 'Send')} <b>₱${esc(p.price)}</b> ${L('sa', 'to')} <b>${esc(pm.name)}</b>${pm.bank && pm.bank !== pm.name ? ` (${esc(pm.bank)})` : ''}${pm.account ? `: ${acct}` : ''}${pm.account_name ? ` · ${esc(pm.account_name)}` : ''}.</li>
        <li>${L('Kopyahin ang <b>reference number</b> (o transaction ID) mula sa resibo.', 'Copy the <b>reference number</b> (or transaction ID) from the receipt.')}</li>
        <li>${L('Ilagay ito sa ibaba, kasama ang screenshot ng resibo. Makakatanggap ka ng email kapag na-approve na.', 'Enter it below, with a screenshot of the receipt. You will get an email once it is approved.')}</li></ol>
        ${pm.has_qr ? `<img class="pay-qr" src="${API}/api/pay/qr/${encodeURIComponent(pm.id)}" alt="QR ${esc(pm.name)}"><p class="muted small" style="text-align:center;margin:4px 0 0">${L('I-scan ang QR sa app ng', 'Scan the QR in the app of')} ${esc(pm.name)}</p>` : ''}
        ${pm.note ? `<p class="muted small">${esc(pm.note)}</p>` : ''}`;
    };
    $$('#pmSel [data-pm]').forEach((b) => (b.onclick = () => { pm = p.methods.find((m) => m.id === b.dataset.pm); $$('#pmSel button').forEach((x) => x.classList.toggle('active', x === b)); pmInfo(); }));
    pmInfo();
    if ($('#proof')) $('#proof').onchange = async (e) => {
      const file = e.target.files[0]; proof = null; $('#proofPrev').hidden = true;
      if (!file) return;
      try { proof = await readImage(file, 1280); $('#proofPrev').src = proof; $('#proofPrev').hidden = false; } catch { $('#err').textContent = L('Hindi mabasa ang larawan.', 'The picture cannot be read.'); }
    };
    const f = $('#payf');
    if (f) f.onsubmit = async (e) => {
      e.preventDefault();
      const btn = $('button[type=submit]', f); btn.disabled = true;
      try { await api('POST', '/api/payments', { method_id: pm && pm.id, reference: $('#ref').value, proof }); toast(L('Naipadala! Hintayin ang email ng confirmation.', 'Sent! Wait for the confirmation email.')); viewPremium(); } catch (err) { $('#err').textContent = err.message; btn.disabled = false; }
    };
  }

  /* Receipt of a Premium payment: shown in the app, saved as PDF or printed. Proof of payment, not a BIR invoice.
     The same receipt is attached to the approval email. Kept on the device, so it opens offline too. */
  async function showReceipt(id) {
    let r;
    try { r = await cachedGet(`/api/payments/${id}/receipt`); } catch (e) { return toast(e.message); }
    const day = (ms) => new Date(ms).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    const body = `<div class="receipt" id="rcBody">
      <div class="rc-biz"><b>${esc(r.business || 'CSE Reviewer')}</b>${r.contact ? `<div class="muted small">${esc(r.contact)}</div>` : ''}</div>
      <h2 style="margin:10px 0 4px">${L('Resibo ng bayad', 'Payment receipt')}</h2><div class="muted small">${esc(r.no)}</div>
      <table class="small" style="margin-top:10px"><tbody>
        <tr><td>${L('Petsa', 'Date')}</td><td>${esc(day(r.date))}</td></tr>
        <tr><td>${L('Pangalan', 'Name')}</td><td>${esc(r.name)}<div class="muted">${esc(r.email)}</div></td></tr>
        <tr><td>${L('Para sa', 'For')}</td><td>CSE Reviewer Premium${r.days ? ` (${r.days} ${L('araw', 'days')})` : ''}</td></tr>
        ${r.period_from ? `<tr><td>${L('Premium mula', 'Premium period')}</td><td>${esc(day(r.period_from))} – ${esc(day(r.period_to))}</td></tr>` : ''}
        <tr><td>${L('Paraan', 'Method')}</td><td>${esc(r.method)}</td></tr>
        ${r.reference ? `<tr><td>Reference</td><td>${esc(r.reference)}</td></tr>` : ''}
        <tr class="rc-total"><td><b>${L('Kabuuan', 'Total')}</b></td><td><b>₱${esc(r.amount)}</b> · <span style="color:var(--ok)">${L('Bayad na', 'Paid')}</span></td></tr>
      </tbody></table>
      <p class="muted small">${L('Patunay ito ng bayad sa app. Hindi ito BIR invoice.', 'This is proof of payment in the app. It is not a BIR invoice.')}</p></div>`;
    modal(`${body}<div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost" data-x>${L('Isara', 'Close')}</button>
      <button class="btn secondary" data-print>🖨️ Print</button><button class="btn" data-pdf>📄 PDF</button></div>`, (bg, close) => {
      $('[data-x]', bg).onclick = close;
      $('[data-pdf]', bg).onclick = async () => {
        try { const how = await saveFile(`Resibo-${r.no}.pdf`, window.CSEPDF.receipt(r, { lang }), 'application/pdf'); toast(how === 'shared' ? L('Pumili kung saan ise-save ang PDF.', 'Choose where to save the PDF.') : L('Na-save ang PDF (tingnan ang Downloads).', 'PDF saved (see Downloads).')); } catch (e) { toast(e.message); }
      };
      $('[data-print]', bg).onclick = () => {
        if (capNative) return $('[data-pdf]', bg).click();
        let el = document.getElementById('printArea');
        if (!el) { el = document.createElement('div'); el.id = 'printArea'; document.body.appendChild(el); }
        el.innerHTML = $('#rcBody', bg).outerHTML;
        const done = () => { document.body.classList.remove('printing'); el.innerHTML = ''; window.removeEventListener('afterprint', done); };
        window.addEventListener('afterprint', done); document.body.classList.add('printing'); setTimeout(() => window.print(), 50);
      };
    });
  }

  /* ---------------- home ---------------- */
  async function viewHome() {
    await swr(['/api/attempts', '/api/stats'], ([l0, s0]) => paintHome(l0, s0), (i) => (i ? null : []));
  }
  // Premium ends in 5 days or less, or ended in the last 3 days (Home, Account, Premium).
  function premiumNotice() {
    if (!S.user || S.user.role === 'admin' || !S.config || !S.config.premium_required || !S.user.premium_until) return '';
    const left = S.user.premium_until - Date.now(), day = new Date(S.user.premium_until).toLocaleDateString('en-PH', { month: 'long', day: 'numeric' });
    if (left > 5 * 864e5 || left < -3 * 864e5) return '';
    const d = Math.ceil(left / 864e5);
    return `<a class="notice expiry-notice" href="#/premium" role="status">${left > 0
      ? L(`⏳ <b>Matatapos ang Premium mo ${d <= 1 ? 'bukas' : `sa ${d} araw`}</b> (${esc(day)}). I-extend para tuloy ang lahat ng exam set at offline →`, `⏳ <b>Your Premium ends ${d <= 1 ? 'tomorrow' : `in ${d} days`}</b> (${esc(day)}). Extend it to keep all exam sets and offline →`)
      : L(`⌛ <b>Natapos na ang Premium mo</b> noong ${esc(day)}. Naka-save pa rin ang lahat ng resulta mo. I-extend →`, `⌛ <b>Your Premium ended</b> on ${esc(day)}. All your results are still saved. Extend →`)}</a>`;
  }
  // Streak strip on Home: days in a row, the last 7 days, and the reminder.
  function streakCard() {
    const days = studyDays(), st = streakOf(days), set = new Set(days), today = phDay(), r = Reminders.get();
    const names = lang === 'en' ? ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] : ['Li', 'Lu', 'Ma', 'Mi', 'Hu', 'Bi', 'Sa'];
    const week = Array.from({ length: 7 }, (_, i) => today - 6 + i).map((d) => {
      const wd = new Date(d * 864e5).getUTCDay();
      return `<span class="sday ${set.has(d) ? 'on' : ''} ${d === today ? 'today' : ''}" title="${set.has(d) ? L('Nag-aral', 'Studied') : L('Hindi nag-aral', 'No study')}"><i aria-hidden="true">${set.has(d) ? '✓' : ''}</i>${names[wd]}</span>`;
    }).join('');
    return `<div class="card streak-card" role="group" aria-label="${L(`Streak: ${st.current} araw na sunod-sunod`, `Streak: ${st.current} days in a row`)}">
      <div class="row between" style="flex-wrap:nowrap"><div><div class="streak-n"><span aria-hidden="true">🔥</span> ${st.current ? `${st.current} ${L(st.current === 1 ? 'araw' : 'araw sunod-sunod', st.current === 1 ? 'day' : 'days in a row')}` : L('Wala pang streak', 'No streak yet')}</div>
        <div class="muted small">${st.today ? L('✅ Nakapag-aral ka na ngayon. Galing!', '✅ You studied today. Nice!') : st.current ? L('Mag-practice ngayon para tuloy ang streak.', 'Practice today to keep the streak.') : L('Simulan ang streak: kahit isang practice ngayon.', 'Start a streak: just one practice today.')}${st.best > st.current ? ` · ${L('Pinakamahaba', 'Best')}: ${st.best}` : ''}</div></div>
        <a class="btn ghost small" href="#/account" data-open="acc-remind" aria-label="${L('Paalala sa pag-aaral', 'Study reminder')}">⏰ ${r.on ? fmtClock(r.time) : L('Paalala', 'Reminder')}</a></div>
      <div class="sweek">${week}</div></div>`;
  }
  function paintHome(l0, s0) {
    if (s0 && Array.isArray(s0.days)) store.set(uk('cse-days'), s0.days);
    const { list, stats } = withLocal(l0, s0);
    const open = list.filter((a) => !a.finished_at);
    const done = list.filter((a) => a.finished_at);
    const mocks = stats.mocks;
    const best = mocks.length ? Math.max(...mocks.map((m) => m.pct)) : null;
    const ex = S.meta.exams;
    // The level is big and always on screen (every user). Pick PRO or SUBPRO, and its mock exam is right below.
    const lv = myLevel(), le = ex[lv];
    const levelHome = () => `
      <div class="level-switch" role="group" aria-label="Level">${Object.entries(LEVELS).map(([k, [c, n]]) => `
        <button type="button" class="lvl-opt ${k} ${k === lv ? 'active' : ''}" data-level="${k}" aria-pressed="${k === lv}"><span class="lvl-chip ${k} big">${c}</span><span class="lvl-name"><b>${n}</b><small>${ex[k].items} items · ${fmtDur(ex[k].minutes)}</small></span></button>`).join('')}
      </div>
      <div class="card level-card ${lv}">
        <div class="row between" style="flex-wrap:nowrap"><h2 style="margin:0">${esc(le.title.replace(' Mock Exam', ''))}</h2>${levelChip(lv, 'big')}</div>
        <div class="exam-card" style="margin-top:8px">
        <div class="meta"><span class="pill warn">${le.items} items</span><span class="pill warn">${fmtDur(le.minutes)}</span><span class="pill warn">Passing ${le.passing}%</span></div>
        <p class="muted small" style="margin:4px 0">${lv === 'pro' ? L('Para sa second-level positions sa gobyerno (hal. Admin Officer, Analyst).', 'For second-level government positions (e.g. Admin Officer, Analyst).') : L('Para sa first-level positions (hal. clerk, aide, technician).', 'For first-level positions (e.g. clerk, aide, technician).')}</p>
        <p class="small" style="margin:0 0 10px">${le.sections.map((s) => `${esc(subjName(s.subject))} (${s.count})`).join(' · ')}</p>
        <div class="row"><button class="btn" type="button" data-set1="${lv}">▶ ${L('Simulan ang Set 1', 'Start Set 1')}</button><a class="btn secondary" href="#/sets/${lv}">${L('Lahat ng exam set', 'All exam sets')}</a></div>
        </div></div>`;
    const freeMockDone = isFree() && (S.mockToday || 0) >= S.config.free.mock_daily;
    shell('home', `
      <h1>${L('Kumusta', 'Hello')}, ${esc(S.user.name.split(' ')[0])}! 👋</h1>
      ${premiumNotice()}
      ${Reminders.due() ? `<div class="notice" role="status" style="margin:8px 0">⏰ ${L('Oras na ng review mo ngayong araw. <a href="#/practice">Mag-practice</a> o <a href="#/review">balikan ang mga mali</a>.', 'It is your review time today. <a href="#/practice">Practice</a> or <a href="#/review">go over your mistakes</a>.')}</div>` : ''}
      ${isFree() ? `<a class="notice" href="#/premium" style="display:block;margin:8px 0">${L(`🆓 <b>Libreng plan:</b> ${S.config.free.practice_daily} practice kada araw (hanggang ${S.config.free.practice_items} tanong), at ${S.config.free.mock_daily === 1 ? 'isang' : S.config.free.mock_daily} mock exam kada araw (Set 1 lang). Letra lang ng tamang sagot ang review. May ads at kailangan ng internet.<br>⭐ <b>Premium:</b> walang limit at walang ads, lahat ng exam set, buong review na may paliwanag, PDF/print/email ng resulta, at gumagana offline. Kumuha ng Premium →`,
        `🆓 <b>Free plan:</b> ${S.config.free.practice_daily} practice a day (up to ${S.config.free.practice_items} questions), and ${S.config.free.mock_daily === 1 ? 'one' : S.config.free.mock_daily} mock exam a day (Set 1 only). The review shows only the letter of the correct answer. Has ads and needs internet.<br>⭐ <b>Premium:</b> no limits and no ads, all exam sets, full review with explanations, PDF/print/email of results, and works offline. Get Premium →`)}</a>` : ''}
      ${freeMockDone ? `<div class="notice" style="margin:8px 0;background:var(--warn-soft)">${L('✅ Nagamit mo na ang libreng mock exam ngayong araw. Bumalik bukas, o <a href="#/premium">kumuha ng Premium</a> para walang limit.', '✅ You have used today\'s free mock exam. Come back tomorrow, or <a href="#/premium">get Premium</a> for no limit.')}</div>` : ''}
      <p class="muted" style="margin-top:0">${L('Pumili ng mock exam. Nasa <a href="#/practice">Practice</a> ang practice kada subject.', 'Choose a mock exam. Practice by subject is in <a href="#/practice">Practice</a>.')}</p>
      ${open.length ? `<div class="notice" style="margin:12px 0">${L('May hindi ka pa natatapos na exam:', 'You have an unfinished exam:')} <b>${esc(open[0].title)}</b>. <a href="#/exam/${open[0].id}">${L('Ituloy ito →', 'Continue →')}</a></div>` : ''}
      ${list.some((a) => a.pending && a.finished_at) ? `<p class="muted small">${L('⏳ May mga resulta kang ginawa offline. Ise-save ang mga ito online kapag may internet na.', '⏳ You have results made offline. They will be saved online when the internet is back.')}</p>` : ''}
      ${levelHome()}
      ${streakCard()}
      <a class="card review-link" href="#/review"><span class="ic" aria-hidden="true">🎯</span><span class="grow"><b>${L('Balikan ang mga mali', 'Go over your mistakes')}</b><span class="muted small">${L('Sagutan ulit ang mga namali mo at alamin ang pinakamahinang topic mo.', 'Answer your mistakes again and see your weakest topics.')}</span></span><span aria-hidden="true">›</span></a>
      ${fold('home-progress', `<h2>${L('Ang progress mo', 'Your progress')}</h2>`, `
      <div class="grid stats">
        <div class="card stat"><div class="v">${stats.attempts}</div><div class="l">${L('Natapos na exam/practice', 'Exams/practice finished')}</div></div>
        <div class="card stat"><div class="v">${mocks.length}</div><div class="l">${L('Mock exam na natapos', 'Mock exams finished')}</div></div>
        <div class="card stat"><div class="v">${best === null ? '–' : best + '%'}</div><div class="l">${L('Pinakamataas na mock score', 'Highest mock score')}</div></div>
        <div class="card stat"><div class="v">${mocks.filter((m) => m.pct >= 80).length}</div><div class="l">${L('Pasado (80% pataas)', 'Passed (80% and up)')}</div></div>
      </div>
      <div class="card" style="margin-top:12px"><h3>${L('Score kada subject', 'Score by subject')}</h3>${Object.keys(stats.subjects).length ? subjectBars(stats.subjects)
        : `<p class="muted small" style="margin:6px 0 0">${L('Lalabas dito ang score mo kada subject pagkatapos ng unang exam o practice.', 'Your score by subject shows here after your first exam or practice.')}</p>`}</div>`, { card: false })}
      ${fold('home-recent', `<h2>${L('Mga huling exam', 'Recent exams')}</h2>`, done.length ? `<div class="list">${done.slice(0, 5).map(attemptRow).join('')}</div><p><a href="#/history">${L('Tingnan lahat →', 'See all →')}</a></p>` : `<div class="card empty">${L('Wala ka pang natatapos na exam. Subukan ang isang mock exam!', 'You have not finished an exam yet. Try a mock exam!')}</div>`, { card: false })}
    `);
    $$('.level-switch [data-level]').forEach((b) => (b.onclick = () => { if (b.dataset.level !== myLevel()) { setLevel(b.dataset.level); paintHome(l0, s0); } }));
    $$('[data-set1]').forEach((b) => (b.onclick = () => startSet1(b.dataset.set1)));
    Tour.maybe();
  }
  // "Set 1" of a mock exam, straight from Home.
  async function startSet1(mode) {
    let set = (pack()?.sets || []).find((x) => x.mode === mode && x.number === 1);
    if (!set) {
      try { set = (await cachedGet('/api/sets?mode=' + mode)).find((x) => x.number === 1); } catch (e) { return toast(e.message); }
    }
    if (!set) return go('#/sets/' + mode);
    startExam(mode, { set_id: set.id });
  }

  function subjectBars(subj) {
    return Object.entries(subj).map(([k, v]) => {
      const p = pct(v.correct, v.total);
      return `<div style="margin:10px 0"><div class="row between small"><span>${esc(subjName(k))}</span><b>${p}% <span class="muted">(${v.correct}/${v.total})</span></b></div>
        <div class="bar ${p >= 80 ? 'ok' : p < 60 ? 'bad' : ''}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}" aria-label="${esc(subjName(k))}"><i style="width:${p}%"></i></div></div>`;
    }).join('');
  }
  function attemptRow(a) {
    const p = pct(a.score, a.total);
    const pass = p >= (a.passing || 80);
    return `<a class="list-item" href="#/result/${a.id}">
      ${showLevel() ? levelChip(levelOf(a)) : ''}
      <div class="grow"><div class="ellipsis"><b>${esc(a.title)}</b></div><div class="muted small">${fmtDate(a.finished_at || a.started_at)}${a.pending ? ' · ⏳ Offline' : ''}</div></div>
      ${a.finished_at ? `<span class="pill ${a.mode === 'practice' ? '' : pass ? 'ok' : 'bad'}">${p}%</span>` : `<span class="pill warn">${L('Hindi tapos', 'Not finished')}</span>`}
    </a>`;
  }

  /* ---------------- screen protection during exams and practice (all users) ----------------
     An app cannot see another person's camera, and cannot show anything on another person's phone.
     So it protects the questions in the ways it can:
     - Android app: screenshots and screen recording are blocked (FLAG_SECURE, see .github/workflows/apps.yml).
       Windows app: same (content protection, see apps/desktop/main.js).
     - A light watermark with the user's email and a Data Privacy Act (RA 10173) warning covers the questions,
       so a photo or video of the screen carries the warning and shows which account it came from.
     - The questions are hidden while the app is in the background or not in focus,
       and cannot be selected, copied or printed. */
  const PRIVACY_LINE = () => L('Protektado ng Data Privacy Act of 2012 (RA 10173). Bawal kopyahin, kunan ng larawan o i-video.', 'Protected by the Data Privacy Act of 2012 (RA 10173). Do not copy, photograph or record.');
  function watermark(who) {
    const x = (t) => esc(t).replace(/[^\x20-\x7e]/g, ''); // plain text only inside the image
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="200"><g transform="rotate(-24 170 100)" fill="#808080" font-family="Arial,sans-serif" text-anchor="middle">`
      + `<text x="170" y="88" font-size="15" font-weight="700">${L('RA 10173 - BAWAL KUNAN NG LARAWAN/VIDEO', 'RA 10173 - NO PHOTOS/VIDEOS')}</text>`
      + `<text x="170" y="112" font-size="14">${x(who)}</text></g></svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }
  function guardOn() {
    document.body.classList.add('guard');
    let wm = document.getElementById('wm'), sh = document.getElementById('shield');
    if (!wm) {
      wm = document.createElement('div'); wm.id = 'wm'; wm.setAttribute('aria-hidden', 'true');
      sh = document.createElement('div'); sh.id = 'shield'; sh.setAttribute('aria-hidden', 'true');
      document.body.append(wm, sh);
    }
    sh.innerHTML = `<div><div style="font-size:40px">🔒</div><b>${L('Nakatago ang tanong', 'The question is hidden')}</b><p class="muted small">${esc(PRIVACY_LINE())}</p></div>`;
    // The admin can turn the watermark off (Admin → Settings → Exam screen). On by default.
    wm.style.backgroundImage = S.config && S.config.watermark === false ? 'none' : `url("${watermark(S.user ? S.user.email : '')}")`;
    Ads.hide(); // never ads during an exam
  }
  function guardOff() { document.body.classList.remove('guard', 'away'); }
  const away = (on) => document.body.classList.toggle('away', on && document.body.classList.contains('guard'));
  document.addEventListener('visibilitychange', () => away(document.hidden));
  document.addEventListener('pause', () => away(true)); // Android/iPhone app goes to the background
  document.addEventListener('resume', () => away(false));
  window.addEventListener('blur', () => away(true));
  window.addEventListener('focus', () => away(false));
  ['copy', 'cut', 'contextmenu', 'selectstart', 'dragstart'].forEach((ev) => document.addEventListener(ev, (e) => {
    if (document.body.classList.contains('guard') && !(e.target.closest && e.target.closest('input, textarea'))) e.preventDefault();
  }));
  document.addEventListener('keyup', (e) => {
    if (e.key !== 'PrintScreen' || !document.body.classList.contains('guard')) return;
    try { navigator.clipboard && navigator.clipboard.writeText(PRIVACY_LINE()).catch(() => {}); } catch { /* ignore */ }
    toast('⚠️ ' + PRIVACY_LINE());
  });
  // Shown once per account, before the first exam or practice.
  async function privacyNotice() {
    if (store.get(uk('cse-privacy-ok'))) return true;
    const ok = await confirmBox(L('Paalala sa privacy', 'Privacy reminder'), L(`Ang mga tanong at ang account mo ay <b>protektado ng Data Privacy Act of 2012 (RA 10173)</b>.
      Bawal kopyahin, i-screenshot, kunan ng larawan, o i-video ang screen habang nag-e-exam.<br><br>
      May malabong watermark ng email mo at babala ng RA 10173 sa screen, kaya makikita ito sa anumang larawan o video na kukunin ng iba.
      Sa Android at Windows app, naka-block ang screenshot at screen recording.`, `The questions and your account are <b>protected by the Data Privacy Act of 2012 (RA 10173)</b>.
      Do not copy, screenshot, photograph, or record the screen during an exam.<br><br>
      A faint watermark of your email and an RA 10173 warning are on the screen, so they show in any photo or video someone takes.
      In the Android and Windows apps, screenshots and screen recording are blocked.`), L('Naiintindihan ko', 'I understand'));
    if (ok) store.set(uk('cse-privacy-ok'), 1);
    return ok;
  }

  async function startExam(mode, opts = {}) {
    // Free plan: today's limit is already used, so say it now instead of after the privacy and start windows.
    if (isFree() && !S.offline && S.countDay === phDay()) { // counts from today (a new day: the server decides)
      const f = S.config.free;
      if (mode !== 'practice' && (S.mockToday || 0) >= f.mock_daily) { toast(serverText('Isang mock exam lang kada araw sa libreng plan. Bumalik bukas o kumuha ng Premium para walang limit.')); return go('#/premium'); }
      if (mode === 'practice' && (S.practiceToday || 0) >= f.practice_daily) { toast(serverText(`Naubos mo na ang ${f.practice_daily} libreng practice ngayong araw. Bumalik bukas o kumuha ng Premium para walang limit.`)); return go('#/premium'); }
    }
    if (!(await privacyNotice())) return;
    if (mode !== 'practice') {
      const e = S.meta.exams[mode];
      const ok = await confirmBox(L(`Simulan ang ${e.title}?`, `Start the ${e.title}?`), L(`Mayroon itong <b>${e.items} tanong</b> at <b>${fmtDur(e.minutes)}</b> na oras, tulad ng totoong CSE (mga ${Math.round((e.minutes * 60) / e.items)} segundo kada tanong). Tuloy-tuloy ang timer kahit isara mo ang app, pero naka-save ang mga sagot mo. May paalala sa 30, 10, 5 at 1 minutong natitira. Kailangan ng ${e.passing}% para pumasa.<br><br>Para parang totoong exam: walang calculator at phone, at sagutan lahat (walang bawas ang mali).`,
        `It has <b>${e.items} questions</b> and <b>${fmtDur(e.minutes)}</b> of time, like the real CSE (about ${Math.round((e.minutes * 60) / e.items)} seconds per question). The timer keeps running even if you close the app, but your answers are saved. You get a reminder at 30, 10, 5 and 1 minute left. You need ${e.passing}% to pass.<br><br>To make it like the real exam: no calculator or phone, and answer everything (wrong answers have no penalty).`), L('Simulan na', 'Start now'));
      if (!ok) return;
    }
    // Premium: the exam is made on the device, so it starts instantly (online or offline).
    if (canOffline() && startLocal(mode, opts)) return;
    if (S.offline || !navigator.onLine) return toast(L('Walang internet. Para sa Premium lang ang offline na paggamit.', 'No internet. Offline use is for Premium only.'));
    try {
      const a = await api('POST', '/api/attempts', { mode, ...opts });
      if (mode === 'practice') S.practiceToday = (S.practiceToday || 0) + 1;
      else S.mockToday = (S.mockToday || 0) + 1;
      go('#/exam/' + a.id);
    } catch (e) {
      if (e.code === 'mock_daily') { S.mockToday = Math.max(S.mockToday || 0, S.config.free.mock_daily); toast(e.message); return go('#/premium'); }
      if (e.code === 'premium') { toast(e.message); return go('#/premium'); }
      toast(e.message);
    }
  }
  // Start an exam from the questions saved on the device.
  // Returns false when the saved questions can't make this exam (then the server makes it).
  function startLocal(mode, opts = {}) {
    const p = pack();
    if (!p) return false;
    let items, title, limit = 0, setId = null;
    const tag = opts.level === 'subpro' ? 'Subpro' : 'Pro';
    if (mode === 'practice' && opts.review === 'mistakes') {
      // "Balikan ang mali" (Premium): the mistakes saved on this device.
      const pool = (S.reviewItems || []).filter((m) => !opts.subject || m.subject === opts.subject);
      if (!pool.length) return false;
      items = shuffle(pool).slice(0, Math.min(opts.count || 20, pool.length)).map(({ from, at, ...it }) => it);
      title = `Practice (${tag}): Mga mali ko (${items.length} items)`;
    } else if (mode === 'practice' && opts.review === 'topic') {
      const key = (it) => it.question + '|' + (it.passage || '');
      const mine = (S.reviewItems || []).filter((m) => m.subject === opts.subject && m.topic === opts.topic).map(({ from, at, ...it }) => it);
      const seen = new Set(mine.map(key));
      const more = shuffle((p.practice[opts.subject] || []).filter((it) => it.topic === opts.topic && !seen.has(key(it))));
      items = [...mine, ...more].slice(0, opts.count || 20);
      if (items.length < 5) return false; // not enough saved: the server makes it
      title = `Practice (${tag}): ${subjName(opts.subject)} · ${opts.topic || '—'} (${items.length} items)`;
    } else if (mode === 'practice') {
      const pool = p.practice[opts.subject] || [];
      if (!pool.length) return false;
      items = shuffle(pool).slice(0, Math.min(opts.count || 20, pool.length));
      const topics = shuffle([...new Set(items.map((x) => x.topic))]);
      items.sort((a, b) => topics.indexOf(a.topic) - topics.indexOf(b.topic));
      title = `Practice (${opts.level === 'subpro' ? 'Subpro' : 'Pro'}): ${subjName(opts.subject)} (${items.length} items)`;
      limit = (Number(opts.minutes) || 0) * 60;
    } else if (opts.set_id) {
      const set = p.sets.find((x) => x.id === opts.set_id);
      if (!set) return false;
      items = set.items; title = set.title; setId = set.id; limit = S.meta.exams[mode].minutes * 60;
    } else {
      // "Bagong halo": a new random mock exam from the saved questions, section by section like the real exam.
      const e = S.meta.exams[mode];
      items = [];
      for (const sec of e.sections) {
        const pool = p.practice[sec.subject] || [];
        if (pool.length < sec.count) return false;
        const pick = shuffle(pool).slice(0, sec.count);
        const topics = shuffle([...new Set(pick.map((x) => x.topic))]);
        pick.sort((a, b) => topics.indexOf(a.topic) - topics.indexOf(b.topic));
        items.push(...pick);
      }
      title = e.title; limit = e.minutes * 60;
    }
    const id = 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    local.save({ id, client_id: id, mode, set_id: setId, subject: opts.subject, title, items, answers: {}, time_limit_sec: limit, started_at: Date.now(), finished_at: null, total: items.length });
    go('#/exam/' + id);
    return true;
  }

  /* ---------------- "Balikan ang mali": mistakes and weak topics ----------------
     The questions you got wrong (answered right later = removed) and your weakest topics, weakest first.
     - Premium: from every exam and practice, all topics, and "Sagutan ulit" starts at once and works offline.
     - Free plan: from practice only (mock exam questions are part of Premium's full review), the 3 weakest
       topics, and each "Sagutan ulit" counts as one of the day's free practice. */
  async function viewReview() {
    await swr('/api/review', paintReview, () => null);
  }
  function paintReview(r) {
    if (!r) return shell('history', `<p class="small" style="margin:0"><a href="#/history">‹ ${L('Resulta', 'Results')}</a></p><div class="card empty">${L('Kailangan ng internet para dito.', 'This needs internet.')}</div>`);
    S.reviewItems = r.items || null;
    const free = isFree(), lv = myLevel();
    const st = { subject: '', count: free ? Math.min(20, S.config.free.practice_items) : 20 };
    const subs = Object.entries(r.by_subject || {});
    const max = free ? S.config.free.practice_items : 100;
    shell('history', `
      <p class="small" style="margin:0"><a href="#/history">‹ ${L('Resulta', 'Results')}</a></p>
      <h1>🎯 ${L('Balikan ang mga mali', 'Go over your mistakes')}</h1>
      <p class="muted" style="margin-top:0">${L('Ang pinakamabilis na paraan para tumaas ang score: sagutan ulit ang mga namali mo, at mag-practice sa pinakamahinang topic.', 'The fastest way to raise your score: answer your mistakes again, and practice your weakest topics.')}</p>
      <div class="card">
        <div class="row between"><h2 style="margin:0">${L('Mga mali mo', 'Your mistakes')}</h2><span class="pill ${r.mistakes_count ? 'bad' : 'ok'}">${r.mistakes_count} ${L('tanong', 'questions')}</span></div>
        ${free ? `<p class="muted small" style="margin:6px 0 0">${L('Sa libreng plan: mula sa practice lang. Kasama sa <a href="#/premium">Premium</a> ang mga mali sa mock exam.', 'Free plan: from practice only. Mistakes in mock exams are included with <a href="#/premium">Premium</a>.')}</p>` : ''}
        ${r.mistakes_count ? `
        ${subs.length > 1 ? `<label>${L('Subject', 'Subject')}</label><div class="seg" id="rvSub"><button type="button" data-s="" class="active">${L('Lahat', 'All')} (${r.mistakes_count})</button>${subs.map(([k, n]) => `<button type="button" data-s="${k}">${esc(subjName(k))} (${n})</button>`).join('')}</div>` : ''}
        <label>${L('Ilang tanong?', 'How many questions?')}</label>
        <div class="seg" id="rvCnt">${[10, 20, 50].map((n) => `<button type="button" data-n="${n}" ${n > max ? 'disabled' : ''}>${n > max ? '🔒 ' : ''}${n}</button>`).join('')}</div>
        <button class="btn block" id="rvGo" style="margin-top:14px">↻ ${L('Sagutan ulit ang mga mali', 'Answer my mistakes again')}</button>
        <p class="muted small" style="margin:8px 0 0">${L('Practice ito: makikita agad kung tama na, kasama ang paliwanag. Kapag tama na, mawawala na ito sa listahan.', 'This is practice: you see right away if you got it, with the explanation. Once right, it leaves the list.')}</p>`
        : `<p class="muted" style="margin:8px 0 0">${L('Wala kang mali na kailangang balikan. 🎉 Mag-practice o mag-mock exam para may makita rito.', 'No mistakes to go over. 🎉 Practice or take a mock exam to see some here.')}</p>`}
      </div>
      <h2>${L('Mahihinang topic (pinakamahina muna)', 'Weak topics (weakest first)')}</h2>
      ${r.topics.length ? `<div class="list" id="rvTopics">${r.topics.map((t, i) => `<div class="list-item${i >= 10 ? ' more-topic' : ''}"${i >= 10 ? ' hidden' : ''}>
        <div class="grow"><div class="row between small" style="flex-wrap:nowrap"><b class="ellipsis">${i + 1}. ${esc(t.topic || '—')}</b><b>${t.pct}%</b></div>
          <div class="muted small ellipsis">${esc(subjName(t.subject))} · ${t.correct}/${t.total} ${L('tama', 'right')}</div>
          <div class="bar ${t.pct >= 80 ? 'ok' : t.pct < 60 ? 'bad' : ''}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${t.pct}" aria-label="${esc(t.topic)}"><i style="width:${t.pct}%"></i></div></div>
        <button class="btn small secondary" data-t="${i}" aria-label="${L('Mag-practice', 'Practice')}: ${esc(t.topic)}">${L('Practice', 'Practice')}</button></div>`).join('')}
        ${r.topics.length > 10 ? `<button type="button" class="btn ghost" id="rvMore">${L(`Ipakita lahat (${r.topics.length})`, `Show all (${r.topics.length})`)}</button>` : ''}
        ${r.locked_topics ? `<a class="list-item locked-row" href="#/premium"><span class="grow">🔒 ${L(`May ${r.locked_topics} pang topic. Makikita ang lahat sa Premium →`, `${r.locked_topics} more topic(s). See them all with Premium →`)}</span></a>` : ''}</div>`
        : `<div class="card empty">${L('Lalabas dito ang mga topic kapag may 3 o higit pang tanong ka na sa isang topic.', 'Topics show here once you have 3 or more questions in a topic.')}</div>`}`);
    const paint = () => {
      $$('#rvSub [data-s]').forEach((b) => b.classList.toggle('active', b.dataset.s === st.subject));
      $$('#rvCnt [data-n]').forEach((b) => b.classList.toggle('active', +b.dataset.n === st.count));
    };
    $$('#rvSub [data-s]').forEach((b) => (b.onclick = () => { st.subject = b.dataset.s; paint(); }));
    $$('#rvCnt [data-n]').forEach((b) => (b.onclick = () => { if (!b.disabled) { st.count = +b.dataset.n; paint(); } }));
    paint();
    if ($('#rvMore')) $('#rvMore').onclick = (e) => { $$('.more-topic').forEach((x) => (x.hidden = false)); e.target.remove(); };
    if ($('#rvGo')) $('#rvGo').onclick = (e) => { e.target.disabled = true; startExam('practice', { review: 'mistakes', subject: st.subject || undefined, count: st.count, level: lv }).finally(() => (e.target.disabled = false)); };
    $$('[data-t]').forEach((b) => (b.onclick = () => { const t = r.topics[+b.dataset.t]; startExam('practice', { review: 'topic', subject: t.subject, topic: t.topic, count: free ? Math.min(20, max) : 20, level: t.subject === 'clerical' ? 'subpro' : lv }); }));
  }

  /* ---------------- practice setup ---------------- */
  function viewPractice() {
    // Free plan: the default number of questions is never one the plan does not allow.
    const st = { subject: 'verbal', count: isFree() ? Math.max(5, Math.min(20, Number(S.config.free.practice_items) || 20)) : 20, minutes: 0, level: myLevel() };
    const subs = S.meta.subjects;
    shell('practice', `
      <div class="row between" style="flex-wrap:nowrap"><h1>${L('Practice kada subject', 'Practice by subject')}</h1>${showLevel() ? `<span id="pLvl">${levelChip(st.level, 'big')}</span>` : ''}</div>
      <p class="muted" style="margin-top:0">${L('Makikita agad kung tama o mali ang sagot mo, kasama ang paliwanag.', 'You see right away if your answer is right or wrong, with an explanation.')}</p>
      ${isFree() ? `<a class="notice" href="#/premium" style="display:block;margin-bottom:12px">${L(`🆓 Libreng plan: <b>${Math.max(0, S.config.free.practice_daily - (S.practiceToday || 0))} sa ${S.config.free.practice_daily}</b> practice na lang ang natitira ngayong araw, hanggang ${S.config.free.practice_items} tanong bawat isa. Walang limit sa Premium →`,
        `🆓 Free plan: <b>${Math.max(0, S.config.free.practice_daily - (S.practiceToday || 0))} of ${S.config.free.practice_daily}</b> practice left today, up to ${S.config.free.practice_items} questions each. No limit with Premium →`)}</a>` : ''}
      <div class="card">
        ${showLevel() ? `<h3>Level</h3><div class="seg lvl-seg" id="plv" style="margin-bottom:14px">${Object.entries(LEVELS).map(([k, [c, n]]) => `<button type="button" class="lvl-opt ${k}" data-pl="${k}"><b>${c}</b> <span class="small">${n}</span></button>`).join('')}</div>` : ''}
        ${fold('practice-1', `<h3>${L('1. Pumili ng subject', '1. Choose a subject')}</h3><span class="pill" id="subPick"></span>`, `<div class="subject-grid" id="subs">${Object.entries(subs).map(([k, v]) => `<button class="subject-btn" data-s="${k}"><b>${esc(v.name)}</b><span>${esc(subjDesc(k))}</span></button>`).join('')}</div>`, { card: false })}
        <h3 style="margin-top:18px">${L('2. Ilang tanong?', '2. How many questions?')}</h3>
        <div class="seg" id="cnt">${[10, 20, 30, 50].map((n) => `<button data-n="${n}" ${isFree() && n > S.config.free.practice_items ? 'disabled title="Premium"' : ''}>${isFree() && n > S.config.free.practice_items ? '🔒 ' : ''}${n}</button>`).join('')}</div>
        <h3 style="margin-top:18px">${L('3. May timer?', '3. Timer?')}</h3>
        <div class="seg" id="tm">${[[0, L('Wala', 'None')], [10, '10 min'], [20, '20 min'], [30, '30 min']].map(([n, l]) => `<button data-m="${n}">${l}</button>`).join('')}</div>
        <button class="btn block" id="go" style="margin-top:20px">${L('Simulan ang practice', 'Start practice')}</button>
      </div>`);
    const paint = () => {
      $$('#subs [data-s]').forEach((b) => b.classList.toggle('active', b.dataset.s === st.subject));
      $('#subPick').textContent = subs[st.subject] ? subs[st.subject].name : '';
      $$('#cnt [data-n]').forEach((b) => b.classList.toggle('active', +b.dataset.n === st.count));
      $$('#tm [data-m]').forEach((b) => b.classList.toggle('active', +b.dataset.m === st.minutes));
      // Clerical Ability is in the Subprofessional exam only.
      const lv = st.subject === 'clerical' ? 'subpro' : st.level;
      $$('#plv [data-pl]').forEach((b) => b.classList.toggle('active', b.dataset.pl === lv));
      if ($('#pLvl')) $('#pLvl').innerHTML = levelChip(lv, 'big');
    };
    $$('#plv [data-pl]').forEach((b) => (b.onclick = () => { st.level = b.dataset.pl; setLevel(st.level); if (st.level === 'pro' && st.subject === 'clerical') st.subject = 'verbal'; paint(); }));
    $$('#subs [data-s]').forEach((b) => (b.onclick = () => { st.subject = b.dataset.s; paint(); }));
    $$('#cnt [data-n]').forEach((b) => (b.onclick = () => { if (!b.disabled) { st.count = +b.dataset.n; paint(); } }));
    $$('#tm [data-m]').forEach((b) => (b.onclick = () => { st.minutes = +b.dataset.m; paint(); }));
    $('#go').onclick = (e) => { e.target.disabled = true; startExam('practice', { ...st, level: st.subject === 'clerical' ? 'subpro' : showLevel() ? st.level : 'pro' }).finally(() => (e.target.disabled = false)); };
    paint();
  }

  /* ---------------- exam ---------------- */
  async function viewExam(id) {
    let a;
    if (isLocal(id)) {
      const la = local.get(id);
      if (!la) { const sid = store.get(uk('cse-map'), {})[id]; return go(sid ? '#/result/' + sid : '#/'); }
      a = { ...la, now: Date.now() };
    } else {
      a = await cachedGet('/api/attempts/' + id);
      if (!a.finished_at && store.get(uk('cse-psub'), []).some((x) => String(x.id) === String(id))) {
        toast(L('Naisumite mo na ito. Lalabas ang resulta kapag may internet na.', 'You already submitted this. The result will show when the internet is back.')); return go('#/');
      }
      if (S.offline) a = { ...a, now: Date.now() }; // saved copy: use the device clock for the timer
    }
    if (a.finished_at) return go('#/result/' + id);
    const practice = a.mode === 'practice';
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('cse-ans-' + id) || '{}'); } catch { /* ignore */ }
    const ex = {
      a, practice, idx: 0, answers: { ...a.answers, ...saved }, flags: new Set(), dirty: false,
      deadline: a.time_limit_sec ? Date.now() + (a.started_at + a.time_limit_sec * 1000 - a.now) : 0,
    };
    try { ex.flags = new Set(JSON.parse(localStorage.getItem('cse-flag-' + id) || '[]')); } catch { /* ignore */ }
    try { ex.spent = JSON.parse(localStorage.getItem('cse-time-' + id) || '{}') || {}; } catch { ex.spent = {}; }
    const firstEmpty = a.items.findIndex((_, i) => ex.answers[i] === undefined);
    ex.idx = firstEmpty >= 0 ? firstEmpty : 0;
    S.exam = ex;

    $app.innerHTML = `
      <div class="exam-top"><div class="inner">
        <button class="btn ghost small" id="quit" aria-label="${L('Lumabas', 'Exit')}">✕</button>
        <div class="grow" style="flex:1;min-width:0">
          <div class="exam-title">${showLevel() ? levelChip(levelOf(a)) : ''}${setChip(a)}<b class="ellipsis small">${esc(a.title.replace(/ Mock Exam/, '').replace(/ · Set \d+$/, ''))}</b></div>
          <div class="muted small" id="answered"></div></div>
        ${ex.deadline ? `<div class="timer" id="timer" role="timer" aria-label="${L('Natitirang oras', 'Time left')}">--:--</div>` : ''}
        <button class="btn secondary small" id="navBtn" aria-label="${L('Lahat ng tanong', 'All questions')}">☰ ${L('Lahat', 'All')}</button>
      </div></div>
      <div class="progress"><i id="prog"></i></div>
      ${ex.deadline && !practice ? '<div class="pace-bar small"><span id="pace" class="pace"></span></div>' : ''}
      ${S.config.privacy_strip === false ? '' : `<div class="privacy-strip">🔒 ${esc(PRIVACY_LINE())}</div>`}
      <main class="paper-desk" id="desk"><div class="paper-stack"><article class="paper" id="qwrap" aria-live="polite"></article></div></main>
      <div class="paper-foot"><div class="inner">
        <button class="btn ghost flag-btn" id="flag" title="${L('Markahan para balikan', 'Mark to come back to')}" aria-label="${L('Markahan para balikan', 'Mark to come back to')}">⚑</button>
        <button class="page-ind" id="pageInd" type="button" title="${L('Lahat ng tanong', 'All questions')}" aria-label="${L('Lahat ng tanong', 'All questions')}"><b id="pageNo"></b><small>${matchMedia('(hover: hover) and (pointer: fine)').matches ? L('← → o pindutin ang kanto', '← → or click the corner') : `‹ ${L('i-swipe para mag-flip', 'swipe to turn')} ›`}</small></button>
        <button class="btn" id="submitBtn">${L('Isumite', 'Submit')} ✓</button>
      </div></div>`;

    $('#quit').onclick = async () => {
      await saveAnswers(true);
      if (await confirmBox(L('Lumabas muna?', 'Leave for now?'), L('Naka-save ang mga sagot mo. Maaari mo itong ituloy mamaya mula sa Home.', 'Your answers are saved. You can continue later from Home.') + (ex.deadline ? L(' <b>Tuloy pa rin ang takbo ng oras.</b>', ' <b>The timer keeps running.</b>') : ''), L('Lumabas', 'Leave'))) { stopTimer(); go('#/'); }
    };
    $('#submitBtn').onclick = submitFlow;
    $('#pageInd').onclick = openNav;
    paperSwipe($('#desk'));
    $('#flag').onclick = () => {
      ex.flags.has(ex.idx) ? ex.flags.delete(ex.idx) : ex.flags.add(ex.idx);
      try { localStorage.setItem('cse-flag-' + id, JSON.stringify([...ex.flags])); } catch { /* ignore */ }
      paintQ();
    };
    $('#navBtn').onclick = openNav;
    guardOn();
    document.onkeydown = (e) => {
      if (!S.exam || document.querySelector('.modal-bg')) return;
      const k = e.key.toUpperCase();
      if (LETTERS.includes(k)) choose(LETTERS.indexOf(k));
      else if (e.key === 'ArrowRight' || e.key === 'PageDown') turn(1);
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') turn(-1);
    };

    if (ex.deadline) {
      /* Like the real CSE: one timer for the whole exam that keeps running, warnings at 30, 10, 5 and 1 minute
         left, and a pace check (mock exam): are you answering fast enough to finish on time? */
      const total = a.items.length, limit = a.time_limit_sec;
      ex.warned = new Set();
      const WARN = [30, 10, 5, 1];
      const tick = () => {
        const left = (ex.deadline - Date.now()) / 1000;
        const t = $('#timer');
        if (!t) return stopTimer();
        t.textContent = fmtTime(left);
        t.classList.toggle('low', left < 300);
        for (const m of WARN) {
          if (left <= m * 60 && left > m * 60 - 90 && !ex.warned.has(m) && left > 1) {
            ex.warned.add(m); Sound.play('warn');
            toast(L(`⏰ ${m} minuto na lang ang natitira.`, `⏰ Only ${m} minute${m > 1 ? 's' : ''} left.`));
          } else if (left <= m * 60 - 90) ex.warned.add(m); // opened late: no old warnings
        }
        const pace = $('#pace');
        if (pace) {
          const n = Object.keys(ex.answers).length, used = Math.max(0, limit - left), behind = Math.round((used / limit) * total - n);
          const per = total - n > 0 ? Math.floor(left / (total - n)) : 0;
          pace.className = 'pace ' + (behind > 5 ? 'slow' : 'ok');
          pace.textContent = n >= total ? L('✓ Nasagutan lahat', '✓ All answered')
            : behind > 5 ? L(`⚠ Bilisan: ~${behind} tanong ang huli · ${per}s/tanong`, `⚠ Speed up: ~${behind} behind · ${per}s/question`)
              : L(`✓ Nasa oras · ${per}s/tanong`, `✓ On pace · ${per}s/question`);
        }
        if (left <= 0) { stopTimer(); toast(L('Ubos na ang oras! Isusumite na ang exam.', 'Time is up! The exam will be submitted.')); submit(); }
      };
      tick(); S.timer = setInterval(tick, 1000);
    }
    paintQ();
  }

  function sectionStart(items, i) {
    return i === 0 || items[i - 1].subject !== items[i].subject;
  }
  /* ---------------- the exam is a test paper ----------------
     One question per page. No Next/Back buttons: turn the page by swiping left or right, by tapping
     the folded corner at the bottom of the page, or with the arrow keys. Each turn is a page-flip
     animation with a paper sound (Account → Sounds). ☰ Lahat / the page number opens every question.
     Answers are saved on every tap, as before. Premium turns pages a little faster. */
  const reduceMotion = () => a11y().motion || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const flipMs = () => (S.premium ? 300 : 420);
  function turn(d, to) {
    const ex = S.exam; if (!ex || document.querySelector('.modal-bg')) return;
    const n = ex.a.items.length, next = to ?? ex.idx + d;
    if (next >= n) { bump(1); return submitFlow(); } // past the last page: hand in the paper
    if (next < 0) return bump(-1);
    if (next === ex.idx) return;
    const dir = next > ex.idx ? 1 : -1;
    ex.idx = next; paintQ(dir);
  }
  // At the first page, a swipe back just nudges the paper.
  function bump(d) {
    const p = $('#qwrap'); if (!p || reduceMotion()) return;
    p.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${d * -10}px)` }, { transform: 'translateX(0)' }], { duration: 220, easing: 'ease-out' });
  }
  function paperSwipe(desk) {
    let x0 = 0, y0 = 0, t0 = 0, id = null, drag = false;
    const page = () => $('#qwrap');
    desk.addEventListener('pointerdown', (e) => {
      if (e.button > 0 || id !== null || e.target.closest('.passage')) return;
      id = e.pointerId; x0 = e.clientX; y0 = e.clientY; t0 = Date.now(); drag = false;
    });
    desk.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      if (!drag && Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.4) drag = true;
      if (drag && page() && !reduceMotion()) {
        // The page follows the finger a little, like lifting a sheet.
        const w = desk.clientWidth || 360, k = Math.max(-1, Math.min(1, dx / w));
        page().style.transform = k < 0 ? `perspective(1600px) rotateY(${k * 28}deg)` : `translateX(${k * 36}px)`;
      }
    });
    const end = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      const dx = e.clientX - x0, fast = Math.abs(dx) / Math.max(1, Date.now() - t0) > 0.45;
      const p = page(); if (p) p.style.transform = '';
      if (!drag) return;
      drag = false;
      // Don't count the swipe as a tap on a choice.
      const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => removeEventListener('click', stop, true), 50);
      if (e.type === 'pointerup' && (Math.abs(dx) > 60 || (fast && Math.abs(dx) > 25))) turn(dx < 0 ? 1 : -1);
    };
    desk.addEventListener('pointerup', end);
    desk.addEventListener('pointercancel', end);
  }
  function flip(page, ghost, dir) {
    const stack = page.parentNode, dur = flipMs();
    if (S.flipAnim) S.flipAnim.finish();
    ghost.removeAttribute('id'); ghost.classList.add('paper-ghost'); ghost.setAttribute('aria-hidden', 'true'); ghost.inert = true;
    Sound.flip();
    if (reduceMotion()) { page.animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: 120 }); return; }
    const shade = document.createElement('div'); shade.className = 'flip-shade';
    let anim;
    if (dir > 0) {
      // Forward: the old page lifts from the right edge and turns over to the left.
      ghost.classList.add('top'); ghost.appendChild(shade); stack.appendChild(ghost);
      anim = ghost.animate([{ transform: 'perspective(1800px) rotateY(0deg)' }, { transform: 'perspective(1800px) rotateY(-96deg)' }], { duration: dur, easing: 'cubic-bezier(.35,.05,.3,1)' });
      shade.animate([{ opacity: 0 }, { opacity: 0.55 }], { duration: dur, easing: 'ease-in' });
    } else {
      // Back: the previous page turns back over the current one.
      ghost.classList.add('under'); stack.insertBefore(ghost, page); page.appendChild(shade);
      anim = page.animate([{ transform: 'perspective(1800px) rotateY(-96deg)' }, { transform: 'perspective(1800px) rotateY(0deg)' }], { duration: dur, easing: 'cubic-bezier(.35,.05,.3,1)' });
      shade.animate([{ opacity: 0.55 }, { opacity: 0 }], { duration: dur, easing: 'ease-out' });
    }
    S.flipAnim = anim;
    const done = () => { ghost.remove(); shade.remove(); if (S.flipAnim === anim) S.flipAnim = null; };
    anim.onfinish = done; anim.oncancel = done;
  }
  /* Time on each question (seconds), saved on the device with the answers. Only while the app is in front.
     On the result: time per part (subject) next to the pace of the real CSE. */
  function clockQ(ex, next) {
    const now = Date.now();
    if (ex.cur && !document.hidden) {
      const sec = Math.min(900, (now - ex.cur.t) / 1000);
      ex.spent[ex.cur.i] = Math.round(((ex.spent[ex.cur.i] || 0) + sec) * 10) / 10;
      try { localStorage.setItem('cse-time-' + ex.a.id, JSON.stringify(ex.spent)); } catch { /* ignore */ }
    }
    ex.cur = next == null ? null : { i: next, t: now };
  }
  document.addEventListener('visibilitychange', () => { const ex = S.exam; if (!ex) return; if (document.hidden) clockQ(ex, ex.idx); else if (ex.cur) ex.cur.t = Date.now(); });
  const timesOf = (ex) => {
    clockQ(ex, ex.idx);
    const out = {};
    ex.a.items.forEach((it, i) => { if (ex.spent[i]) out[it.subject] = Math.round((out[it.subject] || 0) + ex.spent[i]); });
    return out;
  };
  function paintQ(dir = 0) {
    const ex = S.exam; const { a, idx } = ex; const it = a.items[idx];
    clockQ(ex, idx);
    const page = $('#qwrap'); if (!page) return;
    const ghost = dir && page.firstElementChild ? page.cloneNode(true) : null;
    const chosen = ex.answers[idx];
    const reveal = ex.practice && chosen !== undefined;
    const parts = [...new Set(a.items.map((x) => x.subject))];
    const partNo = parts.indexOf(it.subject) + 1;
    const roman = ['I', 'II', 'III', 'IV', 'V'][partNo - 1] || partNo;
    const last = idx === a.items.length - 1;
    page.innerHTML = `
      <div class="q-section">${a.mode === 'practice' ? esc(subjName(it.subject)) : `Part ${roman}: ${esc(subjName(it.subject))}`}${sectionStart(a.items, idx) && a.mode !== 'practice' ? ` <span class="pill">${L('Bagong bahagi', 'New part')}</span>` : ''}</div>
      <div class="row between"><div class="q-num">${L(`Tanong ${idx + 1} sa ${a.items.length}`, `Question ${idx + 1} of ${a.items.length}`)} · ${esc(it.topic)}</div>${ex.flags.has(idx) ? `<span class="pill warn">⚑ ${L('Minarkahan', 'Marked')}</span>` : ''}</div>
      ${it.passage ? `<div class="passage">${esc(it.passage)}</div>` : ''}
      <div class="q-text"><span class="q-no">${idx + 1}.</span> ${esc(it.question)}</div>
      <div class="choices">${it.choices.map((c, i) => {
        let cls = '';
        if (reveal) { if (i === it.answer) cls = 'correct'; else if (i === chosen) cls = 'wrong'; } else if (i === chosen) cls = 'selected';
        return `<button class="choice ${cls}" data-c="${i}" ${reveal ? 'disabled' : ''} aria-pressed="${i === chosen}"><span class="letter">${LETTERS[i]}</span><span>${esc(c)}</span></button>`;
      }).join('')}</div>
      ${reveal ? `<div class="explain"><b>${chosen === it.answer ? L('✅ Tama!', '✅ Correct!') : L(`❌ Mali. Ang tamang sagot ay ${LETTERS[it.answer]}.`, `❌ Wrong. The correct answer is ${LETTERS[it.answer]}.`)}</b><br>${esc(it.explanation || '')}</div>` : ''}
      ${last ? `<div class="paper-end"><p>${L('— Katapusan ng exam —', '— End of the exam —')}</p><button class="btn" type="button" data-end>${L('Isumite ang exam', 'Submit the exam')} ✓</button></div>` : ''}
      <div class="page-no">— ${idx + 1} —</div>
      ${idx > 0 ? `<button class="corner prev" type="button" data-turn="-1" aria-label="${L('Nakaraang pahina', 'Previous page')}"></button>` : ''}
      ${last ? '' : `<button class="corner next" type="button" data-turn="1" aria-label="${L('Susunod na pahina', 'Next page')}"></button>`}
    `;
    $$('[data-c]', page).forEach((b) => (b.onclick = () => choose(+b.dataset.c)));
    $$('[data-turn]', page).forEach((b) => (b.onclick = () => turn(+b.dataset.turn)));
    if ($('[data-end]', page)) $('[data-end]', page).onclick = submitFlow;
    const n = Object.keys(ex.answers).length;
    $('#answered').textContent = L(`${n}/${a.items.length} nasagutan`, `${n}/${a.items.length} answered`);
    $('#prog').style.width = pct(n, a.items.length) + '%';
    $('#pageNo').textContent = `${idx + 1} / ${a.items.length}`;
    $('#flag').classList.toggle('on', ex.flags.has(idx));
    if (dir) window.scrollTo(0, 0);
    if (ghost) flip(page, ghost, dir);
    // First exam on this device: show once how to turn the page.
    if (!store.get('cse-flip-hint') && !document.querySelector('.modal-bg')) {
      store.set('cse-flip-hint', 1);
      const h = document.createElement('div'); h.className = 'flip-hint'; h.setAttribute('aria-hidden', 'true');
      h.innerHTML = `<span>👆</span>${L('I-swipe pakaliwa o pindutin ang kanto para mag-flip ng pahina', 'Swipe left or tap the corner to turn the page')}`;
      $('#desk').appendChild(h); setTimeout(() => h.remove(), 3200);
    }
  }
  function choose(i) {
    const ex = S.exam; if (!ex) return;
    if (ex.practice && ex.answers[ex.idx] !== undefined) return;
    ex.answers[ex.idx] = i;
    Sound.play(ex.practice ? (i === ex.a.items[ex.idx].answer ? 'correct' : 'wrong') : 'tap');
    try { localStorage.setItem('cse-ans-' + ex.a.id, JSON.stringify(ex.answers)); } catch { /* ignore */ }
    ex.dirty = true;
    clearTimeout(S.saveT); S.saveT = setTimeout(() => saveAnswers(), 1500);
    // Only the choices change (no redraw), so the tap shows right away.
    $$('#qwrap [data-c]').forEach((b) => {
      const c = +b.dataset.c, it = ex.a.items[ex.idx];
      b.classList.toggle('selected', !ex.practice && c === i);
      b.setAttribute('aria-pressed', String(c === i));
      if (ex.practice) { b.disabled = true; b.classList.toggle('correct', c === it.answer); b.classList.toggle('wrong', c === i && i !== it.answer); }
    });
    if (ex.practice) paintQ(); // shows the explanation
    else { const n = Object.keys(ex.answers).length; $('#answered').textContent = L(`${n}/${ex.a.items.length} nasagutan`, `${n}/${ex.a.items.length} answered`); $('#prog').style.width = pct(n, ex.a.items.length) + '%'; }
    // Mock exam: the page turns by itself after an answer, for faster answering.
    if (!ex.practice && ex.idx < ex.a.items.length - 1) { const at = ex.idx; clearTimeout(ex.autoT); ex.autoT = setTimeout(() => { if (S.exam === ex && ex.idx === at && ex.answers[at] === i && !document.querySelector('.modal-bg')) turn(1); }, S.premium ? 320 : 420); }
  }
  async function saveAnswers(force) {
    const ex = S.exam; if (!ex || (!ex.dirty && !force)) return;
    ex.dirty = false;
    if (isLocal(ex.a.id)) { const la = local.get(ex.a.id); if (la) local.save({ ...la, answers: ex.answers }); return; }
    try { await api('PUT', `/api/attempts/${ex.a.id}/answers`, { answers: ex.answers }); } catch { ex.dirty = true; }
  }
  function openNav() {
    const ex = S.exam; const { a } = ex;
    const parts = [...new Set(a.items.map((x) => x.subject))];
    const close = modal(`
      <div class="row between"><h2 style="margin:0">${L('Lahat ng tanong', 'All questions')}</h2><button class="btn ghost small" data-x>${L('Isara', 'Close')}</button></div>
      <div class="legend"><span>🟦 ${L('Nasagutan', 'Answered')}</span><span>⬜ ${L('Wala pang sagot', 'Not answered')}</span><span>🟨 ${L('Minarkahan', 'Marked')}</span></div>
      ${parts.map((p) => `<h3 style="margin-top:14px">${esc(subjName(p))}</h3><div class="navgrid">${a.items.map((it, i) => it.subject !== p ? '' :
        `<button data-i="${i}" class="${ex.answers[i] !== undefined ? 'ans' : ''} ${ex.flags.has(i) ? 'flag' : ''} ${i === ex.idx ? 'cur' : ''}">${i + 1}</button>`).join('')}</div>`).join('')}
      <button class="btn block" data-submit style="margin-top:18px">${L('Isumite ang exam', 'Submit exam')}</button>`, (bg, cl) => {
      $('[data-x]', bg).onclick = cl;
      $$('[data-i]', bg).forEach((b) => (b.onclick = () => { cl(); turn(0, +b.dataset.i); }));
      $('[data-submit]', bg).onclick = () => { cl(); submitFlow(); };
    });
    return close;
  }
  async function submitFlow() {
    const ex = S.exam; if (!ex || ex.submitting) return;
    const total = ex.a.items.length;
    const blank = total - Object.keys(ex.answers).length;
    const ok = await confirmBox(L('Isumite na ang exam?', 'Submit the exam?'), blank
      ? L(`May <b>${blank}</b> tanong ka pang walang sagot. Sa totoong CSE, walang bawas ang maling sagot kaya mas mabuting sagutan lahat.`, `You still have <b>${blank}</b> unanswered question(s). In the real CSE, wrong answers have no penalty, so it is better to answer all.`)
      : L('Nasagutan mo na lahat ng tanong. Hindi mo na ito mababago pagkatapos isumite.', 'You answered all questions. You cannot change them after submitting.'), L('Isumite', 'Submit'));
    if (ok && S.exam === ex) submit();
  }
  async function submit() {
    const ex = S.exam; if (!ex || ex.submitting) return;
    ex.submitting = true;
    stopTimer(); clearTimeout(S.saveT);
    const times = timesOf(ex);
    const finish = () => { try { ['cse-ans-', 'cse-flag-', 'cse-time-'].forEach((k) => localStorage.removeItem(k + ex.a.id)); } catch { /* ignore */ } S.exam = null; document.onkeydown = null; markStudied(); };
    if (isLocal(ex.a.id)) {
      const la = local.get(ex.a.id) || { ...ex.a }; // its saved copy went missing: grade the copy on screen
      delete la.now;
      const { score, breakdown } = gradeLocal(la.items, ex.answers);
      let end = Date.now();
      if (la.time_limit_sec) end = Math.min(end, la.started_at + la.time_limit_sec * 1000 + 60000);
      local.save({ ...la, answers: ex.answers, score, breakdown, finished_at: end, times });
      finish(); syncSoon();
      S.justDone = String(la.id);
      return go('#/result/' + la.id);
    }
    try {
      const r = await api('POST', `/api/attempts/${ex.a.id}/submit`, { answers: ex.answers, times });
      finish();
      S.justDone = String(r.id);
      go('#/result/' + r.id);
    } catch (e) {
      if (e.offline) {
        // Save it on the device and submit it when the internet is back.
        const list = store.get(uk('cse-psub'), []).filter((x) => x.id !== ex.a.id);
        list.push({ id: ex.a.id, answers: ex.answers, times, at: Date.now() });
        store.set(uk('cse-psub'), list);
        finish();
        await confirmBox(L('Naisumite offline', 'Submitted offline'), L('Walang internet, kaya naka-save muna sa device ang mga sagot mo. Awtomatiko itong isusumite at lalabas ang score kapag may internet na.', 'There is no internet, so your answers are saved on the device for now. They will be submitted by themselves and the score will show when the internet is back.'), 'OK');
        return go('#/');
      }
      ex.submitting = false; toast(e.message + L(' Subukan ulit.', ' Please try again.'));
    }
  }

  /* ---------------- results ---------------- */
  async function viewResult(id) {
    let a;
    if (isLocal(id)) {
      a = local.get(id);
      if (!a) { const sid = store.get(uk('cse-map'), {})[id]; return go(sid ? '#/result/' + sid : '#/history'); }
      a = { ...a, passing: S.meta.exams[a.mode]?.passing || 80 };
    } else a = await cachedGet('/api/attempts/' + id);
    if (!a.finished_at) return go('#/exam/' + id);
    if (S.justDone === String(id)) { S.justDone = null; setTimeout(() => Sound.play('finish'), 150); }
    const p = pct(a.score, a.total);
    const pass = p >= a.passing;
    const practice = a.mode === 'practice';
    const lite = !!a.lite; // free plan: letters only
    const mins = Math.round((a.finished_at - a.started_at) / 60000);
    const color = practice ? 'var(--primary)' : pass ? 'var(--ok)' : 'var(--bad)';
    const wrongCount = a.items.filter((it, i) => a.answers[i] !== undefined && a.answers[i] !== it.answer).length;
    const blankCount = a.items.filter((_, i) => a.answers[i] === undefined).length;
    const lv = levelOf(a);
    const tools = !lite && S.premium; // Premium: PDF, email, print
    shell('history', `
      <div class="card" style="text-align:center">
        <div class="result-head">${showLevel() ? levelChip(lv, 'big') : ''}${setChip(a)}</div>
        <div class="muted small">${esc(a.title)}</div>
        <div class="score-ring" role="img" aria-label="Score ${p}% (${a.score}/${a.total})" style="background:conic-gradient(${color} ${p * 3.6}deg, var(--line) 0)"><div class="in" aria-hidden="true"><div><div class="pct">${p}%</div><div class="muted small">${a.score}/${a.total}</div></div></div></div>
        ${practice ? `<h2 style="margin:6px 0">${L('Tapos na ang practice!', 'Practice done!')}</h2>` : pass ? `<h2 style="margin:6px 0;color:var(--ok)">🎉 ${L('PASADO!', 'PASSED!')}</h2>` : `<h2 style="margin:6px 0;color:var(--bad)">${L('Hindi pa pasado', 'Not passed yet')}</h2>`}
        <p class="muted" style="margin:0">${practice ? L('Ituloy lang ang pag-practice!', 'Keep practicing!') : pass ? L(`Lampas sa ${a.passing}% na passing rate. Galing!`, `Above the ${a.passing}% passing rate. Great job!`) : L(`Kailangan ng ${a.passing}% para pumasa. Kaya mo 'yan, review pa!`, `You need ${a.passing}% to pass. You can do it, keep reviewing!`)}</p>
        ${lite ? '' : `<p class="muted small">${L(`Tagal: ${mins} minuto · ${wrongCount} mali · ${blankCount} walang sagot`, `Time: ${mins} min · ${wrongCount} wrong · ${blankCount} unanswered`)}</p>`}
        ${isLocal(id) ? `<p class="muted small">${L('⏳ Ginawa offline. Ise-save ito online kapag may internet na.', '⏳ Made offline. It will be saved online when the internet is back.')}</p>` : ''}
        <div class="row" style="justify-content:center"><a class="btn secondary" href="#/">Home</a>${lite ? `<a class="btn" href="#/premium">⭐ ${L('Buong review sa Premium', 'Full review with Premium')}</a>` : `<button class="btn" id="again">${L('Ulitin (bagong set)', 'Retake (new set)')}</button>`}</div>
        ${tools || isFree() ? `<div class="result-tools" role="group" aria-label="${L('I-save o ibahagi ang resulta', 'Save or share the result')}">
          <button class="btn secondary" id="rPdf" type="button">${tools ? '📄' : '🔒'} ${L('I-save bilang PDF', 'Save as PDF')}</button>
          <button class="btn secondary" id="rMail" type="button">${tools ? '✉️' : '🔒'} ${L('Ipadala sa email', 'Send to email')}</button>
          <button class="btn secondary" id="rPrint" type="button">${tools ? '🖨️' : '🔒'} Print</button></div>
          <p class="muted small" style="margin:6px 0 0">${!tools ? L('Para sa <a href="#/premium">Premium</a> ang PDF, email at print ng resulta na may lahat ng tanong, sagot at paliwanag.', 'Saving as PDF, email and print of the result with every question, answer and explanation are for <a href="#/premium">Premium</a>.') : L(`Kasama ang lahat ng tanong, sagot at paliwanag. Gumagana offline ang PDF at Print; ang email ay ipapadala sa ${esc(S.user.email)} (kapag offline, ipapadala ito pagbalik ng internet).`, `Includes every question, answer and explanation. PDF and Print work offline; the email goes to ${esc(S.user.email)} (when offline, it is sent once the internet is back).`)}</p>` : ''}
      </div>
      <div class="card" style="margin-top:12px"><h3>${lite ? L('Kabuuang score kada subject', 'Total score by subject') : L('Score kada subject', 'Score by subject')}</h3>${subjectBars(a.breakdown || {})}</div>
      ${timeCard(a)}
      ${!lite && wrongCount + (practice ? 0 : blankCount) > 0 ? `<a class="card review-link" href="#/review" style="margin-top:12px"><span class="ic" aria-hidden="true">🎯</span><span class="grow"><b>${L('Sagutan ulit ang mga mali', 'Answer your mistakes again')}</b><span class="muted small">${L('Nasa Balikan ang mali ang mga namali mo rito, kasama ang pinakamahinang topic mo.', 'Your mistakes here are in Go over your mistakes, with your weakest topics.')}</span></span><span aria-hidden="true">›</span></a>` : ''}
      ${lite ? answerKey(a) : `
      ${tools ? topicTable(a) : ''}
      <h2>${L('Review ng mga sagot', 'Review answers')}</h2>
      <div class="tabs" id="rf"><button data-f="wrong" class="active">${L('Mali at walang sagot', 'Wrong and unanswered')}</button><button data-f="all">${L('Lahat', 'All')}</button></div>
      <div class="list" id="rlist"></div>`}`);
    if (!tools && $('#rPdf')) ['#rPdf', '#rMail', '#rPrint'].forEach((k) => ($(k).onclick = () => go('#/premium')));
    if (lite) return;
    const paint = (f) => {
      $$('#rf button').forEach((b) => b.classList.toggle('active', b.dataset.f === f));
      const rows = a.items.map((it, i) => ({ it, i, ch: a.answers[i] })).filter((x) => f === 'all' || x.ch !== x.it.answer);
      $('#rlist').innerHTML = rows.length ? rows.slice(0, 200).map(({ it, i, ch }) => `
        <div class="review-item">
          <div class="row between"><span class="q-num">#${i + 1} · ${esc(subjName(it.subject))} · ${esc(it.topic)}</span>
          <span class="pill ${ch === it.answer ? 'ok' : 'bad'}">${ch === it.answer ? L('Tama', 'Correct') : ch === undefined ? L('Walang sagot', 'No answer') : L('Mali', 'Wrong')}</span></div>
          ${it.passage ? `<details><summary class="small muted">${L('Basahin ang talata', 'Read the passage')}</summary><div class="passage">${esc(it.passage)}</div></details>` : ''}
          <div style="font-weight:600;margin:6px 0;white-space:pre-wrap">${esc(it.question)}</div>
          ${ch !== undefined && ch !== it.answer ? `<div class="ans-line" style="color:var(--bad)">${L('Sagot mo', 'Your answer')}: ${LETTERS[ch]}. ${esc(it.choices[ch])}</div>` : ''}
          <div class="ans-line" style="color:var(--ok)">${L('Tamang sagot', 'Correct answer')}: ${LETTERS[it.answer]}. ${esc(it.choices[it.answer])}</div>
          ${it.explanation ? `<div class="explain">${esc(it.explanation)}</div>` : ''}
        </div>`).join('') + (rows.length > 200 ? `<p class="muted small">${L('Ipinapakita ang unang 200.', 'Showing the first 200.')}</p>` : '') : `<div class="card empty">${L('Perpekto! Walang mali. 🎉', 'Perfect! No mistakes. 🎉')}</div>`;
    };
    $$('#rf button').forEach((b) => (b.onclick = () => paint(b.dataset.f)));
    paint('wrong');
    $('#again').onclick = () => {
      if (practice) {
        const subject = a.items[0]?.subject || 'verbal';
        startExam('practice', { subject, count: a.total, minutes: Math.round(a.time_limit_sec / 60), level: subject === 'clerical' ? 'subpro' : lv || 'pro' });
      } else startExam(a.mode);
    };
    if (!tools) return;
    $('#rPdf').onclick = async (e) => {
      e.target.disabled = true;
      try {
        const how = await saveFile(pdfName(a), reportPdf(a), 'application/pdf');
        toast(how === 'shared' ? L('Pumili kung saan ise-save ang PDF.', 'Choose where to save the PDF.') : L('Na-save ang PDF (tingnan ang Downloads).', 'PDF saved (see Downloads).'));
      } catch (err) { toast(err.message || L('Hindi na-save ang PDF.', 'The PDF was not saved.')); }
      e.target.disabled = false;
    };
    $('#rMail').onclick = (e) => emailResult(a, e.target);
    $('#rPrint').onclick = () => printResult(a);
  }

  /* Time per part (subject): how long each part took, the time per question, and the pace of the real CSE
     (the exam's time divided by its number of questions). Parts that took longer than that pace are marked. */
  function timeCard(a) {
    const t = a.times;
    if (!t || !Object.keys(t).length) return '';
    const count = {}; a.items.forEach((it) => (count[it.subject] = (count[it.subject] || 0) + 1));
    const ideal = a.time_limit_sec && a.mode !== 'practice' ? a.time_limit_sec / a.total : 0;
    const used = Object.values(t).reduce((x, y) => x + y, 0);
    const rows = Object.keys(count).map((k) => {
      const sec = t[k] || 0, per = count[k] ? sec / count[k] : 0, slow = ideal && per > ideal * 1.15;
      return `<tr><td>${esc(subjName(k))}</td><td style="text-align:right;white-space:nowrap">${fmtTime(sec)}</td><td style="text-align:right;white-space:nowrap" class="${slow ? 'slow-txt' : ''}">${Math.round(per)}s${slow ? ' ⚠' : ''}</td></tr>`;
    }).join('');
    return `<div class="card" style="margin-top:12px"><h3>⏱️ ${L('Oras kada bahagi', 'Time per part')}</h3>
      <table class="small"><thead><tr><th>${L('Bahagi', 'Part')}</th><th style="text-align:right">${L('Oras', 'Time')}</th><th style="text-align:right">${L('Kada tanong', 'Per question')}</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="muted small" style="margin:8px 0 0">${L(`Kabuuan: ${fmtTime(used)}`, `Total: ${fmtTime(used)}`)}${ideal ? L(` · Pace ng totoong CSE: ~${Math.round(ideal)}s kada tanong. Ang may ⚠ ay mas mabagal dito, kaya doon magsanay ng bilis.`, ` · Real CSE pace: ~${Math.round(ideal)}s per question. Parts with ⚠ were slower, so practice speed there.`) : ''}</p></div>`;
  }
  // Free plan review: the number of each question and the letter of the correct answer (green if you got it, red if not).
  function answerKey(a) {
    const parts = [...new Set(a.items.map((x) => x.subject))];
    return `<div class="card" style="margin-top:12px"><h3>${L('Susi sa pagwawasto', 'Answer key')}</h3>
      <p class="muted small" style="margin:0 0 8px">${L('Letra lang ng tamang sagot. Berde kung tama ka, pula kung mali o walang sagot. Sa <a href="#/premium">Premium</a>: buong tanong, sagot mo, paliwanag, at PDF/print/email.',
        'Only the letter of the correct answer. Green if you got it, red if wrong or blank. With <a href="#/premium">Premium</a>: full questions, your answers, explanations, and PDF/print/email.')}</p>
      ${parts.map((s) => `<h4 class="key-head">${esc(subjName(s))}</h4><div class="keygrid">${a.items.map((it, i) => it.subject !== s ? ''
        : `<span class="key ${a.answers[i] === it.answer ? 'ok' : 'bad'}"><i>${i + 1}</i>${LETTERS[it.answer]}</span>`).join('')}</div>`).join('')}</div>`;
  }
  // Premium: score per topic, weakest first.
  function topicTable(a) {
    const t = {};
    a.items.forEach((it, i) => { const k = subjName(it.subject) + ' · ' + (it.topic || '—'); const x = (t[k] ||= { c: 0, n: 0 }); x.n++; if (a.answers[i] === it.answer) x.c++; });
    const rows = Object.entries(t).sort((x, y) => x[1].c / x[1].n - y[1].c / y[1].n).slice(0, 12);
    return fold('res-topics', `<h3>${L('Score kada topic (pinakamahina muna)', 'Score by topic (weakest first)')}</h3>`, `<table class="small"><tbody>${rows.map(([k, x]) => `<tr><td>${esc(k)}</td><td style="text-align:right;white-space:nowrap"><b>${pct(x.c, x.n)}%</b> <span class="muted">(${x.c}/${x.n})</span></td></tr>`).join('')}</tbody></table>`);
  }
  const pdfName = (a) => `${a.title.replace(/[^\w ·-]+/g, '').replace(/[ ·]+/g, '-')}-${new Date(a.finished_at).toISOString().slice(0, 10)}.pdf`;
  const reportPdf = (a) => window.CSEPDF.report(a, { lang, subjects: S.meta.subjects, who: `${S.user.name} <${S.user.email}>` });

  // Print: a clean page with every question and answer (works offline). In the phone app, printing goes through
  // the share menu (a PDF opened in a print or PDF app), because the app itself cannot open the print window.
  async function printResult(a) {
    if (window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
      try { await saveFile(pdfName(a), reportPdf(a), 'application/pdf'); toast(L('Buksan ang PDF sa app na may Print (hal. Drive o PDF viewer).', 'Open the PDF in an app that can print (e.g. Drive or a PDF viewer).')); } catch (err) { toast(err.message); }
      return;
    }
    let el = document.getElementById('printArea');
    if (!el) { el = document.createElement('div'); el.id = 'printArea'; document.body.appendChild(el); }
    const pass = pct(a.score, a.total) >= a.passing;
    el.innerHTML = `<h1>${esc(a.title)}</h1><p>${esc(S.user.name)} &lt;${esc(S.user.email)}&gt; · ${esc(fmtDate(a.finished_at))}</p>
      <p class="p-score">Score: ${a.score}/${a.total} (${pct(a.score, a.total)}%)${a.mode === 'practice' ? '' : ` · ${pass ? L('PASADO', 'PASSED') : L('Hindi pa pasado', 'Not passed yet')}`}</p>
      <p>${Object.entries(a.breakdown || {}).map(([k, b]) => `${esc(subjName(k))}: ${b.correct}/${b.total} (${pct(b.correct, b.total)}%)`).join(' · ')}</p><hr>
      ${a.items.map((it, i) => { const ch = a.answers[i]; return `<div class="p-q">
        ${it.passage && (i === 0 || a.items[i - 1].passage !== it.passage) ? `<div class="p-passage">${esc(it.passage)}</div>` : ''}
        <b>${i + 1}. ${esc(it.question)}</b> <span class="p-topic">[${esc(subjName(it.subject))} · ${esc(it.topic)}]</span>
        <ol type="A">${it.choices.map((c, j) => `<li class="${j === it.answer ? 'p-ok' : j === ch ? 'p-bad' : ''}">${esc(c)}</li>`).join('')}</ol>
        <div class="${ch === it.answer ? 'p-ok' : 'p-bad'}">${L('Sagot mo', 'Your answer')}: ${ch === undefined ? '–' : LETTERS[ch]} · ${L('Tamang sagot', 'Correct answer')}: ${LETTERS[it.answer]}</div>
        ${it.explanation ? `<div class="p-exp">${esc(it.explanation)}</div>` : ''}</div>`; }).join('')}
      <p class="p-foot">CSE Reviewer · ${L('Para sa personal na review lamang (RA 10173)', 'For personal review only (RA 10173)')}</p>`;
    const done = () => { document.body.classList.remove('printing'); el.innerHTML = ''; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    document.body.classList.add('printing');
    setTimeout(() => { window.print(); }, 50);
  }

  // Email the full result (Premium). Without internet it waits on the device and is sent when the internet is back.
  async function emailResult(a, btn) {
    const queue = () => {
      const q = store.get(uk('cse-mailq'), []).filter((x) => String(x.id) !== String(a.id));
      q.push({ id: a.id, lang }); store.set(uk('cse-mailq'), q);
      toast(L('Walang internet. Ipapadala ang email kapag may internet na.', 'No internet. The email will be sent when the internet is back.'));
    };
    if (isLocal(a.id) || S.offline) return queue();
    if (btn) btn.disabled = true;
    try { const r = await api('POST', `/api/attempts/${a.id}/email`, { lang }); toast(L(`Naipadala sa ${r.to}. Tingnan din ang Spam.`, `Sent to ${r.to}. Also check Spam.`)); } catch (e) { if (e.offline) queue(); else toast(e.message); }
    if (btn) btn.disabled = false;
  }
  async function sendMailQueue() {
    const map = store.get(uk('cse-map'), {});
    for (const x of store.get(uk('cse-mailq'), [])) {
      const id = isLocal(x.id) ? map[x.id] : x.id;
      if (!id) continue; // still waiting to be saved online
      try {
        await api('POST', `/api/attempts/${id}/email`, { lang: x.lang });
        toast(L('Naipadala na ang email ng resulta.', 'The result email was sent.'));
      } catch (e) { if (e.offline) return; }
      store.set(uk('cse-mailq'), store.get(uk('cse-mailq'), []).filter((y) => String(y.id) !== String(x.id)));
    }
  }

  /* ---------------- history ---------------- */
  async function viewHistory() {
    await swr(['/api/attempts', '/api/stats'], ([l0, s0]) => paintHistory(l0, s0), (i) => (i ? null : []));
  }
  function paintHistory(l0, s0) {
    if (s0 && Array.isArray(s0.days)) store.set(uk('cse-days'), s0.days);
    const { list, stats } = withLocal(l0, s0);
    const trend = stats.mocks.slice(-10);
    shell('history', `
      <h1>${L('Mga resulta', 'Results')}</h1>
      ${trend.length ? `<div class="card"><h3>${L('Huling mga mock exam', 'Recent mock exams')}</h3>
        <div style="display:flex;align-items:flex-end;gap:6px;height:140px;padding-top:10px;border-bottom:1px dashed var(--line);position:relative">
          <div style="position:absolute;left:0;right:0;bottom:${80 * 1.3}px;border-top:1px dashed var(--ok)"></div>
          <span class="small" style="position:absolute;right:0;bottom:${80 * 1.3 + 2}px;color:var(--ok)">80%</span>
          ${trend.map((m) => `<div title="${m.pct}%" style="flex:1;max-width:48px;height:${m.pct * 1.3}px;background:${m.pct >= 80 ? 'var(--ok)' : 'var(--primary)'};border-radius:6px 6px 0 0"></div>`).join('')}
        </div><p class="muted small">${L('Bawat bar ay isang mock exam (luma → bago).', 'Each bar is one mock exam (old → new).')}</p></div>` : ''}
      ${Object.keys(stats.subjects).length ? `<div class="card" style="margin-top:12px"><h3>${L('Kabuuang score kada subject', 'Overall score by subject')}</h3>${subjectBars(stats.subjects)}<p class="muted small">${L('Tip: pag-aralan muna ang subject na may pinakamababang score.', 'Tip: study the subject with the lowest score first.')} <a href="#/review">${L('Tingnan ang mahihinang topic →', 'See your weak topics →')}</a></p></div>` : ''}
      ${fold('history-all', `<h2>${L('Lahat ng exam', 'All exams')}</h2>${list.length ? `<span class="pill">${list.length}</span>` : ''}`, list.length ? `<div class="list">${list.map(attemptRow).join('')}</div>` : `<div class="card empty">${L('Wala pang resulta.', 'No results yet.')}</div>`, { card: false })}`);
    $$('.list-item').forEach((el) => {
      const id = el.getAttribute('href').split('/').pop();
      const a = list.find((x) => String(x.id) === id && !x.pending) || list.find((x) => String(x.id) === id);
      if (a && !a.finished_at) el.setAttribute('href', '#/exam/' + id);
    });
  }

  /* ---------------- account ----------------
     Log out (red) is on the right of the "Account" title, and also at the top right of every screen. The language choice is always visible (not in a drop down). */
  function viewAccount() {
    const premOn = S.user.role !== 'admin' && S.premium && S.user.premium_until > Date.now();
    const premNote = S.user.role === 'admin' ? L('Admin: bukas lahat', 'Admin: everything open')
      : premOn ? L('Aktibo hanggang ', 'Active until ') + new Date(S.user.premium_until).toLocaleDateString('en-PH')
      : S.config.premium_required ? L('Hindi pa aktibo. Sa Premium: lahat ng exam set, walang limit, gumagana offline, PDF/email/print ng resulta.', 'Not active yet. With Premium: all exam sets, no limits, works offline, result PDF/email/print.')
      : L('Libre pa ang mock exams', 'Mock exams are free for now');
    shell('account', `
      <div class="page-head"><h1>Account</h1></div>
      ${premiumNotice()}
      <div class="card">
        <div class="row between"><div><b>${esc(S.user.name)}</b><div class="muted small">${esc(S.user.email)}</div></div>
        <span class="pill">${S.user.role === 'admin' ? 'Admin' : 'Reviewer'}</span></div>
        <div class="row between lang-row"><span class="small"><b>${L('Wika', 'Language')}</b> <span class="muted">· ${L('pindutin ang flag para magpalit', 'tap the flag to switch')}</span></span>${flagBtn('big')}</div>
        ${showLevel() ? `<div class="row between lang-row"><span class="small"><b>Level</b></span><div class="seg lvl-seg">${Object.entries(LEVELS).map(([k, [c, n]]) => `<button type="button" class="lvl-opt ${k} ${myLevel() === k ? 'active' : ''}" data-level="${k}" title="${n}">${c}</button>`).join('')}</div></div>` : ''}
      </div>
      <div class="stack">
      ${fold('acc-premium', `<h3>⭐ Premium</h3><span class="pill${premOn ? ' ok' : ''}">${premOn ? L('Aktibo', 'Active') : S.user.role === 'admin' ? 'Admin' : S.config.premium_required ? L('Hindi aktibo', 'Not active') : L('Libre', 'Free')}</span>`, `
        <p class="muted small" style="margin:0 0 10px">${premNote}</p>
        <a class="btn${premOn ? ' secondary' : ''}" href="#/premium">${premOn ? L('Tingnan o i-extend ang Premium', 'See or extend Premium') : L('Kumuha ng Premium', 'Get Premium')} ›</a>`)}
      ${fold('acc-help', `<h3>❓ ${L('Tulong at gabay', 'Help and guide')}</h3>`, `
        <p class="muted small" style="margin:0 0 10px">${L('Paano gamitin ang app, mga madalas itanong, at ulitin ang gabay.', 'How to use the app, common questions, and replay the guide.')}</p>
        <div class="row"><a class="btn secondary" href="#/help">${L('Buksan ang Tulong', 'Open Help')} ›</a><button type="button" class="btn ghost" id="accTour">▶ ${L('Ipakita ulit ang gabay', 'Show the guide again')}</button></div>`)}
      ${fold('acc-look', `<h3>${L('Itsura at madaling basahin', 'Look and easy reading')}</h3>`, `
        <p class="muted small" style="margin:0 0 10px">${L('Malambot na kulay na hindi masakit sa mata. Ang <b>Auto</b> ay kusang dumidilim kapag naka-dark mode ang phone o computer mo', 'Soft colors that are easy on the eyes. <b>Auto</b> turns dark by itself when your phone or computer is in dark mode')}${darkMQ ? ` (${L('ngayon', 'now')}: <b>${darkMQ.matches ? L('madilim', 'dark') : L('maliwanag', 'light')}</b>)` : ''}. ${L('Para mag-zoom, i-pinch ang screen gamit ang dalawang daliri', 'To zoom, pinch the screen with two fingers')}${IS_APP && !capNative ? L(' (o Ctrl + scroll / touchpad pinch)', ' (or Ctrl + scroll / touchpad pinch)') : ''}.</p>
        <div class="seg" id="themes" role="group" aria-label="${L('Kulay ng screen', 'Screen colors')}">${THEMES().map(([k, l]) => `<button type="button" data-theme="${k}" class="${(look() || {}).theme === k ? 'active' : ''}" aria-pressed="${(look() || {}).theme === k}">${l}</button>`).join('')}</div>
        ${zoomNow !== 1 ? `<p class="small" style="margin:10px 0 0">Zoom: <b>${Math.round(zoomNow * 100)}%</b> · <a href="#" id="zreset">${L('Ibalik sa 100%', 'Back to 100%')}</a></p>` : ''}
        <label>${L('Laki ng letra', 'Text size')}</label>
        <div class="seg" id="fsz" role="group" aria-label="${L('Laki ng letra', 'Text size')}">${A11Y_SIZES.map(([v, l], i) => `<button type="button" data-fs="${v}" class="${Number(a11y().fs) === v ? 'active' : ''}" aria-pressed="${Number(a11y().fs) === v}" aria-label="${[L('Normal', 'Normal'), L('Malaki', 'Large'), L('Mas malaki', 'Larger'), L('Pinakamalaki', 'Largest')][i]}" style="font-size:${0.85 + i * 0.12}rem">${l}</button>`).join('')}</div>
        <label class="check"><input type="checkbox" id="axContrast" ${a11y().contrast ? 'checked' : ''}> ${L('Mas malinaw na kulay (high contrast)', 'Stronger colors (high contrast)')}</label>
        <label class="check"><input type="checkbox" id="axMotion" ${a11y().motion ? 'checked' : ''}> ${L('Bawasan ang galaw (walang page-flip animation)', 'Less motion (no page-flip animation)')}</label>
        <p class="muted small" style="margin:10px 0 0">${L('Para sa lahat ito, libre man o Premium. Gumagana rin ang screen reader (TalkBack, VoiceOver, Narrator): may pangalan ang bawat button at binabasa ang bawat bagong tanong.', 'This is for everyone, free or Premium. Screen readers work too (TalkBack, VoiceOver, Narrator): every button has a name and each new question is read out.')}</p>`, { id: 'lookCard' })}
      ${fold('acc-remind', `<h3>⏰ ${L('Paalala sa pag-aaral', 'Study reminder')}</h3><span class="pill${Reminders.get().on ? ' ok' : ''}" id="rmPill">${Reminders.get().on ? fmtClock(Reminders.get().time) : L('Naka-off', 'Off')}</span>`, `
        <p class="muted small" style="margin:0 0 10px">${L('Isang paalala araw-araw sa oras na pipiliin mo, kung hindi ka pa nakakapag-practice o exam sa araw na iyon. Tumutulong ito para tuloy ang streak mo 🔥.', 'One reminder a day at the time you choose, if you have not practiced or taken an exam that day. It helps keep your streak 🔥.')}</p>
        <label class="check"><input type="checkbox" id="rmOn" ${Reminders.get().on ? 'checked' : ''}> ${L('Paalalahanan ako araw-araw', 'Remind me every day')}</label>
        <label for="rmTime">${L('Oras', 'Time')}</label><input type="time" id="rmTime" value="${esc(Reminders.get().time)}" style="max-width:180px">
        <label class="check"><input type="checkbox" id="rmMail" ${Reminders.get().email ? 'checked' : ''}> ${L(`Ipaalala rin sa email (${esc(S.user.email)}), kahit sarado ang app`, `Also remind me by email (${esc(S.user.email)}), even when the app is closed`)}</label>
        <p class="muted small" style="margin:8px 0 0">${Reminders.native() ? L('Sa app na ito, darating ang paalala bilang notification kahit sarado ang app at kahit offline.', 'In this app, the reminder comes as a notification even when the app is closed and offline.')
          : L('Sa website at Windows app, lalabas ang notification habang bukas ang app (o nasa background). Para kahit sarado, i-on ang email, o gamitin ang Android/iPhone app.', 'On the website and Windows app, the notification shows while the app is open (or in the background). For when it is closed, turn on email, or use the Android/iPhone app.')}</p>
        <button type="button" class="btn ghost small" id="rmTest" style="margin-top:10px">▶ ${L('Subukan ang paalala', 'Test the reminder')}</button>`)}
      ${fold('acc-backup', `<h3>☁️ ${L('Backup at restore', 'Backup and restore')}</h3><span class="pill ok">${L('Naka-on', 'On')}</span>`, `<div id="bkCard"></div>`)}
      ${fold('acc-sec', `<h3>🔐 ${L('Seguridad: mga huling login', 'Security: recent logins')}</h3>`, `<div id="secCard"><p class="muted small" style="margin:0">${L('Buksan para makita…', 'Open to see…')}</p></div>`)}
      ${fold('acc-bio', `<h3>${L('Mabilis na login', 'Quick login')}</h3><span class="pill ok" id="bioPill" style="display:none"></span>${S.premium ? '' : '<span class="pill">🔒 Premium</span>'}`, S.premium
        ? `<div id="bioCard"><p class="muted small" style="margin:0">${L('Tinitingnan…', 'Checking…')}</p></div>`
        : `<p class="muted small" style="margin:0 0 10px">${L('Mag-login gamit ang face, fingerprint o Windows Hello, walang password. Para sa Premium ito. Pwede ka pa ring mag-login gamit ang <b>code sa email</b>.', 'Log in with your face, fingerprint or Windows Hello, no password. This is for Premium. You can still log in with an <b>email code</b>.')}</p><a class="btn secondary" href="#/premium">⭐ ${L('Kumuha ng Premium', 'Get Premium')}</a>`)}
      ${fold('acc-sound', `<h3>🔊 ${L('Tunog', 'Sounds')}</h3><span class="pill" id="sndPill">${Sound.get().on ? L('Naka-on', 'On') : L('Naka-off', 'Off')}</span>`, `
        <p class="muted small" style="margin:0 0 10px">${L('Maiikling tunog kapag pumindot, pag-flip ng pahina sa exam, tama o mali sa practice, natapos ang exam, at 5 minutong natitira. Gumagana offline.', 'Short sounds when you tap, a page turn in the exam, right or wrong in practice, when an exam ends, and at 5 minutes left. Works offline.')}</p>
        <label class="check"><input type="checkbox" id="sndOn" ${Sound.get().on ? 'checked' : ''}> ${L('Naka-on ang tunog', 'Sounds on')}</label>
        ${navigator.vibrate ? `<label class="check"><input type="checkbox" id="sndBuzz" ${Sound.get().buzz !== false ? 'checked' : ''}> ${L('Bahagyang vibrate kapag pumindot', 'Light vibration when you tap')}</label>` : ''}
        <label for="sndVol">${L('Lakas', 'Volume')}</label><input type="range" id="sndVol" min="0" max="100" step="5" value="${Math.round(Sound.get().vol * 100)}">
        <label>${L('Tono', 'Tone')}</label>
        <div class="seg" id="sndTone">${[['soft', L('Malambing', 'Soft')], ['marimba', 'Marimba'], ['retro', 'Retro']].map(([k, n]) => `<button type="button" data-tone="${k}" class="${Sound.get().theme === k ? 'active' : ''}">${n}</button>`).join('')}</div>
        <button type="button" class="btn ghost small" id="sndTest" style="margin-top:10px">▶ ${L('Subukan', 'Try it')}</button>`)}
      ${fold('acc-pw', `<h3>${L('Palitan ang password', 'Change password')}</h3>`, `
        <form id="pwf"><label>${L('Kasalukuyang password', 'Current password')}</label><input type="password" id="cur" autocomplete="current-password">
        <label>${L('Bagong password', 'New password')}</label><input type="password" id="npw" autocomplete="new-password" placeholder="${L('8 characters o higit pa', '8 characters or more')}">
        <div class="err" id="err"></div><button class="btn" type="submit">${L('I-save', 'Save')}</button></form>`)}
      ${fold('acc-install', `<h3>${L('I-install sa phone', 'Install on your phone')}</h3>`, `
        <p class="muted small" style="margin:0 0 10px">${L('<b>Android (Chrome):</b> pindutin ang ⋮ menu → "Add to Home screen" o "Install app".<br><b>iPhone (Safari):</b> pindutin ang Share (□↑) → "Add to Home Screen".<br>Sa Premium, gumagana ito kahit offline. Kailangan ng internet para mag-login, magbayad, at makatanggap ng email.',
          '<b>Android (Chrome):</b> tap the ⋮ menu → "Add to Home screen" or "Install app".<br><b>iPhone (Safari):</b> tap Share (□↑) → "Add to Home Screen".<br>With Premium, it works even offline. You need internet to log in, pay, and get emails.')}</p>
        <button class="btn secondary" id="install" hidden>${L('I-install ang app', 'Install the app')}</button>`)}
      ${fold('acc-fix', `<h3>🛠️ Auto Fix</h3><span class="pill ok" id="fixPill">${L('Naka-on', 'On')}</span>`, `<div id="fixCard"></div>`)}
      ${fold('acc-about', `<h3>${L('Tungkol sa exam', 'About the exam')}</h3>`, `
        <p class="muted small" style="margin:0">${L('Sinusunod ng mock exam ang format ng Career Service Exam (pen and paper test) ng Civil Service Commission: Professional na 170 tanong sa loob ng 3 oras at 10 minuto, at Subprofessional na 165 tanong sa loob ng 2 oras at 40 minuto, lahat ay may 4 na pagpipilian at 80% ang passing rate. Hindi inilalabas ng CSC ang eksaktong bilang kada subject, kaya tantiya ang hati ng mga tanong. Ang app na ito ay hindi opisyal na produkto ng CSC.',
          'The mock exam follows the format of the Civil Service Commission\'s Career Service Exam (pen and paper test): Professional has 170 questions in 3 hours and 10 minutes, and Subprofessional has 165 questions in 2 hours and 40 minutes, all with 4 choices and an 80% passing rate. The CSC does not publish the exact count per subject, so the split of questions is an estimate. This app is not an official CSC product.')}</p>
        <p class="muted small" style="margin:10px 0 0">${L('Bersyon', 'Version')} ${APP_VERSION}</p>`)}
      </div>`);
    const pick = (sel, b) => $$(sel).forEach((x) => { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', String(x === b)); });
    $$('#themes [data-theme]').forEach((b) => (b.onclick = () => {
      store.set('cse-look', { ...(look() || { zoom: 1 }), theme: b.dataset.theme });
      pick('#themes button', b);
      applyLook(); Prefs.touched();
    }));
    $$('#fsz [data-fs]').forEach((b) => (b.onclick = () => { setA11y({ fs: Number(b.dataset.fs) }); pick('#fsz button', b); }));
    $('#axContrast').onchange = (e) => setA11y({ contrast: e.target.checked });
    $('#axMotion').onchange = (e) => setA11y({ motion: e.target.checked });
    const rmPaint = (r) => { const p = $('#rmPill'); p.textContent = r.on ? fmtClock(r.time) : L('Naka-off', 'Off'); p.classList.toggle('ok', r.on); };
    $('#rmOn').onchange = async (e) => {
      const r = await Reminders.set({ on: e.target.checked }); rmPaint(r);
      if (r.on && !Reminders.native() && window.Notification && Notification.permission === 'denied') toast(L('Naka-block ang notification sa browser na ito. I-on ang email na paalala.', 'Notifications are blocked in this browser. Turn on the email reminder.'));
      else toast(r.on ? L(`Naka-on ang paalala: ${fmtClock(r.time)} araw-araw.`, `Reminder on: ${fmtClock(r.time)} every day.`) : L('Naka-off ang paalala.', 'Reminder off.'));
    };
    $('#rmTime').onchange = async (e) => { if (/^\d{1,2}:\d{2}$/.test(e.target.value)) rmPaint(await Reminders.set({ time: e.target.value })); };
    $('#rmMail').onchange = async (e) => { const r = await Reminders.set({ email: e.target.checked, ...(e.target.checked ? { on: true } : {}) }); $('#rmOn').checked = r.on; rmPaint(r); };
    $('#rmTest').onclick = async () => {
      if (!Reminders.native() && window.Notification && Notification.permission === 'default') await Notification.requestPermission().catch(() => {});
      try { await Reminders.test(); toast(L('Ipinadala ang test na paalala.', 'Test reminder sent.')); } catch { toast(L('Hindi pinayagan ang notification sa device na ito.', 'Notifications are not allowed on this device.')); }
    };
    paintBackupCard();
    const sec = $('[data-fold="acc-sec"]');
    if (sec) sec.addEventListener('toggle', () => { if (sec.open) paintSecurity(); });
    $$('[data-level]').forEach((b) => (b.onclick = () => { setLevel(b.dataset.level); route(); }));
    $('#sndOn').onchange = (e) => { Sound.set({ on: e.target.checked }); $('#sndPill').textContent = e.target.checked ? L('Naka-on', 'On') : L('Naka-off', 'Off'); Sound.play('notify'); };
    if ($('#sndBuzz')) $('#sndBuzz').onchange = (e) => { Sound.set({ buzz: e.target.checked }); if (e.target.checked) Sound.buzz(20); };
    $('#sndVol').oninput = (e) => Sound.set({ vol: Number(e.target.value) / 100 });
    $('#sndVol').onchange = () => Sound.play('correct');
    $$('#sndTone [data-tone]').forEach((b) => (b.onclick = () => { Sound.set({ theme: b.dataset.tone }); $$('#sndTone button').forEach((x) => x.classList.toggle('active', x === b)); setTimeout(() => Sound.play('finish'), 120); }));
    $('#sndTest').onclick = () => { const seq = ['tap', 'flip', 'correct', 'wrong', 'finish']; seq.forEach((n, i) => setTimeout(() => (n === 'flip' ? Sound.flip() : Sound.play(n)), i * 650)); };
    if ($('#zreset')) $('#zreset').onclick = (e) => { e.preventDefault(); store.set('cse-look', { ...look(), zoom: 1 }); applyLook(); e.target.parentNode.remove(); };
    if ($('#bioCard')) paintBioCard();
    $('#pwf').onsubmit = async (e) => {
      e.preventDefault();
      const npw = $('#npw').value;
      try {
        await api('POST', '/api/me/password', { current: $('#cur').value, password: npw });
        OffAuth.remember(npw).catch(() => {}); // offline login on this device takes the new password, not the old one
        toast(L('Napalitan na ang password.', 'Password changed.')); e.target.reset(); $('#err').textContent = '';
      } catch (err) { $('#err').textContent = err.message; }
    };
    if ($('#accTour')) $('#accTour').onclick = () => Tour.replay();
    paintFixCard();
    if (window._installPrompt) { const b = $('#install'); b.hidden = false; b.onclick = () => window._installPrompt.prompt(); }
  }

  // Account → Backup and restore.
  function paintBackupCard() {
    const el = $('#bkCard'); if (!el) return;
    const last = Prefs.last(), waiting = local.all().filter((a) => a.finished_at).length + store.get(uk('cse-psub'), []).length;
    const prem = S.premium;
    el.innerHTML = `<p class="muted small" style="margin:0 0 8px">${L('<b>Kusang naka-save sa account mo:</b> lahat ng resulta, at ang settings mo (wika, itsura, laki ng letra, tunog, level, paalala). Kapag nagpalit ka ng phone o nag-install ulit, mag-login lang at babalik ang lahat.', '<b>Saved in your account by itself:</b> all results, and your settings (language, look, text size, sounds, level, reminder). When you change phones or reinstall, just log in and everything comes back.')}</p>
      <p class="small" style="margin:0 0 8px"><b>${L('Huling sync', 'Last sync')}:</b> ${last ? fmtDate(last) : L('wala pa', 'not yet')}${waiting ? ` · <span class="pill warn">${L(`${waiting} resultang offline na hindi pa naka-save online`, `${waiting} offline result(s) not saved online yet`)}</span>` : ''}</p>
      <div class="row"><button type="button" class="btn secondary" id="bkSync">☁️ ${L('I-sync ngayon', 'Sync now')}</button></div>
      <h4 style="margin:14px 0 4px">${L('Backup file (gumagana offline)', 'Backup file (works offline)')} ${prem ? '' : '<span class="pill">🔒 Premium</span>'}</h4>
      <p class="muted small" style="margin:0 0 8px">${prem ? L('I-download ang file na may settings at mga resultang ginawa offline na hindi pa naka-save online. I-restore ito sa ibang device (parehong account) kahit walang internet.', 'Download a file with your settings and the results made offline that are not saved online yet. Restore it on another device (same account) even without internet.')
        : L('Sa libreng plan, online ang app kaya naka-save na agad sa account ang lahat. Sa Premium (gumagana offline), may backup file para sa mga resultang ginawa offline.', 'On the free plan the app is online, so everything is saved in your account right away. Premium (works offline) adds a backup file for results made offline.')}</p>
      <div class="row">${prem ? `<button type="button" class="btn ghost" id="bkDown">⬇️ ${L('I-download ang backup', 'Download backup')}</button>
        <label class="btn ghost" style="margin:0">⬆️ ${L('I-restore mula sa file', 'Restore from file')}<input type="file" id="bkUp" accept=".json,application/json" hidden></label>` : `<a class="btn ghost" href="#/premium">⭐ ${L('Kumuha ng Premium', 'Get Premium')}</a>`}</div><div class="err" id="bkErr"></div>`;
    $('#bkSync').onclick = async (e) => {
      e.target.disabled = true;
      try { await Prefs.pull(true); await syncNow(); toast(L('Naka-sync na.', 'Synced.')); } catch (err) { toast(err.message); }
      paintBackupCard();
    };
    if ($('#bkDown')) $('#bkDown').onclick = async () => {
      try {
        const bytes = new TextEncoder().encode(JSON.stringify(Prefs.file()));
        const how = await saveFile(`CSE-Reviewer-backup-${new Date().toISOString().slice(0, 10)}.json`, bytes, 'application/json');
        toast(how === 'shared' ? L('Pumili kung saan ise-save ang backup.', 'Choose where to save the backup.') : L('Na-save ang backup (tingnan ang Downloads).', 'Backup saved (see Downloads).'));
      } catch (err) { $('#bkErr').textContent = err.message; }
    };
    if ($('#bkUp')) $('#bkUp').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const n = Prefs.restore(JSON.parse(await f.text()));
        toast(n ? L(`Naibalik: settings at ${n} resulta. Ise-save online ang mga ito kapag may internet.`, `Restored: settings and ${n} result(s). They are saved online when the internet is on.`) : L('Naibalik ang settings. Walang bagong resulta sa file.', 'Settings restored. No new results in the file.'));
        route();
      } catch (err) { $('#bkErr').textContent = err instanceof SyntaxError ? L('Hindi mabasa ang file.', 'The file cannot be read.') : err.message; }
    };
  }
  // Account → Security: the account's recent logins. A login from a new place and device is marked.
  async function paintSecurity() {
    const el = $('#secCard'); if (!el) return;
    let rows;
    try { rows = await cachedGet('/api/me/logins'); } catch (e) { el.innerHTML = `<p class="muted small" style="margin:0">${esc(e.message)}</p>`; return; }
    const what = { login: 'Login', login_failed_many: L('Maraming maling password', 'Many wrong passwords'), password_change: L('Pinalitan ang password', 'Password changed'), password_reset: L('Ni-reset ang password', 'Password reset') };
    el.innerHTML = `<p class="muted small" style="margin:0 0 8px">${L('Kung may login dito na hindi ikaw, palitan agad ang password mo. Kapag may login mula sa bagong lugar at bagong device, padadalhan ka rin ng email.', 'If a login here was not you, change your password right away. A login from a new place and a new device also sends you an email.')}</p>
      ${rows.length ? `<ul class="small sec-list">${rows.map((x) => `<li class="${x.alert ? 'bad' : ''}">${x.alert ? '⚠️ ' : ''}<b>${esc(what[x.action] || x.action)}</b> · ${fmtDate(x.at)}<div class="muted">${esc(x.device)}${x.ip ? ' · IP ' + esc(x.ip) : ''}${x.detail ? ' · ' + esc(x.detail) : ''}</div></li>`).join('')}</ul>` : `<p class="muted small">${L('Wala pa.', 'None yet.')}</p>`}`;
  }

  // Account → Auto Fix: what it did lately, "Fix now", and the safe reset.
  function paintFixCard() {
    const el = $('#fixCard');
    if (!el) return;
    const last = AutoFix.last(), log = AutoFix.log().slice(-5).reverse();
    el.innerHTML = `<p class="muted small" style="margin:0 0 10px">${L('Kusang hinahanap at inaayos ng app ang mga problema, online man o offline: sirang data sa device, kulang na files ng app, puno na storage, at mga resultang hindi pa naka-save online. Hindi nito binubura ang login at mga resulta mo.',
        'The app finds and fixes problems by itself, online or offline: broken data on the device, missing app files, full storage, and results not yet saved online. It never deletes your login or results.')}</p>
      <p class="small" style="margin:0 0 10px"><b>${L('Huling check', 'Last check')}:</b> ${last && last.t ? `${fmtDate(last.t)} · ${last.n ? L(`${last.n} naayos`, `${last.n} fixed`) : L('walang problema', 'no problems')}` : L('wala pa', 'not yet')}</p>
      ${log.length ? `<ul class="small fix-log">${log.map((x) => `<li class="${x.ok ? '' : 'bad'}"><span class="muted">${fmtDate(x.t)}</span> · ${esc(x.what)}</li>`).join('')}</ul>` : ''}
      <div class="row"><button type="button" class="btn secondary" id="fixNow">🛠️ ${L('Suriin at ayusin ngayon', 'Check and fix now')}</button><button type="button" class="btn ghost" id="fixReset">${L('I-reset ang files ng app', 'Reset the app files')}</button></div>`;
    $('#fixNow').onclick = async (e) => { e.target.disabled = true; await AutoFix.run('manual', true); paintFixCard(); };
    $('#fixReset').onclick = async () => {
      if (await confirmBox(L('I-reset ang files ng app?', 'Reset the app files?'), L('Kukunin ulit ang mga file ng app at magre-reload ito. Hindi mabubura ang login, settings at mga resulta mo.', 'The app\'s files are downloaded again and it reloads. Your login, settings and results stay.'), L('I-reset', 'Reset'))) AutoFix.reset();
    };
  }

  /* Log out: the red "Log out" button at the top right of every screen.
     It always asks first, so a stray tap does not log you out. */
  async function logout(ask = true) {
    const unsaved = local.all().some((a) => a.finished_at);
    if (ask && !(await confirmBox(L('Mag-logout?', 'Log out?'), unsaved
      ? L('May mga resulta kang ginawa offline na hindi pa naka-save online. Mase-save pa rin ang mga ito kapag nag-login ka ulit sa device na ito.', 'You have results made offline that are not saved online yet. They will still be saved when you log in again on this device.')
      : L('Kailangan mong mag-login ulit para magamit ang app sa device na ito.', 'You will need to log in again to use the app on this device.'), L('Mag-logout', 'Log out'), true))) return;
    Live.stop();
    api('POST', '/api/auth/logout').catch(() => { /* offline: still log out on this device */ });
    store.del('cse-token'); store.del('cse-boot'); store.del('cse-offauth'); S.offAuth = null; S.user = null; S.exam = null; Tour.stop(); Reminders.sync(); go('#/login');
  }

  async function paintBioCard() {
    const el = $('#bioCard');
    const rec = Bio.saved(), ms = await Bio.methods();
    if (!el || !el.isConnected) return;
    const mine = rec && rec.email === S.user.email;
    const cur = mine ? rec.method || 'finger' : null;
    const pill = $('#bioPill');
    if (pill) { pill.textContent = mine ? L('Naka-on: ', 'On: ') + METHODS[cur][1] : ''; pill.style.display = mine ? '' : 'none'; }
    const choice = (m) => `<button class="btn ${mine && cur === m ? '' : 'secondary'}" data-m="${m}" type="button">${METHODS[m][0]} ${METHODS[m][1]}</button>`;
    const note = !ms.length ? '' : NB
      ? (ms.includes('face') && ms.includes('finger') ? L('Ang phone ang nagpapasya kung tatanggapin ang face. Sa maraming Android phone, fingerprint lang ang pinapayagan para sa apps; kung ganoon, fingerprint ang hihingin kahit Face ang pinili mo.',
        'The phone decides whether it accepts your face. Many Android phones allow only the fingerprint for apps; then it will ask for the fingerprint even if you chose Face.') : '')
      : DESK ? L('Gamit ang Windows Hello: face (kung may Windows Hello camera ang computer), fingerprint, o PIN.', 'Uses Windows Hello: face (if the computer has a Windows Hello camera), fingerprint, or PIN.')
      : L('Gamit ang lock ng device mo: face, fingerprint, o PIN, depende sa kung ano ang naka-set up.', 'Uses your device lock: face, fingerprint, or PIN, depending on what is set up.');
    el.innerHTML = !ms.length && !rec
      ? `<p class="muted small" style="margin:0">${L('Walang face, fingerprint, o Windows Hello sa device na ito. Pwede ka pa ring mag-login gamit ang <b>code sa email</b>, walang password.', 'This device has no face, fingerprint, or Windows Hello. You can still log in with an <b>email code</b>, no password.')}</p>`
      : `<p class="small" style="margin:0 0 10px">${mine ? L(`✅ Naka-on. Sa login screen, pindutin ang <b>${esc(Bio.btn(rec))}</b> para makapasok nang walang password.`, `✅ On. On the login screen, tap <b>${esc(Bio.btn(rec))}</b> to get in without a password.`)
        : L('Pumili kung paano ka magla-login nang walang password.', 'Choose how to log in without a password.') + (rec ? L(` Papalitan nito ang naka-save na login ni ${esc(rec.name)} sa device na ito.`, ` This replaces the saved login of ${esc(rec.name)} on this device.`) : '')}</p>
        ${ms.length ? `<div class="auth-alt" style="margin-top:0">${ms.map(choice).join('')}</div>` : ''}
        ${note ? `<p class="muted small" style="margin:10px 0 0">${note}</p>` : ''}
        ${mine ? `<button class="btn ghost small" id="bioOff" style="margin-top:10px">${L('I-off', 'Turn off')}</button>` : ''}`;
    el.insertAdjacentHTML('beforeend', '<div class="err" id="berr"></div>');
    $$('#bioCard [data-m]').forEach((b) => (b.onclick = async () => {
      const m = b.dataset.m;
      if (mine && cur === m) return;
      $$('#bioCard [data-m]').forEach((x) => (x.disabled = true));
      try {
        if (mine) { await Bio.check(L(`Gamitin ang ${METHODS[m][1]}`, `Use ${METHODS[m][1]}`), m); setBioMethod(m); }
        else { if (rec) await Bio.forget(); await Bio.enable(m); }
        toast(L(`Naka-on na ang ${METHODS[m][1]} login.`, `${METHODS[m][1]} login is on.`)); paintBioCard();
      } catch (err) { $('#berr').textContent = bioErr(err); $$('#bioCard [data-m]').forEach((x) => (x.disabled = false)); }
    }));
    if ($('#bioOff')) $('#bioOff').onclick = async () => { await Bio.forget(); toast(L('Naka-off na ang mabilis na login.', 'Quick login is off.')); paintBioCard(); };
  }

  /* ---------------- admin ---------------- */
  async function viewAdmin(tab = 'overview') {
    if (S.user.role !== 'admin') return go('#/');
    const tabs = [['overview', 'Overview', '📊'], ['payments', 'Payments', '💳'], ['users', 'Users', '👥'], ['sets', 'Exam sets', '🗂️'], ['questions', L('Mga tanong', 'Questions'), '❓'], ['results', L('Resulta', 'Results'), '📈'], ['audit', 'Audit log', '🛡️'], ['settings', 'Settings', '⚙️']];
    if (!tabs.some(([k]) => k === tab)) return go('#/admin');
    /* The tabs are one dropdown menu. Switching tabs only changes the part below it:
       the menu is not drawn again and the screen does not jump. */
    const bar = $('#admTabs');
    if (bar && bar.dataset.lang === lang && $('#adm')) {
      ddPick(bar, tab);
      $('#adm').innerHTML = `<div class="empty">${L('Naglo-load…', 'Loading…')}</div>`;
    } else {
      shell('admin', `<h1>Admin</h1>${ddMenu('admTabs', tabs, tab)}<div id="adm"><div class="empty">${L('Naglo-load…', 'Loading…')}</div></div>`);
      $('#admTabs').dataset.lang = lang;
      $$('#admTabs [data-t]').forEach((b) => (b.onclick = () => { ddClose(); go('#/admin/' + b.dataset.t); }));
    }
    const el = $('#adm');
    try {
      if (tab === 'overview') await admOverview(el);
      else if (tab === 'users') await admUsers(el);
      else if (tab === 'questions') await admQuestions(el);
      else if (tab === 'payments') await admPayments(el);
      else if (tab === 'sets') await admSets(el);
      else if (tab === 'settings') await admSettings(el);
      else if (tab === 'audit') await admAudit(el);
      else await admResults(el);
    } catch (e) { el.innerHTML = `<div class="card err">${esc(e.message)}</div>`; }
  }
  async function admOverview(el) {
    const o = await api('GET', '/api/admin/overview');
    el.innerHTML = `
      <div class="grid stats">
        <div class="card stat"><div class="v">${o.users}</div><div class="l">${L('Kabuuang users', 'Total users')}</div></div>
        <div class="card stat"><div class="v">${o.newUsers7d}</div><div class="l">${L('Bagong users (7 araw)', 'New users (7 days)')}</div></div>
        <div class="card stat"><div class="v">${o.attempts}</div><div class="l">${L('Natapos na exam/practice', 'Exams/practice finished')}</div></div>
        <div class="card stat"><div class="v">${o.mockAttempts}</div><div class="l">${L('Mock exam na natapos', 'Mock exams finished')}</div></div>
        <div class="card stat"><div class="v">${o.avgMock ?? '–'}${o.avgMock != null ? '%' : ''}</div><div class="l">Average mock score</div></div>
        <div class="card stat"><div class="v">${o.mockAttempts ? pct(o.passed, o.mockAttempts) + '%' : '–'}</div><div class="l">${L('Passing rate ng users', 'Users passing rate')}</div></div>
      </div>
      ${o.alerts7d ? `<a class="notice alert-notice" href="#/admin/audit" style="display:block;margin-top:12px">🛡️ ${L(`<b>${o.alerts7d}</b> alerto sa seguridad sa nakaraang 7 araw (kahina-hinalang login o maraming maling password) →`, `<b>${o.alerts7d}</b> security alert(s) in the last 7 days (suspicious login or many wrong passwords) →`)}</a>` : ''}
      ${o.pendingPayments ? `<a class="notice" href="#/admin/payments" style="display:block;margin-top:12px">💳 ${L(`May <b>${o.pendingPayments}</b> bayad na hinihintay ma-check →`, `<b>${o.pendingPayments}</b> payment(s) waiting to be checked →`)}</a>` : ''}
      ${!o.mail.enabled ? `<div class="notice" style="margin-top:12px;background:var(--warn-soft)">${L('⚠️ Hindi pa naka-set up ang email. Hindi pa nagpapadala ng verification code, resulta at resibo. Tingnan ang README (Email setup).', '⚠️ Email is not set up yet. Verification codes, results and receipts are not being sent. See the README (Email setup).')}</div>` : ''}
      <div class="grid stats" style="margin-top:12px"><div class="card stat"><div class="v">${o.premiumUsers}</div><div class="l">Premium users</div></div></div>`;
  }
  async function admUsers(el) {
    let seq = 0;
    const paint = async (q = '') => {
      const my = ++seq;
      const users = await api('GET', '/api/admin/users?q=' + encodeURIComponent(q));
      if (my !== seq || !$('#ut')) return; // a newer search answered first, or the admin left this tab
      $('#ut').innerHTML = users.map((u) => `
        <tr><td>${u.id === S.user.id ? `<b>${esc(u.name)}</b> <span class="muted small">(${L('Ikaw', 'You')})</span>` : `<button type="button" class="u-link" data-u="${u.id}" title="${L('Pindutin para sa mga aksyon', 'Tap for actions')}">${esc(u.name)}</button>`}<div class="muted small">${esc(u.email)}</div></td>
        <td>${u.role === 'admin' ? '<span class="pill">Admin</span>' : 'User'} ${u.disabled ? '<span class="pill bad">Disabled</span>' : ''} ${u.premium_until > Date.now() ? '<span class="pill ok">Premium</span>' : ''} ${S.config.verify && !u.email_verified ? '<span class="pill warn">Unverified</span>' : ''}</td>
        <td>${u.attempts}</td><td>${u.avg_mock ?? '–'}${u.avg_mock != null ? '%' : ''}</td>
        <td class="hide-mobile small muted">${esc(String(u.created_at || '').slice(0, 10))}</td></tr>`).join('') || `<tr><td colspan="5" class="empty">${L('Walang user.', 'No users.')}</td></tr>`;
      $$('[data-u]').forEach((b) => (b.onclick = () => userActions(users.find((x) => x.id === +b.dataset.u), () => paint($('#uq').value))));
    };
    el.innerHTML = `<input type="search" id="uq" placeholder="${L('Hanapin ang pangalan o email', 'Search name or email')}">
      <div class="card table-wrap" style="margin-top:10px;padding:8px"><table><thead><tr><th>User</th><th>Role</th><th>Exams</th><th>Avg mock</th><th class="hide-mobile">${L('Sumali', 'Joined')}</th></tr></thead><tbody id="ut"></tbody></table></div>
      <p class="muted small">${L('Pindutin ang pangalan ng user para sa mga aksyon (Premium, admin, reset ng password, at iba pa).', 'Tap a user\'s name for actions (Premium, admin, password reset, and more).')}</p>`;
    let t; $('#uq').oninput = (e) => { clearTimeout(t); t = setTimeout(() => paint(e.target.value).catch((err) => toast(err.message)), 300); };
    await paint();
  }
  function userActions(u, refresh) {
    modal(`<h2 style="margin-top:0">${esc(u.name)}</h2><p class="muted small" style="margin-top:-6px">${esc(u.email)}</p>
      <div class="list">
        <button class="btn secondary" data-a="role">${u.role === 'admin' ? L('Alisin bilang admin', 'Remove as admin') : L('Gawing admin', 'Make admin')}</button>
        <button class="btn secondary" data-a="disable">${u.disabled ? L('I-enable ang account', 'Enable account') : L('I-disable ang account', 'Disable account')}</button>
        <button class="btn secondary" data-a="prem">${u.premium_until > Date.now() ? L(`Premium hanggang ${new Date(u.premium_until).toLocaleDateString('en-PH')} · +30 araw`, `Premium until ${new Date(u.premium_until).toLocaleDateString('en-PH')} · +30 days`) : L('Bigyan ng Premium (30 araw)', 'Give Premium (30 days)')}</button>
        ${u.premium_until > Date.now() ? `<button class="btn secondary" data-a="unprem">${L('Alisin ang Premium', 'Remove Premium')}</button>` : ''}
        ${S.config.verify && !u.email_verified ? `<button class="btn secondary" data-a="ver">${L('Markahang verified ang email', 'Mark email as verified')}</button>` : ''}
        <button class="btn secondary" data-a="report">${L('I-email ang progress report', 'Email the progress report')}</button>
        <button class="btn secondary" data-a="pw">${L('I-reset ang password', 'Reset password')}</button>
        <button class="btn secondary" data-a="hist">${L('Tingnan ang mga resulta', 'See results')}</button>
        <button class="btn danger" data-a="del">${L('Burahin ang account', 'Delete account')}</button>
        <button class="btn ghost" data-a="x">${L('Isara', 'Close')}</button>
      </div><div id="extra"></div>`, (bg, close) => {
      const act = async (fn, msg) => { try { await fn(); toast(msg); close(); refresh(); } catch (e) { toast(e.message); } };
      $('[data-a=x]', bg).onclick = close;
      $('[data-a=role]', bg).onclick = () => act(() => api('PATCH', '/api/admin/users/' + u.id, { role: u.role === 'admin' ? 'user' : 'admin' }), L('Na-update ang role.', 'Role updated.'));
      $('[data-a=disable]', bg).onclick = () => act(() => api('PATCH', '/api/admin/users/' + u.id, { disabled: !u.disabled }), u.disabled ? L('Na-enable.', 'Enabled.') : L('Na-disable.', 'Disabled.'));
      $('[data-a=prem]', bg).onclick = () => act(() => api('PATCH', '/api/admin/users/' + u.id, { premium_days: 30 }), L('Nabigyan ng 30 araw na Premium.', 'Gave 30 days of Premium.'));
      if ($('[data-a=unprem]', bg)) $('[data-a=unprem]', bg).onclick = () => act(() => api('PATCH', '/api/admin/users/' + u.id, { premium_days: 0 }), L('Inalis ang Premium.', 'Premium removed.'));
      if ($('[data-a=ver]', bg)) $('[data-a=ver]', bg).onclick = () => act(() => api('PATCH', '/api/admin/users/' + u.id, { email_verified: true }), L('Na-verify.', 'Verified.'));
      $('[data-a=report]', bg).onclick = () => act(() => api('POST', `/api/admin/users/${u.id}/report`), L('Naipadala ang report sa email ng user.', 'The report was sent to the user\'s email.'));
      $('[data-a=pw]', bg).onclick = () => {
        $('#extra', bg).innerHTML = `<label>${L('Bagong password', 'New password')}</label><input type="text" id="np" placeholder="${L('8 characters o higit pa', '8 characters or more')}"><button class="btn" id="sp" style="margin-top:8px">${L('I-save', 'Save')}</button>`;
        $('#sp', bg).onclick = () => act(() => api('POST', `/api/admin/users/${u.id}/password`, { password: $('#np', bg).value }), L('Na-reset ang password. Ibigay ito sa user.', 'Password reset. Give it to the user.'));
      };
      $('[data-a=del]', bg).onclick = async () => {
        close();
        if (await confirmBox(L('Burahin ang account?', 'Delete the account?'), L(`Mabubura ang account ni <b>${esc(u.name)}</b> at lahat ng resulta niya. Hindi na ito maibabalik.`, `The account of <b>${esc(u.name)}</b> and all their results will be deleted. This cannot be undone.`), L('Burahin', 'Delete'), true)) {
          try { await api('DELETE', '/api/admin/users/' + u.id); toast(L('Nabura ang account.', 'Account deleted.')); refresh(); } catch (e) { toast(e.message); }
        }
      };
      $('[data-a=hist]', bg).onclick = async () => {
        let rows;
        try { rows = await api('GET', `/api/admin/users/${u.id}/attempts`); } catch (e) { return toast(e.message); }
        $('#extra', bg).innerHTML = `<h3 style="margin-top:16px">${L('Mga resulta', 'Results')}</h3>${rows.length ? `<div class="list">${rows.map(attemptRow).join('')}</div>` : `<p class="muted">${L('Wala pa.', 'None yet.')}</p>`}`;
        $$('#extra a', bg).forEach((a) => a.addEventListener('click', close));
      };
    });
  }
  async function admQuestions(el) {
    const st = { subject: '', q: '', page: 0 };
    el.innerHTML = `
      <div class="row">
        <select id="qs" style="flex:1;min-width:150px"><option value="">${L('Lahat ng subject', 'All subjects')}</option>${Object.entries(S.meta.subjects).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join('')}</select>
        <input type="search" id="qq" placeholder="${L('Hanapin', 'Search')}" style="flex:2;min-width:150px">
      </div>
      <div class="row" style="margin-top:10px"><button class="btn" id="qadd">+ ${L('Magdagdag ng tanong', 'Add a question')}</button><button class="btn ghost" id="qimp">Import (JSON)</button></div>
      <p class="muted small" id="qcount"></p>
      <div class="list" id="ql"></div>
      <div class="row" style="justify-content:center;margin-top:12px"><button class="btn ghost small" id="qprev">‹ ${L('Nakaraan', 'Previous')}</button><button class="btn ghost small" id="qnext">${L('Susunod', 'Next')} ›</button></div>`;
    const paint = async () => {
      const r = await api('GET', `/api/admin/questions?subject=${st.subject}&q=${encodeURIComponent(st.q)}&page=${st.page}`);
      $('#qcount').textContent = L(`${r.total} tanong · pahina ${st.page + 1} sa ${Math.max(1, Math.ceil(r.total / 50))}`, `${r.total} questions · page ${st.page + 1} of ${Math.max(1, Math.ceil(r.total / 50))}`);
      $('#ql').innerHTML = r.rows.map((q) => `
        <div class="review-item">
          <div class="row between"><span class="q-num">${esc(subjName(q.subject))} · ${esc(q.topic || '—')} ${q.level !== 'both' ? `· ${q.level}` : ''}</span>
          <span class="row" style="gap:6px"><button class="btn ghost small" data-e="${q.id}">${L('I-edit', 'Edit')}</button><button class="btn ghost small" data-d="${q.id}">${L('Itago', 'Hide')}</button></span></div>
          <div style="font-weight:600;margin:6px 0;white-space:pre-wrap">${esc(q.question)}</div>
          <div class="small">${q.choices.map((c, i) => `<div style="${i === q.answer ? 'color:var(--ok);font-weight:700' : ''}">${LETTERS[i]}. ${esc(c)}${i === q.answer ? ' ✓' : ''}</div>`).join('')}</div>
        </div>`).join('') || `<div class="card empty">${L('Walang tanong.', 'No questions.')}</div>`;
      $('#qprev').disabled = st.page === 0;
      $('#qnext').disabled = (st.page + 1) * 50 >= r.total;
      $$('[data-e]').forEach((b) => (b.onclick = () => qForm(r.rows.find((x) => x.id === +b.dataset.e), paint)));
      $$('[data-d]').forEach((b) => (b.onclick = async () => {
        if (await confirmBox(L('Itago ang tanong?', 'Hide the question?'), L('Hindi na ito lalabas sa mga bagong exam.', 'It will no longer appear in new exams.'), L('Itago', 'Hide'), true)) { try { await api('DELETE', '/api/admin/questions/' + b.dataset.d); toast(L('Naitago.', 'Hidden.')); await paint(); } catch (e) { toast(e.message); } }
      }));
    };
    const repaint = () => paint().catch((e) => toast(e.message));
    $('#qs').onchange = (e) => { st.subject = e.target.value; st.page = 0; repaint(); };
    let t; $('#qq').oninput = (e) => { clearTimeout(t); t = setTimeout(() => { st.q = e.target.value; st.page = 0; repaint(); }, 300); };
    $('#qprev').onclick = () => { st.page--; repaint(); };
    $('#qnext').onclick = () => { st.page++; repaint(); };
    $('#qadd').onclick = () => qForm(null, paint);
    $('#qimp').onclick = () => importForm(paint);
    await paint();
  }
  function qForm(q, refresh) {
    const v = q || { subject: 'verbal', topic: '', level: 'both', question: '', passage: '', choices: ['', '', '', ''], answer: 0, explanation: '' };
    modal(`<h2 style="margin-top:0">${q ? L('I-edit ang tanong', 'Edit question') : L('Bagong tanong', 'New question')}</h2>
      <form id="qf">
        <div class="row"><div style="flex:1;min-width:140px"><label>Subject</label><select id="fs">${Object.entries(S.meta.subjects).map(([k, s]) => `<option value="${k}" ${k === v.subject ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
        <div style="flex:1;min-width:140px"><label>Level</label><select id="fl"><option value="both">${L('Pareho', 'Both')}</option><option value="pro" ${v.level === 'pro' ? 'selected' : ''}>${L('Professional lang', 'Professional only')}</option><option value="subpro" ${v.level === 'subpro' ? 'selected' : ''}>${L('Subprofessional lang', 'Subprofessional only')}</option></select></div></div>
        <label>${L('Topic (hal. Grammar, RA 6713)', 'Topic (e.g. Grammar, RA 6713)')}</label><input type="text" id="ft" value="${esc(v.topic)}">
        <label>${L('Talata / passage (opsyonal, para sa reading comprehension)', 'Passage (optional, for reading comprehension)')}</label><textarea id="fp">${esc(v.passage)}</textarea>
        <label>${L('Tanong', 'Question')}</label><textarea id="fq" required>${esc(v.question)}</textarea>
        <label>${L('Mga pagpipilian (piliin ang tamang sagot)', 'Choices (pick the correct answer)')}</label>
        ${[0, 1, 2, 3].map((i) => `<div class="row" style="margin-bottom:8px;flex-wrap:nowrap"><input type="radio" name="fa" value="${i}" ${i === v.answer ? 'checked' : ''} style="width:22px;height:22px" aria-label="${L('Tamang sagot', 'Correct answer')} ${LETTERS[i]}"><b>${LETTERS[i]}</b><input type="text" class="fc" value="${esc(v.choices[i])}"></div>`).join('')}
        <label>${L('Paliwanag', 'Explanation')}</label><textarea id="fe">${esc(v.explanation)}</textarea>
        <div class="err" id="ferr"></div>
        <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-x>${L('Kanselahin', 'Cancel')}</button><button class="btn" type="submit">${L('I-save', 'Save')}</button></div>
      </form>`, (bg, close) => {
      $('[data-x]', bg).onclick = close;
      $('#qf', bg).onsubmit = async (e) => {
        e.preventDefault();
        const body = { subject: $('#fs', bg).value, level: $('#fl', bg).value, topic: $('#ft', bg).value, passage: $('#fp', bg).value, question: $('#fq', bg).value,
          choices: $$('.fc', bg).map((x) => x.value), answer: +($('input[name=fa]:checked', bg)?.value ?? -1), explanation: $('#fe', bg).value };
        try { await api(q ? 'PUT' : 'POST', '/api/admin/questions' + (q ? '/' + q.id : ''), body); toast(L('Na-save ang tanong.', 'Question saved.')); close(); refresh(); } catch (err) { $('#ferr', bg).textContent = err.message; }
      };
    });
  }
  function importForm(refresh) {
    const sample = JSON.stringify([{ subject: 'general', topic: 'RA 6713', level: 'both', question: 'Sample na tanong?', choices: ['Tamang sagot', 'Mali 1', 'Mali 2', 'Mali 3'], answer: 0, explanation: 'Paliwanag.' }], null, 2);
    modal(`<h2 style="margin-top:0">${L('Import ng mga tanong', 'Import questions')}</h2>
      <p class="muted small">${L(`I-paste ang JSON array. Ang <b>subject</b> ay isa sa: ${Object.keys(S.meta.subjects).join(', ')}. Ang <b>answer</b> ay 0–3 (0 = A).`, `Paste a JSON array. <b>subject</b> is one of: ${Object.keys(S.meta.subjects).join(', ')}. <b>answer</b> is 0–3 (0 = A).`)}</p>
      <textarea id="ij" style="min-height:220px;font-family:monospace;font-size:13px">${esc(sample)}</textarea>
      <div class="err" id="ierr"></div>
      <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-x>${L('Kanselahin', 'Cancel')}</button><button class="btn" id="igo">Import</button></div>`, (bg, close) => {
      $('[data-x]', bg).onclick = close;
      $('#igo', bg).onclick = async () => {
        let data;
        try { data = JSON.parse($('#ij', bg).value); } catch { $('#ierr', bg).textContent = L('Hindi wastong JSON.', 'Invalid JSON.'); return; }
        try {
          const r = await api('POST', '/api/admin/questions/import', data);
          toast(L(`${r.added} tanong ang naidagdag.`, `${r.added} question(s) added.`));
          if (r.errors.length) $('#ierr', bg).textContent = r.errors.join(' · '); else close();
          refresh();
        } catch (e) { $('#ierr', bg).textContent = e.message; }
      };
    });
  }
  async function admPayments(el, status = 'pending') {
    const rows = await api('GET', '/api/admin/payments?status=' + status);
    el.innerHTML = `<div class="tabs" id="pst">${[['pending', L('Hinihintay', 'Waiting')], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([k, l]) => `<button data-s="${k}" class="${k === status ? 'active' : ''}">${l}</button>`).join('')}</div>
      <p class="muted small">${L('I-check sa app ng GCash, Maya, PayPal o bangko mo kung pumasok ang bayad (gamit ang reference number at resibo) bago i-approve.', 'Check in your GCash, Maya, PayPal or bank app that the payment came in (using the reference number and receipt) before approving.')}</p>
      <div class="list">${rows.map((p) => `<div class="review-item">
        <div class="row between"><div><b>${esc(p.name)}</b> <span class="muted small">${esc(p.email)}</span></div><span class="muted small">${fmtDate(p.created_at)}</span></div>
        <div style="margin:6px 0">₱${esc(p.amount)} · ${esc(p.method)} · Ref: <b>${esc(p.reference)}</b>${p.note ? ` · ${esc(p.note)}` : ''}</div>
        ${p.has_proof ? `<button class="btn ghost small" data-proof="${p.id}" style="margin-bottom:8px">🧾 ${L('Tingnan ang resibo', 'See the receipt')}</button>` : ''}
        ${status === 'pending' ? `<div class="row"><button class="btn small" data-ok="${p.id}">✓ ${L('I-approve', 'Approve')}</button><button class="btn ghost small" data-no="${p.id}">✕ ${L('I-reject', 'Reject')}</button></div>` : ''}
      </div>`).join('') || `<div class="card empty">${L('Walang bayad dito.', 'No payments here.')}</div>`}</div>`;
    $$('#pst [data-s]').forEach((b) => (b.onclick = () => admPayments(el, b.dataset.s)));
    $$('[data-proof]').forEach((b) => (b.onclick = async () => {
      try {
        const r = await api('GET', `/api/admin/payments/${b.dataset.proof}/proof`);
        modal(`<div class="row between"><h2 style="margin:0">${L('Resibo', 'Receipt')}</h2><button class="btn ghost small" data-x>${L('Isara', 'Close')}</button></div><img class="proof-full" src="${esc(r.proof)}" alt="">`, (bg, close) => { $('[data-x]', bg).onclick = close; });
      } catch (e) { toast(e.message); }
    }));
    $$('[data-ok]').forEach((b) => (b.onclick = async () => {
      if (!(await confirmBox(L('I-approve ang bayad?', 'Approve the payment?'), L('Mabibigyan ng Premium ang user at padadalhan siya ng email.', 'The user gets Premium and will be sent an email.'), L('I-approve', 'Approve')))) return;
      try { await api('POST', '/api/admin/payments/' + b.dataset.ok, { action: 'approve' }); toast(L('Na-approve.', 'Approved.')); admPayments(el, status); } catch (e) { toast(e.message); }
    }));
    $$('[data-no]').forEach((b) => (b.onclick = () => modal(`<h2 style="margin-top:0">${L('I-reject ang bayad', 'Reject the payment')}</h2><label>${L('Dahilan (makikita ng user)', 'Reason (the user will see it)')}</label><input type="text" id="why" value="${L('Hindi namin makita ang bayad gamit ang reference number na ito.', 'We could not find a payment with this reference number.')}">
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost" data-x>${L('Bumalik', 'Back')}</button><button class="btn danger" data-go>${L('I-reject', 'Reject')}</button></div>`, (bg, close) => {
      $('[data-x]', bg).onclick = close;
      $('[data-go]', bg).onclick = async () => { try { await api('POST', '/api/admin/payments/' + b.dataset.no, { action: 'reject', note: $('#why', bg).value }); close(); toast(L('Na-reject.', 'Rejected.')); admPayments(el, status); } catch (e) { toast(e.message); } };
    })));
  }
  async function admSets(el) {
    const rows = await api('GET', '/api/admin/sets');
    const by = (m) => rows.filter((r) => r.mode === m);
    // Professional and Subprofessional each open and close (drop down / up). They stay open while the admin works.
    el.innerHTML = `<p class="muted small">${L('Awtomatikong may bagong set bawat linggo. Pwede ka ring gumawa ng bagong set ngayon. Laging naka-on ang Set 1 (libre at nasa Home ng lahat).', 'A new set is made every week by itself. You can also make a new set now. Set 1 is always on (free and on everyone\'s Home).')}</p>
      <div class="stack">${['pro', 'subpro'].map((m) => fold('adm-sets-' + m, `<h3>${m === 'pro' ? 'Professional' : 'Subprofessional'}</h3><span class="pill">${by(m).length} set</span>`, `
        <button class="btn small" data-new="${m}">+ ${L('Bagong set', 'New set')}</button>
        <div class="list" style="margin-top:8px">${by(m).map((r) => `<div class="list-item"><div class="grow"><b>Set ${r.number}</b><div class="muted small">${fmtDate(r.created_at)} · ${L(`${r.taken} beses nasubukan`, `taken ${r.taken} time(s)`)}</div></div>${r.number === 1 ? `<span class="pill" title="${L('Libreng set na nasa Home ng lahat. Hindi ito nabubura.', 'The free set on everyone\'s Home. It cannot be deleted.')}">${L('Laging naka-on', 'Always on')}</span>` : `<button class="btn ghost small" data-del="${r.id}">${L('Burahin', 'Delete')}</button>`}</div>`).join('') || `<p class="muted small">${L('Wala pang set.', 'No sets yet.')}</p>`}</div>`, { stay: true })).join('')}</div>`;
    foldSync();
    $$('[data-new]', el).forEach((b) => (b.onclick = async () => { b.disabled = true; try { const r = await api('POST', '/api/admin/sets', { mode: b.dataset.new }); toast(L(`Nagawa ang Set ${r.number}.`, `Set ${r.number} made.`)); await admSets(el); } catch (e) { toast(e.message); b.disabled = false; } }));
    $$('[data-del]', el).forEach((b) => (b.onclick = async () => {
      if (!(await confirmBox(L('Burahin ang set?', 'Delete the set?'), L('Hindi na ito makikita ng mga user. Mananatili ang mga resulta ng mga nakasubok na.', 'Users will no longer see it. Results of those who took it stay.'), L('Burahin', 'Delete'), true))) return;
      try { await api('DELETE', '/api/admin/sets/' + b.dataset.del); toast(L('Nabura.', 'Deleted.')); await admSets(el); } catch (e) { toast(e.message); }
    }));
  }
  async function admSettings(el) {
    const st = await api('GET', '/api/admin/settings');
    let methods = st.pay_methods;
    const check = (id, on, text) => `<label class="check"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}> ${text}</label>`;
    const TYPES = [['gcash', 'GCash'], ['maya', 'Maya'], ['paypal', 'PayPal'], ['bank', L('Bangko', 'Bank')], ['gotyme', 'GoTyme'], ['shopeepay', 'ShopeePay'], ['other', L('Iba pa', 'Other')]];
    // The name users see comes from the type (GCash, Maya…), the bank's name, or the service's name for "Other".
    const typeName = (m) => (m.type === 'bank' ? m.bank || L('Bangko', 'Bank') : m.type === 'other' ? m.bank || L('Iba pa', 'Other') : (TYPES.find(([k]) => k === m.type) || [0, m.name])[1]);
    const pmCard = (m) => `<div class="pm-card" data-id="${esc(m.id)}" data-type="${esc(m.type)}" data-qr="${m.has_qr ? 1 : ''}">
        <div class="row between"><label class="check" style="margin:0"><input type="checkbox" data-k="on" ${m.on ? 'checked' : ''}> <b>${esc(typeName(m))}</b></label>
          <button type="button" class="btn ghost small" data-pmdel>${L('Alisin', 'Remove')}</button></div>
        <div class="grid two">
          ${m.type === 'bank' ? `<div><label>${L('Bangko', 'Bank')}</label><input type="text" data-k="bank" value="${esc(m.bank)}" placeholder="BDO, BPI, Landbank…"></div>` : ''}
          ${m.type === 'other' ? `<div><label>${L('Serbisyo', 'Service')}</label><input type="text" data-k="bank" value="${esc(m.bank)}" placeholder="${L('hal.', 'e.g.')} Coins.ph, Palawan"></div>` : ''}
          <div><label>Account name</label><input type="text" data-k="account_name" value="${esc(m.account_name)}" placeholder="${L('hal.', 'e.g.')} Juan D."></div>
          <div><label>${m.type === 'paypal' ? L('PayPal email o paypal.me link', 'PayPal email or paypal.me link') : m.type === 'bank' ? 'Account number' : L('Number / account', 'Number / account')}</label><input type="text" data-k="account" value="${esc(m.account)}"></div>
        </div>
        <label>${L('Paalala (opsyonal)', 'Note (optional)')}</label><input type="text" data-k="note" value="${esc(m.note)}" placeholder="${m.type === 'paypal' ? L('hal. Piliin ang Friends and Family', 'e.g. Choose Friends and Family') : ''}">
        <div class="row" style="margin-top:8px">${m.has_qr ? `<img class="qr-thumb" src="${API}/api/pay/qr/${encodeURIComponent(m.id)}?t=${Date.now()}" alt="QR">` : ''}
          <label class="btn ghost small" style="margin:0">📷 ${m.has_qr ? L('Palitan ang QR', 'Change QR') : L('Mag-upload ng QR', 'Upload QR')}<input type="file" accept="image/*" data-qrup hidden></label>
          ${m.has_qr ? `<button type="button" class="btn ghost small" data-qrdel>${L('Alisin ang QR', 'Remove QR')}</button>` : ''}</div>
      </div>`;
    // Each part of the settings opens and closes (drop down / up). Only one is open at a time, and they stay
    // open while the admin works in them. Everything is saved together with the Save button.
    const sec = (key, title, body, pill = '') => fold('adm-' + key, `<h3>${title}</h3>${pill}`, body, { stay: true });
    el.innerHTML = `<form id="stf" class="stack adm-settings">
      ${sec('premium', `⭐ ${L('Premium (bayad para sa mock exams)', 'Premium (paid mock exams)')}`, `
      ${check('preq', st.premium_required === '1', L('Kailangan ng Premium para sa mock exams', 'Mock exams need Premium'))}
      <p class="muted small" style="margin:4px 0 0">${L('Kapag naka-off, libre ang lahat at gumagana offline para sa lahat. Kapag naka-on, online lang ang libreng plan at may limit (Libreng plan sa ibaba).', 'When off, everything is free and works offline for everyone. When on, the free plan is online only and has limits (Free plan below).')}</p>
      <div class="row"><div style="flex:1;min-width:120px"><label>${L('Presyo (₱)', 'Price (₱)')}</label><input type="number" id="price" value="${esc(st.price)}"></div>
      <div style="flex:1;min-width:120px"><label>${L('Ilang araw', 'Number of days')}</label><input type="number" id="days" value="${esc(st.plan_days)}"></div></div>
      <label>${L('Pangalan ng negosyo sa resibo (opsyonal)', 'Business name on receipts (optional)')}</label><input type="text" id="bizName" value="${esc(st.biz_name)}" placeholder="${L('hal.', 'e.g.')} CSE Reviewer ni Juan Dela Cruz">
      <label>${L('Contact sa resibo (email, phone o address)', 'Contact on receipts (email, phone or address)')}</label><input type="text" id="bizContact" value="${esc(st.biz_contact)}">
      <p class="muted small" style="margin:4px 0 0">${L('Lalabas sa resibo ng bawat na-approve na bayad (RA 11967: dapat kilala ang nagbebenta). Hindi ito BIR invoice.', 'Shown on the receipt of every approved payment (RA 11967: the seller must be known). It is not a BIR invoice.')}</p>`,
      st.premium_required === '1' ? `<span class="pill ok">${L('Naka-on', 'On')} · ₱${esc(st.price)}</span>` : `<span class="pill">${L('Naka-off', 'Off')}</span>`)}

      ${sec('online', `💳 ${L('Online na bayad (PayMongo)', 'Online payment (PayMongo)')}`, `
      ${check('payon', st.pay_online_on !== '0', L('Naka-on ang online na bayad', 'Online payment on'))}
      <p class="muted small" style="margin:4px 0 0">${st.online_ready ? L('GCash, Maya, card, GrabPay, QR Ph (bank apps) at iba pa. Awtomatikong bubukas ang Premium pagkabayad.', 'GCash, Maya, card, GrabPay, QR Ph (bank apps) and more. Premium opens by itself after payment.')
        : L('⚠️ Hindi pa naka-set up: ilagay ang <code>PAYMONGO_SECRET_KEY</code> at <code>PAYMONGO_WEBHOOK_SECRET</code> sa server. Hangga\'t wala ang mga ito, hindi lalabas ang online na bayad kahit naka-on dito.', '⚠️ Not set up yet: set <code>PAYMONGO_SECRET_KEY</code> and <code>PAYMONGO_WEBHOOK_SECRET</code> on the server. Until then, online payment does not show even when on here.')}</p>`)}

      ${sec('manual', `🧾 ${L('Manual na bayad', 'Manual payment')}`, `
      ${check('payman', st.pay_manual_on !== '0', L('Naka-on ang manual na bayad (nagpapadala ang user ng reference number at screenshot, ikaw ang mag-a-approve)', 'Manual payment on (the user sends the reference number and a screenshot, you approve it)'))}
      <div class="row pm-add"><select id="pmType" aria-label="${L('Uri ng account', 'Account type')}">${TYPES.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select><button type="button" class="btn ghost" id="pmAdd">+ ${L('Magdagdag ng account', 'Add an account')}</button></div>
      <p class="muted small">${L('Pumili ng uri sa itaas, tapos pindutin ang "Magdagdag ng account". Lalabas lang sa user ang mga account na naka-check.', 'Pick a type above, then tap "Add an account". Users see only the checked accounts.')}</p>
      <div id="pmList" class="stack"></div>
      <label>${L('Paalala sa lahat ng user', 'Note to all users')}</label><textarea id="pnote">${esc(st.pay_note)}</textarea>`)}

      ${sec('free', `🆓 ${L('Libreng plan (kapag naka-on ang Premium)', 'Free plan (when Premium is on)')}`, `
      <div class="row"><div style="flex:1;min-width:100px"><label>${L('Practice kada araw', 'Practice per day')}</label><input type="number" min="0" id="fdaily" value="${esc(st.free_practice_daily)}"></div>
      <div style="flex:1;min-width:100px"><label>${L('Tanong bawat practice', 'Questions per practice')}</label><input type="number" min="5" id="fitems" value="${esc(st.free_practice_items)}"></div>
      <div style="flex:1;min-width:100px"><label>${L('Mock exam kada araw', 'Mock exams per day')}</label><input type="number" min="0" id="fmock" value="${esc(st.free_mock_daily)}"></div>
      <div style="flex:1;min-width:100px"><label>${L('Libreng exam set (Set 1 hanggang…)', 'Free exam sets (Set 1 to…)')}</label><input type="number" min="1" id="fsets" value="${esc(st.free_sets)}"></div></div>
      <p class="muted small" style="margin:4px 0 0">${L('Laging libre ang Set 1 para sa lahat.', 'Set 1 is always free for everyone.')}</p>`)}

      ${sec('ads', `📺 ${L('Ads (libreng plan lang)', 'Ads (free plan only)')}`, `
      ${check('adson', st.ads_on === '1', L('Magpakita ng ads sa libreng plan', 'Show ads on the free plan'))}
      <p class="muted small" style="margin:4px 0 0">${L('Hindi kailanman lalabas sa Premium, habang nag-e-exam o nagpa-practice, sa Account, Premium o Admin. Kapag wala pang ID, isang "Premium" card ang lalabas sa puwesto ng ad.', 'Never for Premium, never during an exam or practice, never on Account, Premium or Admin. Without IDs, a "Premium" card shows in the ad spot.')}</p>
      <div class="row"><div style="flex:1;min-width:180px"><label>AdSense publisher ID (website)</label><input type="text" id="asc" value="${esc(st.adsense_client)}" placeholder="ca-pub-1234567890123456"></div>
      <div style="flex:1;min-width:140px"><label>AdSense ad unit ID</label><input type="text" id="ass" value="${esc(st.adsense_slot)}" placeholder="1234567890"></div></div>
      <label>AdMob banner ID (Android app)</label><input type="text" id="amb" value="${esc(st.admob_banner)}" placeholder="ca-app-pub-1234567890123456/1234567890">
      <p class="muted small">${L('Para sa Android: ilagay din ang AdMob <b>App ID</b> sa GitHub (Settings → Secrets and variables → Actions → Variables → <code>ADMOB_APP_ID</code>) bago i-build ang APK.', 'For Android: also set the AdMob <b>App ID</b> in GitHub (Settings → Secrets and variables → Actions → Variables → <code>ADMOB_APP_ID</code>) before building the APK.')}</p>`)}

      ${sec('exam', `🔒 ${L('Screen habang nag-e-exam', 'Exam screen')}`, `
      ${check('wmon', st.exam_watermark !== '0', L('Watermark na "RA 10173" at email ng user sa buong screen', '"RA 10173" watermark with the user\'s email across the screen'))}
      ${check('stripon', st.exam_privacy_strip !== '0', L('Babala ng Data Privacy Act of 2012 (RA 10173) sa itaas ng exam', 'Data Privacy Act of 2012 (RA 10173) warning above the exam'))}
      <p class="muted small" style="margin:4px 0 0">${L('Naka-block pa rin ang screenshot sa Android at Windows app kahit naka-off ang mga ito.', 'Screenshots stay blocked in the Android and Windows apps even when these are off.')}</p>`)}
      <button class="btn block" type="submit">${L('I-save ang settings', 'Save settings')}</button></form>`;
    foldSync();
    const collect = () => $$('#pmList .pm-card').map((c) => ({
      id: c.dataset.id, type: c.dataset.type, has_qr: !!c.dataset.qr, on: $('[data-k=on]', c).checked,
      ...Object.fromEntries($$('input[type=text][data-k]', c).map((i) => [i.dataset.k, i.value.trim()])),
    }));
    const paintPm = () => {
      $('#pmList').innerHTML = methods.map(pmCard).join('');
      $$('#pmList [data-pmdel]').forEach((b) => (b.onclick = () => { methods = collect().filter((m) => m.id !== b.closest('.pm-card').dataset.id); paintPm(); }));
      $$('#pmList [data-qrup]').forEach((inp) => (inp.onchange = async () => {
        const id = inp.closest('.pm-card').dataset.id, file = inp.files[0];
        if (!file) return;
        try { await api('PUT', '/api/admin/pay-qr/' + id, { data: await readImage(file, 800, true) }); methods = collect().map((m) => (m.id === id ? { ...m, has_qr: true } : m)); paintPm(); toast(L('Na-upload ang QR.', 'QR uploaded.')); } catch (e) { toast(e.message); }
      }));
      $$('#pmList [data-qrdel]').forEach((b) => (b.onclick = async () => {
        const id = b.closest('.pm-card').dataset.id;
        try { await api('PUT', '/api/admin/pay-qr/' + id, { data: '' }); methods = collect().map((m) => (m.id === id ? { ...m, has_qr: false } : m)); paintPm(); } catch (e) { toast(e.message); }
      }));
    };
    paintPm();
    $('#pmList').addEventListener('input', (e) => {
      const i = e.target;
      if (i.dataset.k !== 'bank') return;
      const c = i.closest('.pm-card');
      $('.check b', c).textContent = i.value.trim() || (c.dataset.type === 'bank' ? L('Bangko', 'Bank') : L('Iba pa', 'Other'));
    });
    $('#pmAdd').onclick = () => {
      const type = $('#pmType').value, name = TYPES.find(([k]) => k === type)[1];
      methods = [...collect(), { id: type + '-' + Date.now().toString(36), type, name: type === 'other' ? '' : name, account_name: '', account: '', bank: '', note: '', on: true }];
      paintPm();
      const last = $$('#pmList .pm-card').pop(); last.scrollIntoView({ block: 'center' }); $('input[type=text]', last).focus();
    };
    $('#stf').onsubmit = async (e) => {
      e.preventDefault();
      const btn = $('button[type=submit]', e.target); btn.disabled = true;
      try {
        const v = (id) => $('#' + id).value, on = (id) => ($('#' + id).checked ? '1' : '0');
        const saved = await api('PUT', '/api/admin/settings', {
          premium_required: on('preq'), price: v('price'), plan_days: v('days'), pay_note: v('pnote'), biz_name: v('bizName').trim(), biz_contact: v('bizContact').trim(),
          pay_online_on: on('payon'), pay_manual_on: on('payman'), pay_methods: collect(),
          free_practice_daily: v('fdaily'), free_practice_items: v('fitems'), free_mock_daily: v('fmock'), free_sets: v('fsets'),
          ads_on: on('adson'), adsense_client: v('asc').trim(), adsense_slot: v('ass').trim(), admob_banner: v('amb').trim(),
          exam_watermark: on('wmon'), exam_privacy_strip: on('stripon'),
        });
        methods = saved.pay_methods; paintPm();
        await refreshMe().catch(() => {});
        toast(L('Na-save ang settings.', 'Settings saved.'));
      } catch (err) { toast(err.message); }
      btn.disabled = false;
    };
  }
  /* Admin → Audit log: who logged in (and from what device and IP), failed logins, and every admin change.
     Alerts: a login from a new place and a new device, many wrong passwords, and making someone admin. */
  const AUDIT_WHAT = () => ({
    login: 'Login', login_failed: L('Maling password', 'Wrong password'), login_failed_many: L('Maraming maling password', 'Many wrong passwords'), logout: 'Logout',
    password_change: L('Pinalitan ang password', 'Changed password'), password_reset: L('Ni-reset ang password (code)', 'Reset password (code)'),
    admin_user_change: L('Binago ang user', 'Changed a user'), admin_password_reset: L('Ni-reset ng admin ang password', 'Admin reset a password'), admin_user_delete: L('Binura ang account', 'Deleted an account'),
    admin_settings: L('Binago ang settings', 'Changed settings'), admin_pay_qr: L('Binago ang QR ng bayad', 'Changed a payment QR'), admin_set_new: L('Bagong exam set', 'New exam set'), admin_set_delete: L('Binura ang exam set', 'Deleted an exam set'),
    admin_question_add: L('Bagong tanong', 'New question'), admin_question_edit: L('In-edit ang tanong', 'Edited a question'), admin_question_hide: L('Itinago ang tanong', 'Hid a question'), admin_question_import: L('Import ng tanong', 'Imported questions'),
    payment_approve: L('Na-approve ang bayad', 'Approved a payment'), payment_reject: L('Ni-reject ang bayad', 'Rejected a payment'), payment_paid_online: L('Bayad online', 'Paid online'),
  });
  async function admAudit(el, filter = 'all', q = '') {
    const r = await api('GET', `/api/admin/audit?filter=${filter}&q=${encodeURIComponent(q)}`);
    const what = AUDIT_WHAT();
    el.innerHTML = `<div class="tabs" id="auf">${[['all', L('Lahat', 'All')], ['alerts', `⚠️ ${L('Mga alerto', 'Alerts')}${r.alerts7d ? ` (${r.alerts7d})` : ''}`], ['logins', 'Login'], ['admin', 'Admin']].map(([k, l]) => `<button data-f="${k}" class="${k === filter ? 'active' : ''}">${l}</button>`).join('')}</div>
      <input type="search" id="auq" value="${esc(q)}" placeholder="${L('Hanapin ang email, pangalan o IP', 'Search email, name or IP')}" aria-label="${L('Hanapin', 'Search')}">
      <p class="muted small">${L(`Ang mga alerto: login mula sa bagong lugar at bagong device (may email din sa user), 5 maling password sa loob ng 15 minuto, at bagong admin. Binubura ang log pagkalipas ng ${r.keep_days} araw (RA 10173).`, `Alerts: a login from a new place and a new device (the user also gets an email), 5 wrong passwords within 15 minutes, and a new admin. The log is deleted after ${r.keep_days} days (RA 10173).`)}</p>
      <div class="list">${r.rows.map((x) => `<div class="review-item audit-row${x.alert ? ' alert' : ''}">
        <div class="row between"><b>${x.alert ? '⚠️ ' : ''}${esc(what[x.action] || x.action)}</b><span class="muted small">${fmtDate(x.at)}</span></div>
        <div class="small">${x.user_id ? `${esc(x.name || L('(nabura)', '(deleted)'))} <span class="muted">${esc(x.email || '#' + x.user_id)}</span>` : ''}${x.actor_id && x.actor_id !== x.user_id ? ` · ${L('ni', 'by')} <b>${esc(x.actor_name || '#' + x.actor_id)}</b>` : ''}</div>
        ${x.detail ? `<div class="small">${esc(x.detail)}</div>` : ''}
        <div class="muted small">${esc(x.device)}${x.ip ? ' · IP ' + esc(x.ip) : ''}</div></div>`).join('') || `<div class="card empty">${L('Wala pang laman.', 'Nothing yet.')}</div>`}</div>`;
    $$('#auf [data-f]').forEach((b) => (b.onclick = () => admAudit(el, b.dataset.f, $('#auq').value).catch((e) => toast(e.message))));
    let t; $('#auq').oninput = (e) => { clearTimeout(t); t = setTimeout(() => admAudit(el, filter, e.target.value).then(() => { const i = $('#auq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }).catch((err) => toast(err.message)), 400); };
  }
  async function admResults(el) {
    const rows = await api('GET', '/api/admin/attempts');
    el.innerHTML = `<div class="card table-wrap" style="padding:8px"><table><thead><tr><th>User</th><th>Exam</th><th>Score</th><th class="hide-mobile">${L('Petsa', 'Date')}</th></tr></thead><tbody>
      ${rows.map((r) => { const p = pct(r.score, r.total); return `<tr><td><b>${esc(r.name)}</b><div class="muted small">${esc(r.email)}</div></td><td class="small"><a href="#/result/${r.id}">${esc(r.title)}</a></td>
      <td><span class="pill ${r.mode === 'practice' ? '' : p >= 80 ? 'ok' : 'bad'}">${p}%</span><div class="muted small">${r.score}/${r.total}</div></td><td class="hide-mobile small muted">${fmtDate(r.finished_at)}</td></tr>`; }).join('') || `<tr><td colspan="4" class="empty">${L('Wala pang resulta.', 'No results yet.')}</td></tr>`}
      </tbody></table></div>`;
  }


  /* ---------------- guide for new Premium users, and Help ----------------
     The first time a Premium user opens Home, a short guide points at each part of the screen
     (level, Set 1, all exam sets, Practice, Results, Account, Log out, language) one at a time.
     It shows once per account (saved on the server and on the device). It can be skipped, and
     replayed any time from Account → Help and guide. */
  const Tour = (() => {
    let box = null, i = 0, steps = [], tick = 0, wait = 0;
    const visible = (sel) => $$(sel).find((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; });
    const STEPS = () => [
      { sel: null, t: L('Maligayang pagdating sa Premium! ⭐', 'Welcome to Premium! ⭐'), x: L('Ipapakita namin kung saan makikita ang lahat. Mga 1 minuto lang ito. Pwede mo itong laktawan at ulitin anumang oras sa <b>Account → Tulong</b>.', 'We will show you where everything is. It takes about a minute. You can skip it and replay it any time from <b>Account → Help</b>.') },
      { sel: '.level-switch', t: L('1. Piliin ang level mo', '1. Choose your level'), x: L('<b>PRO</b> para sa Professional, <b>SUBPRO</b> para sa Subprofessional. Nasa ibaba agad ang mock exam ng napili mo.', '<b>PRO</b> for Professional, <b>SUBPRO</b> for Subprofessional. Its mock exam is right below.') },
      { sel: '[data-set1]', t: L('2. Simulan ang mock exam', '2. Start a mock exam'), x: L('Pindutin para simulan ang <b>Set 1</b>. Kapareho ng totoong CSE ang dami ng tanong at oras. Naka-save ang sagot mo kahit isara ang app.', 'Tap to start <b>Set 1</b>. Same number of questions and time as the real CSE. Your answers are saved even if you close the app.') },
      { sel: '.level-card a[href^="#/sets/"]', t: L('3. Lahat ng exam set', '3. All exam sets'), x: L('Dito ang Set 1, 2, 3… (may bago bawat linggo) at ang <b>Bagong halo</b> na bagong random na exam.', 'Set 1, 2, 3… are here (a new one every week), plus <b>New mix</b>, a new random exam.') },
      { sel: '.bottomnav a[href="#/practice"], .nav-desktop a[href="#/practice"]', t: L('4. Practice kada subject', '4. Practice by subject'), x: L('Pumili ng subject at ilang tanong. Agad makikita kung tama o mali, kasama ang paliwanag.', 'Pick a subject and how many questions. You see right away if you are right or wrong, with an explanation.') },
      { sel: '.bottomnav a[href="#/history"], .nav-desktop a[href="#/history"]', t: L('5. Mga resulta', '5. Results'), x: L('Lahat ng exam mo, score kada subject, at buong review. Sa resulta ng exam: <b>PDF, email at print</b>.', 'All your exams, score by subject, and the full review. On an exam result: <b>PDF, email and print</b>.') },
      { sel: '.bottomnav a[href="#/account"], .nav-desktop a[href="#/account"]', t: L('6. Account', '6. Account'), x: L('Itsura ng screen (Malambot, Sepia, Madilim), <b>mabilis na login</b> gamit ang face o fingerprint, tunog, password, at Premium.', 'Screen look (Soft, Sepia, Dark), <b>quick login</b> with face or fingerprint, sounds, password, and Premium.') },
      { sel: '#topLogout', t: L('7. Mag-logout', '7. Log out'), x: L('Ang pulang <b>Logout</b> sa kanang itaas. Magtatanong muna ito bago ka i-logout. Isang device lang ang pwedeng naka-login: kapag nag-login ka sa iba, kusang malo-logout ang device na ito.', 'The red <b>Log out</b> at the top right. It asks first before logging you out. Only one device can be logged in: when you log in on another one, this device logs out by itself.') },
      { sel: '.topbar .lang-flag', t: L('8. Wika', '8. Language'), x: L('Pindutin ang flag para magpalit sa English o Tagalog. Ang <b>Tulong</b> at ang gabay na ito ay nasa <b>Account</b>.', 'Tap the flag to switch between English and Tagalog. <b>Help</b> and this guide are in <b>Account</b>.') },
      { sel: null, t: L('Handa ka na! 🎉', 'You are ready! 🎉'), x: L('Gumagana ang app kahit offline. Good luck sa exam mo!', 'The app works even offline. Good luck on your exam!') },
    ];
    function place() {
      if (!box) return;
      const st = steps[i], el = st.sel && visible(st.sel);
      const hole = $('.tour-hole', box), tip = $('.tour-tip', box);
      const W = innerWidth, H = innerHeight, tw = Math.min(360, W - 32);
      tip.style.width = tw + 'px';
      if (!el) {
        Object.assign(hole.style, { left: W / 2 + 'px', top: H / 2 + 'px', width: '0px', height: '0px' });
        Object.assign(tip.style, { left: (W - tw) / 2 + 'px', top: Math.max(16, (H - tip.offsetHeight) / 2) + 'px' });
        return;
      }
      const r = el.getBoundingClientRect(), pad = 6;
      Object.assign(hole.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
      const left = Math.min(Math.max(16, r.left + r.width / 2 - tw / 2), W - tw - 16);
      const below = r.top + r.height / 2 < H / 2;
      const top = below ? r.bottom + pad + 12 : r.top - pad - 12 - tip.offsetHeight;
      Object.assign(tip.style, { left: left + 'px', top: Math.min(Math.max(12, top), H - tip.offsetHeight - 12) + 'px' });
    }
    function show() {
      const st = steps[i];
      $('.tour-tip', box).innerHTML = `<div class="tour-count">${i + 1} / ${steps.length}</div><h3>${st.t}</h3><p>${st.x}</p>
        <div class="tour-btns">${i === steps.length - 1 ? '' : `<button type="button" class="btn ghost small" data-tskip>${L('Laktawan', 'Skip')}</button>`}
        <span class="grow"></span>${i ? `<button type="button" class="btn ghost small" data-tback>‹</button>` : ''}
        <button type="button" class="btn small" data-tnext>${i === steps.length - 1 ? L('Tapos na', 'Done') : L('Susunod ›', 'Next ›')}</button></div>`;
      const el = st.sel && visible(st.sel);
      // Things in the page scroll into view; the top bar and the menu are always on screen.
      if (el && !el.closest('.topbar, .bottomnav')) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      place(); setTimeout(place, 350);
      $('[data-tnext]', box).focus({ preventScroll: true });
    }
    const go2 = (d) => { i = Math.min(Math.max(0, i + d), steps.length - 1); show(); };
    function start() {
      if (box || !S.user) return;
      // Steps whose part is not on this screen are left out (e.g. no level button on a very small screen).
      steps = STEPS().filter((st) => !st.sel || visible(st.sel));
      i = 0;
      box = document.createElement('div');
      box.className = 'tour'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', L('Gabay', 'Guide'));
      box.innerHTML = '<div class="tour-hole"></div><div class="tour-tip"></div>';
      box.addEventListener('click', (e) => {
        if (e.target.closest('[data-tnext]')) return i === steps.length - 1 ? finish() : go2(1);
        if (e.target.closest('[data-tback]')) return go2(-1);
        if (e.target.closest('[data-tskip]')) return finish();
      });
      document.body.appendChild(box);
      document.body.classList.add('touring');
      tick = setInterval(place, 300); // the screen may redraw under the guide (fresh data)
      addEventListener('resize', place); addEventListener('scroll', place, { passive: true });
      show();
    }
    function stop() {
      clearTimeout(wait); wait = 0;
      if (!box) return;
      clearInterval(tick); removeEventListener('resize', place); removeEventListener('scroll', place);
      box.remove(); box = null; document.body.classList.remove('touring');
    }
    function finish() {
      stop();
      store.set(uk('cse-tour'), 1);
      if (S.user && !S.user.tour_done) { S.user.tour_done = true; api('POST', '/api/me/tour', { done: true }).catch(() => {}); }
      setTimeout(offerBio, 500);
    }
    document.addEventListener('keydown', (e) => {
      if (!box) return;
      if (e.key === 'Escape') finish(); else if (e.key === 'ArrowRight') go2(1); else if (e.key === 'ArrowLeft') go2(-1);
    });
    // New Premium users: not admins (they can replay it from Help), and only once per account.
    const due = () => !!(S.user && S.premium && S.user.role !== 'admin' && !S.user.tour_done && !store.get(uk('cse-tour')) && !(S.config.verify && !S.user.email_verified));
    function maybe() {
      if (box || wait || !$('.level-switch')) return;
      const replay = S.tourNext; S.tourNext = false;
      if (!replay && !due()) return;
      wait = setTimeout(() => { wait = 0; if (!S.exam && !document.querySelector('.modal-bg') && $('.level-switch')) start(); }, replay ? 300 : 700);
    }
    return { maybe, stop, due, active: () => !!box, replay: () => { S.tourNext = true; go('#/'); } };
  })();

  function viewHelp() {
    const Q = (k, q, a) => fold('help-' + k, `<h3>${q}</h3>`, `<div class="small help-a">${a}</div>`);
    shell('account', `
      <div class="row between page-head"><h1>❓ ${L('Tulong', 'Help')}</h1><a class="btn ghost small" href="#/account">‹ Account</a></div>
      <div class="card help-hero">
        <p style="margin:0 0 10px">${L('Hindi mo maalala kung saan o paano? Ipapakita ulit ng gabay ang bawat bahagi ng Home, isa-isa.', 'Can\'t remember where or how? The guide shows each part of Home again, one at a time.')}</p>
        <button class="btn block" id="tourAgain" type="button">▶ ${L('Ipakita ulit ang gabay', 'Show the guide again')}</button>
      </div>
      <h2>${L('Mga madalas itanong', 'Common questions')}</h2>
      <div class="stack">
      ${Q('mock', L('Paano mag-mock exam?', 'How do I take a mock exam?'), L(`<ol><li>Sa <a href="#/">Home</a>, piliin ang <b>PRO</b> (Professional) o <b>SUBPRO</b> (Subprofessional).</li><li>Pindutin ang <b>▶ Simulan ang Set 1</b>, o <b>Lahat ng exam set</b> para pumili ng ibang set o <b>Bagong halo</b>.</li><li>Parang papel ang exam: <b>i-swipe</b> pakaliwa o pakanan (o pindutin ang nakatiklop na kanto) para ilipat ang pahina. <b>☰ Lahat</b> para makita ang lahat ng tanong, <b>⚑</b> para markahan at balikan, at <b>Isumite ✓</b> kapag tapos na.</li></ol>Tuloy-tuloy ang timer kahit isara ang app, pero naka-save ang mga sagot mo. Ituloy ito mula sa Home.`,
        `<ol><li>On <a href="#/">Home</a>, choose <b>PRO</b> (Professional) or <b>SUBPRO</b> (Subprofessional).</li><li>Tap <b>▶ Start Set 1</b>, or <b>All exam sets</b> to pick another set or <b>New mix</b>.</li><li>The exam is like a paper test: <b>swipe</b> left or right (or tap the folded corner) to turn the page. <b>☰ All</b> shows every question, <b>⚑</b> marks one to come back to, and <b>Submit ✓</b> when you are done.</li></ol>The timer keeps running even if you close the app, but your answers are saved. Continue it from Home.`))}
      ${Q('set1', L('Ano ang Set 1 at ang mga exam set?', 'What are Set 1 and the exam sets?'), L('Ang <b>Set 1</b> ay laging nasa Home at bukas sa lahat. May bagong set bawat linggo (Set 2, 3…), makikita sa <b>Lahat ng exam set</b>, pinakabago muna. Ang <b>Bagong halo</b> ay bagong random na exam tuwing pipindutin.',
        '<b>Set 1</b> is always on Home and open to everyone. A new set comes every week (Set 2, 3…), listed in <b>All exam sets</b>, newest first. <b>New mix</b> is a new random exam every time.'))}
      ${Q('practice', L('Paano mag-practice kada subject?', 'How do I practice by subject?'), L('Pumunta sa <a href="#/practice">Practice</a>, pumili ng level, subject, ilang tanong at timer, tapos <b>Simulan ang practice</b>. Agad makikita kung tama o mali, kasama ang paliwanag.', 'Go to <a href="#/practice">Practice</a>, pick the level, subject, number of questions and timer, then <b>Start practice</b>. You see right away if you are right or wrong, with an explanation.'))}
      ${Q('results', L('Saan ang resulta, PDF, email at print?', 'Where are results, PDF, email and print?'), L('Sa <a href="#/history">Resulta</a> ang lahat ng exam mo at ang score kada subject. Buksan ang isang exam para sa review. Sa Premium, may <b>I-save bilang PDF</b>, <b>Ipadala sa email</b> at <b>Print</b> sa itaas ng resulta (gumagana offline ang PDF at Print).', '<a href="#/history">Results</a> has all your exams and your score by subject. Open an exam for the review. With Premium, <b>Save as PDF</b>, <b>Send to email</b> and <b>Print</b> are at the top of the result (PDF and Print work offline).'))}
      ${Q('look', L('Paano palitan ang level, wika, itsura at tunog?', 'How do I change the level, language, look and sounds?'), L('<b>Level:</b> pindutin ang PRO / SUBPRO sa Home, Practice o Account.<br><b>Wika:</b> pindutin ang flag sa kanang itaas.<br><b>Itsura at Tunog:</b> sa <a href="#/account">Account</a>. Para mag-zoom, i-pinch ang screen gamit ang dalawang daliri.', '<b>Level:</b> tap PRO / SUBPRO on Home, Practice or Account.<br><b>Language:</b> tap the flag at the top right.<br><b>Look and Sounds:</b> in <a href="#/account">Account</a>. To zoom, pinch the screen with two fingers.'))}
      ${Q('bio', L('Paano mag-login gamit ang face o fingerprint?', 'How do I log in with face or fingerprint?'), L('Sa <a href="#/account">Account</a> → <b>Mabilis na login</b>, piliin ang Face o Fingerprint (Premium). Sa susunod, pindutin lang ito sa login screen. Pwede ka ring mag-login gamit ang <b>code sa email</b>, walang password.', 'In <a href="#/account">Account</a> → <b>Quick login</b>, choose Face or Fingerprint (Premium). Next time, just tap it on the login screen. You can also log in with an <b>email code</b>, no password.'))}
      ${Q('offline', L('Gumagana ba kahit walang internet?', 'Does it work without internet?'), L('Oo, sa Premium: lahat ng practice, mock exam at naka-save na exam set. Pwede ka ring <b>mag-login offline</b> gamit ang password o face/fingerprint, sa device na nag-login ka na online dati. Ise-save online ang mga resulta kapag may internet na. Kailangang mag-online kahit isang beses bawat 30 araw. Kailangan ng internet sa libreng plan.', 'Yes, with Premium: all practice, mock exams and saved exam sets. You can also <b>log in offline</b> with your password or face/fingerprint, on a device where you logged in online before. Results are saved online when the internet is back. Go online at least once every 30 days. The free plan needs internet.'))}
      ${Q('logout', L('Bakit ako na-logout?', 'Why was I logged out?'), L('<b>Isang device lang ang pwedeng naka-login</b> sa isang account. Kapag nag-login ka sa ibang phone o computer, malo-logout agad ang nauna (sa loob ng ilang segundo). Kung hindi ikaw ang nag-login, mag-login ulit at palitan agad ang password sa <a href="#/account">Account</a>.', '<b>Only one device can be logged in</b> to an account. When you log in on another phone or computer, the first one is logged out within seconds. If it was not you, log in again and change your password right away in <a href="#/account">Account</a>.'))}
      ${Q('pay', L('Paano magbayad o i-extend ang Premium?', 'How do I pay or extend Premium?'), L('Sa <a href="#/premium">Account → Premium</a>. Magbayad online (bukas agad ang Premium), o manual: magpadala sa account na nakalista, tapos ilagay ang reference number at screenshot ng resibo. May email kapag na-approve na.', 'In <a href="#/premium">Account → Premium</a>. Pay online (Premium opens right away), or manually: send to a listed account, then enter the reference number and a screenshot of the receipt. You get an email once it is approved.'))}
      </div>`);
    $('#tourAgain').onclick = () => Tour.replay();
  }

  /* ---------------- Auto Fix ----------------
     Finds and fixes common problems by itself, online and offline, without the user doing anything:
     - Saved data on the device (the account copy, exam questions, results waiting to be saved…) is checked.
       A broken copy is removed and fetched again from the server. Results not yet saved online are never
       thrown away: a broken one is moved to a backup instead.
     - Device storage full: old copies of screens' data (they are only copies) are cleared to make room.
     - App files (website): the service worker checks that every file of this version is on the device and
       downloads any missing one again.
     - Saving: results, emails and payments waiting on this device are sent again; the live login line reconnects.
     - Screen errors: a screen that fails to draw is drawn again once; if it keeps failing, Auto Fix runs and the
       user gets a button to fix and reload. Never in the middle of an exam (answers are saved on every tap).
     It runs when the app opens, when the internet comes back, when the app returns to the front (at most once an
     hour), and when errors repeat. Account → Auto Fix shows what it did and has "Fix now" and a safe reset.
     index.html has a small boot guard for when the app's files themselves cannot start (see there). */
  const AutoFix = (() => {
    const LOG = 'cse-fixlog';
    let lastRun = 0, running = null, recent = [];
    const note = (what, ok = true) => { const l = store.get(LOG, []); (Array.isArray(l) ? l : []).push({ t: Date.now(), what: String(what).slice(0, 160), ok }); store.set(LOG, (Array.isArray(l) ? l : []).slice(-30)); };
    const lsKeys = () => { try { return Object.keys(localStorage); } catch { return []; } };
    const raw = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
    const parse = (k) => { const r = raw(k); if (r == null) return { ok: true, v: undefined }; try { return { ok: true, v: JSON.parse(r) }; } catch { return { ok: false }; } };
    const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
    // What each saved item must look like. Anything else is a broken copy.
    const SHAPES = [
      [/^cse-boot$/, (v) => isObj(v) && 'user' in v], [/^cse-meta$/, (v) => isObj(v) && isObj(v.subjects)],
      [/^cse-look$/, isObj], [/^cse-offauth$/, (v) => isObj(v) && !!v.email], [/^cse-bio$/, (v) => isObj(v) && !!v.email],
      [/^cse-ota$/, (v) => isObj(v) && !!v.id], [/^cse-token$/, (v) => typeof v === 'string'],
      [/^cse-pack-\d+$/, (v) => isObj(v) && isObj(v.practice)], [/^cse-map-\d+$/, isObj],
      [/^cse-mailq-\d+$/, Array.isArray], [/^cse-local-\d+$/, Array.isArray], [/^cse-psub-\d+$/, Array.isArray],
      [/^cse-fixlog$/, Array.isArray],
    ];
    // Results waiting to be saved: keep the good ones, back up the broken ones (never deleted).
    const KEEP = /^cse-(local|psub)-\d+$/;
    function checkData() {
      let fixed = 0;
      for (const k of lsKeys()) {
        if (!k.startsWith('cse-') || k === 'cse-fix-backup') continue;
        const p = parse(k), rule = SHAPES.find(([re]) => re.test(k));
        if (KEEP.test(k)) {
          if (p.ok && Array.isArray(p.v)) {
            const good = p.v.filter((a) => isObj(a) && a.id != null);
            if (good.length === p.v.length) continue;
            backup(k, p.v.filter((a) => !good.includes(a))); store.set(k, good);
          } else { backup(k, raw(k)); store.del(k); }
          fixed++; note(L('Inayos ang naka-save na resulta (may backup)', 'Repaired saved results (backed up)'));
          continue;
        }
        if (p.ok && (!rule || rule[1](p.v))) continue;
        store.del(k); fixed++;
        if (k === 'cse-token' || k === 'cse-boot') note(L('Sirang login sa device: mag-login ulit kung kailangan', 'Broken login on the device: log in again if asked'), false);
      }
      if (fixed) note(L(`Inayos ang ${fixed} sirang data sa device`, `Fixed ${fixed} broken item(s) of data on the device`));
      return fixed;
    }
    function backup(k, v) { const b = store.get('cse-fix-backup', {}); (isObj(b) ? b : {})[k + '@' + Date.now()] = v; store.set('cse-fix-backup', b); }
    // Storage full: clear the copies of screen data (cse-c-…), which come back from the server.
    function checkSpace() {
      if (store.set('cse-fix-probe', 'x'.repeat(2048))) { store.del('cse-fix-probe'); return 0; }
      let n = 0;
      for (const k of lsKeys()) if (/^cse-c-\d+\//.test(k)) { store.del(k); n++; }
      store.del('cse-fix-probe');
      if (n) note(L('Puno ang storage: binura ang mga lumang kopya ng screen', 'Storage full: cleared old screen copies'));
      return n;
    }
    // Website: ask the service worker to check its files and download any missing one again.
    async function checkFiles() {
      if (IS_APP || !('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return 0;
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) {
          if (!navigator.onLine) return 0;
          await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
          note(L('Ibinalik ang offline na files ng app', 'Restored the app\'s offline files'));
          return 1;
        }
        const sw = reg.active;
        if (!sw) return 0;
        const r = await new Promise((resolve) => {
          const ch = new MessageChannel();
          const t = setTimeout(() => resolve(null), 8000);
          ch.port1.onmessage = (e) => { clearTimeout(t); resolve(e.data); };
          sw.postMessage({ type: 'repair' }, [ch.port2]);
        });
        if (r && r.fixed) note(L(`Na-download ulit ang ${r.fixed} nawawalang file ng app`, `Downloaded ${r.fixed} missing app file(s) again`));
        if (r && r.missing) note(L(`May ${r.missing} file na hindi pa ma-download (offline)`, `${r.missing} file(s) could not be downloaded yet (offline)`), false);
        return (r && r.fixed) || 0;
      } catch { return 0; }
    }
    // Things left on screen by a view that crashed half-way.
    function checkScreen() {
      let n = 0;
      if (!S.exam) {
        if (document.body.classList.contains('guard') || document.body.classList.contains('away')) { guardOff(); n++; }
        $$('.modal-bg').forEach((m) => { if (!m.querySelector('.modal, .tour-box') && !m.children.length) { m.remove(); n++; } });
      }
      if (S.user && S.meta && $('#app > .boot') && !S.exam) { route(); n++; }
      return n;
    }
    // Send everything waiting on this device again, and reconnect the live login line.
    async function resync() {
      if (!navigator.onLine || !S.user) return;
      if (!S.meta) return init();
      try { Live.sync(); await syncNow(); } catch { /* next time */ }
    }
    async function run(why = 'auto', loud = false) {
      if (running) return running;
      running = (async () => {
        lastRun = Date.now();
        let n = 0;
        try { n += checkSpace(); } catch { /* ignore */ }
        try { n += checkData(); } catch { /* ignore */ }
        try { n += await checkFiles(); } catch { /* ignore */ }
        try { n += checkScreen(); } catch { /* ignore */ }
        await resync();
        store.set('cse-fix-last', { t: Date.now(), n, why });
        if (loud) toast(n ? L(`Auto Fix: ${n} problema ang naayos.`, `Auto Fix: fixed ${n} problem(s).`) : L('Auto Fix: walang problema. Ayos ang app.', 'Auto Fix: no problems found. The app is fine.'));
        return n;
      })().finally(() => { running = null; });
      return running;
    }
    // Safe reset: new copies of the app's files and screen data. Login, settings, and results waiting to be saved stay.
    async function reset() {
      note(L('Ni-reset ang files ng app', 'Reset the app files'));
      for (const k of lsKeys()) if (/^cse-c-\d+\//.test(k) || k === 'cse-ota' || k === 'cse-ota-bad') store.del(k);
      if (!IS_APP && 'serviceWorker' in navigator && navigator.onLine) {
        try { for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); } catch { /* ignore */ }
        try { for (const k of await caches.keys()) if (k.startsWith('cse-reviewer-')) await caches.delete(k); } catch { /* ignore */ }
      }
      location.reload();
    }
    // Errors: ignore the expected ones (offline, server said no, other websites' scripts).
    function onError(err, where) {
      if (!err || err.offline || err.status) return;
      const msg = String((err && err.message) || err);
      if (/ResizeObserver|^Script error\.?$|AbortError|aborted/i.test(msg) || err.name === 'AbortError') return;
      note(`${where}: ${msg}`, false);
      const now = Date.now();
      recent = recent.filter((t) => now - t < 30e3); recent.push(now);
      if (recent.length >= 3 && now - lastRun > 60e3) { recent = []; run('errors'); }
    }
    window.addEventListener('error', (e) => { if (e.error || e.message) onError(e.error || { message: e.message }, 'error'); });
    window.addEventListener('unhandledrejection', (e) => onError(e.reason, 'promise'));
    window.addEventListener('online', () => setTimeout(() => run('online'), 2500));
    document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - lastRun > 3600e3) run('resume'); });
    const log = () => { const l = store.get(LOG, []); return Array.isArray(l) ? l : []; };
    return { run, reset, onError, log, last: () => store.get('cse-fix-last'), note, quick: () => { try { checkSpace(); checkData(); } catch { /* ignore */ } } };
  })();
  // A screen that failed to draw for an unexpected reason (not internet, not the server).
  let retried = '';
  function screenFailed(e) {
    AutoFix.onError(e, 'screen');
    const h = location.hash;
    if (retried !== h) { retried = h; AutoFix.run('screen').finally(() => { if (location.hash === h && !S.exam) route(); }); return; }
    retried = '';
    shell('', `<div class="card empty"><div style="font-size:40px">🛠️</div><p>${L('May problema sa screen na ito. Pindutin ang Ayusin para awtomatikong ayusin ang app. Hindi mabubura ang login at mga resulta mo.', 'This screen has a problem. Tap Fix to repair the app automatically. Your login and results stay.')}</p>
      <div class="row" style="justify-content:center"><button class="btn" id="fixGo">🛠️ ${L('Ayusin', 'Fix')}</button><a class="btn ghost" href="#/">${L('Bumalik sa Home', 'Back to Home')}</a></div></div>`);
    $('#fixGo').onclick = () => AutoFix.reset();
  }

  /* ---------------- router ---------------- */
  async function route() {
    stopTimer();
    guardOff();
    if (S.exam) { saveAnswers(true); S.exam = null; document.onkeydown = null; }
    document.querySelectorAll('.modal-bg').forEach((m) => m.remove());
    F.key = S.openFold || null; S.openFold = null; // a new screen starts with every drop down closed (or the one a link asked for)
    const parts = (location.hash.replace(/^#\/?/, '') || '').split('/');
    const [p0, p1] = parts;
    if (p0 !== 'admin' && $('#admTabs')) $('#admTabs').remove(); // admin tabs are reused only between admin tabs
    if (p0) Tour.stop(); // the guide runs on Home only
    applyLook();
    if (!S.user) { if (p0 === 'register') return viewAuth('register'); if (p0 === 'forgot') return viewForgot(); if (p0 === 'otp') return viewOtp(); return viewAuth('login'); }
    if (S.config.verify && !S.user.email_verified) return viewVerify();
    S.locked = false;
    if (S.offline && !canOffline() && !(p0 === 'exam' && isLocal(p1))) return viewOfflineLocked();
    try {
      if (p0 === 'sets') return await viewSets(p1);
      if (p0 === 'premium') return await viewPremium();
      if (p0 === 'login' || p0 === 'register' || p0 === 'otp' || p0 === 'forgot' || !p0) return await viewHome();
      if (p0 === 'practice') return viewPractice();
      if (p0 === 'exam') return await viewExam(p1);
      if (p0 === 'result') return await viewResult(p1);
      if (p0 === 'history') return await viewHistory();
      if (p0 === 'account') return viewAccount();
      if (p0 === 'help') return viewHelp();
      if (p0 === 'review') return await viewReview();
      if (p0 === 'admin') return await viewAdmin(p1 || 'overview');
      return go('#/');
    } catch (e) {
      if (e.status === 401) { S.user = null; return viewAuth('login'); }
      if (e.code === 'unverified') { S.user.email_verified = false; return viewVerify(); }
      const home = `<a class="btn" href="#/">${L('Bumalik sa Home', 'Back to Home')}</a>`;
      if (!e.status && !e.offline && !e.code) return screenFailed(e);
      if (e.offline) return shell('', `<div class="card empty"><div style="font-size:40px">📡</div><p>${L('Kailangan ng internet para sa bahaging ito. Pwede ka pa ring mag-practice o sumagot ng na-download na exam set.', 'This part needs internet. You can still practice or answer a downloaded exam set.')}</p>${home}</div>`);
      shell('', `<div class="card empty"><p>${esc(e.message)}</p>${home}</div>`);
    }
  }
  // Free plan (or Premium that needs a refresh) without internet.
  function viewOfflineLocked() {
    S.locked = true;
    const expired = S.premium && store.get(uk('cse-pack'));
    shell(null, `<div class="card empty" style="text-align:center"><div style="font-size:44px">📡</div><h2 style="margin:6px 0">${L('Walang internet', 'No internet')}</h2>
      <p class="muted">${expired ? L('Kailangang kumonekta sa internet para ma-update ang Premium at mga tanong mo (kahit isang beses bawat 30 araw).', 'Connect to the internet to update your Premium and questions (at least once every 30 days).')
        : L('Kailangan ng internet sa libreng plan. Sa <b>Premium</b>, gumagana ang app kahit offline: lahat ng practice, mock exam, at exam set, nang walang hinihintay.', 'The free plan needs internet. With <b>Premium</b>, the app works even offline: all practice, mock exams, and exam sets, with no waiting.')}</p>
      <button class="btn" id="retry">${L('Subukan ulit', 'Try again')}</button></div>`);
    $('#retry').onclick = async () => { try { await refreshMe(); route(); } catch { toast(L('Wala pa ring internet.', 'Still no internet.')); } };
  }
  window.addEventListener('hashchange', route);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveAnswers(); });
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window._installPrompt = e; });

  function applyMe(me) { S.user = me.user; S.config = me.config; S.premium = me.premium; S.practiceToday = me.practice_today || 0; S.mockToday = me.mock_today || 0; S.countDay = phDay(); Live.sync(); document.documentElement.classList.toggle('premium', !!S.premium); }
  async function refreshMe() {
    const me = await api('GET', '/api/me');
    if (!me.user && me.ended === 'replaced') { S.authNote = ELSEWHERE(); S.exam = null; stopTimer(); }
    applyMe(me);
    if (me.user) { store.set('cse-boot', me); OffAuth.touch(me); syncSoon(); Prefs.pull().catch(() => {}); Reminders.sync(); } else { store.del('cse-boot'); if (IS_APP) store.del('cse-token'); }
  }
  const stateKey = () => JSON.stringify([S.user && S.user.id, S.user && S.user.email_verified, S.premium, S.config && S.config.premium_required]);
  async function init() {
    // Open instantly with the account saved on this device, then check with the server in the background.
    const boot = store.get('cse-boot'), meta = store.get('cse-meta');
    let shown = false;
    const off = boot && boot.user && store.get('cse-offauth');
    if (off && off.email === String(boot.user.email).toLowerCase()) S.offAuth = off; // logged in offline before the app was closed
    if (boot && boot.user && meta && !S.meta) {
      applyMe(boot); S.meta = meta;
      if (!navigator.onLine) setOffline(true);
      route(); shown = true;
    }
    const before = stateKey();
    try {
      const [, m] = await Promise.all([S.offAuth ? OffAuth.resume() : refreshMe(), api('GET', '/api/meta')]);
      S.meta = m; store.set('cse-meta', m);
      if (!shown || (stateKey() !== before && !S.exam)) route();
    } catch (e) {
      if (shown) { if (S.offline && !canOffline() && !S.exam) route(); return; }
      // No internet and nobody logged in: Premium can still log in on this device (see OffAuth).
      if (e.offline && meta && OffAuth.any()) { S.meta = meta; S.config = S.config || {}; setOffline(true); route(); return; }
      $app.innerHTML = e.offline
        ? `<main class="wrap"><div class="card empty" style="margin-top:18vh;text-align:center"><div style="font-size:44px">📡</div><h2 style="margin:6px 0">${L('Walang internet', 'No internet')}</h2><p class="muted">${L('Kumonekta sa internet para mag-login. Sa Premium, gumagana na ang app kahit offline pagkatapos noon.', 'Connect to the internet to log in. With Premium, the app then works even offline.')}</p><button class="btn" onclick="location.reload()">${L('Subukan ulit', 'Try again')}</button></div></main>`
        : `<div class="boot">${L('Hindi makakonekta sa server. I-refresh ang page.', 'Cannot connect to the server. Please refresh the page.')}</div>`;
      return;
    }
    if (!S.offline) { syncNow(); setTimeout(() => prefetch(['sets']), 1200); }
  }
  window.CSE_ALIVE = true; // the boot guard in index.html: the app's files started
  AutoFix.quick(); // broken saved data is fixed before the app reads it
  init();
  setTimeout(() => { try { sessionStorage.removeItem('cse-fix-boot'); } catch { /* ignore */ } AutoFix.run('start'); }, 6000);

  /* ---------------- automatic updates ----------------
     New screens download in the background. They are switched in only at a safe moment: when the app
     opens, or when it is in the background and the user is not in the middle of anything
     (no exam or practice, no open window, nothing typed). */
  const busy = () => !!S.exam || !!document.querySelector('.modal-bg')
    || $$('input, textarea').some((el) => (el.type === 'checkbox' || el.type === 'radio' ? el.checked !== el.defaultChecked : el.value !== el.defaultValue));
  const markUpdated = () => store.set('cse-updated', 1);
  if (store.get('cse-updated')) { store.del('cse-updated'); setTimeout(() => toast(L('Na-update ang app sa bagong bersyon.', 'The app was updated to a new version.')), 600); }

  // Website (and the app installed from the website): the service worker keeps the files on the device.
  if (!IS_APP && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', async () => {
      let reg;
      try { reg = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }); } catch { return; }
      let controlled = !!navigator.serviceWorker.controller, reloadWhenSafe = false;
      const applyWhenSafe = () => {
        if (!document.hidden || busy()) return;
        if (reloadWhenSafe) { markUpdated(); location.reload(); return; }
        if (reg.waiting && navigator.serviceWorker.controller) reg.waiting.postMessage('skip-waiting');
      };
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!controlled) { controlled = true; return; } // first visit: nothing to refresh
        reloadWhenSafe = true; applyWhenSafe();
      });
      document.addEventListener('visibilitychange', () => { if (document.hidden) applyWhenSafe(); else reg.update().catch(() => {}); });
      setInterval(() => reg.update().catch(() => {}), 60 * 60e3);
    });
  }

  // Android/iPhone app: new screens come from the server as a zip (Capacitor Updater plugin, no cloud service).
  // If a new version fails to start, the plugin goes back to the previous one by itself.
  const cap = window.Capacitor;
  const Updater = IS_APP && cap && cap.isNativePlatform && cap.isNativePlatform() && cap.isPluginAvailable && cap.isPluginAvailable('CapacitorUpdater')
    ? (cap.Plugins.CapacitorUpdater || cap.registerPlugin('CapacitorUpdater')) : null;
  if (Updater) {
    Updater.notifyAppReady().catch(() => {});
    const BUILD = window.CSE_BUILD || '';
    let pending = store.get('cse-ota'), lastCheck = 0;
    if (pending && pending.version === BUILD) { store.del('cse-ota'); pending = null; } // already switched
    else if (pending && pending.tried) { store.set('cse-ota-bad', pending.version); store.del('cse-ota'); pending = null; } // did not start: stay on this one
    const applyWhenSafe = () => {
      if (!pending || busy()) return;
      store.set('cse-ota', { ...pending, tried: true }); markUpdated();
      Updater.set({ id: pending.id }).catch(() => { store.set('cse-ota', pending); store.del('cse-updated'); });
    };
    const check = async () => {
      if (pending || !navigator.onLine || Date.now() - lastCheck < 30 * 60e3) return;
      lastCheck = Date.now();
      try {
        const res = await fetch(API + '/api/app/update', { cache: 'no-store' });
        const u = res.ok && await res.json();
        if (!u || !u.version || u.version === BUILD || u.version === store.get('cse-ota-bad')) return;
        const b = await Updater.download({ url: API + u.url, version: u.version });
        pending = { id: b.id, version: u.version };
        store.set('cse-ota', pending);
      } catch { /* try again later */ }
    };
    applyWhenSafe(); // app just opened: switch now if a new version is ready
    setTimeout(check, 5000);
    document.addEventListener('visibilitychange', () => { if (document.hidden) applyWhenSafe(); else check(); });
    document.addEventListener('pause', applyWhenSafe);
  }
})();
