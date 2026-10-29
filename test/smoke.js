// End-to-end API check: accounts + email verification, exam sets, mock exams, premium payments, admin.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert');
process.env.DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cse-')), 'test.db');
process.env.NODE_ENV = 'test';
process.env.REQUIRE_EMAIL_VERIFICATION = '1';
process.env.INITIAL_SETS = '3';
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

  // Exam sets (newest first) and mock exams
  r = await U('GET', '/api/sets?mode=pro');
  assert.equal(r.data.length, 3); assert.equal(r.data[0].number, 3, 'newest first');
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
  assert.equal((await U('POST', '/api/payments', { reference: 'GC123456' })).status, 200);
  assert.ok(mail.outbox.some((m) => m.to === 'admin@test.ph' && m.subject.startsWith('Bagong bayad')), 'admin notified');
  r = await A('GET', '/api/admin/payments');
  assert.equal(r.data.length, 1);
  r = await A('POST', `/api/admin/payments/${r.data[0].id}`, { action: 'approve' });
  assert.ok(r.data.until > Date.now() + 29 * 864e5);
  r = await U('GET', '/api/premium'); assert.equal(r.data.active, true);
  assert.equal((await U('POST', '/api/attempts', { mode: 'subpro' })).status, 200, 'premium unlocks mocks');

  // Admin
  assert.equal((await U('GET', '/api/admin/users')).status, 403, 'user blocked from admin');
  r = await A('GET', '/api/admin/overview'); assert.equal(r.data.users, 2); assert.equal(r.data.premiumUsers, 1);
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
  console.log('All smoke tests passed.');
  srv.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
