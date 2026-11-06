// Verbal Ability: vocabulary (synonym and antonym) in English and Filipino, written by hand (1.45.0).
// One row per word:  WORD | synonym | antonym (or -) | kind:meaning group
//   kind: a = adjective, v = verb, n = noun. The meaning group (e.g. "sad", "fast") keeps wrong choices safe.
// Each row gives a synonym question, and an antonym question when the row has an antonym.
// Wrong choices are the synonyms (or antonyms) of OTHER words of the same kind, but never from a meaning group
// that is close to the word or to its opposite, so a wrong choice can never also be right.
const { rows, pickSome } = require('./bank-tools');

const TABLE = `
abhor | hate | love | v:hate
abject | wretched | proud | a:sad
abolish | eliminate | establish | v:destroy
abrupt | sudden | gradual | a:fast
absolve | pardon | blame | v:praise
abstain | refrain | indulge | v:keep
absurd | ridiculous | sensible | a:foolish
accelerate | speed up | slow down | v:fast
acclaim | praise | criticism | n:praise
accord | agreement | conflict | n:agree
accumulate | gather | scatter | v:gather
accurate | exact | wrong | a:true
acquire | obtain | lose | v:keep
acute | sharp | dull | a:wise
adept | skilled | clumsy | a:skill
adequate | sufficient | lacking | a:many
adhere | stick | detach | v:gather
adjacent | next to | far from | a:near
admonish | warn | praise | v:blame
adorn | decorate | strip | v:show
adversary | opponent | ally | n:enemy
adverse | harmful | favorable | a:harm
advocate | supporter | critic | n:friend
aggravate | worsen | relieve | v:bad
agile | nimble | clumsy | a:fast
agitate | stir up | calm | v:angry
alien | foreign | native | a:odd
allay | ease | intensify | v:calm
allege | claim | deny | v:talk
aloof | distant | friendly | a:enemy
altruistic | selfless | selfish | a:generous
ambivalent | undecided | certain | a:doubt
amend | correct | worsen | v:fix
ample | plenty | insufficient | a:many
annihilate | destroy | create | v:destroy
anonymous | unnamed | identified | a:hide
antagonize | provoke | soothe | v:angry
antique | old | modern | a:old
apathy | indifference | interest | n:indifferent
appease | pacify | anger | v:calm
apprehend | arrest | release | v:bind
apprehensive | worried | confident | a:fear
apt | suitable | unsuitable | a:good
arbitrary | random | reasoned | a:odd
ardent | eager | indifferent | a:eager
arid | dry | wet | a:empty
arrogant | proud | modest | a:proud
ascend | climb | descend | v:high
assent | agreement | refusal | n:agree
assert | declare | deny | v:talk
assiduous | diligent | careless | a:careful
astute | shrewd | foolish | a:wise
atrocious | terrible | excellent | a:bad
augment | increase | reduce | v:more
austere | strict | lenient | a:strict
authentic | genuine | fake | a:real
avarice | greed | generosity | n:greedy
aversion | dislike | liking | n:hate
banal | ordinary | original | a:usual
barren | infertile | fertile | a:empty
belligerent | hostile | peaceful | a:enemy
berate | scold | praise | v:blame
bewilder | confuse | enlighten | v:unclear
bizarre | strange | normal | a:odd
bland | tasteless | spicy | a:dull
blunt | frank | tactful | a:honest
boisterous | noisy | quiet | a:loud
bolster | support | weaken | v:help
brittle | fragile | sturdy | a:weak
brusque | curt | courteous | a:rude
buoyant | cheerful | depressed | a:happy
callous | heartless | compassionate | a:cruel
candor | honesty | deceit | n:honest
capricious | fickle | steady | a:changing
captivate | charm | repel | v:love
censure | criticize | approve | v:blame
chaos | disorder | order | n:mess
cherish | treasure | neglect | v:love
chronic | long-lasting | temporary | a:lasting
clandestine | secret | open | a:hide
coarse | rough | smooth | a:rough
coherent | logical | confused | a:clear
colossal | gigantic | minute | a:big
competent | capable | incompetent | a:skill
complacent | self-satisfied | concerned | a:indifferent
comply | obey | disobey | v:obey
compassion | sympathy | cruelty | n:kind
compel | force | allow | v:bind
conceited | vain | humble | a:proud
concur | agree | disagree | v:agree
condemn | denounce | praise | v:blame
condone | excuse | condemn | v:praise
confide | trust | distrust | v:sure
congenial | pleasant | disagreeable | a:friend
conspicuous | noticeable | hidden | a:show
contempt | scorn | respect | n:contempt
contradict | deny | confirm | v:disagree
copious | plentiful | meager | a:many
corroborate | confirm | refute | v:true
covert | hidden | overt | a:hide
credible | believable | doubtful | a:true
cryptic | mysterious | clear | a:unclear
culpable | guilty | innocent | a:bad
curtail | cut short | extend | v:less
cynical | distrustful | trusting | a:doubt
daunting | intimidating | encouraging | a:fear
debilitate | weaken | strengthen | v:weak
decipher | decode | encode | v:clear
decrepit | worn-out | new | a:old
defer | postpone | advance | v:late
defiant | rebellious | obedient | a:defy
deft | skillful | awkward | a:skill
degrade | humiliate | honor | v:contempt
delete | erase | insert | v:destroy
deliberate | intentional | accidental | a:sure
delude | deceive | enlighten | v:deceit
demolish | tear down | build up | v:destroy
denounce | condemn | praise | v:blame
deplete | exhaust | replenish | v:empty
deplorable | disgraceful | admirable | a:bad
deride | mock | respect | v:contempt
desolate | deserted | crowded | a:alone
despondent | hopeless | hopeful | a:sad
destitute | penniless | rich | a:poor
deter | discourage | encourage | v:hinder
detrimental | harmful | beneficial | a:harm
devious | sly | straightforward | a:deceit
devout | pious | irreligious | a:faith
dexterity | skill | clumsiness | n:skill
diffident | shy | confident | a:quiet
dilapidated | run-down | well-kept | a:old
discern | perceive | overlook | v:see
discord | disagreement | harmony | n:disagree
disdain | contempt | admiration | n:contempt
disperse | scatter | gather | v:scatter
docile | obedient | unruly | a:obey
dormant | inactive | active | a:tired
dubious | doubtful | certain | a:doubt
durable | long-lasting | flimsy | a:strong
dwindle | shrink | grow | v:less
eccentric | odd | conventional | a:odd
eclipse | overshadow | reveal | v:hide
elaborate | detailed | simple | a:complex
elude | evade | confront | v:avoid
emancipate | free | enslave | v:free
eminent | distinguished | unknown | a:famous
endorse | approve | reject | v:accept
enhance | improve | worsen | v:fix
enigma | mystery | explanation | n:unclear
enmity | hostility | friendship | n:enemy
eradicate | wipe out | establish | v:destroy
erratic | unpredictable | consistent | a:changing
erroneous | incorrect | correct | a:false
esteem | respect | contempt | n:respect
evade | avoid | face | v:avoid
evident | obvious | hidden | a:show
exasperate | annoy | please | v:angry
exemplary | model | poor | a:good
exhilarating | thrilling | boring | a:eager
expedite | speed up | delay | v:fast
explicit | clear | implied | a:clear
exquisite | beautiful | ugly | a:beauty
extravagant | wasteful | economical | a:waste
fabricate | make up | tell the truth | v:deceit
facilitate | ease | obstruct | v:help
fallacy | false belief | truth | n:false
fastidious | fussy | careless | a:careful
fatigue | tiredness | energy | n:tired
feeble | weak | strong | a:weak
ferocious | fierce | gentle | a:cruel
fickle | changeable | constant | a:changing
flagrant | glaring | hidden | a:show
flaw | defect | perfection | n:bad
flourish | thrive | decline | v:more
fluent | articulate | halting | a:talk
foe | enemy | friend | n:enemy
forlorn | lonely | cheerful | a:sad
formidable | powerful | weak | a:strong
fragile | delicate | sturdy | a:weak
frail | weak | robust | a:weak
frantic | frenzied | calm | a:fear
fraudulent | dishonest | honest | a:deceit
frivolous | silly | serious | a:foolish
furtive | sneaky | open | a:hide
garrulous | talkative | quiet | a:talk
genial | friendly | unfriendly | a:friend
genuine | real | fake | a:real
glum | sad | joyful | a:sad
gratify | please | displease | v:happy
grievous | serious | minor | a:important
grueling | exhausting | easy | a:hard
haggard | worn | fresh | a:tired
haphazard | random | organized | a:mess
harmony | agreement | conflict | n:agree
haughty | arrogant | humble | a:proud
hazardous | dangerous | safe | a:harm
heed | pay attention to | ignore | v:see
heinous | wicked | admirable | a:bad
hilarious | very funny | serious | a:happy
hoard | stockpile | squander | v:save
homogeneous | uniform | varied | a:usual
hypocrite | pretender | sincere person | n:deceit
illicit | illegal | legal | a:illegal
illustrious | famous | unknown | a:famous
immense | huge | tiny | a:big
imminent | about to happen | far off | a:near
impeccable | flawless | faulty | a:good
imperative | necessary | optional | a:important
impetuous | rash | careful | a:careless
implausible | unlikely | believable | a:doubt
implement | carry out | neglect | v:start
implicit | implied | explicit | a:hide
impoverished | poor | wealthy | a:poor
inadvertent | accidental | intentional | a:careless
incessant | constant | occasional | a:lasting
incite | provoke | discourage | v:angry
incompetent | unskilled | capable | a:clumsy
indifferent | uninterested | concerned | a:indifferent
indignant | angry | pleased | a:angry
inept | clumsy | skillful | a:clumsy
infamous | notorious | honorable | a:bad
infer | conclude | - | v:wise
ingenious | clever | unimaginative | a:wise
inhibit | restrain | encourage | v:hinder
innate | inborn | learned | a:real
innocuous | harmless | harmful | a:safe
insolent | rude | respectful | a:rude
instigate | start | stop | v:start
integrity | honesty | corruption | n:honest
intrepid | fearless | cowardly | a:brave
intricate | complicated | simple | a:complex
invigorate | energize | tire | v:energy
irate | furious | calm | a:angry
irrelevant | unrelated | relevant | a:unrelated
jeopardize | endanger | protect | v:harm
jubilant | joyful | sorrowful | a:happy
judicious | wise | unwise | a:wise
keen | eager | reluctant | a:eager
kindle | ignite | extinguish | v:start
lament | mourn | rejoice | v:sad
languid | listless | lively | a:tired
latent | hidden | visible | a:hide
laudable | praiseworthy | shameful | a:praise
lavish | generous | stingy | a:generous
legitimate | lawful | illegal | a:legal
liable | responsible | exempt | a:bind
listless | sluggish | lively | a:tired
loathe | detest | adore | v:hate
lofty | high | low | a:high
loquacious | talkative | silent | a:talk
lucrative | profitable | unprofitable | a:rich
lure | tempt | repel | v:love
malevolent | evil | kind | a:cruel
malicious | spiteful | kindly | a:cruel
mandatory | required | optional | a:bind
meager | scanty | abundant | a:few
mediocre | ordinary | excellent | a:usual
melancholy | sadness | happiness | n:sad
mend | repair | break | v:fix
mercenary | greedy | generous | a:greedy
minute | tiny | huge | a:small
mirth | laughter | gloom | n:happy
modest | humble | boastful | a:humble
mollify | soothe | enrage | v:calm
morose | sullen | cheerful | a:sad
mundane | ordinary | extraordinary | a:usual
naive | innocent | worldly | a:foolish
nefarious | wicked | virtuous | a:bad
negligent | careless | careful | a:careless
nimble | quick | slow | a:fast
nocturnal | nightly | daytime | a:time
nonchalant | casual | anxious | a:calm
notorious | infamous | respected | a:bad
nourish | feed | starve | v:help
nullify | cancel | validate | v:destroy
obedient | dutiful | disobedient | a:obey
obscure | unclear | clear | a:unclear
obsequious | servile | domineering | a:obey
obstruct | block | clear | v:hinder
ominous | threatening | promising | a:fear
onerous | burdensome | light | a:hard
optimistic | hopeful | pessimistic | a:happy
opaque | cloudy | clear | a:unclear
ostentatious | showy | modest | a:proud
oust | expel | admit | v:reject
outrageous | shocking | acceptable | a:bad
pacifist | peace lover | warmonger | n:friend
paltry | small | large | a:small
paramount | supreme | minor | a:important
passive | inactive | active | a:tired
paucity | scarcity | plenty | n:few
pensive | thoughtful | thoughtless | a:wise
perilous | dangerous | safe | a:harm
perpetual | everlasting | temporary | a:lasting
perplex | puzzle | clarify | v:unclear
pertinent | relevant | irrelevant | a:related
pessimistic | gloomy | optimistic | a:sad
petulant | irritable | good-natured | a:angry
philanthropist | donor | miser | n:generous
pious | devout | irreverent | a:faith
plausible | believable | unbelievable | a:true
plight | predicament | good fortune | n:hard
poignant | touching | unmoving | a:sad
pompous | self-important | humble | a:proud
ponder | think about | ignore | v:wise
potent | powerful | weak | a:strong
pragmatic | practical | idealistic | a:wise
precarious | unstable | secure | a:harm
precise | exact | inexact | a:true
predicament | dilemma | solution | n:hard
premature | early | late | a:early
prestigious | respected | unknown | a:famous
pristine | unspoiled | dirty | a:clean
proficient | expert | unskilled | a:skill
profound | deep | shallow | a:deep
prohibit | forbid | permit | v:forbid
prominent | well-known | obscure | a:famous
prompt | punctual | late | a:early
prosper | flourish | fail | v:rich
provoke | anger | calm | v:angry
punctual | on time | late | a:early
quaint | old-fashioned | modern | a:old
quarrel | argument | agreement | n:disagree
quell | suppress | provoke | v:calm
querulous | complaining | contented | a:angry
rampant | widespread | controlled | a:many
rational | logical | irrational | a:wise
raucous | harsh | soft | a:loud
rebuke | reprimand | praise | v:blame
recede | retreat | advance | v:less
reckless | careless | careful | a:careless
rectify | correct | spoil | v:fix
redundant | unnecessary | essential | a:trivial
refute | disprove | prove | v:false
relinquish | give up | keep | v:giveup
remorse | regret | satisfaction | n:sad
renounce | reject | accept | v:reject
replenish | refill | empty | v:full
reprimand | scold | praise | v:blame
repulsive | disgusting | attractive | a:ugly
resent | begrudge | welcome | v:hate
reserved | shy | outgoing | a:quiet
resolute | determined | wavering | a:brave
restrain | hold back | release | v:hinder
reticent | quiet | talkative | a:quiet
revere | honor | despise | v:respect
robust | strong | weak | a:strong
rudimentary | basic | advanced | a:simple
ruthless | merciless | merciful | a:cruel
sagacious | wise | foolish | a:wise
salvage | rescue | abandon | v:save
sanction | permission | prohibition | n:allow
scanty | meager | plentiful | a:few
scarce | rare | plentiful | a:few
scorn | contempt | admiration | n:contempt
sedate | calm | excited | a:calm
shrewd | clever | foolish | a:wise
shun | avoid | welcome | v:avoid
skeptical | doubtful | convinced | a:doubt
slander | defame | praise | v:blame
sluggish | slow | quick | a:slow
solemn | serious | cheerful | a:sad
solitary | alone | accompanied | a:alone
somber | gloomy | bright | a:sad
spurious | false | genuine | a:fake
squander | waste | save | v:waste
stagnant | still | flowing | a:calm
steadfast | loyal | disloyal | a:faith
stern | strict | gentle | a:strict
strenuous | demanding | effortless | a:hard
subordinate | inferior | superior | a:low
subsequent | following | previous | a:late
substantial | considerable | small | a:big
subtle | slight | obvious | a:hide
succinct | brief | long-winded | a:short
sullen | moody | cheerful | a:sad
superficial | shallow | deep | a:shallow
superfluous | excessive | necessary | a:trivial
surmount | overcome | give in to | v:brave
susceptible | vulnerable | resistant | a:weak
sustain | maintain | abandon | v:keep
taciturn | silent | talkative | a:quiet
tactful | diplomatic | rude | a:polite
tangible | touchable | intangible | a:real
tardy | late | punctual | a:late
temperate | moderate | extreme | a:calm
tentative | uncertain | definite | a:doubt
terminate | end | begin | v:stop
thrifty | economical | extravagant | a:save
thwart | prevent | help | v:hinder
timid | shy | bold | a:fear
tolerant | open-minded | intolerant | a:lenient
torment | torture | comfort | n:cruel
tranquility | calmness | turmoil | n:calm
trepidation | fear | courage | n:fear
turbulent | stormy | calm | a:angry
ubiquitous | everywhere | rare | a:many
unanimous | united | divided | a:agree
uncouth | rude | refined | a:rude
undermine | weaken | strengthen | v:weak
unscrupulous | dishonest | principled | a:deceit
uphold | support | oppose | v:help
urban | city | rural | a:place
utilize | use | waste | v:help
vacant | empty | occupied | a:empty
valiant | brave | cowardly | a:brave
valid | sound | invalid | a:true
vanish | disappear | appear | v:hide
vehement | forceful | mild | a:strong
venerable | respected | disreputable | a:respect
verify | confirm | disprove | v:true
versatile | adaptable | limited | a:skill
vex | annoy | please | v:angry
viable | workable | unworkable | a:good
vicious | cruel | kind | a:cruel
vigorous | energetic | weak | a:energy
vile | disgusting | pleasant | a:ugly
virtue | goodness | vice | n:good
vivid | bright | dull | a:clear
volatile | unstable | stable | a:changing
voluntary | optional | compulsory | a:free
vulnerable | exposed | protected | a:weak
wary | careful | trusting | a:careful
weary | tired | refreshed | a:tired
whimsical | playful | serious | a:happy
wholesome | healthy | unhealthy | a:good
wicked | evil | good | a:bad
wistful | longing | content | a:sad
wrath | anger | calm | n:angry
yearn | long for | dislike | v:love
yield | surrender | resist | v:giveup
zest | enthusiasm | apathy | n:eager
`;


