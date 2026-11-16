// Analytical Ability, part 2 (1.46.0): letter series, coding, directions, ranking, calendar, number analogy,
// syllogisms, blood relations and data interpretation, as fixed questions.
// Every answer is worked out by the code from the rule of the question (never typed by hand), and the wrong
// choices are the usual mistakes (one step off, the rule turned around, forgetting a step).
const { pickSome } = require('./bank-tools');
const { helpers } = require('./generators');

const { fmt } = helpers;
const A = 'analytical';
const out = [];
function add(t, q, a, wrong, e) {
  a = String(a);
  const ds = [];
  for (const w of wrong) {
    const s = String(w);
    if (s && s !== a && s.toLowerCase() !== a.toLowerCase() && !ds.some((d) => d.toLowerCase() === s.toLowerCase())) ds.push(s);
    if (ds.length === 3) break;
  }
  if (ds.length < 3) return;
  out.push({ s: A, t, q, a, d: ds, e: `${e}\nAnswer: ==${a}==${/[.!?]$/.test(a) ? '' : '.'}` });
}
const some = (list, n, seed, ok) => pickSome(list, n, seed, ok);
const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const at = (i) => L[((i % 26) + 26) % 26];
const pos = (c) => L.indexOf(c) + 1;
const ORD = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');

/* ---------- Letter series ---------- */
// One letter at a time: start, jump (the jump may grow).
for (const [s, k, grow] of [[0, 2, 0], [1, 3, 0], [2, 4, 0], [3, 5, 0], [25, -2, 0], [24, -3, 0], [22, -4, 0], [4, 2, 0], [5, 3, 0], [0, 5, 0], [7, 2, 0], [10, 3, 0],
  [0, 1, 1], [1, 1, 1], [2, 2, 1], [0, 2, 1], [3, 1, 1], [25, -1, -1], [20, -1, -1], [6, 4, 0], [19, -2, 0], [12, 2, 0], [8, 3, 0], [15, -3, 0], [17, 2, 0], [21, -4, 0]]) {
  const idx = [s]; let j = k;
  for (let i = 0; i < 5; i++) { idx.push(idx[idx.length - 1] + j); j += grow; }
  if (idx.some((v) => v < 0 || v > 25)) continue;
  const seq = idx.slice(0, 5).map(at), next = at(idx[5]), jump = idx[5] - idx[4];
  add('Letter Series', `Which letter completes the series: ${seq.join(' ')} ___ ?`, next, [at(idx[5] + 1), at(idx[5] - 1), at(idx[4] + (idx[4] - idx[3])), at(idx[5] + (jump > 0 ? 1 : -1) * 2)],
    `Change each letter to its number (A=1 … Z=26): ${seq.map((c) => `${c}=${pos(c)}`).join(', ')}.\nThe jumps are: ${idx.slice(1, 5).map((v, i) => (v - idx[i] > 0 ? '+' : '') + (v - idx[i])).join(', ')}${grow ? ` (each jump changes by ${grow > 0 ? '+' : ''}${grow})` : ''}.\nNext jump: ${jump > 0 ? '+' : ''}${jump}, so ${pos(seq[4])} ${jump > 0 ? '+' : '−'} ${Math.abs(jump)} = ${idx[5] + 1} = **${next}**.`);
}
// Two-letter groups that move by a rule on each letter.
for (const [a0, ka, b0, kb] of [[0, 1, 25, -1], [0, 2, 25, -2], [1, 1, 2, 1], [0, 3, 1, 3], [2, 1, 20, -1], [0, 1, 0, 2], [10, 1, 15, -1], [3, 2, 24, -1], [0, 4, 25, -3], [5, 1, 5, 1], [1, 2, 3, 2], [18, -1, 0, 1]]) {
  const grp = (i) => at(a0 + i * ka) + at(b0 + i * kb);
  if ([0, 1, 2, 3, 4].some((i) => a0 + i * ka < 0 || a0 + i * ka > 25 || b0 + i * kb < 0 || b0 + i * kb > 25)) continue;
  const seq = [0, 1, 2, 3].map(grp), next = grp(4);
  add('Letter Series', `What comes next in the series: ${seq.join(', ')}, ___ ?`, next, [at(a0 + 4 * ka) + at(b0 + 5 * kb), at(a0 + 5 * ka) + at(b0 + 4 * kb), next[1] + next[0], grp(3)],
    `Look at each letter of the pairs by itself.\nFirst letters: ${seq.map((x) => x[0]).join(', ')} → ${ka > 0 ? '+' : ''}${ka} each time → next is **${next[0]}**.\nSecond letters: ${seq.map((x) => x[1]).join(', ')} → ${kb > 0 ? '+' : ''}${kb} each time → next is **${next[1]}**.\nTogether: **${next}**.`);
}
// Find the missing letter in the middle of a series.
for (const [s, k] of [[0, 3], [1, 4], [2, 2], [25, -3], [3, 3], [4, 4], [24, -2], [0, 4], [6, 3], [22, -3], [1, 5], [8, 2], [11, 3], [23, -4]]) {
  const seq = [0, 1, 2, 3, 4].map((i) => at(s + i * k));
  if ([0, 1, 2, 3, 4].some((i) => s + i * k < 0 || s + i * k > 25)) continue;
  const show = [...seq]; show[2] = '___';
  add('Letter Series', `Which letter is missing: ${show.join(' ')} ?`, seq[2], [at(s + 2 * k + 1), at(s + 2 * k - 1), at(s + k + 1), at(s + 3 * k - 1)],
    `The letters jump by **${k > 0 ? '+' : ''}${k}**: ${seq[0]} (${pos(seq[0])}) → ${seq[1]} (${pos(seq[1])}) → ? → ${seq[3]} (${pos(seq[3])}).\nSo the missing letter is ${pos(seq[1])} ${k > 0 ? '+' : '−'} ${Math.abs(k)} = ${pos(seq[2])} = **${seq[2]}**.`);
}

