// Verbal Ability: grammar and correct usage, written by hand (1.45.0).
// Each part pairs hand-written sentence parts with hand-written rules. The wrong choices are forms that
// can never fit the blank (e.g. "being" in "Each of the clerks ___ ready"), so only one choice is right.
const { rows } = require('./bank-tools');

const V = 'verbal';
const out = [];
const add = (t, q, a, d, e) => out.push({ s: V, t, q, a, d, e });

/* ---------- 1. Subject-verb agreement ---------- */
// subject | singular or plural (s/p) | why
const SUBJECTS = rows(`
Each of the employees | s | **Each** means each ONE. "of the employees" only describes it.
Every one of the applicants | s | **Every one** = one person at a time.
Neither of the reports | s | **Neither** (not this one, not that one) is ONE at a time.
Either of the two clerks | s | **Either** (this one or that one) is ONE at a time.
Everyone in the office | s | **Everyone, everybody, someone, nobody** are always singular.
Nobody in the two sections | s | **Nobody** is always singular.
Somebody from the regional offices | s | **Somebody** is always singular.
The members of the board | p | The real subject is **members** (many).
The number of applicants | s | **The number of** = one number → singular.
A number of applicants | p | **A number of** = many → plural.
The teacher, together with her pupils, | s | Phrases like **together with, along with, as well as** do not change the subject. The subject is **teacher** (one).
The manager, as well as the two supervisors, | s | **as well as ...** does not change the subject. The subject is **manager** (one).
The clerks, along with their supervisor, | p | **along with ...** does not change the subject. The subject is **clerks** (many).
Both the cashier and the guard | p | **Both A and B** = two people → plural.
The cashier and the guard | p | Two subjects joined by **and** → plural.
Either the clerk or the supervisors | p | With **either ... or**, follow the subject **closest** to the verb: **supervisors** (many).
Either the supervisors or the clerk | s | With **either ... or**, follow the subject **closest** to the verb: **clerk** (one).
Neither the students nor the teacher | s | With **neither ... nor**, follow the subject **closest** to the verb: **teacher** (one).
Neither the teacher nor the students | p | With **neither ... nor**, follow the subject **closest** to the verb: **students** (many).
The committee | s | The committee acts as **one group** here → singular.
Many a student | s | **Many a** + singular noun takes a singular verb.
`).map(([subj, n, why]) => ({ subj, n, why }));

// singular | plural | rest of the sentence | two forms that never fit (for subjects that are people)
const PREDICATES = rows(`
is | are | ready for the inspection. | be, being
has | have | already submitted the form. | having, to have
was | were | late for the flag ceremony yesterday. | be, been
needs | need | more time to finish the task. | needing, to need
does | do | not agree with the new schedule. | doing, done
seems | seem | happy with the result. | seeming, to seem
`);

SUBJECTS.forEach(({ subj, n, why }) => {
  PREDICATES.forEach(([sg, pl, rest, bad]) => {
    const right = n === 's' ? sg : pl, other = n === 's' ? pl : sg;
    const [b1, b2] = bad.split(',').map((x) => x.trim());
    add('Grammar', `${subj} ___ ${rest}`, right, [other, b1, b2],
      `Step 1: Find the real subject.\n${why}\nStep 2: ${n === 's' ? 'One (singular)' : 'Many (plural)'} → **${n === 's' ? 'singular' : 'plural'} verb** → ==${right}==.\n!!Trap!!: "${b1}" and "${b2}" can never complete this sentence.`);
  });
});

