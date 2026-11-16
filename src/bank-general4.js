// General Information beyond the laws, part 2 (1.46.0): science, health, culture and the arts, the
// environment, and the world. Same way as bank-general3.js: fact lists written and checked by hand, the wrong
// choices are other rows of the same list (seeded, so they never change).
const { rows } = require('./bank-tools');
const { wrong } = require('./bank-general3');

const G = 'general';
const out = [];
function add(t, q, a, ds, fact) {
  out.push({ s: G, t, q, a, d: ds, e: `${fact}\nSo the answer is ==${a}==.` });
}
const hand = (t, text) => rows(text).forEach(([q, a, ds, fact]) => add(t, q, a, ds.split(';').map((x) => x.trim()), fact));

/* =============================== SCIENCE AND TECHNOLOGY =============================== */
const SCI = 'Science and Technology';
// element | symbol (only the common ones a reviewer is expected to know)
const ELEMENTS = rows(`
Hydrogen | H
Helium | He
Carbon | C
Nitrogen | N
Oxygen | O
Sodium | Na
Magnesium | Mg
Aluminum | Al
Silicon | Si
Phosphorus | P
Sulfur | S
Chlorine | Cl
Potassium | K
Calcium | Ca
Iron | Fe
Copper | Cu
Zinc | Zn
Silver | Ag
Tin | Sn
Iodine | I
Gold | Au
Mercury | Hg
Lead | Pb
Uranium | U
Neon | Ne
Fluorine | F
Nickel | Ni
Platinum | Pt
`);
for (const [el, sym] of ELEMENTS) {
  add(SCI, `What is the chemical symbol of ${el.toLowerCase()}?`, sym, wrong(ELEMENTS.map((x) => x[1]), sym, 'sym' + el, ELEMENTS.filter((x) => x[1][0] === sym[0]).map((x) => x[1])),
    `The symbol of **${el.toLowerCase()}** is **${sym}**.${sym[0] !== el[0] ? ' It comes from its Latin name.' : ''}`);
  add(SCI, `The chemical symbol "${sym}" stands for:`, el, wrong(ELEMENTS.map((x) => x[0]), el, 'el' + el), `**${sym}** is the symbol of **${el.toLowerCase()}**.`);
}
// scientist | what they are known for
const SCIENTISTS = rows(`
Isaac Newton | the three laws of motion and the law of universal gravitation
Albert Einstein | the theory of relativity (E = mc²)
Charles Darwin | the theory of evolution by natural selection
Gregor Mendel | the laws of heredity from experiments on pea plants
Louis Pasteur | pasteurization and early vaccines against rabies
Alexander Fleming | the discovery of penicillin
Marie Curie | research on radioactivity and the discovery of polonium and radium
Galileo Galilei | using the telescope to study the moons of Jupiter
Nicolaus Copernicus | the idea that the Earth goes around the Sun
Dmitri Mendeleev | the first periodic table of the elements
Thomas Edison | the practical electric light bulb and the phonograph
Alexander Graham Bell | the telephone
Wright brothers | the first powered airplane flight
Edward Jenner | the first vaccine, against smallpox
Michael Faraday | electromagnetic induction, the basis of electric generators
Antoine Lavoisier | the law of conservation of mass in chemical reactions
Johannes Gutenberg | the movable-type printing press in Europe
Tim Berners-Lee | the World Wide Web
James Watt | an improved steam engine
Anton van Leeuwenhoek | the first observations of bacteria with a microscope
Robert Hooke | naming the "cell" after looking at cork under a microscope
Archimedes | the principle of buoyancy (why things float)
`);
for (const [p, w] of SCIENTISTS) {
  add(SCI, `Who is best known for ${w}?`, p, wrong(SCIENTISTS.map((x) => x[0]), p, 'sci' + p), `**${p}** is known for ${w}.`);
}
// quantity | SI unit
const UNITS = rows(`
force | newton
energy | joule
power | watt
electric current | ampere
electric charge | coulomb
voltage | volt
electrical resistance | ohm
frequency | hertz
pressure | pascal
temperature (SI base unit) | kelvin
mass | kilogram
length | meter
time | second
amount of substance | mole
`);
for (const [qty, u] of UNITS) {
  add(SCI, `What is the SI unit of ${qty}?`, u, wrong(UNITS.map((x) => x[1]), u, 'unit' + qty), `The SI unit of **${qty}** is the **${u}**.`);
}
// instrument | what it measures or does
const TOOLS = rows(`
thermometer | temperature
barometer | air pressure
anemometer | wind speed
hygrometer | humidity of the air
seismograph | the strength of earthquakes
rain gauge | the amount of rainfall
ammeter | electric current
voltmeter | voltage
odometer | distance traveled by a vehicle
speedometer | the speed of a vehicle
sphygmomanometer | blood pressure
stethoscope | sounds of the heart and lungs
microscope | very small objects such as cells
telescope | faraway objects such as stars and planets
compass | direction (north, south, east, west)
altimeter | altitude or height above sea level
`);
for (const [tool, w] of TOOLS) {
  add(SCI, `Which instrument is used to measure or observe ${w}?`, tool, wrong(TOOLS.map((x) => x[0]), tool, 'tool' + tool), `A **${tool}** is used for **${w}**.`);
}
hand(SCI, `
Which planet is closest to the Sun? | Mercury | Venus; Earth; Mars | The order from the Sun: **Mercury**, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.
Which is the largest planet in our solar system? | Jupiter | Saturn; Neptune; Earth | **Jupiter** is the biggest planet.
Which planet is known as the "Red Planet"? | Mars | Venus; Jupiter; Mercury | **Mars** looks red because of iron oxide (rust) on its surface.
Which planet is famous for its large, bright rings? | Saturn | Mars; Mercury; Venus | **Saturn** has the most visible rings.
Which is the hottest planet in our solar system? | Venus | Mercury; Mars; Jupiter | **Venus** is the hottest because its thick carbon dioxide air traps heat.
Which planet is farthest from the Sun? | Neptune | Uranus; Saturn; Pluto | Since 2006 Pluto is a dwarf planet, so **Neptune** is the farthest planet.
Pluto has been classified since 2006 as a: | dwarf planet | star; moon; comet | In 2006 astronomers reclassified Pluto as a **dwarf planet**.
How many planets are in our solar system? | 8 | 7; 9; 10 | There are **8 planets**: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.
The Earth takes about how long to go around the Sun once? | 365¼ days | 24 hours; 30 days; 100 days | One trip around the Sun (a year) takes about **365¼ days**; that is why there is a leap year every 4 years.
The Earth turns once on its axis in about: | 24 hours | 12 hours; 7 days; 365 days | One full turn (rotation) of the Earth takes about **24 hours**, giving day and night.
The natural satellite of the Earth is the: | Moon | Sun; Mars; Venus | The **Moon** is the Earth's only natural satellite.
A solar eclipse happens when the: | Moon passes between the Sun and the Earth | Earth passes between the Sun and the Moon; Sun passes between the Earth and the Moon; Moon is on the far side of the Sun | In a **solar eclipse**, the **Moon passes between the Sun and the Earth** and blocks the sunlight.
A lunar eclipse happens when the: | Earth passes between the Sun and the Moon | Moon passes between the Sun and the Earth; Sun passes between the Earth and the Moon; Moon is closest to the Sun | In a **lunar eclipse**, the **Earth's shadow falls on the Moon**.
The star at the center of our solar system is the: | Sun | Polaris; Sirius; Moon | The **Sun** is the star at the center of our solar system.
Our galaxy is called the: | Milky Way | Andromeda; Orion; Big Dipper | We live in the **Milky Way** galaxy.
The force that pulls objects toward the center of the Earth is: | gravity | friction; magnetism; inertia | **Gravity** pulls objects toward the Earth.
The force that slows down two surfaces rubbing against each other is: | friction | gravity; inertia; buoyancy | **Friction** acts between surfaces that rub, and slows things down.
The tendency of an object to stay at rest or keep moving unless a force acts on it is called: | inertia | friction; gravity; momentum | **Inertia** is Newton's first law of motion.
Sound travels fastest through: | solids | gases; a vacuum; liquids | Sound travels **fastest in solids**, slower in liquids, slowest in gases, and not at all in a vacuum.
Sound cannot travel through: | a vacuum (empty space) | water; steel; air | Sound needs matter to travel, so it **cannot travel in a vacuum**.
Light travels at about how many kilometers per second? | 300,000 km/s | 300 km/s; 3,000 km/s; 30,000 km/s | The speed of light is about **300,000 km per second**.
The bending of light when it passes from air into water is called: | refraction | reflection; diffraction; absorption | Light bends (**refraction**) when it goes from one material into another.
The bouncing back of light from a mirror is called: | reflection | refraction; absorption; dispersion | Light bouncing off a surface is **reflection**.
White light can be split into the colors of the rainbow using a: | prism | mirror; magnet; lens cap | A **prism** splits white light into red, orange, yellow, green, blue, indigo and violet.
The three common states of matter are: | solid, liquid and gas | hot, warm and cold; metal, wood and plastic; heavy, light and empty | Matter is usually a **solid, liquid or gas**.
The change of a liquid into a gas is called: | evaporation | condensation; freezing; melting | A liquid turning into a gas is **evaporation**.
The change of a gas into a liquid, like water drops forming on a cold glass, is called: | condensation | evaporation; sublimation; melting | Gas turning into a liquid is **condensation**.
The change of a solid directly into a gas, like dry ice, is called: | sublimation | condensation; evaporation; freezing | A solid that turns straight into a gas goes through **sublimation**.
Pure water boils at sea level at: | 100 °C | 50 °C; 90 °C; 212 °C | Water boils at **100 °C** (212 °F) at sea level.
Pure water freezes at: | 0 °C | 10 °C; −10 °C; 32 °C | Water freezes at **0 °C** (32 °F).
The chemical formula of water is: | H₂O | CO₂; O₂; NaCl | Water is **H₂O**: two hydrogen atoms and one oxygen atom.
The chemical name of table salt is: | sodium chloride | sodium carbonate; calcium carbonate; potassium nitrate | Table salt is **sodium chloride** (NaCl).
The gas that plants take in from the air to make food is: | carbon dioxide | oxygen; nitrogen; hydrogen | Plants take in **carbon dioxide** and give off oxygen.
The gas that makes up most of the air we breathe (about 78%) is: | nitrogen | oxygen; carbon dioxide; hydrogen | Air is about **78% nitrogen** and 21% oxygen.
The process by which green plants make food using sunlight is: | photosynthesis | respiration; digestion; transpiration | **Photosynthesis** uses sunlight, water and carbon dioxide to make sugar and oxygen.
The green substance in leaves that captures sunlight is: | chlorophyll | hemoglobin; carotene; melanin | **Chlorophyll** makes leaves green and captures light.
The loss of water vapor through the leaves of a plant is called: | transpiration | photosynthesis; germination; pollination | Water leaving through leaf openings is **transpiration**.
The transfer of pollen from one flower to another is called: | pollination | germination; fertilization of soil; transpiration | Moving pollen between flowers is **pollination**, often done by bees and butterflies.
The basic unit of life is the: | cell | atom; tissue; organ | All living things are made of **cells**.
The "powerhouse of the cell" that makes energy is the: | mitochondrion | nucleus; ribosome; cell wall | The **mitochondrion** makes energy for the cell.
The part of the cell that holds the genetic material (DNA) is the: | nucleus | cytoplasm; cell membrane; vacuole | The **nucleus** holds the DNA and controls the cell.
The molecule that carries genetic information is: | DNA | ATP; protein; glucose | **DNA** (deoxyribonucleic acid) carries the instructions of heredity.
An animal with a backbone is called a: | vertebrate | invertebrate; mollusk; arthropod | Animals with a backbone are **vertebrates**.
Animals that eat only plants are called: | herbivores | carnivores; omnivores; decomposers | **Herbivores** eat only plants, like the carabao.
Animals that eat both plants and meat are called: | omnivores | herbivores; carnivores; producers | **Omnivores**, like humans, eat both plants and meat.
Organisms like fungi and bacteria that break down dead things are called: | decomposers | producers; consumers; predators | **Decomposers** return nutrients to the soil.
Which animal is a mammal? | whale | shark; tuna; crocodile | A **whale** is a mammal: it breathes air and feeds milk to its young.
Which animal is an amphibian? | frog | snake; turtle; lizard | A **frog** is an amphibian: it lives in water when young and on land as an adult.
Which animal is an insect? | ant | spider; scorpion; centipede | An **ant** is an insect: six legs and three body parts. Spiders have eight legs.
Bats find their way in the dark using: | echolocation (bouncing sounds) | infrared eyes; smell only; the Earth's magnetic field only | Bats use **echolocation**: they listen to the echoes of their calls.
The hardest natural substance is: | diamond | iron; quartz; gold | **Diamond**, a form of carbon, is the hardest natural material.
The only metal that is liquid at room temperature is: | mercury | lead; aluminum; silver | **Mercury** is a liquid metal at room temperature.
A material that lets electricity flow easily is called a: | conductor | insulator; resistor; magnet | **Conductors**, like copper, let electricity flow easily.
A material like rubber or plastic that does not let electricity flow easily is a(n): | insulator | conductor; semiconductor; battery | **Insulators** like rubber and plastic block electric current.
The pH of pure water is: | 7 (neutral) | 1 (very acidic); 14 (very basic); 4 (acidic) | Pure water has a pH of **7**, which is neutral.
A substance with a pH below 7, like vinegar or calamansi juice, is a(n): | acid | base; salt; neutral substance | A pH **below 7** means an **acid**.
The layer of gases that surrounds the Earth is the: | atmosphere | hydrosphere; lithosphere; biosphere | The **atmosphere** is the layer of air around the Earth.
The lowest layer of the atmosphere, where weather happens, is the: | troposphere | stratosphere; mesosphere; thermosphere | Weather happens in the **troposphere**, the layer closest to the ground.
The center or innermost layer of the Earth is the: | core | crust; mantle; atmosphere | From outside in: crust, mantle, **core**.
The scale used to describe the strength of an earthquake at its source is the: | magnitude scale | Beaufort scale; pH scale; Fahrenheit scale | **Magnitude** tells the energy released at the source. **Intensity** tells how strongly it was felt in a place.
A giant sea wave caused by an undersea earthquake is a: | tsunami | storm surge; tidal bore; rip current | A **tsunami** is caused by an undersea earthquake or volcanic eruption.
The abnormal rise of sea water pushed by a strong typhoon is called a: | storm surge | tsunami; high tide; flash flood | A **storm surge** is sea water pushed onto land by a typhoon's winds.
The eye of a typhoon is: | its calm center | its strongest wall of clouds; its leading rain band; its outer edge | The **eye** is the calm, clear center of a typhoon.
The water cycle step where water falls as rain is called: | precipitation | evaporation; condensation; collection | Rain, snow and hail are **precipitation**.
The karaoke-like "Karaoke Sing-Along System" was patented by the Filipino inventor: | Roberto del Rosario | Gregorio Zara; Diosdado Banatao; Fe del Mundo | **Roberto del Rosario** patented the Karaoke Sing-Along System.
The Filipino engineer known for computer chip designs used in early personal computers is: | Diosdado Banatao | Roberto del Rosario; Gregorio Zara; Eduardo Quisumbing | **Diosdado Banatao** designed important computer chips and graphics accelerators.
The first Philippine-made microsatellite, launched in 2016, was named: | Diwata-1 | Maya-1; Agila-1; Lawin-1 | **Diwata-1** was the first microsatellite built by Filipinos, launched in 2016.
The Philippine Space Agency (PhilSA) was created in the year: | 2019 | 2009; 2016; 2022 | The **Philippine Space Agency** was created in **2019**.
In computers, "CPU" stands for: | Central Processing Unit | Computer Personal Unit; Central Program Utility; Control Processing Unit | The **CPU (Central Processing Unit)** is the "brain" of the computer.
Which of these is an input device? | keyboard | monitor; printer; speaker | A **keyboard** puts data into the computer. Monitors, printers and speakers are output devices.
Which of these is an output device? | printer | mouse; scanner; microphone | A **printer** shows the result on paper, so it is an output device.
The temporary memory of a computer that is cleared when it is turned off is the: | RAM | ROM; hard disk; flash drive | **RAM** (random access memory) loses its data when the power is off.
1 kilobyte (KB) is about how many bytes? | 1,000 bytes | 100 bytes; 10 bytes; 1,000,000 bytes | 1 **kilobyte** is about **1,000 bytes** (exactly 1,024 in the older binary count).
A program that harms a computer or steals data is called: | malware | firmware; freeware; shareware | **Malware** (malicious software) includes viruses and ransomware.
A fake message that tricks people into giving passwords or bank details is called: | phishing | spamming; hacking a router; debugging | **Phishing** uses fake emails, texts or sites to steal passwords and money.
The best practice for a strong password is to: | use a long mix of letters, numbers and symbols, and not share it | use your birthday; use the same password everywhere; write it on your monitor | A strong password is **long, mixed and private**, and different for each account.
"URL" stands for: | Uniform Resource Locator | Universal Reading Link; Uniform Routing Line; User Resource Library | A **URL (Uniform Resource Locator)** is the address of a web page.
The "s" in "https" means the connection is: | secure (encrypted) | slow; shared; simple | **https** means the site uses an **encrypted, secure** connection.
`);

