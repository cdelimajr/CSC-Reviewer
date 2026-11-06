// Clerical Ability: spelling, filing, checking and office work, written as fixed questions (1.45.0).
// - Spelling: hand-written words, each with three hand-written misspellings (none of them is an accepted
//   spelling, e.g. no "judgement/judgment" pairs).
// - Filing and checking: names, numbers and codes picked with a fixed seed; the right answer is worked out
//   by the filing rules in the code, so it is always right.
const { rows, pickSome, rng } = require('./bank-tools');

const C = 'clerical';
const out = [];

/* ---------- Spelling ---------- */
const SPELLING = rows(`
absence | absense, abscence, absance
abundance | abundence, abundanse, abbundance
academic | accademic, akademic, academmic
acceptable | acceptible, aceptable, acceptabel
accidentally | accidentaly, accidently_, acidentally
accomplish | acomplish, accomplisch, accomplesh
achievement | acheivement, achievment, achievemant
acquaintance | aquaintance, acquaintence, acquiantance
acquire | aquire, acquier, akquire
address | adress, addres, adresss
advertisement | advertisment, advertisemant, adverticement
aggressive | agressive, aggresive, agresive
allegiance | allegience, alegiance, allegance
amateur | amatuer, amature, ammateur
analysis | analisys, anallysis, analysys
anniversary | aniversary, anniversery, annivesary
apparatus | aparatus, apparatous, apparattus
appearance | appearence, apearance, appearanse
appropriate | apropriate, appropiate, appropriatte
approximately | aproximately, approximatly, approximatley
assessment | assesment, asessment, assessmant
assistance | assistence, asistance, assisstance
attendance | attendence, atendance, attendanse
audience | audiance, audeince, audience_
available | availible, avaliable, availabel
awkward | akward, awkword, awkwerd
bachelor | batchelor, bachellor, bacheler
balloon | baloon, ballon, balloone
bankruptcy | bankrupcy, bankruptsy, bancruptcy
basically | basicly, basicaly, basiclly
beautiful | beautifull, beutiful, beatiful
beneficial | benefical, benificial, beneficail
benefited | benifited, benefitted_, beneffited
budget | budjet, buget, budgett
bulletin | bulletine, buletin, bullitin
business | buisness, busness, bussiness
calendar | calender_, calandar, callendar
camouflage | camoflage, camouflague, camoflauge
category | catagory, categorie, cattegory
ceiling | cieling, celing, ceilling
certificate | certificat, sertificate, certifficate
changeable | changable, chanageable, changeble
characteristic | charactaristic, caracteristic, characteristik
clientele | clientelle, cliental, clientell
collateral | colateral, collatteral, collaterol
column | colum, collumn, colunm
commission | comission, commision, commissoin
communicate | comunicate, communicat, commnunicate
competition | competetion, compitition, competision
completely | completly, completelly, compleetly
concede | consede, concead, conceed
conscience | concience, consience, conscence
conscious | concious, consious, conscous
consistent | consistant, consistint, concistent
controversy | controversey, contraversy, controvercy
convenience | convenience_, convenience__, conveniance
correspondence | correspondance, corespondence, correspondense
criticism | critisism, criticisim, critcism
curiosity | curiousity, curiosaty, curiocity
deceive | decieve, deceeve, deceve
deficiency | deficency, defficiency, deficiancy
definite | definate, definit, deffinite
dependent | dependant_, dependint, dependdent
desperate | desparate, desperite, desprate
develop | develope, devellop, divelop
difference | diffrence, diference, differance
disappear | dissapear, disapear, dissappear
disappoint | dissapoint, disapoint, dissappoint
disastrous | disasterous, disastrious, dissastrous
discipline | disipline, discepline, dicipline
efficient | eficient, efficeint, efficiant
eighth | eigth, eight_, eighht
eligible | elegible, eligable, elligible
eliminate | elliminate, eleminate, eliminnate
emergency | emergancy, emergensy, emmergency
emphasize | emphasise_, emphesize, empasize
encouragement | encouragment, encoragement, encouragemant
enforcement | enforcment, enforsement, enforcemant
equipment | equiptment, equippment, equipmant
especially | especialy, expecially, espesially
exaggerate | exagerate, exaggerrate, exagerrate
excellent | excelent, exellent, excellant
exercise | excercise, exercize, exersise
exhaust | exaust, exhuast, exhost
experience | experiance, expirience, experiense
explanation | explaination, explanasion, explannation
extraordinary | extrordinary, extraordinery, extraordinairy
facilities | facilites, facillities, fasilities
February | Febuary, Februery, Febrary
fiery | firey, fierey, fierry
finally | finaly, finnally, finelly
financial | finantial, financail, finacial
fluorescent | flourescent, florescent, fluorescant
forty | fourty, fortie, fortey
forward | foward, forwerd, forwad
fulfill | fulfil_, fullfill, fulfeel
gauge | guage, gauje, gagge
generally | generaly, genrally, generelly
grateful | greatful, gratefull, gratful
guidance | guidence, guidanse, giudance
handkerchief | hankerchief, handkercheif, handkercheef
harass | harrass, haras, harrас
height | heigth, hieght, heighth
hierarchy | heirarchy, hierachy, hiearchy
humorous | humourous_, humerous, humorus
hygiene | hygeine, hygene, hiygiene
hypocrisy | hypocracy, hipocrisy, hypocrasy
identity | identitty, idendity, indentity
immediately | immediatly, imediately, immediatley
incidentally | incidently, incidentaly, incedentally
independence | independance, independense, indipendence
indictment | inditement, indictmant, indicment
inoculate | innoculate, inocculate, inoculatte
intelligence | inteligence, intelligance, intellegence
interrupt | interupt, intterupt, interrep
irresistible | irresistable, iresistible, irresistibel
jewelry | jewelery, jewlery, jewellry
judicial | judical, judicail, judisial
knowledge | knowlege, knowledg, knowladge
laboratory | labratory, laboratary, labaratory
leisure | liesure, leasure, leisur
library | libary, librery, liberry
license | lisence, licence_, lisense
lieutenant | leutenant, lieutenent, liutenant
lightning | lightening_, lightnning, lihgtning
maintenance | maintainance, maintenence, maintanance
manageable | managable, manageible, managible
maneuver | manuever, maneuvar, manoeuver_
mathematics | mathmatics, mathematicks, mathemathics
medicine | medecine, medicin, mediccine
memorandum | memorandom, memorendum, memmorandum
minuscule | miniscule_, minuscle, minniscule
miscellaneous | miscelaneous, miscellanious, misellaneous
mischief | mischeif, mischif, mistchief
misspell | mispell, misspel, misspelll
mortgage | morgage, mortgauge, mortage
municipal | municiple, munisipal, muncipal
naturally | naturaly, natually, naturrally
negotiate | negociate, negotaite, negosiate
neighbor | nieghbor, neihbor, neighbr
nuisance | nusance, nuisanse, nuissance
obedience | obediance, obedeince, obediense
occasionally | occasionaly, ocasionally, occassionally
occurred | occured, ocurred, occurrred
official | offical, oficial, officail
omission | ommission, omision, omissoin
opportunity | oportunity, opportunaty, oppertunity
ordinance | ordinanse, ordnance_, ordinence
parallel | paralel, parrallel, paralell
particular | particuler, perticular, particullar
pastime | pasttime, pastyme, pastimme
patience | patiense, pacience, patiance
permanent | permanant, permenent, permenant
perseverance | perseverence, perserverance, persevereance
persistent | persistant, persistint, persistand
persuade | persuede, pursuade, persaude
physical | phisical, physicle, physicall
playwright | playwrite, playright, plawright
possess | posess, possses, posses_
practically | practicaly, practicly, practicallly
precede | preceed, presede, preceede
preferred | prefered, preferrred, preffered
prejudice | predjudice, prejudise, prejudce
presence | presense, prescence, presance
procedure | proceedure, procedur, prosedure
proceed | procede, proseed, proceeed
professor | proffesor, professer, proffessor
pronunciation | pronounciation, pronunsiation, pronunciasion
psychology | psycology, phsychology, psychollogy
publicly | publically_, publicley, publicaly
receipt | reciept, receit, recipt
recognize | recognise_, reconize, recognnize
reference | referance, refference, referense
relevant | relevent, revelant, relavant
religious | religous, religeous, relligious
repetition | repitition, repetission, reppetition
restaurant | restaraunt, resturant, restaurent
rhythm | rythm, rhythym, rhytm
ridiculous | rediculous, ridiculus, rediculus
sacrifice | sacrafice, sacrifise, sacrefice
schedule | shedule, schedual, scedule
secretary | secratary, secertary, secretery
seize | sieze, seeze, seise
sincerely | sincerly, sinceerly, sincerelly
souvenir | souvenier, suvenir, souveneer
specifically | specificly, specifacally, specificaly
strength | strenght, strenth, strengh
subtle | subtel, suttle, subtile_
successful | succesful, successfull, sucessful
sufficient | suficient, sufficiant, sufficent
surprise | suprise, surpise, surprize_
technique | tecnique, techneque, technic_
temperature | temprature, temperatur, tempreture
tendency | tendancy, tendensy, tenddency
thorough | thurough, thorogh, thourough
tragedy | tradegy, tragidy, tragedie
truly | truely, truley, trulee
twelfth | twelth, twelvth, twelfh
tyranny | tyrany, tirany, tyrrany
until | untill, untile, untl
usually | usualy, usally, ussually
vacuum | vacum, vaccuum, vacume
vegetable | vegatable, vegtable, vegetible
vehicle | vehical, vehicel, veicle
village | villege, vilage, villiage
visible | visable, visibble, visibel
warranty | waranty, warrenty, warrantie
Wednesday | Wenesday, Wedensday, Wendsday
weird | wierd, weerd, weirdd
whether | wether_, wheather, whethe
withdrawal | withdrawl, withdrawel, witdrawal
yacht | yatch, yaght, yot
`);
// A few misspellings above are real words or accepted spellings (marked with "_", e.g. "lightening",
// "licence", "eight"). They are dropped, and an extra misspelling is made by doubling the first letter
// that has no double, so each question still has three wrong choices that are never accepted spellings.
function extraWrong(w, have) {
  for (let i = 1; i < w.length - 1; i++) {
    const c = w[i];
    if (!/[a-z]/i.test(c) || w[i - 1] === c || w[i + 1] === c) continue;
    const x = w.slice(0, i) + c + w.slice(i);
    if (!have.includes(x) && x !== w) return x;
  }
  return w + 'e';
}
for (const [word, wrongs] of SPELLING) {
  const ws = wrongs.split(',').map((x) => x.trim()).filter((x) => !x.endsWith('_') && /^[A-Za-z]+$/.test(x));
  while (ws.length < 3) ws.push(extraWrong(word, ws));
  out.push({ s: C, t: 'Spelling', q: 'Which word is spelled correctly?', a: word, d: ws.slice(0, 3),
    e: `Say the word slowly in parts and check each letter.\nThe correct spelling is ==${word}==.\n!!Trap!!: ${ws.slice(0, 3).map((x) => `"${x}"`).join(', ')} are common misspellings.` });
}