// Subjects that are things: each with its own sentences (verb key: be = is/are, was = was/were, has = has/have).
// subject | s/p | why | sentences with ___
const VERB = { be: ['is', 'are', 'be', 'being'], was: ['was', 'were', 'be', 'been'], has: ['has', 'have', 'having', 'to have'] };
rows(`
The list of requirements | s | The real subject is **list** (one list). "of requirements" only describes it. | be:___ posted at the main door. ; was:___ updated last week. ; has:___ been sent to all applicants.
The box of old files | s | The real subject is **box** (one box). "of old files" only describes it. | be:___ too heavy to carry. ; was:___ moved to the stockroom. ; has:___ been labeled.
The quality of the new chairs | s | The real subject is **quality** (one thing). | be:___ better than we expected. ; was:___ checked by the supply officer. ; has:___ improved this year.
Mathematics | s | Some subjects end in -s but are ONE subject: **mathematics, physics, economics**. | be:___ my favorite subject. ; was:___ hard for me in high school. ; has:___ always been useful in my job.
The news from the provinces | s | **News** ends in -s but is singular. | be:___ good this morning. ; was:___ announced on the radio. ; has:___ reached the main office.
Five hundred pesos | s | An **amount of money** taken as one sum is singular. | be:___ enough for the fare. ; was:___ the price of the book. ; has:___ been set aside for snacks.
Ten kilometers | s | A **distance** taken as one amount is singular. | be:___ a long way to walk. ; was:___ the length of the fun run. ; has:___ been the limit for the service vehicle.
My pair of glasses | s | The real subject is **pair** (one pair). | be:___ on the table. ; was:___ found in the canteen. ; has:___ a broken frame.
The scissors on the table | p | **Scissors, pants, glasses** (without "pair of") are plural. | be:___ very sharp. ; was:___ bought last month. ; has:___ been used by the clerks.
The papers on my desk | p | The real subject is **papers** (many). | be:___ ready for signing. ; was:___ arranged by date. ; has:___ been checked.
The results of the survey | p | The real subject is **results** (many). "of the survey" only describes it. | be:___ now available. ; was:___ shown at the meeting. ; has:___ surprised the staff.
`).forEach(([subj, n, why, sents]) => {
  for (const part of sents.split(';')) {
    const [key, rest] = part.trim().split(/:(.*)/s);
    const [sg, pl, b1, b2] = VERB[key];
    const right = n === 's' ? sg : pl, other = n === 's' ? pl : sg;
    add('Grammar', `${subj} ${rest.trim()}`, right, [other, b1, b2],
      `Step 1: Find the real subject.\n${why}\nStep 2: ${n === 's' ? 'One (singular)' : 'Many (plural)'} → **${n === 's' ? 'singular' : 'plural'} verb** → ==${right}==.\n!!Trap!!: "${b1}" and "${b2}" can never complete this sentence.`);
  }
});

/* ---------- 2. Pronoun case (I or me) ---------- */
// sentence with ___ | subject (S) or object (O) | why
const PRON_CTX = rows(`
Between you and ___, the plan will not work. | O | After a word like **between, to, for, with** (a preposition), use the object form.
The supervisor asked Ana and ___ to stay late. | O | The pronoun **receives** the action (asked whom?), so use the object form.
The award was given to Ben and ___. | O | After **to**, use the object form.
Please send the files to ___ before noon. | O | After **to**, use the object form.
The visitors waited for Carla and ___ at the lobby. | O | After **for**, use the object form.
Mario and ___ will attend the seminar. | S | The pronoun **does** the action (who will attend?), so use the subject form.
___ and the treasurer prepared the budget. | S | The pronoun **does** the action, so use the subject form.
`);
// subject form | object form | reflexive | possessive | be-verb for "than ___ is/am/are"
const PRONOUNS = rows(`
I | me | myself | mine
he | him | himself | his
she | her | herself | hers
we | us | ourselves | ours
they | them | themselves | theirs
`);
PRON_CTX.forEach(([q, c, why]) => {
  PRONOUNS.forEach(([sub, obj, refl, poss]) => {
    const right = c === 'S' ? sub : obj, other = c === 'S' ? obj : sub;
    const cap = (w) => (q.startsWith('___') ? w[0].toUpperCase() + w.slice(1) : w);
    if (sub === 'I' && q.startsWith('Between you and')) return; // already in bank-verbal.js
    if (sub === 'I' && q.startsWith('___')) return; // "I and the treasurer" is not polite English (we say "The treasurer and I")
    add('Grammar', q, cap(right), [cap(other), cap(refl), cap(poss)],
      `Step 1: ${why}\nStep 2: ${c === 'S' ? 'Subject forms: I, he, she, we, they.' : 'Object forms: me, him, her, us, them.'}\nSo the answer is ==${cap(right)}==.\n!!Trap!!: "${refl}" is only used when the same person is the doer (I hurt myself), and "${poss}" means "belonging to".`);
  });
});

