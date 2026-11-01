// Background jobs (every 10 minutes): study reminder emails, Premium expiry emails, and audit log cleanup.
// Each job is safe to run more than once: what was sent is remembered in the database.
const db = require('./db');
const mail = require('./mail');
const audit = require('./audit');
const { phDay, streakOf } = require('./review');

// Minutes since midnight in the Philippines.
const phMinutes = (ms = Date.now()) => Math.floor(((ms + 8 * 3600e3) % 864e5) / 60e3);

// Study reminder by email, once a day at the chosen time, only if the user has not studied yet today.
async function studyReminders(now = Date.now()) {
  const today = phDay(now), min = phMinutes(now);
  const dayStart = today * 864e5 - 8 * 3600e3;
  const due = await db.all(`SELECT p.user_id, p.remind_min, u.name, u.email FROM user_prefs p JOIN users u ON u.id = p.user_id
    WHERE p.remind_email = 1 AND p.reminded_day < ? AND p.remind_min <= ? AND u.disabled = 0 AND u.email_verified = 1
      AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.user_id = p.user_id AND a.started_at >= ?) LIMIT 200`, today, min, dayStart);
  for (const u of due) {
    await db.run('UPDATE user_prefs SET reminded_day = ? WHERE user_id = ?', today, u.user_id);
    const days = (await db.all('SELECT finished_at FROM attempts WHERE user_id = ? AND finished_at IS NOT NULL AND finished_at > ?', u.user_id, now - 400 * 864e5)).map((r) => phDay(r.finished_at));
    mail.studyReminder(u.email, u.name, streakOf(days, today).current);
  }
  return due.length;
}

// Premium ends in 3 days, in 1 day, or just ended: one email each (only when Premium is required).
async function expiryReminders(st, now = Date.now()) {
  if (st.premium_required !== '1') return 0;
  const rows = await db.all(`SELECT id, name, email, premium_until, expiry_notice FROM users
    WHERE role != 'admin' AND disabled = 0 AND premium_until > ? AND premium_until < ?`, now - 2 * 864e5, now + 3 * 864e5);
  let n = 0;
  for (const u of rows) {
    const left = u.premium_until - now;
    const stage = left <= 0 ? 0 : left <= 864e5 ? 1 : 3;
    const tag = `${u.premium_until}:${stage}`;
    // Already sent this stage (or a later one) for this end date.
    const [doneUntil, doneStage] = String(u.expiry_notice || '').split(':');
    if (Number(doneUntil) === u.premium_until && Number(doneStage) <= stage) continue;
    await db.run('UPDATE users SET expiry_notice = ? WHERE id = ?', tag, u.id);
    mail.premiumExpiry(u.email, u.name, u.premium_until, stage ? Math.max(1, Math.ceil(left / 864e5)) : 0, st.price, st.plan_days);
    n++;
  }
  return n;
}

async function runAll(getSettings) {
  const out = {};
  for (const [k, fn] of [['reminders', () => studyReminders()], ['expiry', async () => expiryReminders(await getSettings())], ['audit', () => audit.cleanup()]]) {
    try { out[k] = await fn(); } catch (e) { console.error(`Job ${k} failed (server kept running):`, e.message); }
  }
  return out;
}

module.exports = { studyReminders, expiryReminders, runAll, phMinutes };
