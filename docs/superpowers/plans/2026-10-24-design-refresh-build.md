# Design Refresh Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the site's Nothing-OS design with the approved refresh: new chrome, fonts and tokens, and rebuilt Home, Projects, Project, About and Contact pages, each matching its mockup.

**Architecture:** Pages stay server components that own the copy and data; each interactive piece is a small client component. Every three.js scene is ported from its mockup as a plain TypeScript module exporting a `mount...()` function that returns a dispose; the client component dynamically imports it inside `useEffect`, so three.js never runs on the server and never blocks content. Component styles are CSS Modules ported from the mockup CSS (a deliberate change from inline Tailwind, recorded in CLAUDE.md in Task 8); tokens live in `src/styles/tokens.css`.

**Tech Stack:** Next.js 16.2.2 (App Router), React 19.2, TypeScript strict, three ^0.183 (installed), GSAP page transitions (kept), CSS Modules, `node --test` for unit tests, Playwright (installed) for end-to-end checks.

**Spec:** `docs/superpowers/specs/2026-10-24-design-refresh-design.md`, with the four mockups in `docs/superpowers/specs/2026-10-24-design-refresh/` (`home.html`, `projects.html`, `about.html`, `contact.html`) as the visual source of truth. Mockup media is in `.design-preview/` (git-ignored).

## Global Constraints

- Next 16 is not the Next in training data: read the matching guide in `node_modules/next/dist/docs/` before using any Next API you have not seen in this repo (AGENTS.md). Follow this repo's existing patterns (`params` and `searchParams` are Promises; `export const dynamic = "force-dynamic"` on pages that read the usage DB).
- No new runtime dependencies. three.js imports come from `three` and `three/addons/...`.
- Fonts via `next/font/google`: `Big_Shoulders` (variable, `--font-display`) and `Schibsted_Grotesk` (400, 500, 600, italic 400, `--font-text`). Drop Space Grotesk, Space Mono and Instrument Serif.
- Tokens: `--bg #000000`, `--day #0b1d33`, `--ink #f1f2f3`, `--ink-2 #a9b0b9`, `--ink-3 #6b727c`, `--line rgba(255,255,255,0.14)`, `--amber #ffc24d`, `--err #ff8a7a`, `--ease cubic-bezier(0.22, 1, 0.36, 1)`, gutters `--gl/--gr` = max(16px, safe-area) under 720px and max(32px, safe-area) from 720px. Blueprint scope (about) and day shift override per the mockups.
- Every three.js module: catches renderer creation and hides its canvas on failure; caps pixel ratio at 1.5; pauses when off screen or the tab is hidden; respects `prefers-reduced-motion` exactly as its mockup does; and its dispose cancels the animation frame, disconnects observers, removes listeners, disposes geometries, materials, render targets and composer, then calls `renderer.dispose()` and `renderer.forceContextLoss()`.
- Canvases are decoration: `aria-hidden="true"`, with the content they illustrate present as DOM text. All copy renders with JavaScript off.
- Copy is taken verbatim from the mockups, except the day-job line on Home and About: "Day job: Senior GTM Engineer, AI, at a healthcare SaaS company." No em dashes in copy, comments or commit messages.
- Unit tests: `node --test` (Node 23 strips types). Modules under test are pure: relative imports with the `.ts` extension, `import type` for types, no `@/` alias and no `server-only`. `tsconfig.json` gets `"allowImportingTsExtensions": true` (it already has `noEmit`).
- End-to-end checks run against a production build (`npm run build && npm run start`; Turbopack dev has a stray-lockfile cache problem on this machine). Desktop viewport 1440x900, phone 390x844. Every route checked must log no page errors and no console errors, and at 390px `document.documentElement.scrollWidth <= innerWidth`.
- After each task: compare the page against its mockup in Chrome at desktop width and in a 390px frame before committing.
- Commits: `feat(scope): ...` style as in `git log`, one per task, ending with the session attribution lines.

## Execution (parallel, decided 2026-10-24)

Tasks 1 and 2 run first, in order, on `worktree-design-refresh`. Then four agents run at once, each in its own git worktree on its own branch cut from `worktree-design-refresh`:
- `refresh-projects`: Tasks 3 and 4
- `refresh-contact`: Task 5
- `refresh-about`: Task 6
- `refresh-home`: Task 7

