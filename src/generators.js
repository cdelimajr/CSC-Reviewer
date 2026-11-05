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

/* ----------------------------- NUMERICAL ----------------------------- */
const N = 'numerical';
const numerical = [
  function percentOf() {
    const p = pick([5, 10, 12, 15, 20, 25, 30, 35, 40, 45, 60, 75, 80]);
    const n = ri(2, 60) * 20;
    const ans = (p * n) / 100;
    return mk(N, 'Percentage', `What is ${p}% of ${fmt(n)}?`, fmt(ans), numDistractors(ans).map(fmt),
      `Step 1: Change ${p}% to a decimal: ${p} ÷ 100 = **${p / 100}**.\nStep 2: Multiply by the number: ${p / 100} × ${fmt(n)} = ==${fmt(ans)}==.`);
  },
  function whatPercent() {
    const p = pick([5, 10, 15, 20, 25, 30, 40, 45, 50, 60, 75, 80]);
    const base = ri(2, 40) * 20;
    const part = (base * p) / 100;
    return mk(N, 'Percentage', `${fmt(part)} is what percent of ${fmt(base)}?`, p + '%',
      numDistractors(p, { step: 5 }).map((x) => x + '%'),
      `Step 1: Divide the part by the whole: ${fmt(part)} ÷ ${fmt(base)} = **${p / 100}**.\nStep 2: Multiply by 100 to make it a percent: ${p / 100} × 100 = ==${p}%==.`);
  },
  function discount() {
    const price = ri(4, 60) * 100;
    const d = pick([10, 15, 20, 25, 30, 40, 50]);
    const ans = price - (price * d) / 100;
    return mk(N, 'Percentage', `A pair of shoes costs ${peso(price)}. During a sale, it is offered at ${d}% discount. What is the sale price?`,
      peso(ans), [peso((price * d) / 100), peso(ans + price * 0.05), peso(ans - price * 0.05), peso(price - d * 10)],
      `Step 1: Find the discount: ${d}% of ${peso(price)} = ${d / 100} × ${peso(price)} = **${peso((price * d) / 100)}**.\nStep 2: Take the discount away from the price: ${peso(price)} − ${peso((price * d) / 100)} = ==${peso(ans)}==.\n!!Trap!!: ${peso((price * d) / 100)} is only the discount, not the sale price.`);
  },
  function simpleInterest() {
    const P = ri(2, 50) * 1000;
    const r = pick([2, 3, 4, 5, 6, 8, 10, 12]);
    const t = ri(1, 5);
    const I = (P * r * t) / 100;
    return mk(N, 'Simple Interest', `How much simple interest will ${peso(P)} earn at ${r}% per year for ${t} year${t > 1 ? 's' : ''}?`,
      peso(I), [peso(I + (P * r) / 100), peso((P * r) / 100 === I ? I * 2 : (P * r) / 100), peso(P + I), peso(I / 2)],
      `Use **I = P × r × t** (interest = money × rate × time).\nStep 1: P = ${peso(P)}, r = ${r}% = **${r / 100}**, t = **${t}** year${t > 1 ? 's' : ''}.\nStep 2: I = ${peso(P)} × ${r / 100} × ${t} = ==${peso(I)}==.\n!!Trap!!: the question asks for the interest only, not the money plus interest.`);
  },
  function workTogether() {
    const [a, b, ans] = pick([[3, 6, 2], [4, 12, 3], [6, 12, 4], [10, 15, 6], [12, 24, 8], [20, 30, 12], [5, 20, 4], [9, 18, 6], [8, 24, 6], [15, 30, 10], [6, 3, 2], [12, 6, 4], [4, 4, 2], [10, 40, 8]]);
    const names = shuffle(['Ana', 'Ben', 'Carlo', 'Dina', 'Ella', 'Felix', 'Gina', 'Hector']);
    return mk(N, 'Work Problem', `${names[0]} can paint a room in ${a} hours, while ${names[1]} can paint the same room in ${b} hours. Working together, how many hours will it take them to paint the room?`,
      `${ans} hours`, [`${(a + b) / 2} hours`, `${a + b} hours`, `${ans + 1} hours`, `${Math.abs(a - b) || ans + 2} hours`, `${ans + 2} hours`],
      `Step 1: In 1 hour, ${names[0]} paints **1/${a}** of the room and ${names[1]} paints **1/${b}** of the room.\nStep 2: Together in 1 hour: 1/${a} + 1/${b} = **1/${ans}** of the room.\nStep 3: If they paint 1/${ans} each hour, the whole room takes ==${ans} hours==.\nShortcut: (${a} × ${b}) ÷ (${a} + ${b}) = ${a * b} ÷ ${a + b} = ${ans}.\n!!Trap!!: working together is FASTER than each one alone, so the answer must be less than ${Math.min(a, b)}.`);
  },
  function distance() {
    const s = ri(4, 16) * 5;
    const t = ri(2, 6);
    const d = s * t;
    if (Math.random() < 0.5) {
      return mk(N, 'Distance, Rate, Time', `A bus travels at an average speed of ${s} km/h. How far will it travel in ${t} hours?`,
        `${d} km`, numDistractors(d, { step: s }).map((x) => x + ' km'), `Step 1: Use **distance = speed × time**.\nStep 2: The bus goes ${s} km every hour, for ${t} hours: ${s} × ${t} = ==${d} km==.`);
    }
    return mk(N, 'Distance, Rate, Time', `A car travels ${d} km in ${t} hours. What is its average speed?`,
      `${s} km/h`, numDistractors(s, { step: 5 }).map((x) => x + ' km/h'), `Step 1: Use **speed = distance ÷ time**.\nStep 2: Share the ${d} km equally over ${t} hours: ${d} ÷ ${t} = ==${s} km/h==.`);
  },
  function ages() {
    const b = ri(4, 15);
    const k = ri(2, 4);
    const sum = b * (k + 1);
    const [x, y] = shuffle(['Maria', 'Liza', 'Jose', 'Pedro', 'Rosa', 'Mark']);
    return mk(N, 'Age Problem', `${x} is ${k} times as old as ${y}. The sum of their ages is ${sum}. How old is ${x}?`,
      k * b, [b, k * b + k, k * b - k, sum - b + 1, (k + 1) * b - 2],
      `Step 1: Let ${y}'s age = **n**. ${x} is ${k} times as old, so ${x} = **${k}n**.\nStep 2: Add them: n + ${k}n = ${sum} → ${k + 1}n = ${sum}.\nStep 3: n = ${sum} ÷ ${k + 1} = **${b}** (this is ${y}).\nStep 4: ${x} = ${k} × ${b} = ==${k * b}==.\n!!Trap!!: ${b} is ${y}'s age, not ${x}'s.`);
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
      `Step 1: Add all the scores: ${nums.join(' + ')} = **${avg * n}**.\nStep 2: Count the scores: there are **${n}**.\nStep 3: Divide: ${avg * n} ÷ ${n} = ==${avg}==.`);
  },
  function consecutive() {
    const n = ri(10, 80);
    const S = 3 * n + 3;
    return mk(N, 'Algebra', `The sum of three consecutive integers is ${S}. What is the largest of the three?`,
      n + 2, [n, n + 1, n + 3, n - 1],
      `Step 1: Consecutive means next to each other, so call them **x, x + 1, x + 2**.\nStep 2: Add them: x + x + 1 + x + 2 = **3x + 3** = ${S}.\nStep 3: 3x = ${S} − 3 = ${S - 3}, so x = ${S - 3} ÷ 3 = **${n}**.\nStep 4: The numbers are ${n}, ${n + 1}, ${n + 2}. The largest is ==${n + 2}==.\n!!Trap!!: ${n} is the smallest; the question asks for the largest.`);
  },
  function ratioShare() {
    const a = ri(1, 5), b = ri(a + 1, 8);
    if (gcd(a, b) !== 1) return null;
    const unit = ri(5, 60) * 10;
    const total = (a + b) * unit;
    return mk(N, 'Ratio and Proportion', `${peso(total)} is to be divided between two siblings in the ratio ${a}:${b}. How much is the larger share?`,
      peso(b * unit), [peso(a * unit), peso(total / 2), peso((b + 1) * unit), peso((b - 1) * unit || unit * 3)],
      `Step 1: Add the ratio parts: ${a} + ${b} = **${a + b} parts**.\nStep 2: One part = ${peso(total)} ÷ ${a + b} = **${peso(unit)}**.\nStep 3: The larger share has ${b} parts: ${b} × ${peso(unit)} = ==${peso(b * unit)}==.\nCheck: the smaller share is ${a} × ${peso(unit)} = ${peso(a * unit)}, and ${peso(a * unit)} + ${peso(b * unit)} = ${peso(total)} ✓`);
  },
  function proportion() {
    const n1 = ri(2, 6), price = ri(3, 15) * n1, n2 = ri(7, 20);
    const unit = price / n1;
    const ans = unit * n2;
    const item = pick(['notebooks', 'ballpens', 'pencils', 'folders', 'envelopes']);
    return mk(N, 'Ratio and Proportion', `If ${n1} ${item} cost ${peso(price)}, how much will ${n2} ${item} cost?`,
      peso(ans), numDistractors(ans, { step: unit }).map(peso),
      `Step 1: Find the price of **one**: ${peso(price)} ÷ ${n1} = **${peso(unit)}**.\nStep 2: Multiply by how many you want: ${n2} × ${peso(unit)} = ==${peso(ans)}==.`);
  },
  function linear() {
    const a = ri(2, 9), x = ri(-10, 15), b = ri(-20, 20);
    const c = a * x + b;
    const bs = b >= 0 ? `+ ${b}` : `− ${-b}`;
    return mk(N, 'Algebra', `Solve for x: ${a}x ${bs} = ${c}`,
      x, numDistractors(x, { step: 1, allowNeg: true }).concat([-x, x + 2]),
      `Goal: get **x** alone on one side.\nStep 1: ${b >= 0 ? `Take away ${b} from` : `Add ${-b} to`} both sides: ${a}x = ${c} ${b >= 0 ? '−' : '+'} ${Math.abs(b)} = **${c - b}**.\nStep 2: Divide both sides by ${a}: x = ${c - b} ÷ ${a} = ==${x}==.\nCheck: ${a} × ${x < 0 ? `(${x})` : x} ${bs} = ${c} ✓`);
  },
  function fractions() {
    const b = pick([2, 3, 4, 5, 6, 8]), d = pick([3, 4, 5, 6, 8, 10, 12]);
    const a = ri(1, b - 1), c = ri(1, d - 1);
    const op = pick(['+', '−']);
    const raw = op === '+' ? a * d + c * b : a * d - c * b;
    if (raw <= 0) return null;
    const g = gcd(raw, b * d), num = raw / g, den = (b * d) / g;
    const f = (n, dd) => (dd === 1 ? `${n}` : `${n}/${dd}`);
    const wrong1 = op === '+' ? f(a + c, b + d) : f(Math.abs(a - c) || 1, Math.abs(b - d) || 2);
    return mk(N, 'Fractions', `Simplify: ${a}/${b} ${op} ${c}/${d}`,
      f(num, den), [wrong1, f(num + 1, den), f(num, den + 1), f(Math.max(1, num - 1), den)],
      `Step 1: Make the bottom numbers the same. Use ${b} × ${d} = **${b * d}**.\nStep 2: Change each fraction: ${a}/${b} = ${a * d}/${b * d} and ${c}/${d} = ${c * b}/${b * d}.\nStep 3: ${op === '+' ? 'Add' : 'Subtract'} only the tops: ${a * d} ${op} ${c * b} = ${raw}, so **${raw}/${b * d}**.\n${g > 1 ? `Step 4: Simplify (divide top and bottom by ${g}): ==${f(num, den)}==.` : `Step 4: It cannot be made simpler, so the answer is ==${f(num, den)}==.`}${op === '+' ? `\n!!Trap!!: never add the bottoms (${wrong1} is wrong).` : ''}`);
  },
  function orderOps() {
    const b = ri(2, 9), c = ri(2, 9), e = ri(2, 6), d = e * ri(2, 9), a = ri(5, 40);
    const ans = a + b * c - d / e;
    return mk(N, 'Basic Operations', `Evaluate: ${a} + ${b} × ${c} − ${d} ÷ ${e}`,
      ans, [((a + b) * c - d) / e, (a + b) * c - d / e, a + b * (c - d / e), ans + e],
      `Use **PEMDAS**: multiply and divide first, then add and subtract (left to right).\nStep 1: ${b} × ${c} = **${b * c}**\nStep 2: ${d} ÷ ${e} = **${d / e}**\nStep 3: ${a} + ${b * c} − ${d / e}\n= ${a + b * c} − ${d / e}\n= ==${ans}==\n!!Trap!!: going left to right without PEMDAS gives a wrong answer.`);
  },
  function profit() {
    const cost = ri(4, 40) * 50;
    const p = pick([10, 20, 25, 30, 40, 50]);
    const sell = cost + (cost * p) / 100;
    return mk(N, 'Percentage', `A store owner bought an item for ${peso(cost)} and sold it for ${peso(sell)}. What is the percent profit based on cost?`,
      p + '%', numDistractors(p, { step: 5 }).map((x) => x + '%'),
      `Step 1: Profit = selling price − cost = ${peso(sell)} − ${peso(cost)} = **${peso(sell - cost)}**.\nStep 2: Divide by the **cost**: ${peso(sell - cost)} ÷ ${peso(cost)} = ${p / 100}.\nStep 3: Multiply by 100: ==${p}%==.`);
  },
  function decimals() {
    const ia = ri(11, 99), ib = ri(11, 49), a = ia / 10, b = ib / 10;
    const ans = Number((a * b).toFixed(2));
    return mk(N, 'Decimals', `What is ${a} × ${b}?`,
      fmt(ans), [fmt(Number((a * b * 10).toFixed(1))), fmt(Number((a + b).toFixed(2))), fmt(Number((ans + 0.1).toFixed(2))), fmt(Number((ans / 10).toFixed(3)))],
      `Step 1: Forget the dots and multiply: ${ia} × ${ib} = **${ia * ib}**.\nStep 2: Count the decimal places: ${a} has 1 and ${b} has 1, so **2 places** in all.\nStep 3: Put the dot 2 places from the right: ${(ia * ib / 100).toFixed(2)}${(ia * ib / 100).toFixed(2) === fmt(ans) ? '' : ` = ${fmt(ans)}`}.\nAnswer: ==${fmt(ans)}==`);
  },
  function numberSeriesN() { return series(N); },
  function wordProblemCoins() {
    const total = ri(10, 30);
    const fives = ri(2, total - 2);
    const tens = total - fives;
    const amount = fives * 5 + tens * 10;
    return mk(N, 'Word Problem', `Juan has ${total} coins consisting of ₱5 and ₱10 coins. Their total value is ${peso(amount)}. How many ₱10 coins does he have?`,
      tens, [fives, tens + 1, tens - 1, Math.round(total / 2) === tens ? tens + 2 : Math.round(total / 2)],
      `Step 1: Let **t** = the number of ₱10 coins. The rest are ₱5 coins: **${total} − t**.\nStep 2: Write the money: 10t + 5(${total} − t) = ${amount}\n→ 10t + ${5 * total} − 5t = ${amount}\n→ 5t = ${amount} − ${5 * total} = ${amount - 5 * total}\nStep 3: t = ${amount - 5 * total} ÷ 5 = ==${tens}==.\nCheck: ${tens} × ₱10 + ${fives} × ₱5 = ${peso(tens * 10)} + ${peso(fives * 5)} = ${peso(amount)} ✓`);
  },
  function areaPerimeter() {
    const l = ri(5, 30), w = ri(3, l);
    if (Math.random() < 0.5) {
      return mk(N, 'Geometry', `A rectangular lot is ${l} m long and ${w} m wide. What is its area?`,
        `${l * w} sq m`, [`${2 * (l + w)} sq m`, `${l * w + l} sq m`, `${l * w - w} sq m`, `${(l + w) * 2 + 10} sq m`],
        `Area is the space **inside** the lot.\nArea = length × width = ${l} × ${w} = ==${l * w} sq m==.\n!!Trap!!: ${2 * (l + w)} is the perimeter (the edge), not the area.`);
    }
    return mk(N, 'Geometry', `How many meters of fencing are needed to enclose a rectangular garden ${l} m long and ${w} m wide?`,
      `${2 * (l + w)} m`, [`${l * w} m`, `${l + w} m`, `${2 * (l + w) + 4} m`, `${2 * l + w} m`],
      `A fence goes **around** the edge, so we need the **perimeter**.\nStep 1: One length + one width: ${l} + ${w} = ${l + w}.\nStep 2: A rectangle has 2 of each: 2 × ${l + w} = ==${2 * (l + w)} m==.\n!!Trap!!: ${l * w} is the area (the inside), not the fence.`);
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
      `Every **7 days** it is the same day again.\nStep 1: ${n} ÷ 7 = ${Math.floor(n / 7)} weeks, remainder **${n % 7}**.\nStep 2: The ${Math.floor(n / 7)} full weeks bring us back to ${DAYS[t]}.\n${n % 7 ? `Step 3: Move ${n % 7} more day${n % 7 > 1 ? 's' : ''}: ${Array.from({ length: n % 7 }, (_, i) => DAYS[(t + i + 1) % 7]).join(' → ')}.\nAnswer: ==${ans}==` : `Step 3: No extra days, so it is still ==${ans}==.`}`);
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
  ['maalwan', 'maginhawa', 'maghirap'], ['dalisay', 'wagas', 'marumi'], ['mahinahon', 'kalmado', 'magagalitin'], ['mapanglaw', 'malungkot', 'masaya'],
  ['matapat', 'tapat', 'taksil'], ['maramot', 'kuripot', 'mapagbigay'], ['marahas', 'mabangis', 'mahinhin'], ['malawak', 'malapad', 'makitid'],
  ['payak', 'simple', 'masalimuot'], ['bantog', 'tanyag', 'di-kilala'], ['pagal', 'pagod', 'masigla'], ['pighati', 'dalamhati', 'galak'],
  ['hikahos', 'mahirap', 'mayaman'], ['mabagal', 'makupad', 'mabilis'], ['maagap', 'maaga', 'huli'], ['matimtiman', 'mahinhin', 'magaslaw'],
  ['dukha', 'maralita', 'maykaya'], ['masaklap', 'mapait', 'matamis'], ['malamlam', 'madilim', 'maliwanag'], ['palalo', 'hambog', 'mapagpakumbaba'],
  ['taimtim', 'taos-puso', 'pakitang-tao'], ['maluwag', 'malapad', 'masikip'], ['tuso', 'mapanlinlang', 'tapat'], ['matiwasay', 'payapa', 'magulo'],
  ['salat', 'kapos', 'sagana'], ['ligaya', 'saya', 'lungkot'],
];

