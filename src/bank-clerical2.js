// Clerical Ability, part 2 (1.46.0): filing order, numerical filing, checking names, addresses, dates and
// lists, and more spelling words. Names, numbers and addresses are picked with a fixed seed; the right answer
// is found by the rules in the code (filing order, digit by digit comparison), so it is always right.
const { rows, pickSome, rng, sshuffle } = require('./bank-tools');

const C = 'clerical';
const out = [];
function add(t, q, a, d, e) {
  out.push({ s: C, t, q, a, d, e: `${e}\nAnswer: ==${a}==.` });
}

/* ---------- Spelling: more words (each with three hand-written misspellings) ---------- */
const SPELLING = rows(`
accommodate | accomodate, acommodate, accommadate
acknowledgment | acknowlegment, aknowledgment, acknowledgemant
adolescent | adolescant, adolesent, addolescent
alphabetical | alphabeticle, alfabetical, alphebetical
apparent | apparant, aparent, apparrent
argument | arguement, argumant, arguemint
beginning | begining, beggining, beginnig
believe | beleive, belive, beleave
bureaucracy | beaurocracy, bureacracy, burocracy
cemetery | cemetary, cemetry, semetery
colleague | collegue, colleage, coleague
commitment | committment, comitment, commitmant
committee | commitee, comittee, committe
conscientious | consciencious, conscientous, consientious
courteous | curteous, courtious, courteus
deductible | deductable, deductibel, deducteble
dilemma | dilema, dillema, dilemna
discrepancy | discrepency, descrepancy, discrepansy
embarrass | embarass, embarras, embbarass
entrepreneur | entreprenuer, enterpreneur, entrepeneur
environment | enviroment, environmant, envirnment
existence | existance, existense, exsistence
familiar | familar, famillar, familliar
foreign | foriegn, foreing, forein
government | goverment, governmant, govermment
grammar | grammer, gramar, grammmar
guarantee | guarentee, garantee, guarantie
harassment | harrassment, harasment, harrasment
illegible | illegable, ilegible, illegibel
independent | independant, indipendent, independint
inevitable | inevitible, innevitable, inevitabel
interfere | interfer, enterfere, interfeer
judgment | judgmant, jugment, judgemint
liaison | liason, liasion, laison
millennium | millenium, milennium, millenniam
necessary | neccessary, necessery, nessesary
noticeable | noticable, noticeble, notisable
occasion | occassion, ocasion, occation
occurrence | occurence, ocurrence, occurrance
offense | ofense, offence_, offinse
pamphlet | pamflet, pamphlit, phamplet
perceive | percieve, persieve, perceeve
personnel | personel, personnell, persennel
pharmaceutical | pharmacuetical, farmaceutical, pharmaceutecal
possession | posession, possesion, possessian
privilege | priviledge, privelege, privilige
questionnaire | questionaire, questionnair, quesionnaire
recommend | recomend, reccommend, recommand
referred | refered, reffered, referrd
reimbursement | reimbursment, reimbursemant, reimbersement
remittance | remitance, remmittance, remittanse
renaissance | renaisance, renaissanse, rennaissance
rehearsal | rehersal, reahearsal, rehearsel
separate | seperate, separete, saparate
signature | signiture, signatur, signeture
similar | similiar, simular, similer
supersede | supercede, superseed, supersedd
surveillance | surveilance, survaillance, surveillence
tomorrow | tommorow, tomorow, tommorrow
transferred | transfered, transferd, tranferred
unnecessary | unneccessary, unecessary, unnecesary
vaccinate | vacinate, vaccinnate, vaksinate
`);
for (const [word, wrongs] of SPELLING) {
  const ws = wrongs.split(',').map((x) => x.trim()).filter((x) => !x.endsWith('_'));
  if (ws.length < 3) ws.push(word.replace(/e$/, '') + 'e' === word ? word + 'e' : word + 'e');
  add('Spelling', `Choose the correct spelling: ${sshuffle([word, ...ws.slice(0, 3)], 'sp2' + word).join(', ').replace(/, ([^,]+)$/, ' or $1')}.`, word, ws.slice(0, 3),
    `Say the word slowly in parts and check each letter.\nThe correct spelling is **${word}**.\n!!Trap!!: ${ws.slice(0, 3).map((x) => `"${x}"`).join(', ')} are misspellings.`);
}
// The misspelled word in a sentence.
const SENT = rows(`
The committee will meet tomorrow to review the budget. | committee, tomorrow, review, budget | commitee
Please attach a copy of your birth certificate to the application. | attach, certificate, application, please | certifcate
The receipt was signed by the cashier before noon. | receipt, signed, cashier, before | reciept
Our office will accommodate walk-in clients until five o'clock. | accommodate, clients, office, until | accomodate
The new schedule takes effect on the first Monday of the month. | schedule, effect, month, Monday | schedual
Employees must submit their leave applications in advance. | employees, submit, applications, advance | employes
The supervisor gave a thorough explanation of the procedure. | thorough, explanation, procedure, supervisor | proceedure
Separate the old files from the new ones before noon. | separate, files, before, ones | seperate
The secretary sent the memorandum to all divisions. | secretary, memorandum, divisions, sent | secratary
We received your questionnaire last Wednesday. | received, questionnaire, Wednesday, last | recieved
The library is open to the public on weekdays. | library, public, weekdays, open | libary
Her attendance record shows no absences this year. | attendance, record, absences, year | attendence
The government released the funds for the new bridge. | government, released, funds, bridge | goverment
Keep the official receipts in a safe place for the audit. | official, receipts, audit, place | offical
The maintenance team fixed the air conditioner in the conference room. | maintenance, conference, fixed, room | maintainance
`);
for (const [sentence, words, bad] of SENT) {
  const good = words.split(',').map((x) => x.trim());
  const right = good.find((w) => sentence.includes(w) && bad.toLowerCase().startsWith(w.slice(0, 3).toLowerCase())) || good[0];
  const shown = sentence.replace(right, bad);
  const others = good.filter((w) => w !== right && shown.includes(w)).slice(0, 3);
  if (others.length < 3 || !shown.includes(bad)) continue;
  add('Spelling', `Which word is misspelled in this sentence? "${shown}"`, bad, others,
    `Check each word letter by letter. **${bad}** is wrong; the correct spelling is **${right}**.`);
}

