// English <-> Filipino translation for the Translator screen (public/app.js).
// - With GOOGLE_TRANSLATE_API_KEY: Google Cloud Translation (best quality, paid after the free 500,000 characters a month).
// - Without it: MyMemory (free, no key; about 5,000 characters a day, or 50,000 with MYMEMORY_EMAIL).
// Answers are kept in memory, so the same text is not translated twice.
const GOOGLE_KEY = process.env.GOOGLE_TRANSLATE_API_KEY || '';
const MYMEMORY_EMAIL = process.env.MYMEMORY_EMAIL || '';
const MAX = 1000;
const LANGS = new Set(['en', 'fil']);
const cache = new Map();

// Google and MyMemory call Filipino "tl".
const code = (l) => (l === 'fil' ? 'tl' : l);

// MyMemory takes up to 500 bytes per request, so long text goes in sentence-sized pieces.
function pieces(text, max = 450) {
  const out = [];
  let cur = '';
  for (const s of text.split(/(?<=[.!?…\n])\s+/)) {
    if ((cur + ' ' + s).length > max && cur) { out.push(cur); cur = ''; }
    if (s.length > max) { for (let i = 0; i < s.length; i += max) out.push(s.slice(i, i + max)); continue; }
    cur = cur ? cur + ' ' + s : s;
  }
  if (cur) out.push(cur);
  return out;
}

const decode = (s) => String(s).replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

async function google(text, from, to) {
  const r = await fetch('https://translation.googleapis.com/language/translate/v2?key=' + encodeURIComponent(GOOGLE_KEY), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(8000),
    body: JSON.stringify({ q: text, source: code(from), target: code(to), format: 'text' }),
  });
  const d = await r.json().catch(() => null);
  const t = d && d.data && d.data.translations && d.data.translations[0];
  if (!r.ok || !t) throw new Error('google ' + r.status);
  return decode(t.translatedText);
}

async function mymemory(text, from, to) {
  const out = [];
  for (const p of pieces(text)) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(p)}&langpair=${code(from)}|${code(to)}${MYMEMORY_EMAIL ? '&de=' + encodeURIComponent(MYMEMORY_EMAIL) : ''}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d || Number(d.responseStatus) !== 200 || !d.responseData) throw new Error('mymemory ' + (d && d.responseStatus));
    out.push(decode(d.responseData.translatedText));
  }
  return out.join(' ');
}

async function translate(text, from, to) {
  text = String(text || '').trim().slice(0, MAX);
  if (!text) return { text: '', provider: '' };
  if (!LANGS.has(from) || !LANGS.has(to) || from === to) throw Object.assign(new Error('English at Filipino lang ang pwede.'), { status: 400 });
  const key = `${from}|${to}|${text}`;
  if (cache.has(key)) return cache.get(key);
  let res;
  if (GOOGLE_KEY) {
    try { res = { text: await google(text, from, to), provider: 'Google' }; } catch (e) { console.error('translate:', e.message); }
  }
  if (!res) res = { text: await mymemory(text, from, to), provider: 'MyMemory' };
  cache.set(key, res);
  if (cache.size > 2000) cache.delete(cache.keys().next().value);
  return res;
}

module.exports = { translate, MAX, enabled: true, provider: GOOGLE_KEY ? 'Google' : 'MyMemory', pieces };
