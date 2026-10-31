/* CSE Reviewer front end (no build step). */
(() => {
  'use strict';
  const $app = document.getElementById('app');
  const LETTERS = ['A', 'B', 'C', 'D'];
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

  async function api(method, url, body) {
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
      const e = new Error('Walang internet. Kailangan ng internet para dito.'); e.offline = true; throw e;
    }
    setOffline(false);
    let data = null;
    try { data = await res.json(); } catch { /* empty */ }
    if (data && data.token) store.set('cse-token', data.token);
    if (!res.ok) { const e = new Error((data && data.error) || 'May problema sa koneksyon.'); e.status = res.status; e.code = data && data.code; throw e; }
    return data;
  }
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
    else if (!S.offline) shell(null, '<div class="empty">Naglo-load…</div>');
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

  /* Offline: a small banner on top. Practice and downloaded exam sets keep working. */
  function setOffline(on) {
    if (!!S.offline === on) return;
    S.offline = on;
    let el = document.getElementById('offline');
    if (!on) { if (el) el.remove(); syncSoon(); if (S.locked) route(); return; }
    if (el) return;
    el = document.createElement('div');
    el.id = 'offline';
    el.className = 'offline-bar';
    el.innerHTML = canOffline() ? '📡 <b>Offline ka.</b> Gumagana pa rin ang lahat ng practice at mock exam. Ise-save online ang mga resulta mo kapag may internet na.'
      : '📡 <b>Walang internet.</b> Para sa Premium lang ang offline na paggamit.';
    document.body.prepend(el);
    if (S.user && S.meta && !canOffline() && !S.exam) setTimeout(route);
  }
  window.addEventListener('offline', () => setOffline(true));
  window.addEventListener('online', () => { syncSoon(); if (!S.meta) init(); });

  /* Exams taken offline are kept on the device until they are saved online. */
  const local = {
    all: () => store.get(uk('cse-local'), []),
    get: (id) => local.all().find((a) => a.id === id),
    save(a) { const list = local.all().filter((x) => x.id !== a.id); list.push(a); if (!store.set(uk('cse-local'), list)) toast('Puno na ang storage ng device.'); },
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
    if (syncing || !S.user || (S.config.verify && !S.user.email_verified)) return syncing;
    syncing = (async () => {
      let n = 0;
      for (const p of store.get(uk('cse-psub'), [])) {
        try {
          await api('POST', `/api/attempts/${p.id}/submit`, { answers: p.answers });
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
      if (n) toast(`Na-save na online ang ${n} exam na ginawa mo habang offline.`);
      await refreshPack();
    })().finally(() => { syncing = null; });
    return syncing;
  }

  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600);
  }
  const fmtTime = (sec) => {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
  };
  const fmtDur = (min) => (min >= 60 ? `${Math.floor(min / 60)} oras${min % 60 ? ' ' + (min % 60) + ' minuto' : ''}` : `${min} minuto`);
  const fmtDate = (ms) => new Date(ms).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
  const subjName = (k) => (S.meta?.subjects[k]?.name) || k;
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

  function modal(html, onMount) {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    const close = () => bg.remove();
    bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
    document.body.appendChild(bg);
    onMount && onMount(bg, close);
    return close;
  }
  function confirmBox(title, body, okText = 'Oo', danger = false) {
    return new Promise((resolve) => {
      modal(`<h2 style="margin-top:0">${esc(title)}</h2><p class="muted">${body}</p>
        <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn ghost" data-x>Bumalik</button><button class="btn ${danger ? 'danger' : ''}" data-ok>${esc(okText)}</button></div>`,
      (bg, close) => {
        $('[data-x]', bg).onclick = () => { close(); resolve(false); };
        $('[data-ok]', bg).onclick = () => { close(); resolve(true); };
      });
    });
  }

  /* ---------------- shell ---------------- */
  function shell(active, body) {
    const isAdmin = S.user && S.user.role === 'admin';
    const links = [['home', '#/', 'Home', '🏠'], ['practice', '#/practice', 'Practice', '📝'], ['history', '#/history', 'Resulta', '📊'], ...(isAdmin ? [['admin', '#/admin', 'Admin', '🛠️']] : []), ['account', '#/account', 'Account', '👤']];
    $app.innerHTML = `
      <header class="topbar">
        <a class="brand" href="#/"><img src="icons/icon.svg" alt="">CSE Reviewer</a>
        <span class="spacer"></span>
        <nav class="nav-desktop row" style="gap:2px">${links.map(([k, h, l]) => `<a class="link ${active === k ? 'active' : ''}" href="${h}">${l}</a>`).join('')}</nav>
      </header>
      <main class="wrap">${body}</main>
      <nav class="bottomnav">${links.map(([k, h, l, ic]) => `<a class="${active === k ? 'active' : ''}" href="${h}"><span class="ic">${ic}</span>${l}</a>`).join('')}</nav>`;
    if (!S.keepScroll) window.scrollTo(0, 0);
  }

  /* ---------------- auth screens ---------------- */
  function viewAuth(mode) {
    const reg = mode === 'register';
    $app.innerHTML = `
      <main class="wrap">
        <div class="hero">
          <img class="logo" src="icons/icon.svg" alt="">
          <h1>CSE Reviewer</h1>
          <p class="muted">Mag-review para sa Civil Service Exam gamit ang mock exam na kahawig ng totoong exam: parehong format, dami ng tanong, oras, at 4 na pagpipilian.</p>
        </div>
        <div class="card auth">
          <div class="tabs" style="margin-top:0">
            <button class="${reg ? '' : 'active'}" data-go="#/login">Mag-login</button>
            <button class="${reg ? 'active' : ''}" data-go="#/register">Gumawa ng account</button>
          </div>
          <form id="authForm" novalidate>
            ${reg ? '<label for="name">Pangalan</label><input id="name" type="text" autocomplete="name" required placeholder="Juan Dela Cruz">' : ''}
            <label for="email">Email</label>
            <input id="email" type="email" autocomplete="email" required placeholder="ikaw@email.com">
            <label for="pw">Password</label>
            <input id="pw" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}" required placeholder="${reg ? 'Hindi bababa sa 8 characters' : ''}">
            <div class="err" id="err"></div>
            <button class="btn block" type="submit" style="margin-top:8px">${reg ? 'Gumawa ng account' : 'Mag-login'}</button>
          </form>
          ${reg ? '<p class="muted small" style="margin-bottom:0">Gumamit ng aktibong email. Padadalhan ka namin ng code para ma-verify ito, at doon din ipapadala ang mga resulta at resibo.</p>' : '<p style="text-align:center;margin:14px 0 0"><a href="#/forgot">Nakalimutan ang password?</a></p>'}
        </div>
        <div class="features auth" style="max-width:880px">
          <div class="feature"><b>Professional at Subprofessional</b>170 at 165 na tanong, may timer na 3h10m at 2h40m.</div>
          <div class="feature"><b>Practice kada subject</b>Verbal, Numerical, Analytical, Clerical at General Info, may paliwanag sa bawat sagot.</div>
          <div class="feature"><b>Mga exam set</b>Pumili mula sa pinakabago hanggang pinakalumang set, o bagong halo ng tanong.</div>
          <div class="feature"><b>Gamitin sa phone</b>I-install sa home screen para parang app.</div>
        </div>
      </main>`;
    $$('[data-go]').forEach((b) => (b.onclick = () => go(b.dataset.go)));
    $('#authForm').onsubmit = async (e) => {
      e.preventDefault();
      const btn = $('button[type=submit]', e.target);
      btn.disabled = true; $('#err').textContent = '';
      try {
        const body = { email: $('#email').value, password: $('#pw').value };
        if (reg) body.name = $('#name').value;
        const r = await api('POST', reg ? '/api/auth/register' : '/api/auth/login', body);
        await refreshMe();
        toast(reg ? `Maligayang pagdating, ${r.user.name}!` : 'Naka-login ka na.');
        go('#/');
      } catch (err) { $('#err').textContent = err.message; btn.disabled = false; }
    };
  }

  function viewVerify() {
    $app.innerHTML = `<main class="wrap"><div class="hero"><img class="logo" src="icons/icon.svg" alt=""><h1>I-verify ang iyong email</h1>
      <p class="muted">Nagpadala kami ng 6-digit na code sa <b>${esc(S.user.email)}</b>. Tingnan din ang Spam o Promotions folder.</p></div>
      <div class="card auth"><form id="vf"><label for="code">Code</label>
        <input id="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456" style="font-size:24px;letter-spacing:6px;text-align:center">
        <div class="err" id="err"></div><button class="btn block" type="submit">I-verify</button></form>
        <div class="row between" style="margin-top:14px"><button class="btn ghost small" id="resend">Ipadala ulit ang code</button><button class="btn ghost small" id="out">Mag-logout</button></div>
      </div></main>`;
    $('#vf').onsubmit = async (e) => {
      e.preventDefault();
      try { await api('POST', '/api/auth/verify', { code: $('#code').value }); await refreshMe(); toast('Na-verify na ang email mo!'); go('#/'); } catch (err) { $('#err').textContent = err.message; }
    };
    $('#resend').onclick = async () => { try { await api('POST', '/api/auth/resend'); toast('Naipadala ang bagong code.'); } catch (err) { $('#err').textContent = err.message; } };
    $('#out').onclick = async () => { await api('POST', '/api/auth/logout'); S.user = null; go('#/login'); };
  }

  function viewForgot() {
    let email = '';
    $app.innerHTML = `<main class="wrap"><div class="hero"><img class="logo" src="icons/icon.svg" alt=""><h1>Nakalimutan ang password</h1>
      <p class="muted">Magpapadala kami ng code sa email mo para makagawa ka ng bagong password.</p></div>
      <div class="card auth" id="fbox"><form id="ff"><label for="email">Email</label><input id="email" type="email" autocomplete="email">
        <div class="err" id="err"></div><button class="btn block" type="submit">Ipadala ang code</button></form>
        <p style="text-align:center;margin:14px 0 0"><a href="#/login">Bumalik sa login</a></p></div></main>`;
    $('#ff').onsubmit = async (e) => {
      e.preventDefault();
      email = $('#email').value.trim();
      try {
        await api('POST', '/api/auth/forgot', { email });
        $('#fbox').innerHTML = `<p class="small">Kung may account ang <b>${esc(email)}</b>, may code nang dumating doon.</p>
          <form id="rf"><label>Code</label><input id="code" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code">
          <label>Bagong password</label><input id="npw" type="password" autocomplete="new-password" placeholder="8 characters o higit pa">
          <div class="err" id="err"></div><button class="btn block" type="submit">I-save ang bagong password</button></form>`;
        $('#rf').onsubmit = async (ev) => {
          ev.preventDefault();
          try { await api('POST', '/api/auth/reset', { email, code: $('#code').value, password: $('#npw').value }); toast('Napalitan na ang password. Mag-login na.'); go('#/login'); } catch (err) { $('#err').textContent = err.message; }
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
      shell('home', `
      <p class="small" style="margin:0"><a href="#/">‹ Home</a></p>
      <h1>${esc(e.title.replace(' Mock Exam', ''))}</h1>
      <p class="muted" style="margin-top:0">${e.items} tanong · ${fmtDur(e.minutes)} · Passing ${e.passing}%. Pumili ng exam set, mula pinakabago hanggang pinakaluma.</p>
      ${free ? `<div class="notice" style="margin:12px 0">🔓 Libre ang <b>Set ${S.config.free.sets > 1 ? '1 hanggang ' + S.config.free.sets : '1'}</b> para masubukan mo. Para sa lahat ng set, Bagong halo, at offline na paggamit, <a href="#/premium">kumuha ng Premium →</a></div>` : ''}
      ${S.offline && !local ? '<div class="notice" style="margin-bottom:12px">Walang internet. Para sa Premium lang ang offline na paggamit.</div>' : `
      <div class="card" style="margin-bottom:12px"><div class="row between"><div><h3>Bagong halo ng tanong</h3><p class="muted small" style="margin:0">Bagong random na ${e.items} tanong.</p></div>
        <button class="btn secondary" data-random>${free ? '🔒 ' : ''}Simulan</button></div></div>`}
      <div class="list">${sets.map((x, i) => `
        <div class="list-item">
          <div class="grow"><div class="row" style="gap:6px"><b>Set ${x.number}</b>${i === 0 ? '<span class="pill ok">Pinakabago</span>' : ''}${free && !x.locked ? '<span class="pill">Libre</span>' : ''}</div>
          <div class="muted small">Inilabas ${new Date(x.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}${x.taken ? ` · Nasubukan ${x.taken}x · Best ${x.best}%` : ''}${local && saved.some((y) => y.id === x.id) ? ' · ⚡ Naka-save sa device' : ''}</div></div>
          <button class="btn small ${x.locked ? 'secondary' : ''}" data-set="${x.id}" data-locked="${x.locked ? 1 : ''}">${x.locked ? '🔒 Premium' : x.taken ? 'Ulitin' : 'Simulan'}</button>
        </div>`).join('') || '<div class="card empty">Wala pang exam set.</div>'}</div>`);
      if ($('[data-random]')) $('[data-random]').onclick = () => (free ? go('#/premium') : startExam(mode));
      $$('[data-set]').forEach((b) => (b.onclick = () => (b.dataset.locked ? go('#/premium') : startExam(mode, { set_id: +b.dataset.set }))));
    };
    await swr('/api/sets?mode=' + mode, paint, () => null);
  }

  async function viewPremium() {
    shell('account', '<div class="empty">Naglo-load…</div>');
    const p = await api('GET', '/api/premium');
    const until = p.until > Date.now() ? new Date(p.until).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    const pending = p.payments.find((x) => x.status === 'pending');
    const openPay = p.payments.find((x) => x.status === 'checkout' && x.checkout_url);
    const manual = !p.online || !!p.pay_number; // manual GCash shows when there is no online payment, or the admin set a number
    const statusPill = { pending: '<span class="pill warn">Hinihintay</span>', checkout: '<span class="pill warn">Hindi pa bayad</span>', approved: '<span class="pill ok">Bayad na</span>', rejected: '<span class="pill bad">Hindi approved</span>', expired: '<span class="pill">Expired</span>' };
    if (S.user.role !== 'admin' && p.active && p.until !== S.user.premium_until) refreshMe().catch(() => {}); // Premium just started or was extended
    shell('account', `
      <h1>Premium</h1>
      <div class="card">
        ${S.user.role === 'admin' ? '<p class="muted" style="margin:0">Admin ka, kaya bukas sa iyo ang lahat ng mock exam.</p>'
          : p.active && until ? `<h3 style="color:var(--ok)">✅ Aktibo ang Premium mo</h3><p class="muted" style="margin:0">Hanggang <b>${esc(until)}</b>. Pwede mo itong i-extend anumang oras.</p>`
          : !p.required ? '<p class="muted" style="margin:0">Libre pa ang lahat ng mock exam sa ngayon.</p>'
          : `<h3>🔒 Wala ka pang Premium</h3>
            <table class="small" style="width:100%;margin-top:8px"><tr><th></th><th>Libre</th><th>Premium</th></tr>
            <tr><td>Practice kada subject</td><td>${S.config.free.practice_daily}x kada araw, hanggang ${S.config.free.practice_items} tanong</td><td>Walang limit</td></tr>
            <tr><td>Mock exam (Pro at Subpro)</td><td>Set 1 lang</td><td>Lahat ng set + Bagong halo</td></tr>
            <tr><td>Offline (walang internet)</td><td>Hindi</td><td>Oo, buong app</td></tr>
            <tr><td>Bilis</td><td>Hinihintay ang server</td><td>Agad-agad (naka-save sa device)</td></tr></table>`}
      </div>
      ${S.user.role === 'admin' ? '' : `<div class="card" style="margin-top:12px">
        <h3>${p.active && until ? 'I-extend ang Premium' : 'Kumuha ng Premium'}</h3>
        <p style="margin:6px 0"><span class="pill warn" style="font-size:15px">₱${esc(p.price)} para sa ${p.plan_days} araw</span></p>
        ${p.online ? `
        <p class="small" style="margin:8px 0">Magbayad online gamit ang <b>GCash, Maya, card, GrabPay, o QR Ph</b> (para sa bank apps) at iba pa. Awtomatikong bubukas ang Premium pagkatapos magbayad.</p>
        ${openPay ? `<div class="notice" style="margin-bottom:10px">May bukas kang bayaran. Kung nakapagbayad ka na, pindutin ang <b>I-check ang bayad</b>.</div>` : ''}
        <div class="err" id="perr"></div>
        <button class="btn block" id="paynow">💳 ${openPay ? 'Ituloy ang pagbayad' : 'Magbayad online'}</button>
        ${openPay ? '<button class="btn block secondary" id="paycheck" style="margin-top:8px">I-check ang bayad</button>' : ''}` : ''}
        ${manual ? `${p.online ? '<h3 style="margin-top:18px">O magpadala nang manual</h3>' : ''}
        <ol class="small" style="padding-left:18px">
          <li>Magpadala ng <b>₱${esc(p.price)}</b> sa ${esc(p.method)}${p.pay_number ? `: <b>${esc(p.pay_number)}</b>` : ''}${p.pay_name ? ` (${esc(p.pay_name)})` : ''}.</li>
          <li>Kopyahin ang <b>reference number</b> mula sa resibo.</li>
          <li>Ilagay ito sa ibaba. Makakatanggap ka ng email kapag na-approve na.</li>
        </ol>
        ${p.note ? `<p class="muted small">${esc(p.note)}</p>` : ''}
        ${pending ? `<div class="notice">Hinihintay pang ma-check ang bayad mo (ref: <b>${esc(pending.reference)}</b>).</div>` : `
        <form id="payf"><label>Reference number</label><input type="text" id="ref" placeholder="hal. 1012 345 678901" autocomplete="off">
          <div class="err" id="err"></div><button class="btn block ${p.online ? 'secondary' : ''}" type="submit">Ipadala</button></form>`}` : ''}
      </div>`}
      ${p.payments.length ? `<h2>Mga bayad mo</h2><div class="list">${p.payments.map((x) => `<div class="list-item"><div class="grow"><b>₱${esc(x.amount)}</b> · ${esc(x.method)}${x.provider && x.provider !== 'manual' ? '' : ' · ref ' + esc(x.reference)}
        <div class="muted small">${fmtDate(x.created_at)}${x.note ? ' · ' + esc(x.note) : ''}</div></div>${statusPill[x.status] || ''}</div>`).join('')}</div>` : ''}`);
    // PayMongo's checkout page. In the phone and desktop apps it opens in the browser.
    if ($('#paynow')) $('#paynow').onclick = async (e) => {
      e.target.disabled = true;
      try { const r = await api('POST', '/api/payments/checkout', {}); location.href = r.url; } catch (err) { $('#perr').textContent = err.message; e.target.disabled = false; }
    };
    if ($('#paycheck')) $('#paycheck').onclick = () => viewPremium();
    const f = $('#payf');
    if (f) f.onsubmit = async (e) => {
      e.preventDefault();
      try { await api('POST', '/api/payments', { reference: $('#ref').value }); toast('Naipadala! Hintayin ang email ng confirmation.'); viewPremium(); } catch (err) { $('#err').textContent = err.message; }
    };
  }

  /* ---------------- home ---------------- */
  async function viewHome() {
    await swr(['/api/attempts', '/api/stats'], ([l0, s0]) => paintHome(l0, s0), (i) => (i ? null : []));
  }
  function paintHome(l0, s0) {
    const { list, stats } = withLocal(l0, s0);
    const open = list.filter((a) => !a.finished_at);
    const done = list.filter((a) => a.finished_at);
    const mocks = stats.mocks;
    const best = mocks.length ? Math.max(...mocks.map((m) => m.pct)) : null;
    const ex = S.meta.exams;
    const examCard = (e, desc) => `
      <div class="card exam-card">
        <div class="row between"><h3>${esc(e.title.replace(' Mock Exam', ''))}</h3><span class="pill">Mock Exam</span></div>
        <div class="meta"><span class="pill warn">${e.items} items</span><span class="pill warn">${fmtDur(e.minutes)}</span><span class="pill warn">Passing ${e.passing}%</span></div>
        <p class="muted small" style="margin:4px 0 8px">${desc}</p>
        <p class="small" style="margin:0 0 10px">${e.sections.map((s) => `${esc(subjName(s.subject))} (${s.count})`).join(' · ')}</p>
        <a class="btn" href="#/sets/${e.key}">Pumili ng exam set</a>
      </div>`;
    shell('home', `
      <h1>Kumusta, ${esc(S.user.name.split(' ')[0])}! 👋</h1>
      ${isFree() ? `<a class="notice" href="#/premium" style="display:block;margin:8px 0">🆓 <b>Libreng plan:</b> ${S.config.free.practice_daily} practice kada araw (hanggang ${S.config.free.practice_items} tanong), at Set 1 ng bawat mock exam. Kailangan ng internet.<br>⭐ <b>Premium:</b> walang limit, lahat ng exam set, gumagana offline, at mas mabilis. Kumuha ng Premium →</a>` : ''}
      <p class="muted" style="margin-top:0">Pumili ng mock exam o mag-practice kada subject.</p>
      ${open.length ? `<div class="notice" style="margin:12px 0">May hindi ka pa natatapos na exam: <b>${esc(open[0].title)}</b>. <a href="#/exam/${open[0].id}">Ituloy ito →</a></div>` : ''}
      ${list.some((a) => a.pending && a.finished_at) ? '<p class="muted small">⏳ May mga resulta kang ginawa offline. Ise-save ang mga ito online kapag may internet na.</p>' : ''}
      <div class="grid two" style="margin-top:12px">
        ${examCard(ex.pro, 'Para sa second-level positions sa gobyerno (hal. Admin Officer, Analyst).')}
        ${examCard(ex.subpro, 'Para sa first-level positions (hal. clerk, aide, technician).')}
      </div>
      <div class="card" style="margin-top:12px">
        <div class="row between"><div><h3>Practice kada subject</h3><p class="muted small" style="margin:0">Pumili ng subject at ilang tanong. Makikita agad kung tama ka, may paliwanag pa.</p></div>
        <a class="btn secondary" href="#/practice">Mag-practice</a></div>
      </div>
      <h2>Ang progress mo</h2>
      <div class="grid stats">
        <div class="card stat"><div class="v">${stats.attempts}</div><div class="l">Natapos na exam/practice</div></div>
        <div class="card stat"><div class="v">${mocks.length}</div><div class="l">Mock exam na natapos</div></div>
        <div class="card stat"><div class="v">${best === null ? '–' : best + '%'}</div><div class="l">Pinakamataas na mock score</div></div>
        <div class="card stat"><div class="v">${mocks.filter((m) => m.pct >= 80).length}</div><div class="l">Pasado (80% pataas)</div></div>
      </div>
      ${Object.keys(stats.subjects).length ? `<div class="card" style="margin-top:12px"><h3>Score kada subject</h3>${subjectBars(stats.subjects)}</div>` : ''}
      <h2>Mga huling exam</h2>
      ${done.length ? `<div class="list">${done.slice(0, 5).map(attemptRow).join('')}</div><p><a href="#/history">Tingnan lahat →</a></p>` : '<div class="card empty">Wala ka pang natatapos na exam. Subukan ang isang mock exam!</div>'}
    `);
  }

  function subjectBars(subj) {
    return Object.entries(subj).map(([k, v]) => {
      const p = pct(v.correct, v.total);
      return `<div style="margin:10px 0"><div class="row between small"><span>${esc(subjName(k))}</span><b>${p}% <span class="muted">(${v.correct}/${v.total})</span></b></div>
        <div class="bar ${p >= 80 ? 'ok' : p < 60 ? 'bad' : ''}"><i style="width:${p}%"></i></div></div>`;
    }).join('');
  }
  function attemptRow(a) {
    const p = pct(a.score, a.total);
    const pass = p >= (a.passing || 80);
    return `<a class="list-item" href="#/result/${a.id}">
      <div class="grow"><div class="ellipsis"><b>${esc(a.title)}</b></div><div class="muted small">${fmtDate(a.finished_at || a.started_at)}${a.pending ? ' · ⏳ Offline' : ''}</div></div>
      ${a.finished_at ? `<span class="pill ${a.mode === 'practice' ? '' : pass ? 'ok' : 'bad'}">${p}%</span>` : '<span class="pill warn">Hindi tapos</span>'}
    </a>`;
  }

  async function startExam(mode, opts = {}) {
    if (mode !== 'practice') {
      const e = S.meta.exams[mode];
      const ok = await confirmBox(`Simulan ang ${e.title}?`, `Mayroon itong <b>${e.items} tanong</b> at <b>${fmtDur(e.minutes)}</b> na oras, tulad ng totoong CSE. Tuloy-tuloy ang timer kahit isara mo ang app, pero naka-save ang mga sagot mo. Kailangan ng ${e.passing}% para pumasa.`, 'Simulan na');
      if (!ok) return;
    }
    // Premium: the exam is made on the device, so it starts instantly (online or offline).
    if (canOffline() && startLocal(mode, opts)) return;
    if (S.offline || !navigator.onLine) return toast('Walang internet. Para sa Premium lang ang offline na paggamit.');
    try {
      const a = await api('POST', '/api/attempts', { mode, ...opts });
      if (mode === 'practice') S.practiceToday = (S.practiceToday || 0) + 1;
      go('#/exam/' + a.id);
    } catch (e) {
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
    if (mode === 'practice') {
      const pool = p.practice[opts.subject] || [];
      if (!pool.length) return false;
      items = shuffle(pool).slice(0, Math.min(opts.count || 20, pool.length));
      const topics = shuffle([...new Set(items.map((x) => x.topic))]);
      items.sort((a, b) => topics.indexOf(a.topic) - topics.indexOf(b.topic));
      title = `Practice: ${subjName(opts.subject)} (${items.length} items)`;
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

  /* ---------------- practice setup ---------------- */
  function viewPractice() {
    const st = { subject: 'verbal', count: 20, minutes: 0, level: 'pro' };
    const subs = S.meta.subjects;
    shell('practice', `
      <h1>Practice kada subject</h1>
      <p class="muted" style="margin-top:0">Makikita agad kung tama o mali ang sagot mo, kasama ang paliwanag.</p>
      ${isFree() ? `<a class="notice" href="#/premium" style="display:block;margin-bottom:12px">🆓 Libreng plan: <b>${Math.max(0, S.config.free.practice_daily - (S.practiceToday || 0))} sa ${S.config.free.practice_daily}</b> practice na lang ang natitira ngayong araw, hanggang ${S.config.free.practice_items} tanong bawat isa. Walang limit sa Premium →</a>` : ''}
      <div class="card">
        <h3>1. Pumili ng subject</h3>
        <div class="subject-grid" id="subs">${Object.entries(subs).map(([k, v]) => `<button class="subject-btn" data-s="${k}"><b>${esc(v.name)}</b><span>${esc(v.desc)}</span></button>`).join('')}</div>
        <h3 style="margin-top:18px">2. Ilang tanong?</h3>
        <div class="seg" id="cnt">${[10, 20, 30, 50].map((n) => `<button data-n="${n}" ${isFree() && n > S.config.free.practice_items ? 'disabled title="Premium"' : ''}>${isFree() && n > S.config.free.practice_items ? '🔒 ' : ''}${n}</button>`).join('')}</div>
        <h3 style="margin-top:18px">3. May timer?</h3>
        <div class="seg" id="tm">${[[0, 'Wala'], [10, '10 min'], [20, '20 min'], [30, '30 min']].map(([n, l]) => `<button data-m="${n}">${l}</button>`).join('')}</div>
        <button class="btn block" id="go" style="margin-top:20px">Simulan ang practice</button>
      </div>`);
    const paint = () => {
      $$('#subs [data-s]').forEach((b) => b.classList.toggle('active', b.dataset.s === st.subject));
      $$('#cnt [data-n]').forEach((b) => b.classList.toggle('active', +b.dataset.n === st.count));
      $$('#tm [data-m]').forEach((b) => b.classList.toggle('active', +b.dataset.m === st.minutes));
    };
    $$('#subs [data-s]').forEach((b) => (b.onclick = () => { st.subject = b.dataset.s; paint(); }));
    $$('#cnt [data-n]').forEach((b) => (b.onclick = () => { if (!b.disabled) { st.count = +b.dataset.n; paint(); } }));
    $$('#tm [data-m]').forEach((b) => (b.onclick = () => { st.minutes = +b.dataset.m; paint(); }));
    $('#go').onclick = (e) => { e.target.disabled = true; startExam('practice', { ...st, level: st.subject === 'clerical' ? 'subpro' : 'pro' }).finally(() => (e.target.disabled = false)); };
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
        toast('Naisumite mo na ito. Lalabas ang resulta kapag may internet na.'); return go('#/');
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
    const firstEmpty = a.items.findIndex((_, i) => ex.answers[i] === undefined);
    ex.idx = firstEmpty >= 0 ? firstEmpty : 0;
    S.exam = ex;

    $app.innerHTML = `
      <div class="exam-top"><div class="inner">
        <button class="btn ghost small" id="quit" aria-label="Lumabas">✕</button>
        <div class="grow" style="flex:1;min-width:0"><div class="ellipsis small"><b>${esc(a.title)}</b></div><div class="muted small" id="answered"></div></div>
        ${ex.deadline ? '<div class="timer" id="timer">--:--</div>' : ''}
        <button class="btn secondary small" id="navBtn">☰ Lahat</button>
      </div></div>
      <div class="progress"><i id="prog"></i></div>
      <main class="wrap" id="qwrap" style="padding-bottom:120px"></main>
      <div class="exam-actions"><div class="inner">
        <button class="btn ghost" id="prev">‹ Bumalik</button>
        <button class="btn ghost flag-btn" id="flag" title="Markahan para balikan">⚑</button>
        <button class="btn" id="next">Susunod ›</button>
      </div></div>`;

    $('#quit').onclick = async () => {
      await saveAnswers(true);
      if (await confirmBox('Lumabas muna?', 'Naka-save ang mga sagot mo. Maaari mo itong ituloy mamaya mula sa Home.' + (ex.deadline ? ' <b>Tuloy pa rin ang takbo ng oras.</b>' : ''), 'Lumabas')) { stopTimer(); go('#/'); }
    };
    $('#prev').onclick = () => { if (ex.idx > 0) { ex.idx--; paintQ(); } };
    $('#next').onclick = () => { if (ex.idx < a.items.length - 1) { ex.idx++; paintQ(); } else submitFlow(); };
    $('#flag').onclick = () => {
      ex.flags.has(ex.idx) ? ex.flags.delete(ex.idx) : ex.flags.add(ex.idx);
      try { localStorage.setItem('cse-flag-' + id, JSON.stringify([...ex.flags])); } catch { /* ignore */ }
      paintQ();
    };
    $('#navBtn').onclick = openNav;
    document.onkeydown = (e) => {
      if (!S.exam || document.querySelector('.modal-bg')) return;
      const k = e.key.toUpperCase();
      if (LETTERS.includes(k)) choose(LETTERS.indexOf(k));
      else if (e.key === 'ArrowRight') $('#next').click();
      else if (e.key === 'ArrowLeft') $('#prev').click();
    };

    if (ex.deadline) {
      const tick = () => {
        const left = (ex.deadline - Date.now()) / 1000;
        const t = $('#timer');
        if (!t) return stopTimer();
        t.textContent = fmtTime(left);
        t.classList.toggle('low', left < 300);
        if (left <= 0) { stopTimer(); toast('Ubos na ang oras! Isusumite na ang exam.'); submit(); }
      };
      tick(); S.timer = setInterval(tick, 1000);
    }
    paintQ();
  }

  function sectionStart(items, i) {
    return i === 0 || items[i - 1].subject !== items[i].subject;
  }
  function paintQ() {
    const ex = S.exam; const { a, idx } = ex; const it = a.items[idx];
    const chosen = ex.answers[idx];
    const reveal = ex.practice && chosen !== undefined;
    const parts = [...new Set(a.items.map((x) => x.subject))];
    const partNo = parts.indexOf(it.subject) + 1;
    const roman = ['I', 'II', 'III', 'IV', 'V'][partNo - 1] || partNo;
    const showPassage = it.passage && (idx === 0 || a.items[idx - 1].passage !== it.passage || true);
    $('#qwrap').innerHTML = `
      <div class="q-section">${a.mode === 'practice' ? esc(subjName(it.subject)) : `Part ${roman}: ${esc(subjName(it.subject))}`}${sectionStart(a.items, idx) && a.mode !== 'practice' ? ' <span class="pill">Bagong bahagi</span>' : ''}</div>
      <div class="row between"><div class="q-num">Tanong ${idx + 1} sa ${a.items.length} · ${esc(it.topic)}</div>${ex.flags.has(idx) ? '<span class="pill warn">⚑ Minarkahan</span>' : ''}</div>
      ${showPassage ? `<div class="passage">${esc(it.passage)}</div>` : ''}
      <div class="q-text">${esc(it.question)}</div>
      <div class="choices">${it.choices.map((c, i) => {
        let cls = '';
        if (reveal) { if (i === it.answer) cls = 'correct'; else if (i === chosen) cls = 'wrong'; } else if (i === chosen) cls = 'selected';
        return `<button class="choice ${cls}" data-c="${i}" ${reveal ? 'disabled' : ''}><span class="letter">${LETTERS[i]}</span><span>${esc(c)}</span></button>`;
      }).join('')}</div>
      ${reveal ? `<div class="explain"><b>${chosen === it.answer ? '✅ Tama!' : `❌ Mali. Ang tamang sagot ay ${LETTERS[it.answer]}.`}</b><br>${esc(it.explanation || '')}</div>` : ''}
    `;
    $$('#qwrap [data-c]').forEach((b) => (b.onclick = () => choose(+b.dataset.c)));
    const n = Object.keys(ex.answers).length;
    $('#answered').textContent = `${n}/${a.items.length} nasagutan`;
    $('#prog').style.width = pct(n, a.items.length) + '%';
    $('#prev').disabled = idx === 0;
    $('#next').textContent = idx === a.items.length - 1 ? 'Isumite ✓' : 'Susunod ›';
    $('#flag').classList.toggle('on', ex.flags.has(idx));
    window.scrollTo(0, 0);
  }
  function choose(i) {
    const ex = S.exam; if (!ex) return;
    if (ex.practice && ex.answers[ex.idx] !== undefined) return;
    ex.answers[ex.idx] = i;
    try { localStorage.setItem('cse-ans-' + ex.a.id, JSON.stringify(ex.answers)); } catch { /* ignore */ }
    ex.dirty = true;
    clearTimeout(S.saveT); S.saveT = setTimeout(() => saveAnswers(), 1500);
    paintQ();
    // Auto-advance in mock exams for faster answering.
    if (!ex.practice && ex.idx < ex.a.items.length - 1) setTimeout(() => { if (S.exam === ex && ex.answers[ex.idx] === i) { ex.idx++; paintQ(); } }, 280);
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
      <div class="row between"><h2 style="margin:0">Lahat ng tanong</h2><button class="btn ghost small" data-x>Isara</button></div>
      <div class="legend"><span>🟦 Nasagutan</span><span>⬜ Wala pang sagot</span><span>🟨 Minarkahan</span></div>
      ${parts.map((p) => `<h3 style="margin-top:14px">${esc(subjName(p))}</h3><div class="navgrid">${a.items.map((it, i) => it.subject !== p ? '' :
        `<button data-i="${i}" class="${ex.answers[i] !== undefined ? 'ans' : ''} ${ex.flags.has(i) ? 'flag' : ''} ${i === ex.idx ? 'cur' : ''}">${i + 1}</button>`).join('')}</div>`).join('')}
      <button class="btn block" data-submit style="margin-top:18px">Isumite ang exam</button>`, (bg, cl) => {
      $('[data-x]', bg).onclick = cl;
      $$('[data-i]', bg).forEach((b) => (b.onclick = () => { ex.idx = +b.dataset.i; cl(); paintQ(); }));
      $('[data-submit]', bg).onclick = () => { cl(); submitFlow(); };
    });
    return close;
  }
  async function submitFlow() {
    const ex = S.exam; const total = ex.a.items.length;
    const blank = total - Object.keys(ex.answers).length;
    const ok = await confirmBox('Isumite na ang exam?', blank ? `May <b>${blank}</b> tanong ka pang walang sagot. Sa totoong CSE, walang bawas ang maling sagot kaya mas mabuting sagutan lahat.` : 'Nasagutan mo na lahat ng tanong. Hindi mo na ito mababago pagkatapos isumite.', 'Isumite');
    if (ok) submit();
  }
  async function submit() {
    const ex = S.exam; if (!ex || ex.submitting) return;
    ex.submitting = true;
    stopTimer(); clearTimeout(S.saveT);
    const finish = () => { try { localStorage.removeItem('cse-ans-' + ex.a.id); localStorage.removeItem('cse-flag-' + ex.a.id); } catch { /* ignore */ } S.exam = null; document.onkeydown = null; };
    if (isLocal(ex.a.id)) {
      const la = local.get(ex.a.id);
      const { score, breakdown } = gradeLocal(la.items, ex.answers);
      let end = Date.now();
      if (la.time_limit_sec) end = Math.min(end, la.started_at + la.time_limit_sec * 1000 + 60000);
      local.save({ ...la, answers: ex.answers, score, breakdown, finished_at: end });
      finish(); syncSoon();
      return go('#/result/' + la.id);
    }
    try {
      const r = await api('POST', `/api/attempts/${ex.a.id}/submit`, { answers: ex.answers });
      try { localStorage.removeItem('cse-ans-' + ex.a.id); localStorage.removeItem('cse-flag-' + ex.a.id); } catch { /* ignore */ }
      S.exam = null; document.onkeydown = null;
      go('#/result/' + r.id);
    } catch (e) {
      if (e.offline) {
        // Save it on the device and submit it when the internet is back.
        const list = store.get(uk('cse-psub'), []).filter((x) => x.id !== ex.a.id);
        list.push({ id: ex.a.id, answers: ex.answers, at: Date.now() });
        store.set(uk('cse-psub'), list);
        finish();
        await confirmBox('Naisumite offline', 'Walang internet, kaya naka-save muna sa device ang mga sagot mo. Awtomatiko itong isusumite at lalabas ang score kapag may internet na.', 'Sige');
        return go('#/');
      }
      ex.submitting = false; toast(e.message + ' Subukan ulit.');
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
    const p = pct(a.score, a.total);
    const pass = p >= a.passing;
    const practice = a.mode === 'practice';
    const mins = Math.round((a.finished_at - a.started_at) / 60000);
    const color = practice ? 'var(--primary)' : pass ? 'var(--ok)' : 'var(--bad)';
    const wrongCount = a.items.filter((it, i) => a.answers[i] !== undefined && a.answers[i] !== it.answer).length;
    const blankCount = a.items.filter((_, i) => a.answers[i] === undefined).length;
    shell('history', `
      <div class="card" style="text-align:center">
        <div class="muted small">${esc(a.title)}</div>
        <div class="score-ring" style="background:conic-gradient(${color} ${p * 3.6}deg, var(--line) 0)"><div class="in"><div><div class="pct">${p}%</div><div class="muted small">${a.score}/${a.total}</div></div></div></div>
        ${practice ? '<h2 style="margin:6px 0">Tapos na ang practice!</h2>' : pass ? '<h2 style="margin:6px 0;color:var(--ok)">🎉 PASADO!</h2>' : '<h2 style="margin:6px 0;color:var(--bad)">Hindi pa pasado</h2>'}
        <p class="muted" style="margin:0">${practice ? 'Ituloy lang ang pag-practice!' : pass ? `Lampas sa ${a.passing}% na passing rate. Galing!` : `Kailangan ng ${a.passing}% para pumasa. Kaya mo 'yan, review pa!`}</p>
        <p class="muted small">Tagal: ${mins} minuto · ${wrongCount} mali · ${blankCount} walang sagot</p>
        ${isLocal(id) ? '<p class="muted small">⏳ Ginawa offline. Ise-save ito online kapag may internet na.</p>' : ''}
        <div class="row" style="justify-content:center"><a class="btn secondary" href="#/">Home</a><button class="btn" id="again">Ulitin (bagong set)</button></div>
      </div>
      <div class="card" style="margin-top:12px"><h3>Score kada subject</h3>${subjectBars(a.breakdown || {})}</div>
      <h2>Review ng mga sagot</h2>
      <div class="tabs" id="rf"><button data-f="wrong" class="active">Mali at walang sagot</button><button data-f="all">Lahat</button></div>
      <div class="list" id="rlist"></div>`);
    const paint = (f) => {
      $$('#rf button').forEach((b) => b.classList.toggle('active', b.dataset.f === f));
      const rows = a.items.map((it, i) => ({ it, i, ch: a.answers[i] })).filter((x) => f === 'all' || x.ch !== x.it.answer);
      $('#rlist').innerHTML = rows.length ? rows.slice(0, 200).map(({ it, i, ch }) => `
        <div class="review-item">
          <div class="row between"><span class="q-num">#${i + 1} · ${esc(subjName(it.subject))} · ${esc(it.topic)}</span>
          <span class="pill ${ch === it.answer ? 'ok' : 'bad'}">${ch === it.answer ? 'Tama' : ch === undefined ? 'Walang sagot' : 'Mali'}</span></div>
          ${it.passage ? `<details><summary class="small muted">Basahin ang talata</summary><div class="passage">${esc(it.passage)}</div></details>` : ''}
          <div style="font-weight:600;margin:6px 0;white-space:pre-wrap">${esc(it.question)}</div>
          ${ch !== undefined && ch !== it.answer ? `<div class="ans-line" style="color:var(--bad)">Sagot mo: ${LETTERS[ch]}. ${esc(it.choices[ch])}</div>` : ''}
          <div class="ans-line" style="color:var(--ok)">Tamang sagot: ${LETTERS[it.answer]}. ${esc(it.choices[it.answer])}</div>
          ${it.explanation ? `<div class="explain">${esc(it.explanation)}</div>` : ''}
        </div>`).join('') + (rows.length > 200 ? '<p class="muted small">Ipinapakita ang unang 200.</p>' : '') : '<div class="card empty">Perpekto! Walang mali. 🎉</div>';
    };
    $$('#rf button').forEach((b) => (b.onclick = () => paint(b.dataset.f)));
    paint('wrong');
    $('#again').onclick = () => {
      if (practice) {
        const subject = a.items[0]?.subject || 'verbal';
        startExam('practice', { subject, count: a.total, minutes: Math.round(a.time_limit_sec / 60), level: subject === 'clerical' ? 'subpro' : 'pro' });
      } else startExam(a.mode);
    };
  }

  /* ---------------- history ---------------- */
  async function viewHistory() {
    await swr(['/api/attempts', '/api/stats'], ([l0, s0]) => paintHistory(l0, s0), (i) => (i ? null : []));
  }
  function paintHistory(l0, s0) {
    const { list, stats } = withLocal(l0, s0);
    const trend = stats.mocks.slice(-10);
    shell('history', `
      <h1>Mga resulta</h1>
      ${trend.length ? `<div class="card"><h3>Huling mga mock exam</h3>
        <div style="display:flex;align-items:flex-end;gap:6px;height:140px;padding-top:10px;border-bottom:1px dashed var(--line);position:relative">
          <div style="position:absolute;left:0;right:0;bottom:${80 * 1.3}px;border-top:1px dashed var(--ok)"></div>
          <span class="small" style="position:absolute;right:0;bottom:${80 * 1.3 + 2}px;color:var(--ok)">80%</span>
          ${trend.map((m) => `<div title="${m.pct}%" style="flex:1;max-width:48px;height:${m.pct * 1.3}px;background:${m.pct >= 80 ? 'var(--ok)' : 'var(--primary)'};border-radius:6px 6px 0 0"></div>`).join('')}
        </div><p class="muted small">Bawat bar ay isang mock exam (luma → bago).</p></div>` : ''}
      ${Object.keys(stats.subjects).length ? `<div class="card" style="margin-top:12px"><h3>Kabuuang score kada subject</h3>${subjectBars(stats.subjects)}<p class="muted small">Tip: pag-aralan muna ang subject na may pinakamababang score.</p></div>` : ''}
      <h2>Lahat ng exam</h2>
      ${list.length ? `<div class="list">${list.map(attemptRow).join('')}</div>` : '<div class="card empty">Wala pang resulta.</div>'}`);
    $$('.list-item').forEach((el) => {
      const id = el.getAttribute('href').split('/').pop();
      const a = list.find((x) => String(x.id) === id && !x.pending) || list.find((x) => String(x.id) === id);
      if (a && !a.finished_at) el.setAttribute('href', '#/exam/' + id);
    });
  }

  /* ---------------- account ---------------- */
  function viewAccount() {
    shell('account', `
      <h1>Account</h1>
      <div class="card">
        <div class="row between"><div><b>${esc(S.user.name)}</b><div class="muted small">${esc(S.user.email)}</div></div>
        <span class="pill">${S.user.role === 'admin' ? 'Admin' : 'Reviewer'}</span></div>
      </div>
      <a class="list-item" href="#/premium" style="margin-top:12px"><div class="grow"><b>Premium</b><div class="muted small">${S.user.role === 'admin' ? 'Admin: bukas lahat' : S.premium && S.user.premium_until > Date.now() ? 'Aktibo hanggang ' + new Date(S.user.premium_until).toLocaleDateString('en-PH') : S.config.premium_required ? 'Hindi pa aktibo' : 'Libre pa ang mock exams'}</div></div><span>›</span></a>
      <div class="card" style="margin-top:12px">
        <h3>Palitan ang password</h3>
        <form id="pwf"><label>Kasalukuyang password</label><input type="password" id="cur" autocomplete="current-password">
        <label>Bagong password</label><input type="password" id="npw" autocomplete="new-password" placeholder="8 characters o higit pa">
        <div class="err" id="err"></div><button class="btn" type="submit">I-save</button></form>
      </div>
      <div class="card" style="margin-top:12px">
        <h3>I-install sa phone</h3>
        <p class="muted small" style="margin:0 0 10px"><b>Android (Chrome):</b> pindutin ang ⋮ menu → "Add to Home screen" o "Install app".<br><b>iPhone (Safari):</b> pindutin ang Share (□↑) → "Add to Home Screen".<br>Sa Premium, gumagana ito kahit offline. Kailangan ng internet para mag-login, magbayad, at makatanggap ng email.</p>
        <button class="btn secondary" id="install" hidden>I-install ang app</button>
      </div>
      <div class="card" style="margin-top:12px">
        <h3>Tungkol sa exam</h3>
        <p class="muted small" style="margin:0">Sinusunod ng mock exam ang format ng Career Service Exam (pen and paper test) ng Civil Service Commission: Professional na 170 tanong sa loob ng 3 oras at 10 minuto, at Subprofessional na 165 tanong sa loob ng 2 oras at 40 minuto, lahat ay may 4 na pagpipilian at 80% ang passing rate. Hindi inilalabas ng CSC ang eksaktong bilang kada subject, kaya tantiya ang hati ng mga tanong. Ang app na ito ay hindi opisyal na produkto ng CSC.</p>
      </div>
      <button class="btn ghost block" id="logout" style="margin-top:16px">Mag-logout</button>`);
    $('#pwf').onsubmit = async (e) => {
      e.preventDefault();
      try { await api('POST', '/api/me/password', { current: $('#cur').value, password: $('#npw').value }); toast('Napalitan na ang password.'); e.target.reset(); $('#err').textContent = ''; } catch (err) { $('#err').textContent = err.message; }
    };
    $('#logout').onclick = async () => {
      if (local.all().some((a) => a.finished_at) && !(await confirmBox('Mag-logout?', 'May mga resulta kang ginawa offline na hindi pa naka-save online. Mase-save pa rin ang mga ito kapag nag-login ka ulit sa device na ito.', 'Mag-logout'))) return;
      try { await api('POST', '/api/auth/logout'); } catch { /* offline: still log out on this device */ }
      store.del('cse-token'); store.del('cse-boot'); S.user = null; go('#/login');
    };
    if (window._installPrompt) { const b = $('#install'); b.hidden = false; b.onclick = () => window._installPrompt.prompt(); }
  }

  /* ---------------- admin ---------------- */
  async function viewAdmin(tab = 'overview') {
    if (S.user.role !== 'admin') return go('#/');
    const tabs = [['overview', 'Overview'], ['payments', 'Payments'], ['users', 'Users'], ['sets', 'Exam sets'], ['questions', 'Mga tanong'], ['results', 'Resulta'], ['settings', 'Settings']];
    shell('admin', `<h1>Admin</h1><div class="tabs">${tabs.map(([k, l]) => `<button data-t="${k}" class="${k === tab ? 'active' : ''}">${l}</button>`).join('')}</div><div id="adm"><div class="empty">Naglo-load…</div></div>`);
    $$('.tabs [data-t]').forEach((b) => (b.onclick = () => go('#/admin/' + b.dataset.t)));
    const el = $('#adm');
    try {
      if (tab === 'overview') await admOverview(el);
      else if (tab === 'users') await admUsers(el);
      else if (tab === 'questions') await admQuestions(el);
      else if (tab === 'payments') await admPayments(el);
      else if (tab === 'sets') await admSets(el);
      else if (tab === 'settings') await admSettings(el);
      else await admResults(el);
    } catch (e) { el.innerHTML = `<div class="card err">${esc(e.message)}</div>`; }
  }
  async function admOverview(el) {
    const o = await api('GET', '/api/admin/overview');
    const totalQ = o.questions.reduce((x, y) => x + y.n, 0);
    el.innerHTML = `
      <div class="grid stats">
        <div class="card stat"><div class="v">${o.users}</div><div class="l">Kabuuang users</div></div>
        <div class="card stat"><div class="v">${o.newUsers7d}</div><div class="l">Bagong users (7 araw)</div></div>
        <div class="card stat"><div class="v">${o.attempts}</div><div class="l">Natapos na exam/practice</div></div>
        <div class="card stat"><div class="v">${o.mockAttempts}</div><div class="l">Mock exam na natapos</div></div>
        <div class="card stat"><div class="v">${o.avgMock ?? '–'}${o.avgMock != null ? '%' : ''}</div><div class="l">Average mock score</div></div>
        <div class="card stat"><div class="v">${o.mockAttempts ? pct(o.passed, o.mockAttempts) + '%' : '–'}</div><div class="l">Passing rate ng users</div></div>
      </div>
      ${o.pendingPayments ? `<a class="notice" href="#/admin/payments" style="display:block;margin-top:12px">💳 May <b>${o.pendingPayments}</b> bayad na hinihintay ma-check →</a>` : ''}
      ${!o.mail.enabled ? '<div class="notice" style="margin-top:12px;background:var(--warn-soft)">⚠️ Hindi pa naka-set up ang email. Hindi pa nagpapadala ng verification code, resulta at resibo. Tingnan ang README (Email setup).</div>' : ''}
      <div class="grid stats" style="margin-top:12px"><div class="card stat"><div class="v">${o.premiumUsers}</div><div class="l">Premium users</div></div></div>
      <div class="card" style="margin-top:12px"><h3>Question bank (${totalQ} nakasulat na tanong)</h3>
        <table><tr><th>Subject</th><th>Bilang</th></tr>${o.questions.map((q) => `<tr><td>${esc(subjName(q.subject))}</td><td>${q.n}</td></tr>`).join('')}</table>
        <p class="muted small">Bukod dito, awtomatikong gumagawa ang app ng bagong tanong para sa Numerical, Analytical, Clerical at vocabulary, kaya iba-iba ang bawat exam.</p></div>`;
  }
  async function admUsers(el) {
    const paint = async (q = '') => {
      const users = await api('GET', '/api/admin/users?q=' + encodeURIComponent(q));
      $('#ut').innerHTML = users.map((u) => `
        <tr><td><b>${esc(u.name)}</b><div class="muted small">${esc(u.email)}</div></td>
        <td>${u.role === 'admin' ? '<span class="pill">Admin</span>' : 'User'} ${u.disabled ? '<span class="pill bad">Disabled</span>' : ''} ${u.premium_until > Date.now() ? '<span class="pill ok">Premium</span>' : ''} ${S.config.verify && !u.email_verified ? '<span class="pill warn">Unverified</span>' : ''}</td>
        <td>${u.attempts}</td><td>${u.avg_mock ?? '–'}${u.avg_mock != null ? '%' : ''}</td>
        <td class="hide-mobile small muted">${esc(u.created_at.slice(0, 10))}</td>
        <td>${u.id === S.user.id ? '<span class="muted small">Ikaw</span>' : `<button class="btn ghost small" data-u="${u.id}">Aksyon</button>`}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">Walang user.</td></tr>';
      $$('[data-u]').forEach((b) => (b.onclick = () => userActions(users.find((x) => x.id === +b.dataset.u), () => paint($('#uq').value))));
    };
    el.innerHTML = `<input type="search" id="uq" placeholder="Hanapin ang pangalan o email">
      <div class="card table-wrap" style="margin-top:10px;padding:8px"><table><thead><tr><th>User</th><th>Role</th><th>Exams</th><th>Avg mock</th><th class="hide-mobile">Sumali</th><th></th></tr></thead><tbody id="ut"></tbody></table></div>`;
    let t; $('#uq').oninput = (e) => { clearTimeout(t); t = setTimeout(() => paint(e.target.value), 300); };
    await paint();
  }
  function userActions(u, refresh) {
    modal(`<h2 style="margin-top:0">${esc(u.name)}</h2><p class="muted small" style="margin-top:-6px">${esc(u.email)}</p>
      <div class="list">
        <button class="btn secondary" data-a="role">${u.role === 'admin' ? 'Alisin bilang admin' : 'Gawing admin'}</button>
        <button class="btn secondary" data-a="disable">${u.disabled ? 'I-enable ang account' : 'I-disable ang account'}</button>
        <button class="btn secondary" data-a="prem">${u.premium_until > Date.now() ? `Premium hanggang ${new Date(u.premium_until).toLocaleDateString('en-PH')} · +30 araw` : 'Bigyan ng Premium (30 araw)'}</button>
        ${u.premium_until > Date.now() ? '<button class="btn secondary" data-a="unprem">Alisin ang Premium</button>' : ''}
        ${S.config.verify && !u.email_verified ? '<button class="btn secondary" data-a="ver">Markahang verified ang email</button>' : ''}
        <button class="btn secondary" data-a="report">I-email ang progress report</button>
        <button class="btn secondary" data-a="pw">I-reset ang password</button>
        <button class="btn secondary" data-a="hist">Tingnan ang mga resulta</button>
        <button class="btn danger" data-a="del">Burahin ang account</button>
        <button class="btn ghost" data-a="x">Isara</button>
      </div><div id="extra"></div>`, (bg, close) => {
      const act = async (fn, msg) => { try { await fn(); toast(msg); close(); refresh(); } catch (e) { toast(e.message); } };
      $('[data-a=x]', bg).onclick = close;
      $('[data-a=role]', bg).onclick = () => act(() => api('PATCH', '/api/admin/users/' + u.id, { role: u.role === 'admin' ? 'user' : 'admin' }), 'Na-update ang role.');
      $('[data-a=disable]', bg).onclick = () => act(() => api('PATCH', '/api/admin/users/' + u.id, { disabled: !u.disabled }), u.disabled ? 'Na-enable.' : 'Na-disable.');
      $('[data-a=prem]', bg).onclick = () => act(() => api('PATCH', '/api/admin/users/' + u.id, { premium_days: 30 }), 'Nabigyan ng 30 araw na Premium.');
      if ($('[data-a=unprem]', bg)) $('[data-a=unprem]', bg).onclick = () => act(() => api('PATCH', '/api/admin/users/' + u.id, { premium_days: 0 }), 'Inalis ang Premium.');
      if ($('[data-a=ver]', bg)) $('[data-a=ver]', bg).onclick = () => act(() => api('PATCH', '/api/admin/users/' + u.id, { email_verified: true }), 'Na-verify.');
      $('[data-a=report]', bg).onclick = () => act(() => api('POST', `/api/admin/users/${u.id}/report`), 'Naipadala ang report sa email ng user.');
      $('[data-a=pw]', bg).onclick = () => {
        $('#extra', bg).innerHTML = '<label>Bagong password</label><input type="text" id="np" placeholder="8 characters o higit pa"><button class="btn" id="sp" style="margin-top:8px">I-save</button>';
        $('#sp', bg).onclick = () => act(() => api('POST', `/api/admin/users/${u.id}/password`, { password: $('#np', bg).value }), 'Na-reset ang password. Ibigay ito sa user.');
      };
      $('[data-a=del]', bg).onclick = async () => {
        close();
        if (await confirmBox('Burahin ang account?', `Mabubura ang account ni <b>${esc(u.name)}</b> at lahat ng resulta niya. Hindi na ito maibabalik.`, 'Burahin', true)) {
          try { await api('DELETE', '/api/admin/users/' + u.id); toast('Nabura ang account.'); refresh(); } catch (e) { toast(e.message); }
        }
      };
      $('[data-a=hist]', bg).onclick = async () => {
        const rows = await api('GET', `/api/admin/users/${u.id}/attempts`);
        $('#extra', bg).innerHTML = `<h3 style="margin-top:16px">Mga resulta</h3>${rows.length ? `<div class="list">${rows.map(attemptRow).join('')}</div>` : '<p class="muted">Wala pa.</p>'}`;
        $$('#extra a', bg).forEach((a) => a.addEventListener('click', close));
      };
    });
  }
  async function admQuestions(el) {
    const st = { subject: '', q: '', page: 0 };
    el.innerHTML = `
      <div class="row">
        <select id="qs" style="flex:1;min-width:150px"><option value="">Lahat ng subject</option>${Object.entries(S.meta.subjects).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join('')}</select>
        <input type="search" id="qq" placeholder="Hanapin" style="flex:2;min-width:150px">
      </div>
      <div class="row" style="margin-top:10px"><button class="btn" id="qadd">+ Magdagdag ng tanong</button><button class="btn ghost" id="qimp">Import (JSON)</button></div>
      <p class="muted small" id="qcount"></p>
      <div class="list" id="ql"></div>
      <div class="row" style="justify-content:center;margin-top:12px"><button class="btn ghost small" id="qprev">‹ Nakaraan</button><button class="btn ghost small" id="qnext">Susunod ›</button></div>`;
    const paint = async () => {
      const r = await api('GET', `/api/admin/questions?subject=${st.subject}&q=${encodeURIComponent(st.q)}&page=${st.page}`);
      $('#qcount').textContent = `${r.total} tanong · pahina ${st.page + 1} sa ${Math.max(1, Math.ceil(r.total / 50))}`;
      $('#ql').innerHTML = r.rows.map((q) => `
        <div class="review-item">
          <div class="row between"><span class="q-num">${esc(subjName(q.subject))} · ${esc(q.topic || '—')} ${q.level !== 'both' ? `· ${q.level}` : ''}</span>
          <span class="row" style="gap:6px"><button class="btn ghost small" data-e="${q.id}">I-edit</button><button class="btn ghost small" data-d="${q.id}">Itago</button></span></div>
          <div style="font-weight:600;margin:6px 0;white-space:pre-wrap">${esc(q.question)}</div>
          <div class="small">${q.choices.map((c, i) => `<div style="${i === q.answer ? 'color:var(--ok);font-weight:700' : ''}">${LETTERS[i]}. ${esc(c)}${i === q.answer ? ' ✓' : ''}</div>`).join('')}</div>
        </div>`).join('') || '<div class="card empty">Walang tanong.</div>';
      $('#qprev').disabled = st.page === 0;
      $('#qnext').disabled = (st.page + 1) * 50 >= r.total;
      $$('[data-e]').forEach((b) => (b.onclick = () => qForm(r.rows.find((x) => x.id === +b.dataset.e), paint)));
      $$('[data-d]').forEach((b) => (b.onclick = async () => {
        if (await confirmBox('Itago ang tanong?', 'Hindi na ito lalabas sa mga bagong exam.', 'Itago', true)) { await api('DELETE', '/api/admin/questions/' + b.dataset.d); toast('Naitago.'); paint(); }
      }));
    };
    $('#qs').onchange = (e) => { st.subject = e.target.value; st.page = 0; paint(); };
    let t; $('#qq').oninput = (e) => { clearTimeout(t); t = setTimeout(() => { st.q = e.target.value; st.page = 0; paint(); }, 300); };
    $('#qprev').onclick = () => { st.page--; paint(); };
    $('#qnext').onclick = () => { st.page++; paint(); };
    $('#qadd').onclick = () => qForm(null, paint);
    $('#qimp').onclick = () => importForm(paint);
    await paint();
  }
  function qForm(q, refresh) {
    const v = q || { subject: 'verbal', topic: '', level: 'both', question: '', passage: '', choices: ['', '', '', ''], answer: 0, explanation: '' };
    modal(`<h2 style="margin-top:0">${q ? 'I-edit ang tanong' : 'Bagong tanong'}</h2>
      <form id="qf">
        <div class="row"><div style="flex:1;min-width:140px"><label>Subject</label><select id="fs">${Object.entries(S.meta.subjects).map(([k, s]) => `<option value="${k}" ${k === v.subject ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
        <div style="flex:1;min-width:140px"><label>Level</label><select id="fl"><option value="both">Pareho</option><option value="pro" ${v.level === 'pro' ? 'selected' : ''}>Professional lang</option><option value="subpro" ${v.level === 'subpro' ? 'selected' : ''}>Subprofessional lang</option></select></div></div>
        <label>Topic (hal. Grammar, RA 6713)</label><input type="text" id="ft" value="${esc(v.topic)}">
        <label>Talata / passage (opsyonal, para sa reading comprehension)</label><textarea id="fp">${esc(v.passage)}</textarea>
        <label>Tanong</label><textarea id="fq" required>${esc(v.question)}</textarea>
        <label>Mga pagpipilian (piliin ang tamang sagot)</label>
        ${[0, 1, 2, 3].map((i) => `<div class="row" style="margin-bottom:8px;flex-wrap:nowrap"><input type="radio" name="fa" value="${i}" ${i === v.answer ? 'checked' : ''} style="width:22px;height:22px" aria-label="Tamang sagot ${LETTERS[i]}"><b>${LETTERS[i]}</b><input type="text" class="fc" value="${esc(v.choices[i])}"></div>`).join('')}
        <label>Paliwanag</label><textarea id="fe">${esc(v.explanation)}</textarea>
        <div class="err" id="ferr"></div>
        <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-x>Kanselahin</button><button class="btn" type="submit">I-save</button></div>
      </form>`, (bg, close) => {
      $('[data-x]', bg).onclick = close;
      $('#qf', bg).onsubmit = async (e) => {
        e.preventDefault();
        const body = { subject: $('#fs', bg).value, level: $('#fl', bg).value, topic: $('#ft', bg).value, passage: $('#fp', bg).value, question: $('#fq', bg).value,
          choices: $$('.fc', bg).map((x) => x.value), answer: +($('input[name=fa]:checked', bg)?.value ?? -1), explanation: $('#fe', bg).value };
        try { await api(q ? 'PUT' : 'POST', '/api/admin/questions' + (q ? '/' + q.id : ''), body); toast('Na-save ang tanong.'); close(); refresh(); } catch (err) { $('#ferr', bg).textContent = err.message; }
      };
    });
  }
  function importForm(refresh) {
    const sample = JSON.stringify([{ subject: 'general', topic: 'RA 6713', level: 'both', question: 'Sample na tanong?', choices: ['Tamang sagot', 'Mali 1', 'Mali 2', 'Mali 3'], answer: 0, explanation: 'Paliwanag.' }], null, 2);
    modal(`<h2 style="margin-top:0">Import ng mga tanong</h2>
      <p class="muted small">I-paste ang JSON array. Ang <b>subject</b> ay isa sa: ${Object.keys(S.meta.subjects).join(', ')}. Ang <b>answer</b> ay 0–3 (0 = A).</p>
      <textarea id="ij" style="min-height:220px;font-family:monospace;font-size:13px">${esc(sample)}</textarea>
      <div class="err" id="ierr"></div>
      <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-x>Kanselahin</button><button class="btn" id="igo">Import</button></div>`, (bg, close) => {
      $('[data-x]', bg).onclick = close;
      $('#igo', bg).onclick = async () => {
        let data;
        try { data = JSON.parse($('#ij', bg).value); } catch { $('#ierr', bg).textContent = 'Hindi wastong JSON.'; return; }
        try {
          const r = await api('POST', '/api/admin/questions/import', data);
          toast(`${r.added} tanong ang naidagdag.`);
          if (r.errors.length) $('#ierr', bg).textContent = r.errors.join(' · '); else close();
          refresh();
        } catch (e) { $('#ierr', bg).textContent = e.message; }
      };
    });
  }
  async function admPayments(el, status = 'pending') {
    const rows = await api('GET', '/api/admin/payments?status=' + status);
    el.innerHTML = `<div class="tabs" id="pst">${[['pending', 'Hinihintay'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([k, l]) => `<button data-s="${k}" class="${k === status ? 'active' : ''}">${l}</button>`).join('')}</div>
      <p class="muted small">I-check sa ${'GCash'} app mo kung pumasok ang bayad gamit ang reference number bago i-approve.</p>
      <div class="list">${rows.map((p) => `<div class="review-item">
        <div class="row between"><div><b>${esc(p.name)}</b> <span class="muted small">${esc(p.email)}</span></div><span class="muted small">${fmtDate(p.created_at)}</span></div>
        <div style="margin:6px 0">₱${esc(p.amount)} · ${esc(p.method)} · Ref: <b>${esc(p.reference)}</b>${p.note ? ` · ${esc(p.note)}` : ''}</div>
        ${status === 'pending' ? `<div class="row"><button class="btn small" data-ok="${p.id}">✓ I-approve</button><button class="btn ghost small" data-no="${p.id}">✕ I-reject</button></div>` : ''}
      </div>`).join('') || '<div class="card empty">Walang bayad dito.</div>'}</div>`;
    $$('#pst [data-s]').forEach((b) => (b.onclick = () => admPayments(el, b.dataset.s)));
    $$('[data-ok]').forEach((b) => (b.onclick = async () => {
      if (!(await confirmBox('I-approve ang bayad?', 'Mabibigyan ng Premium ang user at padadalhan siya ng email.', 'I-approve'))) return;
      try { await api('POST', '/api/admin/payments/' + b.dataset.ok, { action: 'approve' }); toast('Na-approve.'); admPayments(el, status); } catch (e) { toast(e.message); }
    }));
    $$('[data-no]').forEach((b) => (b.onclick = () => modal(`<h2 style="margin-top:0">I-reject ang bayad</h2><label>Dahilan (makikita ng user)</label><input type="text" id="why" value="Hindi namin makita ang bayad gamit ang reference number na ito.">
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost" data-x>Bumalik</button><button class="btn danger" data-go>I-reject</button></div>`, (bg, close) => {
      $('[data-x]', bg).onclick = close;
      $('[data-go]', bg).onclick = async () => { try { await api('POST', '/api/admin/payments/' + b.dataset.no, { action: 'reject', note: $('#why', bg).value }); close(); toast('Na-reject.'); admPayments(el, status); } catch (e) { toast(e.message); } };
    })));
  }
  async function admSets(el) {
    const rows = await api('GET', '/api/admin/sets');
    const by = (m) => rows.filter((r) => r.mode === m);
    el.innerHTML = `<p class="muted small">Awtomatikong may bagong set bawat linggo. Pwede ka ring gumawa ng bagong set ngayon.</p>
      ${['pro', 'subpro'].map((m) => `<div class="card" style="margin-bottom:12px"><div class="row between"><h3>${m === 'pro' ? 'Professional' : 'Subprofessional'} (${by(m).length} set)</h3><button class="btn small" data-new="${m}">+ Bagong set</button></div>
        <div class="list" style="margin-top:8px">${by(m).map((r) => `<div class="list-item"><div class="grow"><b>Set ${r.number}</b><div class="muted small">${fmtDate(r.created_at)} · ${r.taken} beses nasubukan</div></div><button class="btn ghost small" data-del="${r.id}">Burahin</button></div>`).join('')}</div></div>`).join('')}`;
    $$('[data-new]').forEach((b) => (b.onclick = async () => { b.disabled = true; try { const r = await api('POST', '/api/admin/sets', { mode: b.dataset.new }); toast(`Nagawa ang Set ${r.number}.`); admSets(el); } catch (e) { toast(e.message); b.disabled = false; } }));
    $$('[data-del]').forEach((b) => (b.onclick = async () => {
      if (await confirmBox('Burahin ang set?', 'Hindi na ito makikita ng mga user. Mananatili ang mga resulta ng mga nakasubok na.', 'Burahin', true)) { await api('DELETE', '/api/admin/sets/' + b.dataset.del); toast('Nabura.'); admSets(el); }
    }));
  }
  async function admSettings(el) {
    const st = await api('GET', '/api/admin/settings');
    el.innerHTML = `<form class="card" id="stf">
      <h3>Premium (bayad para sa mock exams)</h3>
      <label style="display:flex;gap:10px;align-items:center;font-weight:600"><input type="checkbox" id="preq" ${st.premium_required === '1' ? 'checked' : ''} style="width:22px;height:22px"> Kailangan ng Premium para sa mock exams</label>
      <p class="muted small" style="margin:4px 0 0">Kapag naka-off, libre ang lahat at gumagana offline para sa lahat. Kapag naka-on, online lang ang libreng plan at may limit (sa ibaba).</p>
      <div class="row"><div style="flex:1;min-width:120px"><label>Presyo (₱)</label><input type="number" id="price" value="${esc(st.price)}"></div>
      <div style="flex:1;min-width:120px"><label>Ilang araw</label><input type="number" id="days" value="${esc(st.plan_days)}"></div></div>
      <div class="notice" style="margin:12px 0">${S.config.online_pay ? '✅ <b>Online na bayad (PayMongo): naka-on.</b> GCash, Maya, card, GrabPay, QR Ph (bank apps) at iba pa. Awtomatikong bubukas ang Premium pagkabayad. Lalabas lang ang manual na GCash sa ibaba kapag may GCash number.' : '💳 <b>Online na bayad (PayMongo): naka-off.</b> Ilagay ang <code>PAYMONGO_SECRET_KEY</code> at <code>PAYMONGO_WEBHOOK_SECRET</code> sa server para i-on.'}</div>
      <h3>Manual na bayad</h3>
      <label>Paraan ng bayad</label><input type="text" id="meth" value="${esc(st.pay_method)}">
      <label>Account name</label><input type="text" id="pname" value="${esc(st.pay_name)}" placeholder="hal. Juan D.">
      <label>GCash number</label><input type="text" id="pnum" value="${esc(st.pay_number)}" placeholder="09XX XXX XXXX">
      <label>Paalala sa user</label><textarea id="pnote">${esc(st.pay_note)}</textarea>
      <h3 style="margin-top:18px">Libreng plan (kapag naka-on ang Premium)</h3>
      <div class="row"><div style="flex:1;min-width:100px"><label>Practice kada araw</label><input type="number" min="0" id="fdaily" value="${esc(st.free_practice_daily)}"></div>
      <div style="flex:1;min-width:100px"><label>Tanong bawat practice</label><input type="number" min="5" id="fitems" value="${esc(st.free_practice_items)}"></div>
      <div style="flex:1;min-width:100px"><label>Libreng exam set (Set 1 hanggang…)</label><input type="number" min="0" id="fsets" value="${esc(st.free_sets)}"></div></div>
      <button class="btn" type="submit" style="margin-top:12px">I-save</button></form>`;
    $('#stf').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await api('PUT', '/api/admin/settings', { premium_required: $('#preq').checked ? '1' : '0', price: $('#price').value, plan_days: $('#days').value, pay_method: $('#meth').value, pay_name: $('#pname').value, pay_number: $('#pnum').value, pay_note: $('#pnote').value, free_practice_daily: $('#fdaily').value, free_practice_items: $('#fitems').value, free_sets: $('#fsets').value });
        S.config.premium_required = $('#preq').checked;
        toast('Na-save ang settings.');
      } catch (err) { toast(err.message); }
    };
  }
  async function admResults(el) {
    const rows = await api('GET', '/api/admin/attempts');
    el.innerHTML = `<div class="card table-wrap" style="padding:8px"><table><thead><tr><th>User</th><th>Exam</th><th>Score</th><th class="hide-mobile">Petsa</th></tr></thead><tbody>
      ${rows.map((r) => { const p = pct(r.score, r.total); return `<tr><td><b>${esc(r.name)}</b><div class="muted small">${esc(r.email)}</div></td><td class="small"><a href="#/result/${r.id}">${esc(r.title)}</a></td>
      <td><span class="pill ${r.mode === 'practice' ? '' : p >= 80 ? 'ok' : 'bad'}">${p}%</span><div class="muted small">${r.score}/${r.total}</div></td><td class="hide-mobile small muted">${fmtDate(r.finished_at)}</td></tr>`; }).join('') || '<tr><td colspan="4" class="empty">Wala pang resulta.</td></tr>'}
      </tbody></table></div>`;
  }

  /* ---------------- router ---------------- */
  async function route() {
    stopTimer();
    if (S.exam) { saveAnswers(true); S.exam = null; document.onkeydown = null; }
    document.querySelectorAll('.modal-bg').forEach((m) => m.remove());
    const parts = (location.hash.replace(/^#\/?/, '') || '').split('/');
    const [p0, p1] = parts;
    if (!S.user) { if (p0 === 'register') return viewAuth('register'); if (p0 === 'forgot') return viewForgot(); return viewAuth('login'); }
    if (S.config.verify && !S.user.email_verified) return viewVerify();
    S.locked = false;
    if (S.offline && !canOffline() && !(p0 === 'exam' && isLocal(p1))) return viewOfflineLocked();
    try {
      if (p0 === 'sets') return await viewSets(p1);
      if (p0 === 'premium') return await viewPremium();
      if (p0 === 'login' || p0 === 'register' || !p0) return await viewHome();
      if (p0 === 'practice') return viewPractice();
      if (p0 === 'exam') return await viewExam(p1);
      if (p0 === 'result') return await viewResult(p1);
      if (p0 === 'history') return await viewHistory();
      if (p0 === 'account') return viewAccount();
      if (p0 === 'admin') return await viewAdmin(p1 || 'overview');
      return go('#/');
    } catch (e) {
      if (e.status === 401) { S.user = null; return viewAuth('login'); }
      if (e.code === 'unverified') { S.user.email_verified = false; return viewVerify(); }
      if (e.offline) return shell('', '<div class="card empty"><div style="font-size:40px">📡</div><p>Kailangan ng internet para sa bahaging ito. Pwede ka pa ring mag-practice o sumagot ng na-download na exam set.</p><a class="btn" href="#/">Bumalik sa Home</a></div>');
      shell('', `<div class="card empty"><p>${esc(e.message)}</p><a class="btn" href="#/">Bumalik sa Home</a></div>`);
    }
  }
  // Free plan (or Premium that needs a refresh) without internet.
  function viewOfflineLocked() {
    S.locked = true;
    const expired = S.premium && store.get(uk('cse-pack'));
    shell(null, `<div class="card empty" style="text-align:center"><div style="font-size:44px">📡</div><h2 style="margin:6px 0">Walang internet</h2>
      <p class="muted">${expired ? 'Kailangang kumonekta sa internet para ma-update ang Premium at mga tanong mo (kahit isang beses bawat 30 araw).'
        : 'Kailangan ng internet sa libreng plan. Sa <b>Premium</b>, gumagana ang app kahit offline: lahat ng practice, mock exam, at exam set, nang walang hinihintay.'}</p>
      <button class="btn" id="retry">Subukan ulit</button></div>`);
    $('#retry').onclick = async () => { try { await refreshMe(); route(); } catch { toast('Wala pa ring internet.'); } };
  }
  window.addEventListener('hashchange', route);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveAnswers(); });
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window._installPrompt = e; });

  function applyMe(me) { S.user = me.user; S.config = me.config; S.premium = me.premium; S.practiceToday = me.practice_today || 0; }
  async function refreshMe() {
    const me = await api('GET', '/api/me');
    applyMe(me);
    if (me.user) { store.set('cse-boot', me); syncSoon(); } else { store.del('cse-boot'); if (IS_APP) store.del('cse-token'); }
  }
  const stateKey = () => JSON.stringify([S.user && S.user.id, S.user && S.user.email_verified, S.premium, S.config && S.config.premium_required]);
  async function init() {
    // Open instantly with the account saved on this device, then check with the server in the background.
    const boot = store.get('cse-boot'), meta = store.get('cse-meta');
    let shown = false;
    if (boot && boot.user && meta && !S.meta) {
      applyMe(boot); S.meta = meta;
      if (!navigator.onLine) setOffline(true);
      route(); shown = true;
    }
    const before = stateKey();
    try {
      const [, m] = await Promise.all([refreshMe(), api('GET', '/api/meta')]);
      S.meta = m; store.set('cse-meta', m);
      if (!shown || (stateKey() !== before && !S.exam)) route();
    } catch (e) {
      if (shown) { if (S.offline && !canOffline() && !S.exam) route(); return; }
      $app.innerHTML = e.offline
        ? '<main class="wrap"><div class="card empty" style="margin-top:18vh;text-align:center"><div style="font-size:44px">📡</div><h2 style="margin:6px 0">Walang internet</h2><p class="muted">Kumonekta sa internet para mag-login. Sa Premium, gumagana na ang app kahit offline pagkatapos noon.</p><button class="btn" onclick="location.reload()">Subukan ulit</button></div></main>'
        : '<div class="boot">Hindi makakonekta sa server. I-refresh ang page.</div>';
      return;
    }
    if (!S.offline) syncNow();
  }
  init();

  /* ---------------- automatic updates ----------------
     New screens download in the background. They are switched in only at a safe moment: when the app
     opens, or when it is in the background and the user is not in the middle of anything
     (no exam or practice, no open window, nothing typed). */
  const busy = () => !!S.exam || !!document.querySelector('.modal-bg')
    || $$('input, textarea').some((el) => (el.type === 'checkbox' || el.type === 'radio' ? el.checked !== el.defaultChecked : el.value !== el.defaultValue));
  const markUpdated = () => store.set('cse-updated', 1);
  if (store.get('cse-updated')) { store.del('cse-updated'); setTimeout(() => toast('Na-update ang app sa bagong bersyon.'), 600); }

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
