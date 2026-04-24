# Project Detail Descriptions: Context / Build / Result

**Date:** 2026-04-24
**Status:** Draft for review

## Goal

Replace the single dense `longDescription` paragraph on each project detail page with three clearly-labeled beats (`CONTEXT`, `BUILD`, `RESULT`) so each page reads as a compact case study for non-technical visitors and still rewards a developer who wants engineering depth.

## Audience balance

Each beat carries a distinct job:

- `CONTEXT` speaks to a general reader (recruiter, visitor). It names the gap or curiosity that made the project exist.
- `BUILD` carries the technical substance: what the thing is and the interesting engineering choices.
- `RESULT` closes the loop with shipped/traction proof: where it lives, who uses it, what it did.

## Data model change

File: `src/data/projects.ts`

- **Remove:** `longDescription: string`
- **Add:** `context: string`, `build: string`, `result: string`
- **Keep unchanged:** `description: string` (still the one-line hook used on project cards, listings, the home page, and metadata)

All 10 entries migrate at once. No transitional fallback.

### Updated `Project` interface

```ts
export interface Project {
  slug: string;
  issueNumber: number;
  name: string;
  description: string;   // unchanged, one-line hook
  context: string;       // new, the gap or curiosity
  build: string;         // new, what it is + how it works
  result: string;        // new, where it shipped, what it did
  tags: string[];
  status: ProjectStatus;
  screenshot: string;
  video?: string;
  videos?: string[];
  images: string[];
  links: { label: string; url: string }[];
  deviceType: DeviceType;
  screenTexture: string;
  screenBgColor?: string;
  screenTextureScale?: number;
}
```

## Page layout change

File: `src/app/projects/[slug]/page.tsx`

Replace the current single Description section (lines ~62-66) with three sibling sections, each following the existing Nothing-system label pattern used by `LINKS` and `SCREENSHOTS`:

```
[mono label: CONTEXT]
{project.context}

[mono label: BUILD]
{project.build}

[mono label: RESULT]
{project.result}
```

**Label style (matches existing `LINKS` / `SCREENSHOTS`):**
Space Mono, 11px, uppercase, `tracking-[0.08em]`, `--text-disabled`, `mb-[var(--space-lg)]`.

**Body style (matches current description):**
`ScrollTextLines`, `font-sans`, `text-[var(--body)]`, `leading-[1.6]`, `text-[var(--text-secondary)]`, `max-w-[640px]`.

**Spacing:**
`mb-[var(--space-3xl)]` between sections. No dividers, no accent, no numbering.

## Writing rules

- **Voice:** third-person, feature-dense. Matches existing `longDescription` tone.
- **No em dashes.** Use hyphens, commas, or split into sentences.
- **CONTEXT:** 1-2 sentences (~25-50 words). The gap or curiosity. No features. For experiments like F1 Globe or Daily Roman, "Built to..." can replace any forced problem framing.
- **BUILD:** 2-4 sentences (~50-100 words). What the thing is plus the engineering that matters.
- **RESULT:** 1-2 sentences (~20-40 words). Shipped where, who uses it, measurable traction when real.

## What does NOT change

- `ProjectCard` component uses `description` only.
- `/projects` listing page and home page previews use `description`.
- `generateMetadata` in the detail page uses `description`.
- Screenshots, video, links, tags, status, issue numbers, device-scene rendering.

## Draft copy for all 10 projects

### 1. Trailmix

**CONTEXT**
Granola captures rich meeting notes, but action items die inside the transcript. Nothing routes them into the tools where work actually happens.

**BUILD**
Trailmix is a Next.js 16 app with a background worker that polls Granola every 30 seconds, runs extracted action items through an LLM for confidence scoring and deduplication, then delivers them to Slack with approve/reject buttons. Approvals optionally create monday.com items via GraphQL with mapped columns, groups, and assignees. Built on Drizzle ORM, NextAuth with Google OAuth, AES-256-GCM for stored credentials, and a circuit breaker that disables polling after repeated Slack failures.

**RESULT**
Live on Fly.io with a 3D-scene landing page. Operates in two modes, monday.com routing or Slack-only delivery, selected during a multi-step onboarding flow.

---

### 2. Daily Roman

**CONTEXT**
Ancient Roman history is fascinating but rarely shows up in daily learning apps. Most are language drills or generic trivia.

**BUILD**
A React Native/Expo iOS app that serves one AI-generated fact per day across 8 historical eras and 18 topics, paired with a Leitner-based spaced-repetition quiz system with 6 question types. Features a 3D coin flip mechanic, Latin-to-English morphing animations, a scholar progression from Tiro to Imperator, an interactive map of the Roman Empire, and iOS home screen widgets.

**RESULT**
Live on the App Store. The one-fact-a-day cadence and widget surfacing drive daily engagement without push-notification fatigue.

---

### 3. ShopAI

**CONTEXT**
Shoppers land on a product page with questions the copy doesn't answer and reviews too long to read. Most bounce before buying.

**BUILD**
A Shopify Theme App Extension that answers natural-language product questions with OpenAI-powered, context-aware responses, and summarizes reviews into a sentiment snapshot so buyers can skip the scroll. Merchants configure brand voice, policies, and product context for on-brand responses without writing code. Built on Remix with Prisma.

**RESULT**
Live at shop-ai.co, installable directly from a Shopify store with no theme code changes.

---

### 4. Vendor Fingerprint

**CONTEXT**
Identifying which scheduling software a healthcare company uses is slow, manual work. Sales and BD teams need it at list scale.

