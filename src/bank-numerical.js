// Numerical Ability: word problems, written as fixed questions (1.45.0).
// Each kind of problem has hand-written words and a fixed list of numbers. The answer and every step are
// worked out by the code below (not typed by hand), and the wrong choices are the usual mistakes
// (forgetting a step, adding instead of multiplying, and so on). Every number list was chosen so the
// answers come out as whole pesos, whole minutes or simple fractions.
const { helpers } = require('./generators');
const { sshuffle } = require('./bank-tools');

const { fmt, peso, gcd, mulLines, divLines, mulStep, divStep } = helpers;
const N = 'numerical';
const out = [];
const NAMES = ['Ana', 'Ben', 'Carlo', 'Dina', 'Ella', 'Fe', 'Gino', 'Hazel', 'Ivan', 'Joy', 'Karl', 'Lea', 'Mario', 'Nina', 'Oscar', 'Paula', 'Rico', 'Sara', 'Tony', 'Vina'];
const name = (i) => NAMES[i % NAMES.length];

// Adds a question. wrong: candidate wrong answers (numbers or strings); the first 3 that differ from the
// answer (and from each other) are used. Questions without 3 good wrong answers are skipped.
function add(t, q, answer, wrong, steps, show = (v) => String(v)) {
  const a = show(answer);
  const ds = [];
  for (const w of wrong) {
    if (typeof w === 'number' && (!Number.isFinite(w) || w <= 0)) continue;
    const s = show(w);
    if (s !== a && !ds.includes(s)) ds.push(s);
    if (ds.length === 3) break;
  }
  if (ds.length < 3) return;
  out.push({ s: N, t, q, a, d: ds, e: `${steps}\nAnswer: ==${a}==.` });
}
const P = (v) => peso(v);
// Every combination of the given number lists (a fixed grid, so the questions never change).
const grid = (...lists) => lists.reduce((acc, l) => acc.flatMap((x) => l.map((y) => [...x, y])), [[]]);
const pct = (v) => `${fmt(v)}%`;

/* ---------- Percentage: 12% VAT ---------- */
for (const price of [250, 500, 750, 1000, 1250, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 7500, 8000, 10000, 12500, 15000, 20000]) {
  const vat = price * 12 / 100;
  add('Percentage', `A printer costs ${P(price)} before VAT. How much is the 12% VAT?`, vat, [price * 12 / 1000, price + vat, price * 0.21, vat * 2],
    `Step 1: 1% of ${P(price)} = ${P(price)} ÷ 100 = **${P(price / 100)}**.\n${mulStep('Step 2: 12% is 12 times that', 12, price / 100)}\nThe VAT is **${P(vat)}**.\n!!Trap!!: ${P(price + vat)} is the price WITH VAT, not the VAT itself.`, P);
  add('Percentage', `A laptop costs ${P(price)} before VAT. How much will a buyer pay including the 12% VAT?`, price + vat, [vat, price - vat, price + price * 12 / 1000, price * 2],
    `Step 1: 1% of ${P(price)} = **${P(price / 100)}**.\n${mulStep('Step 2: The 12% VAT', 12, price / 100)}\nStep 3: Add it to the price: ${P(price)} + ${P(vat)}\n= ${P(price + vat)}`, P);
}

/* ---------- Percentage: two discounts in a row ---------- */
for (const [price, d1, d2] of [[1000, 20, 10], [2000, 25, 10], [1500, 20, 20], [800, 25, 20], [5000, 10, 10], [1200, 50, 10], [4000, 20, 5], [2500, 40, 10], [3000, 30, 10], [600, 50, 20],
  [10000, 20, 10], [2400, 25, 50], [1600, 25, 25], [900, 10, 20], [7000, 10, 50]]) {
  const after1 = price * (100 - d1) / 100, fin = after1 * (100 - d2) / 100;
  add('Percentage', `A bag costs ${P(price)}. It is sold at ${d1}% off, and then another ${d2}% off the new price. What is the final price?`, fin,
    [price * (100 - d1 - d2) / 100, after1, price - fin, price * (100 - d2) / 100],
    `Step 1: First discount: ${d1}% of ${P(price)} = ${P(price * d1 / 100)}. New price: ${P(price)} − ${P(price * d1 / 100)} = **${P(after1)}**.\nStep 2: Second discount: ${d2}% of ${P(after1)} = ${P(after1 * d2 / 100)}. Final price: ${P(after1)} − ${P(after1 * d2 / 100)} = **${P(fin)}**.\n!!Trap!!: ${d1}% then ${d2}% is NOT the same as ${d1 + d2}% off (${P(price * (100 - d1 - d2) / 100)}), because the second discount is taken from the smaller price.`, P);
}