/* ---------- 3. Verb tense with a time clue ---------- */
// base | past | past participle | -ing | -s form
const VERBS = rows(`
submit | submitted | submitted | submitting | submits
finish | finished | finished | finishing | finishes
write | wrote | written | writing | writes
choose | chose | chosen | choosing | chooses
begin | began | begun | beginning | begins
bring | brought | brought | bringing | brings
take | took | taken | taking | takes
give | gave | given | giving | gives
speak | spoke | spoken | speaking | speaks
send | sent | sent | sending | sends
prepare | prepared | prepared | preparing | prepares
review | reviewed | reviewed | reviewing | reviews
teach | taught | taught | teaching | teaches
buy | bought | bought | buying | buys
drive | drove | driven | driving | drives
`);
// The objects for each verb, so the sentence makes sense.
const OBJ = {
  submit: 'the report', finish: 'the inventory', write: 'the memo', choose: 'the venue', begin: 'the training', bring: 'the documents',
  take: 'the exam', give: 'the instructions', speak: 'to the visitors', send: 'the invitation', prepare: 'the payroll',
  review: 'the contract', teach: 'the new staff', buy: 'the supplies', drive: 'the service vehicle',
};
VERBS.forEach(([base, past, pp, ing, s]) => {
  const o = OBJ[base];
  add('Grammar', `Yesterday, the secretary ___ ${o}.`, past, [s, `will ${base}`, `has ${pp}`],
    `Step 1: Look for the time clue: **Yesterday** = the past, and it is already finished.\nStep 2: Use the simple past: ==${past}==.\n!!Trap!!: "has ${pp}" is never used with a finished time like yesterday.`);
  add('Grammar', `Tomorrow, the secretary ___ ${o}.`, `will ${base}`, [past, `has ${pp}`, ing],
    `Step 1: Look for the time clue: **Tomorrow** = the future.\nStep 2: Use **will + base verb**: ==will ${base}==.\n!!Trap!!: "${ing}" needs a helping verb (is, will be) before it.`);
  add('Grammar', `Right now, the secretary ___ ${o}.`, `is ${ing}`, [s, past, `has ${pp}`],
    `Step 1: Look for the time clue: **Right now** = it is happening at this moment.\nStep 2: Use **is + -ing**: ==is ${ing}==.`);
  add('Grammar', `By the time the director arrived, the secretary ___ ${o}.`, `had ${pp}`, [`has ${pp}`, `will ${base}`, s],
    `Step 1: Two past actions: the director **arrived** (past), and the secretary's action happened **before** that.\nStep 2: The earlier of two past actions uses **had + past participle**: ==had ${pp}==.`);
  add('Grammar', `The secretary ___ ${o} every Monday since last year.`, `has ${pp}`, [`is ${ing}`, `will ${base}`, ing],
    `Step 1: Look for the time clue: **since last year** = it started in the past and still goes on now.\nStep 2: Use **has + past participle**: ==has ${pp}==.\n!!Trap!!: "${ing}" alone has no helping verb, so it is never a full verb.`);
});

/* ---------- 4. Comparing (taller, tallest) ---------- */
// base | comparative | superlative | sentence for two things | sentence for three or more
rows(`
tall | taller | tallest | The new building is ___ than the old one. | That is the ___ building in our town.
fast | faster | fastest | Ana types ___ than Ben. | Of the three runners, Liza is the ___.
old | older | oldest | Mang Tony is ___ than his brother. | Mang Tony is the ___ employee in the office.
young | younger | youngest | Carlo is ___ than his sister. | Carlo is the ___ of the five applicants.
busy | busier | busiest | The cashier is ___ today than yesterday. | Monday is the ___ day of the week for the cashier.
heavy | heavier | heaviest | This box is ___ than that bag. | This is the ___ box in the stockroom.
easy | easier | easiest | The second test was ___ than the first. | That was the ___ of all the tests.
big | bigger | biggest | Our office is ___ than theirs. | This is the ___ room on the floor.
hot | hotter | hottest | Today is ___ than yesterday. | April is often the ___ month of the year.
good | better | best | Your plan is ___ than mine. | This is the ___ plan of all.
bad | worse | worst | The traffic today is ___ than last week. | This is the ___ traffic jam this year.
far | farther | farthest | Batangas is ___ from here than Cavite. | Of all the branches, the Davao branch is the ___ from Manila.
important | more important | most important | Safety is ___ than speed. | Honesty is the ___ value of a public servant.
difficult | more difficult | most difficult | Math is ___ than spelling for me. | That was the ___ question in the exam.
expensive | more expensive | most expensive | This laptop is ___ than that phone. | It is the ___ item in the store.
efficient | more efficient | most efficient | The new printer is ___ than the old one. | She is the ___ clerk in the section.
careful | more careful | most careful | Be ___ next time than you were today. | He is the ___ driver in the motor pool.
famous | more famous | most famous | Rizal is ___ than many other writers of his time. | Rizal is perhaps the ___ Filipino hero.
comfortable | more comfortable | most comfortable | This chair is ___ than the bench. | This is the ___ chair in the lobby.
honest | more honest | most honest | She is ___ than anyone I know. | She is the ___ person I know.
`).forEach(([b, c, sup, q2, q3]) => {
  const wrongC = c.startsWith('more ') ? `${b}er` : `more ${c}`; // "importanter" or "more taller"
  const wrongS = sup.startsWith('most ') ? `${b}est` : `most ${sup}`;
  add('Grammar', q2, c, [b, sup, wrongC],
    `Step 1: The word **than** compares **two** things.\nStep 2: For two things, use the comparative form: ==${c}==.\n!!Trap!!: "${wrongC}" is never correct${c.startsWith('more ') ? '.' : ' (do not put "more" before a word that already ends in -er).'}`);
  add('Grammar', q3, sup, [c, b, wrongS],
    `Step 1: **the ___** of a whole group compares **three or more** things.\nStep 2: For three or more, use the superlative form: ==${sup}==.\n!!Trap!!: "${wrongS}" is never correct.`);
});

