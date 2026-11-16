// General Information beyond the laws (1.46.0).
// Before this, most General Information questions were about the Constitution and other laws. The CSE also
// asks about Philippine geography, history, government offices, science, health, culture, the environment and
// the world, so this file adds those, built from fact lists written and checked by hand.
// - Lists (provinces, festivals, heroes, elements...) give one or two questions per row. The wrong choices
//   come from other rows of the same list, picked with a fixed seed, so they are always wrong and never change.
// - Facts that only change rarely are left out on purpose (who heads an office now, population counts, rankings).
const { rows, pickSome } = require('./bank-tools');

const G = 'general';
const out = [];
const same = (x) => String(x).trim().toLowerCase();

function add(t, q, a, ds, fact) {
  out.push({ s: G, t, q, a, d: ds, e: `${fact}\nSo the answer is ==${a}==.` });
}
// Three wrong choices from pool (not the answer), the "near" ones first (e.g. the same region), seeded.
function wrong(pool, a, seed, near = []) {
  const ok = (x) => same(x) !== same(a);
  const first = pickSome([...new Set(near)], 3, seed + ':n', ok);
  const rest = pickSome([...new Set(pool)], 3, seed, (x) => ok(x) && !first.some((f) => same(f) === same(x)));
  return [...first, ...rest].slice(0, 3);
}

/* =============================== PHILIPPINE GEOGRAPHY =============================== */
const GEO = 'Philippine Geography';
const REGION = {
  I: 'Region I (Ilocos Region)', CAR: 'Cordillera Administrative Region (CAR)', II: 'Region II (Cagayan Valley)', III: 'Region III (Central Luzon)',
  IVA: 'Region IV-A (CALABARZON)', MIM: 'MIMAROPA Region', V: 'Region V (Bicol Region)', VI: 'Region VI (Western Visayas)',
  VII: 'Region VII (Central Visayas)', VIII: 'Region VIII (Eastern Visayas)', IX: 'Region IX (Zamboanga Peninsula)', X: 'Region X (Northern Mindanao)',
  XI: 'Region XI (Davao Region)', XII: 'Region XII (SOCCSKSARGEN)', XIII: 'Region XIII (Caraga)', BARMM: 'Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)',
};
// province | capital | region ("-" = no region question: the region changed lately or is in dispute)
// Provinces whose capital moved or is in dispute (e.g. Cavite, Apayao, Agusan del Norte, Basilan) are left out.
const PROVINCES = rows(`
Ilocos Norte | Laoag City | I
Ilocos Sur | Vigan City | I
La Union | San Fernando City | I
Pangasinan | Lingayen | I
Abra | Bangued | CAR
Benguet | La Trinidad | CAR
Ifugao | Lagawe | CAR
Kalinga | Tabuk City | CAR
Mountain Province | Bontoc | CAR
Batanes | Basco | II
Cagayan | Tuguegarao City | II
Isabela | Ilagan City | II
Nueva Vizcaya | Bayombong | II
Quirino | Cabarroguis | II
Aurora | Baler | III
Bataan | Balanga City | III
Bulacan | Malolos City | III
Nueva Ecija | Palayan City | III
Pampanga | City of San Fernando | III
Tarlac | Tarlac City | III
Zambales | Iba | III
Batangas | Batangas City | IVA
Laguna | Santa Cruz | IVA
Quezon | Lucena City | IVA
Rizal | Antipolo City | IVA
Marinduque | Boac | MIM
Occidental Mindoro | Mamburao | MIM
Oriental Mindoro | Calapan City | MIM
Palawan | Puerto Princesa City | MIM
Romblon | Romblon | MIM
Albay | Legazpi City | V
Camarines Norte | Daet | V
Camarines Sur | Pili | V
Catanduanes | Virac | V
Masbate | Masbate City | V
Sorsogon | Sorsogon City | V
Aklan | Kalibo | VI
Antique | San Jose de Buenavista | VI
Capiz | Roxas City | VI
Guimaras | Jordan | VI
Iloilo | Iloilo City | VI
Negros Occidental | Bacolod City | -
Bohol | Tagbilaran City | VII
Cebu | Cebu City | VII
Negros Oriental | Dumaguete City | -
Siquijor | Siquijor | -
Sulu | Jolo | -
Biliran | Naval | VIII
Eastern Samar | Borongan City | VIII
Leyte | Tacloban City | VIII
Northern Samar | Catarman | VIII
Samar | Catbalogan City | VIII
Southern Leyte | Maasin City | VIII
Zamboanga del Norte | Dipolog City | IX
Zamboanga del Sur | Pagadian City | IX
Zamboanga Sibugay | Ipil | IX
Bukidnon | Malaybalay City | X
Camiguin | Mambajao | X
Lanao del Norte | Tubod | X
Misamis Occidental | Oroquieta City | X
Misamis Oriental | Cagayan de Oro City | X
Davao de Oro | Nabunturan | XI
Davao del Norte | Tagum City | XI
Davao del Sur | Digos City | XI
Davao Occidental | Malita | XI
Davao Oriental | Mati City | XI
Cotabato | Kidapawan City | XII
Sarangani | Alabel | XII
South Cotabato | Koronadal City | XII
Sultan Kudarat | Isulan | XII
Agusan del Sur | Prosperidad | XIII
Dinagat Islands | San Jose | XIII
Surigao del Norte | Surigao City | XIII
Surigao del Sur | Tandag City | XIII
Lanao del Sur | Marawi City | BARMM
Maguindanao del Norte | Datu Odin Sinsuat | BARMM
Maguindanao del Sur | Buluan | BARMM
Tawi-Tawi | Bongao | BARMM
`).map(([p, c, r]) => ({ p, c, r }));
const caps = PROVINCES.map((x) => x.c), provs = PROVINCES.map((x) => x.p);
for (const x of PROVINCES) {
  const mates = PROVINCES.filter((y) => y.r === x.r && y.r !== '-' && y.p !== x.p);
  add(GEO, `What is the capital of the province of ${x.p}?`, x.c, wrong(caps, x.c, 'cap' + x.p, mates.map((y) => y.c)),
    `The capital (seat of the provincial government) of **${x.p}** is **${x.c}**.`);
  // (Not asked the other way when the capital has the same name as the province, e.g. Romblon, Romblon.)
  if (!same(x.c).startsWith(same(x.p))) {
    add(GEO, `${x.c} is the capital of which province?`, x.p, wrong(provs, x.p, 'prov' + x.p, mates.map((y) => y.p)),
      `**${x.c}** is the capital of the province of **${x.p}**.`);
  }
  if (x.r !== '-') {
    add(GEO, `The province of ${x.p} belongs to which region?`, REGION[x.r], wrong(Object.values(REGION), REGION[x.r], 'reg' + x.p),
      `**${x.p}** is one of the provinces of **${REGION[x.r]}**.`);
  }
}
// The provinces of each region, asked the other way: "Which province is in Region X?"
for (const [code, name] of Object.entries(REGION)) {
  const mine = PROVINCES.filter((x) => x.r === code);
  const others = PROVINCES.filter((x) => x.r !== code && x.r !== '-').map((x) => x.p);
  for (const x of pickSome(mine, 1, 'inreg' + code)) {
    add(GEO, `Which of these provinces is part of ${name}?`, x.p, wrong(others, x.p, 'inreg2' + x.p),
      `**${x.p}** is in **${name}**. The other choices belong to other regions.`);
  }
}
// region | its other name | regional center
const REGIONS = rows(`
Region I | Ilocos Region | San Fernando City, La Union
Region II | Cagayan Valley | Tuguegarao City
Region III | Central Luzon | City of San Fernando, Pampanga
Region IV-A | CALABARZON | Calamba City
Region V | Bicol Region | Legazpi City
Region VI | Western Visayas | Iloilo City
Region VII | Central Visayas | Cebu City
Region VIII | Eastern Visayas | Tacloban City
Region IX | Zamboanga Peninsula | Pagadian City
Region X | Northern Mindanao | Cagayan de Oro City
Region XI | Davao Region | Davao City
Region XII | SOCCSKSARGEN | Koronadal City
Region XIII | Caraga | Butuan City
Cordillera Administrative Region | CAR | Baguio City
`);
for (const [r, nick, center] of REGIONS) {
  if (!r.startsWith('Cordillera')) {
    add(GEO, `${r} is also known as:`, nick, wrong(REGIONS.map((x) => x[1]).filter((x) => x !== 'CAR'), nick, 'nick' + r), `**${r}** is the **${nick}**.`);
  }
  add(GEO, `The regional center of ${r === 'Cordillera Administrative Region' ? 'the Cordillera Administrative Region (CAR)' : `${r} (${nick})`} is:`, center,
    wrong(REGIONS.map((x) => x[2]), center, 'center' + r), `Most regional offices of national agencies for **${r}** are in **${center}**, its regional center.`);
}