/* ---------- Percentage: commission and salary raise ---------- */
grid([15000, 25000, 40000, 60000, 75000, 90000, 120000], [2, 3, 5, 8, 10]).forEach(([sales, r], i) => {
  const c = sales * r / 100;
  add('Percentage', `${name(i)} sells appliances and earns a ${r}% commission. How much is the commission on sales of ${P(sales)}?`, c, [sales * r / 1000, sales - c, c * 2, sales * (r + 1) / 100],
    `Step 1: 1% of ${P(sales)} = ${P(sales)} ÷ 100 = **${P(sales / 100)}**.\n${mulStep(`Step 2: ${r}% is ${r} times that`, r, sales / 100)}\nThe commission is **${P(c)}**.`, P);
});
grid([16000, 18000, 20000, 24000, 25000, 30000, 36000, 40000], [4, 5, 8, 10, 15]).forEach(([sal, r], i) => {
  const raise = sal * r / 100;
  add('Percentage', `${name(i + 5)}'s monthly salary of ${P(sal)} was raised by ${r}%. What is the new monthly salary?`, sal + raise, [raise, sal + r * 100, sal * (100 - r) / 100, sal + raise * 2],
    `Step 1: 1% of ${P(sal)} = **${P(sal / 100)}**.\n${mulStep(`Step 2: The raise: ${r}%`, r, sal / 100)}\nStep 3: New salary: ${P(sal)} + ${P(raise)} = **${P(sal + raise)}**.\n!!Trap!!: ${P(raise)} is only the raise, not the new salary.`, P);
});

/* ---------- Percentage: profit and loss percent ---------- */
for (const [cost, sell] of [[200, 250], [400, 500], [500, 600], [800, 1000], [250, 300], [1000, 1250], [600, 750], [1200, 1500], [500, 450], [800, 600], [2000, 1500], [400, 300], [1500, 1800], [3000, 3600], [750, 900]]) {
  const diff = Math.abs(sell - cost), p = diff * 100 / cost, gain = sell > cost;
  add('Percentage', `A store buys a fan for ${P(cost)} and sells it for ${P(sell)}. What is the percent ${gain ? 'profit' : 'loss'}?`, p,
    [diff * 100 / sell, diff, p * 2, 100 - p],
    `Step 1: The ${gain ? 'profit' : 'loss'}: ${P(Math.max(sell, cost))} − ${P(Math.min(sell, cost))} = **${P(diff)}**.\nStep 2: Percent ${gain ? 'profit' : 'loss'} = ${gain ? 'profit' : 'loss'} ÷ **cost** × 100.\n= ${fmt(diff)} ÷ ${fmt(cost)} × 100\n= ${fmt(p)}%\n!!Trap!!: always divide by the cost (what the store paid), not by the selling price.`, pct);
}

/* ---------- Simple interest: find the time or the rate ---------- */
grid([5000, 10000, 20000, 40000, 50000], [3, 4, 5, 6], [2, 3, 4]).forEach(([p, r, t]) => {
  const i = p * r * t / 100;
  add('Simple Interest', `How many years will it take ${P(p)} to earn ${P(i)} in simple interest at ${r}% a year?`, t, [t + 1, t * 2, t + 2, r],
    `Use **I = P × r × t**, so **t = I ÷ (P × r)**.\nStep 1: Interest in ONE year: ${r}% of ${P(p)} = **${P(p * r / 100)}**.\n${divStep('Step 2: How many years make the full interest', i, p * r / 100)}\nSo it takes **${t} years**.`, (v) => `${v} years`);
  add('Simple Interest', `${P(p)} earned ${P(i)} in simple interest after ${t} years. What was the yearly interest rate?`, r, [r * t, r + 1, r * 2, r + 2],
    `Use **I = P × r × t**.\nStep 1: Interest in ONE year: ${P(i)} ÷ ${t} = **${P(i / t)}**.\nStep 2: As a percent of ${P(p)}: ${fmt(i / t)} ÷ ${fmt(p)} × 100 = **${r}%**.\n!!Trap!!: ${r * t}% is the interest for all ${t} years together, not the rate per year.`, pct);
});

