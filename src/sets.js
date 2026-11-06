// Exam sets: fixed, numbered mock exams users can pick from (newest first).
// - Each set has its own questions: a new set first uses questions that are in no other set of the level.
// - The newest set is kept up to date: when the question bank changes (built-in update or the admin adds,
//   edits, hides or imports questions), its questions are made again, so new questions show up there first.
// - Every time a set is taken, its questions come in a new order (takeOrder in exam.js).
const db = require('./db');
const { EXAMS } = require('./blueprint');
const { buildExam, textKey } = require('./exam');

// At least this many sets per level (Set 1, the oldest, up to Set 6, the newest), then one more every INTERVAL_DAYS.
const INITIAL_SETS = Number(process.env.INITIAL_SETS ?? 6);
const INTERVAL_DAYS = Number(process.env.SET_INTERVAL_DAYS ?? 7);
const LABEL = { pro: 'Professional', subpro: 'Subprofessional' };

// The questions of the other sets of this level, so a new or refreshed set uses other questions first.
async function usedElsewhere(mode, exceptId = null) {
  const rows = await db.all('SELECT id, items FROM exam_sets WHERE mode = ?', mode);
  const uses = new Map(); // question -> in how many other sets
  for (const r of rows) {
    if (r.id === exceptId) continue;
    try { JSON.parse(r.items).forEach((it) => { const k = textKey(it); uses.set(k, (uses.get(k) || 0) + 1); }); } catch { /* a broken set adds nothing */ }
  }
  return uses;
}

async function createSet(mode, number, at = Date.now()) {
  if (!number) {
    const last = await db.get('SELECT MAX(number) AS n FROM exam_sets WHERE mode = ?', mode);
    number = (last?.n || 0) + 1;
  }
  const ex = await buildExam(mode, { avoid: await usedElsewhere(mode) });
  const title = `${LABEL[mode]} Mock Exam · Set ${number}`;
  const r = await db.run('INSERT INTO exam_sets (mode, number, title, items, created_at) VALUES (?, ?, ?, ?, ?)',
    mode, number, title, JSON.stringify(ex.items), at);
  return { id: r.lastInsertRowid, mode, number, title };
}

// Make the questions of one set again (same number and title). Results already taken keep their own copy
// of the questions, so their review does not change.
async function refreshSet(set, at = Date.now()) {
  const ex = await buildExam(set.mode, { avoid: await usedElsewhere(set.mode, set.id) });
  await db.run('UPDATE exam_sets SET items = ?, updated_at = ? WHERE id = ?', JSON.stringify(ex.items), at, set.id);
  return { id: set.id, mode: set.mode, number: set.number, title: set.title, updated_at: at };
}

// The question bank changed (new built-in questions, or the admin changed questions).
async function bankChanged(at = Date.now()) {
  await db.run(`INSERT INTO meta (key, value) VALUES ('bank_changed_at', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, String(at));
}

// The newest set of each level gets the new questions when the bank changed after it was made or last
// refreshed. Set 1 is never refreshed (it is the free set everyone starts with).
async function refreshLatest() {
  const row = await db.get(`SELECT value FROM meta WHERE key = 'bank_changed_at'`);
  const changed = Number(row?.value) || 0;
  if (!changed) return [];
  const out = [];
  for (const mode of Object.keys(EXAMS)) {
    const latest = await db.get('SELECT * FROM exam_sets WHERE mode = ? ORDER BY number DESC LIMIT 1', mode);
    if (!latest || latest.number === 1) continue;
    if (Math.max(latest.created_at || 0, latest.updated_at || 0) >= changed) continue;
    out.push(await refreshSet(latest, Math.max(Date.now(), changed)));
  }
  return out;
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
    const latest = await db.get('SELECT COUNT(*) AS c, MAX(number) AS n, MAX(created_at) AS t FROM exam_sets WHERE mode = ?', mode);
    const flag = `mig:sets_${INITIAL_SETS}_${mode}`;
    if (!latest.c) {
      for (let i = 0; i < INITIAL_SETS; i++) await createSet(mode);
      await db.run(`INSERT INTO meta (key, value) VALUES (?, '1') ON CONFLICT(key) DO NOTHING`, flag);
    } else if (latest.n < INITIAL_SETS && !(await db.get('SELECT 1 AS x FROM meta WHERE key = ?', flag))) {
      // Once (1.44.0): a server made when there were fewer starting sets gets up to Set 6. Only once, so a
      // set the admin deletes later is not made again.
      for (let i = latest.n; i < INITIAL_SETS; i++) await createSet(mode);
      await db.run(`INSERT INTO meta (key, value) VALUES (?, '1') ON CONFLICT(key) DO NOTHING`, flag);
    } else if (INTERVAL_DAYS > 0 && Date.now() - latest.t > INTERVAL_DAYS * 864e5) {
      await createSet(mode);
    }
  }
  await refreshLatest();
}

module.exports = { createSet, refreshSet, refreshLatest, bankChanged, ensureSets, INITIAL_SETS };
