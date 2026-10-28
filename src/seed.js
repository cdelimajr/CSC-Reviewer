// Loads the built-in question bank into the database (once per bank version).
const db = require('./db');
const { shuffle } = require('./generators');
const general = require('./bank-general');
const verbal = require('./bank-verbal');

const BANK_VERSION = '2';

function toRow(x, subject) {
  const choices = shuffle([x.a, ...x.d]);
  return {
    subject: x.s || subject, topic: x.t || '', level: x.l || 'both', question: x.q,
    choices: JSON.stringify(choices), answer: choices.indexOf(x.a), explanation: x.e || '', passage: x.p || '',
  };
}

function seed() {
  const cur = db.prepare(`SELECT value FROM meta WHERE key = 'bank_version'`).get();
  if (cur && cur.value === BANK_VERSION) return 0;
  const rows = [...general.map((x) => toRow(x, 'general')), ...verbal.map((x) => toRow(x, 'verbal'))];
  const ins = db.prepare(`INSERT INTO questions (subject, topic, level, question, choices, answer, explanation, passage, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'seed')`);
  db.exec('BEGIN');
  try {
    // Replace untouched built-in questions; questions added or edited by the admin are kept.
    db.exec(`DELETE FROM questions WHERE source = 'seed'`);
    for (const r of rows) ins.run(r.subject, r.topic, r.level, r.question, r.choices, r.answer, r.explanation, r.passage);
    db.prepare(`INSERT INTO meta (key, value) VALUES ('bank_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(BANK_VERSION);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return rows.length;
}

module.exports = { seed };