// Filipino: SALITA | kasingkahulugan | kasalungat (o -) | uri:grupo (same groups as above).
const TALAAN = `
agam-agam | pag-aalinlangan | katiyakan | n:doubt
alintana | pansin | pagwawalang-bahala | n:see
alisto | handa | pabaya | a:careful
alumpihit | balisa | panatag | a:fear
anggi | ambon | buhos | n:place
bagwis | pakpak | - | n:place
balisa | nag-aalala | panatag | a:fear
banaag | sinag | dilim | n:show
banas | init | lamig | n:hard
bantayog | monumento | - | n:place
bathala | diyos | - | n:faith
bihasa | sanay | baguhan | a:skill
bulagsak | burara | maingat | a:careless
butihin | mabait | masama | a:kind
dagli | agad | mabagal | a:fast
dahop | kapos | sagana | a:poor
dalubhasa | eksperto | baguhan | n:skill
dalumat | konsepto | - | n:wise
dambuhala | higante | maliit | a:big
dapithapon | takipsilim | bukang-liwayway | n:time
dayukdok | gutom na gutom | busog | a:empty
dungawan | bintana | - | n:place
dusta | api | marangal | a:poor
gahaman | sakim | mapagbigay | a:greedy
galak | tuwa | lungkot | n:happy
ganid | sakim | mapagbigay | a:greedy
gilas | husay | kahinaan | n:skill
gunita | alaala | limot | n:see
hagilap | hanap | - | v:see
halimuyak | bango | baho | n:beauty
hapis | lungkot | saya | n:sad
hikbi | iyak | tawa | n:sad
himagsik | paghihimagsik | pagsuko | n:defy
himok | hikayat | pigil | v:help
hinagpis | dalamhati | ligaya | n:sad
humpay | hinto | tuloy | v:stop
hungkag | walang laman | puno | a:empty
igting | tindi | hina | n:strong
inog | ikot | - | n:changing
kabagsikan | kalupitan | kabaitan | n:cruel
kahambal-hambal | kaawa-awa | kainggit-inggit | a:sad
kalunos-lunos | nakaaawa | nakatutuwa | a:sad
kamal-kamal | marami | kaunti | a:many
kapighatian | pagdurusa | kaligayahan | n:sad
karimlan | kadiliman | liwanag | n:unclear
kariktan | kagandahan | kapangitan | n:beauty
kawangis | kamukha | kaiba | a:usual
kimi | mahiyain | palakaibigan | a:quiet
kubli | tago | lantad | a:hide
kumupas | lumabo | tumingkad | v:less
kupad | bagal | bilis | n:slow
labis | sobra | kulang | a:many
lagablab | liyab | - | n:energy
lagalag | gala | - | a:changing
lakan | maharlika | - | n:famous
lambong | belo | - | n:hide
lango | lasing | - | a:foolish
lantad | hayag | tago | a:show
lathalain | artikulo | - | n:talk
liblib | malayo | malapit | a:alone
likas | natural | artipisyal | a:real
linang | taniman | - | n:place
lipos | puno | salat | a:full
lumbay | lungkot | saya | n:sad
lunggati | hangarin | - | n:eager
lupig | talo | panalo | a:weak
mabalasik | mabangis | maamo | a:cruel
mabanas | maalinsangan | malamig | a:hard
mabikas | makisig | pangit | a:beauty
madawag | masukal | malinis | a:mess
madalang | bihira | madalas | a:few
magilas | makisig | - | a:beauty
mahusay | magaling | mahina | a:skill
malikhain | mapanlikha | - | a:wise
malikot | magalaw | tahimik | a:energy
malubha | grabe | magaan | a:important
maluho | magastos | matipid | a:waste
mangmang | walang alam | marunong | a:foolish
mapaniil | mapang-api | makatarungan | a:cruel
mapusok | mapangahas | mahinahon | a:careless
marahan | dahan-dahan | mabilis | a:slow
marangal | kagalang-galang | hamak | a:respect
marangya | maluho | payak | a:rich
mariwasa | mayaman | mahirap | a:rich
masalimuot | magulo | payak | a:complex
masagana | marami | salat | a:many
masinop | maayos | burara | a:careful
matalas | matalino | mapurol | a:wise
matalik | malapit | malayo | a:friend
matamlay | mahina | masigla | a:tired
matapang | magiting | duwag | a:brave
matatag | matibay | marupok | a:strong
matimpi | mapagpigil | mainitin ang ulo | a:calm
matipid | masinop sa pera | magastos | a:save
matulin | mabilis | mabagal | a:fast
mausisa | mapagtanong | walang pakialam | a:see
mayumi | mahinhin | magaslaw | a:polite
nabighani | naakit | nainis | a:love
nagngingitngit | galit na galit | masaya | a:angry
namanglaw | nalungkot | natuwa | a:sad
nasawi | namatay | nabuhay | a:sad
naumid | hindi nakapagsalita | nakapagsalita | a:quiet
pagkasuklam | pagkamuhi | pagmamahal | n:hate
pahat | mangmang | marunong | a:foolish
palamara | taksil | tapat | a:deceit
pamimighati | pagdadalamhati | pagsasaya | n:sad
pangamba | takot | tapang | n:fear
pangimbuno | inggit | - | n:greedy
panibugho | selos | - | n:hate
paslit | bata | matanda | n:small
piging | handaan | - | n:happy
pinid | sarado | bukas | a:hide
pusikit | madilim na madilim | maliwanag | a:unclear
puspos | lipos | salat | a:full
sagwil | hadlang | tulong | n:hinder
sakuna | aksidente | - | n:harm
salanggapang | taksil | tapat | n:deceit
sambit | bigkas | - | v:talk
sansinukob | daigdig | - | n:place
sapantaha | hinala | katiyakan | n:doubt
sigalot | away | pagkakasundo | n:disagree
siphayo | kabiguan | tagumpay | n:sad
siyasat | suri | - | v:see
sukab | taksil | tapat | a:deceit
sumpa | pangako | - | n:faith
supling | anak | magulang | n:small
taghoy | panaghoy | halakhak | n:sad
takipsilim | dapithapon | bukang-liwayway | n:time
talamak | laganap | bihira | a:many
talima | sunod | suway | v:obey
tampalasan | walang galang | magalang | a:rude
tanglaw | ilaw | dilim | n:show
tanod | bantay | - | n:friend
tigib | puno | walang laman | a:full
tikom | sarado | bukas | a:hide
tuliro | litong-lito | panatag | a:fear
ulayaw | kausap | - | n:friend
unos | bagyo | - | n:harm
`;