/* ---------- 5. Prepositions that go with a word ---------- */
// sentence | right | three wrong | rule
rows(`
The new employee is interested ___ joining the training. | in | on, at, for | We say **interested in** something.
She is capable ___ handling three projects at once. | of | in, for, with | We say **capable of** doing something.
The cashier is responsible ___ the daily collections. | for | of, on, with | We say **responsible for** something.
All offices must comply ___ the new guidelines. | with | to, on, for | We say **comply with** a rule.
Our success depends ___ teamwork. | on | in, of, with | We say **depend on** something.
The committee consists ___ five members. | of | in, with, from | We say **consist of** parts.
He is afraid ___ speaking in public. | of | from, with, on | We say **afraid of** something.
Are you aware ___ the new policy? | of | on, with, in | We say **aware of** something.
My sister is good ___ mathematics. | at | of, on, with | We say **good at** a skill or subject.
The supervisor insisted ___ checking every receipt. | on | in, for, with | We say **insist on** something.
She finally succeeded ___ passing the exam. | in | on, of, with | We say **succeed in** doing something.
The guard was accused ___ sleeping on duty. | of | for, with, on | We say **accused of** something.
He apologized ___ coming late. | for | of, on, with | We say **apologize for** something.
All staff are encouraged to participate ___ the clean-up drive. | in | on, at, with | We say **participate in** an activity.
Please refer ___ the attached memo. | to | at, on, with | We say **refer to** something.
Every employee must adhere ___ the code of conduct. | to | with, on, at | We say **adhere to** a rule.
This laptop belongs ___ the finance office. | to | at, with, for | We say **belong to** someone.
You can rely ___ her to finish on time. | on | at, with, for | We say **rely on** someone.
Public servants must abide ___ the law. | by | with, on, at | We say **abide by** a rule.
Please concentrate ___ your work. | on | at, with, for | We say **concentrate on** something.
Are you familiar ___ the new filing system? | with | to, in, for | We say **familiar with** something.
The director was satisfied ___ the result. | with | for, at, on | We say **satisfied with** something.
The parents are proud ___ their children. | of | for, with, at | We say **proud of** someone.
My lola is fond ___ gardening. | of | with, for, at | We say **fond of** something.
Your answer is similar ___ mine. | to | with, as, from | We say **similar to** something.
The new model is superior ___ the old one. | to | than, from, with | We say **superior to** (not "superior than").
He prefers tea ___ coffee. | to | than, from, with | We say **prefer A to B**.
She is married ___ a teacher. | to | with, for, at | We say **married to** someone.
The office is full ___ boxes. | of | with, in, by | We say **full of** something.
I am tired ___ waiting in line. | of | with, on, at | We say **tired of** something (bored of it).
The suspect was charged ___ theft. | with | of, at, on | We say **charged with** a crime.
He was absent ___ work yesterday. | from | in, at, of | We say **absent from** a place.
The manager congratulated her ___ her promotion. | on | at, in, with | We say **congratulate someone on** something.
The meeting will start ___ 9:00 a.m. | at | in, on, of | For an exact time, use **at**.
The seminar is ___ Monday. | on | in, at, of | For a day, use **on**.
Our office was founded ___ 1995. | in | on, at, of | For a year, use **in**.
She has worked here ___ ten years. | for | since, from, in | For a **length of time** (ten years), use **for**.
She has worked here ___ 2015. | since | for, from, in | For the **starting point** (2015), use **since**.
`).forEach(([q, a, ds, why]) => add('Grammar', q, a, ds.split(',').map((x) => x.trim()), `${why}\nSo the answer is ==${a}==.\nTip: learn these word partners as pairs, like one word.`));