Each serves its production build on its own port: projects 3101, contact 3102, about 3103, home 3104. One agent then merges the four branches and does Task 8, a fresh reviewer runs Task 9 Step 1, and a fix agent applies the confirmed findings.

Rules for the parallel tasks:
- Edit only the files your task lists. If a shared file (`tokens.css`, `globals.css`, `layout.tsx`, `package.json`, `src/data/projects.ts`, `src/lib/three/glow.ts`, `src/lib/activity.ts`, `src/components/site/*`) truly needs a change, make the smallest edit and list it in your report.
- Check groups live in separate files (`scripts/checks/<group>.mjs`), so parallel tasks never edit the same check file.
- Mockup media is git-ignored. Read it from the `design-refresh` worktree's `.design-preview/` by absolute path.

## Review Focus

- **The contact checks must never send real email.** Every e2e run intercepts `POST /api/contact`; an unexpected request to it fails the run. (Task 5)
- **WebGL off or JavaScript off:** every page stays fully readable, with no page errors, and entrance animations never leave content invisible. (Tasks 1, 3 and 7 add `--disable-3d-apis` and no-JS runs; Task 8 updates the resilience check.)
- **Moving between pages over and over** must not pile up WebGL contexts: ten loops of Home, Projects, About, Contact via the top bar log no "Too many active WebGL contexts" or context-lost warnings. (Task 7)
- **The shift survives reload and Back:** `/projects?shift=night` loads the night set; opening a night project and pressing Back returns to night. (Task 3)
- **No live data** (empty usage DB, no `GITHUB_TOKEN`, which is the local default): Home and About render without errors and simply leave out the missing figure. (Tasks 6 and 7)

---

### Task 1: Site chrome, tokens, fonts and the check harness

**Files:**
- Create: `scripts/check-site.mjs`, `scripts/checks/chrome.mjs`, `src/components/site/SiteHeader.tsx`, `src/components/site/SiteHeader.module.css`, `src/components/site/SiteFooter.tsx`, `src/components/site/SiteFooter.module.css`, `src/components/site/PlatformIcon.tsx`, `src/lib/three/glow.ts` (interface under Task 3; built here so Tasks 3 and 5 share it)
- Modify: `src/styles/tokens.css` (new tokens, plus the old names as aliases until Task 8), `src/app/globals.css`, `src/app/layout.tsx` (fonts; render `SiteHeader` and `SiteFooter`; stop rendering `ExpandingMenu` and `Footer`), `package.json` (scripts `"test": "node --test \"src/**/*.test.ts\""` and `"check:site": "node scripts/check-site.mjs"`), `tsconfig.json`

**Interfaces:**
- Produces: `node scripts/check-site.mjs [baseUrl=http://localhost:3000] [group...]`. It loads every `scripts/checks/*.mjs`, where the file name is the group name and the default export is `async ({ launch, base, helpers }) => void`. It runs the named groups, or all of them, and exits 1 if any group throws. A group's failure message names the route.
- Produces: helpers exported from `scripts/check-site.mjs`:
  - `openPage(url, { phone?, js?, webgl?, reducedMotion? })` returns `{ page, errors }`. `webgl: false` launches Chromium with `--disable-3d-apis`. `errors` collects page errors and console errors.
  - `assertNoOverflow(page)`
  - `expectNoErrors(errors, route)`
  - The group files import these helpers.
- Produces: `<PlatformIcon name="github" | "linkedin" | "x" | "email" className? />`, using the four SVGs from `about.html`'s Connections.
- Produces: `SiteHeader` with nav links `/projects`, `/about`, `/contact` and the mark linking `/`, all through `TransitionLink` from `@/transitions`.