// Landmarks: place | where it is | what it is (the ones already asked in bank-general2, like the Chocolate Hills,
// Mayon and Taal, are not repeated here)
const PLACES = rows(`
Hundred Islands National Park | Pangasinan | a group of small islands in the Lingayen Gulf
Calle Crisologo | Ilocos Sur | a cobblestone street of Spanish-era houses in Vigan
Magellan's Cross | Cebu | a cross planted when Magellan's expedition arrived in 1521
Fort Santiago | Metro Manila | a Spanish-era fort in Intramuros where Rizal was held before his execution
Paoay Church | Ilocos Norte | a Baroque church with huge side buttresses, a UNESCO World Heritage Site
Miagao Church | Iloilo | a fortress-like Baroque church, a UNESCO World Heritage Site
Maria Cristina Falls | Lanao del Norte | a waterfall near Iligan City that powers a hydroelectric plant
Pagsanjan Falls | Laguna | a waterfall reached by riding a small boat up a gorge
Bangui Wind Farm | Ilocos Norte | a row of wind turbines along the coast
Cagsawa Ruins | Albay | the bell tower of a church buried by Mayon's 1814 eruption
Corregidor Island | Cavite | a fortress island at the mouth of Manila Bay used in World War II
Lake Sebu | South Cotabato | a highland lake, home of the T'boli people
Siargao Island | Surigao del Norte | an island famous for the "Cloud 9" surfing wave
El Nido | Palawan | limestone cliffs and lagoons on the northern tip of Palawan
Kawasan Falls | Cebu | a turquoise waterfall in Badian
Apo Reef Natural Park | Occidental Mindoro | one of the largest coral reef systems in the country
Boracay | Aklan | an island known for its white sand beach
Burnham Park | Benguet | a park with a man-made lake in Baguio City
Bud Bongao | Tawi-Tawi | a sacred mountain with monkeys in the southernmost province
Basco Lighthouse | Batanes | a lighthouse on Naidi Hills in the northernmost province
Mount Kanlaon | Negros Occidental | an active volcano and the highest peak of the Visayas
Biak-na-Bato National Park | Bulacan | the caves where Aguinaldo's revolutionary government once hid
Barasoain Church | Bulacan | the church in Malolos where the First Philippine Republic was inaugurated
Aguinaldo Shrine | Cavite | the house in Kawit where Philippine independence was proclaimed
Rizal Shrine (Calamba) | Laguna | the house where Jose Rizal was born
Callao Cave | Cagayan | a seven-chambered cave in Peñablanca
Sohoton Natural Bridge | Samar | a park with caves and a natural stone bridge
Tinago Falls | Lanao del Norte | a waterfall hidden in a deep ravine near Iligan City
`);
const placeWhere = PLACES.map((x) => x[1]);
for (const [name, where, what] of PLACES) {
  add(GEO, `${name}, ${what}, is found in:`, where, wrong(placeWhere, where, 'pl' + name), `**${name}** is in **${where}**: ${what}.`);
}

