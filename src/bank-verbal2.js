// Verbal Ability, part 2 (1.46.0): new vocabulary words, idioms, grammar, word usage, sentence completion,
// Filipino usage and short reading passages, written by hand.
// - Vocabulary: wrong choices are the synonyms of OTHER words whose meaning group is not related (RELATED below),
//   so a wrong choice can never also be right.
// - Every other kind is one hand-written row: question | right answer | three wrong answers | the rule.
const { rows, pickSome } = require('./bank-tools');

const V = 'verbal';
const out = [];
function add(t, q, a, d, e, p = '') {
  out.push({ s: V, t, q, a, d, e: `${e}\nSo the answer is ==${a}==.`, ...(p ? { p } : {}) });
}
const hand = (t, text) => rows(text).forEach(([q, a, ds, rule]) => add(t, q, a, ds.split(';').map((x) => x.trim()), rule));

/* ---------- Vocabulary ---------- */
// WORD | synonym | antonym (or -) | meaning group
const VOCAB = rows(`
abate | lessen | intensify | decrease
aberration | deviation | norm | odd
abridge | shorten | lengthen | short
acrimonious | bitter | friendly | angry
adamant | unyielding | flexible | firm
affable | friendly | unfriendly | kind
affluent | wealthy | poor | rich
alleviate | ease | worsen | relieve
anomaly | irregularity | normality | odd
appraise | evaluate | - | judge
arduous | difficult | easy | hard
audacious | bold | timid | brave
benevolent | kind | cruel | kind
benign | harmless | harmful | safe
blatant | obvious | hidden | clear
cajole | coax | force | persuade
candid | frank | secretive | honest
commence | begin | end | start
concise | brief | wordy | short
consolidate | combine | separate | join
contrite | remorseful | unrepentant | sorry
convene | assemble | disperse | gather
cordial | warm | cold | kind
cumbersome | bulky | handy | heavy
dearth | lack | abundance | few
deferential | respectful | disrespectful | polite
dejected | downcast | elated | sad
depict | portray | - | show
diligent | hardworking | lazy | work
diminish | reduce | increase | decrease
discreet | tactful | indiscreet | careful
disparage | belittle | praise | insult
divulge | reveal | conceal | show
dogmatic | opinionated | open-minded | firm
earnest | sincere | insincere | honest
elated | overjoyed | downcast | happy
emulate | imitate | - | copy
endeavor | attempt | - | try
enumerate | list | - | count
ephemeral | short-lived | permanent | time
equitable | fair | unfair | fair
exacerbate | aggravate | improve | worse
exemplify | illustrate | - | show
exorbitant | excessive | reasonable | much
expedient | convenient | inconvenient | useful
feasible | possible | impossible | able
fervent | passionate | apathetic | eager
frugal | economical | wasteful | save
futile | useless | useful | useless
gregarious | sociable | antisocial | kind
hamper | hinder | help | block
hostile | unfriendly | friendly | angry
impartial | unbiased | biased | fair
incentive | motivation | deterrent | reason
inclement | stormy | mild | weather
indolent | idle | industrious | lazy
infallible | perfect | fallible | true
inquisitive | curious | uninterested | ask
intermittent | occasional | continuous | time
jovial | cheerful | gloomy | happy
lenient | tolerant | strict | kind
lucid | clear | confusing | clear
meticulous | thorough | careless | careful
mitigate | reduce | aggravate | relieve
negligible | insignificant | significant | small
novice | beginner | expert | new
obsolete | outdated | modern | old
obstinate | stubborn | yielding | firm
opulent | luxurious | poor | rich
palpable | tangible | intangible | clear
partisan | biased | neutral | fair
placid | calm | agitated | calm
prudent | wise | foolish | wise
quandary | dilemma | - | problem
recalcitrant | defiant | obedient | firm
reconcile | make peace | estrange | join
reiterate | repeat | - | say
remuneration | pay | - | money
rescind | cancel | enact | end
resilient | flexible | rigid | strong
reverent | respectful | irreverent | polite
salient | noticeable | inconspicuous | clear
scrutinize | examine | overlook | look
serene | peaceful | turbulent | calm
skeptic | doubter | believer | doubt
sporadic | irregular | constant | time
stringent | strict | lax | firm
subsidize | fund | - | money
tedious | boring | exciting | dull
tenacious | persistent | yielding | strong
transient | temporary | permanent | time
trivial | unimportant | important | small
unwavering | steady | unsteady | firm
venerate | honor | despise | polite
verbose | wordy | concise | say
vindicate | clear | accuse | free
wane | decrease | wax | decrease
zealous | enthusiastic | indifferent | eager
`).map(([w, syn, ant, g]) => ({ w, syn, ant: ant === '-' ? '' : ant, g }));
// Meaning groups that are too close to share wrong choices.
const RELATED = [['decrease', 'short', 'small', 'few', 'relieve', 'end'], ['kind', 'polite', 'happy', 'calm', 'safe'], ['firm', 'strong', 'hard', 'heavy'], ['honest', 'clear', 'true', 'fair', 'show'],
  ['angry', 'sad', 'worse', 'insult'], ['eager', 'brave', 'work', 'start', 'try'], ['lazy', 'dull', 'useless'], ['careful', 'wise', 'judge', 'look', 'ask'], ['rich', 'much', 'money', 'save'],
  ['join', 'gather'], ['time', 'old', 'new'], ['odd', 'doubt', 'problem'], ['persuade', 'say', 'reason', 'need', 'useful', 'able'], ['free', 'block', 'copy', 'count', 'weather']];
