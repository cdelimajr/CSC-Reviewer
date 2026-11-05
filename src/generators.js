// Question generators: produce fresh items every exam so reviewers don't memorize answers.
// Each generator returns { subject, topic, question, choices[4], answer, explanation }.

const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const peso = (n) => '₱' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
const ord = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
const fmt = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

// Build an item from a correct answer and distractors (dedupes, shuffles, ensures 4 choices).
function mk(subject, topic, question, correct, distractors, explanation, extra = {}) {
  const seen = new Set([String(correct)]);
  const ds = [];
  for (const d of distractors) {
    const s = String(d);
    if (!seen.has(s)) { seen.add(s); ds.push(s); }
    if (ds.length === 3) break;
  }
  if (ds.length < 3) return null;
  const choices = shuffle([String(correct), ...ds]);
  return { subject, topic, question, choices, answer: choices.indexOf(String(correct)), explanation, ...extra };
}

// Numeric distractors that look plausible.
function numDistractors(ans, opts = {}) {
  const { step = Math.max(1, Math.round(Math.abs(ans) * 0.1)), allowNeg = false, decimals = 0 } = opts;
  const out = [];
  const cands = shuffle([ans + step, ans - step, ans + 2 * step, ans - 2 * step, ans + 3 * step, Math.round(ans * 1.5), Math.round(ans / 2), ans + 1, ans - 1, ans * 2]);
  for (let c of cands) {
    c = decimals ? Number(c.toFixed(decimals)) : Math.round(c);
    if (!allowNeg && c <= 0) continue;
    if (c === ans || out.includes(c)) continue;
    out.push(c);
  }
  return out;
}

/* ----------------------------- SMALL MATH STEPS ----------------------------- */
// Math explanations look like a printed answer key that a 10-year-old can follow: one small operation per
// line (lines that start with "="), and on each line the part to work out next is highlighted (^^part^^).
// These helpers break a big × or ÷ into easy pieces (place values), so no line jumps straight to the answer.
const placeParts = (n) => String(n).split('').map((d, i, a) => Number(d) * 10 ** (a.length - 1 - i)).filter(Boolean);
const tz = (n) => { let z = 0; while (n && n % 10 === 0) { n /= 10; z++; } return z; }; // trailing zeros
const zerosWord = (z) => `${z} zero${z > 1 ? 's' : ''}`;
// The lines after "a × b" (whole numbers).
function mulLines(a, b) {
  const r = a * b;
  if (!a || !b || a === 1 || b === 1 || (a <= 12 && b <= 12) || r <= 100) return [`= ${fmt(r)}`];
  const pa = placeParts(a), pb = placeParts(b);
  if (pa.length === 1 && pb.length === 1) { // 30 × 200: multiply the front digits, then add the zeros
    const z = tz(a) + tz(b), da = a / 10 ** tz(a), db = b / 10 ** tz(b);
    return [`= ${da} × ${db}, then add ${zerosWord(z)}`, `= ${da * db} → ${fmt(r)}`];
  }
  // Split the number with more parts: 35 × 24 = 35 × 20 + 35 × 4
  const [x, y] = pb.length > pa.length || (pb.length === pa.length && b >= a) ? [a, b] : [b, a];
  const parts = placeParts(y), prods = parts.map((p) => x * p);
  const out = [`= ${parts.map((p) => `${fmt(x)} × ${fmt(p)}`).join(' + ')}`, `= ${prods.map(fmt).join(' + ')}`];
  let sum = prods[0];
  for (let i = 1; i < prods.length - 1; i++) { sum += prods[i]; out.push(`= ${fmt(sum)} + ${prods.slice(i + 1).map(fmt).join(' + ')}`); }
  out.push(`= ${fmt(r)}`);
  return out;
}
// The lines after "a ÷ b" when it divides evenly.
function divLines(a, b) {
  const q = a / b;
  if (b === 1) return [`= ${fmt(q)}`];
  const z = Math.min(tz(a), tz(b));
  if (z) return [`= ${fmt(a / 10 ** z)} ÷ ${fmt(b / 10 ** z)}   (take away ${zerosWord(z)} from both)`, ...divLines(a / 10 ** z, b / 10 ** z)];
  const parts = placeParts(q);
  if ((q <= 12 && b <= 12) || parts.length === 1) return [`= ${fmt(q)}   (because ${fmt(b)} × ${fmt(q)} = ${fmt(a)})`];
  const chunks = parts.map((p) => p * b);
  return [`= (${chunks.map(fmt).join(' + ')}) ÷ ${fmt(b)}   (split ${fmt(a)} into easy parts)`,
    `= ${chunks.map((c) => `${fmt(c)} ÷ ${fmt(b)}`).join(' + ')}`, `= ${parts.map(fmt).join(' + ')}`, `= ${fmt(q)}`];
}
// "Step n: label: a × b" followed by its lines.
const mulStep = (label, a, b) => [`${label}: ${fmt(a)} × ${fmt(b)}`, ...mulLines(a, b)].join('\n');
const divStep = (label, a, b) => [`${label}: ${fmt(a)} ÷ ${fmt(b)}`, ...divLines(a, b)].join('\n');
// Adding a list one number at a time.
function addLines(nums) {
  if (nums.length <= 2) return [`= ${fmt(nums.reduce((s, v) => s + v, 0))}`];
  const out = [];
  let s = nums[0];
  for (let i = 1; i < nums.length; i++) { s += nums[i]; out.push(`= ${fmt(s)}${i < nums.length - 1 ? ' + ' + nums.slice(i + 1).map(fmt).join(' + ') : ''}`); }
  return out;
}
// A hint for a − b or a + b (b ≥ 0) when the numbers go below zero.
const minusHint = (a, b) => (a >= b ? '' : a >= 0 ? `   (${b} is bigger than ${a}: ${b} − ${a} = ${b - a}, so the answer is below zero)`
  : `   (we are already ${-a} below zero and go ${b} more down: ${-a} + ${b} = ${b - a})`);
const plusHint = (a, b) => (a >= 0 ? '' : a + b >= 0 ? `   (${b} − ${-a} = ${a + b})` : `   (${-a} − ${b} = ${-(a + b)}, still below zero)`);
const neg = (n) => (n < 0 ? `(${n})` : `${n}`);

