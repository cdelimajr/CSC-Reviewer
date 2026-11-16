// Numerical Ability, part 2 (1.46.0): more kinds of problems, as fixed questions.
// Same rules as bank-numerical.js: hand-written words and fixed number lists; the answer and every step are
// worked out by the code (never typed by hand); the wrong choices are the usual mistakes. The number lists
// were chosen so the answers come out as whole numbers, whole pesos or simple fractions.
const { helpers } = require('./generators');
const { pickSome } = require('./bank-tools');

const { fmt, peso, gcd, mulStep, divStep, addLines } = helpers;
const N = 'numerical';
const out = [];
const NAMES = ['Aida', 'Bong', 'Cora', 'Dante', 'Edna', 'Fidel', 'Gina', 'Hector', 'Irma', 'Jun', 'Kim', 'Lito', 'Mila', 'Nestor', 'Olga', 'Pepe', 'Rosa', 'Susan', 'Totoy', 'Weng'];
const name = (i) => NAMES[i % NAMES.length];

// Adds a question. wrong: candidate wrong answers; the first 3 that differ from the answer (and each other) are
// used. Numbers that are not finite are skipped; negative numbers are allowed only when allowNeg is set.
function add(t, q, answer, wrong, steps, show = (v) => String(v), allowNeg = false) {
  const a = show(answer);
  const ds = [];
  for (const w of wrong) {
    if (typeof w === 'number' && (!Number.isFinite(w) || (!allowNeg && w <= 0))) continue;
    const s = show(w);
    if (s !== a && !ds.includes(s)) ds.push(s);
    if (ds.length === 3) break;
  }
  if (ds.length < 3) return;
  out.push({ s: N, t, q, a, d: ds, e: `${steps}\nAnswer: ==${a}==.` });
}
const P = (v) => peso(v);
const pct = (v) => `${fmt(v)}%`;
const grid = (...lists) => lists.reduce((acc, l) => acc.flatMap((x) => l.map((y) => [...x, y])), [[]]);
// Up to n rows of a grid, picked with a fixed seed (so a big grid does not flood one kind of problem).
const some = (rowsList, n, seed, ok = () => true) => pickSome(rowsList, n, seed, ok);
const frac = (n, d) => { const g = gcd(n, d); return d / g === 1 ? `${n / g}` : `${n / g}/${d / g}`; };

/* ---------- Percentage: what percent of A is B? ---------- */
some(grid([40, 50, 80, 120, 150, 200, 250, 300, 400, 500, 600, 800], [5, 10, 15, 20, 25, 30, 40, 45, 60, 75]), 32, 'pctof').forEach(([whole, p], i) => {
  const part = whole * p / 100;
  if (!Number.isInteger(part)) return;
  add('Percentage', `Out of ${whole} applicants, ${part} passed the exam. What percent of the applicants passed?`, p, [part, p * 2, 100 - p, Math.round(whole / part)],
    `Percent = **part ÷ whole × 100**.\nStep 1: ${part} ÷ ${whole} = ${fmt(part / whole)}\nStep 2: ${fmt(part / whole)} × 100 = **${p}%**`, pct);
});

/* ---------- Percentage: find the whole ---------- */
some(grid([10, 20, 25, 40, 50, 75, 12, 15, 30, 60], [6, 9, 12, 15, 18, 24, 30, 45, 60, 90]), 30, 'whole').forEach(([p, part]) => {
  const whole = part * 100 / p;
  if (!Number.isInteger(whole)) return;
  add('Percentage', `${p}% of a number is ${part}. What is the number?`, whole, [part * p / 100, whole / 2, whole + part, part * p],
    `Step 1: ${p}% is ${part}, so **1%** is ${part} ÷ ${p} = **${fmt(part / p)}**.\nStep 2: 100% is 100 times that: ${fmt(part / p)} × 100 = **${fmt(whole)}**.\n!!Trap!!: ${fmt(part * p / 100)} is ${p}% OF ${part}, not the number we need.`, fmt);
});

/* ---------- Percentage: percent increase or decrease ---------- */
for (const [old, now, thing] of [[200, 250, 'rice per sack'], [400, 500, 'monthly rent of a stall'], [50, 60, 'jeepney fare for a long trip'], [80, 100, 'price of a kilo of pork'],
  [1200, 1500, 'electric bill'], [250, 300, 'price of a box of pens'], [500, 400, 'price of a used phone case'], [800, 600, 'price of a fan on sale'], [1000, 750, 'price of a bag on clearance'],
  [40, 50, 'price of a bottle of cooking oil'], [60, 45, 'price of a kilo of onions after harvest'], [150, 180, 'daily allowance'], [320, 400, 'weekly load budget'], [900, 720, 'water bill after repairs'],
  [2000, 2500, 'tuition per unit'], [75, 90, 'price of a kilo of chicken'], [120, 90, 'price of a pack of diapers on promo'], [500, 650, 'monthly internet plan'], [1600, 1200, 'cost of a printer on sale'],
  [300, 375, 'price of a box of bond paper'], [25, 30, 'price of a loaf of bread'], [480, 600, 'cost of a set of uniforms'], [700, 560, 'price of shoes after a sale'], [16, 20, 'price of an egg tray per piece']]) {
  const diff = Math.abs(now - old), p = diff * 100 / old, up = now > old;
  if (!Number.isInteger(p)) continue;
  add('Percentage', `The ${thing} changed from ${P(old)} to ${P(now)}. What is the percent ${up ? 'increase' : 'decrease'}?`, p, [diff * 100 / now, diff, p * 2, 100 - p].map((v) => Math.round(v * 100) / 100),
    `Step 1: The change: ${P(Math.max(old, now))} − ${P(Math.min(old, now))} = **${P(diff)}**.\nStep 2: Percent change = change ÷ **old price** × 100 = ${fmt(diff)} ÷ ${fmt(old)} × 100 = **${fmt(p)}%**.\n!!Trap!!: divide by the OLD price (${P(old)}), not the new one.`, pct);
}

/* ---------- Percentage: sale price and the price before the sale ---------- */
some(grid([300, 450, 600, 800, 900, 1200, 1500, 2000, 2400, 3000, 3600, 4500], [10, 15, 20, 25, 30, 40, 50]), 30, 'sale').forEach(([price, d]) => {
  const off = price * d / 100, sale = price - off;
  if (!Number.isInteger(off)) return;
  add('Percentage', `A pair of shoes marked ${P(price)} is sold at ${d}% off. What is the sale price?`, sale, [off, price - d, price * d / 1000 + price, sale - off],
    `Step 1: The discount: ${d}% of ${P(price)} = ${P(price)} ÷ 100 × ${d} = **${P(off)}**.\nStep 2: Sale price: ${P(price)} − ${P(off)} = **${P(sale)}**.\n!!Trap!!: ${P(off)} is only the discount.`, P);
});
some(grid([10, 20, 25, 40, 50], [360, 450, 600, 720, 900, 1200, 1350, 1800, 2400]), 25, 'orig').forEach(([d, sale]) => {
  const price = sale * 100 / (100 - d);
  if (!Number.isInteger(price)) return;
  add('Percentage', `After a ${d}% discount, a blender costs ${P(sale)}. What was its price before the discount?`, price, [sale + sale * d / 100, sale * (100 + d) / 100 + 1, sale * d / 100, price + sale * d / 100].map((v) => Math.round(v)),
    `Step 1: After ${d}% off, the buyer pays **${100 - d}%** of the old price.\nStep 2: So ${100 - d}% = ${P(sale)}, and 1% = ${P(sale)} ÷ ${100 - d} = **${P(sale / (100 - d))}**.\nStep 3: 100% = ${P(sale / (100 - d))} × 100 = **${P(price)}**.\n!!Trap!!: adding ${d}% of ${P(sale)} back does NOT give the old price, because the ${d}% was taken from the old (bigger) price.`, P);
});

/* ---------- Percentage: markup ---------- */
some(grid([120, 200, 250, 400, 500, 640, 800, 1000, 1500, 2500], [10, 20, 25, 30, 40, 50]), 26, 'markup').forEach(([cost, m]) => {
  const up = cost * m / 100;
  if (!Number.isInteger(up)) return;
  add('Percentage', `A sari-sari store buys a case of soft drinks for ${P(cost)} and marks it up by ${m}%. What is the selling price?`, cost + up, [up, cost + m, cost - up, cost * 2],
    `Step 1: Markup = ${m}% of ${P(cost)} = **${P(up)}**.\nStep 2: Selling price = cost + markup = ${P(cost)} + ${P(up)} = **${P(cost + up)}**.`, P);
});

/* ---------- Percentage: take-home pay after deductions ---------- */
some(grid([18000, 20000, 24000, 25000, 30000, 32000, 40000, 45000, 50000], [5, 8, 10, 12, 15]), 22, 'net').forEach(([sal, d], i) => {
  const ded = sal * d / 100;
  add('Percentage', `${name(i)} earns ${P(sal)} a month. If ${d}% is deducted for taxes and contributions, how much is the take-home pay?`, sal - ded, [ded, sal - d * 100, sal - ded * 2, sal + ded],
    `Step 1: Deductions = ${d}% of ${P(sal)} = ${P(sal / 100)} × ${d} = **${P(ded)}**.\nStep 2: Take-home pay = ${P(sal)} − ${P(ded)} = **${P(sal - ded)}**.`, P);
});