const near = (g) => new Set(RELATED.find((r) => r.includes(g)) || [g]);
for (const r of VOCAB) {
  const bad = near(r.g);
  const safe = VOCAB.filter((x) => x.w !== r.w && !bad.has(x.g));
  const pool = safe.map((x) => x.syn).filter((x) => x !== r.syn && x !== r.ant);
  add('Vocabulary (Synonym)', `Which word is closest in meaning to ${r.w.toUpperCase()}?`, r.syn, pickSome(pool, 3, 'v2s' + r.w),
    `**${r.w[0].toUpperCase() + r.w.slice(1)}** means **${r.syn}**.${r.ant ? ` Its opposite is "${r.ant}".` : ''}`);
  if (r.ant) {
    const antPool = safe.map((x) => x.syn).filter((x) => x !== r.syn && x !== r.ant);
    const trap = [r.syn];
    add('Vocabulary (Antonym)', `Which word is most nearly OPPOSITE in meaning to ${r.w.toUpperCase()}?`, r.ant, [...trap, ...pickSome(antPool, 2, 'v2a' + r.w)],
      `**${r.w[0].toUpperCase() + r.w.slice(1)}** means **${r.syn}**, so its opposite is **${r.ant}**.\n!!Trap!!: "${r.syn}" has the SAME meaning, not the opposite.`);
  }
}

/* ---------- Idioms ---------- */
const IDIOMS = rows(`
add insult to injury | to make a bad situation even worse
all thumbs | clumsy with one's hands
back to the drawing board | to start planning again after a failure
bark up the wrong tree | to blame or look in the wrong place
bury the hatchet | to make peace after a quarrel
by word of mouth | passed from person to person by talking
call the shots | to be the one who makes the decisions
cut someone some slack | to be less strict with someone
every cloud has a silver lining | something good comes even from a bad situation
a taste of one's own medicine | being treated the same bad way one treats others
give someone the benefit of the doubt | to believe someone even without proof
hit the road | to leave or start a trip
in the nick of time | just before it is too late
keep someone posted | to keep someone informed of news
learn the ropes | to learn how a job is done
leave no stone unturned | to try every possible way
let off steam | to release anger or stress
not my cup of tea | not something I like
on the ball | alert and quick to act
pass the buck | to push one's responsibility onto someone else
pay through the nose | to pay far too much
pull one's weight | to do one's fair share of the work
rain on someone's parade | to spoil someone's happy plans
ring a bell | to sound familiar
run out of steam | to lose energy or enthusiasm
the tip of the iceberg | a small part of a much bigger problem
touch base | to contact someone briefly
up to par | at the expected standard
hold your horses | wait and be patient
bite one's tongue | to stop oneself from saying something
break new ground | to do something that has not been done before
cross that bridge when we come to it | to deal with a problem only when it happens
get wind of | to hear about something secret
in a nutshell | in a few words
on the dot | exactly on time
out of the woods | out of danger or difficulty
put all one's eggs in one basket | to risk everything on one plan
the elephant in the room | an obvious problem that no one talks about
a stone's throw | a very short distance
a far cry from | very different from
come rain or shine | no matter what happens
get the hang of | to learn how to do something
go the distance | to finish what one started
have a change of heart | to change one's opinion or decision
know something inside out | to know something very well
`);
IDIOMS.forEach(([idiom, meaning]) => {
  add('Idioms', `What does the idiom "${idiom}" mean?`, meaning, pickSome(IDIOMS.map((x) => x[1]).filter((x) => x !== meaning), 3, 'idm' + idiom),
    `**"${idiom[0].toUpperCase() + idiom.slice(1)}"** means **${meaning}**. An idiom does not mean what its words say one by one.`);
});