/* ----------------------------- NUMERICAL ----------------------------- */
const N = 'numerical';
const numerical = [
  function percentOf() {
    const p = pick([5, 10, 12, 15, 20, 25, 30, 35, 40, 45, 60, 75, 80]);
    const n = ri(2, 60) * 20;
    const ans = (p * n) / 100;
    return mk(N, 'Percentage', `What is ${p}% of ${fmt(n)}?`, fmt(ans), numDistractors(ans).map(fmt),
      `Step 1: **%** means "out of 100", so ${p}% of ${fmt(n)} = **${p} × ${fmt(n)} ÷ 100**.\n${mulStep('Step 2: Multiply first', p, n)}\nStep 3: Divide by 100 (take away 2 zeros, or move the dot 2 places to the left): ${fmt(p * n)} ÷ 100 = ==${fmt(ans)}==.`);
  },
  function whatPercent() {
    const p = pick([5, 10, 15, 20, 25, 30, 40, 45, 50, 60, 75, 80]);
    const base = ri(2, 40) * 20;
    const part = (base * p) / 100;
    return mk(N, 'Percentage', `${fmt(part)} is what percent of ${fmt(base)}?`, p + '%',
      numDistractors(p, { step: 5 }).map((x) => x + '%'),
      `Percent = **part ÷ whole × 100**. Here the part is ${fmt(part)} and the whole is ${fmt(base)}.\nStep 1: Multiply the part by 100 first (add 2 zeros): ${fmt(part)} × 100 = **${fmt(part * 100)}**.\n${divStep('Step 2: Divide by the whole', part * 100, base)}\nStep 3: So ${fmt(part)} is ==${p}%== of ${fmt(base)}.\nCheck: ${p}% of ${fmt(base)} = ${p} × ${fmt(base)} ÷ 100 = ${fmt(part)} ✓`);
  },
  function discount() {
    const price = ri(4, 60) * 100;
    const d = pick([10, 15, 20, 25, 30, 40, 50]);
    const one = price / 100, off = d * one, ans = price - off;
    return mk(N, 'Percentage', `A pair of shoes costs ${peso(price)}. During a sale, it is offered at ${d}% discount. What is the sale price?`,
      peso(ans), [peso(off), peso(ans + price * 0.05), peso(ans - price * 0.05), peso(price - d * 10)],
      `Step 1: Find 1% of the price: ${peso(price)} ÷ 100 = **${peso(one)}** (take away 2 zeros).\n${mulStep(`Step 2: The discount is ${d}%, so ${d} × ${peso(one)}`, d, one)}\nSo the discount is **${peso(off)}**.\nStep 3: Take the discount away from the price: ${peso(price)} − ${peso(off)} = ==${peso(ans)}==.\n!!Trap!!: ${peso(off)} is only the discount, not the sale price.`);
  },
  function simpleInterest() {
    const P = ri(2, 50) * 1000;
    const r = pick([2, 3, 4, 5, 6, 8, 10, 12]);
    const t = ri(1, 5);
    const one = P / 100, year = r * one, I = year * t;
    return mk(N, 'Simple Interest', `How much simple interest will ${peso(P)} earn at ${r}% per year for ${t} year${t > 1 ? 's' : ''}?`,
      peso(I), [peso(I + year), peso(year === I ? I * 2 : year), peso(P + I), peso(I / 2)],
      `Use **I = P × r × t** (interest = money × rate × time).\nStep 1: Find 1% of the money: ${peso(P)} ÷ 100 = **${peso(one)}** (take away 2 zeros).\n${mulStep(`Step 2: Interest for 1 year is ${r}%, so ${r} × ${peso(one)}`, r, one)}\n${t > 1 ? `${mulStep(`Step 3: For ${t} years, ${peso(year)} × ${t}`, year, t)}\nInterest: ==${peso(I)}==.` : `Step 3: It is only 1 year, so the interest is ==${peso(I)}==.`}\n!!Trap!!: the question asks for the interest only, not the money plus interest.`);
  },
  function workTogether() {
    const [a, b, ans] = pick([[3, 6, 2], [4, 12, 3], [6, 12, 4], [10, 15, 6], [12, 24, 8], [20, 30, 12], [5, 20, 4], [9, 18, 6], [8, 24, 6], [15, 30, 10], [6, 3, 2], [12, 6, 4], [4, 4, 2], [10, 40, 8]]);
    const names = shuffle(['Ana', 'Ben', 'Carlo', 'Dina', 'Ella', 'Felix', 'Gina', 'Hector']);
    const L = (a * b) / gcd(a, b), ta = L / a, tb = L / b, top = ta + tb;
    return mk(N, 'Work Problem', `${names[0]} can paint a room in ${a} hours, while ${names[1]} can paint the same room in ${b} hours. Working together, how many hours will it take them to paint the room?`,
      `${ans} hours`, [`${(a + b) / 2} hours`, `${a + b} hours`, `${ans + 1} hours`, `${Math.abs(a - b) || ans + 2} hours`, `${ans + 2} hours`],
      `Step 1: In 1 hour, ${names[0]} paints **1/${a}** of the room and ${names[1]} paints **1/${b}** of the room.\nStep 2: Add what they paint together in 1 hour. Make the bottom numbers the same (**${L}**):\nStart: 1/${a} + 1/${b}\n= ^^1/${a}^^ + ^^1/${b}^^   (1/${a} = ${ta}/${L} and 1/${b} = ${tb}/${L})\n= ^^${ta}/${L} + ${tb}/${L}^^\n= ^^${top}/${L}^^   (divide top and bottom by ${top})\n= **1/${ans}** of the room each hour\nStep 3: If they paint 1/${ans} of the room each hour, the whole room takes ==${ans} hours==.\nShortcut: (${a} × ${b}) ÷ (${a} + ${b}) = ${a * b} ÷ ${a + b} = ${ans}.\n!!Trap!!: working together is FASTER than each one alone, so the answer must be less than ${Math.min(a, b)}.`);
  },
  function distance() {
    const s = ri(4, 16) * 5;
    const t = ri(2, 6);
    const d = s * t;
    if (Math.random() < 0.5) {
      return mk(N, 'Distance, Rate, Time', `A bus travels at an average speed of ${s} km/h. How far will it travel in ${t} hours?`,
        `${d} km`, numDistractors(d, { step: s }).map((x) => x + ' km'),
        `Step 1: Use **distance = speed × time**. The bus goes ${s} km every hour, for ${t} hours.\n${mulStep('Step 2', s, t)}\nAnswer: ==${d} km==.`);
    }
    return mk(N, 'Distance, Rate, Time', `A car travels ${d} km in ${t} hours. What is its average speed?`,
      `${s} km/h`, numDistractors(s, { step: 5 }).map((x) => x + ' km/h'),
      `Step 1: Use **speed = distance ÷ time**. Share the ${d} km equally over ${t} hours.\n${divStep('Step 2', d, t)}\nAnswer: ==${s} km/h==.\nCheck: ${s} × ${t} = ${d} ✓`);
  },
  function ages() {
    const b = ri(4, 15);
    const k = ri(2, 4);
    const sum = b * (k + 1);
    const [x, y] = shuffle(['Maria', 'Liza', 'Jose', 'Pedro', 'Rosa', 'Mark']);
    return mk(N, 'Age Problem', `${x} is ${k} times as old as ${y}. The sum of their ages is ${sum}. How old is ${x}?`,
      k * b, [b, k * b + k, k * b - k, sum - b + 1, (k + 1) * b - 2],
      `Step 1: Let ${y}'s age = **n**. ${x} is ${k} times as old, so ${x} = **${k}n**.\nStep 2: Add them: n + ${k}n = ${sum}\n= ^^n + ${k}n^^ = ${sum}   (1 n plus ${k} n's)\n= **${k + 1}n = ${sum}**\n${divStep('Step 3: Find one n', sum, k + 1)}\nSo n = **${b}** (this is ${y}).\nStep 4: ${x} = ${k} × ${b} = ==${k * b}==.\nCheck: ${b} + ${k * b} = ${sum} ✓\n!!Trap!!: ${b} is ${y}'s age, not ${x}'s.`);
  },
  function average() {
    const n = 5;
    const avg = ri(70, 95);
    const nums = [];
    let rest = avg * n;
    for (let i = 0; i < n - 1; i++) { const v = avg + ri(-8, 8); nums.push(v); rest -= v; }
    nums.push(rest);
    return mk(N, 'Average', `A student got the following scores: ${nums.join(', ')}. What is the average score?`,
      avg, numDistractors(avg, { step: 2 }),
      `Step 1: Add all the scores, one at a time:\nStart: ${nums.join(' + ')}\n${addLines(nums).join('\n')}\nStep 2: Count the scores: there are **${n}**.\n${divStep('Step 3: Divide the total by 5', avg * n, n)}\nAverage: ==${avg}==.`);
  },
  function consecutive() {
    const n = ri(10, 80);
    const S = 3 * n + 3;
    return mk(N, 'Algebra', `The sum of three consecutive integers is ${S}. What is the largest of the three?`,
      n + 2, [n, n + 1, n + 3, n - 1],
      `Step 1: Consecutive means next to each other, so call them **x, x + 1, x + 2**.\nStep 2: Add them: x + x + 1 + x + 2 = **3x + 3**, so 3x + 3 = ${S}.\nStep 3: Take away 3 from both sides: 3x = ${S} − 3 = **${S - 3}**.\n${divStep('Step 4: Divide both sides by 3', S - 3, 3)}\nSo x = **${n}**.\nStep 5: The numbers are ${n}, ${n + 1}, ${n + 2}. The largest is ==${n + 2}==.\nCheck: ${n} + ${n + 1} + ${n + 2} = ${S} ✓\n!!Trap!!: ${n} is the smallest; the question asks for the largest.`);
  },
  function ratioShare() {
    const a = ri(1, 5), b = ri(a + 1, 8);
    if (gcd(a, b) !== 1) return null;
    const unit = ri(5, 60) * 10;
    const total = (a + b) * unit;
    return mk(N, 'Ratio and Proportion', `${peso(total)} is to be divided between two siblings in the ratio ${a}:${b}. How much is the larger share?`,
      peso(b * unit), [peso(a * unit), peso(total / 2), peso((b + 1) * unit), peso((b - 1) * unit || unit * 3)],
      `Step 1: Add the ratio parts: ${a} + ${b} = **${a + b} parts**.\n${divStep('Step 2: One part', total, a + b)}\nOne part = **${peso(unit)}**.\n${mulStep(`Step 3: The larger share has ${b} parts`, b, unit)}\nLarger share: ==${peso(b * unit)}==.\nCheck: the smaller share is ${a} × ${peso(unit)} = ${peso(a * unit)}, and ${peso(a * unit)} + ${peso(b * unit)} = ${peso(total)} ✓`);
  },
  function proportion() {
    const n1 = ri(2, 6), price = ri(3, 15) * n1, n2 = ri(7, 20);
    const unit = price / n1;
    const ans = unit * n2;
    const item = pick(['notebooks', 'ballpens', 'pencils', 'folders', 'envelopes']);
    return mk(N, 'Ratio and Proportion', `If ${n1} ${item} cost ${peso(price)}, how much will ${n2} ${item} cost?`,
      peso(ans), numDistractors(ans, { step: unit }).map(peso),
      `${divStep('Step 1: Find the price of **one**', price, n1)}\nOne costs **${peso(unit)}**.\n${mulStep(`Step 2: Multiply by how many you want (${n2})`, n2, unit)}\nAnswer: ==${peso(ans)}==.`);
  },
  function linear() {
    const a = ri(2, 9), x = ri(-10, 15), b = ri(-20, 20);
    const c = a * x + b;
    const bs = b >= 0 ? `+ ${b}` : `− ${-b}`;
    const r = c - b;
    return mk(N, 'Algebra', `Solve for x: ${a}x ${bs} = ${c}`,
      x, numDistractors(x, { step: 1, allowNeg: true }).concat([-x, x + 2]),
      `Goal: get **x** alone on one side. The highlighted part is solved on the next line.\nStart: ${a}x ${bs} = ${c}\nStep 1: ${b >= 0 ? `Take away ${b} from` : `Add ${-b} to`} both sides:\n→ ${a}x = ^^${c} ${b >= 0 ? '−' : '+'} ${Math.abs(b)}^^\n→ ${a}x = **${r}**${b >= 0 ? minusHint(c, b) : plusHint(c, -b)}\nStep 2: ${a}x means ${a} × x, so divide both sides by ${a}:\n→ x = ^^${r} ÷ ${a}^^${r < 0 ? '   (negative ÷ positive = negative)' : ''}\n→ x = ==${x}==\nCheck: ${a} × ${neg(x)} ${bs} = ${a * x} ${bs} = ${c} ✓`);
  },
  function fractions() {
    const b = pick([2, 3, 4, 5, 6, 8]), d = pick([3, 4, 5, 6, 8, 10, 12]);
    const a = ri(1, b - 1), c = ri(1, d - 1);
    const op = pick(['+', '−']);
    const L = (b * d) / gcd(b, d), ma = L / b, mc = L / d;
    const raw = op === '+' ? a * ma + c * mc : a * ma - c * mc;
    if (raw <= 0) return null;
    const g = gcd(raw, L), num = raw / g, den = L / g;
    const f = (n, dd) => (dd === 1 ? `${n}` : `${n}/${dd}`);
    const wrong1 = op === '+' ? f(a + c, b + d) : f(Math.abs(a - c) || 1, Math.abs(b - d) || 2);
    const change = (t, bt, m) => (m === 1 ? `${t}/${bt} stays ${t}/${bt}` : `${t}/${bt} = (${t} × ${m})/(${bt} × ${m}) = ${t * m}/${L}`);
    return mk(N, 'Fractions', `Simplify: ${a}/${b} ${op} ${c}/${d}`,
      f(num, den), [wrong1, f(num + 1, den), f(num, den + 1), f(Math.max(1, num - 1), den)],
      `Step 1: Make the bottom numbers the same. The smallest number that both ${b} and ${d} go into is **${L}**.\nStep 2: Change each fraction (multiply the top and the bottom by the same number):\n${change(a, b, ma)}\n${change(c, d, mc)}\nStep 3: ${op === '+' ? 'Add' : 'Subtract'} only the tops; the bottom stays ${L}:\nStart: ${a}/${b} ${op} ${c}/${d}\n= ^^${a * ma}/${L} ${op} ${c * mc}/${L}^^\n= **${raw}/${L}**\n${g > 1 ? `Step 4: Simplify: divide the top and the bottom by ${g}: ${raw} ÷ ${g} = ${num}, ${L} ÷ ${g} = ${den}.\n= ==${f(num, den)}==` : `Step 4: Nothing divides both ${raw} and ${L}, so it is already simple: ==${f(num, den)}==.`}${op === '+' ? `\n!!Trap!!: never add the bottoms (${wrong1} is wrong).` : ''}`);
  },
  function orderOps() {
    const b = ri(2, 9), c = ri(2, 9), e = ri(2, 6), d = e * ri(2, 9), a = ri(5, 40);
    const bc = b * c, de = d / e, ans = a + bc - de;
    return mk(N, 'Basic Operations', `Evaluate: ${a} + ${b} × ${c} − ${d} ÷ ${e}`,
      ans, [((a + b) * c - d) / e, (a + b) * c - de, a + b * (c - de), ans + e].map((v) => fmt(v)),
      `Use **PEMDAS**: × and ÷ first (left to right), then + and − (left to right). The highlighted part is solved on the next line.\nStart: ${a} + ^^${b} × ${c}^^ − ${d} ÷ ${e}   (multiply first)\n= ${a} + ${bc} − ^^${d} ÷ ${e}^^   (then divide)\n= ^^${a} + ${bc}^^ − ${de}   (now add, from the left)\n= ^^${a + bc} − ${de}^^   (then subtract)\n= ==${ans}==\n!!Trap!!: going straight from left to right ((${a} + ${b}) × ${c} − ${d}, then ÷ ${e}) gives ${fmt(((a + b) * c - d) / e)}, which is wrong.`);
  },
  function bracketDivide() {
    // Like a printed answer key: A − [B ÷ C(D + E)]
    const C = ri(2, 5), Q = ri(2, 6), B = C * Q, D = ri(1, 5), E = ri(1, 5), S = D + E, P = Q * S, A = ri(10, 60), ans = A - P;
    const wrong = Number.isInteger(B / (C * S)) ? A - B / (C * S) : A - P + C;
    return mk(N, 'Basic Operations', `Evaluate: ${A} − [${B} ÷ ${C}(${D} + ${E})]`, ans, [wrong, A + P, ans + S, ans - Q, A - B - S],
      `Use **PEMDAS** and work from the **inside out**. The highlighted part is solved on the next line.\nStart: ${A} − [${B} ÷ ${C}(^^${D} + ${E}^^)]   (Parentheses first)\n= ${A} − [^^${B} ÷ ${C}^^ × ${S}]   (${C}(${S}) means ${C} × ${S}; ÷ and × go left to right, so divide first)\n= ${A} − [^^${Q} × ${S}^^]   (then multiply)\n= ^^${A} − ${P}^^   (the bracket is done, now subtract)\n= ==${ans}==${minusHint(A, P)}\n!!Trap!!: do not multiply ${C} × ${S} first. ÷ and × are done from **left to right**.`);
  },
  function bracketAdd() {
    // Like a printed answer key: A − [B + C(D − E)]
    const C = ri(2, 6), E = ri(1, 5), D = E + ri(1, 5), S = D - E, P = C * S, B = ri(1, 9), T = B + P, A = ri(5, 40), ans = A - T;
    return mk(N, 'Basic Operations', `Evaluate: ${A} − [${B} + ${C}(${D} − ${E})]`, ans, [A - (B + C) * S, A + T, ans + B, ans - C, A - B + P],
      `Use **PEMDAS** and work from the **inside out**. The highlighted part is solved on the next line.\nStart: ${A} − [${B} + ${C}(^^${D} − ${E}^^)]   (Parentheses first)\n= ${A} − [${B} + ^^${C} × ${S}^^]   (${C}(${S}) means ${C} × ${S}; multiply before adding)\n= ${A} − [^^${B} + ${P}^^]   (then add inside the bracket)\n= ^^${A} − ${T}^^   (the bracket is done, now subtract)\n= ==${ans}==${minusHint(A, T)}\n!!Trap!!: do not add ${B} + ${C} first. Multiply before you add.`);
  },
  function profit() {
    const cost = ri(4, 40) * 50;
    const p = pick([10, 20, 25, 30, 40, 50]);
    const sell = cost + (cost * p) / 100, gain = sell - cost;
    if (!Number.isInteger(gain)) return null;
    return mk(N, 'Percentage', `A store owner bought an item for ${peso(cost)} and sold it for ${peso(sell)}. What is the percent profit based on cost?`,
      p + '%', numDistractors(p, { step: 5 }).map((x) => x + '%'),
      `Step 1: Profit = selling price − cost = ${peso(sell)} − ${peso(cost)} = **${peso(gain)}**.\nStep 2: Percent profit = profit ÷ cost × 100. Multiply the profit by 100 first (add 2 zeros): ${fmt(gain)} × 100 = **${fmt(gain * 100)}**.\n${divStep('Step 3: Divide by the **cost**', gain * 100, cost)}\nPercent profit: ==${p}%==.\n!!Trap!!: divide by the cost (what the owner paid), not by the selling price.`);
  },
  function decimals() {
    const ia = ri(11, 99), ib = ri(11, 49), a = ia / 10, b = ib / 10;
    const ans = Number((a * b).toFixed(2));
    return mk(N, 'Decimals', `What is ${a} × ${b}?`,
      fmt(ans), [fmt(Number((a * b * 10).toFixed(1))), fmt(Number((a + b).toFixed(2))), fmt(Number((ans + 0.1).toFixed(2))), fmt(Number((ans / 10).toFixed(3)))],
      `${mulStep('Step 1: Forget the dots and multiply like whole numbers', ia, ib)}\nStep 2: Count the decimal places: ${a} has 1 and ${b} has 1, so **2 places** in all.\nStep 3: Put the dot 2 places from the right: ${fmt(ia * ib)} → ${(ia * ib / 100).toFixed(2)}${(ia * ib / 100).toFixed(2) === fmt(ans) ? '' : ` = ${fmt(ans)}`}.\nAnswer: ==${fmt(ans)}==`);
  },
  function numberSeriesN() { return series(N); },
  function wordProblemCoins() {
    const total = ri(10, 30);
    const fives = ri(2, total - 2);
    const tens = total - fives;
    const amount = fives * 5 + tens * 10;
    return mk(N, 'Word Problem', `Juan has ${total} coins consisting of ₱5 and ₱10 coins. Their total value is ${peso(amount)}. How many ₱10 coins does he have?`,
      tens, [fives, tens + 1, tens - 1, Math.round(total / 2) === tens ? tens + 2 : Math.round(total / 2)],
      `Step 1: Pretend ALL ${total} coins are ₱5 coins: ${total} × ₱5 = **${peso(5 * total)}**.\nStep 2: But he has ${peso(amount)}. The extra money: ${peso(amount)} − ${peso(5 * total)} = **${peso(amount - 5 * total)}**.\n${divStep('Step 3: Each ₱10 coin is ₱5 more than a ₱5 coin, so count how many ₱5 are in the extra', amount - 5 * total, 5)}\nSo there are ==${tens}== ₱10 coins.\nCheck: ${tens} × ₱10 + ${fives} × ₱5 = ${peso(tens * 10)} + ${peso(fives * 5)} = ${peso(amount)} ✓`);
  },
  function areaPerimeter() {
    const l = ri(5, 30), w = ri(3, l);
    if (Math.random() < 0.5) {
      return mk(N, 'Geometry', `A rectangular lot is ${l} m long and ${w} m wide. What is its area?`,
        `${l * w} sq m`, [`${2 * (l + w)} sq m`, `${l * w + l} sq m`, `${l * w - w} sq m`, `${(l + w) * 2 + 10} sq m`],
        `Area is the space **inside** the lot: area = length × width.\n${mulStep('Step 1', l, w)}\nArea: ==${l * w} sq m==.\n!!Trap!!: ${2 * (l + w)} is the perimeter (the edge), not the area.`);
    }
    return mk(N, 'Geometry', `How many meters of fencing are needed to enclose a rectangular garden ${l} m long and ${w} m wide?`,
      `${2 * (l + w)} m`, [`${l * w} m`, `${l + w} m`, `${2 * (l + w) + 4} m`, `${2 * l + w} m`],
      `A fence goes **around** the edge, so we need the **perimeter**.\nStep 1: One length + one width: ${l} + ${w} = **${l + w}**.\n${mulStep('Step 2: A rectangle has 2 lengths and 2 widths, so double it', 2, l + w)}\nFence: ==${2 * (l + w)} m==.\n!!Trap!!: ${l * w} is the area (the inside), not the fence.`);
  },
];

