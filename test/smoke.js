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
  const client = () => {
    let cookie = '';
    return async (method, url, body) => {
      const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', cookie }, body: body && JSON.stringify(body) });
      const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
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

  // Premium: turn on, user blocked from mock exams, pays, admin approves
  await A('PUT', '/api/admin/settings', { premium_required: '1', price: '99', plan_days: '30', pay_number: '09171234567' });
  assert.equal((await U('POST', '/api/attempts', { mode: 'pro' })).status, 402, 'premium required');
  assert.equal((await U('POST', '/api/attempts', { mode: 'practice', subject: 'verbal' })).status, 200, 'practice stays free');
  // Free plan limits: 3 practice a day (up to 20 items), Set 1 only, no offline
  r = await U('POST', '/api/attempts', { mode: 'practice', subject: 'numerical', count: 50 });
  assert.equal(r.data.items.length, 20, 'free practice capped at 20 items');
  assert.equal((await U('POST', '/api/attempts', { mode: 'practice', subject: 'verbal' })).status, 402, 'daily practice limit');
  assert.equal((await U('GET', '/api/me')).data.practice_today, 3);
  r = await U('GET', '/api/sets?mode=pro');
  const s1 = r.data.find((x) => x.number === 1), s3 = r.data.find((x) => x.number === 3);
  assert.equal(s1.locked, false); assert.equal(s3.locked, true);
  assert.equal((await U('POST', '/api/attempts', { mode: 'pro', set_id: s3.id })).status, 402, 'other sets need Premium');
  r = await U('POST', '/api/attempts', { mode: 'pro', set_id: s1.id });
  assert.equal(r.status, 402, 'free plan: one mock exam a day (Juan already took some today)'); assert.equal(r.data.code, 'mock_daily');
  // A new free user: Set 1 once a day, short review (letters only), no email of the full review
  const F = client();
  await F('POST', '/api/auth/register', { name: 'Free', email: 'free@test.ph', password: 'password123' });
  await F('POST', '/api/auth/verify', { code: lastCode('free@test.ph') });
  r = await F('POST', '/api/attempts', { mode: 'subpro', set_id: (await F('GET', '/api/sets?mode=subpro')).data.find((x) => x.number === 1).id });
  assert.equal(r.status, 200, 'Set 1 is free');
  const fid = r.data.id;
  assert.equal((await F('GET', '/api/me')).data.mock_today, 1);
  assert.equal((await F('POST', '/api/attempts', { mode: 'pro', set_id: s1.id })).status, 402, 'second mock exam today is blocked (server, per account)');
  r = await F('POST', `/api/attempts/${fid}/submit`, { answers: { 0: 1, 1: 2 } });
  assert.equal(r.data.lite, true, 'free review is short');
  assert.ok(r.data.items.every((it) => Object.keys(it).sort().join() === 'answer,subject'), 'only the letter of the answer: no question, choices or explanation');
  assert.ok(r.data.breakdown && typeof r.data.score === 'number', 'score per subject');
  assert.equal((await F('GET', `/api/attempts/${fid}`)).data.lite, true);
  assert.equal((await F('POST', `/api/attempts/${fid}/email`, {})).status, 402, 'email of the full review is Premium');
  assert.equal((await A('GET', `/api/attempts/${fid}`)).data.lite, undefined, 'admin sees the full review');
  assert.equal((await U('GET', '/api/offline/pack')).status, 402, 'offline is Premium only');
  assert.equal((await U('POST', '/api/payments', { reference: 'GC123456' })).status, 200);
  assert.ok(mail.outbox.some((m) => m.to === 'admin@test.ph' && m.subject.startsWith('Bagong bayad')), 'admin notified');
  r = await A('GET', '/api/admin/payments');
  assert.equal(r.data.length, 1);
  r = await A('POST', `/api/admin/payments/${r.data[0].id}`, { action: 'approve' });
  assert.ok(r.data.until > Date.now() + 29 * 864e5);
  r = await U('GET', '/api/premium'); assert.equal(r.data.active, true);
  assert.equal((await U('POST', '/api/attempts', { mode: 'subpro' })).status, 200, 'premium unlocks mocks');

  // Online payment (PayMongo, faked here): checkout, signed webhook, Premium extended once only
  const sessions = {};
  const fake = require('express')().use(require('express').json())
    .post('/v1/checkout_sessions', (q, s) => {
      assert.equal(q.get('authorization'), 'Basic ' + Buffer.from('sk_test_key:').toString('base64'));
      const at = q.body.data.attributes;
      assert.ok(at.payment_method_types.includes('gcash') && at.payment_method_types.includes('paymaya'));
      const cs = { id: 'cs_' + (Object.keys(sessions).length + 1), attributes: { reference_number: at.reference_number, line_items: at.line_items, status: 'active', payments: [], checkout_url: 'https://checkout.paymongo.test/' + at.reference_number } };
      sessions[cs.id] = cs; s.json({ data: cs });
    })
    .get('/v1/checkout_sessions/:id', (q, s) => (sessions[q.params.id] ? s.json({ data: sessions[q.params.id] }) : s.status(404).json({ errors: [{ detail: 'not found' }] })))
    .listen(0);
  process.env.PAYMONGO_API_URL = `http://127.0.0.1:${fake.address().port}`;
  const payIt = (cs, method) => Object.assign(cs.attributes, { payment_method_used: method, payments: [{ id: 'pay_' + cs.id, attributes: { status: 'paid', amount: cs.attributes.line_items[0].amount } }] });
  assert.equal((await U('GET', '/api/me')).data.config.online_pay, true);
  const before = (await U('GET', '/api/premium')).data.until;
  r = await U('POST', '/api/payments/checkout', {});
  assert.ok(r.data.url.startsWith('https://checkout.paymongo.test/'), 'checkout link');
  assert.equal((await U('POST', '/api/payments/checkout', {})).data.url, r.data.url, 'unpaid checkout reused');
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
  await U('POST', '/api/payments/checkout', {});
  payIt(Object.values(sessions)[1], 'paymaya');
  r = await U('GET', '/api/premium');
  assert.ok(Math.abs(r.data.until - (before + 60 * 864e5)) < 5000, 'premium page picks up the payment');
  fake.close();

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

  // Premium: email the full review with the PDF attached
  const mocks = (await U('GET', '/api/attempts')).data.filter((x) => x.mode !== 'practice' && x.finished_at);
  r = await U('POST', `/api/attempts/${mocks[0].id}/email`, { lang: 'en' });
  assert.equal(r.status, 200); assert.equal(r.data.to, 'juan@test.ph');
  const rev = [...mail.outbox].reverse().find((m) => m.subject.startsWith('Mga tanong at sagot'));
  assert.ok(rev && rev.attachments.length === 1 && rev.attachments[0].endsWith('.pdf'), 'review email has the PDF');
  const pdfBytes = require('../public/pdf').report({ ...(await U('GET', `/api/attempts/${mocks[0].id}`)).data }, { subjects: {} });
  assert.equal(Buffer.from(pdfBytes.slice(0, 8)).toString(), '%PDF-1.4');

  // Admin settings: exam watermark, payment switches, manual accounts (Maya, PayPal, bank), ads
  r = await U('GET', '/api/me');
  assert.equal(r.data.config.watermark, true, 'watermark on by default'); assert.equal(r.data.config.ads.on, true);
  r = await A('GET', '/api/admin/settings');
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
  assert.equal((await U('POST', '/api/payments/checkout', {})).status, 404, 'checkout off');
  const png = 'data:image/png;base64,' + Buffer.from('89504e470d0a1a0a', 'hex').toString('base64');
  assert.equal((await A('PUT', '/api/admin/pay-qr/maya', { data: png })).status, 200);
  assert.equal((await fetch(base + '/api/pay/qr/maya')).headers.get('content-type'), 'image/png', 'QR code served');
  assert.equal((await U('GET', '/api/premium')).data.methods.find((m) => m.id === 'maya').has_qr, true);
  assert.equal((await U('POST', '/api/payments', { method_id: 'coins', reference: 'PP123456' })).status, 400, 'turned-off account refused');
  assert.equal((await U('POST', '/api/payments', { method_id: 'maya', reference: 'MY123456', proof: 'data:text/html;base64,AAAA' })).status, 400, 'proof must be an image');
  assert.equal((await U('POST', '/api/payments', { method_id: 'maya', reference: 'MY123456', proof: png })).status, 200);
  r = await A('GET', '/api/admin/payments');
  const mp = r.data.find((x) => x.reference === 'MY123456');
  assert.equal(mp.method, 'Maya'); assert.equal(mp.has_proof, 1); assert.equal(mp.proof, undefined, 'list does not carry the image');
  assert.equal((await A('GET', `/api/admin/payments/${mp.id}/proof`)).data.proof, png);
  await A('POST', `/api/admin/payments/${mp.id}`, { action: 'reject', note: 'test' });
  await A('PUT', '/api/admin/settings', { pay_manual_on: '0' });
  assert.equal((await U('POST', '/api/payments', { method_id: 'maya', reference: 'MY999999' })).status, 403, 'manual payment off');
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

  // Guided tour for new Premium users: shown once per account
  assert.equal((await U('GET', '/api/me')).data.user.tour_done, false);
  await U('POST', '/api/me/tour', { done: true });
  assert.equal((await U('GET', '/api/me')).data.user.tour_done, true);

  // Admin
  assert.equal((await U('GET', '/api/admin/users')).status, 403, 'user blocked from admin');
  r = await A('GET', '/api/admin/overview'); assert.equal(r.data.users, 3); assert.equal(r.data.premiumUsers, 1);
  r = await A('POST', '/api/admin/sets', { mode: 'subpro' }); assert.equal(r.data.number, 4);
  r = await A('POST', '/api/admin/questions', { subject: 'general', topic: 'Test', question: 'Q?', choices: ['a', 'b', 'c', 'd'], answer: 2 });
  assert.ok(r.data.id);
  r = await A('POST', '/api/admin/questions/import', [{ subject: 'numerical', question: 'Q2?', choices: ['1', '2', '3', '4'], answer: 0 }, { subject: 'bad' }]);
  assert.equal(r.data.added, 1); assert.equal(r.data.errors.length, 1);

  r = await A('GET', '/api/admin/users');
  const juan = r.data.find((u) => u.email === 'juan@test.ph');
  assert.equal((await A('POST', `/api/admin/users/${juan.id}/report`)).status, 200);
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
  console.log('All smoke tests passed.');
  srv.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
