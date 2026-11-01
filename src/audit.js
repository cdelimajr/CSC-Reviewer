// Audit log and suspicious-login alerts.
// - Every login (and failed login), password change, and admin change is written to audit_log
//   with the time, the account, who did it, the IP address and a short device name ("Android · App").
// - A login from a new place AND a new device (never seen in the account's last 20 logins) is marked as an
//   alert, and the account owner gets an email: "if this was not you, change your password".
// - 5 failed logins on one account within 15 minutes is also an alert (email to the owner, once per hour).
// - Admins see everything in Admin → Audit log. Entries older than 180 days are deleted (see jobs.js).
const db = require('./db');
const mail = require('./mail');

const KEEP_DAYS = 180;

// "Android · Chrome", "iPhone · App", "Windows · Edge"… Only the kind of device, never a unique ID.
function deviceName(req) {
  const ua = String(req.get('user-agent') || '');
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iPod/i.test(ua) ? 'iPhone' : /Windows/i.test(ua) ? 'Windows'
    : /Mac OS X|Macintosh/i.test(ua) ? 'Mac' : /CrOS/i.test(ua) ? 'Chromebook' : /Linux/i.test(ua) ? 'Linux' : 'Iba pa';
  const app = req.get('X-App') ? 'App' : /Electron/i.test(ua) ? 'App' : /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera'
    : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  return `${os} · ${app}`;
}
const ipOf = (req) => String(req.ip || '').replace(/^::ffff:/, '').slice(0, 64);
// The network part of the address (same Wi-Fi or same mobile network area usually shares it).
function ipPrefix(ip) {
  if (!ip) return '';
  if (ip.includes(':')) return ip.split(':').slice(0, 4).join(':');
  return ip.split('.').slice(0, 3).join('.');
}

async function log(req, action, { userId = null, actorId, detail = '', alert = false } = {}) {
  try {
    await db.run('INSERT INTO audit_log (at, user_id, actor_id, action, detail, ip, device, alert) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      Date.now(), userId, actorId === undefined ? (req && req.user ? req.user.id : null) : actorId, action, String(detail).slice(0, 300),
      req ? ipOf(req) : '', req ? deviceName(req) : '', alert ? 1 : 0);
  } catch (e) { console.error('Audit log error:', e.message); }
}

// After a successful login. how: password, code, device (face/fingerprint), register.
async function login(req, user, how) {
  const ip = ipOf(req), device = deviceName(req), pre = ipPrefix(ip);
  let alert = false;
  try {
    const seen = await db.all(`SELECT ip, device FROM audit_log WHERE user_id = ? AND action = 'login' AND at > ? ORDER BY id DESC LIMIT 20`,
      user.id, Date.now() - 90 * 864e5);
    alert = seen.length > 0 && !seen.some((s) => ipPrefix(s.ip) === pre) && !seen.some((s) => s.device === device);
  } catch { /* no alert */ }
  await log(req, 'login', { userId: user.id, actorId: user.id, detail: how + (alert ? ' · bagong lugar at device' : ''), alert });
  if (alert) mail.newLogin(user.email, user.name, { when: Date.now(), device, ip, how });
  return alert;
}

// After a wrong password (only for an existing account).
const failNotified = new Map();
async function failed(req, user) {
  await log(req, 'login_failed', { userId: user.id, actorId: null });
  try {
    const n = (await db.get(`SELECT COUNT(*) AS n FROM audit_log WHERE user_id = ? AND action = 'login_failed' AND at > ?`, user.id, Date.now() - 15 * 60e3)).n;
    if (n >= 5 && Date.now() - (failNotified.get(user.id) || 0) > 3600e3) {
      failNotified.set(user.id, Date.now());
      await log(req, 'login_failed_many', { userId: user.id, actorId: null, detail: `${n} maling password sa loob ng 15 minuto`, alert: true });
      mail.failedLogins(user.email, user.name, { count: n, device: deviceName(req), ip: ipOf(req) });
    }
  } catch { /* ignore */ }
}

const cleanup = () => db.run('DELETE FROM audit_log WHERE at < ?', Date.now() - KEEP_DAYS * 864e5);

module.exports = { log, login, failed, cleanup, deviceName, ipOf, ipPrefix, KEEP_DAYS };