/* ---------- 6. Commonly confused words ---------- */
rows(`
The new rule will ___ all employees. | affect | effect, effects, affection | **Affect** is the action (verb): it changes something. **Effect** is the result (noun).
The new rule had a good ___ on attendance. | effect | affect, affects, affection | **Effect** is the result (noun). **Affect** is the action (verb).
Please ___ my apology. | accept | except, expect, excess | **Accept** = to receive or agree. **Except** = not including.
Everyone attended ___ the driver. | except | accept, expect, access | **Except** = not including. **Accept** = to receive.
The office is closed, so ___ going home early. | we're | were, where, wear | **We're** = we are. Test it: "we are going home early" makes sense.
___ is the new building? | Where | Wear, Were, We're | **Where** asks about a place.
The employees left ___ bags at the door. | their | there, they're, they | **Their** = belonging to them.
Please put the box over ___. | there | their, they're, the | **There** points to a place.
___ coming to the meeting later. | They're | Their, There, Theirs | **They're** = they are. Test it: "They are coming" makes sense.
___ your turn to speak. | It's | Its, Its', It | **It's** = it is. Test it: "It is your turn" makes sense.
The office changed ___ schedule. | its | it's, its', it is | **Its** = belonging to it (no apostrophe).
The report was longer ___ we expected. | than | then, that, them | **Than** is used to compare. **Then** is about time (next).
First finish the form, ___ submit it. | then | than, that, them | **Then** = next, after that. **Than** is for comparing.
The ___ of the school spoke at the program. | principal | principle, principals', principally | **Principal** = the head of a school. **Principle** = a rule or belief.
Honesty is a basic ___ of public service. | principle | principal, principally, principals | **Principle** = a rule or belief. **Principal** = the head of a school.
Please buy some ___ for the printer. | stationery | stationary, station, stationed | **Stationery** (with e) = paper and envelopes. **Stationary** (with a) = not moving.
The car remained ___ during the parade. | stationary | stationery, station, stations | **Stationary** = not moving. **Stationery** = paper supplies.
The lawyer gave us good ___. | advice | advise, advices, advised | **Advice** is the noun (what you get). **Advise** is the verb (what you do).
I ___ you to read the memo. | advise | advice, advices, advising | **Advise** is the verb (to give advice). **Advice** is the noun.
The ___ of the meeting was not clear. | purpose | propose, porpoise, purposes' | **Purpose** = the reason. **Propose** = to suggest.
Please be ___ when you cross the street. | careful | carefull, carefully, carefulness | **Careful** describes a person (adjective) and ends in only one L.
She drives very ___. | carefully | careful, carefull, carefulness | To describe **how** someone does something, use the -ly word (adverb): carefully.
Only a ___ employees came because of the flood. | few | little, less, much | Use **few** with things you can count (employees).
There is too ___ water in the tank. | little | few, many, fewer | Use **little** with things you cannot count (water).
There are ___ errors in this report than in the last one. | fewer | less, little, lesser | Use **fewer** with things you can count (errors).
We need ___ time to finish. | more | many, few, fewer | Use **more** for an amount of time or anything you cannot count.
The price of rice has ___ again. | risen | raised, rose, rised | The verb **rise** (go up by itself): rise, rose, **risen**. Use "has risen".
The company has ___ the salaries of its workers. | raised | risen, rose, rised | **Raise** = to lift something up (it needs an object): raise, raised, **raised**.
Please ___ the folders on the shelf. | lay | lie, lain, lying | **Lay** = to put something down (it needs an object, the folders).
I need to ___ down because I feel dizzy. | lie | lay, laid, lain | **Lie** = to rest your body (no object).
`).forEach(([q, a, ds, why]) => add('Grammar', q, a, ds.split(',').map((x) => x.trim()), `${why}\nSo the answer is ==${a}==.`));

module.exports = out;