/* ---------- Percentage: a budget split by percent ---------- */
some(grid([12000, 15000, 18000, 20000, 25000, 30000], [['food', 40], ['rent', 25], ['savings', 20], ['transportation', 15], ['bills', 30], ['tuition', 35]]), 24, 'budget').forEach(([inc, [item, p]], i) => {
  const v = inc * p / 100;
  add('Percentage', `${name(i + 3)}'s family budgets ${p}% of its ${P(inc)} monthly income for ${item}. How much is that?`, v, [inc * p / 1000, inc - v, v * 2, inc / p],
    `Step 1: 1% of ${P(inc)} = ${P(inc / 100)}.\n${mulStep(`Step 2: ${p}% is ${p} times that`, p, inc / 100)}\nThe ${item} budget is **${P(v)}**.`, P);
});

/* ---------- Simple interest: the interest and the amount at the end ---------- */
some(grid([5000, 8000, 10000, 12000, 15000, 20000, 25000, 50000], [2, 3, 4, 5, 6, 8, 10], [1, 2, 3, 5]), 40, 'si').forEach(([p, r, t]) => {
  const i = p * r * t / 100;
  add('Simple Interest', `How much simple interest does ${P(p)} earn at ${r}% a year for ${t} year${t > 1 ? 's' : ''}?`, i, [p * r / 100, p + i, i * 2, p * r * t / 1000],
    `Use **I = P × r × t**.\nStep 1: Interest for ONE year: ${r}% of ${P(p)} = **${P(p * r / 100)}**.\n${mulStep(`Step 2: For ${t} year${t > 1 ? 's' : ''}`, p * r / 100, t)}\nThe interest is **${P(i)}**.`, P);
});
some(grid([10000, 20000, 30000, 40000, 60000], [3, 5, 6, 9, 12], [2, 3, 4]), 26, 'amt').forEach(([p, r, t]) => {
  const i = p * r * t / 100;
  add('Simple Interest', `A loan of ${P(p)} has a simple interest rate of ${r}% a year. How much is owed in all (loan plus interest) after ${t} years?`, p + i, [i, p + p * r / 100, p + 2 * i, p * (1 + r / 10)],
    `Step 1: Interest for one year: ${r}% of ${P(p)} = **${P(p * r / 100)}**.\nStep 2: For ${t} years: ${P(p * r / 100)} × ${t} = **${P(i)}**.\nStep 3: Total owed = ${P(p)} + ${P(i)} = **${P(p + i)}**.\n!!Trap!!: ${P(i)} is only the interest.`, P);
});
some(grid([20000, 25000, 40000, 50000, 60000, 100000], [2, 3, 4, 5, 6], [2, 3, 4]), 22, 'principal').forEach(([p, r, t]) => {
  const i = p * r * t / 100;
  add('Simple Interest', `What amount of money earns ${P(i)} in simple interest in ${t} years at ${r}% a year?`, p, [i * 100 / r, i * t, p / 2, p + i],
    `Use **I = P × r × t**, so **P = I ÷ (r × t)**.\nStep 1: Interest in ONE year: ${P(i)} ÷ ${t} = **${P(i / t)}**.\nStep 2: That is ${r}% of the money, so 1% = ${P(i / t)} ÷ ${r} = **${P(i / t / r)}**.\nStep 3: 100% = ${P(i / t / r)} × 100 = **${P(p)}**.`, P);
});

/* ---------- Compound interest (yearly, 2 years) ---------- */
for (const [p, r] of [[10000, 10], [20000, 10], [5000, 20], [8000, 5], [40000, 5], [10000, 20], [50000, 10], [12000, 10], [25000, 20], [20000, 5], [100000, 10], [60000, 5], [30000, 10], [4000, 20], [16000, 5]]) {
  const y1 = p * (100 + r) / 100, y2 = y1 * (100 + r) / 100;
  if (!Number.isInteger(y2)) continue;
  add('Simple Interest', `${P(p)} is deposited at ${r}% interest compounded yearly. How much is in the account after 2 years?`, y2, [p + p * r * 2 / 100, y1, y2 - p, p * (100 + 2 * r) / 100 + p],
    `**Compounded yearly** means each year's interest is added before the next year's interest is computed.\nStep 1: After year 1: ${P(p)} + ${r}% of ${P(p)} = ${P(p)} + ${P(p * r / 100)} = **${P(y1)}**.\nStep 2: After year 2: ${P(y1)} + ${r}% of ${P(y1)} = ${P(y1)} + ${P(y1 * r / 100)} = **${P(y2)}**.\n!!Trap!!: simple interest would give only ${P(p + p * r * 2 / 100)}.`, P);
}

/* ---------- Ratio: share between two ---------- */
some(grid([1200, 1500, 1800, 2400, 3000, 3600, 4200, 5000, 6000, 7200, 9000], [[1, 2], [2, 3], [3, 5], [1, 4], [3, 4], [2, 5], [4, 5], [5, 7]]), 34, 'share2').forEach(([total, [a, b]], i) => {
  if (total % (a + b)) return;
  const one = total / (a + b);
  add('Ratio and Proportion', `${name(i)} and ${name(i + 7)} divide ${P(total)} in the ratio ${a} : ${b}. How much does ${name(i + 7)} get?`, one * b, [one * a, total / 2, total - one, one * (b + 1)],
    `Step 1: Total parts = ${a} + ${b} = **${a + b}**.\n${divStep('Step 2: One part', total, a + b)}\nStep 3: ${name(i + 7)} gets ${b} parts: ${P(one)} × ${b} = **${P(one * b)}**.`, P);
});

/* ---------- Ratio: find the other quantity ---------- */
for (const [a, b, know, what1, what2] of [[3, 5, 24, 'boys', 'girls'], [2, 3, 18, 'teachers', 'parents'], [4, 7, 28, 'red marbles', 'blue marbles'], [5, 2, 35, 'chairs', 'tables'],
  [3, 4, 27, 'men', 'women'], [7, 3, 42, 'mango trees', 'coconut trees'], [2, 9, 14, 'managers', 'staff'], [5, 6, 40, 'nurses', 'midwives'], [3, 8, 21, 'cats', 'dogs'], [4, 5, 36, 'sedans', 'vans'],
  [6, 5, 54, 'pens', 'pencils'], [9, 4, 63, 'red roses', 'white roses'], [5, 3, 45, 'adults', 'children'], [2, 7, 16, 'buses', 'jeepneys'], [8, 3, 56, 'blue chairs', 'green chairs'],
  [3, 10, 15, 'clerks', 'customers'], [7, 4, 49, 'mangoes', 'apples'], [4, 9, 32, 'drivers', 'passengers'], [5, 8, 30, 'vans', 'tricycles'], [6, 7, 42, 'ducks', 'chickens']]) {
  const one = know / a, other = one * b;
  add('Ratio and Proportion', `The ratio of ${what1} to ${what2} is ${a} : ${b}. If there are ${know} ${what1}, how many ${what2} are there?`, other, [know * b / a + b, know + b, one * (a + b), know * a / b].map((v) => Math.round(v)),
    `Step 1: ${a} parts = ${know} ${what1}, so 1 part = ${know} ÷ ${a} = **${one}**.\nStep 2: ${what2[0].toUpperCase() + what2.slice(1)} = ${b} parts = ${one} × ${b} = **${other}**.`, fmt);
}

/* ---------- Proportion: same rate (unit price) ---------- */
some(grid([[3, 'notebooks'], [4, 'ballpens'], [5, 'kilos of rice'], [6, 'bottles of water'], [8, 'cans of sardines'], [12, 'eggs']], [2, 3, 4, 5, 6, 8, 12, 15, 25], [7, 9, 10, 11, 14, 20]), 36, 'unit').forEach(([[n, item], each, m]) => {
  const cost = n * each;
  add('Ratio and Proportion', `If ${n} ${item} cost ${P(cost)}, how much do ${m} ${item} cost at the same price?`, each * m, [cost * m, cost + m, each * (m + n), each * (m - 1)],
    `Step 1: Price of ONE: ${P(cost)} ÷ ${n} = **${P(each)}**.\n${mulStep(`Step 2: Price of ${m}`, each, m)}\nSo ${m} ${item} cost **${P(each * m)}**.`, P);
});

/* ---------- Proportion: inverse (more workers, fewer days) ---------- */
for (const [w1, d1, w2] of [[6, 10, 4], [8, 9, 6], [12, 5, 10], [4, 15, 6], [10, 12, 8], [5, 24, 8], [9, 8, 12], [15, 4, 10], [6, 14, 7], [3, 20, 5], [16, 3, 12], [20, 6, 15],
  [7, 12, 6], [18, 4, 9], [12, 10, 15], [8, 15, 10], [5, 18, 9], [24, 5, 20], [14, 6, 21], [10, 9, 6], [4, 21, 7], [9, 10, 6], [6, 20, 8], [25, 4, 20]]) {
  const total = w1 * d1, d2 = total / w2;
  if (!Number.isInteger(d2)) continue;
  add('Work Problem', `${w1} workers can paint a building in ${d1} days. How many days will ${w2} workers take, working at the same rate?`, d2, [d1 * w2 / w1, d1 + w1 - w2, d1 - (w1 - w2), total].map((v) => Math.round(v * 10) / 10),
    `This is an **inverse** proportion: fewer workers need MORE days.\nStep 1: Total work = ${w1} workers × ${d1} days = **${total} worker-days**.\n${divStep(`Step 2: Days for ${w2} workers`, total, w2)}\nSo it takes **${d2} days**.\n!!Trap!!: do not multiply ${d1} by ${w2}/${w1}; that would give ${fmt(d1 * w2 / w1)}.`, (v) => `${fmt(v)} days`);
}