/* =============================== HEALTH AND NUTRITION =============================== */
const HEA = 'Health and Nutrition';
// vitamin or mineral | what too little of it causes
const DEFICIENCY = rows(`
vitamin A | night blindness
vitamin B1 (thiamine) | beriberi
vitamin C | scurvy (bleeding gums)
vitamin D | rickets (soft, weak bones in children)
vitamin K | slow blood clotting
iodine | goiter (swelling of the thyroid gland)
iron | anemia (tiredness from too few red blood cells)
vitamin B3 (niacin) | pellagra
`);
for (const [v, dis] of DEFICIENCY) {
  add(HEA, `Lack of ${v} in the diet can cause:`, dis, wrong(DEFICIENCY.map((x) => x[1]), dis, 'def' + v), `Too little **${v}** causes **${dis}**.`);
  add(HEA, `Too little of which nutrient causes ${dis}?`, v, wrong(DEFICIENCY.map((x) => x[0]), v, 'defn' + v), `**${dis[0].toUpperCase() + dis.slice(1)}** comes from too little **${v}**.`);
}
// disease | how it spreads or what causes it
const DISEASES = rows(`
dengue | the bite of an infected Aedes mosquito
malaria | the bite of an infected Anopheles mosquito
leptospirosis | flood water or soil with the urine of infected rats
rabies | the bite or scratch of an infected dog or cat
tuberculosis | bacteria in the air when a sick person coughs or sneezes
cholera | food or water dirty with the bacteria Vibrio cholerae
typhoid fever | food or water dirty with Salmonella Typhi bacteria
tetanus | bacteria entering a deep wound, like one from a rusty nail
measles | a very contagious virus spread through the air
hepatitis B | infected blood and body fluids
`);
for (const [d, how] of DISEASES) {
  add(HEA, `Which disease is spread by ${how}?`, d, wrong(DISEASES.map((x) => x[0]), d, 'dis' + d), `**${d[0].toUpperCase() + d.slice(1)}** is spread by ${how}.`);
}
// organ | its main job
const ORGANS = rows(`
heart | pumps blood to the whole body
lungs | take in oxygen and remove carbon dioxide
kidneys | filter the blood and make urine
liver | cleans the blood of toxins and makes bile
stomach | mixes food with acid to start breaking down proteins
small intestine | absorbs most of the nutrients from food
large intestine | absorbs water from what is left of the food
brain | controls the body and thinking
skin | covers and protects the body, the largest organ
pancreas | makes insulin to control blood sugar
`);
for (const [o, job] of ORGANS) {
  add(HEA, `Which organ ${job}?`, `the ${o}`, wrong(ORGANS.map((x) => `the ${x[0]}`), `the ${o}`, 'org' + o), `The **${o}** ${job}.`);
}
// body system | its main organs or job
const SYSTEMS = rows(`
circulatory system | the heart, blood and blood vessels
respiratory system | the nose, windpipe and lungs
digestive system | the mouth, stomach and intestines
nervous system | the brain, spinal cord and nerves
skeletal system | the bones that support the body
muscular system | the muscles that move the body
excretory (urinary) system | the kidneys and bladder
endocrine system | glands that make hormones
immune system | white blood cells that fight germs
`);
for (const [s, parts] of SYSTEMS) {
  add(HEA, `Which body system is made up of ${parts}?`, s, wrong(SYSTEMS.map((x) => x[0]), s, 'sys' + s), `The **${s}** is ${parts}.`);
}
hand(HEA, `
The Filipino food guide "Go, Grow and Glow" puts rice, bread and root crops in which group? | Go foods (energy) | Grow foods (body-building); Glow foods (protection); none of them | Rice, bread and root crops give energy: **Go foods**.
In "Go, Grow and Glow," fish, meat, eggs and beans are: | Grow foods (body-building) | Go foods (energy); Glow foods (protection); empty foods | Foods rich in protein build the body: **Grow foods**.
In "Go, Grow and Glow," fruits and vegetables are: | Glow foods (protection) | Go foods (energy); Grow foods (body-building); junk foods | Fruits and vegetables give vitamins and minerals: **Glow foods**.
The DOST-FNRI food guide that shows how much of each food group to put on a plate is: | Pinggang Pinoy | Food Pyramid Lite; Healthy Bilao; Plato ng Bayan | **Pinggang Pinoy** shows a healthy plate: half fruits and vegetables, then rice and protein.
The nutrient that is the body's main source of quick energy is: | carbohydrates | proteins; vitamins; minerals | **Carbohydrates** (like rice and bread) are the main source of quick energy.
The nutrient needed to build and repair muscles and tissues is: | protein | fat; carbohydrate; fiber | **Protein** builds and repairs body tissues.
The mineral needed for strong bones and teeth is: | calcium | iron; iodine; sodium | **Calcium** keeps bones and teeth strong.
Iodized salt is used in the Philippines mainly to prevent: | goiter | scurvy; night blindness; rickets | Salt with iodine (**ASIN law**) helps prevent **goiter** and other iodine problems.
The vitamin the body makes when the skin is exposed to sunlight is: | vitamin D | vitamin A; vitamin C; vitamin B12 | Sunlight helps the skin make **vitamin D**.
Fruits like calamansi, guava and oranges are rich in: | vitamin C | vitamin D; vitamin B12; vitamin K | Citrus and guava are full of **vitamin C**.
Carrots, squash and malunggay are good sources of: | vitamin A | vitamin D; vitamin B12; vitamin E only | Orange and dark green vegetables are rich in **vitamin A**.
The normal body temperature of a healthy person is about: | 37 °C | 35 °C; 39 °C; 40 °C | Normal body temperature is about **37 °C**.
A normal resting heart rate for an adult is about: | 60 to 100 beats per minute | 20 to 40 beats per minute; 120 to 160 beats per minute; 180 to 200 beats per minute | A normal adult resting pulse is **60 to 100 beats per minute**.
Normal adult blood pressure is around: | 120/80 mmHg | 180/120 mmHg; 90/150 mmHg; 200/100 mmHg | A normal blood pressure reading is around **120/80 mmHg**.
The best way to prevent the spread of many germs is: | washing hands with soap and water | taking antibiotics every day; avoiding all vegetables; drinking cold water | **Handwashing with soap and water** is one of the best ways to stop germs.
Handwashing with soap should last at least about: | 20 seconds | 2 seconds; 5 seconds; 5 minutes | Wash for at least **20 seconds** (about two "Happy Birthday" songs).
Antibiotics work against infections caused by: | bacteria | viruses; allergies; vitamins | **Antibiotics** kill **bacteria**. They do not work against viruses like the flu.
A vaccine helps the body by: | training the immune system to fight a germ | killing all germs in the body at once; replacing white blood cells; curing every disease | A **vaccine** teaches the immune system to recognize and fight a germ.
The DOH campaign to stop dengue by cleaning mosquito breeding places is the: | 4S strategy (search and destroy, self-protection, seek early consultation, support fogging when needed) | 3Rs strategy; ABC strategy; BIDA campaign | The DOH's **4S** against dengue: search and destroy breeding sites, self-protection, seek early consultation, and support fogging only when there is an outbreak.
Mosquitoes that carry dengue usually lay eggs in: | clean, still water in containers | running rivers; salt water; dry sand | Aedes mosquitoes breed in **clean, stagnant water** (old tires, cans, flower vases).
The first thing to do for a minor burn is to: | cool it under clean running water | put toothpaste on it; pop the blisters; put ice directly on it for an hour | Cool a minor burn under **clean running water** for about 10 to 20 minutes.
For a nosebleed, a person should: | sit up, lean forward and pinch the soft part of the nose | lie flat on the back; tilt the head far back; blow the nose hard | **Lean forward and pinch** the soft part of the nose for about 10 minutes.
CPR stands for: | Cardiopulmonary Resuscitation | Central Pulse Recovery; Chest Pressure Release; Cardiac Pain Relief | **CPR (Cardiopulmonary Resuscitation)** keeps blood and oxygen flowing when the heart stops.
The national emergency hotline number in the Philippines is: | 911 | 117; 143; 888 | The national emergency hotline is **911**.
Smoking is a major cause of: | lung cancer and heart disease | goiter; scurvy; night blindness | Smoking causes **lung cancer, heart disease** and many other illnesses.
A disease that can pass from one person to another is called: | communicable (infectious) | non-communicable; hereditary only; chronic only | **Communicable** diseases spread from person to person, like flu and TB.
Diabetes, heart disease and cancer are examples of: | non-communicable diseases | communicable diseases; vitamin deficiencies; viral infections | **Non-communicable diseases** do not spread from person to person.
The hormone that lowers blood sugar is: | insulin | adrenaline; estrogen; thyroxine | **Insulin**, made by the pancreas, lowers blood sugar.
The red blood cells carry oxygen using a protein called: | hemoglobin | insulin; chlorophyll; keratin | **Hemoglobin** in red blood cells carries oxygen.
The blood cells that fight infection are the: | white blood cells | red blood cells; platelets; plasma | **White blood cells** fight germs.
The blood cells that help blood clot when you get a wound are the: | platelets | red blood cells; white blood cells; plasma cells | **Platelets** help the blood clot.
The blood type known as the "universal donor" is: | O negative | AB positive; A positive; B negative | **O negative** blood can be given to almost anyone in an emergency.
The largest bone in the human body is the: | femur (thigh bone) | skull; spine; humerus | The **femur** (thigh bone) is the longest and strongest bone.
An adult human body has how many bones? | 206 | 106; 300; 186 | An adult has **206 bones**.
Breast milk is recommended as the only food for a baby for the first: | 6 months | 1 month; 3 months; 2 years | Exclusive **breastfeeding for the first 6 months** is recommended.
A Body Mass Index (BMI) of 18.5 to 24.9 is considered: | normal weight | underweight; overweight; obese | A BMI of **18.5 to 24.9** is in the **normal** range for adults.
Adults are generally advised to get about how many hours of sleep each night? | 7 to 9 hours | 3 to 4 hours; 10 to 12 hours; 5 hours or less | Most adults need **7 to 9 hours** of sleep.
The habit that most helps keep teeth healthy is: | brushing at least twice a day and flossing | eating candy after meals; brushing once a week; chewing ice | **Brush at least twice a day** and floss to prevent tooth decay.
`);

