// Analytical Ability: word analogies and odd-one-out, written by hand (1.45.0).
// The pairs and groups below were written and checked by hand. Each list was chosen so that every first word
// fits only ONE second word in its list (e.g. no "calf" for both cow and elephant), so the other second words
// of the same list are always wrong choices.
const { rows, pickSome, sshuffle } = require('./bank-tools');

const A = 'analytical';
const out = [];

/* ---------- Word analogies ---------- */
// Each relation: the sentence that links a pair ({a} and {b}), and its pairs "first | second".
const RELATIONS = [
  { name: 'young', say: (a, b) => `${cap(an(a))} is a young ${b}.`, pairs: `
    puppy | dog
    kitten | cat
    calf | cow
    foal | horse
    kid | goat
    lamb | sheep
    cub | lion
    duckling | duck
    chick | chicken
    piglet | pig
    joey | kangaroo
    fawn | deer
    gosling | goose
    cygnet | swan
    tadpole | frog
    owlet | owl
    eaglet | eagle
    caterpillar | butterfly` },
  { name: 'group', say: (a, b) => `A group of ${a} is called ${an(b)}.`, pairs: `
    wolves | pack
    fish | school
    bees | swarm
    lions | pride
    cattle | herd
    birds | flock
    stars | constellation
    islands | archipelago
    ships | fleet
    flowers | bouquet
    singers | choir
    players | team` },
  { name: 'tool', say: (a, b) => `${cap(an(a))} works with ${an(b)}.`, pairs: `
    surgeon | scalpel
    painter | brush
    tailor | needle
    farmer | plow
    photographer | camera
    writer | pen
    astronomer | telescope
    biologist | microscope
    fisherman | net
    butcher | cleaver
    gardener | trowel
    mechanic | wrench
    woodcutter | axe
    sculptor | chisel
    soldier | rifle` },
  { name: 'place', say: (a, b) => `${cap(an(a))} works in ${an(b)}.`, pairs: `
    teacher | school
    judge | court
    farmer | farm
    actor | theater
    miner | mine
    sailor | ship
    priest | church
    teller | bank
    scientist | laboratory
    mechanic | garage
    pilot | cockpit
    chef | kitchen` },
  { name: 'product', say: (a, b) => `${cap(an(a))} makes ${b}.`, pairs: `
    poet | poems
    composer | symphonies
    baker | bread
    cobbler | shoes
    bee | honey
    spider | webs
    sculptor | statues
    potter | pottery
    carpenter | furniture` },
  { name: 'part', say: (a, b) => `${cap(an(a))} is part of ${an(b)}.`, pairs: `
    page | book
    petal | flower
    finger | hand
    toe | foot
    branch | tree
    feather | bird
    senator | senate
    step | staircase
    link | chain
    spoke | wheel
    key | piano
    lens | camera` },
  { name: 'measure', say: (a, b) => `${cap(an(a))} measures ${b}.`, pairs: `
    thermometer | temperature
    barometer | air pressure
    weighing scale | weight
    clock | time
    ruler | length
    speedometer | speed
    seismograph | earthquakes
    rain gauge | rainfall
    hygrometer | humidity
    ammeter | electric current` },
  { name: 'gender', say: (a, b) => `${cap(a)} is the male and ${b} is the female.`, pairs: `
    king | queen
    rooster | hen
    bull | cow
    stallion | mare
    ram | ewe
    gander | goose
    nephew | niece
    actor | actress
    prince | princess
    husband | wife
    uncle | aunt
    groom | bride
    monk | nun
    emperor | empress
    lion | lioness
    son | daughter
    brother | sister` },
  { name: 'home', say: (a, b) => `${cap(an(a))} lives in ${an(b)}.`, pairs: `
    bee | hive
    bird | nest
    spider | web
    horse | stable
    pig | sty
    dog | kennel
    lion | den
    rabbit | burrow
    ant | anthill` },
  { name: 'sound', say: (a, b) => `The sound ${an(a)} makes is called ${an(b)}.`, pairs: `
    dog | bark
    cat | meow
    lion | roar
    cow | moo
    snake | hiss
    horse | neigh
    duck | quack
    pig | oink
    bee | buzz
    owl | hoot
    frog | croak
    sheep | bleat
    donkey | bray
    mouse | squeak
    elephant | trumpet` },
  { name: 'use', say: (a, b) => `${cap(an(a))} ${a === 'scissors' ? 'are' : 'is'} used to ${b}.`, pairs: `
    pen | write
    broom | sweep
    needle | sew
    shovel | dig
    oven | bake
    key | unlock
    eraser | erase
    scissors | cut
    flat iron | press clothes
    soap | wash
    ladder | climb
    paddle | row
    glue | stick things together` },
  { name: 'capital', say: (a, b) => `${cap(b)} is the capital of ${the(a)}.`, pairs: `
    Japan | Tokyo
    Thailand | Bangkok
    Vietnam | Hanoi
    South Korea | Seoul
    China | Beijing
    India | New Delhi
    France | Paris
    Italy | Rome
    Spain | Madrid
    Germany | Berlin
    United Kingdom | London
    Australia | Canberra
    Canada | Ottawa
    Egypt | Cairo
    Russia | Moscow
    Philippines | Manila
    Cambodia | Phnom Penh
    Laos | Vientiane
    Myanmar | Naypyidaw
    Brazil | Brasília
    Argentina | Buenos Aires
    Portugal | Lisbon
    Greece | Athens
    Turkey | Ankara
    Saudi Arabia | Riyadh
    New Zealand | Wellington` },
  { name: 'currency', say: (a, b) => `The money of ${the(a)} is the ${b}.`, pairs: `
    Japan | yen
    South Korea | won
    Thailand | baht
    India | rupee
    Philippines | peso
    United Kingdom | pound
    China | yuan
    Vietnam | dong
    Indonesia | rupiah
    Malaysia | ringgit
    Russia | ruble
    Saudi Arabia | riyal
    Brazil | real
    South Africa | rand
    Switzerland | franc` },
];
function cap(s) { return s[0].toUpperCase() + s.slice(1); }
// "a" or "an" before a word (an owlet, an outer part, a unit), none for words like glue, soap and scissors.
const NO_ARTICLE = new Set(['glue', 'soap', 'scissors']);
function an(w) {
  if (NO_ARTICLE.has(w)) return w;
  const bare = w.replace(/^==/, '');
  return `${/^[aeio]/i.test(bare) || /^u(?!ni|s)/i.test(bare) ? 'an' : 'a'} ${w}`;
}
// Country names that take "the".
const the = (c) => (/^(Philippines|United Kingdom)$/.test(c) ? 'the ' + c : c);
const TRAP = {
  capital: 'A big or famous city is not always the capital.',
  currency: 'Each country has only one money name here; the others belong to other countries.',
};

