// The built-in question bank in one list, plus a version fingerprint.
// Format of each item: { s: subject, t: topic, l: level, q, a: correct answer, d: [3 wrong], e, p: passage }
// 1.45.0: about 5,000 written questions; 1.46.0: 10,000. The first two files are the original hand-written questions; the
// others are built from hand-written word, fact and number lists (see each file).
const crypto = require('node:crypto');

const FILES = [
  ['general', require('./bank-general')],
  ['verbal', require('./bank-verbal')],
  ['verbal', require('./bank-vocab')],
  ['verbal', require('./bank-grammar')],
  ['verbal', require('./bank-idioms')],
  ['verbal', require('./bank-filipino')],
  ['analytical', require('./bank-analytical')],
  ['general', require('./bank-general2')],
  ['numerical', require('./bank-numerical')],
  ['clerical', require('./bank-clerical')],
  // 1.46.0: General Information beyond the laws, and more questions for every subject (10,000 in all).
  ['general', require('./bank-general3')],
  ['general', require('./bank-general4')],
  ['numerical', require('./bank-numerical2')],
  ['analytical', require('./bank-analytical2')],
  ['clerical', require('./bank-clerical2')],
  ['verbal', require('./bank-verbal2')],
];

const norm = (x, subject) => ({ s: x.s || subject, t: x.t || '', l: x.l || 'both', q: x.q, a: x.a, d: x.d, e: x.e || '', p: x.p || '' });
// Every question is its own (1.46.0): two questions of a subject with the same words (ignoring capitals, accents,
// spaces, quotes and end punctuation; math signs like + − × ÷ / still count) and the same passage count as one, and only the first is kept (an older question wins). Only
// "instruction" questions, whose choices are the whole question (e.g. "Choose the correct sentence."), may share
// their words; those count as one when their four choices are also the same.
const words = (t) => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s,;:!?"'“”‘’…_]+/g, ' ').replace(/[\s.]+$/, '').trim();
const INSTRUCTION = new Set(['choose the correct sentence', 'piliin ang wastong pangungusap', 'which word does not belong to the group']);
// "What does "to X" mean?" and "What does the idiom "X" mean?" ask the same thing.
const ask = (q) => words(q).replace(/^what does (the idiom |the expression )?(to )?/, 'what does ');
const key = (x) => `${x.s}|${ask(x.q)}|${words(x.p)}${INSTRUCTION.has(words(x.q)) ? `|${[x.a, ...x.d].map(words).sort().join('/')}` : ''}`;
const seen = new Set();
const QUESTIONS = FILES.flatMap(([subject, list]) => list.map((x) => norm(x, subject))).filter((x) => !seen.has(key(x)) && seen.add(key(x)));
const versionOf = (list) => crypto.createHash('sha256').update(JSON.stringify(list)).digest('hex').slice(0, 12);

module.exports = { QUESTIONS, VERSION: versionOf(QUESTIONS), versionOf, key, INSTRUCTION };
