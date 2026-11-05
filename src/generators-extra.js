// Extra question generators. Each one builds a fresh item from templates and fact lists,
// so the same exam almost never repeats. They are added to the GENERATORS lists in generators.js.
const { GENERATORS, helpers, lists } = require('./generators');
const { ri, pick, shuffle, gcd, peso, fmt, mk, numDistractors, misspell } = helpers;
const { VOCAB, SALITA, SURNAMES, FIRST, SPELL } = lists;

/* ============================ GENERAL INFORMATION ============================ */
const G = 'general';
// [RA number, name] — checked against the official titles.
const LAWS = [
  ['3019', 'Anti-Graft and Corrupt Practices Act'],
  ['6713', 'Code of Conduct and Ethical Standards for Public Officials and Employees'],
  ['6981', 'Witness Protection, Security and Benefit Act'],
  ['7160', 'Local Government Code of 1991'],
  ['7277', 'Magna Carta for Disabled Persons'],
  ['7586', 'National Integrated Protected Areas System (NIPAS) Act of 1992'],
  ['7610', 'Special Protection of Children Against Abuse, Exploitation and Discrimination Act'],
  ['7877', 'Anti-Sexual Harassment Act of 1995'],
  ['7942', 'Philippine Mining Act of 1995'],
  ['8353', 'Anti-Rape Law of 1997'],
  ['8371', "Indigenous Peoples' Rights Act of 1997"],
  ['8550', 'Philippine Fisheries Code of 1998'],
  ['8749', 'Philippine Clean Air Act of 1999'],
  ['9003', 'Ecological Solid Waste Management Act of 2000'],
  ['9147', 'Wildlife Resources Conservation and Protection Act'],
  ['9165', 'Comprehensive Dangerous Drugs Act of 2002'],
  ['9184', 'Government Procurement Reform Act'],
  ['9262', 'Anti-Violence Against Women and Their Children Act of 2004'],
  ['9275', 'Philippine Clean Water Act of 2004'],
  ['9485', 'Anti-Red Tape Act of 2007'],
  ['9710', 'Magna Carta of Women'],
  ['9729', 'Climate Change Act of 2009'],
  ['9745', 'Anti-Torture Act of 2009'],
  ['9994', 'Expanded Senior Citizens Act of 2010'],
  ['10121', 'Philippine Disaster Risk Reduction and Management Act of 2010'],
  ['10173', 'Data Privacy Act of 2012'],
  ['10175', 'Cybercrime Prevention Act of 2012'],
  ['10354', 'Responsible Parenthood and Reproductive Health Act of 2012'],
  ['10368', 'Human Rights Victims Reparation and Recognition Act of 2013'],
  ['10533', 'Enhanced Basic Education Act of 2013'],
  ['10627', 'Anti-Bullying Act of 2013'],
  ['10911', 'Anti-Age Discrimination in Employment Act'],
  ['10931', 'Universal Access to Quality Tertiary Education Act'],
  ['11032', 'Ease of Doing Business and Efficient Government Service Delivery Act of 2018'],
  ['11054', 'Organic Law for the Bangsamoro Autonomous Region in Muslim Mindanao'],
  ['11058', 'Occupational Safety and Health Standards Law'],
  ['11166', 'Philippine HIV and AIDS Policy Act'],
  ['11210', '105-Day Expanded Maternity Leave Law'],
  ['11223', 'Universal Health Care Act'],
  ['11313', 'Safe Spaces Act'],
];
const ARTICLES = [
  ['I', 'National Territory'], ['II', 'Declaration of Principles and State Policies'], ['III', 'Bill of Rights'], ['IV', 'Citizenship'],
  ['V', 'Suffrage'], ['VI', 'Legislative Department'], ['VII', 'Executive Department'], ['VIII', 'Judicial Department'],
  ['IX', 'Constitutional Commissions'], ['X', 'Local Government'], ['XI', 'Accountability of Public Officers'], ['XII', 'National Economy and Patrimony'],
  ['XIII', 'Social Justice and Human Rights'], ['XIV', 'Education, Science and Technology, Arts, Culture and Sports'], ['XV', 'The Family'],
  ['XVI', 'General Provisions'], ['XVII', 'Amendments or Revisions'], ['XVIII', 'Transitory Provisions'],
];
// [office, minimum age, term in years, consecutive-term limit text]
const OFFICES = [
  ['President', 40, 6, 'not eligible for reelection'],
  ['Vice-President', 40, 6, 'no more than two successive terms'],
  ['Senator', 35, 6, 'no more than two consecutive terms'],
  ['Member of the House of Representatives', 25, 3, 'no more than three consecutive terms'],
];