/* ----------------------------- SERIES (shared) ----------------------------- */
function series(subject) {
  const type = ri(0, 5);
  let seq, next, rule;
  if (type === 0) {
    const a = ri(1, 30), d = ri(2, 12);
    seq = Array.from({ length: 5 }, (_, i) => a + i * d); next = a + 5 * d; rule = `The rule: **add ${d}** each time.\n${a + 4 * d} + ${d} = ==${next}==`;
  } else if (type === 1) {
    const a = ri(1, 5), r = ri(2, 3);
    seq = Array.from({ length: 5 }, (_, i) => a * r ** i); next = a * r ** 5; rule = `The rule: **multiply by ${r}** each time (${seq[0]} × ${r} = ${seq[1]}, ${seq[1]} × ${r} = ${seq[2]} ...).\n${seq[4]} × ${r} = ==${next}==`;
  } else if (type === 2) {
    const s = ri(1, 6);
    seq = Array.from({ length: 5 }, (_, i) => (s + i) ** 2); next = (s + 5) ** 2; rule = `These are **square numbers**: ${s} × ${s} = ${s * s}, ${s + 1} × ${s + 1} = ${(s + 1) ** 2}, ${s + 2} × ${s + 2} = ${(s + 2) ** 2} ...\nNext: ${s + 5} × ${s + 5} = ==${next}==`;
  } else if (type === 3) {
    const a = ri(1, 10), d = ri(1, 3);
    seq = [a]; let inc = d;
    for (let i = 1; i < 5; i++) { seq.push(seq[i - 1] + inc); inc += d; }
    next = seq[4] + inc; rule = `The gap **grows by ${d}** each time: +${d}, +${2 * d}, +${3 * d}, +${4 * d}, so the next gap is **+${inc}**.\n${seq[4]} + ${inc} = ==${next}==`;
  } else if (type === 4) {
    const a = ri(2, 10), b = ri(2, 10);
    seq = [a, b]; for (let i = 2; i < 6; i++) seq.push(seq[i - 1] + seq[i - 2]);
    next = seq[5]; seq = seq.slice(0, 5); rule = `Each number is the **sum of the two before it** (${seq[0]} + ${seq[1]} = ${seq[2]}, ${seq[1]} + ${seq[2]} = ${seq[3]} ...).\n${seq[3]} + ${seq[4]} = ==${next}==`;
  } else {
    const a = ri(20, 60), x = ri(2, 6), y = ri(1, 4);
    seq = [a]; for (let i = 1; i < 6; i++) seq.push(i % 2 ? seq[i - 1] + x : seq[i - 1] - y);
    next = seq[5]; seq = seq.slice(0, 5); rule = `Two steps take turns: **+${x}, then −${y}**, then +${x}, −${y} again.\nThe last step was −${y}, so now it is +${x}: ${seq[4]} + ${x} = ==${next}==`;
  }
  return mk(subject, 'Number Series', `What is the next number in the series? ${seq.join(', ')}, ___`,
    next, numDistractors(next, { step: Math.max(1, Math.abs(seq[4] - seq[3])) }),
    `Look at the gaps: ${seq.slice(1).map((v, i) => (v - seq[i] >= 0 ? '+' : '−') + Math.abs(v - seq[i])).join(', ')}.\n${rule}`);
}