/* ---------- Coding-decoding ---------- */
const WORDS = ['PEN', 'MAP', 'SUN', 'CUP', 'HAT', 'BOX', 'NET', 'JAR', 'KEY', 'BAG', 'FAN', 'LOG', 'RUG', 'VAN', 'WEB',
  'FILE', 'FORM', 'DATA', 'NOTE', 'MAIL', 'DESK', 'CHAIR', 'PAPER', 'CLERK', 'STAMP', 'TABLE', 'PHONE', 'RULER', 'GLOBE', 'BOARD', 'CHALK', 'LIGHT', 'HOUSE', 'WATER', 'PLANT', 'BREAD', 'SMILE', 'TRAIN', 'MONEY', 'OFFICE'];
const shift = (w, k) => w.split('').map((c) => at(L.indexOf(c) + k)).join('');
const rev = (w) => w.split('').reverse().join('');
const pairs = [];
for (let i = 0; i < WORDS.length; i++) for (let j = 0; j < WORDS.length; j++) if (i !== j && WORDS[i].length === WORDS[j].length) pairs.push([WORDS[i], WORDS[j]]);
some(pairs, 70, 'code-shift').forEach(([w1, w2], n) => {
  const k = [1, 2, 3, -1, -2, 4][n % 6];
  const c1 = shift(w1, k), ans = shift(w2, k);
  add('Coding-Decoding', `In a certain code, ${w1} is written as ${c1}. How is ${w2} written in that code?`, ans, [shift(w2, k + 1), shift(w2, -k), shift(w2, k - 1), rev(ans)],
    `Step 1: Compare ${w1} and ${c1} letter by letter: ${w1.split('').map((c, i) => `${c}→${c1[i]}`).join(', ')}.\nEach letter moves **${Math.abs(k)} ${k > 0 ? 'forward' : 'back'}** in the alphabet.\nStep 2: Do the same to ${w2}: ${w2.split('').map((c, i) => `${c}→${ans[i]}`).join(', ')}.\nThe code is **${ans}**.`);
});
some(pairs, 40, 'code-rev').forEach(([w1, w2], n) => {
  const k = [0, 1, -1][n % 3];
  const c1 = rev(shift(w1, k)), ans = rev(shift(w2, k));
  add('Coding-Decoding', `If ${w1} is coded as ${c1}, what is the code for ${w2}?`, ans, [shift(w2, k), rev(shift(w2, k + 1)), rev(w2) === ans ? shift(w2, 1) : rev(w2), rev(shift(w2, -k || 2))],
    `Step 1: ${c1} read backwards is ${rev(c1)}.${k ? ` Compare it with ${w1}: each letter moved **${Math.abs(k)} ${k > 0 ? 'forward' : 'back'}**.` : ` That is ${w1} itself.`}\nSo the rule is: ${k ? `move each letter ${Math.abs(k)} ${k > 0 ? 'forward' : 'back'}, then ` : ''}**write the word backwards**.\nStep 2: ${w2}${k ? ` → ${shift(w2, k)}` : ''} → backwards → **${ans}**.`);
});
// Letters as numbers: the code is the sum of the letter positions.
const sum = (w) => w.split('').reduce((s, c) => s + pos(c), 0);
some(pairs.filter(([a, b]) => a.length <= 4), 45, 'code-sum').forEach(([w1, w2]) => {
  const s2 = sum(w2);
  add('Coding-Decoding', `If A = 1, B = 2, C = 3 and so on, and ${w1} = ${sum(w1)}, what does ${w2} equal?`, s2, [s2 + 1, s2 - 1, s2 + 2, sum(w1)],
    `The code is the **sum of the letter numbers**.\nCheck ${w1}: ${w1.split('').map(pos).join(' + ')} = ${sum(w1)} ✓\nNow ${w2}: ${w2.split('').map(pos).join(' + ')} = **${s2}**.`);
});
// Each letter to its number, written side by side.
for (const w of ['BAD', 'CAB', 'FED', 'BEAD', 'DEAF', 'FADE', 'ACE', 'HIDE', 'JADE', 'CAGE', 'EDGE', 'BIKE', 'LIKE', 'MILK', 'GOLD', 'COIN']) {
  const ans = w.split('').map(pos).join('-');
  add('Coding-Decoding', `If each letter is written as its place in the alphabet (A = 1, B = 2 …), how is ${w} written?`, ans,
    [w.split('').map((c) => pos(c) + 1).join('-'), w.split('').map((c) => 27 - pos(c)).join('-'), rev(w).split('').map(pos).join('-'), w.split('').map((c) => pos(c) - 1 || 26).join('-')],
    `${w.split('').map((c) => `${c} = ${pos(c)}`).join(', ')}.\nSo ${w} is **${ans}**.`);
}
// Opposite letters (A↔Z, B↔Y ...)
for (const w of ['CAT', 'DOG', 'SUN', 'MAP', 'GIRL', 'BOOK', 'MILK', 'ROSE', 'LAMP', 'HAND', 'FISH', 'TREE']) {
  const ans = w.split('').map((c) => at(25 - L.indexOf(c))).join('');
  add('Coding-Decoding', `In a code, every letter is replaced by its "opposite" letter (A↔Z, B↔Y, C↔X …). What is the code for ${w}?`, ans, [shift(w, 1), rev(ans), shift(ans, 1), shift(w, -1)],
    `Opposite letters add up to **27** (A=1 and Z=26, B=2 and Y=25 …).\n${w.split('').map((c) => `${c} (${pos(c)}) → ${at(25 - L.indexOf(c))} (${27 - pos(c)})`).join(', ')}.\nThe code is **${ans}**.`);
}