/* ---------- Alphabetical filing: second or third, and the full order ---------- */
const SUR = ['Abaya', 'Abrenica', 'Aguilar', 'Almario', 'Amador', 'Angeles', 'Apostol', 'Baluyot', 'Baltazar', 'Barrientos', 'Belmonte', 'Bonifacio', 'Buenafe',
  'Cabral', 'Cajucom', 'Calma', 'Canlas', 'Capistrano', 'Carpio', 'Cayabyab', 'Concepcion', 'Cordero', 'Corpuz', 'Dacanay', 'Dalisay', 'Dantes', 'De Castro', 'De Jesus',
  'De Vera', 'Dela Rosa', 'Del Prado', 'Diokno', 'Dizon', 'Ebuen', 'Eugenio', 'Evangelista', 'Fajardo', 'Feliciano', 'Fortuna', 'Gatchalian', 'Gomez', 'Guevarra',
  'Habana', 'Hidalgo', 'Ilagan', 'Jacinto', 'Javier', 'Laurel', 'Lazaro', 'Legaspi', 'Leviste', 'Llamas', 'Lualhati', 'Macapagal', 'Madrigal', 'Malonzo', 'Manansala',
  'Natividad', 'Nepomuceno', 'Obispo', 'Olivares', 'Panlilio', 'Paredes', 'Pineda', 'Quijano', 'Quintos', 'Ramos', 'Recto', 'Roxas', 'Sanchez', 'Sevilla', 'Sison',
  'Tagle', 'Tecson', 'Tiongson', 'Umali', 'Valenzuela', 'Vergara', 'Yulo', 'Zaragoza'];