/* ---------- Fractions: add and subtract ---------- */
const FR = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [1, 6], [5, 6], [1, 8], [3, 8], [5, 8], [1, 10], [3, 10], [7, 12], [5, 12]];
some(grid(FR, FR), 40, 'fadd', ([[a, b], [c, d]]) => b !== d && a * d + c * b < 2 * b * d).forEach(([[a, b], [c, d]]) => {
  const l = b * d / gcd(b, d), n = a * (l / b) + c * (l / d);
  add('Fractions', `What is ${a}/${b} + ${c}/${d}?`, frac(n, l), [`${a + c}/${b + d}`, frac(a * c, b * d), frac(n + 1, l), frac(Math.abs(a * (l / b) - c * (l / d)) || 1, l)],
    `Step 1: Make the bottoms the same. The LCD of ${b} and ${d} is **${l}**.\nStep 2: ${a}/${b} = ${a * l / b}/${l} and ${c}/${d} = ${c * l / d}/${l}.\nStep 3: Add the tops: ${a * l / b} + ${c * l / d} = ${n}, so the sum is ${n}/${l}${frac(n, l) !== `${n}/${l}` ? ` = **${frac(n, l)}** (simplified)` : ''}.\n!!Trap!!: never add the bottoms (${a + c}/${b + d} is wrong).`);
});
some(grid(FR, FR), 30, 'fsub', ([[a, b], [c, d]]) => b !== d && a * d > c * b).forEach(([[a, b], [c, d]]) => {
  const l = b * d / gcd(b, d), n = a * (l / b) - c * (l / d);
  add('Fractions', `What is ${a}/${b} − ${c}/${d}?`, frac(n, l), [`${Math.abs(a - c) || 1}/${Math.abs(b - d)}`, frac(a * (l / b) + c * (l / d), l), frac(n + 1, l), frac(a * d, b * c)],
    `Step 1: The LCD of ${b} and ${d} is **${l}**.\nStep 2: ${a}/${b} = ${a * l / b}/${l} and ${c}/${d} = ${c * l / d}/${l}.\nStep 3: Subtract the tops: ${a * l / b} − ${c * l / d} = ${n}, so the answer is ${n}/${l}${frac(n, l) !== `${n}/${l}` ? ` = **${frac(n, l)}**` : ''}.`);
});

/* ---------- Fractions: a fraction of an amount, and dividing by a fraction ---------- */
some(grid([[2, 3], [3, 4], [3, 5], [5, 6], [2, 5], [4, 5], [5, 8], [7, 10], [3, 8], [1, 6]], [120, 240, 360, 480, 600, 720, 960, 1200]), 36, 'fof').forEach(([[a, b], total], i) => {
  const v = total / b * a;
  if (!Number.isInteger(v)) return;
  add('Fractions', `${name(i + 2)} spent ${a}/${b} of a ${P(total)} allowance on books. How much was spent on books?`, v, [total / b, total - v, total / a * b, v + total / b],
    `Step 1: Find 1/${b}: ${P(total)} ÷ ${b} = **${P(total / b)}**.\nStep 2: Take ${a} of those parts: ${P(total / b)} × ${a} = **${P(v)}**.`, P);
});
for (const [len, [a, b]] of [[6, [3, 4]], [9, [3, 4]], [10, [2, 5]], [12, [2, 3]], [15, [3, 5]], [8, [2, 3]], [14, [7, 8]], [5, [5, 6]], [18, [3, 4]], [20, [4, 5]], [21, [3, 4]], [16, [4, 5]],
  [24, [3, 4]], [30, [5, 6]], [7, [7, 10]], [27, [9, 10]]]) {
  const pieces = len * b / a;
  if (!Number.isInteger(pieces)) continue;
  add('Fractions', `A ${len}-meter rope is cut into pieces that are each ${a}/${b} meter long. How many pieces are there?`, pieces, [len * a / b, len * b, len + b, pieces / 2].map((v) => Math.round(v * 100) / 100),
    `Dividing by a fraction = **multiply by its flip**.\nStep 1: ${len} ÷ ${a}/${b} = ${len} × ${b}/${a}\nStep 2: ${len} × ${b} = ${len * b}\nStep 3: ${len * b} ÷ ${a} = **${pieces}**`, (v) => `${fmt(v)} pieces`);
}

/* ---------- Decimals: money and measures ---------- */
some(grid([12.5, 18.75, 23.5, 37.25, 45.6, 52.75, 64.3, 89.95], [15.25, 26.4, 31.5, 48.75, 7.85]), 26, 'dadd').forEach(([a, b]) => {
  const s = Math.round((a + b) * 100) / 100;
  add('Decimals', `A pencil costs ${P(a)} and an eraser costs ${P(b)}. How much do they cost together?`, s, [Math.round((s + 1) * 100) / 100, Math.round((s - 0.1) * 100) / 100, Math.round(Math.abs(a - b) * 100) / 100, Math.round((s + 0.1) * 100) / 100],
    `Line up the decimal points and add:\n= ${fmt(a)} + ${fmt(b)}\n= ${fmt(s)}\nTogether they cost **₱${s.toFixed(2)}**.`, (v) => '₱' + v.toFixed(2));
});
some(grid([500, 1000, 200, 100], [37.5, 64.25, 82.75, 125.5, 149.95, 18.6, 47.35, 76.8]), 24, 'dchange', ([bill, cost]) => bill > cost).forEach(([bill, cost]) => {
  const c = Math.round((bill - cost) * 100) / 100;
  add('Decimals', `You pay for a ${P(cost)} item with a ${P(bill)} bill. How much change should you get?`, c, [Math.round((c + 1) * 100) / 100, Math.round((c - 1) * 100) / 100, Math.round((c + 0.1) * 100) / 100, Math.round((bill - Math.floor(cost)) * 100) / 100],
    `Change = money given − cost:\n= ${fmt(bill)} − ${fmt(cost)}\n= ${fmt(c)}\nThe change is **₱${c.toFixed(2)}**.`, (v) => '₱' + v.toFixed(2));
});
some(grid([0.2, 0.4, 0.5, 1.5, 2.5, 0.25, 1.2, 0.3], [0.3, 0.6, 1.5, 2.4, 3.2, 0.8, 1.25]), 26, 'dmul').forEach(([a, b]) => {
  const r = Math.round(a * b * 10000) / 10000;
  const places = (String(a).split('.')[1] || '').length + (String(b).split('.')[1] || '').length;
  add('Decimals', `What is ${a} × ${b}?`, r, [r * 10, r / 10, Math.round((a + b) * 100) / 100, Math.round(r * 100 + 1) / 100].map((v) => Math.round(v * 10000) / 10000),
    `Step 1: Multiply without the dots: ${String(a).replace('.', '').replace(/^0+/, '')} × ${String(b).replace('.', '').replace(/^0+/, '')} = ${Number(String(a).replace('.', '')) * Number(String(b).replace('.', ''))}.\nStep 2: Count the decimal places: ${a} has ${(String(a).split('.')[1] || '').length}, ${b} has ${(String(b).split('.')[1] || '').length}, so the answer has **${places}**.\nStep 3: The answer is **${r}**.`, (v) => String(v));
});
some(grid([2.4, 3.6, 4.8, 7.2, 9.6, 1.2, 6.4, 8.1], [0.2, 0.3, 0.4, 0.6, 0.8, 0.9]), 22, 'ddiv', ([a, b]) => Number.isInteger(Math.round(a * 1000) / Math.round(b * 1000))).forEach(([a, b]) => {
  const r = Math.round(a * 1000) / Math.round(b * 1000);
  add('Decimals', `What is ${a} ÷ ${b}?`, r, [r / 10, r * 10, Math.round(a * b * 100) / 100, r + 1],
    `Step 1: Move the dot in ${b} one place to the right to make it a whole number: ${b} → ${Math.round(b * 10)}.\nStep 2: Move the dot in ${a} the same way: ${a} → ${Math.round(a * 10)}.\nStep 3: ${Math.round(a * 10)} ÷ ${Math.round(b * 10)} = **${r}**`, (v) => String(v));
});

/* ---------- Basic operations: order of operations (PEMDAS) ---------- */
const PEM = [];
for (const a of [4, 6, 8, 12, 15, 18, 20, 24]) for (const b of [2, 3, 5]) for (const c of [3, 4, 6]) PEM.push([a, b, c]);
some(PEM, 30, 'pem1').forEach(([a, b, c]) => {
  const r = a + b * c;
  add('Basic Operations', `What is ${a} + ${b} × ${c}?`, r, [(a + b) * c, a * b + c, r + c, a + b + c],
    `Use **PEMDAS**: multiply before you add.\nStep 1: ${b} × ${c} = ${b * c}\nStep 2: ${a} + ${b * c} = **${r}**\n!!Trap!!: adding first gives (${a} + ${b}) × ${c} = ${(a + b) * c}, which is wrong.`);
});
some(PEM, 26, 'pem2', ([a, b, c]) => a % b === 0).forEach(([a, b, c]) => {
  const r = a / b + c * c;
  add('Basic Operations', `What is ${a} ÷ ${b} + ${c}²?`, r, [(a / b + c) ** 2, a / b + c * 2, a / (b + c * c), r + 1].map((v) => Math.round(v * 100) / 100),
    `Use **PEMDAS**: exponents first, then divide, then add.\nStep 1: ${c}² = ${c} × ${c} = ${c * c}\nStep 2: ${a} ÷ ${b} = ${a / b}\nStep 3: ${a / b} + ${c * c} = **${r}**`, fmt);
});
some(PEM, 26, 'pem3', ([a, b, c]) => a > b).forEach(([a, b, c]) => {
  const r = (a - b) * c;
  add('Basic Operations', `What is (${a} − ${b}) × ${c}?`, r, [a - b * c, a * c - b, r + b, a - b + c].map((v) => v),
    `Parentheses first.\nStep 1: ${a} − ${b} = ${a - b}\nStep 2: ${a - b} × ${c} = **${r}**`, (v) => String(v), true);
});