/* ----------------------------- ANALYTICAL ----------------------------- */
const A = 'analytical';
const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const shiftWord = (w, k) => w.split('').map((ch) => L[(L.indexOf(ch) + k + 26) % 26]).join('');
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DIRS = ['North', 'East', 'South', 'West'];
const GROUPS = ['teachers', 'singers', 'dancers', 'writers', 'farmers', 'engineers', 'runners', 'painters', 'nurses', 'drivers', 'lawyers', 'cooks'];

const analytical = [
  function numberSeriesA() { return series(A); },
  function letterSeries() {
    const k = ri(1, 4), s = ri(0, 26 - 6 * k - 1);
    if (s < 0) return null;
    const seq = Array.from({ length: 5 }, (_, i) => L[s + i * k]);
    const next = L[s + 5 * k];
    return mk(A, 'Letter Series', `What letter comes next? ${seq.join(', ')}, ___`,
      next, [L[(s + 5 * k + 1) % 26], L[(s + 5 * k - 1 + 26) % 26], L[(s + 5 * k + k + 1) % 26], L[(s + 4 * k + 1) % 26]],
      `Turn the letters into numbers (A=1, B=2, C=3 ...): ${seq.map((c) => `${c}=${L.indexOf(c) + 1}`).join(', ')}.\nEach jump is **+${k}**.\n${seq[4]} (${s + 4 * k + 1}) + ${k} = ${s + 5 * k + 1}, and letter ${s + 5 * k + 1} is ==${next}==.`);
  },
  function letterPairs() {
    const s = ri(0, 8);
    const seq = Array.from({ length: 4 }, (_, i) => L[s + i] + L[25 - s - i]);
    const next = L[s + 4] + L[25 - s - 4];
    return mk(A, 'Letter Series', `What comes next? ${seq.join(', ')}, ___`,
      next, [L[s + 4] + L[25 - s - 5], L[s + 5] + L[25 - s - 4], L[25 - s - 4] + L[s + 4], L[s + 3] + L[25 - s - 3]],
      `Look at each side by itself.\nFirst letters: ${seq.map((x) => x[0]).join(', ')} → one step **forward** → next is **${L[s + 4]}**.\nSecond letters: ${seq.map((x) => x[1]).join(', ')} → one step **backward** → next is **${L[25 - s - 4]}**.\nPut them together: ==${next}==.`);
  },
  function coding() {
    const words = ['CAT', 'DOG', 'BOOK', 'DESK', 'LAMP', 'FISH', 'BIRD', 'TREE', 'SHIP', 'GOLD', 'RICE', 'MILK', 'PARK', 'WIND'];
    const [w1, w2] = shuffle(words);
    const k = pick([1, 2, 3, -1, -2]);
    const ans = shiftWord(w2, k);
    return mk(A, 'Coding-Decoding', `If ${w1} is coded as ${shiftWord(w1, k)}, how is ${w2} coded?`,
      ans, [shiftWord(w2, k + 1), shiftWord(w2, k - 1), shiftWord(w2, -k), ans.split('').reverse().join('')],
      `Step 1: Compare ${w1} with its code ${shiftWord(w1, k)} letter by letter: ${w1.split('').map((c, i) => `${c}→${shiftWord(w1, k)[i]}`).join(', ')}.\nEach letter moves **${Math.abs(k)} step${Math.abs(k) > 1 ? 's' : ''} ${k > 0 ? 'forward' : 'backward'}** in the alphabet.\nStep 2: Do the same to ${w2}: ${w2.split('').map((c, i) => `${c}→${ans[i]}`).join(', ')}.\nAnswer: ==${ans}==`);
  },
  function syllogism() {
    const [X, Y, Z] = shuffle(GROUPS);
    const t = ri(0, 3);
    const T = [
      [`All ${X} are ${Y}. All ${Y} are ${Z}.`, `All ${X} are ${Z}.`, [`All ${Z} are ${X}.`, `No ${X} are ${Z}.`, `All ${Z} are ${Y}.`],
        `Draw circles: the **${X}** circle is inside the **${Y}** circle, and the ${Y} circle is inside the **${Z}** circle.\nSo every ${X} is also inside ${Z}: ==All ${X} are ${Z}.==\n!!Trap!!: "All ${Z} are ${X}" flips it around. "All" cannot be flipped.`],
      [`All ${X} are ${Y}. No ${Y} are ${Z}.`, `No ${X} are ${Z}.`, [`All ${Z} are ${X}.`, `Some ${X} are ${Z}.`, `All ${Z} are ${Y}.`],
        `Draw circles: the **${X}** circle is inside **${Y}**, and ${Y} and **${Z}** never touch.\nSince the ${X} circle is inside ${Y}, it can never touch ${Z}: ==No ${X} are ${Z}.==`],
      [`Some ${X} are ${Y}. All ${Y} are ${Z}.`, `Some ${X} are ${Z}.`, [`All ${X} are ${Z}.`, `All ${Z} are ${X}.`, `No ${X} are ${Z}.`],
        `Draw circles: **some** ${X} are inside ${Y}, and all of ${Y} is inside **${Z}**.\nSo those ${X} are inside ${Z} too: ==Some ${X} are ${Z}.==\n!!Trap!!: we only know about SOME ${X}, so "All ${X} are ${Z}" is too much.`],
      [`No ${X} are ${Y}. All ${Z} are ${Y}.`, `No ${Z} are ${X}.`, [`All ${X} are ${Z}.`, `Some ${Z} are ${X}.`, `All ${Y} are ${Z}.`],
        `Draw circles: the **${Z}** circle is inside **${Y}**, and ${X} and ${Y} never touch.\nSince the ${Z} circle is inside ${Y}, it can never touch ${X}: ==No ${Z} are ${X}.==`],
    ][t];
    return mk(A, 'Logic (Syllogism)', `${T[0]} Which conclusion necessarily follows?`, T[1], T[2], T[3]);
  },
  function direction() {
    const d = ri(0, 3), a = ri(2, 9), b = ri(2, 9);
    const name = pick(['Rico', 'Lea', 'Tess', 'Arnel', 'Joy']);
    const turn = pick(['right', 'left']);
    const fin = DIRS[(d + (turn === 'right' ? 1 : 3)) % 4];
    return mk(A, 'Directions', `${name} walked ${a} km ${DIRS[d]}, turned ${turn} and walked ${b} km, then turned ${turn} again and walked ${a} km. In which direction is ${name} now from the starting point?`,
      fin, DIRS.filter((x) => x !== fin),
      `Draw it! Put a dot for the start.\nStep 1: Walk ${a} km **${DIRS[d]}**.\nStep 2: Turn ${turn} → now facing **${fin}**. Walk ${b} km.\nStep 3: Turn ${turn} again → now facing **${DIRS[(d + 2) % 4]}** (the opposite way). Walk ${a} km back.\nThe ${a} km ${DIRS[d]} and the ${a} km back **cancel out**.\nOnly the ${b} km ${fin} is left, so ${name} is ==${fin}== of the start.`);
  },
  function ranking() {
    const n = ri(15, 50), k = ri(3, n - 3);
    return mk(A, 'Ranking', `In a row of ${n} students, Carla is ${ord(k)} from the left. What is her position from the right?`,
      n - k + 1, [n - k, n - k + 2, k, n - k - 1],
      `Picture the row. Carla is number ${k} from the left.\nStep 1: Students to her right: ${n} − ${k} = **${n - k}**.\nStep 2: Add Carla herself: ${n - k} + 1 = ==${n - k + 1}==.\nFormula: total − left position + 1.\n!!Trap!!: ${n - k} forgets to count Carla.`);
  },
  function calendar() {
    const t = ri(0, 6), n = ri(10, 100);
    const ans = DAYS[(t + n) % 7];
    return mk(A, 'Calendar', `If today is ${DAYS[t]}, what day of the week will it be ${n} days from today?`,
      ans, shuffle(DAYS.filter((x) => x !== ans)),
      `Every **7 days** it is the same day again.\nStep 1: How many full weeks are in ${n} days? 7 × ${Math.floor(n / 7)} = ${7 * Math.floor(n / 7)}, so **${Math.floor(n / 7)} weeks**.\nLeft over: ${n} − ${7 * Math.floor(n / 7)} = **${n % 7}** day${n % 7 === 1 ? '' : 's'}.\nStep 2: The ${Math.floor(n / 7)} full weeks bring us back to ${DAYS[t]}.\n${n % 7 ? `Step 3: Move ${n % 7} more day${n % 7 > 1 ? 's' : ''}: ${Array.from({ length: n % 7 }, (_, i) => DAYS[(t + i + 1) % 7]).join(' → ')}.\nAnswer: ==${ans}==` : `Step 3: No extra days, so it is still ==${ans}==.`}`);
  },
  function dataInterp() {
    const months = ['January', 'February', 'March', 'April', 'May'];
    const vals = months.map(() => ri(10, 60) * 5);
    const table = months.map((m, i) => `${m}: ${vals[i]}`).join('; ');
    if (Math.random() < 0.5) {
      const total = vals.reduce((x, y) => x + y, 0);
      return mk(A, 'Data Interpretation', `A store recorded the following number of units sold — ${table}. What is the total number of units sold in the five months?`,
        total, numDistractors(total, { step: 10 }),
        `Add the five months one at a time:\n${vals.slice(1).map((v, i) => `${vals.slice(0, i + 1).reduce((x, y) => x + y, 0)} + ${v} = ${vals.slice(0, i + 2).reduce((x, y) => x + y, 0)}`).join('\n')}\nTotal: ==${total}== units.`);
    }
    let best = 1;
    for (let i = 2; i < 5; i++) if (vals[i] - vals[i - 1] > vals[best] - vals[best - 1]) best = i;
    const inc = vals[best] - vals[best - 1];
    if (inc <= 0 || vals.filter((v, i) => i > 0 && v - vals[i - 1] === inc).length > 1) return null;
    const ans = `${months[best - 1]} to ${months[best]}`;
    const others = [1, 2, 3, 4].filter((i) => i !== best).map((i) => `${months[i - 1]} to ${months[i]}`);
    return mk(A, 'Data Interpretation', `A store recorded the following number of units sold — ${table}. Between which two consecutive months was the greatest increase in sales?`,
      ans, others, `Find the change between each pair of months (later − earlier):\n${[1, 2, 3, 4].map((i) => `${months[i - 1]} → ${months[i]}: ${vals[i]} − ${vals[i - 1]} = ${vals[i] - vals[i - 1]}`).join('\n')}\nThe biggest increase is **+${inc}**: ==${ans}==.`);
  },
  function oddNumber() {
    const r = ri(2, 9);
    const mult = shuffle(Array.from({ length: 12 }, (_, i) => r * (i + 2))).slice(0, 3);
    let odd;
    do { odd = ri(10, 99); } while (odd % r === 0);
    // Make sure no other simple rule (even numbers, the 3 times table …) picks out a different number.
    const all = [...mult, odd];
    for (let k = 2; k <= 12; k++) {
      const out = all.filter((v) => v % k !== 0);
      if (out.length === 1 && out[0] !== odd) return null;
    }
    return mk(A, 'Classification', `Which number does NOT belong to the group?`,
      odd, mult, `Check the **${r} times table**: ${mult.map((m) => `${m} = ${r} × ${m / r}`).join(', ')}.\n${odd} ÷ ${r} is not a whole number, so ==${odd}== does not belong.`);
  },
];