const FIR = ['Amado', 'Bernadette', 'Cecilia', 'Danilo', 'Erlinda', 'Fernando', 'Glenda', 'Honorio', 'Imelda', 'Jaime', 'Katherine', 'Lorna', 'Manuel', 'Nenita',
  'Orlando', 'Perla', 'Rodel', 'Susana', 'Teodoro', 'Virgilio'];
const fkey = (sur, first) => `${sur.replace(/[\s.]/g, '').toUpperCase()}|${first.toUpperCase()}`;
const nm = ([s, f]) => `${s}, ${f}`;
const RF = rng('filing2');
const ORDW = ['FIRST', 'SECOND', 'THIRD', 'LAST'];
const seenQ = new Set();
for (let k = 0, made = 0; k < 900 && made < 160; k++) {
  const start = Math.floor(RF() * (SUR.length - 5));
  const picks = pickSome(SUR.slice(start, start + 5), 4, `f2:${k}`).map((s, i) => [s, FIR[(k * 3 + i * 7) % FIR.length]]);
  if (k % 3 === 0) picks[2][0] = picks[0][0];
  if (new Set(picks.map(nm)).size < 4) continue;
  const sorted = [...picks].sort((a, b) => (fkey(...a) < fkey(...b) ? -1 : 1));
  const which = 1 + (k % 2); // SECOND or THIRD
  const ans = nm(sorted[which]);
  const key = `${which}|${picks.map(nm).sort().join('/')}`;
  if (seenQ.has(key)) continue;
  seenQ.add(key);
  made++;
  add('Alphabetical Filing', `When these names are filed alphabetically (surname first), which one comes ${ORDW[which]}? ${picks.map(nm).join(' · ')}`, ans, picks.map(nm).filter((x) => x !== ans),
    `File by **surname**, then first name; ignore spaces (De Vera → DEVERA).\nIn order:\n${sorted.map((p, i) => `${i + 1}. ${nm(p)}`).join('\n')}\nThe ${ORDW[which].toLowerCase()} one is **${ans}**.`);
}
// The full order, as numbers (like the answer sheets of the exam).
const perms = (a) => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
for (let k = 0, made = 0; k < 600 && made < 110; k++) {
  const start = Math.floor(RF() * (SUR.length - 6));
  const picks = pickSome(SUR.slice(start, start + 6), 4, `f3:${k}`).map((s, i) => [s, FIR[(k * 5 + i * 3) % FIR.length]]);
  if (k % 4 === 1) picks[3][0] = picks[1][0];
  if (new Set(picks.map(nm)).size < 4) continue;
  const order = [0, 1, 2, 3].sort((a, b) => (fkey(...picks[a]) < fkey(...picks[b]) ? -1 : 1)).map((i) => i + 1);
  const ans = order.join(', ');
  if (ans === '1, 2, 3, 4') continue;
  const near = perms(order).map((p) => p.join(', ')).filter((p) => p !== ans);
  const wrongs = pickSome(near, 3, `f3w:${k}`, (p) => p.split(', ').filter((x, i) => x !== String(order[i])).length === 2);
  if (wrongs.length < 3) continue;
  made++;
  add('Alphabetical Filing', `Arrange these names in alphabetical filing order (surname first): (1) ${nm(picks[0])} (2) ${nm(picks[1])} (3) ${nm(picks[2])} (4) ${nm(picks[3])}`, ans, wrongs,
    `File by **surname**, then first name.\nIn order:\n${order.map((i, x) => `${x + 1}. (${i}) ${nm(picks[i - 1])}`).join('\n')}\nSo the order is **${ans}**.`);
}