// Meaning groups that are close to each other. A wrong choice never comes from the word's own cluster, or
// from the cluster of its opposite group.
const CLUSTERS = [
  'hate contempt angry blame', 'love praise respect', 'happy eager', 'sad', 'fear doubt', 'brave strong energy',
  'weak tired slow late', 'fast early start', 'calm quiet', 'loud talk', 'honest true sure real clear show',
  'deceit false fake hide unclear avoid', 'kind friend polite generous good help fix', 'cruel enemy rude bad harm',
  'wise skill careful', 'foolish clumsy careless', 'big many more full high important famous', 'small few less short low trivial empty',
  'rich', 'poor', 'proud', 'humble', 'old', 'usual simple', 'odd changing complex', 'mess', 'gather keep save',
  'scatter giveup waste reject', 'destroy stop', 'hinder forbid bind', 'free allow obey agree accept', 'disagree defy',
  'legal', 'illegal', 'strict', 'lenient', 'lasting', 'rough', 'near', 'deep', 'shallow', 'faith', 'beauty', 'ugly',
  'dull', 'alone', 'see', 'safe', 'time', 'place', 'related', 'unrelated', 'indifferent', 'greedy', 'clean', 'hard', 'easy',
];
// The group of each word's opposite.
const OPP = {
  hate: 'love', love: 'hate', happy: 'sad', sad: 'happy', fear: 'brave', brave: 'fear', doubt: 'true', true: 'doubt',
  strong: 'weak', weak: 'strong', energy: 'tired', tired: 'energy', fast: 'slow', slow: 'fast', early: 'late', late: 'early',
  calm: 'angry', angry: 'calm', quiet: 'loud', loud: 'quiet', talk: 'quiet', honest: 'deceit', deceit: 'honest', real: 'fake', fake: 'real',
  false: 'true', clear: 'unclear', unclear: 'clear', show: 'hide', hide: 'show', kind: 'cruel', cruel: 'kind', friend: 'enemy', enemy: 'friend',
  polite: 'rude', rude: 'polite', good: 'bad', bad: 'good', harm: 'safe', safe: 'harm', help: 'hinder', hinder: 'help', fix: 'destroy',
  destroy: 'fix', wise: 'foolish', foolish: 'wise', skill: 'clumsy', clumsy: 'skill', careful: 'careless', careless: 'careful',
  big: 'small', small: 'big', many: 'few', few: 'many', more: 'less', less: 'more', full: 'empty', empty: 'full', high: 'low', low: 'high',
  important: 'trivial', trivial: 'important', famous: 'bad', rich: 'poor', poor: 'rich', proud: 'humble', humble: 'proud', old: 'new',
  usual: 'odd', odd: 'usual', simple: 'complex', complex: 'simple', changing: 'usual', mess: 'usual', gather: 'scatter', scatter: 'gather',
  keep: 'giveup', giveup: 'keep', save: 'waste', waste: 'save', reject: 'accept', accept: 'reject', stop: 'start', start: 'stop',
  forbid: 'allow', allow: 'forbid', bind: 'free', free: 'bind', obey: 'defy', defy: 'obey', agree: 'disagree', disagree: 'agree',
  legal: 'illegal', illegal: 'legal', strict: 'lenient', lenient: 'strict', lasting: 'short', short: 'lasting', rough: 'calm', near: 'far',
  deep: 'shallow', shallow: 'deep', faith: 'deceit', beauty: 'ugly', ugly: 'beauty', dull: 'eager', alone: 'friend', see: 'avoid',
  avoid: 'see', related: 'unrelated', unrelated: 'related', indifferent: 'eager', eager: 'indifferent', greedy: 'generous',
  generous: 'greedy', clean: 'mess', hard: 'easy', easy: 'hard', praise: 'blame', blame: 'praise', respect: 'contempt', contempt: 'respect',
  sure: 'doubt', time: '', place: '',
};
const clusterOf = (g) => CLUSTERS.find((c) => c.split(' ').includes(g)) || g;
const near = (g) => new Set([...clusterOf(g).split(' '), ...(OPP[g] ? clusterOf(OPP[g]).split(' ') : [])]);