/* ---------- Directions ---------- */
const DIRS = ['North', 'East', 'South', 'West'];
const turn = (d, t) => (d + (t === 'right' ? 1 : 3)) % 4;
const NAMES = ['Arnel', 'Bea', 'Cesar', 'Dolly', 'Ernie', 'Faye', 'Gary', 'Hilda', 'Isko', 'Jenny', 'Kiko', 'Luz'];
// Facing after several turns.
some([...Array(4).keys()].flatMap((d) => [['right', 'right', 'left'], ['left', 'left', 'left'], ['right', 'left', 'left'], ['right', 'right', 'right'], ['left', 'right', 'right'], ['left', 'left', 'right'], ['right', 'right', 'right', 'right'], ['left', 'left'], ['right', 'left', 'right'], ['left', 'right', 'left', 'left']].map((ts) => [d, ts])), 48, 'face').forEach(([d, ts], i) => {
  let f = d;
  const path = [DIRS[d]];
  for (const t of ts) { f = turn(f, t); path.push(DIRS[f]); }
  add('Directions', `${NAMES[i % 12]} faces ${DIRS[d]}. Then ${NAMES[i % 12]} turns ${ts.join(', then ')}. Which direction is ${NAMES[i % 12]} facing now?`, DIRS[f], DIRS.filter((x) => x !== DIRS[f]),
    `A **right** turn goes clockwise (N → E → S → W); a **left** turn goes the other way.\nFollow each turn: ${path.join(' → ')}.\nSo ${NAMES[i % 12]} faces **${DIRS[f]}**.`);
});
// Distance from the start (two legs at a right angle).
for (const [a, b, c] of [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17], [12, 16, 20], [4, 3, 5], [8, 6, 10], [12, 5, 13], [15, 20, 25], [7, 24, 25], [20, 15, 25]]) {
  const d = (a + b) % 4, t = (a % 2) ? 'right' : 'left', d2 = turn(d, t);
  add('Directions', `From the town hall, a jeep goes ${a} km ${DIRS[d]}, then turns ${t} and goes ${b} km. How far is it from the town hall in a straight line?`, `${c} km`, [`${a + b} km`, `${Math.abs(a - b)} km`, `${c + 1} km`, `${c - 1} km`],
    `The two trips (${DIRS[d]}, then ${DIRS[d2]}) make a **right angle**, so use the Pythagorean theorem.\nStep 1: ${a}² + ${b}² = ${a * a} + ${b * b} = ${a * a + b * b}\nStep 2: √${a * a + b * b} = **${c} km** (because ${c} × ${c} = ${c * c}).\n!!Trap!!: ${a + b} km is the distance traveled, not the straight-line distance.`);
}
// Where is the person now from the start (several legs, add up each axis).
for (const legs of [[[0, 5], [1, 3], [2, 5]], [[0, 4], [1, 6], [2, 2]], [[1, 7], [0, 3], [3, 7]], [[2, 6], [3, 4], [0, 6]], [[0, 10], [1, 4], [2, 3]], [[3, 5], [0, 5], [1, 5]],
  [[1, 3], [2, 4], [3, 3]], [[0, 2], [3, 6], [2, 2]], [[2, 8], [1, 2], [0, 8]], [[3, 9], [2, 4], [1, 9]], [[0, 6], [1, 6], [2, 6], [3, 2]], [[1, 4], [0, 4], [3, 4], [2, 1]]]) {
  let x = 0, y = 0;
  for (const [d, n] of legs) { if (d === 0) y += n; if (d === 2) y -= n; if (d === 1) x += n; if (d === 3) x -= n; }
  const ns = y > 0 ? 'North' : y < 0 ? 'South' : '', ew = x > 0 ? 'East' : x < 0 ? 'West' : '';
  const where = ns && ew ? `${Math.abs(y)} km ${ns} and ${Math.abs(x)} km ${ew}` : ns ? `${Math.abs(y)} km ${ns}` : ew ? `${Math.abs(x)} km ${ew}` : 'back at the start';
  const wrongs = [ns ? `${Math.abs(y)} km ${ns === 'North' ? 'South' : 'North'}` : `${Math.abs(x) + 1} km ${ew || 'East'}`, ew ? `${Math.abs(x)} km ${ew === 'East' ? 'West' : 'East'}` : `${Math.abs(y) + 2} km ${ns || 'North'}`,
    `${legs.reduce((s, l) => s + l[1], 0)} km ${legs[legs.length - 1][0] % 2 ? DIRS[legs[legs.length - 1][0]] : DIRS[legs[0][0]]}`, ns && ew ? `${Math.abs(x)} km ${ns} and ${Math.abs(y)} km ${ew}` : 'back at the start'];
  add('Directions', `A messenger walks ${legs.map(([d, n]) => `${n} km ${DIRS[d]}`).join(', then ')}. Where is the messenger now from the starting point?`, where, wrongs,
    `Add up each direction by itself. North and South cancel each other; so do East and West.\nNorth–South: ${legs.filter(([d]) => d % 2 === 0).map(([d, n]) => `${d === 0 ? '+' : '−'}${n}`).join(' ') || '0'} = ${y >= 0 ? '' : '−'}${Math.abs(y)} (${ns || 'none'}).\nEast–West: ${legs.filter(([d]) => d % 2 === 1).map(([d, n]) => `${d === 1 ? '+' : '−'}${n}`).join(' ') || '0'} = ${x >= 0 ? '' : '−'}${Math.abs(x)} (${ew || 'none'}).\nSo the messenger is **${where}**.`);
}
// Shadows: in the morning the sun is in the East, so shadows fall to the West.
for (const [time, facing] of [['morning', 0], ['morning', 1], ['morning', 2], ['morning', 3], ['afternoon', 0], ['afternoon', 1], ['afternoon', 2], ['afternoon', 3]]) {
  const shadowDir = time === 'morning' ? 3 : 1;
  const side = (shadowDir - facing + 4) % 4; // 0 front, 1 right, 2 back, 3 left
  const ans = ['in front of', 'to the right of', 'behind', 'to the left of'][side];
  add('Directions', `One ${time}, a guard stands facing ${DIRS[facing]}. Where does the guard's shadow fall?`, `${ans} the guard`, ['in front of', 'to the right of', 'behind', 'to the left of'].filter((x) => x !== ans).map((x) => `${x} the guard`),
    `In the ${time} the sun is in the **${time === 'morning' ? 'East' : 'West'}**, so shadows point **${DIRS[shadowDir]}**.\nFacing ${DIRS[facing]}, the ${DIRS[shadowDir]} side is **${ans}** the guard.`);
}