/* ----------------------------- CLERICAL ----------------------------- */
const C = 'clerical';
const SURNAMES = ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza', 'Torres', 'Tomas', 'Andrada', 'Castillo', 'Flores', 'Villanueva', 'Ramos', 'Castro', 'Rivera', 'Aquino', 'Navarro', 'Salazar', 'Mercado', 'Dela Cruz', 'De Leon', 'Del Rosario', 'Pascual', 'Panganiban', 'Pangilinan', 'Manalo', 'Macaraeg', 'Magsaysay', 'Mabini', 'Dizon', 'Domingo', 'Soriano', 'Sarmiento'];
const FIRST = ['Juan', 'Maria', 'Jose', 'Ana', 'Pedro', 'Rosa', 'Carlo', 'Liza', 'Mark', 'Grace', 'Paolo', 'Joy', 'Ramon', 'Teresa', 'Miguel', 'Carmen'];
const STREETS = ['Rizal St.', 'Mabini Ave.', 'Bonifacio Rd.', 'Luna St.', 'Quezon Blvd.', 'Aguinaldo Hwy.', 'Burgos St.', 'Del Pilar St.'];
const CITIES = ['Quezon City', 'Pasig City', 'Cebu City', 'Davao City', 'Iloilo City', 'Baguio City', 'Makati City', 'Tacloban City'];
const filingKey = (s) => s.replace(/[\s.,]/g, '').toUpperCase();
// For "exactly the same" items: show the letter that changed in each wrong choice.
const showDiffs = (ref, list) => list.map((v) => {
  let i = 0;
  while (i < ref.length && ref[i] === v[i]) i++;
  return `"${v}" → !!${v[i] ?? ''}!! should be **${ref[i] ?? ''}**`;
}).join('\n');