/* =============================== CULTURE AND THE ARTS =============================== */
const CUL = 'Culture and the Arts';
// festival | where it is held
const FESTIVALS = rows(`
Sinulog Festival | Cebu City
Ati-Atihan Festival | Kalibo, Aklan
Dinagyang Festival | Iloilo City
MassKara Festival | Bacolod City
Panagbenga Festival | Baguio City
Kadayawan Festival | Davao City
Pahiyas Festival | Lucban, Quezon
Moriones Festival | Marinduque
Higantes Festival | Angono, Rizal
Pintados Festival | Tacloban City
Kaamulan Festival | Bukidnon
T'nalak Festival | South Cotabato
Bangus Festival | Dagupan City
Peñafrancia Festival | Naga City
Giant Lantern Festival | City of San Fernando, Pampanga
Lanzones Festival | Camiguin
Sandugo Festival | Bohol
Kalilangan Festival | General Santos City
Ibalong Festival | Legazpi City
Hermosa Festival | Zamboanga City
Pamulinawen Festival | Laoag City
`);
for (const [f, where] of FESTIVALS) {
  add(CUL, `The ${f} is held in:`, where, wrong(FESTIVALS.map((x) => x[1]), where, 'fest' + f), `The **${f}** is celebrated in **${where}**.`);
  add(CUL, `Which festival is celebrated in ${where}?`, f, wrong(FESTIVALS.map((x) => x[0]), f, 'festn' + f), `**${where}** celebrates the **${f}**.`);
}
// festival | what it is about
const FEST_WHAT = rows(`
Panagbenga Festival | a flower festival with floats covered in flowers
Pahiyas Festival | houses decorated with colorful kiping (rice wafers) and crops for San Isidro Labrador
Moriones Festival | men in masks dressed as Roman soldiers during Holy Week
Sinulog Festival | a dance prayer in honor of the Santo Niño
Kadayawan Festival | a thanksgiving for the harvest of fruits and flowers
Giant Lantern Festival | huge, lighted parols (Christmas lanterns)
MassKara Festival | colorful smiling masks
Sandugo Festival | the blood compact of Datu Sikatuna and Legazpi
`);
for (const [f, w] of FEST_WHAT) {
  add(CUL, `Which festival is known for ${w}?`, f, wrong(FEST_WHAT.map((x) => x[0]), f, 'festw' + f), `The **${f}** is known for ${w}.`);
}
// folk dance | what it shows or where it comes from
const DANCES = rows(`
Tinikling | dancers stepping between clapping bamboo poles, copying the tikling bird
Singkil | a Maranao royal dance with fans, stepping over crossed bamboo poles
Maglalatik | men with coconut shells tied to their bodies, from Laguna
Pandanggo sa Ilaw | dancers balancing oil lamps, from Mindoro
Cariñosa | a flirtatious courtship dance with a fan and handkerchief
Itik-Itik | steps that copy the short, choppy walk of ducks
Sayaw sa Bangko | dancing on top of a narrow bench, from Pangasinan
Kuratsa | a lively courtship dance of the Visayas, often at weddings
Banga | women balancing clay pots on their heads, from the Cordilleras
Subli | a ritual dance in honor of the Holy Cross, from Batangas
`);
for (const [d, w] of DANCES) {
  add(CUL, `Which Philippine folk dance shows ${w}?`, d, wrong(DANCES.map((x) => x[0]), d, 'dance' + d), `The **${d}** shows ${w}.`);
}
// work | writer
const BOOKS = rows(`
Noli Me Tangere | Jose Rizal
Florante at Laura | Francisco Balagtas
Banaag at Sikat | Lope K. Santos
Mga Ibong Mandaragit | Amado V. Hernandez
Dekada '70 | Lualhati Bautista
Without Seeing the Dawn | Stevan Javellana
The Woman Who Had Two Navels | Nick Joaquin
Dead Stars | Paz Marquez-Benitez
Pag-ibig sa Tinubuang Lupa | Andres Bonifacio
Urbana at Feliza | Modesto de Castro
Nena at Neneng | Valeriano Hernandez Peña
America Is in the Heart | Carlos Bulosan
Po-on | F. Sionil José
Smaller and Smaller Circles | F. H. Batacan
Ilustrado | Miguel Syjuco
`);
for (const [b, w] of BOOKS) {
  if (b === 'Noli Me Tangere' || b === 'Florante at Laura') continue; // already asked in bank-general2 and bank-general3
  add(CUL, `Who wrote "${b}"?`, w, wrong([...new Set(BOOKS.map((x) => x[1]))], w, 'book' + b), `**"${b}"** was written by **${w}**.`);
}
// instrument | what it is
const INSTRUMENTS = rows(`
kulintang | a row of small gongs played in Mindanao
kudyapi | a two-stringed boat-shaped lute of Mindanao
bandurria | a 14-string instrument played in a rondalla
gangsa | a flat gong of the Cordillera peoples
tongatong | bamboo tubes stamped on the ground to make sound
kubing | a bamboo jaw harp
agung | a large, deep-sounding hanging gong
`);
for (const [ins, w] of INSTRUMENTS) {
  add(CUL, `Which Philippine instrument is ${w}?`, ins, wrong(INSTRUMENTS.map((x) => x[0]), ins, 'ins' + ins), `The **${ins}** is ${w}.`);
}
hand(CUL, `
The national dress for Filipino men, made of thin fabric like piña or jusi, is the: | barong Tagalog | baro't saya; malong; kimona | The **barong Tagalog** is the formal national wear for men.
The traditional dress for Filipino women with butterfly sleeves is the: | terno (Filipiniana) | barong Tagalog; malong; bahag | The **terno**, with its stiff "butterfly" sleeves, is a Filipiniana dress.
The tube-shaped cloth worn in many ways by the peoples of Mindanao is the: | malong | barong; bahag; kimona | The **malong** can be a skirt, blanket, hammock or bag.
The cloth woven by the T'boli from abaca fiber, seen in their dreams, is called: | t'nalak | inabel; piña cloth; yakan cloth | **T'nalak** is woven by T'boli women of South Cotabato from abaca.
The fabric made from pineapple leaf fibers, used for fine barong Tagalog, is: | piña | abaca; cotton; inabel | **Piña** cloth comes from pineapple leaves, especially in Aklan.
The Ilocano handwoven cloth known for strong cotton blankets is: | inabel | t'nalak; piña; malong | **Inabel** is the handwoven cloth of the Ilocos region.
The Philippine "Manila hemp," a strong fiber used for ropes, comes from the: | abaca plant | coconut tree; bamboo; pineapple | **Abaca** (Manila hemp) is a strong fiber from a banana-like plant.
The traditional Filipino string band that plays bandurria, octavina and guitar is the: | rondalla | kulintang ensemble; brass band; harana group | The **rondalla** is a string band of bandurria, octavina, guitar and bass.
The singing of a man under a woman's window at night to court her is the: | harana | balagtasan; kundiman; pamamanhikan | **Harana** is the old Filipino custom of serenading.
A debate in verse, named after Francisco Balagtas, is the: | balagtasan | harana; sarswela; duplo | The **balagtasan** is a poetic debate in Tagalog.
The Filipino love song, often sad and slow, is called the: | kundiman | kumintang; harana; dalit | The **kundiman** is the traditional Filipino love song.
A Filipino musical play with songs and dialogue, from the Spanish zarzuela, is the: | sarswela | senakulo; moro-moro; balagtasan | The **sarswela** is a musical play with spoken parts and songs.
The play about the passion and death of Jesus Christ, staged during Holy Week, is the: | senakulo | sarswela; moro-moro; panunuluyan | The **senakulo** is the Holy Week play of the life and death of Christ.
The Christmas custom of reenacting Joseph and Mary's search for an inn is the: | panunuluyan | pabasa; simbang gabi; salubong | The **panunuluyan** reenacts the search for a place for Jesus to be born.
The nine dawn Masses before Christmas are called: | Simbang Gabi (Misa de Gallo) | Pabasa; Salubong; Flores de Mayo | **Simbang Gabi** is the series of nine dawn Masses from December 16 to 24.
The chanting of the Passion of Christ during Holy Week is called: | pabasa | senakulo; salubong; visita iglesia | The **pabasa** is the singing of the Pasyon during Holy Week.
The May festival where girls offer flowers to the Virgin Mary is: | Flores de Mayo | Simbang Gabi; Pahiyas; Panagbenga | **Flores de Mayo** is a month-long flower offering in May; the **Santacruzan** parade ends it.
Asking for a woman's hand by visiting her family with one's own family is: | pamamanhikan | harana; paninilbihan; bayanihan | In **pamamanhikan**, the man's family formally visits the woman's family.
The Filipino value of helping one another, shown by carrying a whole house together, is: | bayanihan | utang na loob; hiya; amor propio | **Bayanihan** is community spirit, like neighbors carrying a nipa hut together.
The Filipino value of a "debt of gratitude" is: | utang na loob | bayanihan; pakikisama; bahala na | **Utang na loob** is a deep sense of gratitude to someone who helped you.
Getting along well with others in a group is the Filipino value of: | pakikisama | utang na loob; hiya; palabra de honor | **Pakikisama** is getting along with the group.
The gesture of respect where a younger person presses an elder's hand to the forehead is: | pagmamano | pagsamba; pakikiramay; pagpupugay | **Pagmamano** is how Filipinos greet and respect elders.
The award given by the state to the country's greatest artists is the: | Order of National Artists | Ramon Magsaysay Award; Palanca Award; Gawad CCP only | The **Order of National Artists** is the highest state honor for artists.
The award known as "Asia's Nobel Prize," named after a Philippine president, is the: | Ramon Magsaysay Award | Quezon Award; Aguinaldo Prize; Gawad Rizal | The **Ramon Magsaysay Award** is called "Asia's Nobel Prize."
The oldest and most prestigious literary award in the Philippines is the: | Palanca Award | Ramon Magsaysay Award; Gawad Urian; FAMAS Award | The **Don Carlos Palanca Memorial Awards for Literature** started in 1950.
The National Artist for Music known for "Sa Ugoy ng Duyan" is: | Lucio San Pedro | Ryan Cayabyab; Ernani Cuenco; Levi Celerio | **Lucio San Pedro** composed the music of "Sa Ugoy ng Duyan."
The National Artist for Music and Literature known as the lyricist who played a leaf as music is: | Levi Celerio | Lucio San Pedro; Antonio Molina; Felipe de Leon | **Levi Celerio** wrote thousands of song lyrics and was known for playing music on a leaf.
The National Artist for Film known for "Insiang" and "Maynila sa mga Kuko ng Liwanag" is: | Lino Brocka | Ishmael Bernal; Gerardo de Leon; Eddie Romero | **Lino Brocka** directed "Insiang" and "Maynila sa mga Kuko ng Liwanag."
The National Artist for Visual Arts known for the sculpture "Oblation" at the University of the Philippines is: | Guillermo Tolentino | Napoleon Abueva; Fernando Amorsolo; Botong Francisco | **Guillermo Tolentino** made the "Oblation" and the Bonifacio Monument.
The "Father of Modern Philippine Sculpture," a National Artist, is: | Napoleon Abueva | Guillermo Tolentino; Vicente Manansala; Ang Kiukok | **Napoleon Abueva** is called the "Father of Modern Philippine Sculpture."
The muralist from Angono, Rizal, who became a National Artist for Visual Arts is: | Carlos "Botong" Francisco | Fernando Amorsolo; Vicente Manansala; Benedicto Cabrera | **Botong Francisco** of Angono painted large murals of Philippine history.
The National Artist known for the "transparent cubism" style, as in "Jeepneys," is: | Vicente Manansala | Fernando Amorsolo; Botong Francisco; Victorio Edades | **Vicente Manansala** developed "transparent cubism."
The "Father of Modern Philippine Painting" is: | Victorio Edades | Fernando Amorsolo; Juan Luna; Damian Domingo | **Victorio Edades** led the move to modern art in the Philippines.
The National Artist for Dance who researched and wrote down Philippine folk dances is: | Francisca Reyes-Aquino | Lucrecia Kasilag; Leonor Orosa-Goquingco; Alice Reyes | **Francisca Reyes-Aquino** studied and recorded many folk dances.
The Filipino singer who won a Tony Award for "Miss Saigon" is: | Lea Salonga | Regine Velasquez; Charice Pempengco; Sarah Geronimo | **Lea Salonga** won a Tony Award in 1991 for "Miss Saigon."
The Filipino-made jeepney was first made from: | leftover US military jeeps after World War II | old Spanish carriages; Japanese tanks; imported buses | The **jeepney** came from **US military jeeps** left after World War II.
The horse-drawn carriage still seen in Vigan and Intramuros is the: | kalesa | jeepney; tricycle; padyak | The **kalesa** is a two-wheeled horse-drawn carriage.
The colorful boat with bright sails used by the Sama-Bajau of Mindanao is the: | vinta | balangay; banca of Luzon; galleon | The **vinta** has colorful sails and is seen in Zamboanga and Sulu.
The Filipino martial art and national sport using sticks is: | arnis | sipa; sepak takraw; kendo | **Arnis** (also called eskrima or kali) is the national martial art and sport.
The traditional Filipino game played by kicking a rattan ball or a weighted ball to keep it in the air is: | sipa | patintero; tumbang preso; luksong baka | **Sipa** is kicking a ball to keep it in the air.
The Filipino street game where players try to cross lines while guards block them is: | patintero | sipa; sungka; piko | In **patintero**, guards try to tag players who cross the lines.
The board game with a wooden board of holes and shells or stones is: | sungka | dama; sipa; jolens | **Sungka** is played with shells moved around holes on a wooden board.
The Filipino dish of meat stewed in vinegar, soy sauce and garlic is: | adobo | sinigang; kare-kare; tinola | **Adobo** is meat cooked in vinegar, soy sauce, garlic and pepper.
The sour Filipino soup often flavored with tamarind is: | sinigang | tinola; bulalo; nilaga | **Sinigang** is a sour soup, often with sampalok (tamarind).
The stew of oxtail and vegetables in a thick peanut sauce is: | kare-kare | kaldereta; menudo; mechado | **Kare-kare** is cooked in a peanut sauce and served with bagoong.
The dish of pork in coconut milk with chili, named after a region, is: | Bicol Express | Pinakbet; Chicken Inasal; Bagnet | **Bicol Express** is a spicy pork dish in coconut milk.
The grilled chicken marinated in calamansi and annatto, famous in Bacolod, is: | chicken inasal | chicken adobo; tinola; lechon manok of Cebu | **Chicken inasal** is a Bacolod and Western Visayas specialty.
The vegetable dish with bagoong, from the Ilocos region, is: | pinakbet | laing; ginataang gulay; chop suey | **Pinakbet** is an Ilocano vegetable dish flavored with bagoong.
The crispy deep-fried pork belly from Ilocos is: | bagnet | lechon kawali of Cebu; chicharon bulaklak; sisig | **Bagnet** is the Ilocano crispy pork belly.
The dish of chopped pig's face and ears, made famous in Pampanga, is: | sisig | dinuguan; bopis; igado | **Sisig** comes from Pampanga, the "Culinary Capital of the Philippines."
The province called the "Culinary Capital of the Philippines" is: | Pampanga | Iloilo; Cebu; Batangas | **Pampanga** is famous for Kapampangan cooking.
The dish of taro leaves cooked in coconut milk, from Bicol, is: | laing | pinakbet; dinengdeng; ginataang langka | **Laing** is taro leaves in coconut milk.
The rice cake cooked in a clay pot with banana leaves, eaten at Christmas, is: | bibingka | puto bumbong; kutsinta; sapin-sapin | **Bibingka** is a rice cake baked with banana leaves, popular at Simbang Gabi.
The purple sticky rice cooked in bamboo tubes and eaten at Christmas is: | puto bumbong | bibingka; suman; palitaw | **Puto bumbong** is purple sticky rice steamed in bamboo.
`);