// Natural features, written by hand: question | answer | wrong; wrong; wrong | fact
const GEO_ROWS = rows(`
The Philippines lies between which two big bodies of water? | the Pacific Ocean and the West Philippine Sea (South China Sea) | the Indian Ocean and the Pacific Ocean; the Atlantic Ocean and the Pacific Ocean; the Arctic Ocean and the Indian Ocean | The Philippines is between the **Pacific Ocean** (east) and the **West Philippine Sea / South China Sea** (west).
The strait between Samar and Leyte, crossed by the San Juanico Bridge, is: | San Juanico Strait | Surigao Strait; Verde Island Passage; Basilan Strait | The **San Juanico Bridge** crosses the **San Juanico Strait** between Samar and Leyte.
The strait between Luzon and Taiwan is the: | Luzon Strait | Mindoro Strait; Balabac Strait; Tablas Strait | The **Luzon Strait** separates Luzon from Taiwan.
The passage between Batangas and Mindoro, known for its rich marine life, is the: | Verde Island Passage | San Bernardino Strait; Surigao Strait; Luzon Strait | The **Verde Island Passage** between Batangas and Mindoro is called the "center of the center of marine shore fish biodiversity."
The strait where the Battle of Leyte Gulf saw the last battleship-against-battleship fight in history is the: | Surigao Strait | San Juanico Strait; Luzon Strait; Mindoro Strait | The **Battle of Surigao Strait** (October 1944), part of the Battle of Leyte Gulf, was the last battle between battleships.
The largest gulf in the Philippines, found in Mindanao, is: | Moro Gulf | Lingayen Gulf; Ragay Gulf; Leyte Gulf | **Moro Gulf**, off southwestern Mindanao, is the largest gulf of the country.
The gulf in northwestern Luzon where the Hundred Islands are found is: | Lingayen Gulf | Davao Gulf; Albay Gulf; Ragay Gulf | The Hundred Islands are in **Lingayen Gulf**, Pangasinan.
Manila Bay is famous for its: | sunset | coral reefs; rice terraces; sand dunes | **Manila Bay** is famous for its beautiful **sunset**.
The largest mountain range in the Philippines, along the eastern coast of Luzon, is the: | Sierra Madre | Cordillera Central; Zambales Mountains; Caraballo Mountains | The **Sierra Madre** is the longest mountain range of the country and shields Luzon from many typhoons.
The mountain range in northern Luzon that is home of the Igorot peoples is the: | Cordillera Central | Sierra Madre; Zambales Mountains; Diwata Range | The **Cordillera Central** in northern Luzon is home of the Ifugao, Kalinga, Bontoc and other Igorot peoples.
The highest mountain in Luzon is: | Mount Pulag | Mount Apo; Mount Kanlaon; Mount Halcon | **Mount Pulag** (about 2,928 m) in Benguet is the highest peak in Luzon.
The highest peak in the Visayas is: | Mount Kanlaon | Mount Apo; Mount Pulag; Mount Halcon | **Mount Kanlaon** in Negros is the highest peak of the Visayas.
The volcano that erupted on January 12, 2020, sending ash to Metro Manila, is: | Taal Volcano | Mayon Volcano; Mount Pinatubo; Kanlaon Volcano | **Taal Volcano** erupted on January 12, 2020.
The volcano whose 1991 eruption was one of the largest of the 20th century is: | Mount Pinatubo | Mayon Volcano; Taal Volcano; Bulusan Volcano | **Mount Pinatubo** (Zambales, Tarlac, Pampanga) erupted in June 1991.
The island province known as the "Island Born of Fire" because of its many volcanoes is: | Camiguin | Siquijor; Romblon; Biliran | **Camiguin** is called the "Island Born of Fire" because it has several volcanoes.
The island province known for stories of healers and "mystic" traditions is: | Siquijor | Camiguin; Marinduque; Guimaras | **Siquijor** is known for folk healers and its "mystic island" stories.
The province called the "Marble Capital of the Philippines" is: | Romblon | Bohol; Batanes; Aurora | **Romblon** is famous for its high-quality marble.
The province known for having the sweetest mangoes in the Philippines is: | Guimaras | Zambales; Pangasinan; Cebu | **Guimaras** mangoes are known as among the sweetest in the world.
The city called the "City of Pines" is: | Baguio City | Tagaytay City; Malaybalay City; Antipolo City | **Baguio City** is the "City of Pines" and the Summer Capital.
The city known as the "Queen City of the South" is: | Cebu City | Davao City; Iloilo City; Zamboanga City | **Cebu City**, the oldest city of the country, is the "Queen City of the South."
The city known as "Asia's Latin City" because of its Spanish-based Chavacano language is: | Zamboanga City | Cebu City; Vigan City; Iloilo City | **Zamboanga City** is "Asia's Latin City"; many people there speak **Chavacano**.
The city known as the "City of Smiles" and home of the MassKara Festival is: | Bacolod City | Iloilo City; Davao City; Naga City | **Bacolod City** is the "City of Smiles."
The city known as the "City of Golden Friendship" is: | Cagayan de Oro City | Butuan City; Iligan City; General Santos City | **Cagayan de Oro City** is the "City of Golden Friendship."
The city known as the "Tuna Capital of the Philippines" is: | General Santos City | Davao City; Zamboanga City; Dumaguete City | **General Santos City** is the "Tuna Capital of the Philippines."
The city known as the "City of Love" and home of the Dinagyang Festival is: | Iloilo City | Bacolod City; Roxas City; Cebu City | **Iloilo City** is called the "City of Love."
The city known as the "Seafood Capital of the Philippines" is: | Roxas City | Iloilo City; Dagupan City; Legazpi City | **Roxas City** in Capiz is the "Seafood Capital of the Philippines."
The city known as the "City of Gentle People" and home of Silliman University is: | Dumaguete City | Tagbilaran City; Bacolod City; Ormoc City | **Dumaguete City** is the "City of Gentle People."
The city known as the "Bangus Capital of the Philippines" is: | Dagupan City | Roxas City; General Santos City; Navotas City | **Dagupan City** in Pangasinan is famous for its **bangus** (milkfish).
The largest city of the Philippines by land area is: | Davao City | Quezon City; Puerto Princesa City; Zamboanga City | **Davao City** has the largest land area among Philippine cities.
The city that was the capital of the Philippines from 1948 to 1976 is: | Quezon City | Cebu City; Baguio City; Malolos City | **Quezon City** was the official capital from 1948 until 1976, when Manila became the capital again.
How many regions does the Philippines have, counting NCR, CAR, BARMM and the Negros Island Region? | 18 | 15; 16; 20 | With the **Negros Island Region** (created in 2024), the Philippines has **18 regions**.
The region created in 2024 that groups Negros Occidental, Negros Oriental and Siquijor is the: | Negros Island Region | Central Visayas; Western Visayas; Eastern Visayas | The **Negros Island Region (NIR)** has Negros Occidental, Negros Oriental and Siquijor.
The only region of the Philippines without provinces, made up of cities and one municipality, is: | National Capital Region (NCR) | CALABARZON; Central Luzon; Cordillera Administrative Region | The **National Capital Region** (Metro Manila) has 16 cities and 1 municipality (Pateros), and no province.
The only municipality left in Metro Manila is: | Pateros | Taguig; Navotas; San Juan | **Pateros** is the only town in Metro Manila; all the others are cities.
CALABARZON is made from the names of which provinces? | Cavite, Laguna, Batangas, Rizal and Quezon | Camarines, Laguna, Bataan, Romblon and Zambales; Cavite, Leyte, Bohol, Romblon and Zamboanga; Cagayan, Laguna, Bulacan, Rizal and Zambales | **CA**vite, **LA**guna, **BA**tangas, **R**izal and Que**ZON** = CALABARZON.
MIMAROPA is made from the names of which provinces? | Mindoro, Marinduque, Romblon and Palawan | Mindanao, Masbate, Romblon and Pangasinan; Misamis, Marinduque, Rizal and Palawan; Mindoro, Masbate, Rizal and Pampanga | **MI**ndoro, **MA**rinduque, **RO**mblon and **PA**lawan = MIMAROPA.
SOCCSKSARGEN is made from the names of which places? | South Cotabato, Cotabato, Sultan Kudarat, Sarangani and General Santos | Sorsogon, Cebu, Samar, Sarangani and Gingoog; Surigao, Cotabato, Siquijor, Sarangani and Gensan; South Cotabato, Camiguin, Sulu, Samar and Guimaras | **SO**uth **C**otabato, **C**otabato, **S**ultan **K**udarat, **SAR**angani and **GEN**eral Santos = SOCCSKSARGEN.
The southernmost province of the Philippines is: | Tawi-Tawi | Sulu; Sarangani; Davao Occidental | **Tawi-Tawi** is the southernmost province, close to Sabah (Malaysia).
The province closest to Taiwan is: | Batanes | Cagayan; Ilocos Norte; Apayao | **Batanes**, the northernmost province, is about 190 km from Taiwan.
The traditional houses of Batanes are made of: | thick stone walls and cogon roofs | bamboo and nipa only; concrete and steel; wood and galvanized iron | Ivatan houses have **thick stone walls and thick cogon roofs** to survive strong typhoons.
The bridge that links the islands of Samar and Leyte is the: | San Juanico Bridge | Marcelo Fernan Bridge; Mactan–Mandaue Bridge; Agas-Agas Bridge | The **San Juanico Bridge** (about 2.16 km, opened in 1973) links Samar and Leyte.
The country's main gateway airport, in Pasay and Parañaque, is the: | Ninoy Aquino International Airport | Clark International Airport; Mactan–Cebu International Airport; Francisco Bangoy International Airport | The **Ninoy Aquino International Airport (NAIA)** is the main airport serving Metro Manila.
The famous waterfall in Iligan City, called the "twin falls," is: | Maria Cristina Falls | Pagsanjan Falls; Kawasan Falls; Tinuy-an Falls | **Maria Cristina Falls** in Iligan City has two streams and powers a hydroelectric plant.
The "Niagara Falls of the Philippines" in Surigao del Sur, known for its wide curtain of water, is: | Tinuy-an Falls | Maria Cristina Falls; Pagsanjan Falls; Asik-Asik Falls | **Tinuy-an Falls** in Bislig, Surigao del Sur, is called the "Little Niagara Falls of the Philippines."
The second largest river basin in the Philippines, in Mindanao, is the: | Mindanao River Basin | Cagayan River Basin; Agusan River Basin; Pampanga River Basin | The **Mindanao River Basin** (Rio Grande de Mindanao) is second to the Cagayan River Basin.
The river that flows through Butuan City and is the third longest in the country is the: | Agusan River | Pasig River; Abra River; Pampanga River | The **Agusan River** flows through Agusan del Sur and Butuan City.
The lake in Mindanao home to the Maranao, the "people of the lake," is: | Lake Lanao | Lake Sebu; Lake Buhi; Lake Mainit | The **Maranao** live around **Lake Lanao** in Lanao del Sur.
The lake in Camarines Sur that is home to the sinarapan, one of the smallest fish in the world, is: | Lake Buhi | Lake Sebu; Lake Lanao; Taal Lake | The tiny **sinarapan** fish is found in **Lake Buhi**, Camarines Sur.
Taal Lake is the only home of the freshwater sardine called: | tawilis | sinarapan; tilapia; dalag | The **tawilis** is a freshwater sardine found only in **Taal Lake**.
A large body of land almost surrounded by water and connected to the mainland is a: | peninsula | island; isthmus; archipelago | A **peninsula** is land with water on most sides, like the Zamboanga Peninsula and Bataan Peninsula.
A country made up of many islands, like the Philippines, is called an: | archipelago | peninsula; continent; isthmus | A country made of many islands is an **archipelago**.
A narrow strip of water that connects two larger bodies of water is a: | strait | gulf; bay; lagoon | A **strait** is a narrow passage of water between two bigger bodies of water.
The imaginary line at 0° latitude that divides the Earth into north and south is the: | equator | prime meridian; Tropic of Cancer; International Date Line | The **equator** is at 0° latitude. The Philippines is north of the equator.
The Philippines is in which hemispheres? | Northern and Eastern | Southern and Eastern; Northern and Western; Southern and Western | The Philippines is north of the equator and east of the prime meridian: the **Northern and Eastern** hemispheres.
The Philippine Standard Time is how many hours ahead of Coordinated Universal Time (UTC)? | 8 hours | 6 hours; 7 hours; 9 hours | Philippine Standard Time is **UTC+8**.
The government agency that keeps the official Philippine Standard Time is: | PAGASA | DOST-PHIVOLCS; NAMRIA; PSA | **PAGASA** keeps and announces the official Philippine Standard Time.
The Philippines has two main seasons: | the wet (rainy) season and the dry season | summer and winter; spring and fall; monsoon and typhoon | The Philippines has a tropical climate with a **wet season** and a **dry season**.
The Philippine province that is a group of more than 1,700 islands and is the largest in land area is: | Palawan | Sulu; Masbate; Quezon | **Palawan** has more than 1,700 islands and is the largest province by land area.
The rice granary of the Philippines, known for its wide rice fields, is: | Nueva Ecija | Batangas; Bukidnon; Quezon | **Nueva Ecija** in Central Luzon is called the "Rice Granary of the Philippines."
The province known as the "Coconut Capital of the Philippines," with the most coconut trees, is: | Quezon | Laguna; Albay; Davao Oriental | **Quezon** province is famous for its many coconut farms.
The "Food Basket of Mindanao," known for its pineapple and corn plantations, is: | Bukidnon | Sulu; Dinagat Islands; Camiguin | **Bukidnon**, a high plateau in Northern Mindanao, has huge pineapple and corn farms.
The "Durian Capital of the Philippines" is: | Davao City | Cebu City; Iloilo City; Zamboanga City | **Davao City** is famous for its **durian**.
`);
for (const [q, a, ds, fact] of GEO_ROWS) add(GEO, q, a, ds.split(';').map((x) => x.trim()), fact);