/* ---------- Grammar: choose the word that completes the sentence ---------- */
hand('Grammar', `
Each of the applicants ___ required to bring two valid IDs. | is | are; were; have been | **Each** is singular, so use **is**, even with "of the applicants" after it.
Neither the clerk nor the cashiers ___ aware of the new policy. | were | was; is; has been | With **neither…nor**, the verb follows the NEARER subject: "cashiers" is plural, so **were**.
Either the drivers or the supervisor ___ to sign the logbook. | has | have; are; were | With **either…or**, the verb follows the nearer subject: "supervisor" is singular, so **has**.
The list of new employees ___ posted on the bulletin board. | was | were; are; have been | The real subject is **list** (singular), not "employees."
Ten thousand pesos ___ a big amount for a small business. | is | are; were; have been | An amount of money is treated as ONE sum, so use **is**.
The committee ___ its decision this afternoon. | announced | announce; are announcing; have announced | A committee acting as one group is singular: "The committee **announced** its decision."
The news about the typhoon ___ everyone worried. | made | make; have made; were making | **News** is singular: "The news **made** everyone worried."
One of the computers in the office ___ not working. | is | are; were; have been | The subject is **one**, which is singular.
The manager, together with her assistants, ___ the seminar. | attends | attend; are attending; have attended | Phrases like "together with" do not change the subject. **The manager** is singular.
There ___ many reasons why the project was delayed. | are | is; was; has been | After **there**, look at what comes next: "many reasons" is plural, so **are**.
Everybody in the two offices ___ invited to the party. | was | were; are; have been | **Everybody** is singular.
The scissors on the table ___ mine. | are | is; was; has been | **Scissors** is always plural.
A number of employees ___ asked for a leave on Friday. | have | has; is; was | **A number of** means "many," so it is plural: **have**.
The number of applicants ___ increasing every year. | is | are; were; have been | **The number of** is singular: **is**.
Many a student ___ failed to submit the form on time. | has | have; are; were | **Many a** is followed by a singular noun and a singular verb.
Our team ___ the championship last year. | won | win; wins; winning | "Last year" shows the past, so use the past tense **won**.
By the end of this month, she ___ in the agency for ten years. | will have worked | will work; has worked; worked | "By the end of this month" + a length of time → future perfect: **will have worked**.
The clerk ___ the files when the power went out. | was sorting | sorts; has sorted; is sorting | An action going on when another happened in the past → past continuous: **was sorting**.
I ___ in this office since 2019. | have worked | work; am working; worked | "Since 2019" up to now → present perfect: **have worked**.
If I ___ you, I would accept the offer. | were | was; am; will be | In an unreal "if" clause, use **were** for all subjects.
If it rains tomorrow, the meeting ___ moved online. | will be | would be; was; is being | A real future condition: if + present, **will** + verb.
She ___ the report before the deadline yesterday. | had finished | has finished; finishes; will finish | One past action before another past point (the deadline) → past perfect: **had finished**.
The letters ___ by the secretary every morning. | are sorted | sort; are sorting; has sorted | The letters receive the action → passive: **are sorted**.
The new bridge ___ next year. | will be completed | completed; was completed; has completed | Future and passive: **will be completed**.
He is one of those employees who ___ always early. | are | is; was; has been | **Who** refers to "employees" (plural), so **are**.
Please give the forms to Maria and ___. | me | I; myself; mine | After a word like **to**, use the object form: **me**.
___ is calling the office at this hour? | Who | Whom; Whose; Which | **Who** is the subject of "is calling."
To ___ should I address this letter? | whom | who; whose; which | After **to**, use the object form **whom**.
The book is ___, not yours. | hers | her; she; herself | **Hers** stands alone without a noun after it.
Each employee must bring ___ own lunch. | his or her | their own's; theirs; its | **Each employee** is singular, so the formal answer is **his or her**.
The dog wagged ___ tail when it saw its owner. | its | it's; it is; its' | **Its** (no apostrophe) shows ownership. **It's** means "it is."
This is the ___ report I have read all year. | best | better; most good; goodest | Comparing with ALL others → superlative: **best**.
This road is ___ than the highway. | narrower | more narrower; narrowest; most narrow | Short adjectives add -er: **narrower** (never "more narrower").
She is the ___ person in the department. | most efficient | efficientest; more efficient; most efficienter | Long adjectives use **most**: the **most efficient**.
There are ___ applicants this year than last year. | fewer | less; little; lesser | Things you can count → **fewer**.
We have ___ time than we expected. | less | fewer; lesser; few | Things you cannot count (time) → **less**.
He was absent ___ he was sick. | because | although; unless; so that | The second part gives the REASON: **because**.
___ it was raining, the employees came to work on time. | Although | Because; Since; So | The two ideas go against each other: **although**.
Submit your form early; ___, you may not be included. | otherwise | therefore; moreover; besides | "If not, then…" → **otherwise**.
The road was flooded; ___, the classes were suspended. | therefore | however; although; otherwise | The second part is a RESULT: **therefore**.
The meeting will start ___ 9:00 a.m. | at | on; in; by the | Use **at** for an exact time.
The seminar is ___ Monday. | on | in; at; by | Use **on** for days and dates.
She was born ___ 1995. | in | on; at; by | Use **in** for years, months and seasons.
The office is ___ the second floor. | on | in; at; over | Use **on** for floors of a building.
The pen is ___ the drawer. | in | on; at; into the | Something inside an enclosed space → **in**.
He has been waiting ___ two hours. | for | since; from; during | A LENGTH of time → **for**. A starting point → since.
She has been waiting ___ eight o'clock. | since | for; from; during | A STARTING point in time → **since**.
The teacher divided the cake ___ the three children. | among | between; with; along | More than two → **among**.
The secret is ___ you and me. | between | among; with; along | Two people → **between**.
He is good ___ solving puzzles. | at | in; on; for | The expression is "good **at**."
The employees are interested ___ the training. | in | on; at; with | The expression is "interested **in**."
She is afraid ___ dogs. | of | from; with; at | The expression is "afraid **of**."
I agree ___ your suggestion. | with | to; on; at | Agree **with** a person or an idea.
She is ___ honest woman. | an | a; the; some | Use **an** before a vowel SOUND: "honest" starts with a silent h.
He waited for ___ hour. | an | a; the; some | "Hour" starts with a vowel sound (silent h): **an** hour.
She is ___ university student. | a | an; the; some | "University" starts with a "yoo" sound (consonant): **a** university.
The children ___ playing outside when the bell rang. | were | was; is; has been | **Children** is plural, and the action was going on in the past: **were**.
Neither of the two answers ___ correct. | is | are; were; have been | **Neither** (of two) is singular.
Both of the reports ___ due tomorrow. | are | is; was; has been | **Both** is plural.
The furniture in the lobby ___ new. | is | are; were; have been | **Furniture** is uncountable and singular.
The police ___ investigating the case. | are | is; was; has been | **Police** is always plural.
Physics ___ difficult for many students. | is | are; were; have been | **Physics** is one subject (singular).
The jury ___ divided in their opinions. | were | was; is; has been | When the members act as separate people ("divided in THEIR opinions"), **jury** takes a plural verb.
Every one of the documents ___ been checked. | has | have; are; were | **Every one** is singular.
The director, as well as the staff, ___ present. | was | were; are; have been | "As well as the staff" does not change the subject: **the director** (singular).
Bread and butter ___ his usual breakfast. | is | are; were; have been | "Bread and butter" is ONE dish, so it is singular.
`);