/* ---------- Basic operations: signed numbers (integers) ---------- */
for (const [a, b, op] of [[-8, 5, '+'], [-12, -7, '+'], [9, -15, '+'], [-6, 14, '+'], [-20, 8, '+'], [-3, -9, '+'], [15, -4, '+'],
  [7, 12, '−'], [-5, 9, '−'], [-10, -4, '−'], [6, -8, '−'], [-15, -20, '−'], [3, 11, '−'], [-7, 7, '−'],
  [-6, 7, '×'], [-8, -5, '×'], [9, -4, '×'], [-12, 3, '×'], [-11, -2, '×'], [7, -7, '×'],
  [-48, 6, '÷'], [-56, -8, '÷'], [63, -9, '÷'], [-90, 10, '÷'], [-36, -4, '÷'], [72, -8, '÷']]) {
  const r = op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b;
  const show = (x) => (x < 0 ? `(${x})` : `${x}`);
  const rule = op === '×' || op === '÷' ? `Same signs give **+**, different signs give **−**. Here the signs are ${(a < 0) === (b < 0) ? 'the same' : 'different'}, so the answer is ${r < 0 ? 'negative' : 'positive'}.`
    : op === '+' ? (Math.sign(a) === Math.sign(b) ? 'Same signs: **add** the numbers and keep the sign.' : 'Different signs: **subtract** the smaller size from the bigger one and keep the sign of the bigger one.')
    : `Subtracting is **adding the opposite**: ${show(a)} − ${show(b)} = ${show(a)} + ${show(-b)}.`;
  add('Basic Operations', `What is ${show(a)} ${op} ${show(b)}?`, r, [-r, r + (r > 0 ? 2 : -2), op === '−' ? a + b : op === '+' ? a - b : Math.abs(r) + 1, r === 0 ? 1 : r * 2].map((v) => v),
    `${rule}\n= ${r}`, (v) => String(v), true);
}

/* ---------- Basic operations: squares, cubes and roots ---------- */
for (const n of [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 25]) {
  add('Basic Operations', `What is the square root of ${n * n}?`, n, [n + 1, n - 1, n * n / 2, n * 2],
    `The square root of ${n * n} is the number that times itself gives ${n * n}.\n= ${n} × ${n} = ${n * n}, so √${fmt(n * n)} = **${n}**.`, fmt);
}
for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 10]) {
  add('Basic Operations', `What is ${n}³ (${n} cubed)?`, n ** 3, [n * 3, n * n, n ** 3 + n, (n + 1) ** 3],
    `${n}³ means ${n} × ${n} × ${n} (not ${n} × 3).\nStep 1: ${n} × ${n} = ${n * n}\nStep 2: ${n * n} × ${n} = **${n ** 3}**\n!!Trap!!: ${n} × 3 = ${n * 3} is wrong.`, fmt);
}
for (const [b, e] of [[2, 5], [2, 6], [2, 7], [3, 4], [5, 3], [10, 4], [2, 8], [3, 5], [4, 3], [10, 5], [2, 10], [6, 3]]) {
  add('Basic Operations', `What is ${b} to the power of ${e} (${b}^${e})?`, b ** e, [b * e, b ** (e - 1), b ** e + b, e ** b],
    `${b}^${e} means ${e} copies of ${b} multiplied: ${Array(e).fill(b).join(' × ')}\n= **${fmt(b ** e)}**`, fmt);
}

/* ---------- Number series (computed from rules) ---------- */
const SERIES = [];
for (const [start, step] of [[3, 4], [7, 6], [12, 9], [5, 11], [100, -7], [81, -6], [2, 13], [45, -4], [17, 8], [60, -9], [8, 15], [1, 12]]) SERIES.push({ terms: [0, 1, 2, 3, 4].map((k) => start + k * step), next: start + 5 * step, why: `Each number ${step > 0 ? 'goes up' : 'goes down'} by **${Math.abs(step)}**.` });
for (const [start, r] of [[2, 3], [3, 2], [5, 2], [1, 4], [4, 3], [1, 5], [7, 2], [2, 4], [6, 2], [3, 3]]) SERIES.push({ terms: [0, 1, 2, 3, 4].map((k) => start * r ** k), next: start * r ** 5, why: `Each number is **multiplied by ${r}**.` });
for (const [start, r] of [[3200, 2], [729, 3], [4096, 4], [6250, 5], [1536, 2]]) SERIES.push({ terms: [0, 1, 2, 3, 4].map((k) => start / r ** k), next: start / r ** 5, why: `Each number is **divided by ${r}**.` });
for (const s of [1, 2, 3, 4, 5]) SERIES.push({ terms: [0, 1, 2, 3, 4].map((k) => (s + k) ** 2), next: (s + 5) ** 2, why: `They are **squares**: ${[0, 1, 2, 3, 4].map((k) => `${s + k}²`).join(', ')}, so next is ${s + 5}².` });
for (const s of [1, 2]) SERIES.push({ terms: [0, 1, 2, 3, 4].map((k) => (s + k) ** 3), next: (s + 5) ** 3, why: `They are **cubes**: ${[0, 1, 2, 3, 4].map((k) => `${s + k}³`).join(', ')}, so next is ${s + 5}³.` });
for (const [start, d0, dd] of [[2, 2, 2], [1, 1, 1], [5, 3, 2], [10, 2, 3], [3, 4, 1], [4, 1, 2], [7, 5, 5], [1, 2, 4]]) {
  const terms = [start]; let d = d0;
  for (let k = 0; k < 5; k++) { terms.push(terms[terms.length - 1] + d); d += dd; }
  SERIES.push({ terms: terms.slice(0, 5), next: terms[5], why: `The gaps grow: ${terms.slice(1, 6).map((t, k) => `+${t - terms[k]}`).join(', ')} (each gap is **${dd} more** than the last).` });
}
for (const [a, b, sa, sb] of [[1, 20, 2, -2], [5, 30, 5, -3], [2, 50, 3, -5], [10, 3, 10, 3], [4, 40, 4, -4], [3, 100, 3, -10]]) {
  const terms = [a, b, a + sa, b + sb, a + 2 * sa, b + 2 * sb];
  SERIES.push({ terms: terms.slice(0, 5), next: terms[5], why: `Two series take turns: ${[a, a + sa, a + 2 * sa].join(', ')} (${sa > 0 ? '+' : ''}${sa}) and ${[b, b + sb].join(', ')}, … (${sb > 0 ? '+' : ''}${sb}). The next one belongs to the second series.` });
}
for (const [start, m, ad] of [[1, 2, 1], [2, 2, 1], [3, 2, -1], [1, 3, 1], [2, 3, -1], [5, 2, -2]]) {
  const terms = [start];
  for (let k = 0; k < 5; k++) terms.push(terms[terms.length - 1] * m + ad);
  SERIES.push({ terms: terms.slice(0, 5), next: terms[5], why: `Each number is **× ${m}, then ${ad > 0 ? '+' : '−'} ${Math.abs(ad)}**.` });
}
SERIES.forEach(({ terms, next, why }) => {
  const gap = terms[4] - terms[3];
  add('Number Series', `What number comes next: ${terms.join(', ')}, ___?`, next, [terms[4] + gap, next + 1, next - 1, next + gap, terms[4] * 2].filter((v) => v !== next),
    `${why}\nSo the next number is **${fmt(next)}**.`, fmt, true);
});