**BUILD**
A 7-stage Python pipeline that resolves homepages, extracts HTML signals (script tags, iframes, form actions), discovers booking links, and fingerprints them against 37+ known vendors like MyChart, Zocdoc, and Calendly. When static analysis is uncertain, it escalates to headless Chromium via Playwright to capture live network requests, then to a two-tier Claude agent: Haiku gathers signals by visiting pages, Sonnet reasons over the evidence. Each result includes vendor, confidence score, booking modality, evidence trail, and the discovered booking URL.

**RESULT**
Explains every classification via its evidence trail. Adding a new vendor is a YAML append, not a code change.

---

### 5. Shakedown

**CONTEXT**
New apps ship with big test coverage gaps and accumulated UX debt. Audits of either are manual, slow, and inconsistent.

**BUILD**
A Claude Code skill with two modes. In `code` mode it baselines the test infrastructure, maps every interaction, catalogs existing coverage in parallel, prioritizes uncovered paths by risk, then dispatches 3-5 parallel agents to write tests in rounds: pure functions first, stateful code second. In `ui` mode it tours the running app in a real browser via Playwright MCP, drives every control, captures screenshots, and sorts findings into bugs, friction, and dead features. Stack-agnostic; works on Next.js, React Native, Django, Rails, and Go.

**RESULT**
Took a real Expo app from 224 to 474 tests in a single session. A separate `ui` mode run on a React+Express app surfaced 15 bugs and 3 dead pages in one sitting. Distributed as an installable Claude Code plugin.

---

### 6. AI Web Tracker Scanner

**CONTEXT**
Healthcare sites routinely leak PHI through tracking pixels, and HIPAA compliance audits are manual and miss the 200+ trackers now in common use.

**BUILD**
A FastAPI backend with a React 19 dashboard that crawls medical pages with headless Chromium, captures outgoing network requests, and matches them against a database of 200+ trackers flagged for risk level, PHI collection, and BAA support. URL triage uses Gemini Flash 2.5 via OpenRouter to classify medical vs. non-medical pages before scanning. Generates per-domain compliance summaries, PDF reports, and writes findings back to HubSpot company records via webhook.

**RESULT**
Live at ai-web-tracker-scanner.fly.dev. Scans trigger single-domain from the dashboard, CSV batches up to hundreds of sites, or automatically from HubSpot.

---

### 7. Kalshi Weather Trader

**CONTEXT**
Kalshi's weather markets mis-price short-dated temperature contracts when forecast distributions disagree with market-implied probabilities.

**BUILD**
Pulls multi-source forecasts from NWS, HRRR, GFS, and ECMWF ensembles, calculates probability distributions for temperature buckets, and places maker NO orders when edge exceeds thresholds. Claude-powered agents scan markets every 30 minutes with position recovery and risk management. A separate BTC latency-arbitrage strategy reacts to Coinbase WebSocket price moves faster than Kalshi can reprice. APScheduler drives the engine, SQLAlchemy persists state, and a Flask dashboard surfaces real-time P&L.

**RESULT**
Runs autonomously with daily outcome tracking that feeds back into agent decisions. Real capital at stake.

---

### 8. Kalshi Trading MCP

**CONTEXT**
Most Kalshi MCP servers are thin 5-10 tool API wrappers, useful for checking balance but useless for actual market analysis.

**BUILD**
A pip-installable FastMCP server with 20+ tools covering account management, market analysis, order execution, multi-source weather forecasting (NWS, HRRR, GFS, ECMWF), real-time METAR observations, and position drift monitoring. Safety controls include price caps, daily limits, cash reserves, NO-only strategy enforcement, and a two-step `prepare_order` then `confirm_order` flow that prevents accidental trades. Supports 8 cities with cross-city correlation analysis and AFD change detection.

**RESULT**
Installable via `pip install kalshi-trading-mcp` and plugs into Claude Code or Claude Desktop via standard MCP config. Demo and production environments both supported.

---

### 9. Semrush Enricher

**CONTEXT**
HubSpot company exports list domains but carry no traffic data. Enriching a list manually means one lookup per domain.

**BUILD**
A Flask web tool that takes a CSV of up to 1,000 HubSpot company domains plus a user-supplied Semrush API key, calls the Semrush `/trends/summary` endpoint in batches of 200, and returns an enriched CSV. API keys live in the request scope only; they are never stored or logged. Docker and one-click deploy paths for Render and Google Cloud Run.

**RESULT**
Serves traffic-enrichment runs on demand. Per-request key handling means no account setup or tenant data to manage.

---

### 10. F1 Globe Calendar

**CONTEXT**
Built to see the Formula 1 2026 calendar as a real-world route on a globe. Inspired by the GitHub contribution globe.

**BUILD**
A 3D WebGL globe built with vanilla JavaScript and Three.js. Each Grand Prix is pinned to its real-world coordinates; spinning the globe traces the season's journey across continents in calendar order. Updated yearly with the current season.

**RESULT**
Live at f1-globe-calendar.vercel.app.

## Implementation order

1. Update `Project` interface in `src/data/projects.ts`: remove `longDescription`, add `context`/`build`/`result`.
2. Replace each project entry's `longDescription` field with the three new fields from the Draft copy section above.
3. Update `src/app/projects/[slug]/page.tsx`: replace the single description section with three labeled sibling sections.
4. Verify no other file still references `longDescription` (grep).

## Scope bounds

- In scope: data-model migration, all 10 rewrites, detail-page layout.
- Out of scope: card copy, listing page, home page previews, metadata generation, any font/color/animation change.