/* ---------- Ranking and order ---------- */
for (const [left, right] of [[7, 12], [10, 15], [5, 21], [14, 9], [18, 18], [3, 30], [22, 8], [11, 11], [16, 25], [9, 4], [12, 20], [25, 6], [6, 19], [13, 17]]) {
  const total = left + right - 1;
  add('Ranking', `In a line of students, Nico is ${ORD(left)} from the front and ${ORD(right)} from the back. How many students are in the line?`, total, [left + right, total - 1, left + right + 1, Math.max(left, right) * 2],
    `Nico is counted **twice** (once from each end).\nTotal = front position + back position − 1\n= ${left} + ${right} − 1\n= **${total}**`);
}
for (const [n, a, b] of [[40, 10, 18], [35, 7, 12], [50, 15, 20], [30, 6, 9], [45, 12, 25], [28, 4, 10], [60, 20, 30], [33, 11, 13], [42, 9, 20], [25, 5, 8]]) {
  const between = n - a - b;
  add('Ranking', `In a row of ${n} chairs, Paz sits ${ORD(a)} from the left and Rey sits ${ORD(b)} from the right. If Paz is to the left of Rey, how many chairs are between them?`, between, [between + 1, between - 1, between + 2, n - a - b + 2].filter((v) => v >= 0),
    `Step 1: Rey's place from the left: ${n} − ${b} + 1 = **${n - b + 1}**.\nStep 2: Chairs between ${ORD(a)} and ${ORD(n - b + 1)}: ${n - b + 1} − ${a} − 1 = **${between}**.`);
}
for (const [rank, total] of [[5, 40], [12, 50], [3, 25], [18, 60], [7, 32], [21, 45], [9, 9], [1, 30], [15, 15], [10, 28]]) {
  const fromBottom = total - rank + 1;
  add('Ranking', `In a class of ${total}, Lara ranks ${ORD(rank)} from the top. What is her rank from the bottom?`, ORD(fromBottom), [ORD(total - rank), ORD(fromBottom + 1), ORD(rank), ORD(Math.max(1, fromBottom - 1))],
    `Rank from the bottom = total − rank from the top + 1\n= ${total} − ${rank} + 1\n= **${fromBottom}**, so she is ${ORD(fromBottom)} from the bottom.`);
}
// Ordering by a fact chain (heights, ages, salaries).
const CHAINS = [
  ['taller than', 'tallest', 'shortest'], ['older than', 'oldest', 'youngest'], ['heavier than', 'heaviest', 'lightest'], ['faster than', 'fastest', 'slowest'], ['richer than', 'richest', 'poorest'],
];
const P5 = [['Ana', 'Ben', 'Cris', 'Dan', 'Eva'], ['Fely', 'Gem', 'Hans', 'Iza', 'Jojo'], ['Kat', 'Leo', 'Mia', 'Nel', 'Ole'], ['Pia', 'Ron', 'Sol', 'Tim', 'Uma'], ['Vic', 'Wen', 'Xian', 'Yna', 'Zed'], ['Abe', 'Bong', 'Cel', 'Dodo', 'Ely']];
P5.forEach((people, pi) => CHAINS.forEach(([rel, top, bottom], ci) => {
  if ((pi + ci) % 2) return;
  // order[0] is the top. Facts are given out of order.
  const order = [people[(pi + 2) % 5], people[(pi + 4) % 5], people[pi % 5], people[(pi + 1) % 5], people[(pi + 3) % 5]];
  const facts = [[order[1], order[2]], [order[3], order[4]], [order[0], order[1]], [order[2], order[3]]];
  const askTop = (pi + ci) % 4 === 0;
  const ans = askTop ? order[0] : order[4];
  add('Logic', `${facts.map(([x, y]) => `${x} is ${rel} ${y}.`).join(' ')} Who is the ${askTop ? top : bottom}?`, ans, [order[askTop ? 1 : 3], order[2], order[askTop ? 4 : 0], order[askTop ? 3 : 1]],
    `Line them up from the ${top} to the ${bottom}, one fact at a time:\n**${order.join(' > ')}**\nSo the ${askTop ? top : bottom} is **${ans}**.`);
}));