/* ---------- Algebra: equations ---------- */
some(grid([2, 3, 4, 5, 6, 7, 8, 9], [3, 5, 7, 11, 13], [4, 6, 8, 9, 12, 15]), 34, 'eq1').forEach(([a, b, x]) => {
  const c = a * x - b;
  add('Algebra', `Solve for x: ${a}x − ${b} = ${c}`, x, [(c - b) / a, c / a, x + 1, (c + b) * a].map((v) => Math.round(v * 100) / 100),
    `Step 1: Add ${b} to both sides: ${a}x = ${c} + ${b} = ${c + b}\nStep 2: Divide both sides by ${a}: x = ${c + b} ÷ ${a} = **${x}**\nCheck: ${a} × ${x} − ${b} = ${c} ✓`, (v) => `x = ${fmt(v)}`);
});
some(grid([5, 6, 7, 8, 9], [2, 3, 4], [4, 6, 8, 10, 12], [2, 3, 5, 6, 7]), 30, 'eq2', ([a, b]) => a > b).forEach(([a, b, c, x]) => {
  const d = (a - b) * x + c;
  add('Algebra', `Solve for x: ${a}x + ${c} = ${b}x + ${d}`, x, [(d - c) / (a + b), (d + c) / (a - b), x + 1, d - c].map((v) => Math.round(v * 100) / 100),
    `Step 1: Move the x's to one side: ${a}x − ${b}x = ${a - b}x.\nStep 2: Move the numbers to the other side: ${d} − ${c} = ${d - c}.\nStep 3: ${a - b}x = ${d - c}, so x = ${d - c} ÷ ${a - b} = **${x}**`, (v) => `x = ${fmt(v)}`);
});
for (const [n, sum] of [[3, 45], [3, 66], [3, 93], [3, 120], [4, 46], [4, 74], [4, 130], [5, 75], [5, 115], [5, 160], [3, 36], [4, 90]]) {
  const first = (sum - n * (n - 1) / 2) / n;
  if (!Number.isInteger(first)) continue;
  add('Algebra', `The sum of ${n} consecutive whole numbers is ${sum}. What is the smallest number?`, first, [sum / n, first + 1, first - 1, first + n - 1],
    `Let the numbers be x, x + 1${n > 2 ? ', x + 2' : ''}${n > 3 ? ', x + 3' : ''}${n > 4 ? ', x + 4' : ''}.\nStep 1: Their sum: ${n}x + ${n * (n - 1) / 2} = ${sum}\nStep 2: ${n}x = ${sum} − ${n * (n - 1) / 2} = ${sum - n * (n - 1) / 2}\nStep 3: x = ${sum - n * (n - 1) / 2} ÷ ${n} = **${first}**`, fmt);
}
for (const [n, sum] of [[3, 57], [3, 81], [3, 123], [4, 64], [4, 112], [5, 75], [3, 33], [4, 40], [5, 125], [3, 105]]) {
  const first = (sum - n * (n - 1)) / n;
  if (!Number.isInteger(first) || first % 2 === 0) continue;
  add('Algebra', `The sum of ${n} consecutive odd numbers is ${sum}. What is the largest of them?`, first + 2 * (n - 1), [first, sum / n, first + 2 * n, first + n - 1],
    `Consecutive odd numbers are 2 apart: x, x + 2, x + 4${n > 3 ? ', x + 6' : ''}${n > 4 ? ', x + 8' : ''}.\nStep 1: ${n}x + ${n * (n - 1)} = ${sum}, so ${n}x = ${sum - n * (n - 1)} and x = **${first}**.\nStep 2: The largest is x + ${2 * (n - 1)} = **${first + 2 * (n - 1)}**.`, fmt);
}
for (const [x, y] of [[12, 7], [15, 9], [20, 13], [25, 17], [31, 19], [40, 22], [18, 5], [27, 14], [33, 21], [45, 30], [50, 26], [16, 11]]) {
  add('Algebra', `The sum of two numbers is ${x + y} and their difference is ${x - y}. What is the larger number?`, x, [y, (x + y) / 2, x + 1, x - y].map((v) => Math.round(v * 10) / 10),
    `Step 1: Add the two facts: (sum + difference) = 2 × larger.\nStep 2: ${x + y} + ${x - y} = ${2 * x}\nStep 3: Larger = ${2 * x} ÷ 2 = **${x}** (and the smaller is ${x + y} − ${x} = ${y}).`, fmt);
}

/* ---------- Age problems ---------- */
for (const [k, now, gap] of [[2, 10, 5], [3, 8, 4], [2, 12, 6], [3, 6, 6], [2, 15, 5], [4, 5, 5], [2, 9, 3], [3, 10, 10], [2, 14, 7], [5, 4, 4], [3, 12, 4], [2, 20, 10], [4, 7, 7], [2, 11, 11], [3, 7, 7]]) {
  // In gap years, parent is k times the child's age then.
  const parent = k * (now + gap) - gap;
  if (parent <= now + 15 || parent > 70) continue;
  add('Age Problem', `A father is ${parent} years old and his son is ${now}. In ${gap} years, the father will be how many times as old as the son?`, k, [k + 1, Math.round(parent / now * 10) / 10, k > 2 ? k - 1 : k + 2, k * 2],
    `Step 1: In ${gap} years: father = ${parent} + ${gap} = **${parent + gap}**, son = ${now} + ${gap} = **${now + gap}**.\nStep 2: ${parent + gap} ÷ ${now + gap} = **${k}**.`, (v) => `${fmt(v)} times`);
}
for (const [a, diff, yrs] of [[8, 4, 5], [12, 6, 3], [15, 3, 4], [6, 10, 2], [20, 5, 5], [9, 7, 6], [11, 13, 4], [14, 2, 8], [7, 9, 3], [18, 4, 2], [10, 25, 5], [5, 30, 10]]) {
  const b = a + diff, sum = a + b + 2 * yrs;
  add('Age Problem', `Liza is ${diff} years older than Miko. In ${yrs} years, the sum of their ages will be ${sum}. How old is Miko now?`, a, [a + yrs, b, (sum - diff) / 2, a - 1].map((v) => Math.round(v * 10) / 10),
    `Let Miko's age now be **m**. Liza is m + ${diff}.\nStep 1: In ${yrs} years: (m + ${yrs}) + (m + ${diff} + ${yrs}) = ${sum}\nStep 2: 2m + ${diff + 2 * yrs} = ${sum}, so 2m = ${sum - diff - 2 * yrs}\nStep 3: m = **${a}**`, (v) => `${fmt(v)} years old`);
}

/* ---------- Work problems: two people together ---------- */
for (const [a, b] of [[3, 6], [4, 12], [6, 12], [10, 15], [12, 24], [6, 3], [20, 30], [8, 24], [9, 18], [5, 20], [12, 6], [15, 30], [18, 9], [4, 4], [10, 10], [30, 60], [14, 35], [21, 42]]) {
  const t = a * b / (a + b);
  if (!Number.isInteger(t)) continue;
  add('Work Problem', `Rey can encode a batch of records in ${a} hours. Tess can do it in ${b} hours. How long will it take them working together?`, t, [(a + b) / 2, a + b, Math.min(a, b), t + 1],
    `Shortcut for two workers: **T = (A × B) ÷ (A + B)**.\nStep 1: A × B = ${a} × ${b} = ${a * b}\nStep 2: A + B = ${a} + ${b} = ${a + b}\nStep 3: ${a * b} ÷ ${a + b} = **${t} hours**.\n!!Trap!!: the time together is LESS than either one alone.`, (v) => `${fmt(v)} hours`);
}
for (const [a, t] of [[6, 4], [12, 4], [10, 6], [15, 10], [20, 12], [30, 12], [24, 8], [9, 6], [36, 12], [40, 24]]) {
  const b = a * t / (a - t);
  if (!Number.isInteger(b)) continue;
  add('Work Problem', `Working together, two clerks finish a report in ${t} hours. One of them alone takes ${a} hours. How long would the other clerk take alone?`, b, [a - t, a + t, a * t / (a + t), b + t].map((v) => Math.round(v * 10) / 10),
    `Work in 1 hour: together 1/${t}, first clerk 1/${a}.\nStep 1: Second clerk = 1/${t} − 1/${a} = ${a - t}/${a * t} = ${frac(a - t, a * t)} of the work in 1 hour.\nStep 2: So the second clerk alone takes **${b} hours**.`, (v) => `${fmt(v)} hours`);
}

/* ---------- Distance, rate and time ---------- */
some(grid([40, 45, 50, 60, 72, 80, 90], [2, 3, 4, 5, 1.5, 2.5]), 26, 'drt').forEach(([r, t]) => {
  const d = r * t;
  if (!Number.isInteger(d)) return;
  add('Distance, Rate, Time', `A bus travels at ${r} km/h for ${fmt(t)} hours. How far does it go?`, d, [r + t, d / 2, r * (t + 1), d + r].map((v) => Math.round(v * 10) / 10),
    `**D = R × T**\n= ${r} × ${fmt(t)}\n= ${fmt(d)} km`, (v) => `${fmt(v)} km`);
});
some(grid([120, 150, 180, 240, 300, 360, 450], [40, 50, 60, 75, 90]), 26, 'tdr', ([d, r]) => d % r === 0 || (d * 2) % r === 0).forEach(([d, r]) => {
  const t = d / r;
  const show = (v) => (Number.isInteger(v) ? `${v} hours` : `${Math.floor(v)} hours ${Math.round((v % 1) * 60)} minutes`);
  add('Distance, Rate, Time', `How long will it take a van to travel ${d} km at ${r} km/h?`, t, [t + 1, t + 0.5, r / d * 100, t * 2].filter((v) => v > 0),
    `**T = D ÷ R**\n= ${d} ÷ ${r}\n= ${fmt(t)} hours${Number.isInteger(t) ? '' : ` = ${show(t)}`}`, show);
});
for (const [v1, v2, head] of [[40, 60, 1], [30, 45, 2], [50, 70, 2], [60, 80, 1], [45, 60, 1], [36, 48, 2], [20, 30, 3], [50, 75, 1], [40, 50, 2], [54, 72, 1], [24, 32, 3], [60, 90, 2]]) {
  const t = v1 * head / (v2 - v1);
  if (!Number.isInteger(t * 2)) continue;
  add('Distance, Rate, Time', `A truck leaves at ${v1} km/h. ${head} hour${head > 1 ? 's' : ''} later, a car leaves the same place on the same road at ${v2} km/h. How many hours after the car leaves will it catch up?`, t,
    [v1 * head / v2, t + head, (v2 - v1) * head / v1, t * 2].map((v) => Math.round(v * 100) / 100),
    `Step 1: Head start of the truck: ${v1} × ${head} = **${v1 * head} km**.\nStep 2: The car gains ${v2} − ${v1} = **${v2 - v1} km** every hour.\nStep 3: Time to close the gap: ${v1 * head} ÷ ${v2 - v1} = **${fmt(t)} hours**.`, (v) => `${fmt(v)} hours`);
}
for (const [d, a, b] of [[60, 30, 60], [120, 40, 60], [90, 30, 90], [240, 60, 40], [100, 50, 25], [180, 60, 90], [150, 50, 75], [80, 40, 80], [300, 50, 75], [72, 24, 72]]) {
  const avg = 2 * d / (d / a + d / b);
  if (!Number.isInteger(avg)) continue;
  add('Distance, Rate, Time', `A car goes ${d} km to a town at ${a} km/h and comes back the same way at ${b} km/h. What is its average speed for the whole trip?`, avg, [(a + b) / 2, avg + 5, Math.max(a, b), avg - 4],
    `Average speed = **total distance ÷ total time** (not the average of the two speeds).\nStep 1: Time going: ${d} ÷ ${a} = ${fmt(d / a)} h. Time back: ${d} ÷ ${b} = ${fmt(d / b)} h.\nStep 2: Total distance ${2 * d} km, total time ${fmt(d / a + d / b)} h.\nStep 3: ${2 * d} ÷ ${fmt(d / a + d / b)} = **${avg} km/h**.\n!!Trap!!: (${a} + ${b}) ÷ 2 = ${fmt((a + b) / 2)} is wrong.`, (v) => `${fmt(v)} km/h`);
}

