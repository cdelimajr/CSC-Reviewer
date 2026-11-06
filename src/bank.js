// The built-in question bank in one list, plus a version fingerprint.
// Format of each item: { s: subject, t: topic, l: level, q, a: correct answer, d: [3 wrong], e, p: passage }
// 1.45.0: about 5,000 written questions. The first two files are the original hand-written questions; the
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
];

const norm = (x, subject) => ({ s: x.s || subject, t: x.t || '', l: x.l || 'both', q: x.q, a: x.a, d: x.d, e: x.e || '', p: x.p || '' });
// Same subject, words, passage and answer = same question: only the first one is kept (an older question wins).
const key = (x) => `${x.s}|${x.q}|${x.p}|${x.a}`;
const seen = new Set();
const QUESTIONS = FILES.flatMap(([subject, list]) => list.map((x) => norm(x, subject))).filter((x) => !seen.has(key(x)) && seen.add(key(x)));
const versionOf = (list) => crypto.createHash('sha256').update(JSON.stringify(list)).digest('hex').slice(0, 12);

module.exports = { QUESTIONS, VERSION: versionOf(QUESTIONS), versionOf };