for (const rel of RELATIONS) {
  const pairs = rows(rel.pairs);
  pairs.forEach(([c, d], i) => {
    const examples = pickSome(pairs.filter((_, j) => j !== i), 3, `${rel.name}:${c}`);
    for (const [a, b] of examples) {
      const wrong = pickSome(pairs.map((p) => p[1]), 3, `${rel.name}:${c}:${a}`, (x) => x !== d);
      out.push({
        s: A, t: 'Word Analogy', q: `${a.toUpperCase()} : ${b.toUpperCase()} :: ${c.toUpperCase()} : ___`, a: d, d: wrong,
        e: `Step 1: Make a sentence for the first pair: **${rel.say(a, b)}**\nStep 2: Use the SAME sentence for the second pair: ${rel.say(c, `==${d}==`)}\n` +
          (TRAP[rel.name] ? `!!Trap!!: ${TRAP[rel.name]}` : `!!Trap!!: the other choices fit other words, not ${c}.`),
      });
    }
  });
}

/* ---------- Odd one out ---------- */
// group name (plural) | one of them (singular) | members
const GROUPS = Object.fromEntries(rows(`
fruits | fruit | apple, mango, banana, grapes, pineapple, guava, lanzones, rambutan, durian
vegetables | vegetable | carrot, cabbage, eggplant, okra, spinach, lettuce, ampalaya, kangkong, radish, pechay
birds | bird | eagle, sparrow, pigeon, parrot, owl, crow, hawk, heron, maya, kingfisher
fish | fish | tilapia, bangus, tuna, salmon, lapu-lapu, galunggong, sardine, catfish, mackerel
mammals | mammal | dog, cat, carabao, horse, goat, cow, tiger, deer, monkey, rabbit
insects | insect | ant, bee, butterfly, mosquito, housefly, grasshopper, beetle, cockroach, dragonfly
vehicles | vehicle | bus, jeepney, car, truck, tricycle, motorcycle, van, taxi
furniture | piece of furniture | chair, table, sofa, bed, cabinet, bookshelf, desk, bench
cooking tools | cooking tool | ladle, spatula, pot, frying pan, kettle, wok, colander, grater
string instruments | string instrument | guitar, violin, harp, cello, banjo, ukulele
wind instruments | wind instrument | flute, trumpet, saxophone, clarinet, trombone, tuba
colors | color | red, blue, green, yellow, purple, pink, brown, gray
flat shapes | flat (2D) shape | circle, square, triangle, rectangle, pentagon, hexagon
solid shapes | solid (3D) shape | cube, sphere, cylinder, cone, pyramid, prism
organs inside the body | organ inside the body | heart, lungs, liver, kidney, stomach, brain
metals | metal | iron, copper, gold, silver, aluminum, zinc, tin
planets | planet | Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune
months | month | January, March, April, June, August, October, December
days of the week | day of the week | Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
units of length | unit of length | meter, kilometer, centimeter, millimeter, inch, mile
units of weight | unit of weight | gram, kilogram, milligram, ton
units of volume | unit of volume | liter, milliliter, gallon, quart
currencies | currency | peso, dollar, yen, euro, baht, won, rupee, ringgit
sports played with a ball | sport played with a ball | basketball, volleyball, football, tennis, badminton, baseball
clothes | piece of clothing | shirt, pants, skirt, dress, jacket, blouse, shorts
body parts you can see | outer body part | elbow, knee, ankle, wrist, shoulder, chin
`).map(([plural, one, members]) => [plural, { plural, one, members: members.split(',').map((m) => m.trim()) }]));
// main group | groups the odd word may come from (close, so the question makes the reader think)
const PAIRS = rows(`
fruits | vegetables
vegetables | fruits
birds | mammals, fish, insects
fish | birds, mammals
mammals | birds, fish
insects | birds
vehicles | furniture
furniture | cooking tools, vehicles
cooking tools | furniture
string instruments | wind instruments
wind instruments | string instruments
colors | flat shapes, solid shapes
flat shapes | solid shapes
solid shapes | flat shapes
organs inside the body | body parts you can see
body parts you can see | organs inside the body
metals | fruits
planets | days of the week, months
months | days of the week
days of the week | months
units of length | units of weight, units of volume
units of weight | units of length, units of volume
units of volume | units of length, units of weight
currencies | units of weight
sports played with a ball | clothes
clothes | furniture
`);
// Words that are in two groups (orange: fruit and color) are never used, so each word belongs to one group.
const seen = new Set();
for (const [main, odds] of PAIRS) {
  const g = GROUPS[main];
  const oddGroups = odds.split(',').map((x) => GROUPS[x.trim()]);
  for (let k = 0; k < 18; k++) {
    const three = pickSome(g.members, 3, `odd:${main}:${k}`);
    const og = oddGroups[k % oddGroups.length];
    const [odd] = pickSome(og.members, 1, `oddw:${main}:${k}`);
    const key = [...three, odd].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    const shown = sshuffle([...three, odd], key);
    out.push({
      s: A, t: 'Classification', q: `Which word does NOT belong to the group? ${shown.join(', ')}`, a: odd, d: three,
      e: `Step 1: Find what most of the words have in common: **${three.join(', ')}** are all **${g.plural}**.\nStep 2: **${odd}** is ${an(og.one)}, not one of the ${g.plural}.\nSo ==${odd}== does not belong.`,
    });
  }
}

module.exports = out;