/* ---------- Word usage: words that are easy to mix up ---------- */
hand('Grammar', `
The loud noise did not ___ the sleeping baby. | affect | effect; affects the; effecting | **Affect** is usually a verb (to influence); **effect** is usually a noun (a result).
The new rule had a good ___ on attendance. | effect | affect; affection; effective | **Effect** is the noun: a result.
Everyone came ___ the new clerk. | except | accept; expect; excess | **Except** = leaving out.
The principal gave the students some good ___. | advice | advise; advices; advising | **Advice** is the noun; **advise** is the verb.
Buy some bond paper and pens at the ___ store. | stationery | stationary; stationer; station | **Stationery** = writing materials. **Stationary** = not moving.
The bus remained ___ because of the traffic. | stationary | stationery; stationer; stationed | **Stationary** = not moving.
Honesty is the ___ that guides her work. | principle | principal; principality; principled | **Principle** = a rule or belief. **Principal** = the head of a school or the main one.
The ___ of the school welcomed the parents. | principal | principle; principals'; principled | **Principal** = the head of a school.
The blue tie is a perfect ___ to his gray suit. | complement | compliment; complimentary; complement's | **Complement** = something that completes or goes well with. **Compliment** = praise.
She received a ___ for her neat handwriting. | compliment | complement; complementary; complimented | **Compliment** = praise.
Be careful not to ___ your ID. | lose | loose; loss; lost | **Lose** = to misplace. **Loose** = not tight.
This screw is ___; please tighten it. | loose | lose; loss; lost | **Loose** = not tight.
The office is ___ from the terminal than I thought. | farther | further; farthest; more far | **Farther** = more physical distance. **Further** = more in degree or time.
We will discuss the matter ___ next week. | further | farther; farthest; furthest | **Further** = more, to a greater degree.
Please ___ the box on the table. | lay | lie; laid down; lain | **Lay** needs an object (lay the box). **Lie** has no object (lie down).
I need to ___ down because I feel dizzy. | lie | lay; laid; lain down | **Lie** = to rest flat (no object).
Prices tend to ___ during the holidays. | rise | raise; arise up; rose | **Rise** goes up by itself. **Raise** needs an object (raise the price).
The company decided to ___ the salaries of its workers. | raise | rise; arise; rose | **Raise** needs an object: raise **the salaries**.
The new building will be built on this ___. | site | sight; cite; sighting | **Site** = a place. **Sight** = vision. **Cite** = to quote.
Please ___ your sources at the end of the report. | cite | site; sight; sited | **Cite** = to name as a source.
The ___ of the sunset over Manila Bay was beautiful. | sight | site; cite; sighting | **Sight** = something seen.
The city ___ approved the new ordinance. | council | counsel; consul; councilor | **Council** = a group that makes decisions. **Counsel** = advice or a lawyer.
The lawyer gave wise ___ to his client. | counsel | council; consul; councilor | **Counsel** = advice.
Take a deep ___ before you start the exam. | breath | breathe; breathing; breaths of | **Breath** is the noun; **breathe** is the verb.
It is hard to ___ in a smoky room. | breathe | breath; breathes; breathing in | **Breathe** is the verb.
The ___ office keeps the records of all employees. | personnel | personal; personality; person | **Personnel** = the employees of an office. **Personal** = private.
That letter is ___; please do not open it. | personal | personnel; personnels; personality | **Personal** = private, for one person.
She is taller ___ her sister. | than | then; that; as | **Than** compares. **Then** tells time.
Finish the report first, and ___ send it to the director. | then | than; that; them | **Then** = next, after that.
The employees brought ___ own laptops. | their | there; they're; theirs | **Their** shows ownership.
___ going to the seminar tomorrow. | They're | Their; There; Theirs | **They're** = they are.
Many families moved ___ after the typhoon. | there | their; they're; theirs | **There** = in that place.
___ a long time since we last met. | It's | Its; Its'; It is's | **It's** = it has / it is.
`);