/* ---------- Ratio: sharing among three ---------- */
grid([3600, 6000, 7200, 12000, 18000], [[1, 2, 3], [2, 3, 5], [1, 3, 5], [3, 4, 5], [1, 2, 9], [2, 3, 7], [1, 4, 7], [1, 1, 2]]).map(([t, r]) => [t, ...r]).forEach(([total, a, b, c], i) => {
  const parts = a + b + c, one = total / parts;
  if (!Number.isInteger(one)) return;
  const [n1, n2, n3] = [name(i), name(i + 7), name(i + 13)];
  add('Ratio and Proportion', `${n1}, ${n2} and ${n3} share ${P(total)} in the ratio ${a} : ${b} : ${c}. How much does ${n3} get?`, one * c, [one * a, one * b, total / 3, one * (c + 1)],
    `Step 1: Total parts: ${a} + ${b} + ${c} = **${parts}**.\n${divStep('Step 2: One part', total, parts)}\n${mulStep(`Step 3: ${n3} gets ${c} parts`, c, one)}\nCheck: ${P(one * a)} + ${P(one * b)} + ${P(one * c)} = ${P(total)}.`, P);
});

/* ---------- Ratio: map scale ---------- */
grid([2, 3, 4.5, 6, 7.5, 9, 12], [5, 10, 20, 25]).forEach(([cm, km]) => {
  const d = cm * km;
  add('Ratio and Proportion', `On a map, 1 cm stands for ${km} km. Two towns are ${fmt(cm)} cm apart on the map. How far apart are they in real life?`, d, [cm + km, d / 10, d * 10, km],
    `Step 1: Each 1 cm on the map = **${km} km**.\nStep 2: ${fmt(cm)} cm × ${km} km = **${fmt(d)} km**.`, (v) => `${fmt(v)} km`);
});

/* ---------- Fractions ---------- */
const frac = (n, d) => { const g = gcd(n, d); return d / g === 1 ? `${n / g}` : `${n / g}/${d / g}`; };
for (const [a, b, c, d] of grid([[1, 4], [1, 3], [2, 5], [1, 6], [3, 8], [1, 5]], [[1, 2], [1, 3], [1, 4], [1, 6], [2, 9], [1, 8]]).map(([x, y]) => [...x, ...y]).filter(([a, b, c, d]) => b !== d)) {
  const lcd = b * d / gcd(b, d), used = a * (lcd / b) + c * (lcd / d), left = lcd - used;
  if (left <= 0) continue;
  add('Fractions', `At a party, Ana ate ${a}/${b} of a cake and Ben ate ${c}/${d} of it. What part of the cake was left?`, frac(left, lcd),
    [frac(used, lcd), `${a + c}/${b + d}`, frac(Math.abs(b + d - a - c), b + d), frac(left + 1, lcd)],
    `Step 1: Make the bottoms the same. The LCD of ${b} and ${d} is **${lcd}**.\n= ${a}/${b} = ${a * (lcd / b)}/${lcd} and ${c}/${d} = ${c * (lcd / d)}/${lcd}\nStep 2: Eaten: ${a * (lcd / b)}/${lcd} + ${c * (lcd / d)}/${lcd} = **${used}/${lcd}**.\nStep 3: The whole cake is ${lcd}/${lcd}. Left: ${lcd}/${lcd} − ${used}/${lcd} = **${left}/${lcd}**${frac(left, lcd) !== `${left}/${lcd}` ? ` = ${frac(left, lcd)}` : ''}.\n!!Trap!!: never add the tops and the bottoms (${a + c}/${b + d}).`);
}
grid([[3, 4], [2, 3], [3, 5], [5, 8], [4, 5], [2, 5], [7, 10], [5, 6]], [120, 300, 600, 840]).map(([f, h]) => [...f, h]).filter(([n, d, h]) => h % n === 0).forEach(([n, d, have]) => {
  const full = have * d / n;
  add('Fractions', `A water tank is ${n}/${d} full. It holds ${fmt(have)} liters now. How many liters does it hold when full?`, full, [have * n / d, have + have / n, full / 2, have * d],
    `Step 1: ${n}/${d} of the tank = ${fmt(have)} L.\n${divStep(`Step 2: 1/${d} of the tank`, have, n)}\n${mulStep(`Step 3: The full tank is ${d}/${d}`, d, have / n)}\nSo the full tank holds **${fmt(full)} L**.`, (v) => `${fmt(v)} liters`);
});