const general = [
  function lawName() {
    const [n, name] = pick(LAWS);
    return mk(G, 'Philippine Laws', `Republic Act No. ${n} is known as the:`, name,
      shuffle(LAWS.filter((x) => x[0] !== n)).slice(0, 3).map((x) => x[1]), `**RA ${n}** (Republic Act No. ${n}) is the law called ==${name}==.`);
  },
  function lawNumber() {
    const [n, name] = pick(LAWS);
    return mk(G, 'Philippine Laws', `The ${name} is Republic Act No.:`, n,
      shuffle(LAWS.filter((x) => x[0] !== n)).slice(0, 3).map((x) => x[0]), `The **${name}** is ==RA ${n}== (Republic Act No. ${n}).`);
  },
  function articleTitle() {
    const [n, title] = pick(ARTICLES);
    return mk(G, '1987 Constitution', `Article ${n} of the 1987 Constitution is about:`, title,
      shuffle(ARTICLES.filter((x) => x[0] !== n)).slice(0, 3).map((x) => x[1]), `**Article ${n}** of the 1987 Constitution is about ==${title}==.`);
  },
  function articleNumber() {
    const [n, title] = pick(ARTICLES);
    return mk(G, '1987 Constitution', `Which article of the 1987 Constitution covers "${title}"?`, `Article ${n}`,
      shuffle(ARTICLES.filter((x) => x[0] !== n)).slice(0, 3).map((x) => `Article ${x[0]}`), `**${title}** is in ==Article ${n}== of the 1987 Constitution.`);
  },
  function officeAge() {
    const [o, age] = pick(OFFICES);
    return mk(G, '1987 Constitution', `Under the 1987 Constitution, the minimum age to be elected ${o} is:`, `${age} years old`,
      [21, 25, 30, 35, 40, 45].filter((a) => a !== age).map((a) => `${a} years old`).sort(() => Math.random() - 0.5),
      `The Constitution says a **${o}** must be at least ==${age} years old== on election day.\nEasy to remember: President and Vice-President **40**, Senator **35**, House Member **25**.`);
  },
  function officeTerm() {
    const [o, , term, limit] = pick(OFFICES);
    return mk(G, '1987 Constitution', `The term of office of a ${o} is:`, `${term} years`,
      [2, 3, 4, 5, 6, 7].filter((t) => t !== term).map((t) => `${t} years`).sort(() => Math.random() - 0.5),
      `A **${o}** serves ==${term} years== for one term (${limit}).\nEasy to remember: President, Vice-President and Senators **6 years**; House Members **3 years**.`);
  },
];

/* ============================ VERBAL ============================ */
const V = 'verbal';
const NOUNS = ['employees', 'applicants', 'students', 'officers', 'clerks', 'teachers', 'nurses', 'volunteers', 'engineers', 'examinees'];
const COMPLEMENTS = ['required to attend the orientation', 'assigned to the main office', 'on leave today', 'expected to arrive early', 'scheduled for an interview', 'included in the list'];
const VERBS = [ // base, past, 3rd person, -ing
  ['submit', 'submitted', 'submits', 'submitting', 'the report'], ['prepare', 'prepared', 'prepares', 'preparing', 'the payroll'],
  ['check', 'checked', 'checks', 'checking', 'the documents'], ['review', 'reviewed', 'reviews', 'reviewing', 'the files'],
  ['sign', 'signed', 'signs', 'signing', 'the vouchers'], ['update', 'updated', 'updates', 'updating', 'the records'],
  ['encode', 'encoded', 'encodes', 'encoding', 'the data'], ['print', 'printed', 'prints', 'printing', 'the forms'],
  ['clean', 'cleaned', 'cleans', 'cleaning', 'the office'], ['answer', 'answered', 'answers', 'answering', 'the calls'],
];
// Analogy pairs grouped by relationship.
const ANALOGY = {
  'young one': [['puppy', 'dog'], ['kitten', 'cat'], ['calf', 'cow'], ['foal', 'horse'], ['chick', 'hen'], ['cub', 'lion'], ['lamb', 'sheep'], ['tadpole', 'frog'], ['duckling', 'duck']],
  'worker and tool': [['carpenter', 'hammer'], ['surgeon', 'scalpel'], ['painter', 'brush'], ['tailor', 'needle'], ['barber', 'scissors'], ['photographer', 'camera'], ['mason', 'trowel'], ['writer', 'pen']],
  'worker and workplace': [['teacher', 'classroom'], ['doctor', 'hospital'], ['pilot', 'cockpit'], ['chef', 'kitchen'], ['judge', 'courtroom'], ['librarian', 'library'], ['farmer', 'farm'], ['actor', 'stage']],
  'member and group': [['bird', 'flock'], ['fish', 'school'], ['cow', 'herd'], ['wolf', 'pack'], ['bee', 'swarm'], ['soldier', 'army'], ['star', 'constellation'], ['island', 'archipelago'], ['ship', 'fleet'], ['singer', 'choir']],
  'part and whole': [['page', 'book'], ['petal', 'flower'], ['finger', 'hand'], ['toe', 'foot'], ['branch', 'tree'], ['room', 'house'], ['key', 'keyboard'], ['spoke', 'wheel'], ['brick', 'wall']],
  'instrument and what it measures': [['thermometer', 'temperature'], ['barometer', 'air pressure'], ['odometer', 'distance'], ['scale', 'weight'], ['clock', 'time'], ['ruler', 'length'], ['speedometer', 'speed'], ['seismograph', 'earthquakes']],
};
const allPairs = Object.values(ANALOGY).flat();
const an = (w) => (/^[aeiou]/i.test(w) ? 'an' : 'a');
const cap1 = (s) => s[0].toUpperCase() + s.slice(1);
// A simple sentence for each analogy link, so the link is easy to test.
const SAY = {
  'young one': (a, b) => `${cap1(an(a))} **${a}** is a baby **${b}**`,
  'worker and tool': (a, b) => `${cap1(an(a))} **${a}** uses ${an(b.replace(/=/g, ''))} **${b}**`,
  'worker and workplace': (a, b) => `${cap1(an(a))} **${a}** works in ${an(b.replace(/=/g, ''))} **${b}**`,
  'member and group': (a, b) => `${cap1(an(a))} **${a}** belongs to ${an(b.replace(/=/g, ''))} **${b}**`,
  'part and whole': (a, b) => `${cap1(an(a))} **${a}** is part of ${an(b.replace(/=/g, ''))} **${b}**`,
  'instrument and what it measures': (a, b) => `${cap1(an(a))} **${a}** measures **${b}**`,
};
const RAW = [ // Filipino words ending in a vowel (raw/rin) or consonant (daw/din)
  ['masaya', 'v'], ['pagod', 'c'], ['umalis', 'c'], ['kumain', 'c'], ['pumasa', 'v'], ['matalino', 'v'], ['mabait', 'c'], ['dumating', 'c'],
  ['maganda', 'v'], ['masipag', 'c'], ['nag-aral', 'c'], ['uuwi', 'v'], ['nagluto', 'v'], ['natulog', 'c'], ['abala', 'v'], ['handa', 'v'],
];
const NANG_ADV = ['mabilis', 'malakas', 'maingat', 'tahimik', 'mahinahon', 'masaya', 'maaga', 'malinaw'];
const NANG_VERB = [['Tumakbo', 'tumakbo'], ['Nagsalita', 'nagsalita'], ['Sumulat', 'sumulat'], ['Umawit', 'umawit'], ['Nagtrabaho', 'nagtrabaho'], ['Sumagot', 'sumagot']];
const NG_OBJ = [['Bumili', 'bigas'], ['Kumain', 'mangga'], ['Nagluto', 'adobo'], ['Uminom', 'tubig'], ['Nagbasa', 'pahayagan'], ['Sumulat', 'liham'], ['Nagdala', 'payong'], ['Naghanda', 'pagkain']];