/* ---------- Geometry ---------- */
some(grid([5, 6, 8, 9, 10, 12, 15, 18, 20, 25], [3, 4, 7, 11, 14]), 30, 'rect').forEach(([l, w]) => {
  add('Geometry', `A rectangular lot is ${l} m long and ${w} m wide. What is its perimeter?`, 2 * (l + w), [l * w, l + w, 2 * l + w, 4 * l],
    `Perimeter of a rectangle = **2 × (length + width)**.\nStep 1: ${l} + ${w} = ${l + w}\nStep 2: 2 × ${l + w} = **${2 * (l + w)} m**\n!!Trap!!: ${l * w} is the area, not the perimeter.`, (v) => `${v} m`);
});
for (const s of [4, 5, 6, 7, 8, 9, 11, 12, 13, 15, 16, 20, 25, 30]) {
  add('Geometry', `A square garden has an area of ${s * s} square meters. How long is one side?`, s, [s * s / 4, s * 2, s + 1, s * 4],
    `Area of a square = **side × side**. Find the number that times itself gives ${s * s}.\n= ${s} × ${s} = ${s * s}\nSo one side is **${s} m**.\n!!Trap!!: ${s * s} ÷ 4 = ${fmt(s * s / 4)} is not the side.`, (v) => `${fmt(v)} m`);
  add('Geometry', `What is the perimeter of a square with sides of ${s} cm?`, 4 * s, [s * s, 2 * s, 4 * s + 4, 3 * s],
    `Perimeter of a square = **4 × side** = 4 × ${s} = **${4 * s} cm**.`, (v) => `${v} cm`);
}
some(grid([6, 8, 9, 12, 15, 16, 18, 24], [5, 7, 10, 13, 20]), 22, 'rectw').forEach(([l, w]) => {
  add('Geometry', `A rectangle has an area of ${l * w} square cm. If its length is ${l} cm, what is its width?`, w, [l * w - l, w + 1, (l * w) / 2 - l, l].map((v) => v),
    `Area = length × width, so **width = area ÷ length**.\n${divStep('Width', l * w, l)}\nThe width is **${w} cm**.`, (v) => `${v} cm`);
});
for (const [a, b, c] of [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17], [12, 16, 20], [7, 24, 25], [15, 20, 25], [10, 24, 26], [20, 21, 29], [9, 40, 41], [12, 35, 37], [18, 24, 30], [16, 30, 34]]) {
  add('Geometry', `A right triangle has legs of ${a} cm and ${b} cm. How long is the hypotenuse (the longest side)?`, c, [a + b, c + 1, Math.round(Math.sqrt(a * b)), b + 1],
    `Use the **Pythagorean theorem**: c² = a² + b².\nStep 1: ${a}² + ${b}² = ${a * a} + ${b * b} = ${a * a + b * b}\nStep 2: c = √${a * a + b * b} = **${c} cm** (because ${c} × ${c} = ${c * c}).`, (v) => `${v} cm`);
}
for (const x of [25, 32, 38, 41, 47, 53, 58, 64, 72, 77, 83, 18]) {
  add('Geometry', `What is the complement of a ${x}° angle?`, 90 - x, [180 - x, 90 + x, 360 - x, x],
    `Two angles are **complementary** if they add up to **90°**.\n= 90 − ${x}\n= ${90 - x}°`, (v) => `${v}°`);
}
for (const x of [35, 48, 65, 72, 95, 110, 124, 137, 150, 158, 22, 84]) {
  add('Geometry', `What is the supplement of a ${x}° angle?`, 180 - x, [90 - x, 360 - x, 180 + x, x].filter((v) => v > 0),
    `Two angles are **supplementary** if they add up to **180°**.\n= 180 − ${x}\n= ${180 - x}°`, (v) => `${v}°`);
}
for (const [n, nm] of [[5, 'pentagon'], [6, 'hexagon'], [7, 'heptagon'], [8, 'octagon'], [9, 'nonagon'], [10, 'decagon'], [12, 'dodecagon']]) {
  add('Geometry', `What is the sum of the inside (interior) angles of a ${nm} (${n} sides)?`, (n - 2) * 180, [n * 180, (n - 1) * 180, 360, n * 90],
    `Sum of interior angles = **(n − 2) × 180°**.\nStep 1: ${n} − 2 = ${n - 2}\nStep 2: ${n - 2} × 180 = **${(n - 2) * 180}°**`, (v) => `${fmt(v)}°`);
}
for (const [a, b, h] of [[6, 10, 4], [8, 12, 5], [5, 9, 6], [10, 14, 7], [4, 8, 3], [12, 18, 10], [7, 13, 8], [9, 15, 6], [11, 17, 4], [3, 11, 5]]) {
  const area = (a + b) * h / 2;
  add('Geometry', `A trapezoid has parallel sides of ${a} m and ${b} m, and a height of ${h} m. What is its area?`, area, [(a + b) * h, a * b * h / 2, (a + b + h), a * h + b],
    `Area of a trapezoid = **(a + b) ÷ 2 × height**.\nStep 1: ${a} + ${b} = ${a + b}\nStep 2: ${a + b} ÷ 2 = ${(a + b) / 2}\nStep 3: ${(a + b) / 2} × ${h} = **${fmt(area)} square meters**`, (v) => `${fmt(v)} m²`);
}
for (const [r, h] of [[7, 10], [7, 5], [14, 10], [7, 20], [14, 5], [21, 10], [7, 2], [14, 3], [21, 4], [7, 12]]) {
  const v = 22 / 7 * r * r * h;
  add('Geometry', `What is the volume of a cylinder with a radius of ${r} cm and a height of ${h} cm? (Use π = 22/7)`, v, [22 / 7 * r * h * 2, 22 / 7 * r * r, v * 2, 2 * 22 / 7 * r * h].map((x) => Math.round(x)),
    `Volume of a cylinder = **π × r × r × h**.\nStep 1: r × r = ${r} × ${r} = ${r * r}\nStep 2: 22/7 × ${r * r} = ${22 * r * r / 7}\nStep 3: ${22 * r * r / 7} × ${h} = **${fmt(v)} cubic cm**`, (x) => `${fmt(x)} cm³`);
}

/* ---------- Measurement ---------- */
for (const c of [0, 10, 20, 25, 30, 35, 40, 50, 60, 100, -10, 15, 45, 5]) {
  const f = c * 9 / 5 + 32;
  add('Measurement', `What is ${c} °C in degrees Fahrenheit?`, f, [c * 5 / 9 + 32, c + 32, c * 9 / 5, f + 10].map((v) => Math.round(v * 10) / 10),
    `Use **°F = °C × 9/5 + 32**.\nStep 1: ${c} × 9 = ${c * 9}\nStep 2: ${c * 9} ÷ 5 = ${c * 9 / 5}\nStep 3: ${c * 9 / 5} + 32 = **${fmt(f)} °F**`, (v) => `${fmt(v)} °F`, true);
}
for (const [f, c] of [[212, 100], [32, 0], [50, 10], [68, 20], [77, 25], [86, 30], [95, 35], [104, 40], [113, 45], [122, 50], [59, 15], [41, 5]]) {
  add('Measurement', `What is ${f} °F in degrees Celsius?`, c, [f - 32, (f - 32) * 9 / 5, c + 10, f / 2].map((v) => Math.round(v * 10) / 10),
    `Use **°C = (°F − 32) × 5/9**.\nStep 1: ${f} − 32 = ${f - 32}\nStep 2: ${f - 32} × 5 = ${(f - 32) * 5}\nStep 3: ${(f - 32) * 5} ÷ 9 = **${c} °C**`, (v) => `${fmt(v)} °C`, true);
}
for (const ha of [2, 3, 5, 1.5, 2.5, 4, 0.5, 10, 12, 0.25]) {
  add('Measurement', `A farm is ${ha} hectares. How many square meters is that? (1 hectare = 10,000 m²)`, ha * 10000, [ha * 1000, ha * 100000, ha * 100, ha * 10000 + 1000],
    `1 hectare = **10,000 m²**.\n= ${ha} × 10,000\n= **${fmt(ha * 10000)} m²**`, (v) => `${fmt(v)} m²`);
}
for (const m of [75, 90, 105, 130, 150, 165, 200, 225, 250, 320, 95, 140]) {
  add('Measurement', `How many hours and minutes are there in ${m} minutes?`, m, [m + 60, m - 10, m + 10, m + 20].map((v) => v),
    `60 minutes = 1 hour.\nStep 1: ${m} ÷ 60 = ${Math.floor(m / 60)} remainder ${m % 60}.\nSo ${m} minutes = **${Math.floor(m / 60)} hour${Math.floor(m / 60) > 1 ? 's' : ''} and ${m % 60} minutes**.`,
    (v) => `${Math.floor(v / 60)} hour${Math.floor(v / 60) === 1 ? '' : 's'} and ${v % 60} minutes`);
}
for (const [kmh] of [[36], [54], [72], [90], [108], [18], [126], [144]]) {
  const ms = kmh * 1000 / 3600;
  add('Measurement', `A train runs at ${kmh} km/h. What is that speed in meters per second?`, ms, [kmh / 60, kmh * 1000 / 60, ms * 2, kmh / 3.6 + 5].map((v) => Math.round(v * 10) / 10),
    `Step 1: ${kmh} km = ${fmt(kmh * 1000)} m, and 1 hour = 3,600 seconds.\nStep 2: ${fmt(kmh * 1000)} ÷ 3,600 = **${fmt(ms)} m/s**.\nShortcut: divide km/h by **3.6**.`, (v) => `${fmt(v)} m/s`);
}