- [ ] **Step 1: Write the `chrome` check group.** On `/`, `/projects`, `/about`, `/contact` at desktop: header has a link to `/` with text "Mazza Builds" and links with text Projects, About and Contact. At phone: those three links are not visible; a button named "Menu" with `aria-expanded="false"`. Clicking it gives `aria-expanded="true"` and a dialog with links Home, Projects, About and Contact. Escape closes it and focus returns to the Menu button. The footer contains `mailto:hello@mazzabuilds.com` and a link to `/privacy`. Run the generic error and overflow assertions on every route.
- [ ] **Step 2: Run it and watch it fail.** `npm run build && npm run start &` then `node scripts/check-site.mjs http://localhost:3000 chrome`. Expected: FAIL, "Menu button not found on /".
- [ ] **Step 3: Implement tokens, fonts, header, footer and layout wiring.** The bar copies `.bar` and `.mark` from the mockups. Desktop links are display font, uppercase, 15px, `--ink-2`, `--ink` on hover, no underline. The phone menu is a fixed full-screen `role="dialog"` `aria-modal="true"`: links at clamp(48px, 14vw, 72px) display type with a staggered rise, Close button top right, body scroll locked with `lockOverflow`/`unlockOverflow` from `@/lib/overflow-lock`, and it closes on route change. Bar and footer backgrounds are `var(--bg)`, so pages that change `--bg` (the projects day shift) colour them too.
- [ ] **Step 4: Run the check and watch it pass.** Same command. Expected: `chrome: OK`, exit 0.
- [ ] **Step 5: Commit.** `feat(site): new chrome, fonts and tokens for the design refresh`

### Task 2: Project data for the new design

**Files:**
- Modify: `src/data/projects.ts`
- Create: `src/data/projects.test.ts`, `public/projects/<slug>/stencil.png` for the 12 slugs in `.design-preview/projects-v2/media/marks/`
- Create (shared by Tasks 6 and 7, built here so they never collide): `src/lib/activity.ts`, `src/lib/activity.test.ts`, `src/components/site/Heatmap.tsx`. Their interfaces and tests are written under Task 6. Write those tests here, in this task's Step 1.
- Copy into `public/projects/<slug>/` only the mockup media that has no original there (for example `distill/poster.jpg`); otherwise point at the existing original.

**Interfaces:**
- Produces in `src/data/projects.ts`:
  - `export type Half = "day" | "night"`
  - `export type Bento = "xl" | "wide" | "tall" | "sm"`
  - `Project` gains `half`, `kind`, `line`, `what`, `why`, `impact`, `stat?: [string, string]`, `fill`, `markColor`, `textColor`, `bento`, `markScale?: number` (Daily Roman 0.58), `mark: { type: "stencil"; src: string } | { type: "vector"; viewBox: string; paths: string[] } | { type: "icon"; name: "web-tracker-scanner" | "kalshi-trader" | "kalshi-mcp" | "shakedown" }`, `image?`, `video?` and `poster?`. It keeps `slug`, `name`, `tags`, `context`, `build`, `result` and `links`. All values come from `P` in `projects.html`; the SecondRound vector comes from `VECTORS`.
  - Keep every existing field for now, so the old pages keep compiling while the new ones replace them. Task 8 removes the old fields.
  - `export function projectsByHalf(half: Half): Project[]` returns mockup order.
  - `export function nextProject(slug: string): Project` follows day order then night order, and the last night project wraps to the first day project.
  - `getProjectBySlug` is unchanged.

- [ ] **Step 1: Write `src/data/projects.test.ts`.** Tests:
  - `projects has 16 entries with unique slugs`
  - `day order is distill, web-tracker-scanner, pipeline-attribution, event-hub, vendor-fingerprint, trailmix, persona-automator, semrush-enricher, event-attributor` (the order of `P` in `projects.html`)
  - `night order is secondround, daily-roman, kalshi-trader, shopify-app, shakedown, kalshi-mcp, f1-globe`
  - `story strings are non-empty and contain no em dash`
  - `every stencil, image, video and poster path exists under public/`
  - `each half fills whole bento rows`: cells are xl 4, wide 2, tall 2, sm 1, and each half's sum is 16
  - `nextProject walks all 16, crosses from event-attributor to secondround, and wraps from f1-globe to distill`
- [ ] **Step 2: Run it and watch it fail.** `npm test`. Expected: FAIL, `projectsByHalf is not a function`.
- [ ] **Step 3: Update the data and copy the stencils.**
- [ ] **Step 4: Run it and watch it pass.** `npm test` passes the project tests and the activity tests, and `npm run build` is clean.
- [ ] **Step 5: Commit.** `feat(projects): plain-language story data, halves and stencils`

### Task 3: Projects page (bento, shift switch, particle sun and moon)

**Files:**
- Modify: `src/app/projects/page.tsx` (reads `searchParams.shift`; `night` if it equals "night", else `day`)
- Create in `src/components/projects/`: `ProjectsBoard.tsx` (client: switch state, grid, stagger), `ProjectsBoard.module.css`, `BentoTile.tsx`, `ProjectMark.tsx` (stencil, vector or icon; the icon SVGs come from `ICONS` in `projects.html`), `ShiftSky.tsx`, `sky.ts`
- Create: `src/components/site/RollText.tsx` (the letter roll from `projects.html` `.w/.f/.i`, also used on project pages). `src/lib/three/glow.ts` already exists from Task 1.