/* ---------- Numerical filing ---------- */
const RN = rng('numfile');
const near4 = (base, k) => {
  const s = String(base).split('');
  const i = k % s.length, j = (k + 1) % s.length;
  if (k % 3 === 0 && s[i] !== s[j]) [s[i], s[j]] = [s[j], s[i]]; else s[i] = String((Number(s[i]) + 1 + (k % 7)) % 10);
  if (s[0] === '0') s[0] = '1';
  return s.join('');
};
for (let k = 0, made = 0; k < 800 && made < 200; k++) {
  const len = 4 + (k % 3);
  const base = String(10 ** (len - 1) + Math.floor(RN() * 9 * 10 ** (len - 1)));
  const nums = [base];
  for (let j = 0; nums.length < 4 && j < 20; j++) { const c = near4(base, k + j * 5); if (!nums.includes(c)) nums.push(c); }
  if (nums.length < 4) continue;
  const fmtN = (x) => (k % 2 ? `File No. ${x.slice(0, 2)}-${x.slice(2)}` : x);
  const sorted = [...nums].sort((a, b) => Number(a) - Number(b));
  const low = k % 2 === 0;
  const ans = low ? sorted[0] : sorted[3];
  made++;
  add('Numerical Filing', `In numerical filing (lowest number first), which comes ${low ? 'FIRST' : 'LAST'}? ${nums.map(fmtN).join(' · ')}`, fmtN(ans), nums.filter((x) => x !== ans).map(fmtN),
    `Compare the numbers digit by digit from the left (they all have ${len} digits).\nFrom lowest to highest:\n${sorted.map((x, i) => `${i + 1}. ${fmtN(x)}`).join('\n')}\nThe ${low ? 'first' : 'last'} is **${fmtN(ans)}**.`);
}

/* ---------- Checking names: are the two exactly alike? ---------- */
const MIDS = 'ABCDEFGLMNPRSTV';
const RC = rng('names');
const typo = (w, k) => {
  const a = w.split('');
  const i = 1 + (k % (a.length - 2));
  const SWAP = { a: 'e', e: 'a', i: 'l', l: 'i', n: 'm', m: 'n', o: 'a', u: 'v', r: 'n', c: 'e', s: 'z', z: 's', t: 'f', d: 'b', b: 'd', g: 'q', y: 'v', h: 'n', v: 'u', j: 'i', p: 'q' };
  if (k % 3 === 0 && a[i] !== a[i + 1]) [a[i], a[i + 1]] = [a[i + 1], a[i]];
  else a[i] = SWAP[a[i].toLowerCase()] || (a[i] === 'x' ? 'k' : 'e');
  const r = a.join('');
  return r === w ? w + 's' : r;
};
const OPT = ['Exactly the same', 'Different in the surname only', 'Different in the first name only', 'Different in the middle initial only'];
for (let k = 0; k < 220; k++) {
  const sur = SUR[Math.floor(RC() * SUR.length)], first = FIR[Math.floor(RC() * FIR.length)], mid = MIDS[Math.floor(RC() * MIDS.length)];
  const kind = k % 4;
  const s2 = kind === 1 ? typo(sur, k) : sur, f2 = kind === 2 ? typo(first, k) : first, m2 = kind === 3 ? MIDS[(MIDS.indexOf(mid) + 1 + (k % 5)) % MIDS.length] : mid;
  const n1 = `${first} ${mid}. ${sur}`, n2 = `${f2} ${m2}. ${s2}`;
  const why = kind === 0 ? 'Every letter matches.' : kind === 1 ? `The surnames differ: **${sur}** vs **${s2}**.` : kind === 2 ? `The first names differ: **${first}** vs **${f2}**.` : `The middle initials differ: **${mid}.** vs **${m2}.**`;
  add('Checking Names', `Compare the two names: "${n1}" and "${n2}". Which is true?`, OPT[kind], OPT.filter((_, i) => i !== kind),
    `Check the first name, the middle initial, then the surname, one letter at a time.\n${why}\nSo: **${OPT[kind]}**.`);
}