/* ---------- Time: from one clock time to another, and overtime pay ---------- */
for (const [h1, m1, h2, m2] of [[8, 15, 11, 40], [7, 50, 10, 5], [9, 30, 13, 10], [6, 45, 9, 20], [10, 20, 14, 5], [1, 35, 4, 10], [8, 0, 17, 0], [7, 30, 16, 45], [11, 50, 15, 25],
  [5, 55, 8, 30], [9, 10, 12, 0], [13, 15, 17, 50], [6, 20, 10, 15], [12, 40, 15, 5], [8, 45, 12, 30], [14, 5, 18, 40], [7, 15, 9, 55], [10, 35, 12, 20], [9, 50, 16, 10], [6, 30, 8, 5]]) {
  const mins = h2 * 60 + m2 - (h1 * 60 + m1);
  const clock = (h, m) => `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'a.m.' : 'p.m.'}`;
  const show = (v) => `${Math.floor(v / 60)} hour${Math.floor(v / 60) === 1 ? '' : 's'} and ${v % 60} minutes`;
  if (mins % 60 === 0) continue;
  add('Time', `An office worker was at work from ${clock(h1, m1)} to ${clock(h2, m2)} without leaving. How long was the worker at work?`, mins, [mins + 60, mins - 60, mins + 20, mins - 10, mins + 40],
    `Step 1: From ${clock(h1, m1)} to ${clock(h1 + 1, 0)} is ${60 - m1} minutes.\nStep 2: From ${clock(h1 + 1, 0)} to ${clock(h2, 0)} is ${h2 - h1 - 1} hour${h2 - h1 - 1 === 1 ? '' : 's'}.\nStep 3: From ${clock(h2, 0)} to ${clock(h2, m2)} is ${m2} minutes.\nTotal: ${h2 - h1 - 1} hour${h2 - h1 - 1 === 1 ? '' : 's'} and ${60 - m1 + m2} minutes${60 - m1 + m2 >= 60 ? ` (${60 - m1 + m2} minutes = 1 hour and ${60 - m1 + m2 - 60} minutes)` : ''} = **${show(mins)}**.`, show);
}
some(grid([80, 100, 120, 160, 200], [2, 3, 4, 5, 6]), 22, 'ot').forEach(([rate, hrs], i) => {
  const ot = rate * 1.25, pay = 8 * rate + hrs * ot;
  add('Word Problem', `${name(i + 4)} earns ${P(rate)} an hour for 8 hours a day. Overtime is paid at 125% of the hourly rate. How much does ${name(i + 4)} earn on a day with ${hrs} hours of overtime?`, pay,
    [8 * rate + hrs * rate, (8 + hrs) * ot, 8 * rate + hrs * rate * 2, 8 * rate].map((v) => Math.round(v * 100) / 100),
    `Step 1: Regular pay: 8 × ${P(rate)} = **${P(8 * rate)}**.\nStep 2: Overtime rate: 125% of ${P(rate)} = ${P(rate)} + ${P(rate / 4)} = **${P(ot)}** an hour.\nStep 3: Overtime pay: ${hrs} × ${P(ot)} = **${P(hrs * ot)}**.\nStep 4: Total: ${P(8 * rate)} + ${P(hrs * ot)} = **${P(pay)}**.`, P);
});

/* ---------- Average ---------- */
for (const [a, n1, b, n2] of [[80, 20, 90, 30], [75, 10, 85, 30], [70, 40, 80, 10], [88, 25, 78, 25], [90, 15, 75, 15], [82, 30, 92, 20], [60, 10, 90, 20], [85, 12, 95, 8], [72, 18, 84, 12], [78, 35, 88, 15]]) {
  const avg = (a * n1 + b * n2) / (n1 + n2);
  if (!Number.isInteger(avg * 10)) continue;
  add('Average', `Section A (${n1} students) has an average score of ${a}. Section B (${n2} students) has an average of ${b}. What is the average score of all the students?`, avg,
    [(a + b) / 2, avg + 2, avg - 2, Math.max(a, b)].map((v) => Math.round(v * 10) / 10),
    `Step 1: Total of Section A: ${a} × ${n1} = ${a * n1}. Total of Section B: ${b} × ${n2} = ${b * n2}.\nStep 2: All points: ${a * n1} + ${b * n2} = ${a * n1 + b * n2}. All students: ${n1} + ${n2} = ${n1 + n2}.\nStep 3: ${a * n1 + b * n2} ÷ ${n1 + n2} = **${fmt(avg)}**\n!!Trap!!: (${a} + ${b}) ÷ 2 = ${fmt((a + b) / 2)} ignores that the sections have different sizes.`, fmt);
}
for (const [n, avg, left, newAvg] of [[5, 80, 1, 78], [4, 25, 1, 22], [6, 50, 1, 52], [5, 40, 1, 45], [10, 30, 1, 28], [8, 60, 1, 62], [4, 90, 1, 88], [5, 12, 1, 10], [6, 35, 1, 30], [7, 70, 1, 72]]) {
  const removed = n * avg - (n - left) * newAvg;
  if (removed <= 0) continue;
  add('Average', `The average of ${n} numbers is ${avg}. When one number is removed, the average of the rest becomes ${newAvg}. What number was removed?`, removed, [avg - newAvg, avg, removed + newAvg, n * avg - newAvg].filter((v) => v > 0),
    `Step 1: Sum of ${n} numbers: ${n} × ${avg} = **${n * avg}**.\nStep 2: Sum of the ${n - 1} left: ${n - 1} × ${newAvg} = **${(n - 1) * newAvg}**.\nStep 3: Removed number: ${n * avg} − ${(n - 1) * newAvg} = **${removed}**.`, fmt);
}
for (const [w1, s1, w2, s2] of [[60, 80, 40, 90], [70, 85, 30, 75], [50, 90, 50, 70], [40, 85, 60, 95], [30, 80, 70, 90], [80, 75, 20, 95], [25, 88, 75, 92], [20, 70, 80, 80]]) {
  const g = (w1 * s1 + w2 * s2) / 100;
  add('Average', `A final grade is ${w1}% exams and ${w2}% projects. A student scored ${s1} in exams and ${s2} in projects. What is the final grade?`, g, [(s1 + s2) / 2, g + 3, g - 3, s1].map((v) => Math.round(v * 10) / 10),
    `This is a **weighted average**.\nStep 1: Exams: ${s1} × ${w1}% = ${fmt(s1 * w1 / 100)}\nStep 2: Projects: ${s2} × ${w2}% = ${fmt(s2 * w2 / 100)}\nStep 3: ${fmt(s1 * w1 / 100)} + ${fmt(s2 * w2 / 100)} = **${fmt(g)}**`, fmt);
}

/* ---------- Statistics: median of an even list ---------- */
for (const list of [[12, 15, 18, 22], [5, 9, 11, 14, 20, 23], [30, 34, 40, 46], [7, 8, 10, 13, 15, 19], [45, 52, 60, 64], [3, 6, 9, 12, 15, 18], [21, 25, 29, 35, 40, 41],
  [10, 20, 30, 50], [14, 17, 21, 23, 28, 30], [2, 4, 8, 10], [55, 60, 70, 75, 80, 95], [11, 13, 19, 23], [16, 18, 24, 26, 30, 32], [8, 12, 20, 24]]) {
  const shuffled = [...list].sort((a, b) => ((a * 7) % 5) - ((b * 7) % 5) || b - a);
  const k = list.length / 2, med = (list[k - 1] + list[k]) / 2;
  add('Statistics', `What is the median of these numbers: ${shuffled.join(', ')}?`, med, [list[k - 1], list[k], list.reduce((s, v) => s + v, 0) / list.length, (shuffled[k - 1] + shuffled[k]) / 2].map((v) => Math.round(v * 100) / 100),
    `Step 1: Put them in order: ${list.join(', ')}.\nStep 2: There are ${list.length} numbers (even), so the median is the **average of the two middle ones**: ${list[k - 1]} and ${list[k]}.\nStep 3: (${list[k - 1]} + ${list[k]}) ÷ 2 = **${fmt(med)}**\n!!Trap!!: always sort first.`, fmt);
}

/* ---------- Probability: dice and coins ---------- */
const DICE = [['an even number', [2, 4, 6]], ['a number greater than 4', [5, 6]], ['a 3', [3]], ['a number less than 3', [1, 2]], ['a prime number', [2, 3, 5]],
  ['a multiple of 3', [3, 6]], ['an odd number', [1, 3, 5]], ['a number from 2 to 5', [2, 3, 4, 5]], ['a 6 or a 1', [1, 6]], ['a number that is not 4', [1, 2, 3, 5, 6]]];