/* ---------- Calendar ---------- */
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [['January', 31], ['February', 28], ['March', 31], ['April', 30], ['May', 31], ['June', 30], ['July', 31], ['August', 31], ['September', 30], ['October', 31], ['November', 30], ['December', 31]];
for (const [m, d1, target] of [[0, 1, 25], [2, 3, 20], [4, 5, 29], [6, 0, 18], [8, 2, 30], [9, 4, 31], [10, 6, 15], [11, 1, 25], [3, 3, 22], [5, 5, 12], [7, 0, 28], [1, 2, 14], [0, 4, 26], [4, 6, 31], [6, 1, 4]]) {
  const ans = DAYS[(d1 + target - 1) % 7];
  add('Calendar', `If ${MONTHS[m][0]} 1 falls on a ${DAYS[d1]}, what day of the week is ${MONTHS[m][0]} ${target}?`, ans, DAYS.filter((x) => x !== ans),
    `Step 1: From the 1st to the ${target}th is ${target} − 1 = **${target - 1} days**.\nStep 2: ${target - 1} ÷ 7 = ${Math.floor((target - 1) / 7)} weeks and **${(target - 1) % 7}** day${(target - 1) % 7 === 1 ? '' : 's'} left.\nStep 3: Move ${(target - 1) % 7} day${(target - 1) % 7 === 1 ? '' : 's'} forward from ${DAYS[d1]}: **${ans}**.`);
}
for (const [m, d1] of [[0, 1], [2, 4], [3, 0], [4, 2], [5, 6], [6, 3], [7, 5], [8, 1], [9, 3], [10, 0], [11, 5], [1, 4]]) {
  const [mn, len] = MONTHS[m], next = MONTHS[(m + 1) % 12][0];
  const ans = DAYS[(d1 + len) % 7];
  add('Calendar', `${mn} 1 of a non-leap year is a ${DAYS[d1]}. What day of the week is ${next} 1?`, ans, DAYS.filter((x) => x !== ans),
    `${mn} has **${len} days**. ${len} ÷ 7 = 4 weeks and **${len - 28}** day${len - 28 === 1 ? '' : 's'} left.\nSo ${next} 1 is ${len - 28} day${len - 28 === 1 ? '' : 's'} after ${DAYS[d1]}: **${ans}**.`);
}
for (const y of [1900, 2000, 2024, 2100, 1996, 2023, 2028, 2030, 2400, 1800]) {
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const ans = leap ? 'Yes, it is a leap year' : 'No, it is not a leap year';
  add('Calendar', `Is ${y} a leap year?`, ans, [leap ? 'No, it is not a leap year' : 'Yes, it is a leap year', 'Only if February has 30 days', 'It cannot be told from the year'],
    `Rule: a year is a leap year if it can be divided by **4**, except century years (like 1900), which must be divided by **400**.\n${y} ÷ 4 ${y % 4 ? 'leaves a remainder' : 'has no remainder'}${y % 100 === 0 ? `; it is a century year, and ÷ 400 ${y % 400 ? 'leaves a remainder' : 'has no remainder'}` : ''}.\nSo: **${ans}**.`);
}
for (const [d, n, dir] of [[1, 45, 'after'], [3, 100, 'after'], [5, 30, 'before'], [0, 61, 'after'], [6, 17, 'before'], [2, 365, 'after'], [4, 50, 'before'], [1, 1000, 'after'], [3, 24, 'before'], [5, 72, 'after'], [0, 90, 'before'], [6, 200, 'after']]) {
  const ans = DAYS[(((d + (dir === 'after' ? n : -n)) % 7) + 7) % 7];
  add('Calendar', `Today is ${DAYS[d]}. What day of the week was or will be ${n} days ${dir === 'after' ? 'from now' : 'ago'}?`, ans, DAYS.filter((x) => x !== ans),
    `Every 7 days the same day comes back, so only the **remainder** matters.\n${n} ÷ 7 = ${Math.floor(n / 7)} remainder **${n % 7}**.\nGo ${n % 7} day${n % 7 === 1 ? '' : 's'} ${dir === 'after' ? 'forward' : 'back'} from ${DAYS[d]}: **${ans}**.`);
}

/* ---------- Number analogy ---------- */
const RULES = [
  ['square', (x) => x * x, (a, b) => `${b} = ${a} × ${a}`], ['cube', (x) => x ** 3, (a, b) => `${b} = ${a} × ${a} × ${a}`], ['times 3', (x) => 3 * x, (a, b) => `${b} = ${a} × 3`],
  ['times 4, minus 1', (x) => 4 * x - 1, (a, b) => `${b} = ${a} × 4 − 1`], ['square plus 1', (x) => x * x + 1, (a, b) => `${b} = ${a} × ${a} + 1`], ['plus 7', (x) => x + 7, (a, b) => `${b} = ${a} + 7`],
  ['times 2, plus 3', (x) => 2 * x + 3, (a, b) => `${b} = ${a} × 2 + 3`], ['square minus the number', (x) => x * x - x, (a, b) => `${b} = ${a} × ${a} − ${a}`],
];
RULES.forEach(([nm, f, say], ri) => {
  // Two example pairs, so the rule cannot be read two simple ways (3 : 9 alone is "square", "times 3" or "plus 6").
  for (const [a, b, c] of [[3, 4, 6], [4, 5, 7], [5, 6, 8], [3, 5, 9], [2, 4, 7], [6, 7, 3], [4, 6, 11], [5, 8, 2], [3, 7, 10]].map(([x, y, z]) => [x + (ri % 2), y + (ri % 2), z])) {
    if (new Set([a, b, c]).size < 3) continue;
    const ans = f(c), line = f(a) + (f(b) - f(a)) / (b - a) * (c - a); // a straight-line guess from the two pairs
    add('Number Analogy', `Find the missing number: ${a} → ${f(a)}, ${b} → ${f(b)}, ${c} → ___`, ans, [ans + 1, ans - 1, ans + c, ans * 2, ans + 2].filter((v) => v !== line).map((v) => Math.round(v)),
      `Find one rule that works for BOTH pairs: ${say(a, f(a))} and ${say(b, f(b))} (rule: **${nm}**).\nUse the same rule: ${say(c, ans)}.\nSo the missing number is **${ans}**.`);
  }
});