function mutate(s) {
  const i = ri(0, s.length - 1);
  const ch = s[i];
  if (/\d/.test(ch)) return s.slice(0, i) + String((+ch + ri(1, 8)) % 10) + s.slice(i + 1);
  if (/[a-z]/i.test(ch)) {
    const sw = { a: 'e', e: 'a', i: 'l', l: 'i', o: 'a', n: 'm', m: 'n', u: 'o', r: 'n', s: 'z', c: 'k', t: 'f' };
    const low = ch.toLowerCase();
    const rep = sw[low] || 'x';
    return s.slice(0, i) + (ch === low ? rep : rep.toUpperCase()) + s.slice(i + 1);
  }
  return null;
}
function variants(s, n) {
  const out = new Set();
  let guard = 0;
  while (out.size < n && guard++ < 100) {
    const v = mutate(s);
    if (v && v !== s) out.add(v);
  }
  return [...out];
}

const SPELL = ['accommodate', 'acknowledgment', 'apparent', 'argument', 'beginning', 'believe', 'bureaucracy', 'calendar', 'cemetery', 'colleague', 'commitment', 'committee', 'conscientious', 'consensus', 'definitely', 'dilemma', 'discipline', 'embarrass', 'environment', 'exaggerate', 'existence', 'familiar', 'foreign', 'government', 'grammar', 'guarantee', 'harass', 'immediately', 'independent', 'indispensable', 'liaison', 'maintenance', 'millennium', 'miniature', 'mischievous', 'necessary', 'noticeable', 'occasion', 'occurrence', 'parliament', 'perseverance', 'personnel', 'possession', 'privilege', 'pronunciation', 'questionnaire', 'receive', 'recommend', 'referred', 'reminiscent', 'rhythm', 'separate', 'sergeant', 'succeed', 'supersede', 'threshold', 'tomorrow', 'transferred', 'unanimous', 'vacuum', 'withhold'];
function misspell(w) {
  const rules = [
    (s) => s.replace(/(.)\1/, '$1'),
    (s) => { const m = s.match(/[bcdfglmnprst](?=[aeiou])/g); if (!m) return s; const i = s.search(/[bcdfglmnprst](?=[aeiou])/); return s.slice(0, i + 1) + s[i] + s.slice(i + 1); },
    (s) => s.replace('ie', 'ei') !== s ? s.replace('ie', 'ei') : s.replace('ei', 'ie'),
    (s) => { const i = ri(1, s.length - 2); const v = 'aeiou'; if (!v.includes(s[i])) return s; return s.slice(0, i) + v[(v.indexOf(s[i]) + ri(1, 4)) % 5] + s.slice(i + 1); },
    (s) => { const i = ri(1, s.length - 3); return s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2); },
    (s) => s.replace(/ance$/, 'ence').replace(/ence$/, 'ance').replace(/ary$/, 'ery').replace(/able$/, 'ible'),
  ];
  const out = new Set();
  let g = 0;
  while (out.size < 3 && g++ < 200) {
    const v = pick(rules)(w);
    if (v !== w && !SPELL.includes(v)) out.add(v);
  }
  return [...out];
}