/* =============================== ENVIRONMENT (nature, not laws) =============================== */
const ENV = 'Environment';
// animal | where it lives in the Philippines (each found mainly in that place)
const ANIMALS = rows(`
tamaraw | Mindoro
Philippine tarsier | Bohol
Philippine mouse-deer (pilandok) | Balabac, Palawan
Calamian deer | the Calamian Islands, Palawan
Visayan spotted deer | Panay and Negros
Philippine cockatoo (katala) | Palawan
whale shark (butanding) | Donsol, Sorsogon
sinarapan | Lake Buhi, Camarines Sur
tawilis | Taal Lake
`);
for (const [a, where] of ANIMALS) {
  if (a === 'tamaraw' || a === 'Philippine tarsier' || a === 'sinarapan' || a === 'tawilis') continue; // already asked in bank-general2 and bank-general3
  add(ENV, `The ${a} is best known to live in or visit:`, where, wrong(ANIMALS.map((x) => x[1]), where, 'ani' + a), `The **${a}** is found mainly in **${where}**.`);
}
// typhoon wind signal | winds expected
const SIGNALS = rows(`
Tropical Cyclone Wind Signal No. 1 | strong winds of 39 to 61 km/h within 36 hours
Tropical Cyclone Wind Signal No. 2 | gale-force winds of 62 to 88 km/h within 24 hours
Tropical Cyclone Wind Signal No. 3 | storm-force winds of 89 to 117 km/h within 18 hours
Tropical Cyclone Wind Signal No. 4 | typhoon-force winds of 118 to 184 km/h within 12 hours
Tropical Cyclone Wind Signal No. 5 | winds of 185 km/h or more within 12 hours
`);
for (const [s, w] of SIGNALS) {
  add(ENV, `PAGASA's ${s} means:`, w, wrong(SIGNALS.map((x) => x[1]), w, 'sig' + s), `**${s}**: ${w}.`);
}
// rainfall warning color | meaning
const RAIN = rows(`
yellow | heavy rain, flooding possible in low-lying areas
orange | intense rain, flooding is threatening
red | torrential rain, serious flooding expected, evacuate
`);
for (const [c, m] of RAIN) {
  add(ENV, `A PAGASA ${c} rainfall warning means:`, m, wrong([...RAIN.map((x) => x[1]), 'light rain only, no action needed'], m, 'rain' + c), `A **${c}** rainfall warning means ${m}.`);
}
hand(ENV, `
The "Philippine Eagle" was declared the national bird in 1995, replacing the: | maya | kalaw; kingfisher; Philippine cockatoo | In 1995 the **Philippine eagle** replaced the **maya** as the national bird.
The national tree of the Philippines is the: | narra | molave; acacia; mango | The **narra** is the national tree.
The national flower of the Philippines is the: | sampaguita | waling-waling; gumamela; rose | The **sampaguita** (Arabian jasmine) is the national flower.
The orchid known as the "Queen of Philippine Orchids" is the: | waling-waling | sampaguita; ilang-ilang; dama de noche | The **waling-waling** of Mindanao is the "Queen of Philippine Orchids."
The national gem of the Philippines is the: | South Sea pearl | diamond; jade; ruby | The **South Sea pearl** was declared the national gem in 1996.
A plant or animal that is in danger of disappearing forever is: | endangered | endemic; invasive; domesticated | An **endangered** species is at risk of extinction.
A species that has completely died out is: | extinct | endangered; endemic; threatened | An **extinct** species has no living members left.
A species brought from another place that spreads and harms local wildlife is called: | invasive | endemic; native; endangered | **Invasive species** (like the golden kuhol snail in rice fields) harm local plants and animals.
The golden apple snail (golden kuhol) is a pest mainly of: | rice fields | coconut farms; coral reefs; pine forests | The **golden kuhol** eats young rice plants.
A community of living things and their surroundings, like a forest or a reef, is an: | ecosystem | atmosphere; habitat only of birds; population | An **ecosystem** is living things and the nonliving environment working together.
The variety of all living things in a place is called: | biodiversity | biomass; population; ecology | **Biodiversity** is the variety of life. The Philippines is one of the 17 "megadiverse" countries.
Coral reefs are often called the: | "rainforests of the sea" | "deserts of the sea"; "lungs of the city"; "mountains of the sea" | **Coral reefs** are called the **"rainforests of the sea"** because so many species live there.
The whitening of corals because of hot water is called: | coral bleaching | red tide; eutrophication; acid rain | **Coral bleaching** happens when warm water makes corals lose the algae that feed them.
Fishing with dynamite or cyanide is harmful because it: | destroys coral reefs and kills young fish | makes fish grow bigger; cleans the water; feeds the corals | **Dynamite and cyanide fishing** destroy reefs and kill fish of all sizes.
Rain that is more acidic than normal because of air pollution is: | acid rain | red tide; storm surge; smog | **Acid rain** forms when sulfur and nitrogen gases mix with rain water.
A mix of smoke and fog that makes city air dirty is: | smog | haze from volcanoes only; mist; dew | **Smog** = smoke + fog.
The warming of the Earth because gases trap heat in the atmosphere is the: | greenhouse effect | ozone hole; El Niño; La Niña | The **greenhouse effect** traps heat; too much of it causes global warming.
Which gas from rice fields, landfills and livestock is a strong greenhouse gas? | methane | oxygen; nitrogen; helium | **Methane** traps much more heat than carbon dioxide.
Planting trees in an area that used to be forest is called: | reforestation | deforestation; urbanization; kaingin | **Reforestation** brings back forest cover.
The slash-and-burn way of clearing forests for farming is called: | kaingin | reforestation; terracing; crop rotation | **Kaingin** burns forests to clear land for farming.
Planting crops in steps cut into hillsides, as in Banaue, helps prevent: | soil erosion | acid rain; red tide; smog | **Terracing** slows water down and prevents **soil erosion**.
Changing the kind of crop planted in a field each season is called: | crop rotation | kaingin; monocropping; deforestation | **Crop rotation** keeps the soil healthy.
Which of these is a non-renewable source of energy? | coal | solar; wind; geothermal | **Coal**, oil and natural gas are fossil fuels that cannot be replaced quickly.
Energy from the heat inside the Earth is called: | geothermal energy | solar energy; tidal energy; nuclear energy | **Geothermal energy** uses heat from inside the Earth. The Philippines is one of the top users in the world.
The Philippines is one of the world's leading producers of which kind of renewable energy? | geothermal | nuclear; tidal; coal | The Philippines is among the **top geothermal power producers** in the world.
Energy from moving water, like in dams, is: | hydroelectric power | geothermal energy; wind energy; solar energy | **Hydroelectric power** uses flowing water to turn turbines.
Which of these is an example of reusing? | using an empty jar as a pencil holder | throwing glass in the trash; buying a new jar each week; burning old jars | **Reuse** = use something again for another purpose.
Which of these is non-biodegradable waste? | plastic bottles | banana peels; dried leaves; fish bones | **Plastic** does not rot easily, so it is **non-biodegradable**.
Compost is made from: | food scraps and leaves that rot | plastic and glass; batteries; metal cans | **Compost** is made from biodegradable waste like food scraps and leaves.
Used batteries, paint and pesticides should be thrown away as: | hazardous (special) waste | biodegradable waste; recyclable paper; compost | **Hazardous waste** needs special handling so it does not poison soil and water.
The day when people around the world turn off non-essential lights for one hour is: | Earth Hour | Earth Day; Arbor Day; World Water Day | **Earth Hour** happens every year, usually on the last Saturday of March.
World Water Day is celebrated every: | March 22 | April 22; June 5; October 4 | **World Water Day** is on March 22.
World Oceans Day is celebrated every: | June 8 | June 5; March 22; September 16 | **World Oceans Day** is on June 8.
The Philippine Arbor Day, when people plant trees, is every: | June 25 | April 22; June 5; August 31 | Philippine **Arbor Day** is on **June 25**.
The forest layer of tall trees whose tops form a "roof" over the forest is the: | canopy | forest floor; understory; root zone | The **canopy** is the upper layer of treetops.
Plants that grow on other plants for support but make their own food, like many orchids, are: | epiphytes | parasites; decomposers; fungi | **Epiphytes** grow on trees but are not parasites.
The relationship where both living things benefit, like bees and flowers, is called: | mutualism | parasitism; competition; predation | In **mutualism**, both partners gain.
The relationship where one living thing benefits and harms the other, like a tick on a dog, is: | parasitism | mutualism; commensalism; cooperation | In **parasitism**, one benefits and the host is harmed.
A food chain always starts with a: | producer (a green plant) | carnivore; decomposer; top predator | Food chains start with **producers**, which make food from sunlight.
`);

