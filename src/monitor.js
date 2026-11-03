// Server monitoring for Admin → Overview → "Server monitoring": how busy the server is (% of what it can
// handle) and whether access is still OK. Everything is counted in memory (nothing is saved), so it starts
// from zero after a restart or deploy.
// - Active users: accounts that made a request in the last 5 minutes.
// - Requests per minute, slow answers and server errors in the last 5 minutes.
// - Memory and CPU of the server, and the delay of the event loop (high = the server is too busy).
// - Database: how long a small query takes.
// The % load is the highest of: active users ÷ capacity_users (Admin → Settings), memory ÷ memory limit,
// and CPU ÷ CPU limit. Render's free plan has 512 MB of memory and 0.1 CPU.
const os = require('node:os');
const { monitorEventLoopDelay } = require('node:perf_hooks');

const ON_RENDER = !!process.env.RENDER;
const MEM_LIMIT_MB = Number(process.env.MEMORY_LIMIT_MB) || (ON_RENDER ? 512 : Math.round(os.totalmem() / 1048576));
const CPU_LIMIT = Number(process.env.CPU_LIMIT) || (ON_RENDER ? 0.1 : (os.availableParallelism ? os.availableParallelism() : os.cpus().length));
const ACTIVE_MS = 5 * 60e3;
const started = Date.now();

const loop = monitorEventLoopDelay({ resolution: 20 });
loop.enable();

const seen = new Map(); // user id -> last request time
const minutes = new Map(); // minute -> { req, slow, err }
let inFlight = 0, peakActive = 0, peakAt = 0;
const minuteOf = (t) => Math.floor(t / 60e3);
const bucket = (t = Date.now()) => {
  const m = minuteOf(t);
  let b = minutes.get(m);
  if (!b) { b = { req: 0, slow: 0, err: 0 }; minutes.set(m, b); }
  return b;
};

// CPU used since the last look (share of one core).
let cpuLast = process.cpuUsage(), cpuAt = process.hrtime.bigint(), cpuShare = 0;
function sampleCpu() {
  const now = process.hrtime.bigint(), u = process.cpuUsage(cpuLast);
  const wallUs = Number(now - cpuAt) / 1000;
  if (wallUs > 0) cpuShare = (u.user + u.system) / wallUs;
  cpuLast = process.cpuUsage(); cpuAt = now;
}

// Every 30 seconds: forget old minutes and users, and note the highest number of active users.
setInterval(() => {
  sampleCpu();
  const now = Date.now();
  for (const m of minutes.keys()) if (m < minuteOf(now) - 15) minutes.delete(m);
  for (const [id, t] of seen) if (now - t > ACTIVE_MS) seen.delete(id);
  if (seen.size > peakActive) { peakActive = seen.size; peakAt = now; }
}, 30e3).unref();

// Express middleware: count each request, slow answers (over 2 seconds) and server errors.
function track(req, res, next) {
  const t0 = Date.now();
  inFlight++;
  bucket(t0).req++;
  let done = false;
  const end = () => {
    if (done) return; done = true;
    inFlight--;
    const b = bucket();
    if (Date.now() - t0 > 2000 && !req.path.startsWith('/api/session/live')) b.slow++;
    if (res.statusCode >= 500) b.err++;
  };
  res.on('finish', end); res.on('close', end);
  next();
}
const userSeen = (id) => { if (id) seen.set(id, Date.now()); };

const pct = (n) => Math.max(0, Math.min(999, Math.round(n * 100)));
// The status for the admin. capacity: users the server can serve at once. extra: { live, db_ms, db_ok }.
function status(capacity, extra = {}) {
  sampleCpu();
  const now = Date.now();
  const last = (n) => { const out = { req: 0, slow: 0, err: 0 }; for (let i = 0; i < n; i++) { const b = minutes.get(minuteOf(now) - i); if (b) { out.req += b.req; out.slow += b.slow; out.err += b.err; } } return out; };
  const active = [...seen.values()].filter((t) => now - t <= ACTIVE_MS).length;
  if (active > peakActive) { peakActive = active; peakAt = now; }
  const mem = process.memoryUsage();
  const rssMb = Math.round(mem.rss / 1048576);
  const five = last(5), one = last(1);
  const loopP99 = Math.round(loop.percentile(99) / 1e6);
  const load = {
    users: pct(active / Math.max(1, capacity)),
    memory: pct(rssMb / MEM_LIMIT_MB),
    cpu: pct(cpuShare / CPU_LIMIT),
  };
  const percent = Math.max(load.users, load.memory, load.cpu);
  // Checks: ok, warn, bad. "Access" is OK when the database answers and the server is not overloaded.
  const checks = {
    database: extra.db_ok === false ? 'bad' : extra.db_ms > 1500 ? 'warn' : 'ok',
    speed: loopP99 > 1000 ? 'bad' : loopP99 > 200 ? 'warn' : 'ok',
    errors: five.err >= 20 ? 'bad' : five.err > 0 ? 'warn' : 'ok',
    load: percent >= 90 ? 'bad' : percent >= 70 ? 'warn' : 'ok',
  };
  const vals = Object.values(checks);
  const level = vals.includes('bad') ? 'bad' : vals.includes('warn') ? 'warn' : 'ok';
  return {
    level, percent, load, checks,
    active_users: active, capacity, peak_users: peakActive, peak_at: peakAt || null,
    live_screens: extra.live || 0, in_flight: Math.max(0, inFlight),
    req_per_min: one.req, req_5min: five.req, slow_5min: five.slow, errors_5min: five.err,
    memory_mb: rssMb, memory_limit_mb: MEM_LIMIT_MB, heap_mb: Math.round(mem.heapUsed / 1048576),
    cpu_pct_of_limit: load.cpu, cpu_limit: CPU_LIMIT, event_loop_ms: loopP99,
    db_ms: extra.db_ms ?? null, db_ok: extra.db_ok !== false,
    uptime_sec: Math.round((now - started) / 1000), node: process.version, on_render: ON_RENDER,
    at: now,
  };
}

module.exports = { track, userSeen, status, MEM_LIMIT_MB, CPU_LIMIT };
