// Explanations that even a 10-year-old can follow: small steps, colored key parts, and a Quick Note.
//
// An explanation is plain text with a few marks (the app colors them; the PDF just drops the marks):
//   one step per line ("\n")          "Step 1: ..." lines get a round number badge
//   **key idea**   blue and bold      ==answer==   green and bold      !!trap!!   red
//   ^^part^^       the part being worked out right now (highlighted), like the colored part in a math answer key
//   lines that start with "=" are math lines: one small operation per line, lined up under each other
//   "Quick Note: ..." starts the tip box at the end (it can go on for more lines).
// Old explanations without marks still show fine.
//
// Every question also gets a Quick Note for its topic (TIPS), unless its explanation already has one.
// Saved exams and results get the newest explanation of a built-in question when they are shown.
const { QUESTIONS } = require('./bank');

const TIPS = {
  // Numerical
  'Basic Operations': 'Use **PEMDAS**: Parentheses → Exponents → Multiply/Divide (left to right) → Add/Subtract (left to right).\nSigns: same signs (+ × +, − × −) give **+**; different signs give **−**.',
  'Percentage': '**%** means "out of 100", so 25% = 25 ÷ 100 = 0.25.\nPart = **% × whole**. Percent = **part ÷ whole × 100**.',
  'Simple Interest': '**I = P × r × t** (money × rate as a decimal × years).\nExample: 5% = 0.05.',
  'Work Problem': 'Add the **work done in 1 hour**: 1/A + 1/B = 1/T.\nShortcut for two people: T = (A × B) ÷ (A + B).',
  'Distance, Rate, Time': '**D = R × T**. Cover the one you need: R = D ÷ T, T = D ÷ R.',
  'Age Problem': 'Call the younger age **n**. Write the other age using n, add them, then solve for n.',
  'Average': 'Average = **sum of all values ÷ how many values**.\nTotal = **average × how many**.',
  'Algebra': 'Do the **same thing to both sides** of the equal sign until x is alone.\nConsecutive numbers: x, x + 1, x + 2.',
  'Ratio and Proportion': 'Ratio a : b → total parts = **a + b**. One part = total ÷ parts.\nProportion: find the price of **one** first, then multiply.',
  'Fractions': 'To add or subtract, make the bottoms the same (**LCD**) first.\nAlways **simplify**: divide top and bottom by the same number.',
  'Decimals': 'Multiply like whole numbers, then **count the decimal places** in both numbers and put that many in the answer.',
  'Number Series': 'Look at the **gap** between numbers: is it +, −, ×, ÷, a square, or does the gap itself grow?',
  'Word Problem': 'Read slowly. Write what you **know**, what you **need**, then do one small step at a time.',
  'Geometry': 'Area (inside space) = **length × width**.\nPerimeter (the fence around) = **2 × (length + width)**.',
  'Measurement': '1 km = **1,000 m** · 1 kg = **1,000 g** · 1 L = **1,000 mL** · 1 hour = **60 minutes**.\nBig unit → small unit: **multiply**. Small → big: **divide**.',
  'Statistics': '**Median** = the middle number after you put them in order.\n**Mean** = average. **Mode** = the number that shows up most.',
  'Time': 'Count the **whole hours** first, then the **extra minutes**.',
  // Analytical
  'Letter Series': 'Write the alphabet with numbers: A=1, B=2, C=3 ... Z=26. Then find the **jump** between letters.',
  'Coding-Decoding': 'Compare the word and its code **letter by letter**. Find the rule (how many steps forward or back), then use the same rule.',
  'Logic (Syllogism)': 'Draw circles (a **Venn diagram**). "All A are B" = circle A inside circle B.\n!!Do not flip it!!: "All A are B" does **not** mean "All B are A".',
  'Logic': 'Only use what the question **says**. Line things up in order (tallest → shortest) or draw a quick picture.',
  'Directions': 'Draw a cross: **N up, S down, E right, W left**.\nTurn **right** = clockwise (N → E → S → W). Turn **left** = the other way.',
  'Ranking': 'Position from the right = **total − position from the left + 1**.',
  'Calendar': 'Every **7 days** the day repeats. Divide by 7 and only count the **remainder**.',
  'Data Interpretation': 'Read the numbers carefully, write them down, then do **one operation at a time**.',
  'Classification': 'Find what **most** of the choices have in common. The one that does not have it is the answer.',
  'Number Analogy': 'Find the rule in the **first pair** (×, +, square, cube), then use the **same rule** on the second.',
  'Blood Relations': 'Draw a small **family tree**. Start from the person speaking and go one step at a time.',
  'Assumptions': 'An assumption is what the speaker **believes without saying it**. Ask: "What must be true for this plan to make sense?"',
  'Word Analogy': 'Make a sentence for the first pair (e.g. "A **puppy** is a young **dog**"), then test each choice with the **same sentence**.',
  // Clerical
  'Alphabetical Filing': 'File by **surname first**, then first name. Compare letter by letter.\nPrefixes like **De, Dela, Del** are read as one word (DELACRUZ).',
  'Checking Names': 'Point at each letter with your finger and **compare one by one**. Watch for i/l, n/m, a/e.',
  'Checking Addresses': 'Check the **numbers first**, then each word, letter by letter.',
  'Checking Numbers': 'Compare in **small groups** (3–4 digits at a time).',
  'Checking Lists': 'Go pair by pair and **mark** each pair that is different.',
  'Checking Dates': 'MM/DD/YYYY = **month / day / year**. January = 01, December = 12.',
  'Spelling': 'Say the word slowly in parts (syllables). Watch for **double letters** and **ie / ei**.',
  'Numerical Filing': 'Lowest to highest: compare the **first digit**, then the next, then the next.',
  'Coding': 'Find the name in the list, then read the code **right beside it**.',
  // Verbal
  'Grammar': 'One thing (**singular**) → is, was, has, -s verb. Many (**plural**) → are, were, have.\nFind the **real subject** first; ignore phrases like "of the ...", "along with ...".',
  'Error Identification': 'Read each part and ask: does the **verb match the subject**? Is the **word form** right (taller, not more taller)?',
  'Sentence Completion': 'Look for **clue words**: "because / so" = same idea; "but / yet / despite / however" = **opposite** idea.',
  'Idioms': 'An idiom does **not** mean what the words say. Learn the **whole meaning** like a new word.',
  'Vocabulary (Synonym)': '**Synonym** = same meaning. Try each choice in place of the word in a sentence.',
  'Vocabulary (Antonym)': '**Antonym** = opposite meaning. A choice with the **same** meaning is a trap.',
  'Reading Comprehension': 'The answer is **in the passage**. Find the line that proves it.\nMain idea = what the **whole** passage is about, not one detail.',
  'Paragraph Organization': 'Find the **first** sentence (it introduces the topic). Then follow clue words: **First → Next → Then → Finally**.',
  'Talasalitaan (Filipino)': '**Kasingkahulugan** = parehong kahulugan. **Kasalungat** = baligtad na kahulugan.',
  'Wastong Gamit (Filipino)': '**nang** = paano ginawa (tumakbo nang mabilis). **ng** = bago ang pangngalan (bumili ng bigas).\n**raw/rin** pagkatapos ng patinig (a, e, i, o, u); **daw/din** pagkatapos ng katinig.',
  'Pag-unawa sa Binasa': 'Nasa **talata** ang sagot. Hanapin ang pangungusap na nagpapatunay nito.',
  // General Information
  '1987 Constitution': 'Remember the big ones: **Art. II** principles · **Art. III** Bill of Rights · **Art. VI** Congress · **Art. VII** President · **Art. VIII** courts · **Art. IX** CSC, COMELEC, COA · **Art. XI** accountability.',
  'RA 6713': 'RA 6713 = the **Code of Conduct** for government workers: honest, fair, polite, quick to serve, and **no gifts** for their work.',
  'Philippine Laws': 'Link the law **number** to a picture in your mind (e.g. RA **9003** = waste segregation, RA **10173** = data privacy).',
  'Human Rights': 'Human rights belong to **every person**, just for being human. The **CHR** watches over them.',
  'Environment': 'Think **reduce, reuse, recycle**. Each environment law protects one thing: air, water, waste, forests or animals.',
  'Philippine Government': 'Three branches: **Legislative** makes laws, **Executive** carries them out, **Judiciary** decides cases.',
  'Philippine History': 'Connect each event to its **date and hero**. Making a short timeline helps.',
  'Philippine Geography': 'The Philippines has **three main island groups**: Luzon, Visayas, Mindanao.',
  'Peace and Security': 'Peace work means **talking and agreeing** (dialogue), not fighting.',
};

