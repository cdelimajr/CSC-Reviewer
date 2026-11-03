// Promo codes for Premium (Admin → Promo codes).
// - A code takes a percent (1-100) or a fixed peso amount off the Premium price. It can have an end date,
//   a limit on how many people may use it, and it can be turned off at any time.
// - The discounted price is always worked out here on the server, from the price in Settings. The app only
//   sends the code, never a price.
// - Each account can use a code once (promo_redemptions has one row per code and account).
// - A code counts as used only when the payment goes through: paid online, or approved by the admin.
//   A 100%-off code turns on Premium right away, with no payment (see server.js /api/promo/redeem).
// - A code can be for some plans only (plans: "day,week,year"; empty = every plan). Group Premium counts as
//   the monthly or yearly plan it is bought for.
const db = require('./db');

const MIN_ONLINE = 20; // PayMongo's smallest payment (₱20)
const norm = (c) => String(c || '').trim().toUpperCase().replace(/\s+/g, '');
const CODE_OK = /^[A-Z0-9_-]{3,30}$/;
const money = (n) => Math.round(n * 100) / 100;
const PLAN_IDS = ['day', 'week', 'month', 'year'];
const PLAN_NAMES = { day: 'Isang araw', week: 'Lingguhan', month: 'Buwanan', year: 'Taunan' };
// The plans a code works on, as a list (every plan when none are set).
const plansOf = (p) => { const l = String((p && p.plans) || '').split(',').filter((x) => PLAN_IDS.includes(x)); return l.length ? l : PLAN_IDS.slice(); };
const forPlan = (p, plan) => !plan || plansOf(p).includes(plan);
const planList = (l) => l.map((x) => PLAN_NAMES[x]).join(', ').replace(/, ([^,]*)$/, ' at $1');

const ERR = {
  bad: 'Hindi tama o hindi na gumagana ang promo code.',
  expired: 'Expired na ang promo code na ito.',
  full: 'Naubos na ang promo code na ito.',
  used: 'Nagamit mo na ang promo code na ito.',
  plan: (p) => `Para lang sa ${planList(plansOf(p))} na plan ang promo code na ito. Pumili ng ganoong plan.`,
};

// Price after the code. online: the price PayMongo charges (at least ₱20, unless it is free).
function priceAfter(p, price) {
  price = Number(price) || 0;
  const discount = money(Math.min(price, p.kind === 'percent' ? price * Number(p.value) / 100 : Number(p.value)));
  const amount = money(Math.max(0, price - discount));
  return { price, discount, amount, online: amount > 0 ? Math.max(MIN_ONLINE, amount) : 0, free: amount === 0 };
}

// Can this user use this code now, on this plan? Returns { ok, error } or { ok, promo, price, discount, amount, online, free }.
// A code for other plans only gives error 'plan' and the plans it works on.
async function check(userId, code, price, plan) {
  const c = norm(code);
  if (!CODE_OK.test(c)) return { ok: false, error: ERR.bad };
  const p = await db.get('SELECT * FROM promo_codes WHERE code = ?', c);
  if (!p || !p.active) return { ok: false, error: ERR.bad };
  if (await db.get('SELECT 1 FROM promo_redemptions WHERE promo_id = ? AND user_id = ?', p.id, userId)) return { ok: false, error: ERR.used };
  if (p.expires_at && p.expires_at <= Date.now()) return { ok: false, error: ERR.expired };
  if (p.max_uses && p.used >= p.max_uses) return { ok: false, error: ERR.full };
  if (!forPlan(p, plan)) return { ok: false, error: ERR.plan(p), plans: plansOf(p) };
  return { ok: true, promo: p, ...priceAfter(p, price) };
}

// The code was used on a payment that went through (paid online or approved by the admin).
// The payment is already paid, so it always counts, even if the code ran out in the meantime.
// Safe to call more than once for the same payment.
async function used(payment) {
  if (!payment.promo_id) return false;
  const r = await db.run(`INSERT OR IGNORE INTO promo_redemptions (promo_id, user_id, payment_id, price, discount, amount, at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    payment.promo_id, payment.user_id, payment.id, String(payment.list_price || ''), String(payment.discount || ''), String(payment.amount || ''), Date.now());
  if (r.changes === 1) await db.run('UPDATE promo_codes SET used = used + 1 WHERE id = ?', payment.promo_id);
  return r.changes === 1;
}

// A 100%-off code: take one use now, only if the code is still open and this user has not used it.
// Two taps at the same time (or two people on the last use) cannot both get it.
async function claimFree(promo, userId, price) {
  const r = await db.run(`INSERT OR IGNORE INTO promo_redemptions (promo_id, user_id, price, discount, amount, at) VALUES (?, ?, ?, ?, '0', ?)`,
    promo.id, userId, String(price), String(price), Date.now());
  if (r.changes !== 1) return { ok: false, error: ERR.used };
  const u = await db.run(`UPDATE promo_codes SET used = used + 1 WHERE id = ? AND active = 1 AND (max_uses = 0 OR used < max_uses) AND (expires_at = 0 OR expires_at > ?)`,
    promo.id, Date.now());
  if (u.changes !== 1) {
    await db.run('DELETE FROM promo_redemptions WHERE promo_id = ? AND user_id = ?', promo.id, userId);
    return { ok: false, error: ERR.full };
  }
  return { ok: true };
}
const linkPayment = (promoId, userId, paymentId) => db.run('UPDATE promo_redemptions SET payment_id = ? WHERE promo_id = ? AND user_id = ?', paymentId, promoId, userId);

// Admin: check and clean what the admin typed. Returns { error } or the clean fields.
function clean(body, { creating }) {
  const out = {};
  if (creating) {
    out.code = norm(body.code);
    if (!CODE_OK.test(out.code)) return { error: 'Ang code ay 3 hanggang 30 letra o numero (pwede ang - at _), walang space.' };
    out.kind = body.kind === 'fixed' ? 'fixed' : 'percent';
    const v = Number(body.value);
    if (!Number.isFinite(v) || v <= 0) return { error: 'Ilagay ang discount (higit sa 0).' };
    if (out.kind === 'percent' && v > 100) return { error: 'Hanggang 100% lang ang discount.' };
    out.value = out.kind === 'percent' ? Math.round(v) : money(v);
  }
  if (body.expires_at !== undefined) {
    const t = Number(body.expires_at) || 0;
    out.expires_at = t > 0 ? Math.round(t) : 0;
  }
  if (body.max_uses !== undefined) out.max_uses = Math.max(0, Math.min(1e6, Math.round(Number(body.max_uses) || 0)));
  if (body.active !== undefined) out.active = body.active ? 1 : 0;
  if (body.note !== undefined) out.note = String(body.note || '').slice(0, 200);
  if (body.plans !== undefined) {
    // A list or "day,week". No plan ticked, or all four, means every plan (kept as '').
    const l = PLAN_IDS.filter((x) => (Array.isArray(body.plans) ? body.plans : String(body.plans || '').split(',')).map(String).includes(x));
    out.plans = l.length === PLAN_IDS.length ? '' : l.join(',');
  }
  return out;
}

const label = (p) => (p.kind === 'percent' ? `${p.value}%` : `₱${p.value}`);

module.exports = { check, used, claimFree, linkPayment, clean, priceAfter, norm, label, ERR, MIN_ONLINE, plansOf, forPlan, planList, PLAN_IDS };