/* ---------- Sentence completion (clue words) ---------- */
hand('Sentence Completion', `
The employee was so ___ that he never missed a day of work in ten years. | dependable | careless; forgetful; idle | "Never missed a day in ten years" describes someone **dependable**.
Although the task was ___, she finished it in less than an hour. | complicated | simple; quick; easy | "Although" signals a contrast: a **complicated** task finished quickly.
The speaker was so ___ that many people in the audience fell asleep. | boring | lively; funny; exciting | People fell asleep → the speaker was **boring**.
The old building was declared ___ after the earthquake, so no one was allowed inside. | unsafe | beautiful; sturdy; historic | No one allowed inside → **unsafe**.
Unlike her ___ brother, Ana always saves part of her salary. | spendthrift | thrifty; careful; generous | "Unlike" signals the opposite of saving: a **spendthrift** spends carelessly.
The mayor's speech was ___; it lasted only three minutes. | brief | long; boring; loud | Three minutes → **brief**.
The new policy was ___ by most employees because it gave them more leave days. | welcomed | rejected; ignored; criticized | More leave days → the policy was **welcomed**.
The witness gave a ___ account of the accident, remembering every small detail. | detailed | vague; short; false | Remembering every small detail → **detailed**.
Despite the heavy rain, the parade went on as ___. | scheduled | cancelled; delayed; moved | "Despite" shows it still happened as **scheduled**.
The medicine should be taken ___, three times a day after meals. | regularly | rarely; never; once | Three times a day → **regularly**.
He was ___ about the results, so he checked them three times. | doubtful | certain; careless; proud | Checking three times → he was **doubtful**.
The team worked ___ to finish the project before the deadline. | tirelessly | lazily; slowly; carelessly | Racing to the deadline → **tirelessly**.
The library is a ___ place where people can read in silence. | quiet | noisy; crowded; busy | Read in silence → **quiet**.
The price of rice ___ after the typhoon destroyed many farms. | rose | fell; stayed; dropped | Less harvest → the price **rose**.
Her answer was ___; it had nothing to do with the question. | irrelevant | relevant; correct; detailed | "Nothing to do with the question" → **irrelevant**.
The manager praised the clerk for being ___ with the office supplies. | thrifty | wasteful; careless; lavish | Praised for using supplies well → **thrifty**.
The ___ of the town gathered at the plaza to hear the announcement. | residents | streets; rivers; buildings | People of the town → **residents**.
The road is ___ during the rainy season, so drivers must be careful. | slippery | dry; wide; smooth and dry | Rain makes roads **slippery**.
The two parties finally reached an ___ after long talks. | agreement | argument; accident; error | After long talks, they reached an **agreement**.
Since the files were ___, it took hours to find the right one. | disorganized | sorted; labeled; arranged | Took hours to find → **disorganized**.
The volunteers were ___ for their help during the flood. | thanked | blamed; fined; ignored | Helping during a flood earns **thanks**.
The child was ___ to cross the street alone, so her mother held her hand. | afraid | eager; happy; proud | Mother held her hand → the child was **afraid**.
The bridge was closed to traffic because it needed ___. | repairs | decorations; paint only; visitors | A closed bridge usually needs **repairs**.
`);

