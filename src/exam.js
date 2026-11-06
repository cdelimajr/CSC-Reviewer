// Builds exams from the question bank + generators, and grades attempts.
const db = require('./db');
const { SUBJECTS, EXAMS } = require('./blueprint');
const { generate, shuffle } = require('./generators');

// Share of each section that comes from the saved question bank (the rest is generated).
const BANK_RATIO = { verbal: 0.5, analytical: 0.35, numerical: 0.3, clerical: 0.3, general: 0.6 };

function rowToItem(r) {
  return {
    qid: r.id, subject: r.subject, topic: r.topic, question: r.question, passage: r.passage || '',
    choices: JSON.parse(r.choices), answer: r.answer, explanation: r.explanation, source: r.source,
  };
}

async function bankFor(subject, level) {
  const rows = await db.all(`SELECT * FROM questions WHERE subject = ? AND active = 1 AND (level = 'both' OR level = ?)`, subject, level);
  return rows.map(rowToItem);
}

// Shuffle choices of a bank item so the correct letter is not always the same.
function reshuffle(item) {
  const correct = item.choices[item.answer];
  const choices = shuffle(item.choices);
  return { ...item, choices, answer: choices.indexOf(correct) };
}

// Same question = same subject, words and passage (the choices may be in another order).
const textKey = (it) => `${it.subject}|${it.question}|${it.passage || ''}`;

// avoid: a Map of question key (textKey) -> how many times it was used, e.g. in the other exam sets (so each
// set is different) or in the user's last few exams (so practice keeps giving new ones). Questions never used
// come first, then the ones used least, each group in random order. New questions are never in it.
async function buildSection(subject, count, level, ratio = BANK_RATIO[subject] ?? 0.5, avoid = null) {
  let bank = shuffle(await bankFor(subject, level));
  if (avoid && avoid.size) {
    const uses = new Map(bank.map((b) => [b, avoid.get(textKey({ ...b, subject })) || 0]));
    bank.sort((a, b) => uses.get(a) - uses.get(b)); // stable: the random order stays inside each group
  }
  // Keep reading passages together: pick passage groups as whole units.
  const picked = [];
  const used = new Set();
  const want = Math.min(bank.length, Math.round(count * ratio));
  for (const item of bank) {
    if (picked.length >= want) break;
    if (used.has(item.qid)) continue;
    if (item.passage) {
      const group = bank.filter((b) => b.passage === item.passage && !used.has(b.qid));
      if (picked.length + group.length > count) continue;
      group.forEach((g) => { used.add(g.qid); picked.push(g); });
    } else {
      used.add(item.qid); picked.push(item);
    }
  }
  const seenText = new Set(picked.map((p) => p.question + (p.passage || '')));
  let guard = 0;
  while (picked.length < count && guard++ < count * 30) {
    const g = generate(subject);
    if (!g) break;
    if (seenText.has(g.question)) continue;
    // A generated question used elsewhere: try another one first (allowed in the last third of the tries).
    if (avoid && avoid.has(textKey({ ...g, subject })) && guard < count * 20) continue;
    seenText.add(g.question);
    picked.push(g);
  }
  // If there is no generator and the bank is small, top up from the bank (repeats allowed).
  guard = 0;
  while (picked.length < count && bank.length && guard++ < count * 5) {
    const extra = bank.filter((b) => !b.passage && !used.has(b.qid));
    const src = extra.length ? extra : bank.filter((b) => !b.passage);
    if (!src.length) break;
    const it = src[Math.floor(Math.random() * src.length)];
    used.add(it.qid); picked.push(it);
  }
  // Group by topic (like the real exam groups item types), passages stay together.
  const topicOrder = shuffle([...new Set(picked.map((p) => p.topic))]);
  picked.sort((a, b) => topicOrder.indexOf(a.topic) - topicOrder.indexOf(b.topic) || (a.passage > b.passage ? 1 : a.passage < b.passage ? -1 : 0));
  return picked.slice(0, count).map((it) => reshuffle({ ...it, subject }));
}

async function buildExam(mode, opts = {}) {
  const avoid = opts.avoid || null;
  if (EXAMS[mode]) {
    const ex = EXAMS[mode];
    const items = (await Promise.all(ex.sections.map((s) => buildSection(s.subject, s.count, mode, undefined, avoid)))).flat();
    return { title: ex.title, items, timeLimitSec: ex.minutes * 60 };
  }
  // Practice by subject
  const subject = SUBJECTS[opts.subject] ? opts.subject : 'verbal';
  const count = Math.max(5, Math.min(100, Number(opts.count) || 20));
  const minutes = Number(opts.minutes) || 0;
  const items = await buildSection(subject, count, opts.level === 'subpro' ? 'subpro' : 'pro', undefined, avoid);
  const level = opts.level === 'subpro' ? 'Subpro' : 'Pro';
  return { title: `Practice (${level}): ${SUBJECTS[subject].name} (${items.length} items)`, items, timeLimitSec: minutes * 60 };
}

// A new order every time an exam set is taken: the same questions of the set, but each subject keeps its
// place (like the sections of the real exam) while the topics, the questions in each topic and the choices
// are shuffled. Questions of one reading passage stay together and in order. The same steps are in
// public/app.js (takeOrder) for exams started on the device.
function takeOrder(items) {
  const subjects = [...new Set(items.map((it) => it.subject))];
  const out = [];
  for (const subject of subjects) {
    // Units: one question, or all the questions of one passage (they follow each other in a set).
    const units = [];
    for (const it of items.filter((x) => x.subject === subject)) {
      const last = units[units.length - 1];
      if (it.passage && last && last[0].passage === it.passage) last.push(it); else units.push([it]);
    }
    const topics = shuffle([...new Set(units.map((u) => u[0].topic))]);
    const byTopic = topics.map((t) => shuffle(units.filter((u) => u[0].topic === t)));
    byTopic.flat().forEach((u) => u.forEach((it) => out.push(reshuffle(it))));
  }
  return out;
}

function grade(items, answers) {
  const breakdown = {};
  let score = 0;
  items.forEach((it, i) => {
    const b = (breakdown[it.subject] ||= { correct: 0, total: 0 });
    b.total++;
    if (answers[i] !== undefined && Number(answers[i]) === it.answer) { b.correct++; score++; }
  });
  return { score, breakdown };
}

module.exports = { buildExam, grade, takeOrder, textKey };