**Interfaces:**
- Consumes: `projectsByHalf`, `Half`, and the `Project` fields from Task 2.
- Produces: `createGlowComposer(renderer: WebGLRenderer, scene: Scene, camera: Camera, opts?: { strength?: number; radius?: number; threshold?: number; edgeFade?: boolean }): EffectComposer`. It runs RenderPass, then UnrealBloomPass with `bloomFactors [1, 0.75, 0.4, 0, 0]`, then OutputPass, then the clip pass `max(c - 0.04, 0) / 0.96`. With `edgeFade` it also multiplies by `smoothstep(0, 0.16, uv) * smoothstep(1, 0.84, uv)`. Defaults are 0.6, 0.18 and 0.32 (the projects values).
- Produces: `mountShiftSky(canvas: HTMLCanvasElement, head: HTMLElement, initial: Half): { setHalf(half: Half, animate: boolean): void; dispose(): void }`, ported from the `<script type="module">` in `projects.html`.
- Produces: `<RollText text={string} />`.
- Behaviour: switching calls `router.replace("/projects?shift=night", { scroll: false })`, or `/projects` for day. It sets `--bg` on `document.documentElement` (`#0b1d33` for day, `#000000` for night) and removes it on unmount. The page also renders a `<style>` setting `:root{--bg:...}` for the initial shift, so the first paint is right. Tiles are `TransitionLink`s to `/projects/<slug>`.

- [ ] **Step 1: Write the `projects` check group.**
  - `/projects` has 9 tile links in day order and the switch button "9 to 5" has `aria-pressed="true"`.
  - Clicking "5 to 9" gives 7 tiles in night order, the URL ends `?shift=night`, and `getComputedStyle(document.body).backgroundColor` is `rgb(0, 0, 0)` (it is `rgb(11, 29, 51)` before).
  - Reloading keeps 7 tiles.
  - Clicking the SecondRound tile lands on `/projects/secondround`; `page.goBack()` restores 7 tiles.
  - With `reducedMotion: "reduce"`, every tile's computed opacity is "1" right after load.
  - With `webgl: false` (Chromium `--disable-3d-apis`), there are no page errors and 9 tiles.
  - At phone width, no overflow.
- [ ] **Step 2: Run it and watch it fail.** `node scripts/check-site.mjs http://localhost:3000 projects` (rebuild first). Expected: FAIL, the switch button is not found.
- [ ] **Step 3: Implement the page, board, tiles, marks, roll text, `glow.ts` and `sky.ts`,** porting markup, CSS and timings from `projects.html`.
- [ ] **Step 4: Run it and watch it pass,** then check in Chrome against the mockup: pill stretch, the sun/moon morph mid-flight, the drop-then-rise stagger, and the phone sky placed beside the switch.
- [ ] **Step 5: Commit.** `feat(projects): bento board with day/night shift and particle sky`

### Task 4: Project story pages

**Files:**
- Modify: `src/app/projects/[slug]/page.tsx`
- Create: `src/components/projects/StoryPage.module.css`, `src/components/projects/StoryMedia.tsx`

**Interfaces:**
- Consumes: `getProjectBySlug`, `nextProject`, `projects`, `ProjectMark` and `RollText`.
- Layout per `renderStory()` and `.s-*` in `projects.html`. The page sets `--bg` for its half the same way as Task 3. Media is a `<video muted loop playsInline poster>` (autoplay only without reduced motion), else an `<img>`, else the coloured `ProjectMark` tile. **Under the hood** is a `<details>` (closed) after the story. It holds `context`, `build` and `result` as three labelled paragraphs, the tags as a plain comma list (no pills), and `links`. `generateMetadata` uses `line`. `generateStaticParams` is unchanged. An unknown slug calls `notFound()`.

- [ ] **Step 1: Write the `project` check group.**
  - For all 16 slugs, the h1 text equals `name`, the page contains `line`, `what`, `why` and `impact`, the `details` element is not `open` and contains `build`, and the next link's href equals `/projects/${nextProject(slug).slug}`.
  - Read the slugs and copy by importing `../src/data/projects.ts` in the check script (Node 23 strips types).
  - `/projects/not-a-project` responds 404.