/* ---------- Checking addresses ---------- */
const STREETS = ['Rizal Street', 'Mabini Avenue', 'Bonifacio Drive', 'Luna Street', 'Del Pilar Road', 'Burgos Street', 'Aguinaldo Highway', 'Quezon Boulevard', 'Roxas Avenue',
  'Magsaysay Street', 'Jacinto Street', 'Lapu-Lapu Street', 'Osmeña Boulevard', 'Gomez Street', 'Zamora Street', 'Sampaguita Lane', 'Narra Street', 'Acacia Drive'];
const TOWNS = ['Malolos, Bulacan', 'Lipa City, Batangas', 'San Pablo City, Laguna', 'Dagupan City, Pangasinan', 'Tagbilaran City, Bohol', 'Iloilo City, Iloilo', 'Naga City, Camarines Sur',
  'Tarlac City, Tarlac', 'Cabanatuan City, Nueva Ecija', 'Vigan City, Ilocos Sur', 'Ormoc City, Leyte', 'Dipolog City, Zamboanga del Norte', 'Koronadal City, South Cotabato', 'Tuguegarao City, Cagayan'];
const OPTA = ['No difference', 'Different house number', 'Different street name', 'Different city or town'];
const RA = rng('addr');
for (let k = 0; k < 200; k++) {
  const num = 10 + Math.floor(RA() * 2980), st = STREETS[Math.floor(RA() * STREETS.length)], town = TOWNS[Math.floor(RA() * TOWNS.length)];
  const kind = k % 4;
  const n2 = kind === 1 ? Number(String(num).split('').map((d, i, a) => (i === a.length - 1 - (k % a.length) ? String((Number(d) + 1 + (k % 8)) % 10) : d)).join('')) || num + 1 : num;
  const st2 = kind === 2 ? st.replace(/^(\S+)/, (w) => typo(w, k)) : st;
  const town2 = kind === 3 ? town.replace(/^([^,]+?)( City)?,/, (m, w, c) => `${typo(w, k)}${c || ''},`) : town;
  if (kind === 1 && n2 === num) continue;
  if ((kind === 2 && st2 === st) || (kind === 3 && town2 === town)) continue;
  const a1 = `${num} ${st}, ${town}`, a2 = `${n2} ${st2}, ${town2}`;
  const why = kind === 0 ? 'The number, street and town all match.' : kind === 1 ? `The house numbers differ: **${num}** vs **${n2}**.` : kind === 2 ? `The streets differ: **${st}** vs **${st2}**.` : `The towns differ: **${town.split(',')[0]}** vs **${town2.split(',')[0]}**.`;
  add('Checking Addresses', `Compare: "${a1}" and "${a2}". What is the difference?`, OPTA[kind], OPTA.filter((_, i) => i !== kind),
    `Check the **number first**, then each word of the street and the town.\n${why}\nSo: **${OPTA[kind]}**.`);
}

