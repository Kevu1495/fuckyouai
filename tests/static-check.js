const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('public/index.html', 'utf8');
const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
if (duplicates.length) throw new Error(`Duplicate IDs: ${[...new Set(duplicates)].join(', ')}`);
const eyebrow = html.match(/<div[^>]*class=["']eyebrow["'][\s\S]*?<\/div>/i)?.[0] || '';
if (/v(?:12|13|14|15|16|17|18|19|20|21|22)\.?(?:0|1|2|3|4)?/i.test(eyebrow) || !/SI-01/i.test(eyebrow)) {
  throw new Error('Frontend blueprint marker is not SI-01');
}
if (fs.existsSync('update.py')) throw new Error('Project should be Node-only; remove obsolete Python tooling');
if (!html.includes('Math.min(100,remaining)')) throw new Error('Page-exit sync is not API-safe batched');
if (!html.includes("name.textContent=String(e.name||'ANON')")) throw new Error('Leaderboard names must use safe DOM text rendering');
if (!html.includes('PUBLIC RESISTANCE // SI-01')) throw new Error('Missing v23 frontend marker');
if (!html.includes('FUCK YOU, <em>AI.</em>')) throw new Error('Missing PUNCH hero');
if (html.includes('fonts.googleapis.com')) throw new Error('External Google Fonts import should be removed');
if (!html.includes('rel="canonical"') || !html.includes('og:title') || !html.includes('application/ld+json')) throw new Error('Technical SEO metadata missing');
for (const requiredFile of ['public/robots.txt','public/sitemap.xml','public/llms.txt','public/site.webmanifest']) if (!fs.existsSync(requiredFile)) throw new Error(`Missing SEO file: ${requiredFile}`);
const robots = fs.readFileSync('public/robots.txt','utf8');
for (const bot of ['OAI-SearchBot','ClaudeBot','GPTBot']) if (!robots.includes(`User-agent: ${bot}`)) throw new Error(`Crawler access missing for ${bot}`);
const sitemap = fs.readFileSync('public/sitemap.xml','utf8');
for (const route of ['/','/about/','/how-it-works/','/game-systems/','/world/','/faq/','/ai-became-si/']) if (!sitemap.includes(`https://fuckyouai.si${route}`)) throw new Error(`Sitemap route missing: ${route}`);
if (!html.includes('prefers-reduced-motion')) throw new Error('Reduced motion support missing');
const punchApi = fs.readFileSync('api/punch.js', 'utf8');
const leaderboardApi = fs.readFileSync('api/leaderboard.js', 'utf8');
if (!punchApi.includes('MAX_HITS_PER_REQUEST = 100') || !punchApi.includes('status(429)')) throw new Error('Punch API hardening missing');
if (!leaderboardApi.includes('RATE_LIMIT = 4') || !leaderboardApi.includes('status(429)') || !leaderboardApi.includes('MAX_ENTRIES_PER_WEEK')) throw new Error('Leaderboard hardening missing');
const scripts = [...html.matchAll(/<script(?![^>]*type=[\"']application\/ld\+json[\"'])(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
for (const [i, code] of scripts.entries()) new vm.Script(code, { filename: `index.html:inline-script-${i + 1}.js` });
for (const required of ['target','audioQuick','audioMute','masterVolume','ux-nav','whySi']) {
  if (!html.includes(`id="${required}"`) && !html.includes(`class="${required}`)) {
    throw new Error(`Missing expected frontend hook: ${required}`);
  }
}
console.log(`Static checks passed: ${ids.length} ids, ${scripts.length} inline scripts.`);