for (const [what, ok] of DICE) {
  add('Probability', `A fair die (1 to 6) is rolled once. What is the probability of getting ${what}?`, frac(ok.length, 6), [frac(6 - ok.length, 6), `${ok.length}/${ok.length + 6}`, frac(1, ok.length + 1), frac(ok.length + 1, 6)].filter((v) => v !== '1' && v !== '0'),
    `Step 1: Possible results: 1, 2, 3, 4, 5, 6 (**6**).\nStep 2: Good results: ${ok.join(', ')} (**${ok.length}**).\nStep 3: Probability = ${ok.length}/6${frac(ok.length, 6) !== `${ok.length}/6` ? ` = **${frac(ok.length, 6)}**` : ''}`);
}
for (const [n, k] of [[2, 2], [2, 0], [3, 3], [3, 0], [2, 1], [3, 1], [3, 2], [4, 4]]) {
  const C = (a, b) => { let r = 1; for (let i = 0; i < b; i++) r = r * (a - i) / (i + 1); return r; };
  const ways = C(n, k), all = 2 ** n;
  add('Probability', `${n} coins are tossed. What is the probability of getting exactly ${k} head${k === 1 ? '' : 's'}?`, frac(ways, all), [frac(1, n + 1), frac(k || 1, n * 2), frac(ways + 1, all), frac(1, 2)].filter((v) => v !== frac(ways, all)),
    `Step 1: Each coin has 2 sides, so there are 2${'×2'.repeat(n - 1).replace(/×/g, ' × ')} = **${all}** outcomes.\nStep 2: Ways to get exactly ${k} head${k === 1 ? '' : 's'}: **${ways}**.\nStep 3: Probability = ${ways}/${all}${frac(ways, all) !== `${ways}/${all}` ? ` = **${frac(ways, all)}**` : ''}`);
}

/* ---------- Number sense: LCM, GCF, primes, divisibility ---------- */
for (const [a, b] of [[12, 18], [8, 12], [15, 20], [6, 14], [9, 12], [10, 25], [16, 24], [14, 21], [18, 24], [20, 30], [12, 15], [6, 10], [8, 20], [21, 28], [24, 36], [27, 36], [4, 10], [9, 15]]) {
  const g = gcd(a, b), l = a * b / g;
  add('Word Problem', `What is the least common multiple (LCM) of ${a} and ${b}?`, l, [g, a * b, l * 2, a + b].filter((v) => v !== l),
    `List the multiples until they meet:\n${a}: ${[...Array(l / a).keys()].map((k) => a * (k + 1)).join(', ')}\n${b}: ${[...Array(l / b).keys()].map((k) => b * (k + 1)).join(', ')}\nThe first one in both lists is **${l}**.`, fmt);
  add('Word Problem', `What is the greatest common factor (GCF) of ${a} and ${b}?`, g, [l, g * 2, Math.min(a, b), g === 1 ? 2 : g / 2].filter((v) => Number.isInteger(v) && v !== g),
    `Factors of ${a}: ${[...Array(a).keys()].map((k) => k + 1).filter((k) => a % k === 0).join(', ')}\nFactors of ${b}: ${[...Array(b).keys()].map((k) => k + 1).filter((k) => b % k === 0).join(', ')}\nThe biggest one in both lists is **${g}**.`, fmt);
}
const isPrime = (n) => n > 1 && [...Array(Math.floor(Math.sqrt(n)) - 1).keys()].every((k) => n % (k + 2) !== 0);
for (const group of [[21, 27, 29, 33], [39, 41, 45, 49], [51, 57, 59, 63], [77, 81, 83, 87], [91, 93, 97, 99], [15, 25, 31, 35], [33, 35, 37, 39], [65, 69, 71, 75], [85, 87, 89, 91], [111, 113, 115, 117], [119, 121, 123, 127], [143, 147, 149, 153]]) {
  const p = group.filter(isPrime);
  if (p.length !== 1) continue;
  const why = group.filter((x) => x !== p[0]).map((x) => { const f = [2, 3, 5, 7, 11, 13].find((d) => x % d === 0); return `${x} = ${f} × ${x / f}`; }).join('; ');
  add('Word Problem', `Which of these numbers is a prime number: ${group.join(', ').replace(/, (\d+)$/, ' or $1')}?`, String(p[0]), group.filter((x) => x !== p[0]).map(String),
    `A **prime** number can only be divided evenly by 1 and itself.\nThe others can be divided: ${why}.\nSo the prime is **${p[0]}**.`);
}
for (const [d, nums] of [[3, [1236, 2341, 5132, 7012]], [9, [4518, 3217, 6125, 2108]], [4, [3716, 2614, 5318, 7102]], [6, [2412, 3415, 5207, 1123]], [11, [1342, 2453, 3518, 4126]], [8, [3128, 2524, 4618, 5332]],
  [3, [8415, 7612, 5321, 4102]], [9, [7281, 6152, 3425, 8113]], [4, [9532, 6418, 7314, 2106]], [6, [5118, 4313, 2705, 6121]]]) {
  const ok = nums.filter((x) => x % d === 0);
  if (ok.length !== 1) continue;
  const rule = { 3: 'the sum of its digits can be divided by 3', 9: 'the sum of its digits can be divided by 9', 4: 'its last two digits make a number that can be divided by 4', 6: 'it is even AND the sum of its digits can be divided by 3', 11: 'the alternating sum of its digits (+ − + −) can be divided by 11', 8: 'its last three digits make a number that can be divided by 8' }[d];
  add('Word Problem', `Which number can be divided by ${d} with no remainder: ${nums.join(', ').replace(/, (\d+)$/, ' or $1')}?`, String(ok[0]), nums.filter((x) => x !== ok[0]).map(String),
    `A number can be divided by ${d} if **${rule}**.\nCheck: ${ok[0]} ÷ ${d} = ${ok[0] / d}, with no remainder.\nSo the answer is **${ok[0]}**.`);
}

/* ---------- Word problems: shopping and saving ---------- */
some(grid([[3, 'kilos of rice', 52], [2, 'packs of noodles', 18], [5, 'cans of tuna', 37], [4, 'bars of soap', 29], [6, 'eggs', 9], [2, 'liters of milk', 98]], [[1, 'bottle of vinegar', 26], [2, 'loaves of bread', 45], [3, 'cans of milk', 42]], [200, 500, 1000]), 30, 'shop').forEach(([[n1, i1, p1], [n2, i2, p2], bill], i) => {
  const total = n1 * p1 + n2 * p2;
  if (total >= bill) return;
  add('Word Problem', `${name(i + 9)} buys ${n1} ${i1} at ${P(p1)} each and ${n2} ${i2} at ${P(p2)} each, and pays with ${P(bill)}. How much is the change?`, bill - total, [total, bill - n1 * p1 - p2, bill - p1 - p2, bill - total + 10],
    `Step 1: ${n1} × ${P(p1)} = ${P(n1 * p1)}\nStep 2: ${n2} × ${P(p2)} = ${P(n2 * p2)}\nStep 3: Total: ${P(n1 * p1)} + ${P(n2 * p2)} = **${P(total)}**\nStep 4: Change: ${P(bill)} − ${P(total)} = **${P(bill - total)}**`, P);
});
for (const [goal, per, start] of [[5000, 250, 0], [12000, 800, 2000], [3600, 300, 600], [10000, 750, 1000], [8400, 600, 0], [15000, 1250, 0], [2500, 150, 400], [6000, 450, 600], [20000, 1500, 2000], [9000, 700, 600]]) {
  const weeks = Math.ceil((goal - start) / per);
  add('Word Problem', `A worker wants to save ${P(goal)}. ${start ? `They already have ${P(start)} and` : 'They'} save ${P(per)} a week. How many weeks will it take to reach the goal?`, weeks, [Math.ceil(goal / per), weeks - 1, weeks + 2, Math.floor((goal - start) / per) || weeks + 3].filter((v) => v !== weeks),
    `Step 1: Still needed: ${P(goal)}${start ? ` − ${P(start)} = ${P(goal - start)}` : ''}.\nStep 2: ${P(goal - start)} ÷ ${P(per)} = ${fmt((goal - start) / per)}${Number.isInteger((goal - start) / per) ? '' : `, so round UP (a part of a week still needs a full week)`}.\nIt takes **${weeks} weeks**.`, (v) => `${v} weeks`);
}
for (const [p1, n1, p2, n2] of [[45, 3, 70, 5], [120, 4, 175, 6], [38, 2, 95, 5], [60, 5, 115, 10], [24, 6, 45, 12], [150, 2, 210, 3], [80, 4, 190, 10], [33, 3, 52, 5], [65, 1, 300, 5], [99, 3, 160, 5]]) {
  const u1 = p1 / n1, u2 = p2 / n2, better = u1 < u2 ? `${n1} for ${P(p1)}` : `${n2} for ${P(p2)}`;
  if (u1 === u2) continue;
  add('Word Problem', `Which is the better buy: ${n1} pieces for ${P(p1)}, or ${n2} pieces for ${P(p2)}?`, better, [u1 < u2 ? `${n2} for ${P(p2)}` : `${n1} for ${P(p1)}`, 'They cost the same per piece', 'It cannot be known'],
    `Compare the price of **one piece**.\nStep 1: ${P(p1)} ÷ ${n1} = ${P(Math.round(u1 * 100) / 100)} each.\nStep 2: ${P(p2)} ÷ ${n2} = ${P(Math.round(u2 * 100) / 100)} each.\nThe lower price per piece is **${better}**.`);
}

module.exports = out;
