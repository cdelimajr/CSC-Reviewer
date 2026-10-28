// The built-in question bank in one list, plus a version fingerprint.
// Format of each item: { s: subject, t: topic, l: level, q, a: correct answer, d: [3 wrong], e, p: passage }
const crypto = require('node:crypto');
const general = require('./bank-general');
const verbal = require('./bank-verbal');

const norm = (x, subject) => ({ s: x.s || subject, t: x.t || '', l: x.l || 'both', q: x.q, a: x.a, d: x.d, e: x.e || '', p: x.p || '' });
const QUESTIONS = [...general.map((x) => norm(x, 'general')), ...verbal.map((x) => norm(x, 'verbal'))];
const versionOf = (list) => crypto.createHash('sha256').update(JSON.stringify(list)).digest('hex').slice(0, 12);

module.exports = { QUESTIONS, VERSION: versionOf(QUESTIONS), versionOf };
