// Verbal Ability: idioms and Filipino sayings, written by hand (1.45.0).
// One row per idiom:  idiom | meaning | meaning group
// Wrong choices are meanings of OTHER idioms from a different meaning group, so only one meaning fits.
const { rows, pickSome } = require('./bank-tools');

const IDIOMS = rows(`
a piece of cake | something very easy | easy
a blessing in disguise | something good that first looked bad | luck
a dime a dozen | very common and cheap | common
add fuel to the fire | make a bad situation worse | worse
at the drop of a hat | right away, without waiting | fast
back to square one | start again from the beginning | restart
beat around the bush | avoid saying something directly | avoid
bite off more than you can chew | take on more than you can handle | toomuch
bite the bullet | do something hard that you must do | brave
break a leg | good luck (said before a show) | luck
break the ice | start a conversation in an awkward moment | talk
burn the midnight oil | work or study late at night | work
burn bridges | ruin a relationship for good | quarrel
call it a day | stop working for now | stop
cost an arm and a leg | be very expensive | expensive
cry over spilled milk | be upset about something that cannot be changed | regret
cut corners | do something badly to save time or money | cheat
get cold feet | become nervous and back out | fear
get the ball rolling | start an activity | start
give someone the cold shoulder | ignore someone on purpose | ignore
hit the nail on the head | say exactly the right thing | exact
hit the sack | go to bed | sleep
in hot water | in trouble | trouble
keep an eye on | watch carefully | watch
kill two birds with one stone | get two things done with one action | efficient
let the cat out of the bag | tell a secret by mistake | secret
miss the boat | lose a chance by being too slow | late
once in a blue moon | very rarely | rare
on cloud nine | very happy | happy
on the fence | unable to decide | undecided
over the moon | extremely pleased | happy
pull someone's leg | joke with someone | joke
see eye to eye | agree completely | agree
sit on the fence | avoid choosing a side | undecided
spill the beans | reveal a secret | secret
take it with a grain of salt | do not fully believe it | doubt
the ball is in your court | it is your turn to decide or act | turn
the last straw | the final problem that makes someone give up | toomuch
throw in the towel | give up | giveup
under the weather | feeling sick | sick
up in the air | still not decided | undecided
when pigs fly | something that will never happen | never
a hot potato | a problem nobody wants to handle | trouble
against the clock | in a rush to finish before a deadline | fast
all ears | listening carefully | watch
apple of my eye | someone very dear to me | love
at arm's length | at a safe distance | avoid
behind closed doors | in private, secretly | secret
bend over backwards | try very hard to help | work
by the book | following the rules exactly | rules
cold turkey | stopping a habit all at once | stop
down to earth | practical and humble | humble
draw the line | set a limit | rules
face the music | accept the punishment for what you did | brave
fish out of water | someone uncomfortable in a new place | uneasy
get out of hand | become impossible to control | worse
go the extra mile | do more than what is expected | work
hand in glove | working very closely together | agree
head over heels | completely in love | love
hit the books | study hard | work
in the same boat | in the same difficult situation | same
jump the gun | act too soon | early
keep your chin up | stay brave and hopeful | brave
lend a hand | help | help
let sleeping dogs lie | do not bring up an old problem | avoid
make ends meet | earn just enough money to live | money
off the hook | free from blame or duty | free
on thin ice | in a risky situation | trouble
out of the blue | suddenly and unexpectedly | sudden
play it by ear | decide as things happen | undecided
red tape | too many rules that cause delay | rules
rule of thumb | a simple, practical rule | rules
save for a rainy day | keep money for future needs | money
sell like hotcakes | sell quickly and in large numbers | fast
steal the show | get the most attention | best
take the bull by the horns | face a problem boldly | brave
through thick and thin | in good times and bad times | loyal
tie the knot | get married | marry
turn a blind eye | pretend not to see | ignore
twist someone's arm | persuade someone to do something | persuade
under the table | done secretly and often illegally | cheat
water under the bridge | a past problem that no longer matters | past
white elephant | a costly thing that is useless | useless
wild goose chase | a search that is useless | useless
with flying colors | with great success | best
a drop in the bucket | a very small amount compared to what is needed | small
a penny for your thoughts | tell me what you are thinking | talk
cut to the chase | get to the point | exact
keep your shirt on | stay calm | calm
`);

// Filipino idyoma (sawikain): sawikain | kahulugan | grupo
const SAWIKAIN = rows(`
balat-sibuyas | madaling masaktan ang damdamin | sensitive
bukas-palad | matulungin, mapagbigay | generous
butas ang bulsa | walang pera | poor
di-makabasag-pinggan | mahinhin | gentle
ilaw ng tahanan | ina | family
haligi ng tahanan | ama | family2
kapit-tuko | mahigpit ang hawak, ayaw bumitaw | stubborn
kusang-palo | kusang gumagawa nang hindi inuutusan | work
mababaw ang luha | madaling umiyak | cry
magaan ang kamay | madaling manakit | violent
makapal ang mukha | walang hiya | shameless
malakas ang loob | matapang | brave
malikot ang kamay | mahilig magnakaw | steal
nagsusunog ng kilay | nag-aaral nang mabuti | study
pantay ang mga paa | patay na | dead
pusong-mamon | maawain, malambot ang puso | kind
sanga-sangang dila | sinungaling | liar
taingang-kawali | nagbibingi-bingihan | ignore
tulog-mantika | mahimbing matulog | sleep
utak-talangka | ayaw umasenso ang kapwa | envy
mabigat ang kamay | tamad magtrabaho | lazy
anak-pawis | manggagawa, mahirap | worker
basag-ulo | away, gulo | fight
bantay-salakay | taksil na tagapagbantay | traitor
buto't balat | payat na payat | thin
kabiyak ng dibdib | asawa | spouse
itaga sa bato | tandaan, tiyak na mangyayari | promise
`);

const out = [];
for (const [list, lang] of [[IDIOMS, 'en'], [SAWIKAIN, 'fil']]) {
  for (const [idiom, meaning, group] of list) {
    const ds = pickSome(list.filter((x) => x[2] !== group).map((x) => x[1]), 3, 'idiom:' + idiom);
    if (lang === 'en') {
      out.push({ s: 'verbal', t: 'Idioms', q: `What does the idiom "${idiom}" mean?`, a: meaning, d: ds,
        e: `An **idiom** does not mean what its words say. You learn its meaning as a whole.\n**"${idiom}"** means ==${meaning}==.\nTip: make your own sentence with it so you remember it.` });
    } else {
      out.push({ s: 'verbal', t: 'Sawikain (Filipino)', q: `Ano ang kahulugan ng sawikaing "${idiom}"?`, a: meaning, d: ds,
        e: `Ang **sawikain** (idyoma) ay hindi literal ang kahulugan.\nAng **"${idiom}"** ay nangangahulugang ==${meaning}==.\nTip: gamitin ito sa sariling pangungusap para matandaan.` });
    }
  }
}

module.exports = out;