/* ---------- Syllogisms (made-up words, so only the logic counts) ---------- */
const NONSENSE = ['blips', 'crons', 'dafts', 'frobs', 'glims', 'hoks', 'jaxes', 'klums', 'lorns', 'mivs', 'norks', 'plims', 'quobs', 'rasps', 'skibs', 'tuvs', 'vels', 'wibs', 'yorns', 'zarks'];
const TRIPLES = [];
for (let i = 0; i < 20; i++) TRIPLES.push([NONSENSE[i], NONSENSE[(i + 7) % 20], NONSENSE[(i + 13) % 20]]);
const FORMS = [
  (X, Y, Z) => [`All ${X} are ${Y}. All ${Y} are ${Z}.`, `All ${X} are ${Z}.`, [`All ${Z} are ${X}.`, `No ${X} are ${Z}.`, `Some ${Y} are not ${Z}.`], `${X} is inside ${Y}, and ${Y} is inside ${Z}, so ${X} is inside ${Z}.`],
  (X, Y, Z) => [`All ${X} are ${Y}. No ${Y} are ${Z}.`, `No ${X} are ${Z}.`, [`Some ${X} are ${Z}.`, `All ${Z} are ${X}.`, `All ${Z} are ${Y}.`], `${X} is inside ${Y}, and ${Y} never touches ${Z}, so ${X} never touches ${Z}.`],
  (X, Y, Z) => [`Some ${X} are ${Y}. All ${Y} are ${Z}.`, `Some ${X} are ${Z}.`, [`All ${X} are ${Z}.`, `No ${X} are ${Z}.`, `All ${Z} are ${X}.`], `the ${X} that are ${Y} are also inside ${Z}, so at least some ${X} are ${Z}. We know nothing about the other ${X}.`],
  (X, Y, Z) => [`All ${X} are ${Y}. Some ${Z} are ${X}.`, `Some ${Z} are ${Y}.`, [`All ${Z} are ${Y}.`, `No ${Z} are ${Y}.`, `All ${Y} are ${Z}.`], `the ${Z} that are ${X} are inside ${Y} (because all ${X} are), so some ${Z} are ${Y}.`],
  (X, Y, Z) => [`No ${X} are ${Y}. All ${Z} are ${X}.`, `No ${Z} are ${Y}.`, [`Some ${Z} are ${Y}.`, `All ${Y} are ${Z}.`, `All ${Y} are ${X}.`], `${Z} is inside ${X}, and ${X} never touches ${Y}, so ${Z} never touches ${Y}.`],
  (X, Y, Z) => [`All ${X} are ${Y}. All ${X} are ${Z}.`, `Some ${Y} are ${Z}.`, [`All ${Y} are ${Z}.`, `No ${Y} are ${Z}.`, `All ${Z} are ${X}.`], `every ${X} is both a ${Y.replace(/e?s$/, '')} and a ${Z.replace(/e?s$/, '')}, so where the ${X} are, ${Y} and ${Z} meet: some ${Y} are ${Z}.`],
];
TRIPLES.forEach(([X, Y, Z], i) => {
  for (const k of [i % 6, (i + 3) % 6, (i + 1) % 6, (i + 4) % 6]) {
    const [prem, ans, wrongs, why] = FORMS[k](X, Y, Z);
    add('Logic (Syllogism)', `${prem} Which conclusion is certainly true?`, ans, wrongs,
      `Draw circles (a Venn diagram). Here ${why}\nSo the conclusion that must be true is **${ans}**\n!!Trap!!: "All" cannot be turned around, and "some" never means "all".`);
  }
});
// If-then statements.
// [if part, then part, if part denied, then part denied]
const IFS = [
  ['it rains', 'the parade is cancelled', 'it does not rain', 'the parade is not cancelled'],
  ['a student studies daily', 'the student passes', 'a student does not study daily', 'the student does not pass'],
  ['the light is red', 'the cars stop', 'the light is not red', 'the cars do not stop'],
  ['the office is closed', 'the guard is on duty', 'the office is not closed', 'the guard is not on duty'],
  ['the water boils', 'the kettle whistles', 'the water does not boil', 'the kettle does not whistle'],
  ['the alarm rings', 'everyone leaves the building', 'the alarm does not ring', 'not everyone leaves the building'],
  ['a form is complete', 'it is approved', 'a form is not complete', 'it is not approved'],
  ['the power goes out', 'the generator starts', 'the power does not go out', 'the generator does not start'],
  ['the bell rings', 'the class begins', 'the bell does not ring', 'the class does not begin'],
  ['a document is signed', 'it is sent to the records section', 'a document is not signed', 'it is not sent to the records section'],
  ['the road is flooded', 'the bus takes another route', 'the road is not flooded', 'the bus does not take another route'],
  ['an applicant is late', 'the applicant is not allowed to enter', 'an applicant is not late', 'the applicant is allowed to enter'],
];
IFS.forEach(([p, q, np, nq], i) => {
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  const NEG = { [p]: np, [q]: nq };
  const neg = (x) => NEG[x];
  for (const kind of [i % 4, (i + 2) % 4]) {
  const stmt = `"If ${p}, then ${q}."`;
  if (kind === 0) add('Logic', `${stmt} It is true that ${p}. What follows?`, `${cap(q)}.`, [`${cap(neg(q))}.`, `${cap(neg(p))}.`, 'Nothing can be concluded.'],
    `When the "if" part happens, the "then" part must happen.\nSo: **${cap(q)}.**`);
  if (kind === 1) add('Logic', `${stmt} It is true that ${neg(q)}. What follows?`, `${cap(neg(p))}.`, [`${cap(p)}.`, `${cap(q)}.`, 'Nothing can be concluded.'],
    `Read it backwards from the result: if it were true that ${p}, then ${q} would also be true. But ${neg(q)}, so it cannot be true that ${p}.\nSo: **${cap(neg(p))}.**`);
  if (kind === 2) add('Logic', `${stmt} It is true that ${q}. What follows with certainty?`, 'Nothing can be concluded with certainty.', [`${cap(p)}.`, `${cap(neg(p))}.`, `${cap(neg(q))}.`],
    `The statement only says what happens WHEN ${p}. ${cap(q)} could also happen for another reason.\nSo **nothing can be concluded with certainty.**\n!!Trap!!: do not run the "if-then" backwards.`);
  if (kind === 3) add('Logic', `${stmt} It is true that ${neg(p)}. What follows with certainty?`, 'Nothing can be concluded with certainty.', [`${cap(neg(q))}.`, `${cap(q)}.`, `${cap(p)}.`],
    `The statement says nothing about what happens when ${neg(p)}. Whether ${q} or not is unknown.\nSo **nothing can be concluded with certainty.**`);
  }
});