/* ---------- Alphabetical filing ---------- */
const SURNAMES = ['Abad', 'Abella', 'Agbayani', 'Alcantara', 'Alvarez', 'Aquino', 'Arceo', 'Bautista', 'Bernardo', 'Buenaventura', 'Cabrera', 'Calderon', 'Castillo', 'Castro',
  'Cruz', 'Cuevas', 'David', 'De Guzman', 'De Leon', 'De los Reyes', 'De la Paz', 'Dela Cruz', 'Del Mundo', 'Del Rosario', 'Delos Santos', 'Diaz', 'Dimaculangan', 'Domingo',
  'Enriquez', 'Espiritu', 'Esguerra', 'Estrada', 'Fernandez', 'Flores', 'Francisco', 'Galang', 'Garcia', 'Gonzales', 'Gutierrez', 'Hernandez', 'Ignacio', 'Jimenez',
  'Lacson', 'Lim', 'Lopez', 'Lorenzo', 'Macaraeg', 'Magbanua', 'Manalo', 'Manalastas', 'Marquez', 'Mendoza', 'Mercado', 'Morales', 'Navarro', 'Ocampo', 'Ortiz',
  'Pacheco', 'Padilla', 'Pascual', 'Perez', 'Quiambao', 'Ramirez', 'Ramos', 'Reyes', 'Rivera', 'Robles', 'Rodriguez', 'Salazar', 'Salvador', 'San Jose', 'San Juan',
  'Santiago', 'Santos', 'Soriano', 'Sta. Maria', 'Tan', 'Tolentino', 'Torres', 'Valdez', 'Velasco', 'Villanueva', 'Villareal', 'Yap', 'Zamora'];