const parse = (text, lang) => rows(text).map(([w, syn, ant, kg]) => {
  const [kind, group] = kg.split(':');
  return { w, syn, ant: ant === '-' ? '' : ant, kind, group, lang };
});
const ROWS = [...parse(TABLE, 'en'), ...parse(TALAAN, 'fil')];

// A word is safe as a wrong choice for row r when no row that uses it (as synonym or antonym) is close in meaning to r.
function safeFor(r, word) {
  const bad = near(r.group);
  if ([r.w, r.syn, r.ant].includes(word)) return false;
  return !ROWS.some((x) => (x.syn === word || x.ant === word || x.w === word) && (bad.has(x.group) || x.w === r.w));
}

const TEXT = {
  en: {
    synT: 'Vocabulary (Synonym)', antT: 'Vocabulary (Antonym)',
    synQ: (W) => `Which word or phrase is closest in meaning to ${W}?`,
    antQ: (W) => `Which word or phrase is OPPOSITE in meaning to ${W}?`,
    synE: (W, w, syn, ant) => `Step 1: **${W}** means **${syn}**.\nStep 2: Test it in a sentence: put "${syn}" in place of "${w}". The meaning stays the same, so it is the synonym.\nSo the answer is ==${syn}==.${ant ? `\n!!Trap!!: a word that means the opposite (like "${ant}") is never the synonym.` : ''}`,
    antE: (W, w, syn, ant) => `Step 1: **${W}** means **${syn}**.\nStep 2: Find the choice that means the **opposite** of "${syn}".\nThe opposite is ==${ant}==.\n!!Trap!!: "${syn}" has the SAME meaning as ${w}, so it is not the antonym.`,
  },
  fil: {
    synT: 'Talasalitaan (Filipino)', antT: 'Talasalitaan (Filipino)',
    synQ: (W) => `Ano ang kasingkahulugan ng ${W}?`,
    antQ: (W) => `Ano ang KASALUNGAT ng ${W}?`,
    synE: (W, w, syn, ant) => `Hakbang 1: Ang **${W}** ay nangangahulugang **${syn}**.\nHakbang 2: Ilagay ang "${syn}" kapalit ng "${w}" sa isang pangungusap. Pareho pa rin ang kahulugan, kaya ito ang kasingkahulugan.\nSagot: ==${syn}==.${ant ? `\n!!Bitag!!: ang kabaligtaran (gaya ng "${ant}") ay hindi kasingkahulugan.` : ''}`,
    antE: (W, w, syn, ant) => `Hakbang 1: Ang **${W}** ay **${syn}**.\nHakbang 2: Hanapin ang pagpipilian na **baligtad** ang kahulugan sa "${syn}".\nAng kasalungat ay ==${ant}==.\n!!Bitag!!: ang "${syn}" ay KAPAREHO ng kahulugan ng ${w}, kaya hindi ito ang kasalungat.`,
  },
};

const list = [];
for (const r of ROWS) {
  const { w, syn, ant, kind, lang } = r;
  const T = TEXT[lang];
  const W = w.toUpperCase();
  const pool = ROWS.filter((x) => x.kind === kind && x.lang === lang);
  const ds = pickSome(pool.map((x) => x.syn), 3, 'syn:' + w, (word) => safeFor(r, word));
  list.push({ t: T.synT, q: T.synQ(W), a: syn, d: ds, e: T.synE(W, w, syn, ant) });
  if (ant) {
    const ds2 = pickSome(pool.map((x) => x.ant).filter(Boolean), 2, 'ant:' + w, (word) => safeFor(r, word));
    list.push({ t: T.antT, q: T.antQ(W), a: ant, d: [syn, ...ds2], e: T.antE(W, w, syn, ant) });
  }
}

module.exports = list.map((x) => ({ s: 'verbal', ...x }));
module.exports.ROWS = ROWS;
module.exports.near = near;
