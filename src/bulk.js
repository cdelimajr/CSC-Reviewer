// Group Premium (bulk payment): one person (e.g. a boss or a school) pays once for Premium for several people.
// - The price is always worked out here on the server: Premium price × number of people, less a group
//   discount that grows with the number of people (Admin → Settings → Group Premium, e.g. "5:10,10:15,20:20"
//   means 10% off for 5 or more, 15% for 10 or more, 20% for 20 or more). Promo codes are not added on top.
// - After the payment goes through, each seat gets a one-time code (GRP-XXXX-XXXX). The buyer shares the code
//   or link, or types the person's email so only that account can use it (the code is emailed to them).
// - A code turns on Premium (the plan days at the time of buying) for the person who uses it. One seat per
//   person in each group. Unused seats expire (seat_days after payment, 90 days by default).
const crypto = require('node:crypto');
const db = require('./db');

const MIN_ONLINE = 20; // PayMongo's smallest payment (₱20)
const money = (n) => Math.round(n * 100) / 100;
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I, easy to read out loud
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ERR = {
  bad: 'Hindi tama ang group code, o hindi na ito gumagana.',
  expired: 'Expired na ang group code na ito. Humingi ng bago sa bumili.',
  taken: 'Nagamit na ng ibang account ang group code na ito.',
  mine: 'Nagamit mo na ang group code na ito.',
  one: 'May seat ka na sa grupong ito. Isang seat lang kada tao.',
  email: 'Para sa ibang email ang group code na ito. Mag-login gamit ang email na binigay sa bumili.',
};

// "5:10,10:15,20:20" → [{ min: 5, pct: 10 }, …], smallest first. Bad parts are skipped.
function parseTiers(text) {
  return String(text || '').split(',').map((x) => x.trim().split(':').map(Number))
    .filter(([min, pct]) => Number.isInteger(min) && min >= 2 && min <= 1000 && Number.isFinite(pct) && pct > 0 && pct <= 90)
    .map(([min, pct]) => ({ min, pct: Math.round(pct) }))
    .sort((a, b) => a.min - b.min);
}

// The settings that shape group buying.
function limits(st) {
  const min = Math.max(2, Math.min(100, Math.round(Number(st.bulk_min) || 2)));
  return {
    on: st.bulk_on !== '0',
    min,
    max: Math.max(min, Math.min(500, Math.round(Number(st.bulk_max) || 50))),
    tiers: parseTiers(st.bulk_tiers),
    seat_days: Math.max(7, Math.min(730, Math.round(Number(st.bulk_seat_days) || 90))),
    days: Number(st.plan_days) || 30,
    price: Number(st.price) || 0,
  };
}

// The price for qty people. Returns { error } or { qty, price, pct, list, discount, total, each, online }.
function quote(st, qty) {
  const L = limits(st);
  qty = Number(qty);
  if (!Number.isInteger(qty) || qty < L.min || qty > L.max) return { error: `Pumili ng ${L.min} hanggang ${L.max} na tao.` };
  const pct = L.tiers.reduce((p, t) => (qty >= t.min ? t.pct : p), 0);
  const list = money(L.price * qty);
  const discount = money(list * pct / 100);
  const total = money(list - discount);
  return { qty, price: L.price, pct, list, discount, total, each: money(total / qty), online: Math.max(MIN_ONLINE, total), days: L.days, seat_days: L.seat_days };
}

// Emails typed by the buyer (one per line or comma), cleaned. Returns { error } or { emails }.
function cleanEmails(raw, qty) {
  const list = (Array.isArray(raw) ? raw : String(raw || '').split(/[\s,;]+/)).map((e) => String(e).trim().toLowerCase()).filter(Boolean);
  const bad = list.find((e) => e.length > 120 || !EMAIL.test(e));
  if (bad) return { error: `Hindi tamang email: ${bad.slice(0, 60)}` };
  const emails = [...new Set(list)];
  if (emails.length > qty) return { error: `Mas marami ang email (${emails.length}) kaysa sa bilang ng tao (${qty}).` };
  return { emails };
}

