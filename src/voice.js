// Read aloud with the owner's own ElevenLabs voice ("Conrado").
// - Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID on the server (never in the app). Optional: ELEVENLABS_MODEL.
// - Each audio made is saved (tts_cache, by a hash of voice + model + text), so the same question is paid for
//   only once, for every user. Saved audio older than 180 days and not played is deleted.
// - Premium makes new audio (up to DAILY_CHARS a day per account). Free hears only audio that is already saved;
//   the app reads the rest with the device's own voice. No key = the app uses the device's voice for everyone.
const crypto = require('node:crypto');
const db = require('./db');

const KEY = (process.env.ELEVENLABS_API_KEY || '').trim();
const VOICE_ID = (process.env.ELEVENLABS_VOICE_ID || '').trim();
const MODEL = (process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2').trim();
const NAME = (process.env.ELEVENLABS_VOICE_NAME || 'Conrado').trim().slice(0, 40);
const MAX_TEXT = 2500;
const DAILY_CHARS = Math.max(0, Number(process.env.ELEVENLABS_DAILY_CHARS) || 20000);
const enabled = () => !!(KEY && VOICE_ID);

const SCHEMA = `CREATE TABLE IF NOT EXISTS tts_cache (
  hash TEXT PRIMARY KEY,
  audio BLOB NOT NULL,
  chars INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  used_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS tts_usage (
  user_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  chars INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);`;
let ready = null;
const init = () => (ready = ready || (async () => { for (const s of SCHEMA.split(';').map((x) => x.trim()).filter(Boolean)) await db.run(s); })());

const clean = (t) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
const hashOf = (text) => crypto.createHash('sha256').update(`${VOICE_ID}|${MODEL}|${text}`).digest('hex');
const phDay = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);

// Calls in progress, so two users asking for the same new text pay once.
const pending = new Map();
async function make(text) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(VOICE_ID)}?output_format=mp3_44100_64`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.8 } }),
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) {
    let msg = ''; try { msg = (await r.text()).slice(0, 200); } catch { /* ignore */ }
    const e = new Error(`ElevenLabs ${r.status} ${msg}`); e.status = r.status; throw e;
  }
  return Buffer.from(await r.arrayBuffer());
}

// Returns { audio: Buffer } or { error, status, code }.
async function speak(user, rawText, premium) {
  if (!enabled()) return { status: 404, code: 'off', error: 'Off' };
  const text = clean(rawText);
  if (!text) return { status: 400, error: 'Walang babasahin.' };
  await init();
  const hash = hashOf(text);
  const row = await db.get('SELECT audio FROM tts_cache WHERE hash = ?', hash);
  if (row) {
    db.run('UPDATE tts_cache SET used_at = ? WHERE hash = ?', Date.now(), hash).catch(() => {});
    return { audio: Buffer.from(row.audio) };
  }
  if (!premium) return { status: 402, code: 'premium', error: 'Premium' };
  const day = phDay();
  const used = await db.get('SELECT chars FROM tts_usage WHERE user_id = ? AND day = ?', user.id, day);
  if (user.role !== 'admin' && DAILY_CHARS && (used ? used.chars : 0) + text.length > DAILY_CHARS) return { status: 429, code: 'quota', error: 'Quota' };
  let job = pending.get(hash);
  if (!job) {
    job = make(text).then(async (audio) => {
      const now = Date.now();
      await db.run('INSERT OR IGNORE INTO tts_cache (hash, audio, chars, created_at, used_at) VALUES (?, ?, ?, ?, ?)', hash, audio, text.length, now, now);
      await db.run('INSERT INTO tts_usage (user_id, day, chars) VALUES (?, ?, ?) ON CONFLICT(user_id, day) DO UPDATE SET chars = chars + excluded.chars', user.id, day, text.length);
      return audio;
    }).finally(() => pending.delete(hash));
    pending.set(hash, job);
  }
  try { return { audio: await job }; } catch (e) {
    console.error('[voice]', e.message);
    return { status: 502, code: 'failed', error: 'Failed' };
  }
}

// Old audio nobody played for 180 days, and usage counts older than 40 days, are deleted (daily job).
async function cleanup() {
  if (!ready) return;
  await db.run('DELETE FROM tts_cache WHERE used_at < ?', Date.now() - 180 * 864e5);
  await db.run('DELETE FROM tts_usage WHERE day < ?', new Date(Date.now() - 40 * 864e5).toISOString().slice(0, 10));
}

module.exports = { enabled, speak, cleanup, init, NAME, MAX_TEXT, _hashOf: hashOf };
