// End-to-end API check: accounts + email verification, exam sets, mock exams, premium payments, admin.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert');
process.env.DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cse-')), 'test.db');
process.env.NODE_ENV = 'test';
process.env.REQUIRE_EMAIL_VERIFICATION = '1';
process.env.INITIAL_SETS = '3';
process.env.PAYMONGO_SECRET_KEY = 'sk_test_key';
process.env.PAYMONGO_WEBHOOK_SECRET = 'whsk_test_secret';
const app = require('../src/server');
const mail = require('../src/mail');

const lastCode = (to) => {
  const m = [...mail.outbox].reverse().find((x) => x.to === to && /code/i.test(x.subject));
  return m && m.text.match(/(\d{6})/)[1];
};

(async () => {
  await app.ready;
  const srv = app.listen(0);
  const base = `http://127.0.0.1:${srv.address().port}`;
  // A browser: keeps its cookies; with a device ID it also sends X-Device like the app does.
  const client = (device) => {
    const jar = new Map();
    return async (method, url, body) => {
      const headers = { 'Content-Type': 'application/json', cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') };
      const dev = typeof device === 'function' ? device() : device;
      if (dev) headers['X-Device'] = dev;
      const r = await fetch(base + url, { method, headers, body: body && JSON.stringify(body) });
      for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar.set(kv.slice(0, i), kv.slice(i + 1)); }
      return { status: r.status, data: await r.json() };
    };
  };
  const A = client(), U = client();

  // Register + verify email
  let r = await A('POST', '/api/auth/register', { name: 'Admin', email: 'admin@test.ph', password: 'password123' });
  assert.equal(r.data.user.role, 'admin', 'first user is admin');
  assert.equal(r.data.user.email_verified, false);
  assert.equal((await A('GET', '/api/stats')).status, 403, 'unverified blocked');
  assert.equal((await A('POST', '/api/auth/verify', { code: '000000' })).status, 400);
  r = await A('POST', '/api/auth/verify', { code: lastCode('admin@test.ph') });
  assert.equal(r.data.user.email_verified, true);
  await U('POST', '/api/auth/register', { name: 'Juan', email: 'juan@test.ph', password: 'password123' });
  await U('POST', '/api/auth/verify', { code: lastCode('juan@test.ph') });
  assert.equal((await U('POST', '/api/auth/register', { name: 'X', email: 'juan@test.ph', password: 'password123' })).status, 409);

  // Forgot / reset password
  await client()('POST', '/api/auth/forgot', { email: 'juan@test.ph' });
  assert.equal((await client()('POST', '/api/auth/reset', { email: 'juan@test.ph', code: lastCode('juan@test.ph'), password: 'newpass123' })).status, 200);
  assert.equal((await U('GET', '/api/stats')).status, 401, 'old sessions ended after reset');
  assert.equal((await U('POST', '/api/auth/login', { email: 'juan@test.ph', password: 'newpass123' })).status, 200);

  // Login with a code sent to the email
  const O = client();
  assert.equal((await O('POST', '/api/auth/otp', { email: 'nobody@test.ph' })).status, 200, 'same answer for unknown email');
  assert.equal((await O('POST', '/api/auth/otp', { email: 'juan@test.ph' })).status, 200);
  assert.equal((await O('POST', '/api/auth/otp/login', { email: 'juan@test.ph', code: '000000' })).status, 400);
  r = await O('POST', '/api/auth/otp/login', { email: 'juan@test.ph', code: lastCode('juan@test.ph') });
  assert.equal(r.status, 200); assert.equal(r.data.user.email, 'juan@test.ph');
  assert.equal((await O('GET', '/api/stats')).status, 200, 'logged in with code');

  // Offline login coming back online: a newer login on another device wins
  const B = client();
  r = await B('POST', '/api/auth/login', { email: 'juan@test.ph', password: 'newpass123', since: Date.now() - 60e3 });
  assert.equal(r.status, 409, 'newer login elsewhere wins'); assert.equal(r.data.code, 'replaced');
  assert.equal((await O('GET', '/api/stats')).status, 200, 'newer session kept');
  r = await B('POST', '/api/auth/login', { email: 'juan@test.ph', password: 'newpass123', since: Date.now() + 1000 });
  assert.equal(r.status, 200, 'no newer login: offline login goes online');
  r = await O('POST', '/api/auth/otp', { email: 'juan@test.ph' });
  r = await O('POST', '/api/auth/otp/login', { email: 'juan@test.ph', code: lastCode('juan@test.ph') });
  assert.equal(r.status, 200);
  assert.equal((await client()('POST', '/api/auth/otp/login', { email: 'juan@test.ph', code: lastCode('juan@test.ph') })).status, 400, 'code works once');

  // One login at a time: the code login above ended the older session, and that device is told why
  r = await U('GET', '/api/stats');
  assert.equal(r.status, 401); assert.equal(r.data.code, 'replaced', 'old device: logged in on another device');
  assert.equal((await U('GET', '/api/me')).data.ended, 'replaced');
  r = await U('POST', '/api/auth/login', { email: 'juan@test.ph', password: 'newpass123' });
  assert.equal(r.data.others, 1, 'the new login says one other device was logged out');
  assert.equal((await O('GET', '/api/stats')).data.code, 'replaced');
  assert.equal((await U('GET', '/api/stats')).status, 200);

  // Fingerprint/face login: a device key that logs in without a password
  assert.equal((await client()('POST', '/api/auth/device', {})).status, 401);
  r = await U('POST', '/api/auth/device', { name: 'Test phone' });
  const devKey = r.data.key;
  assert.match(devKey, /^\d+\.[a-f0-9]{64}$/);
  const D = client();
  assert.equal((await D('POST', '/api/auth/device/login', { key: devKey.slice(0, -1) + (devKey.endsWith('0') ? '1' : '0') })).status, 401, 'wrong key');
  assert.equal((await D('POST', '/api/auth/device/login', { key: devKey })).status, 200);
  assert.equal((await D('GET', '/api/stats')).status, 200, 'logged in with device key');
  assert.equal((await U('GET', '/api/stats')).status, 401, 'device login also ends the other session');
  await U('POST', '/api/auth/login', { email: 'juan@test.ph', password: 'newpass123' });
  await D('POST', '/api/auth/device/remove', { key: devKey });
  assert.equal((await client()('POST', '/api/auth/device/login', { key: devKey })).status, 401, 'removed key stops working');

  // Exam sets (newest first) and mock exams
  r = await U('GET', '/api/sets?mode=pro');
  assert.equal(r.data.length, 3); assert.equal(r.data[0].number, 3, 'newest first');
  // 🆕 Each set has its own questions: Set 2 uses none of Set 1's written (bank) questions
  {
    const { textKey } = require('../src/exam');
    for (const mode of ['pro', 'subpro']) {
      const rows = await require('../src/db').all('SELECT number, items FROM exam_sets WHERE mode = ? AND number <= 2 ORDER BY number', mode);
      const bankKeys = (row) => JSON.parse(row.items).filter((it) => it.qid).map(textKey);
      const one = new Set(bankKeys(rows[0]));
      assert.ok(bankKeys(rows[1]).length > 20, mode + ': sets have written questions');
      assert.equal(bankKeys(rows[1]).filter((k) => one.has(k)).length, 0, mode + ': Set 2 has other questions than Set 1');
    }
  }
  // Set 1 always exists: it cannot be deleted, and if it is missing it is made again
  const set1 = r.data.find((x) => x.number === 1);
  assert.equal((await A('DELETE', '/api/admin/sets/' + set1.id)).status, 400, 'Set 1 cannot be deleted');
  await require('../src/db').run('DELETE FROM exam_sets WHERE id = ?', set1.id);
  await require('../src/sets').ensureSets();
  r = await U('GET', '/api/sets?mode=pro');
  assert.equal(r.data.length, 3); assert.equal(r.data[r.data.length - 1].number, 1, 'Set 1 made again');
  r = await U('POST', '/api/attempts', { mode: 'pro', set_id: r.data[0].id });
  assert.equal(r.data.items.length, 170); assert.ok(r.data.title.includes('Set 3'));
  assert.ok(r.data.items.every((i) => i.choices.length === 4 && i.answer === undefined), 'answers hidden');
  // 🔀 Each time a set is taken: the same questions in a new order. Subjects keep their place (like the
  // sections of the real exam) and the questions of one reading passage stay together.
  {
    const sid = (await U('GET', '/api/sets?mode=pro')).data[0].id;
    const t1 = r.data.items, t2 = (await U('POST', '/api/attempts', { mode: 'pro', set_id: sid })).data.items;
    const k = (it) => `${it.subject}|${it.question}|${it.passage}|${[...it.choices].sort().join('|')}`;
    assert.deepEqual(t1.map(k).sort(), t2.map(k).sort(), 'a set has the same questions each time');
    assert.notDeepEqual(t1.map(k), t2.map(k), 'in a new order each time');
    assert.notDeepEqual(t1.map((it) => it.choices.join('|')), t2.map((it) => it.choices.join('|')), 'and the choices too');
    const runs = (t) => t.filter((it, i) => i === 0 || it.subject !== t[i - 1].subject).map((it) => it.subject);
    assert.deepEqual(runs(t1), ['verbal', 'analytical', 'numerical', 'general'], 'subjects keep their place');
    assert.deepEqual(runs(t2), runs(t1));
    for (const t of [t1, t2]) {
      const started = new Set();
      t.forEach((it, i) => {
        if (!it.passage || (i > 0 && t[i - 1].passage === it.passage)) return;
        assert.ok(!started.has(it.passage), 'passage questions stay together'); started.add(it.passage);
      });
    }
  }
  for (const [mode, n] of [['pro', 170], ['subpro', 165]]) {
    r = await U('POST', '/api/attempts', { mode });
    assert.equal(r.data.items.length, n, mode + ' item count');
    const id = r.data.id;
    const answers = {}; r.data.items.forEach((_, i) => (answers[i] = i % 4));
    assert.equal((await U('PUT', `/api/attempts/${id}/answers`, { answers })).status, 200);
    r = await U('POST', `/api/attempts/${id}/submit`, {});
    assert.ok(r.data.finished_at && typeof r.data.score === 'number');
    assert.ok(r.data.items[0].answer !== undefined, 'answers revealed after submit');
  }
  assert.ok(mail.outbox.some((m) => m.to === 'juan@test.ph' && m.subject.startsWith('Resulta')), 'result email sent');
  r = await U('POST', '/api/attempts', { mode: 'practice', subject: 'general', count: 20 });
  assert.equal(r.data.items.length, 20);
  // Practice and "Bagong halo": the questions seen lately come last
  {
    const { buildExam, textKey } = require('../src/exam');
    const p1 = (await buildExam('practice', { subject: 'general', count: 20 })).items;
    const avoid = new Map(p1.map((it) => [textKey(it), 1]));
    const p2 = (await buildExam('practice', { subject: 'general', count: 20, avoid })).items;
    assert.equal(p2.filter((it) => avoid.has(textKey(it))).length, 0, 'practice: questions seen lately come last');
  }

  // Premium: turn on, user blocked from mock exams, pays, admin approves
  await A('PUT', '/api/admin/settings', { premium_required: '1', price: '99', plan_days: '30', pay_number: '09171234567' });
  assert.equal((await U('POST', '/api/attempts', { mode: 'pro' })).status, 402, 'premium required');
  assert.equal((await U('POST', '/api/attempts', { mode: 'practice', subject: 'verbal' })).status, 200, 'practice stays free');
  // Free plan limits: 3 practice a day (up to 10 items), Set 1 only, no offline
  r = await U('POST', '/api/attempts', { mode: 'practice', subject: 'numerical', count: 50 });
  assert.equal(r.data.items.length, 10, 'free practice capped at 10 items');
  assert.equal((await U('POST', '/api/attempts', { mode: 'practice', subject: 'verbal' })).status, 402, 'daily practice limit');
  assert.equal((await U('GET', '/api/me')).data.practice_today, 3);
  r = await U('GET', '/api/sets?mode=pro');
  const s1 = r.data.find((x) => x.number === 1), s3 = r.data.find((x) => x.number === 3);
  assert.equal(s1.locked, false); assert.equal(s3.locked, true);
  assert.equal((await U('POST', '/api/attempts', { mode: 'pro', set_id: s3.id })).status, 402, 'other sets need Premium');
  r = await U('POST', '/api/attempts', { mode: 'pro', set_id: s1.id });
  assert.equal(r.status, 402, 'free plan: one mock exam a day (Juan already took some today)'); assert.equal(r.data.code, 'mock_daily');
  // A new free user: Set 1 once a day (5 questions per subject), review of 5 per subject, no email of the full review
  const F = client();
  await F('POST', '/api/auth/register', { name: 'Free', email: 'free@test.ph', password: 'password123' });
  await F('POST', '/api/auth/verify', { code: lastCode('free@test.ph') });
  r = await F('POST', '/api/attempts', { mode: 'subpro', set_id: (await F('GET', '/api/sets?mode=subpro')).data.find((x) => x.number === 1).id });
  assert.equal(r.status, 200, 'Set 1 is free');
  assert.equal(r.data.items.length, 20, 'free mock exam: 5 questions per subject (4 subjects)');
  assert.ok(Object.values(r.data.items.reduce((o, it) => ((o[it.subject] = (o[it.subject] || 0) + 1), o), {})).every((n) => n === 5));
  assert.equal(r.data.time_limit_sec, Math.round((160 * 20) / 165) * 60, 'time cut to the same pace as the full exam');
  const fid = r.data.id;
  assert.equal((await F('GET', '/api/me')).data.mock_today, 1);
  assert.equal((await F('POST', '/api/attempts', { mode: 'pro', set_id: s1.id })).status, 402, 'second mock exam today is blocked (server, per account)');
  r = await F('POST', `/api/attempts/${fid}/submit`, { answers: { 0: 1, 1: 2 } });
  assert.equal(r.data.lite, true, 'free review is short');
  assert.equal(r.data.review_per_subject, 5);
  assert.ok(r.data.items.every((it) => !it.locked && it.question && it.explanation !== undefined), 'free mock: all 5 per subject have a review');
  assert.ok(r.data.items.every((it) => it.explanation.includes('Quick Note: ')), 'every reviewed question has a Quick Note');
  // 10 full solutions a day on the free plan: the first 10 questions of this mock, then the answer and Quick Note only
  assert.ok(r.data.items.slice(0, 10).every((it) => !it.ex_locked), 'first 10: full solution');
  assert.ok(r.data.items.slice(10).every((it) => it.ex_locked && it.explanation.startsWith('Quick Note: ') && it.answer !== undefined), 'the rest: answer + Quick Note, steps locked');
  let me = (await F('GET', '/api/me')).data;
  assert.equal(me.solutions_left, 0, 'no free solutions left today');
  assert.equal(me.full_trials_left, 1, 'one free full-length mock exam');
  assert.equal(me.config.free.solutions_daily, 10);
  assert.ok(me.config.prices && me.config.prices.month === 99, 'prices for the Premium offers');
  // Free practice: the first 5 questions have a review, the rest only the subject and letter
  r = await F('POST', '/api/attempts', { mode: 'practice', subject: 'verbal', count: 10 });
  assert.equal(r.data.items.length, 10);
  assert.ok(r.data.items.every((it) => it.ex_locked && !/Step 1:/.test(it.explanation)), 'practice after the daily solutions: steps locked');
  r = await F('POST', `/api/attempts/${r.data.id}/submit`, { answers: {} });
  assert.equal(r.data.lite, true, 'free practice review is short');
  assert.equal(r.data.items.filter((it) => !it.locked && it.question).length, 5, 'review of 5 questions per subject');
  assert.ok(r.data.items.filter((it) => it.locked).every((it) => Object.keys(it).sort().join() === 'answer,locked,subject'), 'the rest: no question, choices or explanation');
  assert.ok(r.data.breakdown && typeof r.data.score === 'number', 'score per subject');
  assert.equal((await F('GET', `/api/attempts/${fid}`)).data.lite, true);
  assert.equal((await F('POST', `/api/attempts/${fid}/email`, {})).status, 402, 'email of the full review is Premium');
  assert.equal((await A('GET', `/api/attempts/${fid}`)).data.lite, undefined, 'admin sees the full review');
  assert.ok((await A('GET', `/api/attempts/${fid}`)).data.items.every((it) => !it.ex_locked), 'admin sees every solution');
  // One free full-length mock exam per account (all of Set 1, full time)
  const G = client();
  await G('POST', '/api/auth/register', { name: 'Trial', email: 'trial@test.ph', password: 'password123' });
  await G('POST', '/api/auth/verify', { code: lastCode('trial@test.ph') });
  r = await G('POST', '/api/attempts', { mode: 'pro', set_id: s1.id, full: true });
  assert.equal(r.status, 200, 'free full-length mock exam');
  assert.equal(r.data.items.length, 170, 'all 170 questions');
  assert.equal(r.data.time_limit_sec, 190 * 60, 'full time');
  assert.equal(r.data.full_trial, true);
  assert.equal((await G('GET', '/api/me')).data.full_trials_left, 0, 'the free full exam is used');
  await A('PUT', '/api/admin/settings', { free_mock_daily: '5' });
  assert.equal((await G('POST', '/api/attempts', { mode: 'pro', set_id: s1.id, full: true })).status, 402, 'only once');
  assert.equal((await G('POST', '/api/attempts', { mode: 'pro', set_id: s1.id })).data.items.length, 20, 'the mini mock still works');
  await A('PUT', '/api/admin/settings', { free_mock_daily: '1' });
  // Free limits also count per device (1.40.0): a second free account on the same device gets no new allowance.
  const DEV = 'web-11111111-2222-3333-4444-555555555555';
  const newFree = async (C, email) => { await C('POST', '/api/auth/register', { name: 'Dev', email, password: 'password123' }); await C('POST', '/api/auth/verify', { code: lastCode(email) }); };
  const D1 = client(DEV), D2 = client(DEV), D3 = client('web-99999999-8888-7777-6666-555555555555');
  await newFree(D1, 'dev1@test.ph');
  r = await D1('POST', '/api/attempts', { mode: 'pro', set_id: s1.id, full: true });
  assert.equal(r.status, 200, 'first free account on the device: free full mock exam');
  for (let i = 0; i < 3; i++) assert.equal((await D1('POST', '/api/attempts', { mode: 'practice', subject: 'verbal' })).status, 200);
  await newFree(D2, 'dev2@test.ph');
  me = (await D2('GET', '/api/me')).data;
  assert.deepEqual([me.mock_today, me.practice_today, me.full_trials_left, me.solutions_left], [1, 3, 0, 0], 'second account on the same device sees the device usage');
  r = await D2('POST', '/api/attempts', { mode: 'pro', set_id: s1.id });
  assert.equal(r.status, 402, 'same device: no new mock exam today'); assert.equal(r.data.code, 'mock_daily');
  assert.equal((await D2('POST', '/api/attempts', { mode: 'practice', subject: 'verbal' })).status, 402, 'same device: no new practice today');
  await A('PUT', '/api/admin/settings', { free_mock_daily: '5' });
  assert.equal((await D2('POST', '/api/attempts', { mode: 'pro', set_id: s1.id, full: true })).status, 402, 'same device: the free full mock exam is used');
  r = await D2('POST', '/api/attempts', { mode: 'pro', set_id: s1.id });
  assert.equal(r.status, 200); assert.equal(r.data.sol_free, undefined);
  assert.ok(r.data.items.every((it) => it.answer === undefined), 'mock exam answers stay hidden');
  await A('PUT', '/api/admin/settings', { free_mock_daily: '1' });
  await newFree(D3, 'dev3@test.ph');
  assert.equal((await D3('POST', '/api/attempts', { mode: 'pro', set_id: s1.id })).status, 200, 'another device: its own free allowance');
  // The website keeps the device ID in a cookie too: clearing only the browser storage keeps the same device.
  let d4 = 'web-00000000-aaaa-bbbb-cccc-dddddddddddd';
  const D4 = client(() => d4);
  await newFree(D4, 'dev4@test.ph');
  assert.equal((await D4('POST', '/api/attempts', { mode: 'pro', set_id: s1.id })).status, 200);
  await D4('POST', '/api/auth/logout');
  d4 = 'web-00000000-eeee-ffff-0000-111111111111'; // the browser storage was cleared: a new random ID, same cookie
  await newFree(D4, 'dev5@test.ph');
  assert.equal((await D4('POST', '/api/attempts', { mode: 'pro', set_id: s1.id })).status, 402, 'the device cookie keeps the same device');
  assert.equal((await U('GET', '/api/offline/pack')).status, 402, 'offline is Premium only');
  // App installers (latest GitHub Release, faked here): only .apk and .exe, only for paid users
  const releases = require('../src/releases');
  const dl = (n) => `https://github.com/x/y/releases/download/v1.0.9/${n}`;
  releases._set({ tag_name: 'v1.0.9', html_url: 'https://github.com/x/y/releases/tag/v1.0.9', published_at: new Date().toISOString(),
    assets: ['CSE-Reviewer-1.0.9-portable.exe', 'CSE-Reviewer-Setup-1.0.9.exe', 'CSE-Reviewer-Setup-1.0.9.exe.blockmap', 'CSE-Reviewer-unsigned.ipa', 'CSE-Reviewer.apk', 'latest.yml']
      .map((name) => ({ name, size: 1048576 * 10, browser_download_url: dl(name) })) });
  assert.equal((await U('GET', '/api/app/installers')).status, 403, 'no installers before paying');
  assert.equal((await F('GET', '/api/app/installers')).status, 403, 'no installers for free users');
  r = await A('GET', '/api/app/installers');
  assert.equal(r.status, 200, 'admin sees the installers');
  assert.deepEqual(r.data.files.map((f) => f.kind), ['apk', 'setup', 'portable'], 'only .apk and .exe, Android first');
  assert.equal(r.data.version, '1.0.9');
  // No refunds: the box must be ticked before paying (checked by the server too)
  r = await U('POST', '/api/payments', { reference: 'GC123456' });
  assert.equal(r.status, 400); assert.equal(r.data.code, 'no_refund', 'manual payment needs the no-refund tick');
  assert.equal((await U('POST', '/api/payments', { agree_no_refund: true, reference: 'GC123456', amount: '1' })).status, 200);
  assert.ok(mail.outbox.some((m) => m.to === 'admin@test.ph' && m.subject.startsWith('Bagong bayad')), 'admin notified');
  // Admin's Premium sound: the newest waiting and approved payment times
  assert.equal((await U('GET', '/api/admin/premium-ping')).status, 403, 'premium ping is admin only');
  const ping0 = (await A('GET', '/api/admin/premium-ping')).data;
  assert.ok(ping0.pending_at > 0, 'premium ping sees the waiting payment');
  r = await A('GET', '/api/admin/payments');
  assert.equal(r.data.length, 1);
  assert.equal(r.data[0].amount, '99', 'manual payment amount is the price, not what the app sent');
  r = await A('POST', `/api/admin/payments/${r.data[0].id}`, { action: 'approve' });
  assert.ok(r.data.until > Date.now() + 29 * 864e5);
  assert.ok((await A('GET', '/api/admin/premium-ping')).data.paid_at > ping0.paid_at, 'premium ping sees the approval');
  r = await U('GET', '/api/premium'); assert.equal(r.data.active, true);
  // Receipt: in the approval email (with a PDF) and in Premium → Your payments; only for the owner (and admins)
  const apr = mail.outbox.filter((m) => m.to === 'juan@test.ph' && m.subject.startsWith('Aktibo na')).pop();
  assert.ok(/Resibo CSE-\d{4}-\d{5}/.test(apr.subject) && apr.attachments[0].startsWith('Resibo-CSE-'), 'receipt PDF in the approval email');
  assert.ok(apr.html.includes(dl('CSE-Reviewer.apk')) && apr.html.includes(dl('CSE-Reviewer-Setup-1.0.9.exe')) && !apr.html.includes('.ipa'), 'installers in the approval email');
  assert.ok(apr.html.includes('Paano i-install sa Android') && apr.text.includes(dl('CSE-Reviewer.apk')), 'install guide in the approval email');
  const inst = await U('GET', '/api/app/installers');
  assert.equal(inst.status, 200, 'paid user gets the installers');
  assert.ok(inst.data.files.every((f) => /\.(apk|exe)$/.test(f.name)));
  const paidId = r.data.payments.find((x) => x.status === 'approved').id;
  r = await U('GET', `/api/payments/${paidId}/receipt`);
  assert.match(r.data.no, /^CSE-\d{4}-\d{5}$/); assert.equal(r.data.amount, '99'); assert.equal(r.data.days, 30);
  assert.ok(r.data.period_to - r.data.period_from === 30 * 864e5, 'receipt shows the Premium period');
  assert.equal(Buffer.from(require('../public/pdf').receipt(r.data).slice(0, 8)).toString(), '%PDF-1.4');
  assert.equal((await F('GET', `/api/payments/${paidId}/receipt`)).status, 404, 'not for other users');
  assert.equal((await A('GET', `/api/payments/${paidId}/receipt`)).status, 200, 'admin can see it');
  assert.equal((await U('POST', '/api/attempts', { mode: 'subpro' })).status, 200, 'premium unlocks mocks');

  // Online payment (PayMongo, faked here): checkout, signed webhook, Premium extended once only
  const sessions = {};
  const fake = require('express')().use(require('express').json())
    .post('/v1/checkout_sessions', (q, s) => {
      assert.equal(q.get('authorization'), 'Basic ' + Buffer.from('sk_test_key:').toString('base64'));
      const at = q.body.data.attributes;
      assert.ok(String(at.payment_method_types) === 'card' || (at.payment_method_types.includes('gcash') && at.payment_method_types.includes('paymaya')));
      assert.ok(at.billing && at.billing.email && at.billing.name, 'name and email filled in from the account');
      const cs = { id: 'cs_' + (Object.keys(sessions).length + 1), attributes: { reference_number: at.reference_number, line_items: at.line_items, payment_method_types: at.payment_method_types, status: 'active', payments: [], checkout_url: 'https://checkout.paymongo.test/' + at.reference_number } };
      sessions[cs.id] = cs; s.json({ data: cs });
    })
    .get('/v1/checkout_sessions/:id', (q, s) => (sessions[q.params.id] ? s.json({ data: sessions[q.params.id] }) : s.status(404).json({ errors: [{ detail: 'not found' }] })))
    .listen(0);
  process.env.PAYMONGO_API_URL = `http://127.0.0.1:${fake.address().port}`;
  const payIt = (cs, method) => Object.assign(cs.attributes, { payment_method_used: method, payments: [{ id: 'pay_' + cs.id, attributes: { status: 'paid', amount: cs.attributes.line_items[0].amount } }] });
  assert.equal((await U('GET', '/api/me')).data.config.online_pay, true);
  const before = (await U('GET', '/api/premium')).data.until;
  assert.equal((await U('POST', '/api/payments/checkout', {})).data.code, 'no_refund', 'online payment needs the no-refund tick');
  r = await U('POST', '/api/payments/checkout', { agree_no_refund: true });
  assert.ok(r.data.url.startsWith('https://checkout.paymongo.test/'), 'checkout link');
  assert.equal((await U('POST', '/api/payments/checkout', { agree_no_refund: true })).data.url, r.data.url, 'unpaid checkout reused');
  const cs1 = Object.values(sessions)[0];
  assert.equal(cs1.attributes.line_items[0].amount, 9900, 'amount in centavos');
  const crypto = require('node:crypto');
  const hook = (csId, secret = 'whsk_test_secret', t = Math.floor(Date.now() / 1000)) => {
    const body = JSON.stringify({ data: { id: 'evt_1', attributes: { type: 'checkout_session.payment.paid', livemode: false, data: { id: csId, attributes: { status: 'paid' } } } } });
    const sig = crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
    return fetch(base + '/api/payments/paymongo/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Paymongo-Signature': `t=${t},te=${sig},li=` }, body });
  };
  assert.equal((await hook(cs1.id, 'wrong')).status, 401, 'bad signature');
  assert.equal((await hook(cs1.id, 'whsk_test_secret', Math.floor(Date.now() / 1000) - 3600)).status, 401, 'old signature');
  // Webhook says paid but PayMongo says it is not: nothing changes
  assert.equal((await hook(cs1.id)).status, 200);
  assert.equal((await U('GET', '/api/premium')).data.until, before, 'body alone does not activate');
  payIt(cs1, 'gcash');
  assert.equal((await hook(cs1.id)).status, 200);
  await hook(cs1.id); // PayMongo may send it twice
  r = await U('GET', '/api/premium');
  assert.ok(Math.abs(r.data.until - (before + 30 * 864e5)) < 5000, 'premium extended by 30 days, once');
  const paid = r.data.payments.find((x) => x.provider === 'paymongo');
  assert.equal(paid.status, 'approved'); assert.equal(paid.method, 'GCash'); assert.equal(paid.checkout_url, null);
  assert.ok(mail.outbox.some((m) => m.to === 'juan@test.ph' && m.subject.startsWith('Aktibo na')), 'user emailed');
  assert.equal((await hook('cs_unknown')).status, 200, 'unknown checkouts ignored');
  // Paid while the webhook was late: opening the Premium page checks it
  await U('POST', '/api/payments/checkout', { agree_no_refund: true });
  payIt(Object.values(sessions)[1], 'paymaya');
  r = await U('GET', '/api/premium');
  assert.ok(Math.abs(r.data.until - (before + 60 * 864e5)) < 5000, 'premium page picks up the payment');
  // 💳 Card: a checkout with only the card option (straight to the card form), kept apart from the other checkout
  assert.equal(r.data.card, true, 'card option shown');
  const other = (await U('POST', '/api/payments/checkout', { agree_no_refund: true })).data.url;
  const cardUrl = (await U('POST', '/api/payments/checkout', { agree_no_refund: true, method: 'card' })).data.url;
  assert.notEqual(cardUrl, other, 'card has its own checkout');
  assert.deepEqual(Object.values(sessions).at(-1).attributes.payment_method_types, ['card']);
  assert.equal((await U('POST', '/api/payments/checkout', { agree_no_refund: true, method: 'card' })).data.url, cardUrl, 'unpaid card checkout reused');
  assert.equal((await U('POST', '/api/payments/checkout', { agree_no_refund: true })).data.url, other, 'other checkout reused');

  // 🏷️ Promo codes: made by the admin, checked and priced by the server, one use per account
  assert.equal((await U('GET', '/api/premium')).data.promo, false, 'no promo box without codes');
  assert.equal((await U('POST', '/api/admin/promos', { code: 'X', kind: 'percent', value: 10 })).status, 403, 'admins only');
  assert.equal((await A('POST', '/api/admin/promos', { code: 'a b', kind: 'percent', value: 10 })).status, 400, 'no spaces');
  assert.equal((await A('POST', '/api/admin/promos', { code: 'BIG', kind: 'percent', value: 150 })).status, 400, 'at most 100%');
  assert.equal((await A('POST', '/api/admin/promos', { code: 'review20', kind: 'percent', value: 20, max_uses: 1 })).data.code, 'REVIEW20', 'code in capitals');
  assert.equal((await A('POST', '/api/admin/promos', { code: 'Review20', kind: 'fixed', value: 5 })).status, 409, 'no two codes alike');
  await A('POST', '/api/admin/promos', { code: 'OLD', kind: 'fixed', value: 10, expires_at: Date.now() - 1000 });
  await A('POST', '/api/admin/promos', { code: 'MINUS90', kind: 'fixed', value: 90 });
  await A('POST', '/api/admin/promos', { code: 'FREE', kind: 'percent', value: 100, max_uses: 1 });
  assert.equal((await U('GET', '/api/premium')).data.promo, true, 'promo box shown');
  assert.equal((await U('POST', '/api/promo/check', { code: 'NOPE' })).status, 400, 'unknown code');
  assert.match((await U('POST', '/api/promo/check', { code: 'old' })).data.error, /Expired/, 'expired code');
  r = await U('POST', '/api/promo/check', { code: ' review20 ', price: 1 });
  assert.deepEqual([r.data.price, r.data.discount, r.data.amount, r.data.free], [99, 19.8, 79.2, false], 'price from the server, not the app');
  assert.equal((await U('POST', '/api/promo/check', { code: 'MINUS90' })).data.online, 20, 'online at least ₱20');
  assert.equal((await U('POST', '/api/payments/checkout', { agree_no_refund: true, code: 'NOPE' })).status, 400, 'bad code stops the checkout');
  const promoUrl = (await U('POST', '/api/payments/checkout', { agree_no_refund: true, code: 'REVIEW20', amount: 1 })).data.url;
  assert.notEqual(promoUrl, other, 'own checkout for the promo price');
  const csP = Object.values(sessions).at(-1);
  assert.equal(csP.attributes.line_items[0].amount, 7920, 'PayMongo charges the discounted price');
  assert.equal((await U('POST', '/api/payments/checkout', { agree_no_refund: true, code: 'REVIEW20' })).data.url, promoUrl, 'promo checkout reused');
  const untilP = (await U('GET', '/api/premium')).data.until;
  payIt(csP, 'gcash'); await hook(csP.id); await hook(csP.id);
  r = await U('GET', '/api/premium');
  assert.ok(Math.abs(r.data.until - (untilP + 30 * 864e5)) < 5000, 'promo payment adds the days');
  const pp = r.data.payments.find((x) => x.promo_code === 'REVIEW20');
  assert.equal(pp.amount, '79.2'); assert.equal(pp.discount, '19.8');
  assert.match((await U('GET', `/api/payments/${pp.id}/receipt`)).data.promo_code, /REVIEW20/, 'promo on the receipt');
  assert.match((await U('POST', '/api/promo/check', { code: 'REVIEW20' })).data.error, /Nagamit mo na/, 'one use per account');
  let promos = (await A('GET', '/api/admin/promos')).data.rows;
  assert.equal(promos.find((x) => x.code === 'REVIEW20').used, 1, 'counted once');
  assert.equal((await A('GET', `/api/admin/promos/${promos.find((x) => x.code === 'REVIEW20').id}/uses`)).data[0].email, 'juan@test.ph');
  assert.equal((await A('DELETE', '/api/admin/promos/' + promos.find((x) => x.code === 'REVIEW20').id)).status, 409, 'used code cannot be deleted');
  assert.equal((await A('DELETE', '/api/admin/promos/' + promos.find((x) => x.code === 'OLD').id)).status, 200, 'unused code deleted');
  // 100% off: no PayMongo; Premium starts now, a ₱0 entry is kept, and it is in the audit log
  assert.equal((await U('POST', '/api/payments/checkout', { agree_no_refund: true, code: 'FREE' })).data.code, 'promo_free', 'free code needs no checkout');
  assert.equal((await U('POST', '/api/promo/redeem', { code: 'MINUS90' })).status, 400, 'only a free code is redeemed');
  const nCs = Object.keys(sessions).length, untilF = (await U('GET', '/api/premium')).data.until;
  r = await U('POST', '/api/promo/redeem', { code: 'free' });
  assert.equal(r.status, 200); assert.ok(Math.abs(r.data.until - (untilF + 30 * 864e5)) < 5000, 'free code adds the days');
  assert.equal(Object.keys(sessions).length, nCs, 'no PayMongo checkout');
  assert.equal((await U('POST', '/api/promo/redeem', { code: 'FREE' })).status, 400, 'free code once only');
  r = await U('GET', '/api/premium');
  const fp = r.data.payments.find((x) => x.provider === 'promo');
  assert.equal(fp.amount, '0'); assert.equal(fp.status, 'approved');
  assert.equal((await U('GET', `/api/payments/${fp.id}/receipt`)).data.amount, '0');
  r = await A('GET', '/api/admin/audit?filter=admin');
  assert.ok(['promo_create', 'promo_delete', 'promo_redeem'].every((a) => r.data.rows.some((x) => x.action === a)), 'promo changes in the audit log');
  assert.ok(r.data.rows.some((x) => x.action === 'payment_paid_online' && x.detail.includes('promo REVIEW20')), 'promo on the payment log');
  // Used up, and turned off by the admin
  const F2 = client();
  await F2('POST', '/api/auth/register', { name: 'Ana', email: 'ana@test.ph', password: 'password123' });
  await F2('POST', '/api/auth/verify', { code: lastCode('ana@test.ph') });
  assert.match((await F2('POST', '/api/promo/check', { code: 'FREE' })).data.error, /Naubos/, 'limit reached');
  promos = (await A('GET', '/api/admin/promos')).data.rows;
  await A('PATCH', '/api/admin/promos/' + promos.find((x) => x.code === 'MINUS90').id, { active: false });
  assert.equal((await F2('POST', '/api/promo/check', { code: 'MINUS90' })).status, 400, 'turned-off code refused');
  await A('PATCH', '/api/admin/promos/' + promos.find((x) => x.code === 'MINUS90').id, { active: true });
  // 👥 Group Premium: a boss pays once for 10 people and gets one-time codes; the server sets the price
  const dbx = require('../src/db');
  const Boss = client(), G1 = client(), G2 = client(), G3 = client();
  for (const [c, n, e] of [[Boss, 'Boss', 'boss@test.ph'], [G1, 'Gina', 'gina@test.ph'], [G2, 'Gabo', 'gabo@test.ph'], [G3, 'Gelo', 'gelo@test.ph']]) {
    await c('POST', '/api/auth/register', { name: n, email: e, password: 'password123' });
    await c('POST', '/api/auth/verify', { code: lastCode(e) });
  }
  r = await Boss('GET', '/api/premium');
  assert.equal(r.data.bulk.min, 2); assert.deepEqual(r.data.bulk.tiers.map((t) => t.pct), [10, 15, 20], 'group discounts shown');
  const bossUntil = r.data.until;
  r = await Boss('GET', '/api/bulk/quote?qty=10');
  assert.equal(r.data.pct, 15); assert.equal(r.data.total, 841.5, '10 × ₱99 less 15%');
  assert.equal((await Boss('GET', '/api/bulk/quote?qty=1')).status, 400, 'at least 2 people');
  assert.equal((await Boss('POST', '/api/bulk/checkout', { qty: 10 })).data.code, 'no_refund', 'group payment needs the no-refund tick');
  assert.equal((await Boss('POST', '/api/bulk/checkout', { qty: 2, emails: 'a@x.ph b@x.ph c@x.ph', agree_no_refund: true })).status, 400, 'more emails than people');
  assert.equal((await Boss('POST', '/api/bulk/checkout', { qty: 2, emails: 'not-an-email', agree_no_refund: true })).status, 400, 'bad email');
  r = await Boss('POST', '/api/bulk/checkout', { qty: 10, total: 1, emails: 'GELO@test.ph', org: 'HR Team', agree_no_refund: true });
  assert.ok(r.data.url.startsWith('https://checkout.paymongo.test/'), 'group checkout link');
  const gcs = Object.values(sessions).at(-1);
  assert.equal(gcs.attributes.line_items[0].amount, 84150, 'server price, not the app\'s');
  payIt(gcs, 'gcash'); await hook(gcs.id); await hook(gcs.id);
  r = await Boss('GET', '/api/premium');
  assert.equal(r.data.until, bossUntil, 'buyer Premium not changed by a group payment');
  assert.equal(r.data.groups, 1);
  let groups = (await Boss('GET', '/api/bulk')).data;
  assert.equal(groups.length, 1); assert.equal(groups[0].seats.length, 10, 'one code per person, made once');
  assert.ok(groups[0].seats.every((x) => /^GRP-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(x.code) && x.state === 'open'));
  const geloSeat = groups[0].seats.find((x) => x.email === 'gelo@test.ph'), openSeats = groups[0].seats.filter((x) => !x.email);
  assert.ok(geloSeat, 'email kept on a seat'); assert.ok(groups[0].seats[0].link.includes('#/redeem/GRP-'), 'redeem link');
  assert.ok(mail.outbox.some((m) => m.to === 'boss@test.ph' && /Group Premium/.test(m.subject) && m.attachments.length), 'buyer gets the codes and receipt');
  assert.ok(mail.outbox.some((m) => m.to === 'gelo@test.ph' && m.text.includes(geloSeat.code)), 'code emailed to the person');
  const gpay = r.data.payments.find((x) => x.bulk_id);
  r = await Boss('GET', `/api/payments/${gpay.id}/receipt`);
  assert.equal(r.data.group.qty, 10); assert.equal(r.data.group.pct, 15); assert.equal(r.data.amount, '841.5');
  // Use a code: typed in the promo box, with spaces and small letters
  assert.equal((await G1('POST', '/api/promo/check', { code: openSeats[0].code.toLowerCase() })).data.group, true, 'promo box knows a group code');
  const g1Before = (await G1('GET', '/api/premium')).data.until;
  r = await G1('POST', '/api/bulk/redeem', { code: openSeats[0].code.toLowerCase().replace(/-/g, ' ') });
  assert.equal(r.status, 200); assert.equal(r.data.from, 'HR Team');
  assert.ok(Math.abs(r.data.until - (Math.max(Date.now(), g1Before) + 30 * 864e5)) < 5000, 'seat gives the plan days');
  assert.equal((await G1('GET', '/api/me')).data.premium, true);
  assert.match((await G1('POST', '/api/bulk/redeem', { code: openSeats[0].code })).data.error, /Nagamit mo na/, 'code works once');
  assert.match((await G1('POST', '/api/bulk/redeem', { code: openSeats[1].code })).data.error, /Isang seat lang/, 'one seat per person in a group');
  assert.match((await G2('POST', '/api/bulk/redeem', { code: openSeats[0].code })).data.error, /ibang account/, 'taken by someone else');
  assert.equal((await G2('POST', '/api/bulk/redeem', { code: geloSeat.code })).status, 403, 'seat with an email: only that account');
  assert.equal((await G3('POST', '/api/bulk/redeem', { code: geloSeat.code })).status, 200, 'the right email can use it');
  assert.equal((await Boss('POST', '/api/bulk/redeem', { code: openSeats[1].code })).status, 200, 'the buyer can use a seat too');
  await dbx.run('UPDATE bulk_seats SET expires_at = ? WHERE code = ?', Date.now() - 1000, openSeats[2].code);
  assert.match((await G2('POST', '/api/bulk/redeem', { code: openSeats[2].code })).data.error, /Expired/, 'unused seats expire');
  assert.equal((await G2('POST', '/api/bulk/redeem', { code: 'GRP-AAAA-AAAA' })).status, 400, 'unknown code');
  r = await G1('GET', '/api/premium');
  const seatPay = r.data.payments.find((x) => x.provider === 'bulk');
  assert.equal(seatPay.amount, '0');
  assert.equal((await G1('GET', `/api/payments/${seatPay.id}/receipt`)).data.group.from, 'HR Team', 'seat on the receipt');
  groups = (await Boss('GET', '/api/bulk')).data;
  assert.equal(groups[0].seats.filter((x) => x.state === 'used').length, 3, 'buyer sees who used the codes');
  assert.equal(groups[0].seats.find((x) => x.code === openSeats[0].code).used_by.email, 'gina@test.ph');
  assert.equal(groups[0].seats.find((x) => x.code === openSeats[2].code).state, 'expired');
  // The buyer types an email for an unused seat: only that account can use it, and the code is emailed
  assert.equal((await G1('PUT', '/api/bulk/seats/' + openSeats[3].id, { email: 'gabo@test.ph' })).status, 404, 'only the buyer');
  assert.equal((await Boss('PUT', '/api/bulk/seats/' + openSeats[0].id, { email: 'gabo@test.ph' })).status, 409, 'used seat cannot change');
  assert.equal((await Boss('PUT', '/api/bulk/seats/' + openSeats[3].id, { email: 'gabo@test.ph' })).status, 200);
  assert.ok(mail.outbox.some((m) => m.to === 'gabo@test.ph' && m.text.includes(openSeats[3].code)), 'seat code emailed');
  assert.equal((await G1('POST', '/api/bulk/redeem', { code: openSeats[3].code })).status, 403, 'now only for that email');
  assert.equal((await G2('POST', '/api/bulk/redeem', { code: openSeats[3].code })).status, 200);
  // Admin: sees every group, and makes one after a manual payment (e.g. bank transfer)
  assert.equal((await U('GET', '/api/admin/bulk')).status, 403, 'admins only');
  r = await A('GET', '/api/admin/bulk');
  assert.equal(r.data.rows.find((x) => x.qty === 10).used, 4);
  assert.equal((await A('GET', '/api/admin/bulk/' + r.data.rows[0].id)).data.length, 10);
  assert.equal((await A('POST', '/api/admin/bulk', { email: 'nobody@test.ph', qty: 3 })).status, 404);
  r = await A('POST', '/api/admin/bulk', { email: 'boss@test.ph', qty: 3, amount: '297', reference: 'BDO123' });
  assert.equal(r.status, 200);
  assert.equal((await Boss('GET', '/api/bulk')).data.length, 2, 'admin-made group is the buyer\'s');
  r = await A('GET', '/api/admin/audit?filter=admin');
  assert.ok(['bulk_checkout', 'bulk_paid', 'bulk_redeem', 'bulk_seat_email', 'bulk_admin_create'].every((a) => r.data.rows.some((x) => x.action === a)), 'group actions in the audit log');
  // 📅 Monthly and yearly plans: the server sets the price and days of each
  await A('PUT', '/api/admin/settings', { price_year: '990', plan_year_days: '365' });
  r = await Boss('GET', '/api/premium');
  assert.deepEqual(r.data.plans.map((x) => [x.id, x.price, x.days]), [['day', 20, 1], ['week', 49, 7], ['month', 99, 30], ['year', 990, 365]], 'daily, weekly, monthly and yearly plans');
  assert.ok(r.data.plans.find((x) => x.id === 'year').save > 0, 'yearly shows how much is saved');
  await A('POST', '/api/admin/promos', { code: 'GROUP10', kind: 'percent', value: 10 });
  await A('POST', '/api/admin/promos', { code: 'ALLFREE', kind: 'percent', value: 100 });
  r = await Boss('POST', '/api/promo/check', { code: 'GROUP10', plan: 'year' });
  assert.deepEqual([r.data.price, r.data.amount, r.data.days], [990, 891, 365], 'promo code on the yearly price');
  const yBefore = (await G1('GET', '/api/premium')).data.until;
  await G1('POST', '/api/payments/checkout', { agree_no_refund: true, plan: 'year', amount: 1 });
  const ycs = Object.values(sessions).at(-1);
  assert.equal(ycs.attributes.line_items[0].amount, 99000, 'PayMongo charges the yearly price');
  payIt(ycs, 'gcash'); await hook(ycs.id);
  r = await G1('GET', '/api/premium');
  assert.ok(Math.abs(r.data.until - (Math.max(Date.now(), yBefore) + 365 * 864e5)) < 5000, 'yearly plan adds 365 days');
  assert.equal(r.data.payments.find((x) => x.provider === 'paymongo').days, 365);
  // 📅 Daily and weekly plans: promo codes (online is still at least ₱20), PayMongo, manual payment, settings
  r = await Boss('POST', '/api/promo/check', { code: 'GROUP10', plan: 'day' });
  assert.deepEqual([r.data.price, r.data.amount, r.data.online, r.data.days], [20, 18, 20, 1], 'promo on the daily plan, PayMongo minimum kept');
  assert.equal((await G1('POST', '/api/payments/checkout', { plan: 'week' })).status, 400, 'no-refund box needed on the weekly plan too');
  const wBefore = (await G1('GET', '/api/premium')).data.until;
  await G1('POST', '/api/payments/checkout', { agree_no_refund: true, plan: 'week' });
  const wcs = Object.values(sessions).at(-1);
  assert.equal(wcs.attributes.line_items[0].amount, 4900, 'PayMongo charges the weekly price');
  payIt(wcs, 'gcash'); await hook(wcs.id);
  r = await G1('GET', '/api/premium');
  assert.ok(Math.abs(r.data.until - (wBefore + 7 * 864e5)) < 5000, 'weekly plan adds 7 days to the Premium left');
  r = await G2('POST', '/api/payments', { reference: 'GC-DAY-1', agree_no_refund: true, plan: 'day' });
  assert.equal(r.status, 200, 'manual payment on the daily plan');
  const dPay = (await A('GET', '/api/admin/payments?status=pending')).data.find((x) => x.reference === 'GC-DAY-1');
  assert.deepEqual([dPay.amount, dPay.days], ['20', 1], 'manual daily: ₱20 for 1 day');
  const dBefore = (await G2('GET', '/api/premium')).data.until;
  r = await A('POST', '/api/admin/payments/' + dPay.id, { action: 'approve' });
  assert.ok(Math.abs(r.data.until - (Math.max(Date.now(), dBefore) + 864e5)) < 5000, 'approved daily plan adds 1 day');
  r = await Boss('GET', '/api/bulk/quote?qty=2&plan=day');
  assert.equal(r.data.days, 30, 'Group Premium stays monthly or yearly');
  await A('PUT', '/api/admin/settings', { day_on: '0', price_week: '59', plan_week_days: '99' });
  r = await Boss('GET', '/api/premium');
  assert.deepEqual(r.data.plans.map((x) => [x.id, x.price, x.days]), [['week', 59, 29], ['month', 99, 30], ['year', 990, 365]], 'daily off; weekly price and days from Settings (days kept in range)');
  r = await Boss('POST', '/api/promo/check', { code: 'GROUP10', plan: 'day' });
  assert.equal(r.data.days, 30, 'a plan that is off falls back to monthly');
  await A('PUT', '/api/admin/settings', { day_on: '1', price_week: '49', plan_week_days: '7' });
  // 🏷️ A 70% code on the daily plan: ₱6 (manual), ₱20 online (PayMongo's smallest); ₱99 → ₱29.70
  await A('POST', '/api/admin/promos', { code: '70OFF', kind: 'percent', value: 70 });
  r = await Boss('POST', '/api/promo/check', { code: '70OFF', plan: 'day' });
  assert.deepEqual([r.data.price, r.data.discount, r.data.amount, r.data.online], [20, 14, 6, 20], '70% off the daily plan');
  await A('PUT', '/api/admin/settings', { price_day: '99' });
  r = await Boss('POST', '/api/promo/check', { code: '70OFF', plan: 'day' });
  assert.deepEqual([r.data.amount, r.data.online], [29.7, 29.7], '70% off a ₱99 daily plan');
  await A('PUT', '/api/admin/settings', { price_day: '20' });
  // 🏷️📅 A promo code for some plans only (Admin → Promo codes → For which plans)
  r = await A('POST', '/api/admin/promos', { code: 'SHORT5', kind: 'fixed', value: 5, plans: ['day', 'week', 'nope'] });
  assert.equal(r.data.plans, 'day,week', 'only real plans kept');
  assert.equal((await A('POST', '/api/admin/promos', { code: 'ALLFOUR', kind: 'fixed', value: 5, plans: ['day', 'week', 'month', 'year'] })).data.plans, '', 'all four = every plan');
  r = await Boss('POST', '/api/promo/check', { code: 'SHORT5', plan: 'week' });
  assert.deepEqual([r.data.price, r.data.amount], [49, 44], 'code works on its plan');
  r = await Boss('POST', '/api/promo/check', { code: 'SHORT5', plan: 'year' });
  assert.equal(r.status, 400); assert.match(r.data.error, /Isang araw at Lingguhan/, 'says which plans');
  assert.deepEqual(r.data.plans, ['day', 'week'], 'lists the plans to switch to');
  assert.equal((await Boss('POST', '/api/payments/checkout', { agree_no_refund: true, plan: 'month', code: 'SHORT5' })).data.code, 'promo', 'checkout refuses it on another plan');
  assert.match((await Boss('GET', '/api/bulk/quote?qty=2&code=SHORT5')).data.error, /Para lang sa/, 'not on a monthly group');
  const short = (await A('GET', '/api/admin/promos')).data.rows.find((x) => x.code === 'SHORT5');
  assert.deepEqual(short.prices.map((x) => [x.id, x.amount]), [['day', 15], ['week', 44]], 'admin sees the price on each of its plans');
  await A('PATCH', '/api/admin/promos/' + short.id, { plans: [] });
  assert.equal((await Boss('POST', '/api/promo/check', { code: 'SHORT5', plan: 'year' })).data.amount, 985, 'no plans ticked = every plan');
  // 🏷️👥 Promo code on Group Premium: taken off the group total after the group discount
  r = await Boss('GET', '/api/bulk/quote?qty=10&code=group10');
  assert.equal(r.data.total, 757.35, '10 × ₱99 − 15% − 10%'); assert.equal(r.data.promo.code, 'GROUP10');
  r = await Boss('GET', '/api/bulk/quote?qty=2&plan=year');
  assert.deepEqual([r.data.total, r.data.days], [1980, 365], 'group on the yearly plan');
  assert.match((await Boss('GET', '/api/bulk/quote?qty=10&code=ALLFREE')).data.error, /Group Premium/, 'no 100%-off code on a group');
  assert.equal((await Boss('GET', '/api/bulk/quote?qty=10&code=NOPE')).data.code, 'promo', 'bad code refused');
  await Boss('POST', '/api/bulk/checkout', { qty: 10, code: 'GROUP10', total: 1, agree_no_refund: true });
  const gcs2 = Object.values(sessions).at(-1);
  assert.equal(gcs2.attributes.line_items[0].amount, 75735, 'PayMongo charges the group price less the code');
  payIt(gcs2, 'gcash'); await hook(gcs2.id); await hook(gcs2.id);
  assert.equal((await A('GET', '/api/admin/promos')).data.rows.find((x) => x.code === 'GROUP10').used, 1, 'group promo counted once');
  assert.match((await Boss('POST', '/api/promo/check', { code: 'GROUP10' })).data.error, /Nagamit mo na/, 'one use per account, group too');
  const gpay2 = (await Boss('GET', '/api/premium')).data.payments.find((x) => x.promo_code === 'GROUP10');
  r = await Boss('GET', `/api/payments/${gpay2.id}/receipt`);
  assert.deepEqual([r.data.promo_code, r.data.amount, r.data.group.qty], ['GROUP10', '757.35', 10], 'promo and group on the receipt');
  assert.equal((await Boss('GET', '/api/bulk')).data.length, 3);
  fake.close();

  // 🛡️ Security headers, health check, and Admin → Server monitoring
  let h = await fetch(base + '/api/health');
  assert.equal(h.status, 200); assert.equal((await h.json()).ok, true);
  assert.equal(h.headers.get('x-frame-options'), 'DENY'); assert.equal(h.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(h.headers.get('x-powered-by'), null, 'server software not shown');
  assert.equal(h.headers.get('cache-control'), 'no-store', 'API answers are not cached');
  h = await fetch(base + '/api/meta', { headers: { Origin: 'https://localhost' } });
  assert.equal(h.headers.get('access-control-allow-origin'), '*', 'apps can call the API');
  assert.equal(h.headers.get('access-control-allow-credentials'), null, 'no cookies across sites');
  assert.equal((await U('GET', '/api/admin/health')).status, 403, 'monitoring is for admins');
  r = await A('GET', '/api/admin/health');
  assert.ok(['ok', 'warn', 'bad'].includes(r.data.level)); assert.equal(typeof r.data.percent, 'number');
  assert.ok(r.data.active_users >= 2 && r.data.capacity === 150, 'active users against the capacity');
  assert.equal(r.data.db_ok, true); assert.ok(r.data.req_per_min > 0);

  // Offline: question pack, then sync results taken without internet (saved once only)
  r = await U('GET', '/api/offline/pack');
  assert.equal(r.data.sets.length, 6, 'premium user gets newest sets'); assert.ok(r.data.sets[0].items[0].answer !== undefined);
  assert.ok(r.data.practice.verbal.length >= 150, 'practice pool'); assert.ok(r.data.valid_until > Date.now() + 29 * 864e5, 'offline valid ~30 days');
  const ps = r.data.practice.numerical.slice(0, 10);
  const set = r.data.sets.find((x) => x.mode === 'pro');
  const offline = [
    { client_id: 'Ltest1', mode: 'practice', title: 'Practice: Numerical (10 items)', items: ps, answers: Object.fromEntries(ps.map((it, i) => [i, it.answer])), started_at: Date.now() - 6e5, finished_at: Date.now() },
    { client_id: 'Ltest2', mode: 'pro', set_id: set.id, items: [], answers: { 0: set.items[0].answer }, started_at: Date.now() - 6e5, finished_at: Date.now() },
  ];
  const mix = (await U('GET', '/api/meta')).data.exams.subpro.sections.flatMap((sec) => (r.data.practice[sec.subject] || []).slice(0, sec.count));
  offline.push({ client_id: 'Ltest3', mode: 'subpro', items: mix, answers: {}, started_at: Date.now() - 6e5, finished_at: Date.now() });
  r = await U('POST', '/api/offline/sync', { attempts: offline });
  assert.ok(r.data.saved.Ltest1 && r.data.saved.Ltest2 && r.data.saved.Ltest3, 'offline results saved (incl. Bagong halo made on the device)');
  assert.equal((await U('GET', `/api/attempts/${r.data.saved.Ltest3}`)).data.total, 165);
  assert.equal((await U('GET', `/api/attempts/${r.data.saved.Ltest1}`)).data.score, 10);
  assert.equal((await U('GET', `/api/attempts/${r.data.saved.Ltest2}`)).data.total, 170);
  const count = (await U('GET', '/api/attempts')).data.length;
  await U('POST', '/api/offline/sync', { attempts: offline });
  assert.equal((await U('GET', '/api/attempts')).data.length, count, 'no duplicates');
  // A set deleted after it was saved on the device: the result is kept with the questions the user saw.
  r = await U('POST', '/api/offline/sync', { attempts: [{ client_id: 'Ltest4', mode: 'pro', set_id: 999999, title: 'Professional Mock Exam · Set 9', items: set.items, answers: {}, started_at: Date.now() - 6e5, finished_at: Date.now() }] });
  assert.ok(r.data.saved.Ltest4, 'result of a deleted set is still saved');
  // A set shown on the device in its own order (1.44.0): graded with the questions as the user saw them.
  {
    const moved = [...set.items].reverse().map((it) => ({ ...it, choices: [...it.choices].reverse(), answer: 3 - it.answer }));
    r = await U('POST', '/api/offline/sync', { attempts: [{ client_id: 'Ltest4b', mode: 'pro', set_id: set.id, title: set.title, items: moved,
      answers: Object.fromEntries(moved.map((it, i) => [i, it.answer])), started_at: Date.now() - 6e5, finished_at: Date.now() }] });
    const a = (await U('GET', `/api/attempts/${r.data.saved.Ltest4b}`)).data;
    assert.equal(a.score, set.items.length, 'offline set in a new order: all right'); assert.ok(a.title.includes('Set'));
  }
  // Premium ended before the device came back online: results made while it was Premium are still saved.
  const juanRow = await require('../src/db').get('SELECT id, premium_until FROM users WHERE email = ?', 'juan@test.ph');
  await require('../src/db').run('UPDATE users SET premium_until = ? WHERE id = ?', Date.now() - 60e3, juanRow.id);
  r = await U('POST', '/api/offline/sync', { attempts: [
    { client_id: 'Ltest5', mode: 'practice', title: 'Practice', items: ps, answers: {}, started_at: Date.now() - 6e5, finished_at: Date.now() - 3e5 },
    { client_id: 'Ltest6', mode: 'practice', title: 'Practice', items: ps, answers: {}, started_at: Date.now() - 1000, finished_at: Date.now() },
  ] });
  assert.equal(r.status, 200, 'sync still works after Premium ended');
  assert.ok(r.data.saved.Ltest5, 'made while Premium: saved'); assert.equal(r.data.rejected.Ltest6, 'premium', 'made after Premium: refused');
  await require('../src/db').run('UPDATE users SET premium_until = ? WHERE id = ?', juanRow.premium_until, juanRow.id);

  // Premium: email the full review with the PDF attached
  const mocks = (await U('GET', '/api/attempts')).data.filter((x) => x.mode !== 'practice' && x.finished_at);
  r = await U('POST', `/api/attempts/${mocks[0].id}/email`, { lang: 'en' });
  assert.equal(r.status, 200); assert.equal(r.data.to, 'juan@test.ph');
  const rev = [...mail.outbox].reverse().find((m) => m.subject.startsWith('Mga tanong at sagot'));
  assert.ok(rev && rev.attachments.length === 1 && rev.attachments[0].endsWith('.pdf'), 'review email has the PDF');
  const pdfBytes = require('../public/pdf').report({ ...(await U('GET', `/api/attempts/${mocks[0].id}`)).data }, { subjects: {} });
  assert.equal(Buffer.from(pdfBytes.slice(0, 8)).toString(), '%PDF-1.4');

  // Settings backup and sync between devices: the newer copy wins
  assert.deepEqual((await U('GET', '/api/me/prefs')).data.data, {}, 'no backup yet');
  r = await U('PUT', '/api/me/prefs', { data: { lang: 'en', level: 'subpro', remind: { on: true, time: '07:30', email: true } }, updated_at: Date.now(), remind_email: true, remind_min: 450 });
  assert.equal(r.data.data.level, 'subpro'); assert.equal(r.data.remind_email, true); assert.equal(r.data.remind_min, 450);
  r = await U('PUT', '/api/me/prefs', { data: { lang: 'tl' }, updated_at: Date.now() - 864e5 });
  assert.equal(r.data.data.lang, 'en', 'an older copy does not overwrite a newer one');
  assert.equal((await U('PUT', '/api/me/prefs', { data: { x: 'y'.repeat(30000) } })).status, 413, 'size limit');
  await U('PUT', '/api/me/prefs', { remind_email: false });

  // Study streak
  r = await U('GET', '/api/stats');
  assert.ok(r.data.streak.current >= 1 && r.data.streak.today && r.data.days.includes(r.data.today), 'studied today');
  const { streakOf } = require('../src/review');
  assert.deepEqual(streakOf([8, 9, 10, 3, 4], 10), { current: 3, best: 3, today: true });
  assert.deepEqual(streakOf([7, 8], 10), { current: 0, best: 2, today: false });
  assert.equal(streakOf([8, 9], 10).current, 2, 'yesterday still counts until today ends');

  // Mistakes review and weak topics
  r = await U('GET', '/api/review');
  const wrong0 = r.data.mistakes_count;
  assert.ok(wrong0 > 10 && r.data.items.length === Math.min(300, wrong0), 'premium: the mistakes with their questions (for offline)');
  assert.ok(r.data.topics.length > 3 && r.data.topics.every((t, i, l) => !i || l[i - 1].pct <= t.pct), 'weakest topic first');
  r = await U('POST', '/api/attempts', { mode: 'practice', review: 'mistakes', count: 10 });
  assert.equal(r.data.items.length, 10); assert.match(r.data.title, /Mga mali ko/);
  const fixAns = Object.fromEntries(r.data.items.map((it, i) => [i, it.answer]));
  await U('POST', `/api/attempts/${r.data.id}/submit`, { answers: fixAns });
  assert.equal((await U('GET', '/api/review')).data.mistakes_count, wrong0 - 10, 'answered right later: off the list');
  const weak = (await U('GET', '/api/review')).data.topics[0];
  r = await U('POST', '/api/attempts', { mode: 'practice', review: 'topic', subject: weak.subject, topic: weak.topic, count: 10 });
  assert.ok(r.data.items.length >= 1 && r.data.items.every((it) => it.topic === weak.topic && it.subject === weak.subject), 'practice of one topic');
  r = await F('GET', '/api/review');
  assert.equal(r.data.items, undefined); assert.equal(r.data.mistakes_count, 0, 'free plan: mock exam questions stay hidden');

  // Time per part of a mock exam
  r = await U('POST', '/api/attempts', { mode: 'subpro' });
  r = await U('POST', `/api/attempts/${r.data.id}/submit`, { answers: {}, times: { verbal: 600, numerical: 300.4, bogus: 5, clerical: 1e9 } });
  assert.equal(r.data.times.verbal, 600); assert.equal(r.data.times.numerical, 300); assert.equal(r.data.times.bogus, undefined);
  assert.ok(r.data.times.clerical <= 160 * 60 + 120, 'kept within the exam time');

  // Audit log and suspicious-login alerts
  const juanId = (await U('GET', '/api/me')).data.user.id;
  r = await A('GET', '/api/admin/audit');
  assert.ok(r.data.rows.some((x) => x.action === 'payment_approve' && x.user_id === juanId), 'admin change logged');
  assert.ok(r.data.rows.some((x) => x.action === 'login' && x.user_id === juanId && x.device), 'login logged with the device');
  assert.equal((await U('GET', '/api/admin/audit')).status, 403);
  const loginFrom = (ip, ua, password = 'newpass123') => fetch(base + '/api/auth/login', { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip, 'User-Agent': ua }, body: JSON.stringify({ email: 'juan@test.ph', password }) });
  assert.equal((await loginFrom('203.0.113.9', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1')).status, 200);
  assert.ok(mail.outbox.some((m) => m.to === 'juan@test.ph' && m.subject === 'May bagong login sa account mo'), 'new place + new device: email to the owner');
  for (let i = 0; i < 5; i++) await loginFrom('198.51.100.7', 'curl/8', 'wrongpass');
  assert.ok(mail.outbox.some((m) => m.to === 'juan@test.ph' && m.subject.startsWith('Maraming maling password')), 'many wrong passwords: email');
  r = await A('GET', '/api/admin/audit?filter=alerts');
  assert.ok(r.data.rows.some((x) => x.action === 'login' && x.alert) && r.data.rows.some((x) => x.action === 'login_failed_many'), 'alerts listed');
  assert.ok(r.data.rows.every((x) => x.alert), 'alerts filter'); assert.ok((await A('GET', '/api/admin/overview')).data.alerts7d >= 2);
  assert.equal((await A('GET', '/api/admin/audit?q=203.0.113')).data.rows.length, 1, 'search by IP');
  await U('POST', '/api/auth/login', { email: 'juan@test.ph', password: 'newpass123' });
  r = await U('GET', '/api/me/logins');
  assert.ok(r.data.some((x) => x.alert && x.device === 'iPhone · Safari'), 'the user sees their own logins');

  // Background jobs: study reminder email (once a day, only without study today) and Premium expiry emails
  const jobs = require('../src/jobs'), dbm = require('../src/db');
  await A('PUT', '/api/me/prefs', { remind_email: true, remind_min: 0 });
  await U('PUT', '/api/me/prefs', { remind_email: true, remind_min: 0 });
  assert.equal(await jobs.studyReminders(), 1, 'admin has not studied today: reminded; Juan studied: not');
  assert.equal(await jobs.studyReminders(), 0, 'once a day');
  assert.ok(mail.outbox.some((m) => m.to === 'admin@test.ph' && /review|streak/i.test(m.subject)));
  const keepUntil = (await dbm.get('SELECT premium_until FROM users WHERE id = ?', juanId)).premium_until;
  const st = { premium_required: '1', price: '99', plan_days: '30' };
  await dbm.run('UPDATE users SET premium_until = ? WHERE id = ?', Date.now() + 2 * 864e5, juanId);
  assert.equal(await jobs.expiryReminders(st), 1); assert.equal(await jobs.expiryReminders(st), 0, 'sent once');
  assert.ok(mail.outbox.some((m) => m.to === 'juan@test.ph' && m.subject === 'Mag-e-expire ang Premium mo sa 2 araw'));
  await dbm.run('UPDATE users SET premium_until = ? WHERE id = ?', Date.now() - 3600e3, juanId);
  assert.equal(await jobs.expiryReminders(st), 1, 'ended: one more email');
  // A 1-day plan: no "ends in 1 day" email right after paying, only the "ended" one
  const dayEnd = Date.now() + 20 * 3600e3;
  await dbm.run('UPDATE users SET premium_until = ?, expiry_notice = \'\' WHERE id = ?', dayEnd, juanId);
  await dbm.run(`INSERT INTO payments (user_id, amount, method, reference, status, created_at, days, period_from, period_to) VALUES (?, '20', 'GCash', 'DAY1', 'approved', ?, 1, ?, ?)`,
    juanId, Date.now(), dayEnd - 864e5, dayEnd);
  assert.equal(await jobs.expiryReminders(st), 0, 'daily plan: no "ends soon" email');
  await dbm.run('UPDATE users SET premium_until = ? WHERE id = ?', keepUntil, juanId);
  await U('PUT', '/api/me/prefs', { remind_email: false });

  // Admin settings: exam watermark, payment switches, manual accounts (Maya, PayPal, bank), ads
  r = await U('GET', '/api/me');
  assert.equal(r.data.config.watermark, true, 'watermark on by default'); assert.equal(r.data.config.ads.on, true);
  r = await A('GET', '/api/admin/settings');
  assert.equal(r.data.defaults.price_day, '20', 'the first values come with the settings (for Reset)');
  assert.equal(r.data.defaults.ads_on, '1');
  // Number settings: a wrong value keeps the old one, and values are kept in range
  const price0 = r.data.price;
  r = await A('PUT', '/api/admin/settings', { price: 'abc', plan_days: '-5', free_practice_items: '2.6' });
  assert.equal(r.data.price, price0, 'bad price ignored'); assert.equal(r.data.plan_days, '1'); assert.equal(r.data.free_practice_items, '5');
  r = await A('PUT', '/api/admin/settings', { plan_days: '30', free_practice_items: '10' });
  assert.deepEqual(r.data.pay_methods.map((m) => m.id), ['gcash'], 'only the GCash account that has a number (no empty Maya/PayPal/bank)');
  assert.equal(r.data.pay_methods[0].name, 'GCash');
  // Accounts are added with the type dropdown; the name comes from the type (no "name in the app")
  const methods = [...r.data.pay_methods, { id: 'maya', type: 'maya', name: 'ignored', account: '09181112222', account_name: 'Juan D.', on: true },
    { id: 'paypal', type: 'paypal', on: false }, { id: 'bdo', type: 'bank', bank: 'BDO', account: '0012 3456 7890', on: true },
    { id: 'coins', type: 'other', bank: 'Coins.ph', account: '0917', on: false }];
  r = await A('PUT', '/api/admin/settings', { pay_methods: methods, exam_watermark: '0', pay_online_on: '0', adsense_client: 'ca-pub-1234567890123456' });
  assert.deepEqual(r.data.pay_methods.map((m) => m.id), ['gcash', 'maya', 'bdo', 'coins'], 'an empty preset is dropped');
  assert.deepEqual(r.data.pay_methods.map((m) => m.name), ['GCash', 'Maya', 'BDO', 'Coins.ph'], 'names come from the type or bank');
  assert.equal((await U('GET', '/api/me')).data.config.watermark, false, 'watermark can be turned off');
  r = await U('GET', '/api/premium');
  assert.equal(r.data.online, false, 'online payment turned off'); assert.equal(r.data.manual, true);
  assert.deepEqual(r.data.methods.map((m) => m.id), ['gcash', 'maya', 'bdo']);
  assert.equal((await U('POST', '/api/payments/checkout', { agree_no_refund: true })).status, 404, 'checkout off');
  const png = 'data:image/png;base64,' + Buffer.from('89504e470d0a1a0a', 'hex').toString('base64');
  assert.equal((await A('PUT', '/api/admin/pay-qr/maya', { data: png })).status, 200);
  assert.equal((await fetch(base + '/api/pay/qr/maya')).headers.get('content-type'), 'image/png', 'QR code served');
  assert.equal((await U('GET', '/api/premium')).data.methods.find((m) => m.id === 'maya').has_qr, true);
  assert.equal((await U('POST', '/api/payments', { agree_no_refund: true, method_id: 'coins', reference: 'PP123456' })).status, 400, 'turned-off account refused');
  assert.equal((await U('POST', '/api/payments', { agree_no_refund: true, method_id: 'maya', reference: 'MY123456', proof: 'data:text/html;base64,AAAA' })).status, 400, 'proof must be an image');
  // Manual payment with a promo code: the admin sees the discounted price; the code counts once approved
  assert.equal((await F2('POST', '/api/payments', { agree_no_refund: true, method_id: 'maya', reference: 'PROMO1234', code: 'MINUS90' })).status, 200);
  const mpp = (await A('GET', '/api/admin/payments')).data.find((x) => x.reference === 'PROMO1234');
  assert.deepEqual([mpp.amount, mpp.promo_code, mpp.list_price], ['9', 'MINUS90', '99'], 'manual amount after the code');
  assert.equal((await A('GET', '/api/admin/promos')).data.rows.find((x) => x.code === 'MINUS90').used, 0, 'not counted while waiting');
  await A('POST', `/api/admin/payments/${mpp.id}`, { action: 'approve' });
  assert.equal((await A('GET', '/api/admin/promos')).data.rows.find((x) => x.code === 'MINUS90').used, 1, 'counted when approved');
  assert.equal((await U('POST', '/api/payments', { agree_no_refund: true, method_id: 'maya', reference: 'MY123456', proof: png })).status, 200);
  r = await A('GET', '/api/admin/payments');
  const mp = r.data.find((x) => x.reference === 'MY123456');
  assert.equal(mp.method, 'Maya'); assert.equal(mp.has_proof, 1); assert.equal(mp.proof, undefined, 'list does not carry the image');
  assert.equal((await A('GET', `/api/admin/payments/${mp.id}/proof`)).data.proof, png);
  await A('POST', `/api/admin/payments/${mp.id}`, { action: 'reject', note: 'test' });
  await A('PUT', '/api/admin/settings', { pay_manual_on: '0' });
  assert.equal((await U('POST', '/api/payments', { agree_no_refund: true, method_id: 'maya', reference: 'MY999999' })).status, 403, 'manual payment off');
  assert.equal((await U('GET', '/api/premium')).data.manual, false);
  await A('PUT', '/api/admin/settings', { pay_manual_on: '1', pay_online_on: '1', exam_watermark: '1' });
  assert.equal(await (await fetch(base + '/ads.txt')).text(), 'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n', 'ads.txt from the AdSense ID');

  // Apps: token login + CORS
  const pre = await fetch(base + '/api/me', { method: 'OPTIONS', headers: { Origin: 'https://localhost' } });
  assert.equal(pre.status, 204); assert.equal(pre.headers.get('access-control-allow-origin'), '*');
  let ar = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-App': '1' }, body: JSON.stringify({ email: 'juan@test.ph', password: 'newpass123' }) });
  const tok = (await ar.json()).token; assert.ok(tok, 'app gets token');
  ar = await fetch(base + '/api/me', { headers: { Authorization: 'Bearer ' + tok } });
  assert.equal((await ar.json()).user.email, 'juan@test.ph', 'bearer token works');
  assert.equal((await U('POST', '/api/auth/login', { email: 'juan@test.ph', password: 'newpass123' })).data.token, undefined, 'website gets no token');
  ar = await fetch(base + '/api/me', { headers: { Authorization: 'Bearer ' + tok } });
  assert.equal((await ar.json()).ended, 'replaced', 'app logged out after the website login');

  // Live session channel: the old device hears about a new login right away (no click needed).
  ar = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-App': '1' }, body: JSON.stringify({ email: 'juan@test.ph', password: 'newpass123' }) });
  const tok2 = (await ar.json()).token;
  assert.equal((await (await fetch(base + '/api/session', { headers: { Authorization: 'Bearer ' + tok2 } })).json()).ok, true);
  const ctl = new AbortController();
  const lr = await fetch(base + '/api/session/live', { headers: { Authorization: 'Bearer ' + tok2 }, signal: ctl.signal });
  assert.equal(lr.status, 200); assert.match(lr.headers.get('content-type'), /text\/event-stream/);
  const reader = lr.body.getReader();
  const heard = (async () => { let txt = ''; for (;;) { const { value, done } = await reader.read(); if (done) return txt; txt += Buffer.from(value).toString(); if (txt.includes('event:')) return txt; } })();
  const t0 = Date.now();
  await U('POST', '/api/auth/login', { email: 'juan@test.ph', password: 'newpass123' });
  const ev = await Promise.race([heard, new Promise((r) => setTimeout(() => r('timeout'), 3000))]);
  ctl.abort();
  assert.match(ev, /event: replaced/, 'old device told at once');
  assert.ok(Date.now() - t0 < 2000, 'within seconds');
  const sr = await fetch(base + '/api/session', { headers: { Authorization: 'Bearer ' + tok2 } });
  assert.equal(sr.status, 401); assert.equal((await sr.json()).code, 'replaced');

  // Guided tour for new Premium users: shown once per account
  assert.equal((await U('GET', '/api/me')).data.user.tour_done, false);
  await U('POST', '/api/me/tour', { done: true });
  assert.equal((await U('GET', '/api/me')).data.user.tour_done, true);

  // Admin
  assert.equal((await U('GET', '/api/admin/users')).status, 403, 'user blocked from admin');
  r = await A('GET', '/api/admin/overview'); assert.ok(r.data.sales30d > 0 && r.data.sales7d === r.data.sales30d && r.data.paid30d > 0, 'sales on the overview'); assert.equal(typeof r.data.expiring7d, 'number'); assert.equal(r.data.users, 14); assert.equal(r.data.premiumUsers, 6); // 14 users (with "Trial", the free full-exam test, and 5 free accounts of the per-device test). Ana got Premium with a promo code; Boss, Gina, Gabo and Gelo with Group Premium
  r = await A('POST', '/api/admin/sets', { mode: 'subpro' }); assert.equal(r.data.number, 4);
  // 🔄 New questions for a set: Set 1 is never changed; the newest set gets new questions when the bank changes
  {
    const db = require('../src/db'), sets = require('../src/sets');
    const all = (await A('GET', '/api/admin/sets')).data.filter((x) => x.mode === 'pro');
    const one = all.find((x) => x.number === 1), newest = all.reduce((a, b) => (b.number > a.number ? b : a));
    assert.equal((await U('POST', `/api/admin/sets/${newest.id}/refresh`)).status, 403, 'admin only');
    assert.equal((await A('POST', `/api/admin/sets/${one.id}/refresh`)).status, 400, 'Set 1 is never changed');
    const items = async (id) => (await db.get('SELECT items FROM exam_sets WHERE id = ?', id)).items;
    const oneBefore = await items(one.id), before = await items(newest.id);
    r = await A('POST', `/api/admin/sets/${newest.id}/refresh`);
    assert.equal(r.status, 200); assert.ok(r.data.updated_at);
    assert.notEqual(await items(newest.id), before, 'the set has new questions');
    assert.ok((await U('GET', '/api/sets?mode=pro')).data.find((x) => x.id === newest.id).updated_at, 'users see when it got new questions');
    assert.equal((await sets.refreshLatest()).length, 0, 'nothing to do: the bank did not change since');
    await sets.bankChanged(Date.now() + 1000);
    const done = await sets.refreshLatest();
    assert.deepEqual(done.map((x) => x.mode).sort(), ['pro', 'subpro'], 'bank changed: the newest set of each level gets new questions');
    assert.equal(await items(one.id), oneBefore, 'Set 1 stays the same');
    assert.equal((await sets.refreshLatest()).length, 0, 'only once per change');
  }
  r = await A('POST', '/api/admin/questions', { subject: 'general', topic: 'Test', question: 'Q?', choices: ['a', 'b', 'c', 'd'], answer: 2 });
  assert.ok(r.data.id);
  r = await A('POST', '/api/admin/questions/import', [{ subject: 'numerical', question: 'Q2?', choices: ['1', '2', '3', '4'], answer: 0 }, { subject: 'bad' }]);
  assert.equal(r.data.added, 1); assert.equal(r.data.errors.length, 1);

  r = await A('GET', '/api/admin/users');
  const juan = r.data.find((u) => u.email === 'juan@test.ph');
  assert.equal((await A('POST', `/api/admin/users/${juan.id}/report`)).status, 200);
  // Undo in Admin → Users puts back the exact Premium end date.
  await A('PATCH', `/api/admin/users/${juan.id}`, { premium_days: 30 });
  await A('PATCH', `/api/admin/users/${juan.id}`, { premium_until: juan.premium_until || 0 });
  r = await A('GET', '/api/admin/users');
  assert.equal(r.data.find((u) => u.id === juan.id).premium_until || 0, juan.premium_until || 0, 'premium end date restored');
  await A('PATCH', `/api/admin/users/${juan.id}`, { disabled: true });
  assert.equal((await U('GET', '/api/attempts')).status, 401, 'disabled user logged out');

  // Automatic updates: the service worker and the phone app get the screens' version and a zip of them.
  const web = require('../src/webbuild');
  const sw = await (await fetch(base + '/sw.js')).text();
  assert.ok(sw.includes(`'${web.versionOf()}'`) && !sw.includes('__VERSION__'), 'service worker has the version');
  r = await client()('GET', '/api/app/update');
  assert.equal(r.data.version, web.versionOf());
  const zr = await fetch(base + r.data.url);
  assert.equal(zr.status, 200);
  const zip = Buffer.from(await zr.arrayBuffer());
  assert.equal(zip.readUInt32LE(0), 0x04034b50, 'zip file');
  const zlib = require('node:zlib');
  const files = {};
  for (let o = 0; zip.readUInt32LE(o) === 0x04034b50;) {
    const size = zip.readUInt32LE(o + 18), n = zip.readUInt16LE(o + 26), name = zip.toString('utf8', o + 30, o + 30 + n);
    const data = zlib.inflateRawSync(zip.subarray(o + 30 + n, o + 30 + n + size));
    assert.equal(web.crc32(data), zip.readUInt32LE(o + 14), name + ' checksum');
    files[name] = data; o += 30 + n + size;
  }
  assert.ok(files['index.html'] && files['app.js'] && files['icons/icon-192.png'] && !files['sw.js'], 'zip has the screens');
  assert.ok(files['config.js'].toString().includes(`window.CSE_API = "${base}"`) && files['config.js'].toString().includes(web.versionOf()));
  assert.equal((await fetch(base + '/api/app/bundle/old.zip')).status, 404);

  // Auto Fix: the service worker can repair its files, the page has a boot guard, a broken JSON body
  // gets a JSON error (the server keeps running), and the app version matches package.json and the docs.
  assert.ok(sw.includes("type === 'repair'"), 'service worker can repair its files');
  const html = await (await fetch(base + '/')).text();
  assert.ok(html.includes('CSE_ALIVE') && html.includes('cse-fix-boot'), 'index.html has the boot guard');
  const bad = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' });
  assert.equal(bad.status, 400);
  assert.ok((await bad.json()).error, 'broken JSON gets a JSON error');
  assert.equal((await fetch(base + '/api/meta')).status, 200, 'server still running');
  const fs = require('node:fs'), path = require('node:path');
  const ver = require('../package.json').version;
  assert.ok(fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8').includes(`APP_VERSION = '${ver}'`), 'app.js version = package.json');
  assert.ok(fs.readFileSync(path.join(__dirname, '..', 'docs', 'DOKUMENTASYON.md'), 'utf8').includes(`**Kasalukuyang bersyon:** ${ver}`), 'docs version = package.json');
  // Explanations: every generated question has a full explanation, every topic has a Quick Note,
  // and saved built-in questions show the newest explanation.
  const explain = require('../src/explain');
  const { GENERATORS } = require('../src/generators');
  const { QUESTIONS } = require('../src/bank');
  const topics = new Set(QUESTIONS.map((q) => q.t));
  for (const gens of Object.values(GENERATORS)) for (const g of gens) for (let i = 0; i < 40; i++) {
    let it; try { it = g(); } catch { continue; }
    if (!it) continue;
    topics.add(it.topic);
    assert.ok(it.explanation && !/undefined|NaN|\$\{/.test(it.explanation), `${g.name}: explanation`);
  }
  assert.deepEqual([...topics].filter((t) => !explain.TIPS[t]), [], 'every topic has a Quick Note');
  assert.ok(explain.full({ subject: 'numerical', topic: 'Average', question: 'x', explanation: 'Step 1: a' }).endsWith('\nQuick Note: ' + explain.TIPS.Average));
  assert.equal(explain.full({ subject: 'numerical', topic: 'Average', question: 'x', explanation: 'a\nQuick Note: own' }), 'a\nQuick Note: own', 'its own Quick Note wins');
  const bq = QUESTIONS[0], saved = (x, extra) => ({ subject: x.s, topic: x.t, question: x.q, passage: x.p, choices: [...x.d, x.a], answer: 3, ...extra });
  assert.ok(explain.full(saved(bq, { explanation: 'old text', source: 'seed' })).startsWith(bq.e), 'saved bank questions get the newest explanation');
  assert.ok(explain.full(saved(bq, { explanation: 'admin text', source: 'admin' })).startsWith('admin text'), 'admin edits are kept');
  // Questions with the same words (e.g. "Piliin ang wastong pangungusap.") each get their OWN explanation.
  const twins = QUESTIONS.filter((x) => x.q === 'Piliin ang wastong pangungusap.');
  assert.ok(twins.length >= 2);
  for (const x of twins) assert.ok(explain.full(saved(x, { explanation: '' })).startsWith(x.e), `own explanation: ${x.a}`);
  assert.ok(explain.full(saved(twins[0], { explanation: '' })).includes('nang'), 'Tumakbo siya nang mabilis → the nang/ng explanation');
  assert.ok(explain.full({ subject: 'analytical', topic: 'Classification', question: 'Which word does NOT belong to the group?', choices: ['a', 'b', 'c', 'd'], answer: 0, explanation: 'mine', source: 'generated' }).startsWith('mine'), 'generated questions keep their own explanation');
  // Every built-in question: the answer is one of the choices, the 4 choices differ, and the green answer in the
  // explanation is the right answer (never a wrong choice).
  const norm = (t) => String(t).toLowerCase().replace(/[^a-z0-9ñ']+/g, ' ').trim();
  for (const x of QUESTIONS) {
    assert.equal(new Set([x.a, ...x.d]).size, 4, `4 different choices: ${x.q}`);
    const green = [...x.e.matchAll(/==(.+?)==/g)].map((m) => norm(m[1]));
    assert.ok(green.length && green.every((g) => norm(x.a).includes(g) || g.includes(norm(x.a))), `explanation points to the answer: ${x.q} → ${x.a}`);
    assert.ok(!x.d.some((d) => green.includes(norm(d))), `explanation does not mark a wrong choice: ${x.q}`);
  }
  // Math: one small step per line. No generated math explanation multiplies or divides two big numbers in one jump.
  for (const name of ['numerical']) for (const g of GENERATORS[name]) for (let i = 0; i < 60; i++) {
    const it = g(); if (!it) continue;
    assert.ok(it.choices[it.answer] !== undefined && new Set(it.choices).size === 4, `${g.name}: 4 different choices`);
    for (const m of it.explanation.matchAll(/(\d[\d,]*) ([×÷]) (\d[\d,]*) = (\d[\d,.]*)/g)) {
      const [a, b] = [m[1], m[3]].map((v) => Number(v.replace(/,/g, '')));
      const hard = m[2] === '×' ? a > 12 && b > 12 && !(a % 10 === 0 || b % 10 === 0) : b > 12 && a / b > 12 && a % 10 !== 0;
      assert.ok(!hard, `${g.name}: "${m[0]}" is too big a jump`);
    }
  }
  // The odd-one-out number is the only one that breaks every simple rule.
  const oddGen = GENERATORS.analytical.find((g) => g.name === 'oddNumber');
  for (let i = 0; i < 200; i++) {
    const it = oddGen(); if (!it) continue;
    const nums = it.choices.map(Number);
    for (let k = 2; k <= 12; k++) { const out = nums.filter((v) => v % k); assert.ok(!(out.length === 1 && out[0] !== nums[it.answer]), `oddNumber: only one odd one out (${nums})`); }
  }
  // Word choices: no wrong choice is a near-synonym of the right one.
  const { lists } = require('../src/generators');
  for (const g of GENERATORS.verbal.filter((x) => /synonym|antonym|kasing|kasalungat/i.test(x.name))) for (let i = 0; i < 100; i++) {
    const it = g(); if (!it) continue;
    const w = it.question.split(': ').pop().toLowerCase();
    const row = [...lists.VOCAB, ...lists.SALITA].find((x) => x[0] === w);
    if (!row) continue;
    for (const c of it.choices) {
      if (c === it.choices[it.answer] || c === row[1] || c === row[2]) continue; // the answer, or the planned trap
      const src = [...lists.VOCAB, ...lists.SALITA].find((x) => x[1] === c || x[2] === c);
      assert.ok(!src || src[0] === w || !lists.sameFamily(src[0], w), `${g.name}: "${c}" is too close to ${w}`);
    }
  }
  console.log('All smoke tests passed.');
  srv.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
