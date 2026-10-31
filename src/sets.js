// Exam sets: fixed, numbered mock exams users can pick from (newest first).
const db = require('./db');
const { EXAMS } = require('./blueprint');
const { buildExam } = require('./exam');

const INITIAL_SETS = Number(process.env.INITIAL_SETS ?? 5);
const INTERVAL_DAYS = Number(process.env.SET_INTERVAL_DAYS ?? 7);
const LABEL = { pro: 'Professional', subpro: 'Subprofessional' };

async function createSet(mode, number, at = Date.now()) {
  if (!number) {
    const last = await db.get('SELECT MAX(number) AS n FROM exam_sets WHERE mode = ?', mode);
    number = (last?.n || 0) + 1;
  }
  const ex = await buildExam(mode);
  const title = `${LABEL[mode]} Mock Exam · Set ${number}`;
  const r = await db.run('INSERT INTO exam_sets (mode, number, title, items, created_at) VALUES (?, ?, ?, ?, ?)',
    mode, number, title, JSON.stringify(ex.items), at);
  return { id: r.lastInsertRowid, mode, number, title };
}

// Make sure each level has sets, and add a new one when the latest is older than INTERVAL_DAYS.
// Set 1 is the free set and the "Start Set 1" button on Home, so it always exists: if it is missing
// (for example it was deleted), it is made again.
async function ensureSets() {
  for (const mode of Object.keys(EXAMS)) {
    const one = await db.get('SELECT 1 AS x FROM exam_sets WHERE mode = ? AND number = 1', mode);
    const first = await db.get('SELECT MIN(created_at) AS t FROM exam_sets WHERE mode = ?', mode);
    // Dated before the other sets, so it does not count as the newest set (the weekly set still comes on time).
    if (first && first.t && !one) await createSet(mode, 1, first.t - 1000);
    const latest = await db.get('SELECT COUNT(*) AS c, MAX(created_at) AS t FROM exam_sets WHERE mode = ?', mode);
    if (!latest.c) {
      for (let i = 0; i < INITIAL_SETS; i++) await createSet(mode);
    } else if (INTERVAL_DAYS > 0 && Date.now() - latest.t > INTERVAL_DAYS * 864e5) {
      await createSet(mode);
    }
  }
}

module.exports = { createSet, ensureSets };