/* ---------- Filipino: wastong gamit ng salita ---------- */
hand('Wastong Gamit (Filipino)', `
Piliin ang wastong salita: "Pakibuksan mo ang ___ ng kuwarto." | pinto | pintuan; bintanaan; bubungan | Ang **pinto** ang isinasara at binubuksan; ang **pintuan** ang daanan o kinalalagyan nito.
Piliin ang wastong salita: "Nakatayo siya sa ___ habang naghihintay." | pintuan | pinto; bisagra; susian | Ang **pintuan** ang daanan o lugar ng pinto, kaya doon nakatatayo.
Piliin ang wastong salita: "Kailangang ___ ang pasyente bukas ng umaga." | operahan | operahin; inopera; operado | **Operahan** ang tao (ang pasyente). **Operahin** ang bahagi ng katawan (operahin ang tuhod).
Piliin ang wastong salita: "Kailangang ___ ang kanyang apendiks." | operahin | operahan; inoperahan; operado | **Operahin** ang mismong bahagi ng katawan na tinatanggal o inaayos.
Piliin ang wastong salita: "___ mong buhatin ang kahon kung kaya mo." | Subukin | Subukan; Sinubok; Pagsubok | **Subukin** = tingnan kung kaya o tama (to test/try). **Subukan** = tiktikan o silipin nang palihim.
Piliin ang wastong salita: "Umakyat siya sa ___ papunta sa ikalawang palapag." | hagdan | hagdanan; baitang lamang; pasilyo | **Hagdan** ang mismong inaakyatan; ang **hagdanan** ay ang lugar o bahagi ng bahay na kinalalagyan nito.
Piliin ang wastong salita: "___ siyang pera sa bangko." | May | Mayroon; Meron na; Mayroong ang | Ginagamit ang **may** kapag sinusundan ng pangngalan (may pera).
Piliin ang wastong salita: "___ ba kayong tanong?" | Mayroon | May; Meron na; Mayroong ng | Ginagamit ang **mayroon** kapag sinusundan ng kataga o panghalip (mayroon ba, mayroon siya).
Piliin ang wastong salita: "Kumain ___ siya ng almusal bago umalis." | din | rin; raw; daw | Tingnan ang salitang nasa unahan ng kataga: ang "kumain" ay nagtatapos sa katinig (n), kaya ang wasto ay **din**. Ang **rin** ay ginagamit kung patinig o w/y ang huling tunog. !!Huwag malito sa raw/daw: iba ang kahulugan nito (sinabi ng iba).!!
Piliin ang wastong salita: "Masipag ___ ang bagong empleyado." | daw | raw; rin; ng | Ang "masipag" ay nagtatapos sa katinig (g), kaya **daw** ang ginagamit.
Piliin ang wastong salita: "Mabait ___ ang kanyang ina." | din | rin; raw; nang | Ang "mabait" ay nagtatapos sa katinig (t), kaya **din**.
Piliin ang wastong salita: "Pupunta ___ sila sa seminar." | raw | daw; din; nang | Ang "pupunta" ay nagtatapos sa patinig (a), kaya **raw**.
Piliin ang wastong salita: "Bumili siya ___ bigas sa palengke." | ng | nang; na; ang | **Ng** ang ginagamit bago ang pangngalan na tumatanggap ng kilos (bumili ng bigas).
Piliin ang wastong salita: "Nagsalita siya ___ malakas." | nang | ng; na; ang | **Nang** ang ginagamit bago ang pang-abay na nagsasabi kung PAANO ginawa (nang malakas).
Piliin ang wastong salita: "Umalis siya ___ dumating ako." | nang | ng; na; kung | **Nang** = noong / when: "umalis siya **nang** dumating ako."
Piliin ang wastong salita: "Tumawa siya ___ tumawa." | nang | ng; na; at | **Nang** ang ginagamit sa pagitan ng inuulit na pandiwa (tumawa nang tumawa).
Piliin ang wastong salita: "Ang ___ ay may kahoy na hawakan." | martilyo | martilyuhin; pinukpok; pumukpok | **Martilyo** ang pangngalan ng kasangkapan.
Piliin ang wastong salita: "Si Ana ___ Ben ay magkapatid." | at si | at ni; o si; ng si | Pagdugtong ng dalawang pangngalang pantangi: "Si Ana **at si** Ben."
`);