/* ---------- Checking dates ---------- */
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const RD = rng('dates');
const pad = (n) => String(n).padStart(2, '0');
for (let k = 0; k < 70; k++) {
  const m = Math.floor(RD() * 12), d = 1 + Math.floor(RD() * 28), y = 1990 + Math.floor(RD() * 40);
  if (d === m + 1 || d > 12 === false && k % 2 === 0) continue; // keep day and month clearly apart in half of them
  const num = `${pad(m + 1)}/${pad(d)}/${y}`, ans = `${MON[m]} ${d}, ${y}`;
  if (out.some((x) => x.q.includes(` ${num} `))) continue;
  const wrong = [d <= 12 ? `${MON[d - 1]} ${m + 1}, ${y}` : `${MON[(m + 1) % 12]} ${d}, ${y}`, `${MON[m]} ${d}, ${y + 1 - 2 * (k % 2)}`, `${MON[m]} ${d === 28 ? 18 : d + 10 > 28 ? d - 10 : d + 10}, ${y}`, `${MON[(m + 11) % 12]} ${d}, ${y}`];
  add('Checking Dates', `The date ${num} is written in the month/day/year form. Which date is the same?`, ans, [...new Set(wrong)].filter((x) => x !== ans).slice(0, 3),
    `MM/DD/YYYY = **month / day / year**.\n${pad(m + 1)} = **${MON[m]}**, ${pad(d)} = day **${d}**, ${y} = year.\nSo it is **${ans}**.`);
}
for (let k = 0; k < 50; k++) {
  const base = 2000 + Math.floor(RD() * 25);
  const ds = [];
  for (let j = 0; j < 4; j++) {
    const kind = (k + j) % 3;
    const y = base + (kind === 0 ? j % 2 : 0), m = kind === 1 ? (k + j * 4) % 12 : k % 12, d = 1 + ((k * 7 + j * 9) % 28);
    ds.push([y, m, d]);
  }
  const keyD = ([y, m, d]) => y * 10000 + m * 100 + d;
  if (new Set(ds.map(keyD)).size < 4) continue;
  const early = k % 2 === 0;
  const sorted = [...ds].sort((a, b) => keyD(a) - keyD(b));
  const pick = early ? sorted[0] : sorted[3];
  const show = ([y, m, d]) => `${pad(m + 1)}/${pad(d)}/${y}`;
  add('Checking Dates', `Which date is the ${early ? 'EARLIEST' : 'LATEST'} (month/day/year): ${ds.map(show).join(', ').replace(/, ([^,]+)$/, ' or $1')}?`, show(pick), ds.filter((x) => x !== pick).map(show),
    `Compare the **year** first, then the **month**, then the **day**.\nIn order: ${sorted.map(show).join(' → ')}.\nThe ${early ? 'earliest' : 'latest'} is **${show(pick)}**.`);
}

/* ---------- Checking lists: how many pairs are exactly alike? ---------- */
const RL = rng('lists');
const code = () => `${'ABCDEFGHJKLMNPRSTUVWXYZ'[Math.floor(RL() * 23)]}${'ABCDEFGHJKLMNPRSTUVWXYZ'[Math.floor(RL() * 23)]}-${1000 + Math.floor(RL() * 9000)}`;
const flip = (c, k) => {
  const a = c.split('');
  const i = [0, 1, 3, 4, 5, 6][k % 6];
  if (/\d/.test(a[i])) a[i] = String((Number(a[i]) + 1 + (k % 8)) % 10); else a[i] = a[i] === 'O' ? 'Q' : a[i] === 'E' ? 'F' : a[i] === 'P' ? 'R' : a[i] === 'M' ? 'N' : a[i] === 'N' ? 'M' : 'E';
  return a.join('') === c ? c.replace(/\d$/, (d) => String((Number(d) + 1) % 10)) : a.join('');
};
for (let k = 0; k < 190; k++) {
  const same = k % 5; // 0 to 4 pairs alike
  const pairsL = [];
  for (let j = 0; j < 4; j++) { const c = code(); pairsL.push([c, j < same ? c : flip(c, k + j)]); }
  const shown = pickSome(pairsL, 4, `lp${k}`);
  const alike = shown.filter(([a, b]) => a === b).length;
  add('Checking Lists', `How many of these pairs are EXACTLY alike? ${shown.map(([a, b]) => `${a} — ${b}`).join(' | ')}`, String(alike), ['0', '1', '2', '3', '4'].filter((x) => x !== String(alike)).sort((a, b) => Math.abs(a - alike) - Math.abs(b - alike)).slice(0, 3),
    `Check each pair letter by letter and digit by digit:\n${shown.map(([a, b]) => `${a} — ${b}: ${a === b ? 'alike' : 'different'}`).join('\n')}\nPairs exactly alike: **${alike}**.`);
}

module.exports = out;