- [ ] **Step 2: Run it and watch it fail.** Expected: FAIL on `/projects/distill`, "details not found".
- [ ] **Step 3: Implement the story page.**
- [ ] **Step 4: Run it and watch it pass,** then check Distill (video), SecondRound (vector) and Kalshi Trading MCP (icon) in Chrome at both widths.
- [ ] **Step 5: Commit.** `feat(projects): story pages with an Under the hood section`

### Task 5: Contact page

**Files:**
- Create: `src/lib/contact-rules.ts`, `src/lib/contact-rules.test.ts`, `src/components/contact/ContactNote.tsx`, `src/components/contact/ContactNote.module.css`, `src/components/contact/PlaneSky.tsx`, `src/components/contact/plane.ts`
- Modify: `src/app/contact/page.tsx`, `src/app/api/contact/route.ts` (validation through `validateContact`; response shape and status codes unchanged)
- Leave `src/components/ui/ContactForm.tsx` in place; Task 8 deletes it.

**Interfaces:**
- Produces: `export type ContactField = "name" | "email" | "message"` and `export function validateContact(input: Record<ContactField, unknown>): { ok: true; value: Record<ContactField, string> } | { ok: false; field: ContactField; message: string }`. It checks in the order name, email, message. It trims name and message. Email must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. The messages are the mockup's `RULES` strings exactly.
- Produces: `mountPlane(canvas: HTMLCanvasElement, box: HTMLElement): { setCharge(fraction: number): void; launch(): void; reset(): void; dispose(): void }`, ported from `contact.html` with `createGlowComposer(..., { strength: 0.45, radius: 0.18, threshold: 0.34, edgeFade: true })`.
- The form keeps the mockup's markup, ids and copy, posts JSON `{ name, email, message }` to `/api/contact`, and shows the failure state when `success` is false or the request throws.

- [ ] **Step 1: Write `contact-rules.test.ts`.**
  - `empty name fails on name with "Add your name so I know who's writing."`
  - `"a@b" fails on email`
  - `whitespace-only message fails on message`
  - `valid input passes with trimmed values`
  - `non-string fields fail`
- [ ] **Step 2: Write the `contact` check group.** Every run installs `page.route("**/api/contact", ...)`; any POST it doesn't expect fails the run.
  - An empty submit focuses `#name` and `#hint` shows the name message.
  - Filling Jordan Lee, jordan@example.com and "Quick question." then submitting sends exactly that JSON, and "It's on its way" shows with "Jordan" and the email.
  - A name of `<img src=x onerror=alert(1)>` renders as text: no `img` inside `#done-msg`.
  - "Write another" leaves both inputs wider than 100px.
  - A mocked `{ success: false, error: "Failed to send email" }` shows "That didn't go through" and the button reads "Try again".
  - At phone width, no overflow.
- [ ] **Step 3: Run both and watch them fail.** `npm test`, then the `contact` group. Expected: FAIL, missing module, then `#hint` not found.
- [ ] **Step 4: Implement the rules, route change, page, note and plane.**
- [ ] **Step 5: Run both and watch them pass,** then check in Chrome: the plane warms, launches and checks; the phone layout puts the plane above the heading.
- [ ] **Step 6: Commit.** `feat(contact): fill-in-the-blank note with a particle paper plane`

### Task 6: About page

**Files:**
- Modify: `src/app/about/page.tsx` (keeps `export const dynamic = "force-dynamic"`; loads usage and GitHub data)
- Create in `src/components/about/`: `About.module.css` (blueprint scope and section styles), `StreetMap.tsx`, `map.ts`, `SystemDiagram.tsx`, `ProcessLoop.tsx`, `BuildLog.tsx`, `Connections.tsx`
- Create: `public/about/city.json` (from `.design-preview/about-v1/city.json`). `src/lib/activity.ts`, its test and `src/components/site/Heatmap.tsx` already exist from Task 2.

**Interfaces:**
- Produces in `src/lib/activity.ts`:
  - `toYearSeries(points: { date: string; value: number }[], year: number, today: Date): number[]` has one entry per day from Jan 1 of `year` through `today`, or Dec 31 for a past year. It accepts `YYYY-MM-DD` and `YYYYMMDD` dates, sums duplicate days, ignores days outside the year, and fills missing days with 0.
  - `formatCompact(n: number): string` gives "40.2B", "980M", "12.5K" and "6,282" for anything under 10,000.
