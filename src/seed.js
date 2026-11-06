// Loads the built-in question bank into the database whenever the bank changes.
const db = require('./db');
const { shuffle } = require('./generators');
const { QUESTIONS, VERSION } = require('./bank');

const INS = `INSERT INTO questions (subject, topic, level, question, choices, answer, explanation, passage, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'seed')`;
// About 5,000 questions (1.45.0): they go in parts, so no single request to the database is too big.
const CHUNK = 500;

function toArgs(x) {
  const choices = shuffle([x.a, ...x.d]);
  return [x.s, x.t, x.l, x.q, JSON.stringify(choices), choices.indexOf(x.a), x.e, x.p];
}

async function seed() {
  const cur = await db.get(`SELECT value FROM meta WHERE key = 'bank_version'`);
  if (cur && cur.value === VERSION) return 0;
  // Replace untouched built-in questions; questions added or edited by the admin are kept.
  // The version is saved last, so if loading stops halfway it simply starts again on the next start.
  for (let i = 0; i < QUESTIONS.length; i += CHUNK) {
    await db.batch([
      ...(i === 0 ? [[`DELETE FROM questions WHERE source = 'seed'`]] : []),
      ...QUESTIONS.slice(i, i + CHUNK).map((x) => [INS, toArgs(x)]),
    ]);
  }
  await db.run(`INSERT INTO meta (key, value) VALUES ('bank_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, VERSION);
  return QUESTIONS.length;
}

module.exports = { seed };