/* =============================== WORLD GEOGRAPHY =============================== */
const WGEO = 'World Geography';
// country | capital
const CAPITALS = rows(`
Japan | Tokyo
South Korea | Seoul
China | Beijing
India | New Delhi
Indonesia | Jakarta
Malaysia | Kuala Lumpur
Thailand | Bangkok
Vietnam | Hanoi
Cambodia | Phnom Penh
Laos | Vientiane
Myanmar | Naypyidaw
Singapore | Singapore
Brunei | Bandar Seri Begawan
Timor-Leste | Dili
Australia | Canberra
New Zealand | Wellington
Canada | Ottawa
United States | Washington, D.C.
Mexico | Mexico City
Brazil | Brasília
Argentina | Buenos Aires
Peru | Lima
Chile | Santiago
United Kingdom | London
France | Paris
Germany | Berlin
Italy | Rome
Spain | Madrid
Portugal | Lisbon
Netherlands | Amsterdam
Belgium | Brussels
Switzerland | Bern
Sweden | Stockholm
Norway | Oslo
Russia | Moscow
Turkey | Ankara
Egypt | Cairo
Saudi Arabia | Riyadh
United Arab Emirates | Abu Dhabi
Qatar | Doha
Kuwait | Kuwait City
Pakistan | Islamabad
Bangladesh | Dhaka
Nepal | Kathmandu
Sri Lanka | Sri Jayawardenepura Kotte
Mongolia | Ulaanbaatar
Nigeria | Abuja
Kenya | Nairobi
Greece | Athens
Ireland | Dublin
Poland | Warsaw
`);
const capList = CAPITALS.map((x) => x[1]), cList = CAPITALS.map((x) => x[0]);
const BIG_CITY = { Australia: 'Sydney', Canada: 'Toronto', Turkey: 'Istanbul', Brazil: 'Rio de Janeiro', Myanmar: 'Yangon', Vietnam: 'Ho Chi Minh City', 'United Arab Emirates': 'Dubai', Pakistan: 'Karachi', Switzerland: 'Zurich', 'United States': 'New York City', Nigeria: 'Lagos', India: 'Mumbai', 'New Zealand': 'Auckland', 'Sri Lanka': 'Colombo', 'Saudi Arabia': 'Jeddah' };
for (const [c, cap] of CAPITALS) {
  // A famous big city that is NOT the capital goes first among the wrong choices (a common mistake).
  const trap = BIG_CITY[c] ? [BIG_CITY[c]] : [];
  add(WGEO, `What is the capital of ${c}?`, cap, wrong(capList, cap, 'wcap' + c, trap),
    `The capital of **${c}** is **${cap}**.${trap.length ? ` (!!${trap[0]}!! is a big, famous city there, but it is not the capital.)` : ''}`);
  if (c !== cap && !['Singapore', 'Kuwait City', 'Mexico City'].includes(cap)) {
    add(WGEO, `${cap} is the capital of:`, c, wrong(cList, c, 'wctry' + c), `**${cap}** is the capital of **${c}**.`);
  }
}
// country | currency
const MONEY = rows(`
Japan | yen
South Korea | won
China | yuan (renminbi)
India | rupee
Indonesia | rupiah
Thailand | baht
Vietnam | dong
Malaysia | ringgit
Cambodia | riel
Laos | kip
Myanmar | kyat
United Kingdom | pound sterling
Saudi Arabia | riyal
United Arab Emirates | dirham
Russia | ruble
Mexico | peso (Mexican peso)
Brazil | real
South Africa | rand
`);
for (const [c, m] of MONEY) {
  add(WGEO, `What is the currency of ${c}?`, m, wrong(MONEY.map((x) => x[1]), m, 'money' + c), `**${c}** uses the **${m}**.`);
}
hand(WGEO, `
The largest ocean in the world is the: | Pacific Ocean | Atlantic Ocean; Indian Ocean; Arctic Ocean | The **Pacific Ocean** is the largest and deepest ocean.
The smallest ocean in the world is the: | Arctic Ocean | Indian Ocean; Southern Ocean; Atlantic Ocean | The **Arctic Ocean** is the smallest.
The largest continent by land area is: | Asia | Africa; North America; Europe | **Asia** is the largest continent.
The smallest continent is: | Australia (Oceania) | Europe; Antarctica; South America | **Australia** is the smallest continent.
The continent covered almost entirely by ice is: | Antarctica | Greenland; Arctic; Siberia | **Antarctica** is covered by a huge ice sheet.
The highest mountain in the world above sea level is: | Mount Everest | K2; Mount Kilimanjaro; Mount Fuji | **Mount Everest** (about 8,849 m) on the Nepal–China border is the highest.
The longest river in Africa, flowing north to the Mediterranean Sea, is the: | Nile River | Congo River; Niger River; Zambezi River | The **Nile** is the longest river in Africa.
The river in South America that carries the most water in the world is the: | Amazon River | Mississippi River; Nile River; Yangtze River | The **Amazon** carries more water than any other river.
The largest hot desert in the world is the: | Sahara Desert | Gobi Desert; Kalahari Desert; Arabian Desert | The **Sahara** in North Africa is the largest hot desert.
The largest country in the world by land area is: | Russia | Canada; China; United States | **Russia** is the largest country by area.
The country with the most people in the world (since 2023) is: | India | China; United States; Indonesia | **India** passed China in 2023 as the country with the most people.
The smallest country in the world, inside Rome, is: | Vatican City | Monaco; San Marino; Liechtenstein | **Vatican City** is the smallest country; the Pope lives there.
The deepest point in the world's oceans is the Challenger Deep in the: | Mariana Trench | Philippine Trench; Java Trench; Puerto Rico Trench | The **Challenger Deep** of the **Mariana Trench** is the deepest point.
The line at 0° longitude that passes through Greenwich, London is the: | prime meridian | equator; International Date Line; Tropic of Capricorn | The **prime meridian** is 0° longitude.
The imaginary line around 180° longitude where the date changes is the: | International Date Line | prime meridian; equator; Tropic of Cancer | Crossing the **International Date Line** changes the calendar date.
The canal that connects the Atlantic and Pacific Oceans is the: | Panama Canal | Suez Canal; Kiel Canal; Grand Canal | The **Panama Canal** links the Atlantic and Pacific.
The canal that connects the Mediterranean Sea and the Red Sea is the: | Suez Canal | Panama Canal; Corinth Canal; Erie Canal | The **Suez Canal** in Egypt links the Mediterranean and the Red Sea.
The country known as the "Land of the Rising Sun" is: | Japan | China; South Korea; Thailand | **Japan** is the "Land of the Rising Sun."
The country shaped like a boot is: | Italy | Spain; Greece; Portugal | **Italy** looks like a boot on the map.
The Great Wall is found in: | China | Japan; Mongolia; India | The **Great Wall** is in **China**.
The Taj Mahal is found in: | India | Pakistan; Iran; Bangladesh | The **Taj Mahal** is in Agra, **India**.
Angkor Wat, the largest religious monument in the world, is in: | Cambodia | Thailand; Myanmar; Laos | **Angkor Wat** is in **Cambodia**.
Borobudur, a huge Buddhist temple, is in: | Indonesia | Malaysia; Thailand; Cambodia | **Borobudur** is on the island of Java, **Indonesia**.
The Eiffel Tower is found in: | Paris | London; Rome; Madrid | The **Eiffel Tower** is in **Paris**, France.
The Statue of Liberty is found in: | New York | Washington, D.C.; Los Angeles; Chicago | The **Statue of Liberty** stands in **New York** Harbor.
The Malaysian state on Borneo closest to the southern Philippines is: | Sabah | Sarawak; Johor; Penang | **Sabah** is just across the sea from Tawi-Tawi and Palawan.
The country directly north of the Philippines across the Luzon Strait is: | Taiwan | Japan; South Korea; Vietnam | **Taiwan** lies north of Batanes.
The large island shared by Malaysia, Indonesia and Brunei is: | Borneo | Sumatra; Java; Sulawesi | **Borneo** is shared by three countries.
The tallest building in the world (as of 2025), in Dubai, is the: | Burj Khalifa | Petronas Towers; Shanghai Tower; Taipei 101 | The **Burj Khalifa** in Dubai is about 828 m tall.
The twin skyscrapers that are a famous landmark of Kuala Lumpur are the: | Petronas Towers | Marina Bay Sands; Taipei 101; Burj Khalifa | The **Petronas Twin Towers** are in Kuala Lumpur.
`);