const clerical = [
  function alphaFirst() {
    const names = shuffle(SURNAMES).slice(0, 4).map((s) => `${s}, ${pick(FIRST)}`);
    const sorted = names.slice().sort((a, b) => filingKey(a).localeCompare(filingKey(b)));
    const which = pick([['FIRST', 0], ['SECOND', 1], ['THIRD', 2], ['LAST', 3]]);
    return mk(C, 'Alphabetical Filing', `If the following names are arranged in alphabetical order, which name will come ${which[0]}?`,
      sorted[which[1]], sorted.filter((_, i) => i !== which[1]),
      `Put the surnames in A–Z order, letter by letter:\n${sorted.map((x, i) => `${i + 1}. ${i === which[1] ? `==${x}==` : x}`).join('\n')}\nThe ${which[0].toLowerCase()} one is ==${sorted[which[1]]}==.${sorted.some((x) => /^De/.test(x)) ? '\nRemember: "De", "Dela", "Del" are read as one word (Dela Cruz → DELACRUZ).' : ''}`);
  },
  function sameName() {
    const s = `${pick(FIRST)} ${pick('ABCDEFGHMPRST'.split(''))}. ${pick(SURNAMES)}`;
    const v = variants(s, 3);
    return mk(C, 'Checking Names', `Which of the following is EXACTLY the same as: "${s}"?`, s, v,
      `Compare each choice with "${s}" **one letter at a time**.\nThe wrong ones each have one small change:\n${showDiffs(s, v)}\nOnly ==${s}== matches exactly.`);
  },
  function sameAddress() {
    const s = `${ri(10, 2999)} ${pick(STREETS)}, ${pick(CITIES)}`;
    const v = variants(s, 3);
    return mk(C, 'Checking Addresses', `Which of the following is EXACTLY the same as: "${s}"?`, s, v,
      `Check the **numbers** first, then each word, letter by letter.\nThe wrong ones each have one small change:\n${showDiffs(s, v)}\nOnly ==${s}== matches exactly.`);
  },
  function sameNumber() {
    const s = `${ri(100, 999)}-${ri(1000, 9999)}-${ri(10, 99)}`;
    const v = variants(s, 3);
    return mk(C, 'Checking Numbers', `Which of the following is EXACTLY the same as the reference number ${s}?`, s, v,
      `Compare one group of digits at a time (${s.split('-').join(' | ')}).\nThe wrong ones each have one digit changed:\n${showDiffs(s, v)}\nOnly ==${s}== is the same.`);
  },
  function spelling() {
    const w = pick(SPELL);
    const v = misspell(w);
    return mk(C, 'Spelling', 'Which word is spelled correctly?', w, v,
      `The correct spelling is ==${w}==.\nThe others have a letter missing, added, or swapped: ${v.map((x) => `!!${x}!!`).join(', ')}.`);
  },
  function ascending() {
    const nums = shuffle(Array.from({ length: 4 }, () => ri(1000, 9999)));
    if (new Set(nums).size < 4) return null;
    const asc = nums.slice().sort((a, b) => a - b);
    const opts = [asc, nums, [asc[1], asc[0], asc[2], asc[3]], [asc[0], asc[2], asc[1], asc[3]], asc.slice().reverse()].map((x) => x.join(', '));
    return mk(C, 'Numerical Filing', `Arrange these numbers from lowest to highest: ${nums.join(', ')}`,
      opts[0], opts.slice(1), `All have 4 digits, so compare the **first digit** (thousands); if it is the same, look at the next digit.\nLowest to highest: ==${opts[0]}==.\n!!Trap!!: do not go from highest to lowest (backwards).`);
  },
  function countMatch() {
    const pool = shuffle(SURNAMES).slice(0, 5);
    const ref = pool.map((s) => s.toUpperCase());
    const copy = ref.map((s) => (Math.random() < 0.45 ? (variants(s, 1)[0] || s) : s));
    const diff = ref.filter((s, i) => s !== copy[i]).length;
    return mk(C, 'Checking Lists', `Compare the two lists. How many pairs are NOT exactly the same?\nList A: ${ref.join(' | ')}\nList B: ${copy.join(' | ')}`,
      diff, [0, 1, 2, 3, 4, 5].filter((x) => x !== diff),
      `Check each pair, letter by letter:\n${ref.map((r, i) => (r === copy[i] ? `${r} = ${copy[i]} ✓ same` : `${r} ≠ !!${copy[i]}!! ✗ different`)).join('\n')}\nPairs that are NOT the same: ==${diff}==.`);
  },
  function filingBetween() {
    const names = shuffle(SURNAMES).slice(0, 6).sort((a, b) => filingKey(a).localeCompare(filingKey(b)));
    const [lo, mid, hi] = [names[0], names[2], names[4]];
    const outside = [names[5], names[3] === mid ? names[5] : names[3]];
    const before = SURNAMES.filter((s) => filingKey(s) < filingKey(lo));
    const after = SURNAMES.filter((s) => filingKey(s) > filingKey(hi));
    const ds = shuffle([...before.slice(0, 2), ...after.slice(-2)]);
    if (ds.length < 3) return null;
    return mk(C, 'Alphabetical Filing', `In an alphabetical file, which surname should be placed between "${lo}" and "${hi}"?`,
      mid, ds.concat(outside.filter((x) => filingKey(x) > filingKey(hi))),
      `Put them in A–Z order (compare letter by letter):\n${lo} → ==${mid}== → ${hi}\nSo ==${mid}== goes between them. The other choices come before "${lo}" or after "${hi}".`);
  },
];