const verbal = [
  function svSingular() {
    const n = pick(NOUNS), c = pick(COMPLEMENTS), q = pick(['Each of the', 'Every one of the', 'Neither of the', 'One of the']);
    return mk(V, 'Grammar', `${q} ${n} ___ ${c}.`, 'is', ['are', 'were', 'have been'],
      `Step 1: Find the real subject: **${q.split(' ')[0]}${q.startsWith('Every') ? ' one' : ''}** (it means just ONE).\nStep 2: "of the ${n}" only describes it, so it does not change the subject.\nStep 3: One thing → singular verb → ==is==.\n!!Trap!!: "${n}" is plural, but it is not the subject.`);
  },
  function svPlural() {
    const n = pick(NOUNS), c = pick(COMPLEMENTS), q = pick(['Both of the', 'Many of the', 'Several of the', 'Few of the']);
    return mk(V, 'Grammar', `${q} ${n} ___ ${c}.`, 'are', ['is', 'was', 'has been'],
      `Step 1: The subject is **${q.split(' ')[0]}** (of the ${n}), and it means MORE than one.\nStep 2: More than one → plural verb → ==are==.`);
  },
  function svNeitherNor() {
    const n = pick(NOUNS), c = pick(COMPLEMENTS);
    const singularLast = Math.random() < 0.5;
    const sentence = singularLast ? `Neither the ${n} nor the supervisor ___ ${c}.` : `Neither the supervisor nor the ${n} ___ ${c}.`;
    return mk(V, 'Grammar', sentence, singularLast ? 'is' : 'are', singularLast ? ['are', 'were', 'have been'] : ['is', 'was', 'has been'],
      `With **neither ... nor**, the verb follows the subject **closest to the blank**.\nThe closest subject is "${singularLast ? 'supervisor' : n}" → ${singularLast ? 'one person → ==is==' : 'more than one → ==are=='}.`);
  },
  function tense() {
    const [base, past, third, ing, obj] = pick(VERBS);
    const name = pick(FIRST);
    const t = ri(0, 2);
    if (t === 0) return mk(V, 'Grammar', `${name} ___ ${obj} yesterday.`, past, [`has ${past}`, third, ing],
      `**"Yesterday"** means it already happened and is finished.\nFinished in the past → simple past tense → ==${past}==.\n!!Trap!!: "has ${past}" is not used with "yesterday".`);
    if (t === 1) return mk(V, 'Grammar', `${name} ___ ${obj} next week.`, `will ${base}`, [past, `has ${past}`, ing],
      `**"Next week"** has not happened yet.\nNot yet → future tense → **will + verb** → ==will ${base}==.`);
    return mk(V, 'Grammar', `${name} ___ ${obj} every Monday.`, third, [base, ing, `have ${past}`],
      `**"Every Monday"** means a habit (something done again and again) → simple present tense.\n${name} is one person, so add **-s**: ==${third}==.`);
  },
  function pronounCase() {
    const [a, b] = shuffle(FIRST);
    const t = ri(0, 2);
    if (t === 0) return mk(V, 'Grammar', `The supervisor gave the new assignments to ${a} and ___.`, 'me', ['I', 'myself', 'mine'],
      `After **"to"**, use the receiver word: me, him, her, us, them.\nEasy test: cover "${a} and". "gave the new assignments to ==me==" ✓ ("to !!I!!" sounds wrong).`);
    if (t === 1) return mk(V, 'Grammar', `${a} and ___ will present the report tomorrow.`, 'I', ['me', 'myself', 'mine'],
      `The blank is one of the people **doing** the action (the subject), so use **I**.\nEasy test: cover "${a} and". "==I== will present the report" ✓ ("!!Me!! will present" sounds wrong).`);
    return mk(V, 'Grammar', `The manager thanked ${b} and ___ for the help.`, 'us', ['we', 'ourselves', 'our'],
      `The blank is the one **receiving** the thanks, so use the receiver word **us**.\nEasy test: cover "${b} and". "The manager thanked ==us==" ✓ ("thanked !!we!!" sounds wrong).`);
  },
  function analogyGen() {
    const cats = Object.keys(ANALOGY);
    const cat = pick(cats);
    const [p1, p2] = shuffle(ANALOGY[cat]);
    const fits = (x) => allPairs.some(([a, b]) => a === p2[0] && b === x);
    const ds = shuffle(allPairs.filter((p) => !ANALOGY[cat].includes(p)).map((p) => p[1])).filter((x) => x !== p2[1] && !fits(x));
    return mk(V, 'Word Analogy', `${p1[0].toUpperCase()} : ${p1[1].toUpperCase()} :: ${p2[0].toUpperCase()} : ___`, p2[1], ds,
      `Step 1: Make a sentence with the first pair: ${SAY[cat](p1[0], p1[1])}.\nStep 2: Use the same sentence for the second pair: ${SAY[cat](p2[0], `==${p2[1]}==`)}.\nThe link is **${cat}**.`);
  },
  function analogyAntonym() {
    const [a, b] = shuffle(VOCAB);
    return mk(V, 'Word Analogy', `${a[0].toUpperCase()} : ${a[2].toUpperCase()} :: ${b[0].toUpperCase()} : ___`, b[2],
      [b[1], ...shuffle(VOCAB.filter((x) => x !== a && x !== b)).slice(0, 2).map((x) => x[1])],
      `Step 1: **${cap1(a[0])}** and **${a[2]}** are opposites.\nStep 2: So find the opposite of **${b[0]}**. ${cap1(b[0])} means ${b[1]}, and the opposite is ==${b[2]}==.\n!!Trap!!: "${b[1]}" means the SAME as ${b[0]}, not the opposite.`);
  },
  function analogySynonym() {
    const [a, b] = shuffle(VOCAB);
    return mk(V, 'Word Analogy', `${a[0].toUpperCase()} : ${a[1].toUpperCase()} :: ${b[0].toUpperCase()} : ___`, b[1],
      [b[2], ...shuffle(VOCAB.filter((x) => x !== a && x !== b)).slice(0, 2).map((x) => x[2])],
      `Step 1: **${cap1(a[0])}** and **${a[1]}** mean the same thing.\nStep 2: So find the word that means the same as **${b[0]}**: ==${b[1]}==.\n!!Trap!!: "${b[2]}" is the opposite of ${b[0]}.`);
  },

  function nangNg() {
    const name = pick(FIRST);
    if (Math.random() < 0.5) {
      const [v] = pick(NANG_VERB), adv = pick(NANG_ADV);
      return mk(V, 'Wastong Gamit (Filipino)', `Piliin ang wastong salita: "${v} ___ ${adv} si ${name}."`, 'nang', ['ng', 'na', 'ang'],
        `Ang "${adv}" ay nagsasabi kung **paano** ${v.toLowerCase()} si ${name}.\nKapag sinasagot ang **"paano?"** → gamitin ang ==nang==.\nHalimbawa: Tumakbo **nang** mabilis.`);
    }
    const [v, obj] = pick(NG_OBJ);
    return mk(V, 'Wastong Gamit (Filipino)', `Piliin ang wastong salita: "${v} ___ ${obj} si ${name}."`, 'ng', ['nang', 'na', 'ang'],
      `Ang "${obj}" ay **bagay** (pangngalan): ito ang layon ng "${v.toLowerCase()}".\nBago ang pangngalan → gamitin ang ==ng==.\nHalimbawa: Bumili **ng** bigas.`);
  },
  function rawDaw() {
    const name = pick(FIRST);
    const words = shuffle(RAW).slice(0, 3);
    const useRin = Math.random() < 0.5;
    const right = (w) => (w[1] === 'v' ? (useRin ? 'rin' : 'raw') : (useRin ? 'din' : 'daw'));
    const wrong = (w) => (w[1] === 'v' ? (useRin ? 'din' : 'daw') : (useRin ? 'rin' : 'raw'));
    const cap = (s) => s[0].toUpperCase() + s.slice(1);
    const correct = `${cap(words[0][0])} ${right(words[0])} si ${name}.`;
    const ds = [`${cap(words[0][0])} ${wrong(words[0])} si ${name}.`, `${cap(words[1][0])} ${wrong(words[1])} si ${name}.`, `${cap(words[2][0])} ${wrong(words[2])} si ${name}.`];
    return mk(V, 'Wastong Gamit (Filipino)', 'Alin ang may wastong gamit ng ' + (useRin ? '"rin/din"' : '"raw/daw"') + '?', correct, ds,
      `Tingnan ang **huling titik** ng salita bago ang ${useRin ? 'rin/din' : 'raw/daw'}.\n"${words[0][0]}" ay nagtatapos sa **${words[0][0].slice(-1)}** → ${words[0][1] === 'v' ? `patinig (a, e, i, o, u) → **${useRin ? 'rin' : 'raw'}**` : `katinig → **${useRin ? 'din' : 'daw'}**`}.\nKaya ang tama: ==${correct}==`);
  },

];