/* =============================== WORLD AFFAIRS =============================== */
const WAFF = 'World Affairs';
// organization | where its headquarters is
const HQ = rows(`
United Nations (UN) | New York City, USA
ASEAN Secretariat | Jakarta, Indonesia
World Health Organization (WHO) | Geneva, Switzerland
UNESCO | Paris, France
International Labour Organization (ILO) | Geneva, Switzerland
Food and Agriculture Organization (FAO) | Rome, Italy
International Court of Justice | The Hague, Netherlands
Asian Development Bank (ADB) | Mandaluyong City, Philippines
International Rice Research Institute (IRRI) | Los Baños, Laguna, Philippines
European Union institutions | Brussels, Belgium
UNICEF | New York City, USA
World Bank | Washington, D.C., USA
`);
for (const [o, where] of HQ) {
  add(WAFF, `The headquarters of the ${o} is in:`, where, wrong([...new Set(HQ.map((x) => x[1]))], where, 'hq' + o), `The **${o}** has its headquarters in **${where}**.`);
}
// acronym | full name
const ORGS = rows(`
UN | United Nations
ASEAN | Association of Southeast Asian Nations
WHO | World Health Organization
UNESCO | United Nations Educational, Scientific and Cultural Organization
UNICEF | United Nations Children's Fund
ILO | International Labour Organization
FAO | Food and Agriculture Organization
APEC | Asia-Pacific Economic Cooperation
WTO | World Trade Organization
IMF | International Monetary Fund
ADB | Asian Development Bank
NATO | North Atlantic Treaty Organization
OPEC | Organization of the Petroleum Exporting Countries
UNHCR | United Nations High Commissioner for Refugees
`);
for (const [s, f] of ORGS) {
  add(WAFF, `What does ${s} stand for?`, f, wrong(ORGS.map((x) => x[1]), f, 'org' + s), `**${s}** stands for **${f}**.`);
}
hand(WAFF, `
The United Nations was founded in the year: | 1945 | 1919; 1939; 1950 | The **United Nations** was founded in **1945**, after World War II. The Philippines was one of its founding members.
United Nations Day is celebrated every: | October 24 | September 21; December 10; June 5 | **UN Day** is October 24, when the UN Charter took effect in 1945.
ASEAN was founded on August 8, 1967 through the: | Bangkok Declaration | Manila Declaration; Jakarta Accord; Kuala Lumpur Treaty | ASEAN was set up by the **Bangkok Declaration** of August 8, 1967.
The five founding members of ASEAN are: | Indonesia, Malaysia, the Philippines, Singapore and Thailand | Brunei, Vietnam, Laos, Myanmar and Cambodia; Japan, China, Korea, Thailand and Vietnam; Philippines, Vietnam, Laos, Cambodia and Brunei | ASEAN's founders: **Indonesia, Malaysia, the Philippines, Singapore and Thailand**.
The newest member of ASEAN, admitted in October 2025, is: | Timor-Leste | Papua New Guinea; Brunei; Sri Lanka | **Timor-Leste** became ASEAN's 11th member in October 2025.
The Filipino who represented the Philippines in signing the ASEAN Declaration in 1967 was: | Narciso Ramos | Carlos P. Romulo; Ferdinand Marcos; Salvador Laurel | Foreign Affairs Secretary **Narciso Ramos** signed for the Philippines.
The main body of the UN where every member country has one vote is the: | General Assembly | Security Council; Secretariat; International Court of Justice | In the **General Assembly**, each member country has one vote.
The UN body with five permanent members that have veto power is the: | Security Council | General Assembly; Economic and Social Council; Trusteeship Council | The **Security Council** has 5 permanent members: China, France, Russia, the UK and the US.
The head of the United Nations Secretariat is the: | Secretary-General | President of the UN; Chairman of the Board; High Commissioner | The UN Secretariat is led by the **Secretary-General**.
The 17 global goals adopted by the UN in 2015 to end poverty and protect the planet are the: | Sustainable Development Goals (SDGs) | Millennium Development Goals; Kyoto Goals; Paris Goals | The **Sustainable Development Goals** (SDGs) are 17 goals for the year 2030.
The Olympic Games are held every: | 4 years | 2 years; 3 years; 5 years | The Summer and Winter **Olympics** each happen every **4 years**.
The five Olympic rings stand for the: | five inhabited continents joined together | five founding countries; five sports of the first Olympics; five oceans | The rings show the **union of the five inhabited continents**.
The Philippines first joined the Olympic Games in: | 1924 | 1896; 1948; 1964 | The Philippines first competed in the **1924** Paris Olympics.
The international organization of Red Cross and Red Crescent societies started in: | Switzerland | the United States; France; the United Kingdom | The **Red Cross** movement began in **Switzerland** (Geneva) in 1863.
The world's largest economic and political union of European countries is the: | European Union | NATO; Commonwealth of Nations; OPEC | The **European Union** has a shared market and many members use the euro.
The currency used by many European Union countries is the: | euro | pound; franc; dollar | Many EU countries use the **euro**.
APEC, which the Philippines hosted in 1996 and 2015, is a forum for: | economic cooperation of Asia-Pacific economies | military defense in Europe; oil-producing countries; sports events | **APEC** promotes trade and economic cooperation in the Asia-Pacific region.
The Philippines hosted the ASEAN Summit as chair in 2017, during ASEAN's: | 50th anniversary | 25th anniversary; 10th anniversary; 75th anniversary | In 2017, ASEAN marked its **50th anniversary**, with the Philippines as chair.
The international agreement that sets the rules for the use of the oceans, which supports the Philippines' claim in the West Philippine Sea, is the: | UN Convention on the Law of the Sea (UNCLOS) | Paris Agreement; Kyoto Protocol; Geneva Convention | **UNCLOS** sets out each country's sea zones, like the 200-nautical-mile exclusive economic zone.
Under UNCLOS, a coastal country's exclusive economic zone (EEZ) extends up to: | 200 nautical miles | 12 nautical miles; 24 nautical miles; 350 nautical miles | The **EEZ** reaches up to **200 nautical miles** from the coast.
The World Health Organization declared COVID-19 a pandemic in: | March 2020 | December 2019; January 2021; June 2020 | WHO declared **COVID-19** a pandemic on **March 11, 2020**.
A disease outbreak that spreads across many countries and continents is called a: | pandemic | epidemic; endemic disease; outbreak in one town | A **pandemic** spreads across many countries; an **epidemic** is a big outbreak in one area.
`);

module.exports = out;
