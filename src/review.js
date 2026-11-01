// "Balikan ang mali": the questions a user got wrong, and their weakest topics.
// - Mistakes: questions answered wrong (or left blank in a mock exam) in the last 60 finished exams/practice.
//   A question answered right in a later exam no longer counts. Each question is listed once (newest).
// - Weak topics: score per subject + topic over the same exams, weakest first (at least 3 questions).
// Free plan: only from practice (mock exam questions stay hidden on the free plan, see attemptView in server.js),
// and only the 3 weakest topics are shown. Premium: everything.
const db = require('./db');

const keyOf = (it) => `${it.subject}|${it.question}|${it.passage || ''}`;

async function collect(userId, premium) {
  const rows = await db.all(`SELECT id, mode, items, answers, finished_at FROM attempts WHERE user_id = ? AND finished_at IS NOT NULL
    ${premium ? '' : "AND mode = 'practice'"} ORDER BY finished_at DESC LIMIT 60`, userId);
  const topics = new Map(), seen = new Set(), mistakes = [];
  for (const r of rows) { // newest first
    let items, answers;
    try { items = JSON.parse(r.items); answers = JSON.parse(r.answers || '{}'); } catch { continue; }
    items.forEach((it, i) => {
      const ch = answers[i] === undefined ? undefined : Number(answers[i]);
      const right = ch === it.answer;
      const tk = `${it.subject}|${it.topic || ''}`;
      const t = topics.get(tk) || { subject: it.subject, topic: it.topic || '', correct: 0, total: 0 };
      t.total++; if (right) t.correct++;
      topics.set(tk, t);
      const k = keyOf(it);
      if (seen.has(k)) return; // a newer answer to the same question already decided it
      seen.add(k);
      if (right || (ch === undefined && r.mode === 'practice')) return;
      mistakes.push({ subject: it.subject, topic: it.topic || '', question: it.question, passage: it.passage || '', choices: it.choices,
        answer: it.answer, explanation: it.explanation || '', from: r.mode, at: r.finished_at });
    });
  }
  const ranked = [...topics.values()].filter((t) => t.total >= 3)
    .map((t) => ({ ...t, pct: Math.round((t.correct / t.total) * 1000) / 10 }))
    .sort((a, b) => a.pct - b.pct || b.total - a.total);
  const bySubject = mistakes.reduce((o, m) => ((o[m.subject] = (o[m.subject] || 0) + 1), o), {});
  return { topics: ranked, mistakes: mistakes.slice(0, 300), count: mistakes.length, bySubject };
}

// Study streak: days in a row (Philippine time) with at least one finished exam or practice.
const phDay = (ms) => Math.floor((Number(ms) + 8 * 3600e3) / 864e5);
function streakOf(days, today = phDay(Date.now())) {
  const set = new Set(days);
  let current = 0;
  for (let d = set.has(today) ? today : today - 1; set.has(d); d--) current++;
  let best = 0, run = 0, prev = null;
  for (const d of [...set].sort((a, b) => a - b)) { run = prev !== null && d === prev + 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; }
  return { current, best, today: set.has(today) };
}

const FREE_TOPICS = 3;
async function summary(userId, premium) {
  const { topics, mistakes, count, bySubject } = await collect(userId, premium);
  return {
    premium,
    topics: premium ? topics : topics.slice(0, FREE_TOPICS),
    locked_topics: premium ? 0 : Math.max(0, topics.length - FREE_TOPICS),
    mistakes_count: count,
    by_subject: bySubject,
    // Premium keeps the questions on the device, so "Sagutan ulit" also works offline.
    ...(premium ? { items: mistakes } : {}),
  };
}

module.exports = { collect, summary, keyOf, phDay, streakOf, FREE_TOPICS };
