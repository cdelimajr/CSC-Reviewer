// Database: libSQL (SQLite-compatible).
// - Online: set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN (free Turso database).
// - Local: uses a SQLite file at DB_PATH (default data/cse-reviewer.db).
const path = require('node:path');
const fs = require('node:fs');
const { createClient } = require('@libsql/client');

let url = process.env.TURSO_DATABASE_URL;
if (!url) {
  const file = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'cse-reviewer.db');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  url = 'file:' + file;
}
const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pass_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  disabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT '',
  level TEXT NOT NULL DEFAULT 'both',
  question TEXT NOT NULL,
  choices TEXT NOT NULL,
  answer INTEGER NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  passage TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'seed',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject, active);
CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  mode TEXT NOT NULL,
  title TEXT NOT NULL,
  items TEXT NOT NULL,
  answers TEXT NOT NULL DEFAULT '{}',
  time_limit_sec INTEGER NOT NULL DEFAULT 0,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  score INTEGER,
  total INTEGER NOT NULL,
  breakdown TEXT
);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id, started_at);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS email_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL COLLATE NOCASE,
  purpose TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  tries INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_codes_email ON email_codes(email, purpose);
CREATE TABLE IF NOT EXISTS exam_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mode TEXT NOT NULL,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  items TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sets_mode ON exam_sets(mode, number);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount TEXT NOT NULL DEFAULT '',
  method TEXT NOT NULL DEFAULT 'GCash',
  reference TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  decided_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status, created_at);
`;

// Convert libSQL rows into plain objects.
const plain = (rs) => rs.rows.map((r) => Object.fromEntries(rs.columns.map((c, i) => [c, r[i]])));

const db = {
  init: async () => {
    await client.executeMultiple(SCHEMA);
    // Columns added after the first release (ignored if they already exist).
    for (const sql of [
      'ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE users ADD COLUMN premium_until INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE attempts ADD COLUMN set_id INTEGER',
      'ALTER TABLE attempts ADD COLUMN client_id TEXT',
      // Online payments (Xendit)
      `ALTER TABLE payments ADD COLUMN provider TEXT NOT NULL DEFAULT 'manual'`,
      'ALTER TABLE payments ADD COLUMN invoice_id TEXT',
      'ALTER TABLE payments ADD COLUMN checkout_url TEXT',
      'ALTER TABLE payments ADD COLUMN days INTEGER',
    ]) {
      try { await client.execute(sql); } catch (e) { if (!/duplicate column/i.test(e.message)) throw e; }
    }
    await client.execute('CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id)');
  },
  all: async (sql, ...args) => plain(await client.execute({ sql, args })),
  get: async (sql, ...args) => plain(await client.execute({ sql, args }))[0],
  run: async (sql, ...args) => {
    const r = await client.execute({ sql, args });
    return { lastInsertRowid: r.lastInsertRowid === undefined ? undefined : Number(r.lastInsertRowid), changes: r.rowsAffected };
  },
  // Run several statements in one transaction: [[sql, args], ...]
  batch: (stmts) => client.batch(stmts.map(([sql, args = []]) => ({ sql, args })), 'write'),
};

module.exports = db;
