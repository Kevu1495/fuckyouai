# fuckyouai.si clicker v23.1

PUNCH-first redesign of the feature-rich clicker: a deliberately simple internet toy on the surface with progressive game systems underneath.

## v22.4 release candidate
- PUNCH / BUILD / WORLD / CHAOS / Settings information architecture.
- Punch-first mobile layout, editorial/arcade visual system, reduced-motion support, and localization-ready copy.
- Progressive disclosure keeps advanced systems available without overwhelming first-time players.
- No external font dependency; frontend uses system typography for faster, more resilient loading.
- Wide-screen usability pass for 80%/90%/100% browser zoom and large displays.
- Dedicated secondary workspaces for BUILD, WORLD, CHAOS and Settings.
- Production-oriented security headers and deployment checks.

## v17–v20 features
- Social challenge relay codes and anonymous weekly leaderboard.
- Quarterly seasons, XP/ranks, milestone rewards, and local season archive.
- Deterministic daily world anomalies with gameplay effects and local history.
- Singularity endgame meter, lifetime records, retraining/build paths, and share card.

## v21 hardening
- Node-only project and QA workflow; no Python dependency.
- Playwright desktop + mobile smoke coverage.
- Static validation for duplicate IDs, inline-script syntax, required hooks, stale version labels, and obsolete Python tooling.
- Global punch endpoint rate limiting and bounded request sizes.
- Leaderboard write rate limiting, input sanitization, and indexed weekly ranking queries.
- Safer leaderboard DOM rendering without injecting stored player names as HTML.
- Page-exit sync batches pending global impacts in API-safe chunks.
- Offline/reconnect, navigation, audio persistence, and endgame surfaces remain covered by smoke tests.

## MongoDB setup

Create production indexes once (not during public API requests):

```powershell
npm run setup:indexes
```

The leaderboard is intentionally a comedic chaos board. It is bounded to 500 active weekly entries and expires temporary entries after 14 days.

## Deploy
```powershell
npm install
vercel --prod
```

Keep the existing `MONGODB_URI` Vercel environment variable. No manual MongoDB collection creation is required.

## Automated QA
Install dependencies and Chromium once:

```powershell
npm install
npx playwright install chromium
```

Run the full suite:

```powershell
npm test
```

Run only static checks:

```powershell
npm run test:static
```

Run headed browser tests:

```powershell
npm run test:headed
```

The Playwright suite mocks `/api/punch` and `/api/leaderboard`, so browser tests do not modify production MongoDB data.


## v23.1 icon system implementation

This release keeps the v22.4 game engine, API routes, persistence model, navigation, accessibility hooks, and test suite intact while applying the new FUCKYOUAI.SI visual direction: 1990s rage-web + punk propaganda + fake government bureaucracy + arcade machine + brutalist web. The PUNCH screen is now the visual hero; secondary systems remain progressively disclosed through BUILD / WORLD / CHAOS / Settings.

Visual changes include hard borders, rectangular controls, acid-lime action color, red destruction state, technical mono labels, hazard-strip machine treatment, oversized global damage counter, tactile press states, reduced-motion handling, and removal of the previous glassmorphism/soft-gradient feel.

No production credentials are included.


### v23.1 icons
- Integrated the approved FUCKYOUAI.SI icon system across navigation and the PUNCH machine.
- Added local PNG/SVG icon assets and favicon family.
- Preserved existing game IDs, API routes, state model, and Playwright hooks.
- Canonical reference sheet: `docs/icon-system-reference.png`.


## v23.3 PUNCH hero fix
The PUNCH view now uses a full-width hero machine layout: the arcade machine is the dominant interactive element, stats sit below it, and automation sits below the stats. Responsive sizing keeps the machine and punch mark usable on desktop and mobile.

## v24.0 SEO + AI discovery

This release adds a crawlable discovery layer without changing the game mechanics:

- canonical, robots, Open Graph and Twitter metadata on the main game
- JSON-LD for the website/game entity and FAQ structured data
- dedicated, human-readable pages at `/about/`, `/how-it-works/`, `/game-systems/`, `/world/`, `/faq/`, and `/ai-became-si/`
- `robots.txt` that permits OAI-SearchBot, ClaudeBot, GPTBot and Google-Extended while excluding `/api/`
- `sitemap.xml`
- optional `llms.txt` factual index for LLM-oriented discovery
- web manifest
- crawlable footer links between the game and informational pages
- static smoke-server support for directory index pages

### Search-engine submission still required

Code alone cannot guarantee a top ranking or AI citation. After deployment, add `https://fuckyouai.si/` to Google Search Console and Bing Webmaster Tools, submit `https://fuckyouai.si/sitemap.xml`, and inspect crawl/indexing status. Bing Webmaster Tools can also expose AI citation/grounding-query activity and supports IndexNow for faster change discovery.

Do not add a fake verification token to the source. Add the verification value supplied by the relevant webmaster console only after you receive it.