const FIRSTS = ['Adrian', 'Alma', 'Andrea', 'Angelo', 'Bea', 'Benjie', 'Carla', 'Carmelo', 'Daisy', 'Dennis', 'Edna', 'Elmer', 'Fatima', 'Felix', 'Gemma', 'Gerald',
  'Hannah', 'Henry', 'Irene', 'Isidro', 'Janet', 'Jerome', 'Karen', 'Kevin', 'Leah', 'Leonardo', 'Mae', 'Marlon', 'Nora', 'Noel', 'Olivia', 'Oscar', 'Precy', 'Ramil',
  'Rosa', 'Samuel', 'Teresa', 'Victor', 'Wilma', 'Zaldy'];
// Filing key: surname first, then first name; spaces and periods are ignored, so "De la Paz" is filed as DELAPAZ.
// "Sta." is filed as written (STA), like the other prefixes.
const fkey = (sur, first) => `${sur.replace(/[\s.]/g, '').toUpperCase()}|${first.toUpperCase()}`;
const asName = (sur, first) => `${sur}, ${first}`;
const R = rng('filing');
const filed = new Set();
for (let k = 0, made = 0; k < 600 && made < 300; k++) {
  // Names close together in the alphabet make the question worth doing: pick a window of surnames.
  const start = Math.floor(R() * (SURNAMES.length - 6));
  const window = SURNAMES.slice(start, start + 6);
  const picks = pickSome(window, 4, `fs:${k}`).map((s, i) => [s, FIRSTS[(k * 7 + i * 3) % FIRSTS.length]]);
  // Some questions use the same surname twice, so the first name decides.
  if (k % 4 === 0) picks[1][0] = picks[0][0];
  const names = picks.map(([s, f]) => asName(s, f));
  if (new Set(names).size < 4) continue;
  const sorted = [...picks].sort((a, b) => (fkey(...a) < fkey(...b) ? -1 : 1));
  const first = k % 2 === 0;
  const pick = first ? sorted[0] : sorted[3];
  const ans = asName(...pick);
  if (filed.has(`${first}|${ans}`)) continue; // one explanation per question and answer
  filed.add(`${first}|${ans}`);
  made++;
  const keys = sorted.map((p) => `${asName(...p)} → ${p[0].replace(/[\s.]/g, '').toUpperCase()}, ${p[1].toUpperCase()}`);
  out.push({
    s: C, t: 'Alphabetical Filing', q: `In alphabetical filing (surname first), which name comes ${first ? 'FIRST' : 'LAST'}?`, a: ans, d: names.filter((n) => n !== ans),
    e: `Step 1: File by **surname**, then first name. Ignore spaces and periods (De la Paz → DELAPAZ).\nStep 2: In order:\n${keys.map((x, i) => `${i + 1}. ${x}`).join('\n')}\nThe ${first ? 'first' : 'last'} one is ==${ans}==.`,
  });
}