const verbalGen = [
  function synonym() {
    const [w, syn] = pick(VOCAB);
    const ds = shuffle(VOCAB.filter((x) => x[0] !== w && x[1] !== syn)).slice(0, 3).map((x) => x[1]);
    return mk(V, 'Vocabulary (Synonym)', `Choose the word closest in meaning to: ${w.toUpperCase()}`, syn, ds,
      `**${w.toUpperCase()}** means **${syn}**.\nSo the word closest in meaning is ==${syn}==.\nTip: put each choice in place of the word in a sentence and see which keeps the same meaning.`);
  },
  function antonym() {
    const [w, syn, ant] = pick(VOCAB);
    const ds = shuffle(VOCAB.filter((x) => x[0] !== w && x[2] !== ant)).slice(0, 2).map((x) => x[2]);
    return mk(V, 'Vocabulary (Antonym)', `Choose the word OPPOSITE in meaning to: ${w.toUpperCase()}`, ant, [syn, ...ds, pick(VOCAB)[2]],
      `**${w.toUpperCase()}** means ${syn}. The opposite of that is ==${ant}==.\n!!Trap!!: "${syn}" has the SAME meaning, not the opposite.`);
  },
  function kasingkahulugan() {
    const [w, syn] = pick(SALITA);
    const ds = shuffle(SALITA.filter((x) => x[0] !== w && x[1] !== syn)).slice(0, 3).map((x) => x[1]);
    return mk(V, 'Talasalitaan (Filipino)', `Piliin ang kasingkahulugan ng salitang may malaking titik: ${w.toUpperCase()}`, syn, ds,
      `Ang **${w.toUpperCase()}** ay nangangahulugang **${syn}**.\nKaya ang kasingkahulugan ay ==${syn}==.`);
  },
  function kasalungat() {
    const [w, syn, ant] = pick(SALITA);
    const ds = shuffle(SALITA.filter((x) => x[0] !== w && x[2] !== ant)).slice(0, 2).map((x) => x[2]);
    return mk(V, 'Talasalitaan (Filipino)', `Piliin ang kasalungat ng salitang may malaking titik: ${w.toUpperCase()}`, ant, [syn, ...ds, pick(SALITA)[2]],
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

module.exports = { generate, shuffle, GENERATORS, helpers: { ri, pick, shuffle, gcd, peso, fmt, ord, mk, numDistractors, misspell, variants }, lists: { VOCAB, SALITA, SURNAMES, FIRST, SPELL } };

// More question types (they add themselves to GENERATORS).
require('./generators-extra');
