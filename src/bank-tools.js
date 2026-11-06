// Small helpers for the bigger written question banks (1.45.0).
// The banks are built from word and fact lists that were written by hand. Every pick here uses a fixed seed,
// so the same list always gives the same questions (the bank version only changes when a list changes).

// A small seeded random number generator (mulberry32).
function rng(seed) {
  let a = typeof seed === 'number' ? seed : [...String(seed)].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Shuffle with a seed (same seed, same order).
function sshuffle(arr, seed) {
  const r = rng(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Up to n items of list that pass ok(), in a seeded order, all different.
function pickSome(list, n, seed, ok = () => true) {
  const out = [];
  for (const x of sshuffle(list, seed)) {
    if (out.length >= n) break;
    if (ok(x) && !out.includes(x)) out.push(x);
  }
  return out;
}

// Splits a compact table: one row per line, columns split by "|", empty lines and "#" comments skipped.
const rows = (text) => text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => l.split('|').map((c) => c.trim()));

const fmt = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
const peso = (n) => '₱' + fmt(n);

module.exports = { rng, sshuffle, pickSome, rows, fmt, peso };