- Produces: `<Heatmap values={number[]} tone="white" | "green" label={string} compact? />`, with cells and colours from `heat()` in `home.html` and `about.html`.
- Produces: `mountStreetMap(wrap: HTMLElement, data: unknown): () => void`, ported from `about.html`. The camera is fixed: no lean toward the cursor. `StreetMap` fetches `/about/city.json` only when the map comes within one viewport (IntersectionObserver with `rootMargin: "100% 0px"`).
- Diagram data, loop steps, icons, build log entries and connections are copied from `about.html`. The bio gets the day-job change.

- [ ] **Step 1: The activity tests are written in Task 2.** They are:
  - `toYearSeries fills Jan 1 to today with zeros for missing days`
  - `accepts both date formats`
  - `ignores other years`
  - `formatCompact(40_200_000_000) is "40.2B"`
  - `formatCompact(6282) is "6,282"`
- [ ] **Step 2: Write the `about` check group.**
  - Section headings appear in mockup order.
  - The sketch `img` is not inside a `figure` with a `figcaption`.
  - After scrolling the map into view, a `canvas` exists in the map wrap.
  - Hovering two points 400px apart leaves the heart's `style.left/top` unchanged.
  - The Connections links have GitHub, LinkedIn and X hrefs, and an `svg` in each row.
  - With clipboard permission granted, clicking Copy reads "Copied".
  - With no live data (the local default), the page renders and omits the missing figure.
  - At phone width, no overflow.
- [ ] **Step 3: Run both and watch them fail.**
- [ ] **Step 4: Implement the about components and the page.**
- [ ] **Step 5: Run both and watch them pass,** then check in Chrome against `about.html`. Then run `scripts/seed-usage.sh` (read it first) against the local DB to see the activity strip with numbers.
- [ ] **Step 6: Commit.** `feat(about): blueprint spec sheet with street map, wiring diagram and build log`

### Task 7: Homepage