/* ---------- Decimals: price per kilo ---------- */
for (const [kg, price] of grid([1.5, 2.5, 3.5, 1.25, 2.75, 0.75], [80, 120, 160, 240, 320, 360])) {
  const total = kg * price;
  add('Decimals', `Pork costs ${P(price)} per kilo. How much will ${fmt(kg)} kilos cost?`, total, [Math.floor(kg) * price, total + price, price / kg, total * 10],
    `Step 1: Split ${fmt(kg)} kg into whole kilos and the part: ${Math.floor(kg)} + ${fmt(kg - Math.floor(kg))}.\nStep 2: ${Math.floor(kg)} × ${P(price)} = ${P(Math.floor(kg) * price)}.\nStep 3: ${fmt(kg - Math.floor(kg))} × ${P(price)} = ${P((kg - Math.floor(kg)) * price)}.\nStep 4: Add: ${P(Math.floor(kg) * price)} + ${P((kg - Math.floor(kg)) * price)} = **${P(total)}**.`, P);
}

/* ---------- Geometry ---------- */
for (const r of [7, 14, 21, 28, 35, 42]) {
  const area = 22 / 7 * r * r, circ = 2 * 22 / 7 * r;
  add('Geometry', `What is the area of a circle with a radius of ${r} cm? (Use π = 22/7.)`, area, [circ, 22 / 7 * r * 2, area * 2, 22 / 7 * r],
    `Area of a circle = **π × r × r**.\nStep 1: r × r = ${r} × ${r} = ${r * r}.\nStep 2: 22/7 × ${r * r} = 22 × (${r * r} ÷ 7) = 22 × ${r * r / 7} = **${fmt(area)}**.\nThe area is ${fmt(area)} square cm.\n!!Trap!!: ${fmt(circ)} cm is the circumference (the distance around), not the area.`, (v) => `${fmt(v)} sq cm`);
  add('Geometry', `What is the circumference of a circle with a radius of ${r} cm? (Use π = 22/7.)`, circ, [area, 22 / 7 * r, circ * 2, 2 * r],
    `Circumference = **2 × π × r**.\nStep 1: 2 × ${r} = ${2 * r} (this is the diameter).\nStep 2: 22/7 × ${2 * r} = 22 × (${2 * r} ÷ 7) = 22 × ${2 * r / 7} = **${fmt(circ)}**.`, (v) => `${fmt(v)} cm`);
}
for (const [b, h] of grid([8, 10, 12, 15, 18, 24], [4, 6, 7, 9, 10])) {
  add('Geometry', `A triangle has a base of ${b} m and a height of ${h} m. What is its area?`, b * h / 2, [b * h, b + h, (b + h) * 2, b * h / 4],
    `Area of a triangle = **base × height ÷ 2**.\n${mulStep('Step 1: base × height', b, h)}\nStep 2: ${b * h} ÷ 2 = **${fmt(b * h / 2)}**.\n!!Trap!!: do not forget to divide by 2 (a triangle is half of a rectangle).`, (v) => `${fmt(v)} sq m`);
}
for (const [l, w, h] of grid([6, 8, 10, 12, 15], [3, 4, 5], [2, 6, 7])) {
  const v = l * w * h;
  add('Geometry', `A box is ${l} cm long, ${w} cm wide and ${h} cm high. What is its volume?`, v, [l + w + h, l * w, 2 * (l * w + w * h + l * h), v * 2],
    `Volume of a box = **length × width × height**.\nStep 1: ${l} × ${w} = ${l * w}.\nStep 2: ${l * w} × ${h} = **${v}**.\nThe volume is ${v} cubic cm.`, (x) => `${fmt(x)} cubic cm`);
}
for (const [a, b] of grid([25, 35, 40, 55, 62, 75], [30, 45, 50, 68, 90])) {
  const c = 180 - a - b;
  add('Geometry', `Two angles of a triangle measure ${a}° and ${b}°. What is the third angle?`, c, [360 - a - b, a + b, 90 - Math.min(a, b), c + 10],
    `The three angles of a triangle always add up to **180°**.\nStep 1: ${a}° + ${b}° = ${a + b}°.\nStep 2: 180° − ${a + b}° = **${c}°**.`, (v) => `${v}°`);
}

