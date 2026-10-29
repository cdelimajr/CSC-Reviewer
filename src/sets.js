// Exam sets: fixed, numbered mock exams users can pick from (newest first).
const db = require('./db');
const { EXAMS } = require('./blueprint');
const { buildExam } = require('./exam');

const INITIAL_SETS = Number(process.env.INITIAL_SETS ?? 5);
const INTERVAL_DAYS = Number(process.env.SET_INTERVAL_DAYS ?? 7);
const LABEL = { pro: 'Professional', subpro: 'Subprofessional' };

async function createSet(mode) {
  const last = await db.get('SELECT MAX(number) AS n FROM exam_sets WHERE mode = ?', mode);
  const number = (last?.n || 0) + 1;
  const ex = await buildExam(mode);
  const title = `${LABEL[mode]} Mock Exam · Set ${number}`;
  const r = await db.run('INSERT INTO exam_sets (mode, number, title, items, created_at) VALUES (?, ?, ?, ?, ?)',
    mode, number, title, JSON.stringify(ex.items), Date.now());
  return { id: r.lastInsertRowid, mode, number, title };
}

// Make sure each level has sets, and add a new one when the latest is older than INTERVAL_DAYS.
async function ensureSets() {
  for (const mode of Object.keys(EXAMS)) {
    const latest = await db.get('SELECT COUNT(*) AS c, MAX(created_at) AS t FROM exam_sets WHERE mode = ?', mode);
    if (!latest.c) {
      for (let i = 0; i < INITIAL_SETS; i++) await createSet(mode);
    } else if (INTERVAL_DAYS > 0 && Date.now() - latest.t > INTERVAL_DAYS * 864e5) {
      await createSet(mode);
    }
  }
}

module.exports = { createSet, ensureSets };
