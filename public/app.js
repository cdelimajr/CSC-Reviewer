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
  async function api(method, url, body) {
    const res = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
    let data = null;
    try { data = await res.json(); } catch { /* empty */ }
    if (!res.ok) { const e = new Error((data && data.error) || 'May problema sa koneksyon.'); e.status = res.status; throw e; }
    return data;
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
        <a class="brand" href="#/"><img src="/icons/icon.svg" alt="">CSE Reviewer</a>
        <span class="spacer"></span>
        <nav class="nav-desktop row" style="gap:2px">${links.map(([k, h, l]) => `<a class="link ${active === k ? 'active' : ''}" href="${h}">${l}</a>`).join('')}</nav>
      </header>
      <main class="wrap">${body}</main>
      <nav class="bottomnav">${links.map(([k, h, l, ic]) => `<a class="${active === k ? 'active' : ''}" href="${h}"><span class="ic">${ic}</span>${l}</a>`).join('')}</nav>`;
    window.scrollTo(0, 0);
  }

  /* ---------------- auth screens ---------------- */
  function viewAuth(mode) {
    const reg = mode === 'register';
    $app.innerHTML = `
      <main class="wrap">
        <div class="hero">
          <img class="logo" src="/icons/icon.svg" alt="">
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
        </div>
        <div class="features auth" style="max-width:880px">
          <div class="feature"><b>Professional at Subprofessional</b>170 at 165 na tanong, may timer na 3h10m at 2h40m.</div>
          <div class="feature"><b>Practice kada subject</b>Verbal, Numerical, Analytical, Clerical at General Info, may paliwanag sa bawat sagot.</div>
          <div class="feature"><b>Laging bagong tanong</b>Iba-iba ang mga tanong sa bawat mock exam.</div>
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
        S.user = r.user;
        toast(reg ? `Maligayang pagdating, ${r.user.name}!` : 'Naka-login ka na.');
        go('#/');
      } catch (err) { $('#err').textContent = err.message; btn.disabled = false; }
    };
  }

  /* ---------------- home ---------------- */
  async function viewHome() {
    shell('home', '<div class="empty">Naglo-load…</div>');
    const [list, stats] = await Promise.all([api('GET', '/api/attempts'), api('GET', '/api/stats')]);
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
        <button class="btn" data-start="${e.key}">Simulan ang exam</button>
      </div>`;
    shell('home', `
      <h1>Kumusta, ${esc(S.user.name.split(' ')[0])}! 👋</h1>
      <p class="muted" style="margin-top:0">Pumili ng mock exam o mag-practice kada subject.</p>
      ${open.length ? `<div class="notice" style="margin:12px 0">May hindi ka pa natatapos na exam: <b>${esc(open[0].title)}</b>. <a href="#/exam/${open[0].id}">Ituloy ito →</a></div>` : ''}
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
    $$('[data-start]').forEach((b) => (b.onclick = () => startExam(b.dataset.start)));
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
      <div class="grow"><div class="ellipsis"><b>${esc(a.title)}</b></div><div class="muted small">${fmtDate(a.finished_at || a.started_at)}</div></div>
      ${a.finished_at ? `<span class="pill ${a.mode === 'practice' ? '' : pass ? 'ok' : 'bad'}">${p}%</span>` : '<span class="pill warn">Hindi tapos</span>'}
    </a>`;
  }

  async function startExam(mode, opts = {}) {
    if (mode !== 'practice') {
      const e = S.meta.exams[mode];
      const ok = await confirmBox(`Simulan ang ${e.title}?`, `Mayroon itong <b>${e.items} tanong</b> at <b>${fmtDur(e.minutes)}</b> na oras, tulad ng totoong CSE. Tuloy-tuloy ang timer kahit isara mo ang app, pero naka-save ang mga sagot mo. Kailangan ng ${e.passing}% para pumasa.`, 'Simulan na');
      if (!ok) return;
    }
    try {
      const a = await api('POST', '/api/attempts', { mode, ...opts });
      go('#/exam/' + a.id);
    } catch (e) { toast(e.message); }
  }

  /* ---------------- practice setup ---------------- */
  function viewPractice() {
    const st = { subject: 'verbal', count: 20, minutes: 0, level: 'pro' };
    const subs = S.meta.subjects;
    shell('practice', `
      <h1>Practice kada subject</h1>
      <p class="muted" style="margin-top:0">Makikita agad kung tama o mali ang sagot mo, kasama ang paliwanag.</p>
      <div class="card">
        <h3>1. Pumili ng subject</h3>
        <div class="subject-grid" id="subs">${Object.entries(subs).map(([k, v]) => `<button class="subject-btn" data-s="${k}"><b>${esc(v.name)}</b><span>${esc(v.desc)}</span></button>`).join('')}</div>
        <h3 style="margin-top:18px">2. Ilang tanong?</h3>
        <div class="seg" id="cnt">${[10, 20, 30, 50].map((n) => `<button data-n="${n}">${n}</button>`).join('')}</div>
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
    $$('#cnt [data-n]').forEach((b) => (b.onclick = () => { st.count = +b.dataset.n; paint(); }));
    $$('#tm [data-m]').forEach((b) => (b.onclick = () => { st.minutes = +b.dataset.m; paint(); }));
    $('#go').onclick = (e) => { e.target.disabled = true; startExam('practice', { ...st, level: st.subject === 'clerical' ? 'subpro' : 'pro' }).finally(() => (e.target.disabled = false)); };
    paint();
  }

  /* ---------------- exam ---------------- */
  async function viewExam(id) {
    const a = await api('GET', '/api/attempts/' + id);
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
    try {
      const r = await api('POST', `/api/attempts/${ex.a.id}/submit`, { answers: ex.answers });
      try { localStorage.removeItem('cse-ans-' + ex.a.id); localStorage.removeItem('cse-flag-' + ex.a.id); } catch { /* ignore */ }
      S.exam = null; document.onkeydown = null;
      go('#/result/' + r.id);
    } catch (e) { ex.submitting = false; toast(e.message + ' Subukan ulit.'); }
  }

  /* ---------------- results ---------------- */
  async function viewResult(id) {
    const a = await api('GET', '/api/attempts/' + id);
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
    shell('history', '<div class="empty">Naglo-load…</div>');
    const [list, stats] = await Promise.all([api('GET', '/api/attempts'), api('GET', '/api/stats')]);
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
      const a = list.find((x) => String(x.id) === id);
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
      <div class="card" style="margin-top:12px">
        <h3>Palitan ang password</h3>
        <form id="pwf"><label>Kasalukuyang password</label><input type="password" id="cur" autocomplete="current-password">
        <label>Bagong password</label><input type="password" id="npw" autocomplete="new-password" placeholder="8 characters o higit pa">
        <div class="err" id="err"></div><button class="btn" type="submit">I-save</button></form>
      </div>
      <div class="card" style="margin-top:12px">
        <h3>I-install sa phone</h3>
        <p class="muted small" style="margin:0 0 10px"><b>Android (Chrome):</b> pindutin ang ⋮ menu → "Add to Home screen" o "Install app".<br><b>iPhone (Safari):</b> pindutin ang Share (□↑) → "Add to Home Screen".</p>
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
    $('#logout').onclick = async () => { await api('POST', '/api/auth/logout'); S.user = null; go('#/login'); };
    if (window._installPrompt) { const b = $('#install'); b.hidden = false; b.onclick = () => window._installPrompt.prompt(); }
  }

  /* ---------------- admin ---------------- */
  async function viewAdmin(tab = 'overview') {
    if (S.user.role !== 'admin') return go('#/');
    const tabs = [['overview', 'Overview'], ['users', 'Users'], ['questions', 'Mga tanong'], ['results', 'Resulta']];
    shell('admin', `<h1>Admin</h1><div class="tabs">${tabs.map(([k, l]) => `<button data-t="${k}" class="${k === tab ? 'active' : ''}">${l}</button>`).join('')}</div><div id="adm"><div class="empty">Naglo-load…</div></div>`);
    $$('.tabs [data-t]').forEach((b) => (b.onclick = () => go('#/admin/' + b.dataset.t)));
    const el = $('#adm');
    try {
      if (tab === 'overview') await admOverview(el);
      else if (tab === 'users') await admUsers(el);
      else if (tab === 'questions') await admQuestions(el);
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
      <div class="card" style="margin-top:12px"><h3>Question bank (${totalQ} nakasulat na tanong)</h3>
        <table><tr><th>Subject</th><th>Bilang</th></tr>${o.questions.map((q) => `<tr><td>${esc(subjName(q.subject))}</td><td>${q.n}</td></tr>`).join('')}</table>
        <p class="muted small">Bukod dito, awtomatikong gumagawa ang app ng bagong tanong para sa Numerical, Analytical, Clerical at vocabulary, kaya iba-iba ang bawat exam.</p></div>`;
  }
  async function admUsers(el) {
    const paint = async (q = '') => {
      const users = await api('GET', '/api/admin/users?q=' + encodeURIComponent(q));
      $('#ut').innerHTML = users.map((u) => `
        <tr><td><b>${esc(u.name)}</b><div class="muted small">${esc(u.email)}</div></td>
        <td>${u.role === 'admin' ? '<span class="pill">Admin</span>' : 'User'} ${u.disabled ? '<span class="pill bad">Disabled</span>' : ''}</td>
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
        <button class="btn secondary" data-a="pw">I-reset ang password</button>
        <button class="btn secondary" data-a="hist">Tingnan ang mga resulta</button>
        <button class="btn danger" data-a="del">Burahin ang account</button>
        <button class="btn ghost" data-a="x">Isara</button>
      </div><div id="extra"></div>`, (bg, close) => {
      const act = async (fn, msg) => { try { await fn(); toast(msg); close(); refresh(); } catch (e) { toast(e.message); } };
      $('[data-a=x]', bg).onclick = close;
      $('[data-a=role]', bg).onclick = () => act(() => api('PATCH', '/api/admin/users/' + u.id, { role: u.role === 'admin' ? 'user' : 'admin' }), 'Na-update ang role.');
      $('[data-a=disable]', bg).onclick = () => act(() => api('PATCH', '/api/admin/users/' + u.id, { disabled: !u.disabled }), u.disabled ? 'Na-enable.' : 'Na-disable.');
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
    if (!S.user) { if (p0 === 'register') return viewAuth('register'); return viewAuth('login'); }
    try {
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
      shell('', `<div class="card empty"><p>${esc(e.message)}</p><a class="btn" href="#/">Bumalik sa Home</a></div>`);
    }
  }
  window.addEventListener('hashchange', route);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveAnswers(); });
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window._installPrompt = e; });

  (async function init() {
    try {
      const [me, meta] = await Promise.all([api('GET', '/api/me'), api('GET', '/api/meta')]);
      S.user = me.user; S.meta = meta;
    } catch { $app.innerHTML = '<div class="boot">Hindi makakonekta sa server. I-refresh ang page.</div>'; return; }
    route();
  })();

  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
})();