/* ---------- Measurement: conversions ---------- */
for (const [n, from, to, k] of [[4, 'hours', 'minutes', 60], [1.5, 'hours', 'minutes', 60], [6, 'hours', 'minutes', 60], [0.75, 'hours', 'minutes', 60], [8, 'kilometers', 'meters', 1000], [2.5, 'kilometers', 'meters', 1000],
  [0.4, 'kilometers', 'meters', 1000], [6, 'kilograms', 'grams', 1000], [1.25, 'kilograms', 'grams', 1000], [3.5, 'kilograms', 'grams', 1000], [4, 'liters', 'milliliters', 1000], [0.5, 'liters', 'milliliters', 1000],
  [1.75, 'liters', 'milliliters', 1000], [7, 'meters', 'centimeters', 100], [1.8, 'meters', 'centimeters', 100], [0.6, 'meters', 'centimeters', 100], [3, 'days', 'hours', 24], [2.5, 'days', 'hours', 24],
  [9, 'weeks', 'days', 7], [12, 'weeks', 'days', 7], [5, 'feet', 'inches', 12], [3, 'yards', 'feet', 3], [10, 'dozens', 'pieces', 12], [2.5, 'dozens', 'pieces', 12], [5, 'minutes', 'seconds', 60],
  [3, 'hours', 'minutes', 60], [2.5, 'hours', 'minutes', 60], [5, 'kilometers', 'meters', 1000], [1.2, 'kilometers', 'meters', 1000], [4, 'kilograms', 'grams', 1000],
  [2.5, 'liters', 'milliliters', 1000], [3, 'meters', 'centimeters', 100], [7, 'days', 'hours', 24], [4, 'weeks', 'days', 7], [12, 'feet', 'inches', 12], [0.75, 'kilograms', 'grams', 1000], [1.5, 'days', 'hours', 24],
  [6, 'dozens', 'pieces', 12], [3.5, 'meters', 'centimeters', 100], [8, 'minutes', 'seconds', 60]]) {
  const r = n * k;
  add('Measurement', `How many ${to} are there in ${fmt(n)} ${from}?`, r, [n * k / 10, n * k * 10, n + k, n / k],
    `Step 1: 1 ${from.replace(/s$/, '')} = **${fmt(k)} ${to}**.\nStep 2: Big unit → small unit: **multiply**. ${fmt(n)} × ${fmt(k)} = **${fmt(r)}**.`, (v) => `${fmt(v)} ${to}`);
}