/* =============================== PHILIPPINE HISTORY =============================== */
const HIS = 'Philippine History';
// The presidents in order (the count used by the government: Aguinaldo is the 1st, Marcos Jr. the 17th).
const PRESIDENTS = ['Emilio Aguinaldo', 'Manuel L. Quezon', 'Jose P. Laurel', 'Sergio Osmeña', 'Manuel Roxas', 'Elpidio Quirino', 'Ramon Magsaysay',
  'Carlos P. Garcia', 'Diosdado Macapagal', 'Ferdinand E. Marcos', 'Corazon C. Aquino', 'Fidel V. Ramos', 'Joseph Ejercito Estrada',
  'Gloria Macapagal Arroyo', 'Benigno S. Aquino III', 'Rodrigo Roa Duterte', 'Ferdinand R. Marcos Jr.'];
const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th', '13th', '14th', '15th', '16th', '17th'];
PRESIDENTS.forEach((p, i) => {
  if (i !== 0 && i !== 16) {
    add(HIS, `Who was the ${ORD[i]} President of the Philippines?`, p, wrong(PRESIDENTS, p, 'pres' + i, [PRESIDENTS[i - 1], PRESIDENTS[i + 1]].filter(Boolean)),
      `The order: ${PRESIDENTS.slice(Math.max(0, i - 1), i + 2).map((x, k) => `${ORD[Math.max(0, i - 1) + k]} **${x}**`).join(', ')}.`);
  }
  if (i !== 16) add(HIS, `${p} was the Philippines' President number:`, ORD[i], wrong(ORD, ORD[i], 'presn' + i, [ORD[i - 1], ORD[i + 1]].filter(Boolean)),
    `**${p}** was the **${ORD[i]}** President of the Philippines.`);
});
// Who came right after whom
for (let i = 4; i < 16; i++) {
  add(HIS, `Which President came right after ${PRESIDENTS[i]}?`, PRESIDENTS[i + 1], wrong(PRESIDENTS, PRESIDENTS[i + 1], 'after' + i, [PRESIDENTS[i - 1], PRESIDENTS[i + 2]].filter(Boolean)),
    `${ORD[i]} **${PRESIDENTS[i]}**, then ${ORD[i + 1]} **${PRESIDENTS[i + 1]}**.`);
}