/* ============================ NUMERICAL ============================ */
const N = 'numerical';
const numerical = [
  function percentChange() {
    const old = ri(4, 50) * 20, p = pick([5, 10, 15, 20, 25, 30, 40, 50]);
    const up = Math.random() < 0.5;
    const neu = up ? old + (old * p) / 100 : old - (old * p) / 100;
    return mk(N, 'Percentage', `The price of a sack of rice changed from ${peso(old)} to ${peso(neu)}. What is the percent ${up ? 'increase' : 'decrease'}?`,
      p + '%', numDistractors(p, { step: 5 }).map((x) => x + '%'),
      `Step 1: Find how much it changed: ${peso(Math.max(neu, old))} − ${peso(Math.min(neu, old))} = **${peso(Math.abs(neu - old))}**.\nStep 2: Divide by the **old** price: ${peso(Math.abs(neu - old))} ÷ ${peso(old)} = ${p / 100}.\nStep 3: Multiply by 100: ==${p}%== ${up ? 'increase' : 'decrease'}.\n!!Trap!!: always divide by the OLD price, not the new one.`);
  },
  function gcfLcm() {
    const g = ri(2, 12), a = g * ri(2, 9), b = g * ri(2, 9);
    if (a === b) return null;
    const G2 = gcd(a, b), L = (a * b) / G2;
    if (Math.random() < 0.5) return mk(N, 'Basic Operations', `What is the greatest common factor (GCF) of ${a} and ${b}?`, G2, numDistractors(G2, { step: Math.max(1, Math.round(G2 / 2)) }).concat([a, b]), `GCF = the **biggest number** that divides both evenly.\n${a} = ${G2} × ${a / G2}\n${b} = ${G2} × ${b / G2}\n${a / G2} and ${b / G2} share no other factor, so the GCF is ==${G2}==.`);
    return mk(N, 'Basic Operations', `What is the least common multiple (LCM) of ${a} and ${b}?`, L, [a * b === L ? L * 2 : a * b, L + G2, L - G2, L / 2].filter((x) => x > 0 && Number.isInteger(x)), `LCM = the **smallest number** that both ${a} and ${b} go into.\nStep 1: The GCF of ${a} and ${b} is **${G2}**.\nStep 2: LCM = (${a} × ${b}) ÷ ${G2} = ${a * b} ÷ ${G2} = ==${L}==.\nCheck: ${L} ÷ ${a} = ${L / a} and ${L} ÷ ${b} = ${L / b} ✓`);
  },
  function powersRoots() {
    if (Math.random() < 0.5) {
      const n = ri(11, 30);
      return mk(N, 'Basic Operations', `What is the square root of ${n * n}?`, n, [n + 1, n - 1, n + 2, Math.round((n * n) / 2)], `Square root asks: **what number times itself** makes ${n * n}?\n${n} × ${n} = ${n * n}, so the answer is ==${n}==.`);
    }
    const b = ri(2, 6), e = ri(2, 4);
    return mk(N, 'Basic Operations', `What is ${b} raised to the power of ${e} (${b}^${e})?`, b ** e, [b * e, b ** (e + 1), b ** e + b, (b + 1) ** e], `${b}^${e} means ${b} multiplied by itself **${e} times**.\n${Array(e).fill(b).join(' × ')} = ==${b ** e}==${b * e === b ** e ? '' : `\n!!Trap!!: it is NOT ${b} × ${e} = ${b * e}.`}`);
  },
  function conversion() {
    const t = ri(0, 3);
    if (t === 0) { const km = ri(2, 30) / 2; return mk(N, 'Measurement', `How many meters are in ${km} kilometers?`, fmt(km * 1000) + ' m', [fmt(km * 100) + ' m', fmt(km * 10) + ' m', fmt(km * 10000) + ' m'], `1 km = **1,000 m**. Big unit → small unit, so **multiply**.\n${km} × 1,000 = ==${fmt(km * 1000)} m==.`); }
    if (t === 1) { const h = ri(2, 9) + pick([0, 0.25, 0.5, 0.75]); return mk(N, 'Measurement', `How many minutes are in ${h} hours?`, `${h * 60} minutes`, [`${h * 100} minutes`, `${h * 60 + 15} minutes`, `${h * 60 - 30} minutes`], `1 hour = **60 minutes**.\n${h} × 60 = ==${h * 60} minutes==.\n!!Trap!!: an hour is 60 minutes, not 100.`); }
    if (t === 2) { const kg = ri(3, 40) / 2; return mk(N, 'Measurement', `How many grams are in ${kg} kilograms?`, fmt(kg * 1000) + ' g', [fmt(kg * 100) + ' g', fmt(kg * 10) + ' g', fmt(kg * 10000) + ' g'], `1 kg = **1,000 g**. Big unit → small unit, so **multiply**.\n${kg} × 1,000 = ==${fmt(kg * 1000)} g==.`); }
    const l = ri(2, 20); return mk(N, 'Measurement', `A container holds ${l} liters. How many 250-mL bottles can it fill?`, l * 4, [l * 2, l * 25, l * 40, l * 5], `Step 1: 1 L = 1,000 mL, so ${l} L = **${l * 1000} mL**.\nStep 2: ${l * 1000} ÷ 250 = ==${l * 4} bottles==.\nEasy way: 4 bottles of 250 mL make 1 L, so ${l} × 4 = ${l * 4}.`);
  },
  function median() {
    const n = pick([5, 7]);
    const nums = shuffle(Array.from({ length: n }, () => ri(10, 99)));
    const sorted = nums.slice().sort((a, b) => a - b);
    const med = sorted[(n - 1) / 2];
    const avg = Math.round(nums.reduce((a, b) => a + b, 0) / n);
    return mk(N, 'Statistics', `What is the median of: ${nums.join(', ')}?`, med, [avg, sorted[0], sorted[n - 1], sorted[(n - 1) / 2 + 1], sorted[(n - 1) / 2 - 1]],
      `Step 1: Put the numbers **in order**: ${sorted.join(', ')}.\nStep 2: There are ${n} numbers, so the middle one is number **${(n + 1) / 2}**.\nStep 3: Number ${(n + 1) / 2} in the list is ==${med}==.\n!!Trap!!: the median is the middle number, not the average.`);
  },
  function elapsedTime() {
    const sh = ri(6, 11), sm = pick([0, 15, 30, 45]), dur = ri(5, 40) * 15;
    const end = sh * 60 + sm + dur;
    const fmtT = (m) => { const h = Math.floor(m / 60) % 24, mm = m % 60; return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
    const durText = (d) => `${Math.floor(d / 60)} hr ${d % 60} min`;
    return mk(N, 'Time', `A seminar started at ${fmtT(sh * 60 + sm)} and ended at ${fmtT(end)}. How long did it last?`, durText(dur),
      [durText(dur + 60), durText(Math.max(15, dur - 60)), durText(dur + 15), durText(Math.max(15, dur - 15))],
      [Math.floor(dur / 60) ? `Count the whole hours: ${fmtT(sh * 60 + sm)} → ${fmtT(sh * 60 + sm + Math.floor(dur / 60) * 60)} is **${Math.floor(dur / 60)} hr**.` : '',
        dur % 60 ? `Count the extra minutes: ${fmtT(sh * 60 + sm + Math.floor(dur / 60) * 60)} → ${fmtT(end)} is **${dur % 60} min**.` : '']
        .filter(Boolean).map((x, i) => `Step ${i + 1}: ${x}`).join('\n') + `\nTotal: ==${durText(dur)}==.`);
  },
  function rounding() {
    const n = ri(1000, 99999) + ri(0, 999) / 1000;
    const place = pick([['nearest hundred', 100], ['nearest thousand', 1000], ['nearest ten', 10]]);
    const ans = Math.round(n / place[1]) * place[1];
    const peek = Math.floor(n / (place[1] / 10)) % 10; // the digit just to the right of the place
    return mk(N, 'Basic Operations', `Round ${fmt(n)} to the ${place[0]}.`, fmt(ans), [fmt(ans + place[1]), fmt(ans - place[1]), fmt(Math.floor(n))],
      `Step 1: Find the **${place[0].replace('nearest ', '')}s** place.\nStep 2: Look at the digit just to its right: it is **${peek}**.\nStep 3: ${peek >= 5 ? '5 or more → round **up**.' : 'Less than 5 → keep it the same (round **down**).'}\nAnswer: ==${fmt(ans)}==`);
  },
  function wagesProblem() {
    const rate = ri(40, 90) * 10, days = ri(5, 26);
    return mk(N, 'Word Problem', `A worker earns ${peso(rate)} per day. How much will the worker earn in ${days} days?`, peso(rate * days),
      numDistractors(rate * days, { step: rate }).map(peso), `Pay for **1 day** × the **number of days**.\n${peso(rate)} × ${days} = ==${peso(rate * days)}==.`);
  },
  function changeMoney() {
    const items = Array.from({ length: 3 }, () => ri(20, 250));
    const total = items.reduce((a, b) => a + b, 0);
    const paid = Math.ceil((total + 1) / 500) * 500;
    return mk(N, 'Word Problem', `Ana bought items costing ${items.map(peso).join(', ')} and paid with ${peso(paid)}. How much change should she receive?`,
      peso(paid - total), numDistractors(paid - total, { step: 10 }).map(peso), `Step 1: Add the prices: ${items.map(peso).join(' + ')} = **${peso(total)}**.\nStep 2: Change = money paid − total: ${peso(paid)} − ${peso(total)} = ==${peso(paid - total)}==.`);
  },
];

/* ============================ ANALYTICAL ============================ */
const A = 'analytical';
const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const analytical = [
  function ordering() {
    const names = shuffle(['Ana', 'Ben', 'Carl', 'Dina', 'Ella', 'Fe', 'Gary', 'Hans']).slice(0, 4);
    const order = names; // tallest -> shortest
    const facts = shuffle([`${order[0]} is taller than ${order[1]}.`, `${order[1]} is taller than ${order[2]}.`, `${order[2]} is taller than ${order[3]}.`]);
    const askShortest = Math.random() < 0.5;
    return mk(A, 'Logic', `${facts.join(' ')} Who is the ${askShortest ? 'shortest' : 'tallest'}?`, askShortest ? order[3] : order[0],
      askShortest ? order.slice(0, 3) : order.slice(1),
      `Join the clues like a chain (taller on the left):\n${order[0]} > ${order[1]}\n${order[1]} > ${order[2]}\n${order[2]} > ${order[3]}\nSo: **${order.join(' > ')}**.\nThe ${askShortest ? 'shortest is the last one' : 'tallest is the first one'}: ==${askShortest ? order[3] : order[0]}==.`);
  },
  function numberAnalogy() {
    const t = ri(0, 2);
    const a = ri(2, 9); let b = ri(2, 9); while (b === a) b = ri(2, 9);
    const f = [(x) => x * x, (x) => x * x * x, (x) => x * 3 + 1][t];
    const show = [(x) => `${x} × ${x}`, (x) => `${x} × ${x} × ${x}`, (x) => `${x} × 3 + 1`][t];
    const rule = ['times itself (squared)', 'times itself 3 times (cubed)', 'times 3, then plus 1'][t];
    return mk(A, 'Number Analogy', `${a} : ${f(a)} :: ${b} : ___`, f(b), [f(b) + b, f(b) - 1, [(x) => x * x * x, (x) => x * x, (x) => x * x][t](b)].concat([f(b) + 2]),
      `Step 1: Find the rule in the first pair: ${show(a)} = ${f(a)}. The rule is **${rule}**.\nStep 2: Use the same rule: ${show(b)} = ==${f(b)}==.`);
  },
  function letterSum() {
    const words = ['CAT', 'DOG', 'SUN', 'BAG', 'PEN', 'MAP', 'CUP', 'BOX', 'HAT', 'JAR', 'KEY', 'LOG'];
    const [w1, w2] = shuffle(words);
    const val = (w) => w.split('').reduce((s, c) => s + L.indexOf(c) + 1, 0);
    return mk(A, 'Coding-Decoding', `If A = 1, B = 2, C = 3, and so on, and ${w1} = ${val(w1)}, what is ${w2}?`, val(w2), numDistractors(val(w2), { step: 2 }),
      `Add the number of each letter (A=1, B=2 ... Z=26).\nCheck the rule: ${w1} = ${w1.split('').map((c) => `${c}(${L.indexOf(c) + 1})`).join(' + ')} = ${val(w1)} ✓\nNow: ${w2} = ${w2.split('').map((c) => `${c}(${L.indexOf(c) + 1})`).join(' + ')} = ==${val(w2)}==.`);
  },
  function missingPair() {
    const k = ri(2, 6), base = ri(2, 12);
    const pairs = [0, 1, 2].map((i) => [base + i * ri(1, 4), 0]).map(([x]) => [x, x * k]);
    const x = base + ri(5, 15);
    return mk(A, 'Number Analogy', `Find the missing number: (${pairs.map((p) => p.join(', ')).join('), (')}), (${x}, ___)`, x * k,
      numDistractors(x * k, { step: k }), `Look inside each pair: ${pairs.map((p) => `${p[0]} × ${k} = ${p[1]}`).join(', ')}.\nThe rule: second number = **first × ${k}**.\n${x} × ${k} = ==${x * k}==.`);
  },
  function mixedSeries() {
    const s = ri(0, 10), n = ri(1, 5), k = ri(1, 3);
    const seq = Array.from({ length: 4 }, (_, i) => `${L[s + i * k]}${n + i * 2}`);
    const next = `${L[s + 4 * k]}${n + 8}`;
    return mk(A, 'Letter Series', `What comes next? ${seq.join(', ')}, ___`, next,
      [`${L[s + 4 * k]}${n + 9}`, `${L[s + 4 * k + 1]}${n + 8}`, `${L[s + 3 * k + 1]}${n + 8}`, `${L[s + 5 * k]}${n + 10}`],
      `Split each one into a letter and a number.\nLetters: ${seq.map((x) => x.replace(/\d+/, '')).join(', ')} → move **${k} step${k > 1 ? 's' : ''} forward** → next is **${L[s + 4 * k]}**.\nNumbers: ${seq.map((x) => x.replace(/^[A-Z]/, '')).join(', ')} → **+2** each time → next is **${n + 8}**.\nPut together: ==${next}==.`);
  },
];

/* ============================ CLERICAL ============================ */
const C = 'clerical';
const COMPANIES = ['Abad Trading', 'Agila Enterprises', 'Bagong Buhay Store', 'Bituin Hardware', 'Dagat Seafoods', 'Dalisay Printing', 'Gintong Butil Rice Mill', 'Habagat Travel', 'Kalayaan Motors', 'Liwayway Bakery', 'Mabuhay Pharmacy', 'Malaya Construction', 'Pag-asa Supply', 'Sampaguita Flowers', 'Tala Electronics', 'Tagumpay Foods'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const clerical = [
  function oneMisspelled() {
    const words = shuffle(SPELL).slice(0, 4);
    const bad = misspell(words[0])[0];
    if (!bad) return null;
    return mk(C, 'Spelling', 'Which word is MISSPELLED?', bad, words.slice(1),
      `The right spelling is **${words[0]}**, so ==${bad}== is misspelled.\nThe others (${words.slice(1).join(', ')}) are spelled correctly.`);
  },
  function companyFiling() {
    const list = shuffle(COMPANIES).slice(0, 4);
    const sorted = list.slice().sort((a, b) => a.replace(/[\s-]/g, '').localeCompare(b.replace(/[\s-]/g, '')));
    const which = pick([['FIRST', 0], ['LAST', 3], ['SECOND', 1]]);
    return mk(C, 'Alphabetical Filing', `In an alphabetical file of business names, which comes ${which[0]}?`, sorted[which[1]], sorted.filter((_, i) => i !== which[1]),
      `Read each name letter by letter (skip spaces and dashes) and put them in A–Z order:\n${sorted.map((x, i) => `${i + 1}. ${x}`).join('\n')}\nThe ${which[0].toLowerCase()} one is ==${sorted[which[1]]}==.`);
  },
  function dateMatch() {
    const m = ri(0, 11), d = ri(1, 28), y = ri(1990, 2025);
    const ref = `${MONTHS[m]} ${d}, ${y}`;
    const num = `${String(m + 1).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`;
    const wrong = [
      `${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`,
      `${String(m + 1).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y + 1}`,
      `${String(((m + 1) % 12) + 1).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`,
      `${String(m + 1).padStart(2, '0')}/${String(d === 28 ? 27 : d + 1).padStart(2, '0')}/${y}`,
    ].filter((x) => x !== num);
    return mk(C, 'Checking Dates', `Which is the same date as "${ref}" written in MM/DD/YYYY format?`, num, wrong,
      `MM/DD/YYYY = **month / day / year**.\n${MONTHS[m]} is month **${String(m + 1).padStart(2, '0')}**, the day is **${String(d).padStart(2, '0')}**, the year is **${y}**.\nSo it is ==${num}==.${m + 1 !== d ? `\n!!Trap!!: ${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y} puts the day first.` : ''}`);
  },
  function countLetter() {
    const name = `${pick(FIRST)} ${pick(SURNAMES)} ${pick(SURNAMES)}`.toUpperCase();
    const letters = [...new Set(name.replace(/[^A-Z]/g, ''))];
    const ch = pick(letters);
    const n = name.split('').filter((c) => c === ch).length;
    return mk(C, 'Checking Names', `How many times does the letter "${ch}" appear in: ${name}?`, n, [n + 1, n + 2, Math.max(0, n - 1), n + 3].filter((x) => x !== n),
      `Go word by word and count the "${ch}":\n${name.split(' ').map((w) => `${w} → ${w.split('').filter((c) => c === ch).length}`).join('\n')}\nTotal: ==${n}==.`);
  },
  function codeLookup() {
    const offices = shuffle(['Accounting', 'Budget', 'Cashier', 'Human Resource', 'Legal', 'Records', 'Planning', 'Supply']).slice(0, 5);
    const codes = offices.map(() => `${pick('ABCDEFGHJK'.split(''))}${ri(100, 999)}`);
    if (new Set(codes).size < 5) return null;
    const i = ri(0, 4);
    return mk(C, 'Coding', `Office codes: ${offices.map((o, k) => `${o} = ${codes[k]}`).join('; ')}. What is the code for ${offices[i]}?`, codes[i],
      codes.filter((_, k) => k !== i), `Find **${offices[i]}** in the list. The code right beside it is ==${codes[i]}==.`);
  },
];

GENERATORS.general.push(...general);
GENERATORS.verbal.push(...verbal);
GENERATORS.numerical.push(...numerical);
GENERATORS.analytical.push(...analytical);
GENERATORS.clerical.push(...clerical);

module.exports = { LAWS, ARTICLES };
