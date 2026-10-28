// Loads the built-in question bank into the database (once per bank version).
const db = require('./db');
const { shuffle } = require('./generators');
const general = require('./bank-general');
const verbal = require('./bank-verbal');

const BANK_VERSION = '2';
const INS = `INSERT INTO questions (subject, topic, level, question, choices, answer, explanation, passage, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'seed')`;

function toArgs(x, subject) {
  const choices = shuffle([x.a, ...x.d]);
  return [x.s || subject, x.t || '', x.l || 'both', x.q, JSON.stringify(choices), choices.indexOf(x.a), x.e || '', x.p || ''];
}

async function seed() {
  const cur = await db.get(`SELECT value FROM meta WHERE key = 'bank_version'`);
  if (cur && cur.value === BANK_VERSION) return 0;
  const rows = [...general.map((x) => toArgs(x, 'general')), ...verbal.map((x) => toArgs(x, 'verbal'))];
  // Replace untouched built-in questions; questions added or edited by the admin are kept.
  await db.batch([
    [`DELETE FROM questions WHERE source = 'seed'`],
    ...rows.map((r) => [INS, r]),
    [`INSERT INTO meta (key, value) VALUES ('bank_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, [BANK_VERSION]],
  ]);
  return rows.length;
}

module.exports = { seed };