/* ---------- Blood relations ---------- */
const MEN = ['Andoy', 'Berto', 'Caloy', 'Dodong', 'Emil', 'Ferdie', 'Gardo', 'Hugo', 'Igme', 'Jomar'];
const WOMEN = ['Alma', 'Belen', 'Carmen', 'Delia', 'Ester', 'Fely', 'Gloria', 'Helen', 'Inday', 'Josie'];
const REL = ['father', 'mother', 'brother', 'sister', 'son', 'daughter', 'uncle', 'aunt', 'nephew', 'niece', 'cousin', 'grandfather', 'grandmother', 'grandson', 'granddaughter', 'father-in-law', 'mother-in-law', 'son-in-law', 'daughter-in-law', 'brother-in-law', 'sister-in-law'];
const BLOOD = [
  (m, f) => [`${m} is the brother of ${f}'s mother. How is ${m} related to ${f}?`, 'uncle', `${f}'s mother's brother is ${f}'s **uncle**.`, ['nephew', 'cousin', 'brother']],
  (m, f) => [`${f} is the daughter of ${m}'s only brother. How is ${f} related to ${m}?`, 'niece', `A brother's daughter is a **niece**.`, ['daughter', 'cousin', 'sister']],
  (m, f) => [`${f} is the mother of ${m}'s father. How is ${f} related to ${m}?`, 'grandmother', `The mother of your father is your **grandmother**.`, ['mother', 'aunt', 'mother-in-law']],
  (m, f) => [`${f} is the wife of ${m}'s brother. How is ${f} related to ${m}?`, 'sister-in-law', `Your brother's wife is your **sister-in-law**.`, ['sister', 'cousin', 'aunt']],
  (m, f) => [`${m} is the husband of ${f}'s daughter. How is ${m} related to ${f}?`, 'son-in-law', `Your daughter's husband is your **son-in-law**.`, ['son', 'nephew', 'brother-in-law']],
  (m, f) => [`${f}'s father and ${m}'s father are brothers. How is ${f} related to ${m}?`, 'cousin', `Children of brothers are **cousins**.`, ['sister', 'niece', 'aunt']],
  (m, f) => [`Pointing to a boy, ${f} said, "He is the son of my mother's only child." How is the boy related to ${f}?`, 'son', `Her mother's only child is ${f} herself, so the boy is her **son**.`, ['brother', 'nephew', 'cousin']],
  (m, f) => [`Pointing to a girl, ${m} said, "Her mother is the only daughter of my mother." How is the girl related to ${m}?`, 'niece', `The only daughter of ${m}'s mother is ${m}'s sister. The girl is his sister's daughter: his **niece**.`, ['daughter', 'sister', 'cousin']],
  (m, f) => [`${m}'s father is the only son of ${f}'s father. How is ${f} related to ${m}?`, 'aunt', `The only son of ${f}'s father is ${f}'s brother, and he is ${m}'s father. So ${f} is the sister of ${m}'s father: his **aunt**.`, ['mother', 'sister', 'grandmother']],
  (m, f) => [`${f} is the only daughter of ${m}'s grandfather's only son. How is ${f} related to ${m}?`, 'sister', `${m}'s grandfather's only son is ${m}'s father. His only daughter is ${m}'s **sister**.`, ['cousin', 'aunt', 'niece']],
  (m, f) => [`${m} is the son of ${f}'s son. How is ${m} related to ${f}?`, 'grandson', `The son of your son is your **grandson**.`, ['son', 'nephew', 'son-in-law']],
  (m, f) => [`${f} is the mother of ${m}'s wife. How is ${f} related to ${m}?`, 'mother-in-law', `Your wife's mother is your **mother-in-law**.`, ['mother', 'aunt', 'sister-in-law']],
];
BLOOD.forEach((tpl, k) => {
  for (const j of [k % 10, (k + 5) % 10, (k + 3) % 10, (k + 7) % 10, (k + 1) % 10]) {
    const [q, ans, why, near] = tpl(MEN[j], WOMEN[(j + k) % 10]);
    add('Blood Relations', q, ans, [...near, ...REL], `Go one step at a time. ${why}`);
  }
});

/* ---------- Data interpretation (a small table in the question) ---------- */
const DATA = [
  ['A barangay health center served these numbers of patients', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], [[42, 38, 55, 47, 60], [30, 45, 40, 35, 50], [64, 52, 48, 70, 56], [25, 40, 35, 30, 45]]],
  ['A bakery sold these numbers of pandesal bags', ['Week 1', 'Week 2', 'Week 3', 'Week 4'], [[120, 150, 135, 175], [200, 180, 240, 220], [90, 110, 105, 135], [160, 140, 200, 180]]],
  ['A municipal office processed these numbers of permits', ['Jan', 'Feb', 'Mar', 'Apr', 'May'], [[80, 95, 70, 110, 105], [150, 120, 165, 140, 175], [60, 75, 90, 85, 100], [45, 55, 50, 70, 80]]],
];
DATA.forEach(([what, labels, sets], di) => sets.forEach((vals, si) => {
  const table = labels.map((l, i) => `${l}: ${vals[i]}`).join(', ');
  const total = vals.reduce((s, v) => s + v, 0);
  const hi = vals.indexOf(Math.max(...vals)), lo = vals.indexOf(Math.min(...vals));
  const avg = total / vals.length;
  const kind = (di + si) % 4;
  if (kind === 0 || kind === 2) add('Data Interpretation', `${what} (${table}). When was the number the highest?`, labels[hi], labels.filter((_, i) => i !== hi),
    `Compare the numbers: the biggest is **${vals[hi]}**, on **${labels[hi]}**.`);
  if (kind === 1 || kind === 3) add('Data Interpretation', `${what} (${table}). When was the number the lowest?`, labels[lo], labels.filter((_, i) => i !== lo),
    `Compare the numbers: the smallest is **${vals[lo]}**, on **${labels[lo]}**.`);
  if (Number.isInteger(avg * 10)) add('Data Interpretation', `${what} (${table}). What is the average per ${labels[0].startsWith('Week') ? 'week' : labels[0].length === 3 && labels[0] !== 'Jan' ? 'day' : 'month'}?`, fmt(avg), [fmt(avg + 5), fmt(avg - 5), fmt(total), fmt(Math.round(total / (vals.length + 1)))],
    `Step 1: Add them: ${vals.join(' + ')} = **${total}**.\nStep 2: Divide by ${vals.length}: ${total} ÷ ${vals.length} = **${fmt(avg)}**.`);
  add('Data Interpretation', `${what} (${table}). What is the difference between the highest and the lowest?`, vals[hi] - vals[lo], [vals[hi] - vals[lo] + 5, vals[hi], vals[hi] + vals[lo], vals[hi] - vals[lo] - 5],
    `Highest: **${vals[hi]}** (${labels[hi]}). Lowest: **${vals[lo]}** (${labels[lo]}).\n${vals[hi]} − ${vals[lo]} = **${vals[hi] - vals[lo]}**.`);
  const a = vals[0], b = vals[1], ch = (b - a) * 100 / a;
  if (Number.isInteger(ch * 10)) add('Data Interpretation', `${what} (${table}). By what percent did the number change from ${labels[0]} to ${labels[1]}?`, `${ch > 0 ? 'up' : 'down'} ${fmt(Math.abs(ch))}%`,
    [`${ch > 0 ? 'up' : 'down'} ${fmt(Math.abs(b - a))}%`, `${ch > 0 ? 'down' : 'up'} ${fmt(Math.abs(ch))}%`, `${ch > 0 ? 'up' : 'down'} ${fmt(Math.round(Math.abs((b - a) * 100 / b) * 10) / 10)}%`, `${ch > 0 ? 'up' : 'down'} ${fmt(Math.abs(ch) + 5)}%`],
    `Step 1: Change: ${b} − ${a} = ${b - a}.\nStep 2: Divide by the FIRST value: ${b - a} ÷ ${a} × 100 = ${fmt(ch)}%.\nSo it went **${ch > 0 ? 'up' : 'down'} ${fmt(Math.abs(ch))}%**.`);
}));