**Files:**
- Modify: `src/app/page.tsx` (server; keeps `force-dynamic`; renders the mockup's sections with their ids `hero`, `intro`, `stats`, `ticker`, `work`, `graph`, `foot` and the `data-proj` attributes the stage reads)
- Create in `src/components/home/`: `Home.module.css`, `HomeStage.tsx`, `Ticker.tsx`, `StatsSection.tsx`, `stage/index.ts`, `stage/gpgpu.ts`, `stage/logo.ts`, `stage/work.ts`, `stage/constellation.ts`, `stage/foot.ts`
- Create: `src/lib/constellation.ts`, `src/lib/constellation.test.ts`

**Interfaces:**
- Consumes: `projects`, `Half`, `line`, `kind` and `tags` (Task 2); `toYearSeries`, `formatCompact` and `Heatmap` (Task 6); `loadUsageData` and `loadGitHubData`.
- Produces: `buildConstellation(items: { slug: string; half: Half; tags: string[] }[]): { hubs: string[]; links: [slug: string, hub: string][] }`. It maps tags through the mockup's `TOOL` table, keeps only hubs shared by two or more projects, and returns hubs in descending share count.
- Produces: `mountHomeStage(canvas: HTMLCanvasElement, root: HTMLElement, items: StageItem[], links: ReturnType<typeof buildConstellation>): () => void`, where `StageItem = { slug: string; name: string; kind: string; line: string; half: Half; tags: string[] }`. It ports `home.html`'s module: `gpgpu`, `logoEdges`/`assembly` into `logo.ts`, `particlePiece`/`workPiece` into `work.ts`, `layout`/`constellation` into `constellation.ts`, `footPiece` into `foot.ts`, and the `sync`/`onScroll`/`frame` loop into `index.ts`. The graph card's link goes to `/projects/<slug>`.
- Selected work items are links to their project pages. Ticker items, in order: iOS Apps, AI Agents, Dashboards, Web Crawlers, Trading Bots, Shopify Apps, MCP Servers, Attribution Engines, GTM Tools. The loop unit is the list twice, so the solid and outlined words alternate. A drag uses pointer events with `touch-action: pan-y`.
- Stats count the current year for both sources. The token figure is omitted when the series sums to 0, the GitHub figure is omitted when the loader returns null, and the section is omitted when both are missing.

- [ ] **Step 1: Write `constellation.test.ts`.**
  - `OpenAI, Gemini, OpenRouter and LLM map to "Other LLMs"`
  - `a tool used by one project is not a hub`
  - `every project in data has at least one link` (run against the real `projects` from Task 2)
- [ ] **Step 2: Write the `home` and `nav-loop` check groups.**
  - **home:** the sections' ids appear in order. The h1 text matches `/mazza\s*builds/i`. The intro contains "Senior GTM Engineer, AI". The ticker lists the 9 items in its screen-reader text. Dragging the marquee 300px left changes the track's transform. The four Selected work links go to distill, web-tracker-scanner, secondround and daily-roman. With `webgl: false` and with `js: false`, the h1 and intro text are visible (opacity above 0.1). At phone width, no overflow.
  - **nav-loop:** 10 rounds of clicking Projects, About, Contact, then the mark. Collect console messages matching `/WebGL|context lost|Too many active/i`; expect none.
- [ ] **Step 3: Run them and watch them fail.**
- [ ] **Step 4: Implement the constellation logic, then the page, stats, ticker and stage modules.**
- [ ] **Step 5: Run them and watch them pass.** Then check in Chrome against `home.html`:
  - the logo build, dissolve and rebuild
  - the hover field and the tap burst in the phone frame
  - the hammer, morphing to the Distill funnel and light bulb
  - the day-blue shift, at mid-screen headings
  - dragging the network and tapping a node
  - the contour footer
- [ ] **Step 6: Commit.** `feat(home): particle hero, selected work, constellation and live stats`

### Task 8: Remove the old design and update the docs

**Files:**
- Delete: every file in `src/components/effects/`, `src/components/3d/` and `src/components/DepthGallery/`, `src/components/ui/ContactForm.tsx`, and every other file in `src/components/ui/` that `grep -rn` shows no remaining import of.
- Remove the old `Project` fields: `description`, `issueNumber`, `status`, `screenshot`, `deviceType`, `screenTexture`, `screenBgColor`, `screenTextureScale`, `logo`, `logoBgColor`, `images` and `videos`. Update `sitemap.ts` and `opengraph-image.tsx` to use `line` wherever they read `description`. Also delete `public/models/`, `public/chicago-map*.svg`, `scripts/build-map-layers.js`, and any `public/projects/*` file nothing references.
- Modify: `src/components/ui/index.ts` (or delete it if it ends up empty), `src/styles/tokens.css` (drop the old-name aliases once `grep -rn "var(--text-display\|var(--space-\|var(--accent"` in `src/` returns nothing), `scripts/check-resilience.mjs` (match the h1 with `/mazza\s*builds/i` and wait 8s instead of 22s), `package.json` (`npm uninstall` any of `@react-three/fiber`, `@react-three/drei`, `gltf-pipeline` and `motion` that no remaining file imports), and `CLAUDE.md`. In `CLAUDE.md`, replace the Design Language, Font Stack, Anti-Patterns, Design Tokens, Motion Constants, Component APIs, Planned Motion Animations and File Structure sections with the new tokens and fonts, the scene-module pattern, CSS Modules, and the `npm test` / `check:site` commands. Keep everything else.
- Restyle check: `privacy`, `not-found` and `error` pages render with the new tokens and no old classes.

- [ ] **Step 1: Delete and uninstall.** Then run `npm run lint`, `npx tsc --noEmit` and `npm run build`. Expected: clean.
- [ ] **Step 2: Run the full suite.** `npm test`, then `node scripts/check-site.mjs http://localhost:3000`, then `node scripts/check-resilience.mjs http://localhost:3000/`. Expected: all OK.
- [ ] **Step 3: Commit.** `chore(site): remove the old design system and document the new one`

### Task 9: Review and hand-off

- [ ] **Step 1: Run a fresh whole-branch review.** Use a subagent on the most capable model, given the spec, this plan and `git diff origin/main...HEAD`. Fix every confirmed finding, then rerun Task 8 Step 2.
- [ ] **Step 2: Push and open a draft PR.** Push `worktree-design-refresh` and open a draft PR against `main`. The body links the spec and the four previews, lists the decisions made on 2026-10-24, and says the Fly deploy happens on merge.

## Out of scope

The Open Graph share image (`opengraph-image.tsx`) keeps its current look; it only switches to `line` if it reads `description`. No light mode. No new analytics. No changes to the usage-sync scripts or the API routes beyond contact validation.