// A built-in question is found by its subject, question, passage AND correct answer. Many questions share the
// same words (e.g. "Piliin ang wastong pangungusap." or "Which word does NOT belong to the group?"), so the
// question alone is not enough: it used to give one of them the other's explanation.
const keyOf = (s, q, p, a) => `${s}|${q}|${p || ''}|${a}`;
const BANK = new Map(QUESTIONS.map((x) => [keyOf(x.s, x.q, x.p, x.a), x.e]));
const hasNote = (e) => /(^|\n)Quick Note:/.test(e);

// The explanation to show for an item: the newest text for built-in questions, plus the topic's Quick Note.
// Only items from the built-in bank (source "seed", or older saved items without a source) are looked up;
// generated and admin questions keep their own explanation.
function full(it) {
  let e = String(it.explanation || '');
  if ((it.source === 'seed' || it.source == null) && Array.isArray(it.choices)) {
    e = BANK.get(keyOf(it.subject, it.question, it.passage, it.choices[it.answer])) ?? e;
  }
  const tip = TIPS[it.topic];
  if (tip && !hasNote(e)) e = (e ? e + '\n' : '') + 'Quick Note: ' + tip;
  return e;
}

// Free plan past today's full solutions: only the Quick Note is shown (the steps are for Premium).
const noteOnly = (e) => { const i = String(e).search(/(^|\n)Quick Note:/); return i < 0 ? '' : String(e).slice(i).replace(/^\n/, ''); };

module.exports = { TIPS, full, noteOnly };