/* ---------- Reading comprehension: short passages (each passage has 3 questions) ---------- */
const PASSAGES = [
  [`The bayanihan spirit is one of the oldest Filipino traditions. In the past, when a family moved to a new place, their neighbors would lift the whole nipa hut on bamboo poles and carry it to the new spot. No one was paid; the family simply prepared food for everyone after the work. Today, the same spirit is seen when communities help one another after typhoons and floods.`,
    [['What is the passage mainly about?', 'the Filipino tradition of helping one another', 'how to build a nipa hut; the history of typhoons in the Philippines; why families move to new places'],
      ['How were the neighbors thanked for carrying the house?', 'The family prepared food for them.', 'They were paid in cash.; They were given land.; They were given bamboo poles.'],
      ['According to the passage, where is the bayanihan spirit seen today?', 'in communities helping one another after typhoons and floods', 'in building new nipa huts every year; in paying neighbors for their help; in moving houses to the city']]],
  [`Mangroves grow along coasts where the sea meets the land. Their tangled roots slow down waves and hold the soil in place, which protects coastal towns during storms. The roots also serve as a safe home for young fish and crabs. However, many mangrove forests have been cut down to make way for fishponds and buildings.`,
    [['According to the passage, how do mangroves protect coastal towns?', 'Their roots slow down waves and hold the soil.', 'They block the wind with their leaves.; They provide wood for sea walls.; They keep fish away from the shore.'],
      ['Which animals use mangrove roots as a home, based on the passage?', 'young fish and crabs', 'birds and bats; snakes and lizards; whales and dolphins'],
      ['Why have many mangrove forests been lost?', 'They were cleared for fishponds and buildings.', 'They were destroyed by young fish.; They dried up in the sun.; They were eaten by crabs.']]],
  [`Public servants are expected to be on time. Being punctual shows respect for the people they serve and for their co-workers. When a clerk arrives late, the line of clients grows longer and the whole office slows down. A few minutes of delay each day can add up to many lost hours of service in a year.`,
    [['What is the main idea of the passage?', 'Punctuality is important in public service.', 'Clerks should work longer hours.; Offices should hire more clerks.; Clients should come early.'],
      ['According to the passage, what happens when a clerk arrives late?', 'The line of clients grows longer.', 'The office closes early.; The clients go home happy.; The clerk gets a promotion.'],
      ['The word "punctual" in the passage means:', 'on time', 'polite; hardworking; careful']]],
  [`The Philippine eagle is one of the largest and most powerful eagles in the world. It lives only in the forests of the Philippines, mostly in Mindanao. A pair of eagles raises only one chick every two years, so their number grows very slowly. Because their forest homes are being cut down, the Philippine eagle is now critically endangered.`,
    [['Why does the number of Philippine eagles grow slowly?', 'A pair raises only one chick every two years.', 'They live too long.; They eat only fish.; They fly to other countries.'],
      ['Where do most Philippine eagles live, according to the passage?', 'in Mindanao', 'in Luzon; in the Visayas; in other countries'],
      ['What is the main threat to the Philippine eagle mentioned in the passage?', 'the cutting down of its forest home', 'other eagles; typhoons; tourists']]],
  [`Before the age of mobile phones, Filipinos wrote letters to family members working abroad. A letter could take weeks to arrive, so every word was chosen with care. Today, a message reaches the other side of the world in seconds. Some people say that faster messages have made people closer, while others feel that the old letters carried more feeling.`,
    [['According to the passage, how long could a letter take to arrive?', 'weeks', 'seconds; hours; one day'],
      ['What do some people feel about the old letters?', 'They carried more feeling.', 'They were too expensive.; They were always lost.; They were faster than text messages.'],
      ['The passage mainly compares:', 'old letters and modern messages', 'mobile phones and computers; Filipinos and other people; work at home and abroad']]],
  [`Waste segregation starts at home. Biodegradable waste, like food scraps and leaves, can be turned into compost. Recyclable waste, like clean bottles and paper, can be sold or reused. Residual waste is what is left and goes to the landfill. When households separate their waste, less garbage ends up in landfills and in the sea.`,
    [['Based on the passage, what can food scraps be turned into?', 'compost', 'paper; bottles; plastic'],
      ['What happens to residual waste, according to the passage?', 'It goes to the landfill.', 'It is turned into compost.; It is sold.; It is reused at home.'],
      ['What is the main benefit of waste segregation mentioned in the passage?', 'Less garbage ends up in landfills and the sea.', 'Households earn a lot of money.; Food lasts longer.; Leaves grow faster.']]],
];
PASSAGES.forEach(([p, qs]) => qs.forEach(([q, a, ds]) => add('Reading Comprehension', q, a, ds.split(';').map((x) => x.trim()), 'The answer is stated in the passage. Find the sentence that says it.', p)));

module.exports = out;