// Heroes and famous Filipinos: person | known as / known for (each line fits only that person).
// Heroes whose fact bank-general2 already asks (Bonifacio, Mabini, Lapulapu, Tandang Sora...) are left out, so the
// same fact is not asked twice (not even the other way around).
const PEOPLE = rows(`
Emilio Jacinto | the writer of the "Kartilya ng Katipunan"
Marcelo H. del Pilar | the propagandist who used the pen name "Plaridel"
Félix Resurrección Hidalgo | the painter of "Las Vírgenes Cristianas Expuestas al Populacho"
Sultan Kudarat | the Muslim ruler of Maguindanao who fought Spanish rule
Trinidad Tecson | the "Mother of Biak-na-Bato," who cared for the wounded
Macario Sakay | the Katipunero who kept fighting the Americans and set up the "Republika ng Katagalugan"
Lope K. Santos | the "Father of Filipino Grammar," author of "Banaag at Sikat"
Lorenzo Ruiz | the first Filipino saint
Pedro Calungsod | the second Filipino saint, a young catechist from the Visayas
Hidilyn Diaz | the first Filipino to win an Olympic gold medal
Carlos Yulo | the gymnast who won two Olympic gold medals in Paris 2024
Manny Pacquiao | the only boxer to win world titles in eight weight divisions
Fernando Amorsolo | the first National Artist, known for sunlit paintings of the countryside
Mariano Ponce | the propagandist who co-founded La Solidaridad and used the pen name "Tikbalang"
Jose Ma. Panganiban | the propagandist known for his photographic memory, pen name "JoMaPa"
Diego Silang | the Ilocano leader who revolted against Spain in 1762
Rajah Sulayman | the Muslim ruler of Manila who fought Legazpi's forces in 1571
Vicente Lim | the first Filipino graduate of the US Military Academy at West Point
Jose Abad Santos | the Chief Justice executed by the Japanese for refusing to serve them
Eduardo Quisumbing | the botanist who studied Philippine orchids and medicinal plants
Fe del Mundo | the pediatrician who invented a bamboo incubator for babies
Gregorio Y. Zara | the scientist who invented the two-way television telephone (videophone)
`);
const who = PEOPLE.map((x) => x[0].replace('*', '')), what = PEOPLE.map((x) => x[1]);
for (const [p0, w] of PEOPLE) {
  const p = p0.replace('*', '');
  if (!p0.startsWith('*')) add(HIS, `Who is ${w}?`, p, wrong(who, p, 'who' + p), `**${p}** is ${w}.`);
  add(HIS, `${p} is best known as:`, w, wrong(what, w, 'what' + p), `**${p}**: ${w}.`);
}
// Pen names of the propagandists and revolutionaries
const PEN = rows(`
Jose Rizal | Laong Laan
Emilio Jacinto | Dimas-Ilaw
Antonio Luna | Taga-Ilog
Graciano López Jaena | Diego Laura
Andres Bonifacio | Agapito Bagumbayan
`);
for (const [p, pen] of PEN) {
  add(HIS, `"${pen}" was a pen name of:`, p, wrong(PEN.map((x) => x[0]), p, 'pen' + p), `**${pen}** was a pen name of **${p}**.`);
}