/* ---------- Checking numbers: the exact copy ---------- */
const R2 = rng('checking');
const digits = (n) => Array.from({ length: n }, (_, i) => String(i === 0 ? 1 + Math.floor(R2() * 9) : Math.floor(R2() * 10))).join('');
// A copy with one small mistake: two digits next to each other switched, or one digit changed.
function changeOne(s, k) {
  const a = s.split('');
  const i = 1 + (k % (a.length - 1));
  if (k % 2 === 0 && a[i] !== a[i - 1]) { [a[i], a[i - 1]] = [a[i - 1], a[i]]; return a.join(''); }
  a[i] = String((Number(a[i]) + 1 + (k % 8)) % 10);
  return a.join('');
}
const group = (x) => x.replace(/(\d{3})(?=\d)/g, '$1-');
for (let k = 0; k < 240; k++) {
  const n = digits(k % 2 ? 9 : 6);
  const copies = [];
  for (let j = 0; copies.length < 3 && j < 20; j++) {
    const c = changeOne(n, k * 3 + j);
    if (c !== n && !copies.includes(c)) copies.push(c);
  }
  if (copies.length < 3) continue;
  const ref = group(n);
  const notes = copies.map((c) => { const i = [...n].findIndex((ch, x) => ch !== c[x]); return `${group(c)} (digit ${i + 1} is different)`; });
  out.push({
    s: C, t: 'Checking Numbers', q: `Which copy is EXACTLY the same as the reference number ${ref}?`, a: ref, d: copies.map(group),
    e: `Compare in small groups of 3 digits, one group at a time.\nThe wrong copies: ${notes.join('; ')}.\nThe exact copy is ==${ref}==.`,
  });
}

