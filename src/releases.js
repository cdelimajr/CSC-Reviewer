// The newest app installers (Android .apk and Windows .exe) from the latest GitHub Release.
// The "Build apps" workflow publishes them there, and the Windows app updates itself from the same place.
// Only .apk and .exe files are given out (no .ipa, .blockmap or latest.yml).
//   GITHUB_REPO  - owner/name of the repository (default cdelimajr/CSC-Reviewer)
//   GITHUB_TOKEN - optional, only for a higher GitHub API limit (60 calls an hour without it)
const REPO = process.env.GITHUB_REPO || 'cdelimajr/CSC-Reviewer';
const API = (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '');
const KEEP_MS = 10 * 60e3; // ask GitHub at most once every 10 minutes

let cache = null; // { at, data }

const kindOf = (name) => (/\.apk$/i.test(name) ? 'apk' : /setup.*\.exe$/i.test(name) ? 'setup' : /portable.*\.exe$/i.test(name) ? 'portable' : /\.exe$/i.test(name) ? 'exe' : null);
const ORDER = { apk: 0, setup: 1, portable: 2, exe: 3 };

// Shape a GitHub release into what the app and the email need.
function shape(rel) {
  const files = (rel.assets || [])
    .map((a) => ({ kind: kindOf(a.name || ''), name: a.name, size: a.size || 0, url: a.browser_download_url }))
    .filter((f) => f.kind && /^https:\/\//.test(f.url || ''))
    .sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);
  return { version: String(rel.tag_name || '').replace(/^v/, ''), published_at: Date.parse(rel.published_at || '') || 0, page: rel.html_url || '', files };
}

// The latest release, or null when GitHub cannot be reached (an old copy is used when there is one).
async function latest() {
  if (cache && Date.now() - cache.at < KEEP_MS) return cache.data;
  try {
    const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'cse-reviewer' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const r = await fetch(`${API}/repos/${REPO}/releases/latest`, { headers, signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error(`GitHub ${r.status}`);
    const data = shape(await r.json());
    cache = { at: Date.now(), data };
    return data;
  } catch (e) {
    if (process.env.NODE_ENV !== 'test') console.error('Latest release check failed:', e.message);
    return cache ? cache.data : null;
  }
}

// For tests: use this release instead of asking GitHub.
const _set = (rel) => { cache = rel ? { at: Date.now(), data: shape(rel) } : null; };

module.exports = { latest, shape, _set, REPO };