// Events, written by hand: question | answer | wrong; wrong; wrong | fact
const HIS_ROWS = rows(`
The first Catholic Mass in the Philippines was held on March 31, 1521 in: | Limasawa | Cebu; Manila; Bohol | The first Mass was held on Easter Sunday, **March 31, 1521**, in **Limasawa** (Southern Leyte).
Miguel López de Legazpi founded the first permanent Spanish settlement in the Philippines in 1565 in: | Cebu | Manila; Iloilo; Vigan | Legazpi arrived in **Cebu** in 1565 and set up the first Spanish settlement there.
Manila was declared the capital of the Spanish colony by Legazpi in the year: | 1571 | 1521; 1565; 1600 | On June 24, **1571**, Legazpi founded the city of Manila as the capital.
The trade between Manila and Acapulco, Mexico that lasted from 1565 to 1815 was the: | Galleon Trade | Silk Road; Spice Route; Tobacco Monopoly | The **Galleon Trade** sent ships between Manila and Acapulco for 250 years.
The Spanish system of forced labor where Filipino men had to work on government projects was called: | polo y servicio | encomienda; tributo; bandala | Under **polo y servicio**, men aged 16 to 60 had to give 40 days of labor a year.
The Spanish system that forced farmers to sell crops to the government at low prices was the: | bandala | polo y servicio; encomienda; reducción | The **bandala** forced farmers to sell part of their harvest to the government.
The Spanish policy of moving scattered villages into towns around a church was called: | reducción | bandala; encomienda; polo y servicio | **Reducción** gathered people into towns "under the bells" of the church.
The opening of which canal in 1869 made travel between Europe and the Philippines much faster? | Suez Canal | Panama Canal; Kiel Canal; Corinth Canal | The **Suez Canal** (1869) shortened the trip, so more Filipinos studied in Europe and new ideas came in.
Rizal's first novel, "Noli Me Tangere," was published in 1887 in: | Berlin, Germany | Madrid, Spain; Ghent, Belgium; Hong Kong | **Noli Me Tangere** was printed in **Berlin** in 1887 with money lent by Maximo Viola.
"El Filibusterismo" was printed in 1891 in: | Ghent, Belgium | Berlin, Germany; Paris, France; London, England | **El Filibusterismo** was printed in **Ghent, Belgium** in 1891 with help from Valentin Ventura.
Rizal dedicated "El Filibusterismo" to the memory of: | the three priests Gomez, Burgos and Zamora | his mother Teodora Alonso; the Filipino youth; his brother Paciano | Rizal dedicated El Filibusterismo to **GomBurZa**, the three martyr priests of 1872.
The Cavite Mutiny of 1872 led to the execution of: | the three priests Gomez, Burgos and Zamora | Jose Rizal and his family; Andres Bonifacio and his brother; the Katipunan leaders | After the **Cavite Mutiny (1872)**, Fathers Gomez, Burgos and Zamora (**GomBurZa**) were executed.
The Katipunan was discovered by the Spaniards in August 1896 because of: | a confession told to a Spanish priest | a newspaper article; a letter to Rizal; a captured flag | Teodoro Patiño told the secret to a priest, who told the authorities, and the Katipunan was **discovered in August 1896**.
The "Cry of Pugad Lawin" in August 1896 is remembered because the Katipuneros: | tore their cedulas (tax certificates) | signed the Constitution; raised the first flag; burned Spanish churches | At the **Cry of Pugad Lawin**, Katipuneros led by Bonifacio **tore their cedulas** to start the revolution.
The meeting of March 22, 1897 where Aguinaldo was elected President of the revolutionary government was the: | Tejeros Convention | Malolos Congress; Biak-na-Bato Assembly; Kawit Assembly | At the **Tejeros Convention** in Cavite, Aguinaldo was elected President over Bonifacio.
Andres Bonifacio was executed in May 1897 at: | Mount Buntis, Maragondon, Cavite | Bagumbayan, Manila; Fort Santiago, Manila; Kawit, Cavite | Bonifacio and his brother Procopio were executed near **Mount Buntis in Maragondon, Cavite**, on May 10, 1897.
The American naval commander who defeated the Spanish fleet at the Battle of Manila Bay on May 1, 1898 was: | Commodore George Dewey | General Douglas MacArthur; General Arthur MacArthur; Admiral Chester Nimitz | **Commodore George Dewey** destroyed the Spanish fleet in Manila Bay on May 1, 1898.
The staged fight on August 13, 1898 where Spain surrendered Manila to the Americans and not to the Filipinos is the: | Mock Battle of Manila | Battle of Tirad Pass; Battle of Pulang Lupa; Battle of Manila Bay | In the **Mock Battle of Manila**, Spain and the US agreed beforehand so that Manila would surrender to the Americans.
The Philippine national flag was first raised in public on June 12, 1898 at: | Aguinaldo's house in Kawit, Cavite | Barasoain Church, Malolos; Fort Santiago, Manila; Biak-na-Bato, Bulacan | The flag was first unfurled at **Aguinaldo's house in Kawit**, Cavite, when independence was proclaimed.
The Philippine Declaration of Independence of 1898 was written and read by: | Ambrosio Rianzares Bautista | Apolinario Mabini; Felipe Calderon; Emilio Jacinto | **Ambrosio Rianzares Bautista** wrote and read the "Acta de la Proclamación de Independencia."
The Malolos Constitution was mainly written by: | Felipe Calderon | Apolinario Mabini; Pedro Paterno; Emilio Aguinaldo | **Felipe Calderon** wrote the main draft of the **Malolos Constitution**.
The Malolos Constitution made the First Philippine Republic the first republic in: | Asia | Europe; Africa; South America | The First Philippine Republic (1899) is considered the **first constitutional republic in Asia**.
Emilio Aguinaldo was captured by the Americans in 1901 in: | Palanan, Isabela | Kawit, Cavite; Malolos, Bulacan; Tirad Pass, Ilocos Sur | Aguinaldo was captured in **Palanan, Isabela** on March 23, 1901.
The law passed by the US Congress in 1934 that promised Philippine independence after 10 years is the: | Tydings–McDuffie Act | Jones Law; Philippine Organic Act of 1902; Hare–Hawes–Cutting Act | The **Tydings–McDuffie Act (1934)** set up the Commonwealth and promised independence after ten years.
The Jones Law of 1916 was important because it: | promised independence once a stable government was set up | made Filipinos US citizens; ended the Philippine-American War; created the Commonwealth | The **Jones Law (1916)** was the first official US promise of independence once a "stable government" was in place.
The forced march of Filipino and American prisoners of war in April 1942 is called the: | Bataan Death March | Leyte Landing; Battle of Manila; Long March | After the fall of Bataan, thousands of prisoners were forced to walk in the **Bataan Death March**.
The last stronghold of Filipino and American forces before the surrender to Japan in May 1942 was: | Corregidor | Bataan; Leyte; Intramuros | **Corregidor** fell on May 6, 1942, after the fall of Bataan.
General MacArthur's famous promise when he left the Philippines in 1942 was: | "I shall return." | "We shall overcome."; "Never give up."; "I will be back soon." | MacArthur said **"I shall return"** and landed in Leyte in 1944.
The Filipino guerrilla army of Central Luzon that fought the Japanese was the: | Hukbalahap | Katipunan; Magdalo; Sakdalista | The **Hukbalahap** (Hukbo ng Bayan Laban sa Hapon) fought the Japanese in Central Luzon.
The Battle of Manila in February 1945 left the city: | one of the most destroyed cities of World War II | almost untouched; under Spanish rule again; the new capital of Japan | The **Battle of Manila (1945)** left Manila one of the most damaged cities of World War II.
The Filipino who became President of the United Nations General Assembly in 1949 was: | Carlos P. Romulo | Jose P. Laurel; Claro M. Recto; Salvador Laurel | **Carlos P. Romulo** became President of the UN General Assembly in 1949.
The 1946 agreement that gave Americans equal rights with Filipinos to use Philippine natural resources is the: | parity rights (Bell Trade Act) | Laurel–Langley Agreement; Military Bases Agreement; Treaty of Paris | The **parity rights** of the Bell Trade Act (1946) gave Americans equal rights to use Philippine resources.
The US military bases agreement ended when the Senate rejected a new treaty in: | 1991 | 1986; 1972; 2001 | In **1991** the Senate voted against a new bases treaty, and Subic Naval Base closed in 1992.
The volcano eruption that also led to the closing of Clark Air Base in 1991 was that of: | Mount Pinatubo | Mayon Volcano; Taal Volcano; Mount Apo | **Mount Pinatubo**'s eruption in June 1991 buried Clark Air Base in ash.
The People Power Revolution of February 1986 took place mainly along: | EDSA | Roxas Boulevard; Taft Avenue; España Boulevard | Millions gathered on **EDSA** (Epifanio de los Santos Avenue) in February 1986.
The strongest typhoon to hit the Philippines in recent history, which struck Tacloban on November 8, 2013, was: | Typhoon Yolanda (Haiyan) | Typhoon Ondoy (Ketsana); Typhoon Odette (Rai); Typhoon Pablo (Bopha) | **Typhoon Yolanda (Haiyan)** hit Eastern Visayas on November 8, 2013.
The five-month battle in 2017 between government troops and the Maute group took place in: | Marawi City | Zamboanga City; Cotabato City; Jolo | The **Battle of Marawi** (May to October 2017) was fought against the Maute group.
The Philippines won its case about the West Philippine Sea before the arbitral tribunal in The Hague in: | 2016 | 2012; 2014; 2019 | On July 12, **2016**, the arbitral tribunal ruled for the Philippines on the West Philippine Sea.
The Philippines hosted the Southeast Asian (SEA) Games most recently in: | 2019 | 2005; 2015; 2023 | The Philippines hosted the **2019** SEA Games (and also hosted in 1981, 1991 and 2005).
The pre-colonial writing system of the Tagalogs is called: | baybayin | kulitan; jawi; hangul | The old Tagalog script is **baybayin** (often wrongly called alibata).
In pre-colonial Philippine society, the ruling class was called the: | datu (maginoo) | alipin; timawa; babaylan | The **datu** and his family (the **maginoo**) were the ruling class.
In pre-colonial times, the religious leader and healer, often a woman, was the: | babaylan | datu; alipin; timawa | The **babaylan** led rituals and healed the sick.
The pre-colonial social class of servants or dependents was the: | alipin | maharlika; datu; babaylan | The **alipin** served the datu and the maharlika.
The early villages of the Filipinos were called "barangay," a name that came from a kind of: | boat | house; weapon; tree | **Barangay** comes from **balangay**, the boats early settlers used.
The oldest written document found in the Philippines, dated 900 AD, is the: | Laguna Copperplate Inscription | Code of Kalantiaw; Butuan Ivory Seal; Calatagan Pot | The **Laguna Copperplate Inscription** (900 AD) is the oldest known Philippine document.
The ancient boat found in Butuan, the oldest watercraft found in Southeast Asia, is the: | balangay | vinta; paraw; galleon | The **balangay** boats of Butuan date back to around 320 AD.
The fossil remains known as the "Tabon Man" were found in: | Tabon Caves, Palawan | Callao Cave, Cagayan; Banaue, Ifugao; Lake Sebu, South Cotabato | The **Tabon Man** remains (tens of thousands of years old) were found in the **Tabon Caves** of Quezon, Palawan.
The Manunggul Jar, a burial jar with two figures on a boat on its cover, was found in: | Palawan | Batangas; Cebu; Sulu | The **Manunggul Jar** came from the Tabon Caves complex in **Palawan**.
Islam was brought to the southern Philippines mainly by: | Arab and Malay traders and missionaries | Spanish friars; Chinese merchants; American teachers | Islam came through **Arab and Malay traders and missionaries** from the Malay world, starting in Sulu.
The first mosque in the Philippines, built in the 14th century, is in: | Simunul, Tawi-Tawi | Marawi, Lanao del Sur; Jolo, Sulu; Cotabato City | The **Sheik Karimul Makhdum Mosque** in **Simunul, Tawi-Tawi** is the oldest mosque in the country.
The first university in Asia still running, founded in Manila in 1611, is the: | University of Santo Tomas | University of the Philippines; Ateneo de Manila; University of San Carlos | The **University of Santo Tomas** was founded in 1611.
The University of the Philippines was founded in the year: | 1908 | 1611; 1898; 1946 | The **University of the Philippines** was founded in **1908**.
The EDSA People Power Revolution anniversary is remembered every: | February 25 | January 23; June 12; August 21 | **February 25** is the anniversary of the 1986 EDSA People Power Revolution.
The "Philippine-American Friendship Day" was once celebrated on: | July 4 | June 12; August 30; November 30 | **July 4** was Independence Day until 1962; it became Philippine-American Friendship Day.
`);
for (const [q, a, ds, fact] of HIS_ROWS) add(HIS, q, a, ds.split(';').map((x) => x.trim()), fact);