/* ---------- Office work ---------- */
rows(`
The written record of what was discussed and decided in a meeting is called the: | minutes | agenda; memorandum; itinerary | The **minutes** record what was discussed and decided in a meeting. The **agenda** is the list of topics BEFORE the meeting.
The list of topics to be discussed in a meeting, given before the meeting, is the: | agenda | minutes; resolution; endorsement | The **agenda** lists the topics to be discussed, in order.
A short written message used inside an office to give instructions or information is a: | memorandum | resolution; voucher; certificate | A **memorandum** (memo) is a short written message used inside an office.
In a letter, "Encl." at the bottom means that: | something is attached or included with the letter | the letter is confidential; the letter is a copy; the letter needs an answer | **Encl.** (enclosure) means a document is **included** with the letter.
In a letter, "cc" before a list of names means: | copies of the letter were also sent to them | they wrote the letter; they must sign it; they are not allowed to read it | **cc** (carbon copy / courtesy copy) shows who **also received a copy**.
"RSVP" on an invitation asks the guest to: | reply whether they will come | bring a gift; wear formal clothes; come early | **RSVP** (from French "répondez s'il vous plaît") means **please reply**.
The abbreviation "e.g." means: | for example | that is; and others; please note | **e.g.** = for example. **i.e.** = that is.
The abbreviation "i.e." means: | that is | for example; and so on; in case | **i.e.** = that is (in other words). **e.g.** = for example.
The abbreviation "etc." means: | and so on | for example; that is; please reply | **etc.** (et cetera) = **and so on**.
"P.S." at the end of a letter introduces: | something added after the signature | the name of the sender; a list of attachments; the date | **P.S.** (postscript) is a note **added after** the signature.
"c/o" on an envelope means: | care of | copy only; cash on delivery; certified original | **c/o** = **care of**: the letter goes to someone through another person or address.
"Attn:" in a letter or envelope points to the: | person who should receive and act on it | date of the letter; subject of the letter; sender's title | **Attn:** (attention) names the person who should handle the letter.
"Re:" in the subject line of a memo or letter means: | regarding | received; return; reply quickly | **Re:** = **regarding** (about).
"ASAP" in a message means: | as soon as possible | after supper and payday; as stated above; at seven a.m. promptly | **ASAP** = **as soon as possible**.
A filing system that arranges records by place (province, city, town) is called: | geographic filing | numeric filing; chronological filing; subject filing | **Geographic filing** arranges records by **location**.
A filing system that arranges records by date is called: | chronological filing | alphabetical filing; geographic filing; subject filing | **Chronological filing** arranges records by **date**.
A filing system that arranges records by topic is called: | subject filing | numeric filing; chronological filing; geographic filing | **Subject filing** arranges records by **topic**.
A filing system that arranges records by assigned numbers is called: | numeric filing | alphabetical filing; geographic filing; subject filing | **Numeric filing** arranges records by **number**, like case or account numbers.
In chronological filing, which record is usually placed in front (on top)? | the most recent one | the oldest one; the longest one; the one with the most pages | In most offices the **most recent** record is placed in front, so it is found first.
Records that are no longer needed but must be kept for a certain time are stored in the: | records storage or archive | trash bin; reception desk; supply room | Old records that must still be kept go to **records storage (archive)** until their retention period ends.
The period that a record must be kept before it may be disposed of is called its: | retention period | filing period; deadline; probation period | The **retention period** is how long a record must be kept.
A document that orders a transfer of money from government funds to pay someone is a: | disbursement voucher | memorandum; minutes; letter of intent | A **disbursement voucher (DV)** is used to pay a claim from government funds.
The office machine that makes copies of documents is the: | photocopier | shredder; laminator; paper cutter | A **photocopier** makes copies of documents.
The office machine that cuts confidential papers into small strips is the: | paper shredder | photocopier; stapler; laminator | A **paper shredder** destroys confidential papers.
When answering an office telephone, the BEST first thing to say is: | a greeting, the name of the office and your name | "Hello? Who is this?"; "What do you want?"; nothing until the caller speaks | Say a **greeting, the office name and your name** so the caller knows they reached the right place.
When taking a phone message for a co-worker, you should write the caller's name, number, message, and the: | date and time of the call | caller's age; weather; caller's address only | A complete message has the caller's name, number, message, and the **date and time** of the call.
A visitor arrives while you are on a long phone call. The BEST thing to do is: | acknowledge the visitor with a nod or a quick word and finish the call | ignore the visitor until the call ends; hang up on the caller; ask the visitor to come back tomorrow | **Acknowledge** the visitor right away, then finish the call quickly and attend to them.
The section of a business letter that shows the sender's office name, address and logo at the top is the: | letterhead | complimentary close; enclosure; signature block | The **letterhead** is printed at the top of the letter.
"Very truly yours" and "Sincerely yours" at the end of a letter are examples of a: | complimentary close | salutation; inside address; subject line | The **complimentary close** comes just before the signature.
"Dear Sir or Madam:" in a letter is an example of a: | salutation | complimentary close; letterhead; postscript | The **salutation** is the greeting at the start of the letter.
The part of a letter that shows the name and address of the person receiving it is the: | inside address | letterhead; complimentary close; enclosure line | The **inside address** shows the receiver's name and address.
`).forEach(([q, a, ds, why]) => out.push({ s: C, t: 'Office Procedures', q, a, d: ds.split(';').map((x) => x.trim()), e: `${why}\nSo the answer is ==${a}==.` }));

module.exports = out;