const newCode = () => {
  const b = crypto.randomBytes(8);
  const s = [...b].map((x) => ALPHA[x % 32]).join('');
  return `GRP-${s.slice(0, 4)}-${s.slice(4)}`;
};
// "grp xxxx xxxx", "GRPXXXXXXXX" → "GRP-XXXX-XXXX", or '' when it is not a group code.
function normCode(c) {
  const s = String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^GRP[A-Z0-9]{8}$/.test(s) ? `GRP-${s.slice(3, 7)}-${s.slice(7)}` : '';
}
const isCode = (c) => !!normCode(c);

// The payment went through: mark the group paid and make its seats. Safe to call more than once
// (only the first call makes seats). Returns the seats when they were just made, or null.
async function fulfill(orderId, paymentId) {
  const now = Date.now();
  const r = await db.run(`UPDATE bulk_orders SET status = 'paid', paid_at = ?, payment_id = COALESCE(payment_id, ?) WHERE id = ? AND status != 'paid'`, now, paymentId || null, orderId);
  if (r.changes !== 1) return null;
  const o = await db.get('SELECT * FROM bulk_orders WHERE id = ?', orderId);
  let emails = [];
  try { emails = JSON.parse(o.emails || '[]'); } catch { emails = []; }
  const expires = now + o.seat_days * 864e5;
  for (let i = 0; i < o.qty; i++) {
    // A new code each time; on the (very rare) same code, try again.
    for (let t = 0; t < 5; t++) {
      const x = await db.run('INSERT OR IGNORE INTO bulk_seats (order_id, code, email, expires_at, created_at) VALUES (?, ?, ?, ?, ?)', o.id, newCode(), emails[i] || '', expires, now);
      if (x.changes === 1) break;
    }
  }
  return db.all('SELECT * FROM bulk_seats WHERE order_id = ? ORDER BY id', o.id);
}

// Take a seat for this user. Returns { ok, seat, order } or { error, status }.
async function claim(user, code) {
  const c = normCode(code);
  if (!c) return { error: ERR.bad, status: 400 };
  const seat = await db.get('SELECT * FROM bulk_seats WHERE code = ?', c);
  const order = seat && await db.get('SELECT * FROM bulk_orders WHERE id = ?', seat.order_id);
  if (!seat || !order || order.status !== 'paid') return { error: ERR.bad, status: 400 };
  if (seat.redeemed_by) return { error: seat.redeemed_by === user.id ? ERR.mine : ERR.taken, status: 409 };
  if (seat.expires_at <= Date.now()) return { error: ERR.expired, status: 400 };
  if (seat.email && seat.email.toLowerCase() !== String(user.email).toLowerCase()) return { error: ERR.email, status: 403 };
  if (await db.get('SELECT 1 FROM bulk_seats WHERE order_id = ? AND redeemed_by = ?', order.id, user.id)) return { error: ERR.one, status: 409 };
  const now = Date.now();
  let r;
  try {
    r = await db.run('UPDATE bulk_seats SET redeemed_by = ?, redeemed_at = ? WHERE id = ? AND redeemed_by IS NULL AND expires_at > ?', user.id, now, seat.id, now);
  } catch (e) {
    if (/UNIQUE/i.test(e.message)) return { error: ERR.one, status: 409 };
    throw e;
  }
  if (r.changes !== 1) return { error: ERR.taken, status: 409 }; // someone else took it at the same moment
  return { ok: true, seat: { ...seat, redeemed_by: user.id, redeemed_at: now }, order };
}

const seatState = (s) => (s.redeemed_by ? 'used' : s.expires_at <= Date.now() ? 'expired' : 'open');
// "ju***@gmail.com": enough for the person to know which email, without showing all of it.
const maskEmail = (e) => { const [a, b] = String(e || '').split('@'); return b ? `${a.slice(0, 2)}***@${b}` : ''; };

module.exports = { parseTiers, limits, quote, cleanEmails, normCode, isCode, newCode, fulfill, claim, seatState, maskEmail, ERR, EMAIL, MIN_ONLINE };