/* ----------------------------- VERBAL (word lists) ----------------------------- */
const V = 'verbal';
// [word, synonym, antonym]
const VOCAB = [
  ['abundant', 'plentiful', 'scarce'], ['adamant', 'unyielding', 'flexible'], ['affluent', 'wealthy', 'poor'], ['amiable', 'friendly', 'hostile'],
  ['ambiguous', 'unclear', 'explicit'], ['arduous', 'difficult', 'easy'], ['audacious', 'bold', 'timid'], ['benevolent', 'kind', 'malicious'],
  ['candid', 'frank', 'evasive'], ['cautious', 'careful', 'reckless'], ['concise', 'brief', 'wordy'], ['diligent', 'hardworking', 'lazy'],
  ['diminish', 'decrease', 'increase'], ['eloquent', 'articulate', 'inarticulate'], ['emulate', 'imitate', 'ignore'], ['enormous', 'huge', 'tiny'],
  ['ephemeral', 'short-lived', 'permanent'], ['frugal', 'thrifty', 'wasteful'], ['futile', 'useless', 'effective'], ['gregarious', 'sociable', 'reserved'],
  ['hasten', 'hurry', 'delay'], ['hostile', 'unfriendly', 'cordial'], ['humble', 'modest', 'arrogant'], ['impartial', 'unbiased', 'prejudiced'],
  ['inevitable', 'unavoidable', 'avoidable'], ['jovial', 'cheerful', 'gloomy'], ['lethargic', 'sluggish', 'energetic'], ['lucid', 'clear', 'confusing'],
  ['meticulous', 'thorough', 'careless'], ['mitigate', 'lessen', 'aggravate'], ['novice', 'beginner', 'expert'], ['obsolete', 'outdated', 'modern'],
  ['opulent', 'luxurious', 'plain'], ['pacify', 'calm', 'provoke'], ['prudent', 'wise', 'foolish'], ['reluctant', 'unwilling', 'eager'],
  ['resilient', 'tough', 'fragile'], ['scrutinize', 'examine', 'overlook'], ['serene', 'peaceful', 'agitated'], ['tedious', 'boring', 'exciting'],
  ['tenacious', 'persistent', 'yielding'], ['transparent', 'clear', 'opaque'], ['trivial', 'unimportant', 'significant'], ['vague', 'indistinct', 'definite'],
  ['verbose', 'wordy', 'succinct'], ['vigilant', 'watchful', 'negligent'], ['zealous', 'enthusiastic', 'apathetic'], ['abate', 'subside', 'intensify'],
  ['benign', 'harmless', 'harmful'], ['commence', 'begin', 'conclude'], ['conceal', 'hide', 'reveal'], ['deteriorate', 'worsen', 'improve'],
  ['elated', 'overjoyed', 'dejected'], ['feasible', 'possible', 'impractical'], ['fortify', 'strengthen', 'weaken'], ['gullible', 'naive', 'skeptical'],
  ['hinder', 'obstruct', 'facilitate'], ['immaculate', 'spotless', 'dirty'], ['indolent', 'idle', 'industrious'], ['lenient', 'tolerant', 'strict'],
  ['magnanimous', 'generous', 'petty'], ['negligible', 'insignificant', 'considerable'], ['obstinate', 'stubborn', 'compliant'], ['placid', 'tranquil', 'turbulent'],
  ['prolific', 'productive', 'unproductive'], ['rejuvenate', 'refresh', 'exhaust'], ['sincere', 'genuine', 'insincere'], ['sparse', 'thin', 'dense'],
  ['tranquil', 'quiet', 'chaotic'], ['vindicate', 'clear', 'accuse'], ['wane', 'decline', 'wax'], ['zenith', 'peak', 'nadir'],
  ['alleviate', 'relieve', 'worsen'], ['animosity', 'hatred', 'goodwill'], ['brevity', 'shortness', 'lengthiness'], ['cordial', 'warm', 'cold'],
  ['dearth', 'lack', 'abundance'], ['exonerate', 'acquit', 'convict'], ['fervent', 'passionate', 'indifferent'], ['impede', 'block', 'assist'],
];
// [salita, kasingkahulugan, kasalungat]
const SALITA = [
  ['marilag', 'maganda', 'pangit'], ['masigasig', 'masipag', 'tamad'], ['mapagkumbaba', 'mababang-loob', 'mayabang'], ['matayog', 'mataas', 'mababa'],
  ['maalwan', 'maginhawa', 'mahirap'], ['dalisay', 'wagas', 'marumi'], ['mahinahon', 'kalmado', 'magagalitin'], ['mapanglaw', 'malungkot', 'masaya'],
  ['matapat', 'tapat', 'taksil'], ['maramot', 'kuripot', 'mapagbigay'], ['marahas', 'mabangis', 'mahinhin'], ['malawak', 'malapad', 'makitid'],
  ['payak', 'simple', 'masalimuot'], ['bantog', 'tanyag', 'di-kilala'], ['pagal', 'pagod', 'masigla'], ['pighati', 'dalamhati', 'galak'],
  ['hikahos', 'mahirap', 'mayaman'], ['mabagal', 'makupad', 'mabilis'], ['maagap', 'maaga', 'huli'], ['matimtiman', 'mahinhin', 'magaslaw'],
  ['dukha', 'maralita', 'maykaya'], ['masaklap', 'mapait', 'matamis'], ['malamlam', 'madilim', 'maliwanag'], ['palalo', 'hambog', 'mapagpakumbaba'],
  ['taimtim', 'taos-puso', 'pakitang-tao'], ['maluwag', 'malapad', 'masikip'], ['tuso', 'mapanlinlang', 'tapat'], ['matiwasay', 'payapa', 'magulo'],
  ['salat', 'kapos', 'sagana'], ['ligaya', 'saya', 'lungkot'],
];

// Words whose meanings are close. A word from the same family is never used as a wrong choice, because it
// could also be right (e.g. DIMINISH: "decrease" is the answer, so "lessen" must not be a wrong choice).
const FAMILY = [
  ['serene', 'tranquil', 'placid', 'pacify'], ['diminish', 'abate', 'mitigate', 'alleviate', 'wane'], ['hinder', 'impede'],
  ['adamant', 'obstinate', 'tenacious'], ['benevolent', 'magnanimous', 'amiable', 'cordial', 'gregarious', 'hostile'],
  ['jovial', 'elated', 'zealous', 'fervent', 'reluctant'], ['lethargic', 'indolent', 'diligent', 'prolific'],
  ['ambiguous', 'vague', 'lucid', 'transparent'], ['cautious', 'meticulous', 'vigilant', 'prudent'], ['candid', 'sincere'],
  ['ephemeral', 'brevity', 'concise', 'verbose'], ['trivial', 'negligible'], ['exonerate', 'vindicate'], ['emulate', 'scrutinize'],
  ['affluent', 'opulent'], ['abundant', 'dearth', 'sparse'], ['rejuvenate', 'fortify', 'deteriorate'], ['arduous', 'tedious', 'futile'],
  ['hikahos', 'dukha', 'salat', 'maalwan'], ['malawak', 'maluwag'], ['mapanglaw', 'pighati', 'ligaya', 'malamlam'], ['mapagkumbaba', 'palalo'],
  ['matapat', 'tuso', 'taimtim', 'dalisay'], ['mahinahon', 'matiwasay', 'matimtiman', 'marahas'], ['masigasig', 'pagal', 'mabagal', 'maagap'],
];
const FAM = new Map(FAMILY.flatMap((f, i) => f.map((w) => [w, i])));
const sameFamily = (a, b) => a === b || (FAM.has(a) && FAM.get(a) === FAM.get(b));
// Other entries of a word list that are safe as wrong choices for word w.
const others = (list, w) => shuffle(list.filter((x) => !sameFamily(x[0], w)));

const verbalGen = [
  function synonym() {
    const [w, syn] = pick(VOCAB);
    const ds = others(VOCAB, w).filter((x) => x[1] !== syn).slice(0, 3).map((x) => x[1]);
    return mk(V, 'Vocabulary (Synonym)', `Choose the word closest in meaning to: ${w.toUpperCase()}`, syn, ds,
      `**${w.toUpperCase()}** means **${syn}**.\nSo the word closest in meaning is ==${syn}==.\nTip: put each choice in place of the word in a sentence and see which keeps the same meaning.`);
  },
  function antonym() {
    const [w, syn, ant] = pick(VOCAB);
    const ds = others(VOCAB, w).filter((x) => x[2] !== ant).slice(0, 3).map((x) => x[2]);
    return mk(V, 'Vocabulary (Antonym)', `Choose the word OPPOSITE in meaning to: ${w.toUpperCase()}`, ant, [syn, ...ds],
      `**${w.toUpperCase()}** means ${syn}. The opposite of that is ==${ant}==.\n!!Trap!!: "${syn}" has the SAME meaning, not the opposite.`);
  },
  function kasingkahulugan() {
    const [w, syn] = pick(SALITA);
    const ds = others(SALITA, w).filter((x) => x[1] !== syn).slice(0, 3).map((x) => x[1]);
    return mk(V, 'Talasalitaan (Filipino)', `Piliin ang kasingkahulugan ng salitang may malaking titik: ${w.toUpperCase()}`, syn, ds,
      `Ang **${w.toUpperCase()}** ay nangangahulugang **${syn}**.\nKaya ang kasingkahulugan ay ==${syn}==.`);
  },
  function kasalungat() {
    const [w, syn, ant] = pick(SALITA);
    const ds = others(SALITA, w).filter((x) => x[2] !== ant).slice(0, 3).map((x) => x[2]);
    return mk(V, 'Talasalitaan (Filipino)', `Piliin ang kasalungat ng salitang may malaking titik: ${w.toUpperCase()}`, ant, [syn, ...ds],
      `Ang **${w.toUpperCase()}** ay ${syn}. Ang kabaligtaran nito ay ==${ant}==.\n!!Bitag!!: ang "${syn}" ay kasingkahulugan, hindi kasalungat.`);
  },
];

const GENERATORS = { numerical, analytical, clerical, verbal: verbalGen, general: [] };

function generate(subject) {
  const gens = GENERATORS[subject] || [];
  if (!gens.length) return null;
  for (let tries = 0; tries < 20; tries++) {
    try {
      const item = pick(gens)();
      if (item && item.choices.length === 4 && item.answer >= 0) return { ...item, source: 'generated' };
    } catch (e) { /* retry */ }
  }
  return null;
}

module.exports = { generate, shuffle, GENERATORS, helpers: { ri, pick, shuffle, gcd, peso, fmt, ord, mk, numDistractors, misspell, variants, mulLines, divLines, mulStep, divStep, addLines, minusHint }, lists: { VOCAB, SALITA, SURNAMES, FIRST, SPELL, sameFamily } };

// More question types (they add themselves to GENERATORS).
require('./generators-extra');