/* ---------- Time: when does it end? ---------- */
const clock = (m) => { m = ((m % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60; const h12 = h % 12 || 12; return `${h12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'a.m.' : 'p.m.'}`; };
for (const [start, dur] of grid([7 * 60 + 50, 8 * 60 + 30, 9 * 60 + 45, 10 * 60 + 40, 13 * 60 + 15, 14 * 60 + 25], [75, 95, 140, 155, 210, 260])) {
  const end = start + dur, h = Math.floor(dur / 60), m = dur % 60;
  add('Time', `A seminar starts at ${clock(start)} and lasts ${h} hour${h > 1 ? 's' : ''} and ${m} minutes. What time does it end?`, clock(end), [clock(end - 60), clock(end + 60), clock(start + h * 60 + m - 10), clock(start + m * 60 + h)],
    `Step 1: Add the whole hours: ${clock(start)} + ${h} hour${h > 1 ? 's' : ''} = **${clock(start + h * 60)}**.\nStep 2: Add the ${m} minutes: ${clock(start + h * 60)} + ${m} min = **${clock(end)}**.\nTip: when the minutes go past 60, add 1 to the hour.`);
}

/* ---------- Average: the missing score ---------- */
for (const [scores, target] of grid([[80, 85, 90], [75, 80, 85], [88, 92, 79], [70, 75, 80, 85], [90, 95, 85], [60, 70, 80], [82, 84, 86], [78, 88, 98], [85, 85, 85, 85], [91, 87, 83], [72, 76, 80], [95, 90, 92]], [80, 84, 86, 88, 90])) {
  const n = scores.length + 1, need = target * n - scores.reduce((s, v) => s + v, 0);
  if (need <= 0 || need > 100) continue;
  add('Average', `A student got ${scores.join(', ')} in ${scores.length} quizzes. What score does the student need in the next quiz to get an average of ${target}?`, need,
    [target, need - n, need + n, Math.round((scores.reduce((s, v) => s + v, 0) + target) / n)],
    `Step 1: Total needed for an average of ${target} in ${n} quizzes: ${target} × ${n} = **${target * n}**.\nStep 2: Total so far: ${scores.join(' + ')} = **${scores.reduce((s, v) => s + v, 0)}**.\nStep 3: Needed: ${target * n} − ${scores.reduce((s, v) => s + v, 0)} = **${need}**.\nCheck: (${scores.join(' + ')} + ${need}) ÷ ${n} = ${target}.`);
}

/* ---------- Statistics: mode and range ---------- */
const DATA = [[2, 4, 4, 6, 8, 4, 9], [15, 11, 13, 11, 17, 19, 11], [40, 35, 30, 35, 45, 35, 50], [9, 12, 7, 12, 5, 12, 8], [61, 64, 61, 67, 70, 61, 58], [18, 22, 26, 22, 30, 22, 14], [5, 7, 5, 9, 11, 5, 13], [27, 24, 27, 21, 30, 27, 33], [80, 75, 90, 75, 85, 75, 95], [3, 5, 7, 5, 9, 5, 2], [12, 15, 12, 18, 20, 12, 15], [4, 8, 8, 6, 2, 8, 4], [21, 25, 30, 25, 22, 25, 28], [7, 9, 9, 10, 7, 9, 11], [50, 45, 60, 45, 55, 70, 45], [14, 18, 16, 18, 12, 18, 20], [6, 3, 6, 9, 6, 1, 4], [33, 36, 31, 36, 38, 36, 30], [10, 20, 30, 20, 40, 20, 50]];
DATA.forEach((d) => {
  const count = {}; d.forEach((v) => { count[v] = (count[v] || 0) + 1; });
  const mode = Number(Object.keys(count).sort((a, b) => count[b] - count[a])[0]);
  const sorted = [...d].sort((a, b) => a - b), median = sorted[3], mean = d.reduce((s, v) => s + v, 0) / d.length;
  add('Statistics', `What is the mode of these numbers: ${d.join(', ')}?`, mode, [median, Math.max(...d), Math.min(...d), Math.round(mean)],
    `The **mode** is the number that appears **most often**.\nStep 1: Count each number: ${Object.keys(count).map((k) => `${k} (${count[k]}×)`).join(', ')}.\nStep 2: ${mode} appears ${count[mode]} times, more than any other.`);
  add('Statistics', `What is the median of these numbers: ${d.join(', ')}?`, median, [d[3], mode === median ? Math.round(mean) + 1 : mode, Math.max(...d) - Math.min(...d), sorted[2]],
    `The **median** is the **middle** number after putting them in order.\nStep 1: In order: ${sorted.join(', ')}.\nStep 2: There are ${d.length} numbers, so the middle one is the 4th: **${median}**.\n!!Trap!!: do not take the middle of the list before sorting it.`);
  if (Number.isInteger(mean)) {
    const sum = d.reduce((x, v) => x + v, 0);
    add('Average', `What is the mean (average) of these numbers: ${d.join(', ')}?`, mean, [median === mean ? mean + 1 : median, mode === mean ? mean + 2 : mode, sum, Math.round(sum / 6)],
      `Mean = **sum ÷ how many**.\nStep 1: Sum: ${d.join(' + ')} = **${sum}**.\nStep 2: ${sum} ÷ ${d.length} = **${mean}**.`);
  }
  const range = Math.max(...d) - Math.min(...d);
  add('Statistics', `What is the range of these numbers: ${d.join(', ')}?`, range, [Math.max(...d), mode, median, Math.max(...d) + Math.min(...d)],
    `The **range** = highest − lowest.\nStep 1: Highest: ${Math.max(...d)}. Lowest: ${Math.min(...d)}.\nStep 2: ${Math.max(...d)} − ${Math.min(...d)} = **${range}**.`);
});

/* ---------- Algebra ---------- */
for (const [m, b, x0] of grid([2, 3, 4, 5, 6, 7], [5, 8, 11, 14], [9, 13, 17])) {
  const r = m * x0 + b;
  const x = (r - b) / m;
  if (!Number.isInteger(x)) continue;
  add('Algebra', `${m === 2 ? 'Twice' : m === 3 ? 'Three times' : `${m} times`} a number, increased by ${b}, is ${r}. What is the number?`, x, [(r + b) / m, r - b, x + 1, r / m],
    `Write it: **${m}x + ${b} = ${r}**.\nStep 1: Take away ${b} from both sides: ${m}x = ${r} − ${b} = **${r - b}**.\nStep 2: Divide both sides by ${m}: x = ${r - b} ÷ ${m} = **${x}**.\nCheck: ${m} × ${x} + ${b} = ${m * x + b}.`);
}
for (const sum of [36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 96, 102, 108, 114, 120, 126, 132, 138, 144, 150]) {
  if ((sum - 6) % 3) continue;
  const x = (sum - 6) / 3;
  if (x % 2) continue;
  add('Algebra', `The sum of three consecutive even numbers is ${sum}. What is the largest number?`, x + 4, [x, x + 2, x + 6, sum / 3],
    `Call them **x, x + 2, x + 4** (even numbers are 2 apart).\nStep 1: x + (x + 2) + (x + 4) = 3x + 6 = ${sum}.\nStep 2: 3x = ${sum} − 6 = ${sum - 6}, so x = ${sum - 6} ÷ 3 = **${x}**.\nStep 3: The numbers are ${x}, ${x + 2}, ${x + 4}. The largest is **${x + 4}**.`);
}

/* ---------- Age problems ---------- */
grid([2, 3, 4, 5], [8, 9, 10, 11, 12, 13]).map(([k, c]) => [k, c * (k + 1)]).forEach(([k, s], i) => {
  const child = s / (k + 1);
  if (!Number.isInteger(child)) return;
  add('Age Problem', `${name(i + 2)}'s mother is ${k} times as old as ${name(i + 2)}. The sum of their ages is ${s}. How old is the mother?`, k * child, [child, s - child + k, s / k, k * child + k],
    `Let ${name(i + 2)}'s age = **n**. The mother is **${k}n**.\nStep 1: n + ${k}n = ${k + 1}n = ${s}.\nStep 2: n = ${s} ÷ ${k + 1} = **${child}** (the child).\nStep 3: Mother: ${k} × ${child} = **${k * child}**.\n!!Trap!!: ${child} is the child's age; the question asks for the mother.`, (v) => `${v} years old`);
});

/* ---------- Work problems ---------- */
for (const [a, b] of [[3, 6], [4, 12], [6, 12], [10, 15], [12, 24], [8, 24], [5, 20], [9, 18], [20, 30], [12, 36], [6, 30], [10, 40], [15, 30], [4, 6], [10, 30], [18, 36], [7, 42], [14, 35], [24, 40], [21, 28], [30, 60], [20, 80], [9, 72], [16, 48]]) {
  const t = a * b / (a + b);
  if (!Number.isInteger(t)) continue;
  add('Work Problem', `One pipe can fill a tank in ${a} hours. Another pipe can fill it in ${b} hours. How long will it take to fill the tank if both pipes are open?`, t, [(a + b) / 2, a + b, Math.abs(a - b), t + 1],
    `Use the shortcut for two workers: **T = (A × B) ÷ (A + B)**.\nStep 1: A × B = ${a} × ${b} = ${a * b}.\nStep 2: A + B = ${a} + ${b} = ${a + b}.\nStep 3: ${a * b} ÷ ${a + b} = **${t}**.\nCheck: in 1 hour they fill 1/${a} + 1/${b} = 1/${t} of the tank.\n!!Trap!!: together is always FASTER than the faster pipe alone, so the answer must be less than ${Math.min(a, b)}.`, (v) => `${fmt(v)} hours`);
}

/* ---------- Distance, rate, time ---------- */
for (const [t0, v1, v2] of grid([2, 3, 4, 5], [40, 55, 60, 75, 80], [35, 45, 50])) {
  const d = t0 * (v1 + v2);
  const t = d / (v1 + v2);
  if (!Number.isInteger(t)) continue;
  add('Distance, Rate, Time', `Two buses are ${d} km apart and drive toward each other. One goes ${v1} km/h and the other ${v2} km/h. After how many hours will they meet?`, t,
    [d / Math.abs(v1 - v2) || t + 2, d / v1, t + 1, d / v2],
    `When two things move **toward each other**, add their speeds.\nStep 1: ${v1} + ${v2} = **${v1 + v2} km/h** (they close the gap this much each hour).\nStep 2: Time = distance ÷ speed = ${d} ÷ ${v1 + v2} = **${t}**.\nCheck: in ${t} h they cover ${v1 * t} km + ${v2 * t} km = ${d} km.`, (x) => `${fmt(x)} hours`);
}

/* ---------- LCM and GCF word problems ---------- */
const lcm = (a, b) => a * b / gcd(a, b);
for (const [a, b] of [[12, 18], [15, 20], [8, 12], [10, 25], [6, 15], [9, 12], [14, 21], [16, 24], [20, 30], [18, 24], [10, 12], [25, 40], [6, 8], [12, 15], [20, 24], [18, 27], [15, 25], [24, 36], [21, 35], [30, 45]]) {
  const l = lcm(a, b), g = gcd(a, b);
  add('Word Problem', `Two bells ring together at 8:00 a.m. One rings every ${a} minutes and the other every ${b} minutes. After how many minutes will they ring together again?`, l, [a * b, a + b, g, l * 2],
    `They ring together again after the **LCM** (least common multiple) of ${a} and ${b}.\nStep 1: Multiples of ${b}: ${[1, 2, 3, 4, 5].map((k) => b * k).filter((x) => x <= l).join(', ')}...\nStep 2: The first one that ${a} also divides is **${l}** (${l} ÷ ${a} = ${l / a}).\n!!Trap!!: ${a * b} also works, but it is not the FIRST time.`, (v) => `${v} minutes`);
  add('Word Problem', `Two ribbons are ${a} m and ${b} m long. They are cut into pieces of the same length, as long as possible, with nothing left. How long is each piece?`, g, [l, Math.min(a, b), g / 2 >= 1 && Number.isInteger(g / 2) ? g / 2 : g + 1, Math.abs(a - b) === g ? g + 2 : Math.abs(a - b)],
    `The longest equal piece is the **GCF** (greatest common factor) of ${a} and ${b}.\nStep 1: Factors of ${a}: ${[...Array(a).keys()].map((k) => k + 1).filter((k) => a % k === 0).join(', ')}.\nStep 2: Factors of ${b}: ${[...Array(b).keys()].map((k) => k + 1).filter((k) => b % k === 0).join(', ')}.\nStep 3: The biggest one in both lists is **${g}**.`, (v) => `${v} m`);
}

/* ---------- Word problems: budget ---------- */
grid([1000, 1500, 2000, 5000], [6, 8, 12, 15], [35, 45, 65, 85, 95]).forEach(([budget, n, price], i) => {
  const cost = n * price, left = budget - cost;
  if (left <= 0) return;
  add('Word Problem', `${name(i + 3)} has ${P(budget)} and buys ${n} notebooks at ${P(price)} each. How much money is left?`, left, [cost, budget - price, left + price, budget - n],
    `${mulStep('Step 1: Cost of the notebooks', n, price)}\nStep 2: Money left: ${P(budget)} − ${P(cost)} = **${P(left)}**.\n!!Trap!!: ${P(cost)} is the amount spent, not what is left.`, P);
});

/* ---------- Probability ---------- */
for (const [r, b, g] of grid([1, 2, 3, 4, 5, 6], [3, 4, 5, 7], [2, 6])) {
  const total = r + b + g;
  add('Probability', `A box has ${r} red, ${b} blue and ${g} green balls. If you pick one ball without looking, what is the chance that it is red?`, frac(r, total),
    [frac(r, b + g), frac(b, total), frac(g, total), frac(total - r, total)],
    `Chance = **ways to get what you want ÷ all possible outcomes**.\nStep 1: All balls: ${r} + ${b} + ${g} = **${total}**.\nStep 2: Red balls: **${r}**.\nStep 3: Chance = ${r}/${total}${frac(r, total) !== `${r}/${total}` ? ` = ${frac(r, total)}` : ''}.\n!!Trap!!: divide by ALL the balls (${total}), not only by the balls that are not red.`);
}

module.exports = out;