/* =============================== PHILIPPINE GOVERNMENT (offices, not laws) =============================== */
const GOV = 'Philippine Government';
// short name | full name | what it does (each line fits only that office)
const AGENCIES = rows(`
DepEd | Department of Education | runs public elementary and high schools
DOH | Department of Health | leads public health programs and government hospitals
DENR | Department of Environment and Natural Resources | protects forests, wildlife and natural resources
DA | Department of Agriculture | helps farmers and fishers and keeps food supply up
DTI | Department of Trade and Industry | protects consumers and promotes business and trade
DOLE | Department of Labor and Employment | protects workers and enforces labor standards
DFA | Department of Foreign Affairs | handles relations with other countries and issues passports
DND | Department of National Defense | oversees the Armed Forces and national defense
DOJ | Department of Justice | prosecutes crimes and is the government's main law office
DOF | Department of Finance | manages government income, taxes and public debt
DBM | Department of Budget and Management | prepares the national budget and releases funds to agencies
DPWH | Department of Public Works and Highways | builds national roads, bridges and flood control
DOTr | Department of Transportation | oversees land, sea and air transport
DICT | Department of Information and Communications Technology | leads government internet, ICT and digital services
DOST | Department of Science and Technology | leads science and technology programs
DSWD | Department of Social Welfare and Development | helps poor families, children and disaster victims
DILG | Department of the Interior and Local Government | supervises local governments and the police
DOT | Department of Tourism | promotes the Philippines as a travel destination
DOE | Department of Energy | plans and oversees the country's energy supply
DAR | Department of Agrarian Reform | gives land to farmers under agrarian reform
DHSUD | Department of Human Settlements and Urban Development | leads housing and urban planning
DMW | Department of Migrant Workers | protects overseas Filipino workers
PAGASA | Philippine Atmospheric, Geophysical and Astronomical Services Administration | gives weather forecasts and typhoon warnings
PHIVOLCS | Philippine Institute of Volcanology and Seismology | monitors volcanoes, earthquakes and tsunamis
PSA | Philippine Statistics Authority | runs the census and keeps birth, marriage and death records
BIR | Bureau of Internal Revenue | collects income tax and other internal taxes
BOC | Bureau of Customs | collects duties on imported goods and stops smuggling
LTO | Land Transportation Office | issues driver's licenses and registers vehicles
LTFRB | Land Transportation Franchising and Regulatory Board | gives franchises to buses, jeepneys and taxis
GSIS | Government Service Insurance System | gives insurance and pensions to government workers
SSS | Social Security System | gives insurance and pensions to private-sector workers
HDMF | Home Development Mutual Fund (Pag-IBIG Fund) | gives savings and housing loans to its members
PhilHealth | Philippine Health Insurance Corporation | runs the national health insurance program
NBI | National Bureau of Investigation | investigates major crimes and issues clearances
PNP | Philippine National Police | keeps peace and order and enforces laws
BFP | Bureau of Fire Protection | fights fires and enforces the Fire Code
BJMP | Bureau of Jail Management and Penology | runs city and municipal jails
BuCor | Bureau of Corrections | runs national prisons such as the New Bilibid Prison
PCG | Philippine Coast Guard | guards the seas and keeps sea travel safe
TESDA | Technical Education and Skills Development Authority | gives technical-vocational training and skills certificates
CHED | Commission on Higher Education | supervises colleges and universities
PRC | Professional Regulation Commission | gives board exams and licenses to professionals
CSC | Civil Service Commission | is the central personnel agency of the government
COA | Commission on Audit | checks how government money is spent
COMELEC | Commission on Elections | runs elections in the country
CHR | Commission on Human Rights | investigates human rights violations
BSP | Bangko Sentral ng Pilipinas | is the central bank that issues peso bills and coins
NAMRIA | National Mapping and Resource Information Authority | makes the official maps of the Philippines
NCIP | National Commission on Indigenous Peoples | protects the rights of indigenous peoples
NHCP | National Historical Commission of the Philippines | marks historical sites and studies Philippine history
NCCA | National Commission for Culture and the Arts | supports Philippine culture and the arts
KWF | Komisyon sa Wikang Filipino | develops and promotes the Filipino language
PCSO | Philippine Charity Sweepstakes Office | raises money for health and charity through lotteries
MMDA | Metropolitan Manila Development Authority | manages traffic and flood control in Metro Manila
FDA | Food and Drug Administration | checks the safety of food, medicine and cosmetics
PDEA | Philippine Drug Enforcement Agency | leads the fight against illegal drugs
OWWA | Overseas Workers Welfare Administration | gives welfare services to OFWs and their families
`);
const fullN = AGENCIES.map((x) => x[1]);
// bank-general2 already asks "Which agency does ...?" for these, so here they only get "What does ... stand for?".
const ASKED = new Set(['DepEd', 'DENR', 'DSWD', 'DOLE', 'DFA', 'DBM', 'DPWH', 'DILG', 'PAGASA', 'PHIVOLCS', 'PSA', 'BIR', 'BOC', 'LTO', 'PhilHealth', 'BFP', 'BJMP', 'TESDA', 'CHED', 'CSC', 'COA', 'BSP', 'PNP', 'PCG', 'HDMF', 'CHR', 'NCIP']);
for (const [s, f, j] of AGENCIES) {
  if (s !== f) add(GOV, `What does ${s} stand for?`, f, wrong(fullN, f, 'full' + s), `**${s}** stands for **${f}**.`);
  if (!ASKED.has(s)) add(GOV, `Which government office ${j}?`, `${f}${s !== f ? ` (${s})` : ''}`,
    wrong(AGENCIES.map((x) => `${x[1]}${x[0] !== x[1] ? ` (${x[0]})` : ''}`), `${f}${s !== f ? ` (${s})` : ''}`, 'job' + s),
    `The **${f}** ${j}.`);
}
const GOV_ROWS = rows(`
The official residence and workplace of the President of the Philippines is: | Malacañang Palace | Batasang Pambansa; Coconut Palace; Mansion House | The President lives and works in **Malacañang Palace** in Manila.
The official summer residence of the President in Baguio City is called: | The Mansion | Malacañang of the North; Bahay Pangarap; Teachers' Camp | **The Mansion** in Baguio City is the President's summer residence.
The House of Representatives holds its sessions at the: | Batasang Pambansa Complex in Quezon City | GSIS Building in Pasay; Malacañang Palace; Philippine International Convention Center | The House of Representatives meets at the **Batasang Pambansa Complex** in Quezon City.
Half of the Senate (12 senators) is elected every: | 3 years | 6 years; 2 years; 4 years | Senators serve 6 years, and **12 are elected every 3 years**.
The head of the Senate is called the: | Senate President | Speaker; Majority Floor Leader; Senate Chairman | The Senate is led by the **Senate President**.
The head of the House of Representatives is called the: | Speaker of the House | Senate President; Majority Floor Leader; House Chairman | The House of Representatives is led by the **Speaker of the House**.
The head of the Supreme Court is the: | Chief Justice | Solicitor General; Ombudsman; Secretary of Justice | The **Chief Justice** heads the Supreme Court.
Justices of the Supreme Court must retire at the age of: | 70 | 60; 65; 75 | Members of the judiciary serve until the age of **70**.
The lawyer of the government in the Supreme Court and Court of Appeals is the: | Solicitor General | Ombudsman; Chief Justice; Secretary of Justice | The **Office of the Solicitor General** represents the government in court.
The special court that hears tax cases is the: | Court of Tax Appeals | Sandiganbayan; Court of Appeals; Shari'a Court | The **Court of Tax Appeals** handles tax cases.
The courts that handle cases among Muslims on personal and family matters are the: | Shari'a courts | Sandiganbayan; Family courts only; Municipal Trial Courts | **Shari'a courts** decide family and personal cases under Muslim law.
The official government gazette where laws are published is the: | Official Gazette | Philippine Star; Government Journal; Congressional Record | Laws take effect after they are published in the **Official Gazette** or a newspaper of general circulation.
The group of department secretaries who advise the President is called the: | Cabinet | Senate; Council of State; Commission | The department secretaries together make up the **Cabinet**.
A city or municipality's chief executive is the: | mayor | governor; punong barangay; vice mayor | A **mayor** heads a city or municipality.
The presiding officer of the Sangguniang Panlalawigan is the: | vice governor | governor; provincial board member; mayor | The **vice governor** presides over the Sangguniang Panlalawigan.
The presiding officer of the Sangguniang Bayan or Panlungsod is the: | vice mayor | mayor; councilor; punong barangay | The **vice mayor** presides over the city or municipal council.
The terms of office of local elected officials (like mayors and governors) are: | 3 years | 6 years; 4 years; 2 years | Local elected officials serve **3 years** per term, up to three terms in a row.
The barangay assembly is made up of: | all barangay residents 15 years old and above who are registered | only the barangay officials; only the Sangguniang Kabataan; only voters over 21 | The barangay assembly is made up of residents **15 years and above** listed in the barangay.
The youth sector representative in the Sangguniang Barangay is the: | SK chairperson | barangay secretary; barangay treasurer; barangay tanod | The **SK chairperson** sits in the Sangguniang Barangay.
The barangay's community police officers are called: | barangay tanod | lupon members; SK officials; kagawad | **Barangay tanods** help keep peace and order in the barangay.
The usual way citizens can choose their leaders in a democracy is by: | voting in elections | paying taxes; joining rallies; writing letters | In a democracy, citizens choose leaders by **voting**.
The minimum age to vote in Philippine national elections is: | 18 years old | 15 years old; 21 years old; 25 years old | Filipino citizens **18 years old and above** may vote.
National and local elections in the Philippines are held every three years on the: | second Monday of May | first Monday of June; last Monday of April; first Tuesday of November | Regular elections are on the **second Monday of May**.
The President and Vice-President start their term at noon on: | June 30 | June 12; July 1; May 30 | Their six-year term begins at noon on **June 30** after the election.
The President delivers a report to Congress every fourth Monday of July called the: | State of the Nation Address (SONA) | Inaugural Address; Budget Message; People's Address | The **SONA** is delivered at the opening of Congress on the fourth Monday of July.
The Philippine national budget is first filed by the President as a bill called the: | General Appropriations Bill | Revenue Code; Budget Act; National Expenditure Code | The budget is passed each year as the **General Appropriations Act** after Congress approves the bill.
`);
for (const [q, a, ds, fact] of GOV_ROWS) add(GOV, q, a, ds.split(';').map((x) => x.trim()), fact);

module.exports = out;
module.exports.add = add;
module.exports.wrong = wrong;