/* ---------- Number classification: which number does not belong? ---------- */
// The odd one out must be the ONLY choice that breaks the shared property, and no other property may single out
// another choice (e.g. 16, 25, 36, 48: 48 is the only non-square, but 25 is the only odd number, so it is skipped).
const isPrimeN = (n) => n > 1 && [...Array(Math.max(0, Math.floor(Math.sqrt(n)) - 1)).keys()].every((k) => n % (k + 2) !== 0);
const PROPS = [
  ['a perfect square', (n) => Number.isInteger(Math.sqrt(n))], ['a perfect cube', (n) => Number.isInteger(Math.round(Math.cbrt(n))) && Math.round(Math.cbrt(n)) ** 3 === n],
  ['a prime number', isPrimeN], ['even', (n) => n % 2 === 0], ['odd', (n) => n % 2 === 1], ['a multiple of 3', (n) => n % 3 === 0], ['a multiple of 5', (n) => n % 5 === 0],
  ['a multiple of 7', (n) => n % 7 === 0], ['a multiple of 9', (n) => n % 9 === 0], ['a multiple of 11', (n) => n % 11 === 0], ['a two-digit number', (n) => n >= 10 && n < 100],
];
const singles = (nums) => PROPS.map(([nm, f]) => [nm, nums.filter((n) => !f(n)), nums.filter((n) => f(n))])
  .flatMap(([nm, no, yes]) => [...(no.length === 1 ? [[no[0], `not ${nm}`, nm]] : []), ...(yes.length === 1 ? [[yes[0], nm, `not ${nm}`]] : [])]);
const CAND = {
  'a perfect square': [16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225], 'a prime number': [13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73],
  'a multiple of 7': [14, 21, 28, 35, 42, 49, 56, 63, 77, 84, 91, 98], 'a multiple of 9': [18, 27, 36, 45, 54, 63, 72, 81, 90, 99], 'a perfect cube': [8, 27, 64, 125, 216],
  'a multiple of 11': [22, 33, 44, 55, 66, 77, 88, 99],
};
const OUTS = [15, 20, 26, 30, 34, 38, 39, 40, 46, 50, 51, 52, 57, 58, 60, 62, 65, 68, 70, 74, 75, 78, 80, 85, 86, 87, 91, 92, 95];
let made = 0;
for (const [prop, list] of Object.entries(CAND)) {
  const f = PROPS.find((x) => x[0] === prop)[1];
  for (let k = 0; k < 40 && made < 70; k++) {
    const three = pickSome(list, 3, `cls${prop}${k}`);
    const odd = OUTS[(k * 7 + prop.length) % OUTS.length];
    if (f(odd) || three.length < 3) continue;
    const nums = [...three, odd];
    const s1 = singles(nums);
    if (!s1.length || s1.some(([n]) => n !== odd)) continue;
    const shown = [...nums].sort((x, y) => ((x * 13) % 7) - ((y * 13) % 7) || x - y);
    add('Classification', `Which number does NOT belong with the others: ${shown.join(', ')}?`, odd, three,
      `${three.join(', ')} are all **${prop}**. ${odd} is not.\nSo the number that does not belong is **${odd}**.`);
    made++;
  }
}

/* ---------- More letter series: skipping a growing number of letters, and letter-number pairs ---------- */
for (const [s, k] of [[0, 1], [1, 2], [2, 3], [0, 2], [3, 1], [5, 2], [1, 3], [4, 1], [2, 2], [6, 1]]) {
  const idx = [s]; for (let i = 1; i < 6; i++) idx.push(idx[i - 1] + k + i - 1);
  if (idx[5] > 25) continue;
  const groups = idx.map((v, i) => `${at(v)}${v + 1}`);
  add('Letter Series', `What comes next: ${groups.slice(0, 5).join(', ')}, ___ ?`, groups[5], [`${at(idx[5] + 1)}${idx[5] + 2}`, `${at(idx[5])}${idx[5]}`, `${at(idx[4] + k)}${idx[4] + k + 1}`, `${at(idx[5] - 1)}${idx[5] + 1}`],
    `Each group is a letter and its place in the alphabet (A1, B2 …).\nThe letters jump ${idx.slice(1, 5).map((v, i) => `+${v - idx[i]}`).join(', ')} (one more each time), so the next jump is +${idx[5] - idx[4]}.\n${at(idx[4])} + ${idx[5] - idx[4]} = **${at(idx[5])}**, and ${at(idx[5])} is letter ${idx[5] + 1}: **${groups[5]}**.`);
}

module.exports = out;
