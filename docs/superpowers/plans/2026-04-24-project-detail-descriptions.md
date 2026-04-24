# Project Detail Descriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single `longDescription` paragraph on each project detail page with three labeled beats (`CONTEXT`, `BUILD`, `RESULT`), migrating the data model and updating the detail page layout.

**Architecture:** One data file (`src/data/projects.ts`) gets a schema change and all 10 entries rewritten. One page file (`src/app/projects/[slug]/page.tsx`) gets its single description section replaced with three labeled sibling sections using the existing `LINKS` / `SCREENSHOTS` label pattern.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind v4, existing `ScrollTextLines` component, Nothing design system tokens.

**Spec:** `docs/superpowers/specs/2026-04-24-project-detail-descriptions-design.md`

---

## File Structure

| File | Change | Responsibility |
|------|--------|----------------|
| `src/data/projects.ts` | Modify | `Project` interface + 10 project entries |
| `src/app/projects/[slug]/page.tsx` | Modify | Detail page layout (description section only) |

No new files. No file splits. The plan touches exactly two files.

---

## Conventions

- **No em dashes in any code, copy, commit message, or comment.** Use hyphens, commas, or split into sentences.
- **TypeScript is the compile-time check.** Run `npx tsc --noEmit` to verify the interface migration before committing.
- **Visual verification** happens via `npm run dev` then browsing to each project's detail route.

---

## Task 1: Rewrite `src/data/projects.ts` with new schema and copy

**Files:**
- Modify: `src/data/projects.ts`

**Why one task, one Write:** All 10 project entries reference `longDescription`. Changing the interface without migrating every entry produces 10 simultaneous type errors and a red editor. The cleanest move is to overwrite the full file in one shot.

- [ ] **Step 1: Replace the entire file contents**

Overwrite `src/data/projects.ts` with exactly the following content:

```ts
export type ProjectStatus = "LIVE" | "IN PROGRESS" | "ARCHIVED";
export type DeviceType = "phone" | "laptop";

export interface Project {
  slug: string;
  issueNumber: number;
  name: string;
  description: string;
  context: string;
  build: string;
  result: string;
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

export const projects: Project[] = [
  {
    slug: "trailmix",
    issueNumber: 1,
    name: "Trailmix",
    description:
      "Converts Granola meeting notes into actionable tasks routed to monday.com or Slack with AI-powered extraction and confidence scoring.",
    context:
      "Granola captures rich meeting notes, but action items die inside the transcript. Nothing routes them into the tools where work actually happens.",
    build:
      "Trailmix is a Next.js 16 app with a background worker that polls Granola every 30 seconds, runs extracted action items through an LLM for confidence scoring and deduplication, then delivers them to Slack with approve/reject buttons. Approvals optionally create monday.com items via GraphQL with mapped columns, groups, and assignees. Built on Drizzle ORM, NextAuth with Google OAuth, AES-256-GCM for stored credentials, and a circuit breaker that disables polling after repeated Slack failures.",
    result:
      "Live on Fly.io with a 3D-scene landing page. Operates in two modes, monday.com routing or Slack-only delivery, selected during a multi-step onboarding flow.",
    tags: ["Next.js", "Drizzle", "Slack API", "monday.com"],
    status: "LIVE",
    screenshot: "/projects/trailmix/screen.png",
    images: [
      "/projects/trailmix/trailmixhome.jpg",
      "/projects/trailmix/trailmixslack.jpg",
    ],
    links: [
      { label: "Live", url: "https://trailmix.fly.dev" },
      { label: "Source", url: "https://github.com/alexandermazza/trailmix" },
    ],
    deviceType: "laptop",
    screenTexture: "/projects/trailmix/screen.png",
  },
  {
    slug: "daily-roman",
    issueNumber: 2,
    name: "Daily Roman",
    description:
      "AI-powered iOS app that delivers a new ancient Roman history fact every day with interactive quizzes and spaced repetition.",
    context:
      "Ancient Roman history is fascinating but rarely shows up in daily learning apps. Most are language drills or generic trivia.",
    build:
      "A React Native/Expo iOS app that serves one AI-generated fact per day across 8 historical eras and 18 topics, paired with a Leitner-based spaced-repetition quiz system with 6 question types. Features a 3D coin flip mechanic, Latin-to-English morphing animations, a scholar progression from Tiro to Imperator, an interactive map of the Roman Empire, and iOS home screen widgets.",
    result:
      "Live on the App Store. The one-fact-a-day cadence and widget surfacing drive daily engagement without push-notification fatigue.",
    tags: ["React Native", "Expo", "TypeScript"],
    status: "LIVE",
    screenshot: "/projects/daily-roman/screen.png",
    video: "/projects/daily-roman/video.mp4",
    images: [
      "/projects/daily-roman/image-01.png",
      "/projects/daily-roman/image-02.png",
      "/projects/daily-roman/image-03.png",
      "/projects/daily-roman/image-04.png",
    ],
    links: [
      { label: "App Store", url: "https://apps.apple.com/mx/app/daily-roman-ancient-history/id6759132785?l=en-GB" },
    ],
    deviceType: "phone",
    screenTexture: "/projects/daily-roman/screen.png",
  },
  {
    slug: "shopify-app",
    issueNumber: 3,
    name: "ShopAI",
    description:
      "Shopify theme extension that adds AI-powered product Q&A and review summarization to product pages.",
    context:
      "Shoppers land on a product page with questions the copy doesn't answer and reviews too long to read. Most bounce before buying.",
    build:
      "A Shopify Theme App Extension that answers natural-language product questions with OpenAI-powered, context-aware responses, and summarizes reviews into a sentiment snapshot so buyers can skip the scroll. Merchants configure brand voice, policies, and product context for on-brand responses without writing code. Built on Remix with Prisma.",
    result:
      "Live at shop-ai.co, installable directly from a Shopify store with no theme code changes.",
    tags: ["Remix", "Shopify", "OpenAI", "Prisma"],
    status: "LIVE",
    screenshot: "/projects/shopify-app/screen.png",
    videos: [
      "/projects/shopify-app/askmeanything.mp4",
      "/projects/shopify-app/reviewsummary.mp4",
      "/projects/shopify-app/addtoshop.mp4",
    ],
    images: [],
    links: [
      { label: "Live", url: "https://shop-ai.co/" },
    ],
    deviceType: "laptop",
    screenTexture: "/projects/shopify-app/screen.png",
  },
  {
    slug: "vendor-fingerprint",
    issueNumber: 4,
    name: "Vendor Fingerprint",
    description:
      "7-stage detection pipeline that identifies which scheduling software healthcare companies use - static fingerprinting, headless browsing, and AI verification.",
    context:
      "Identifying which scheduling software a healthcare company uses is slow, manual work. Sales and BD teams need it at list scale.",
    build:
      "A 7-stage Python pipeline that resolves homepages, extracts HTML signals (script tags, iframes, form actions), discovers booking links, and fingerprints them against 37+ known vendors like MyChart, Zocdoc, and Calendly. When static analysis is uncertain, it escalates to headless Chromium via Playwright to capture live network requests, then to a two-tier Claude agent: Haiku gathers signals by visiting pages, Sonnet reasons over the evidence. Each result includes vendor, confidence score, booking modality, evidence trail, and the discovered booking URL.",
    result:
      "Explains every classification via its evidence trail. Adding a new vendor is a YAML append, not a code change.",
    tags: ["Python", "Playwright", "Claude API"],
    status: "LIVE",
    screenshot: "/projects/vendor-fingerprint/screen.png",
    images: [
      "/projects/vendor-fingerprint/image.png",
    ],
    links: [
      { label: "Source", url: "https://github.com/alexandermazza/booking-vendor-scraper" },
    ],
    deviceType: "laptop",
    screenTexture: "/projects/vendor-fingerprint/screen.png",
  },
  {
    slug: "shakedown",
    issueNumber: 5,
    name: "Shakedown",
    description:
      "Claude Code skill that maps every user interaction in your app, finds test gaps, and dispatches parallel agents to close them.",
    context:
      "New apps ship with big test coverage gaps and accumulated UX debt. Audits of either are manual, slow, and inconsistent.",
    build:
      "A Claude Code skill with two modes. In `code` mode it baselines the test infrastructure, maps every interaction, catalogs existing coverage in parallel, prioritizes uncovered paths by risk, then dispatches 3-5 parallel agents to write tests in rounds: pure functions first, stateful code second. In `ui` mode it tours the running app in a real browser via Playwright MCP, drives every control, captures screenshots, and sorts findings into bugs, friction, and dead features. Stack-agnostic; works on Next.js, React Native, Django, Rails, and Go.",
    result:
      "Took a real Expo app from 224 to 474 tests in a single session. A separate `ui` mode run on a React+Express app surfaced 15 bugs and 3 dead pages in one sitting. Distributed as an installable Claude Code plugin.",
    tags: ["Claude Code", "AI Agents", "Testing"],
    status: "LIVE",
    screenshot: "/projects/shakedown/screen.png",
    images: [
      "/projects/shakedown/image.png",
    ],
    links: [
      { label: "Source", url: "https://github.com/alexandermazza/shakedown" },
    ],
    deviceType: "laptop",
    screenTexture: "/projects/shakedown/shakedown.png",
  },
  {
    slug: "web-tracker-scanner",
    issueNumber: 6,
    name: "AI Web Tracker Scanner",
    description:
      "HIPAA compliance platform that crawls healthcare sites, detects 200+ tracking pixels, and flags PHI privacy risks with AI-powered classification.",
    context:
      "Healthcare sites routinely leak PHI through tracking pixels, and HIPAA compliance audits are manual and miss the 200+ trackers now in common use.",
    build:
      "A FastAPI backend with a React 19 dashboard that crawls medical pages with headless Chromium, captures outgoing network requests, and matches them against a database of 200+ trackers flagged for risk level, PHI collection, and BAA support. URL triage uses Gemini Flash 2.5 via OpenRouter to classify medical vs. non-medical pages before scanning. Generates per-domain compliance summaries, PDF reports, and writes findings back to HubSpot company records via webhook.",
    result:
      "Live at ai-web-tracker-scanner.fly.dev. Scans trigger single-domain from the dashboard, CSV batches up to hundreds of sites, or automatically from HubSpot.",
    tags: ["FastAPI", "React", "Playwright", "Gemini"],
    status: "LIVE",
    screenshot: "/projects/web-tracker-scanner/screen.png",
    video: "/projects/web-tracker-scanner/video.mov",
    images: [
      "/projects/web-tracker-scanner/scannerhome.jpg",
      "/projects/web-tracker-scanner/scannerscan.jpg",
      "/projects/web-tracker-scanner/scannerstats.jpg",
    ],
    links: [
      { label: "Live", url: "https://ai-web-tracker-scanner.fly.dev" },
      { label: "Source", url: "https://github.com/alexandermazza/AI-Web-Tracker-Scanner" },
    ],
    deviceType: "laptop",
    screenTexture: "/projects/web-tracker-scanner/screen.png",
  },
  {
    slug: "kalshi-trader",
    issueNumber: 7,
    name: "Kalshi Weather Trader",
    description:
      "Autonomous trading bot for Kalshi prediction markets - multi-source weather forecasting, probability analysis, and real-money order execution.",
    context:
      "Kalshi's weather markets mis-price short-dated temperature contracts when forecast distributions disagree with market-implied probabilities.",
    build:
      "Pulls multi-source forecasts from NWS, HRRR, GFS, and ECMWF ensembles, calculates probability distributions for temperature buckets, and places maker NO orders when edge exceeds thresholds. Claude-powered agents scan markets every 30 minutes with position recovery and risk management. A separate BTC latency-arbitrage strategy reacts to Coinbase WebSocket price moves faster than Kalshi can reprice. APScheduler drives the engine, SQLAlchemy persists state, and a Flask dashboard surfaces real-time P&L.",
    result:
      "Runs autonomously with daily outcome tracking that feeds back into agent decisions. Real capital at stake.",
    tags: ["Python", "Claude API", "MCP", "Flask"],
    status: "LIVE",
    screenshot: "/projects/kalshi-trader/screen.png",
    images: [
      "/projects/kalshi-trader/image.png",
    ],
    links: [
      { label: "Source", url: "https://github.com/alexandermazza/Kahshi-Trader" },
    ],
    deviceType: "phone",
    screenTexture: "/projects/kalshi-trader/screen.png",
  },
  {
    slug: "kalshi-mcp",
    issueNumber: 8,
    name: "Kalshi Trading MCP",
    description:
      "Pip-installable MCP server for Kalshi with 20+ tools - weather forecasting, ensemble analysis, safety controls, and two-step order confirmation.",
    context:
      "Most Kalshi MCP servers are thin 5-10 tool API wrappers, useful for checking balance but useless for actual market analysis.",
    build:
      "A pip-installable FastMCP server with 20+ tools covering account management, market analysis, order execution, multi-source weather forecasting (NWS, HRRR, GFS, ECMWF), real-time METAR observations, and position drift monitoring. Safety controls include price caps, daily limits, cash reserves, NO-only strategy enforcement, and a two-step `prepare_order` then `confirm_order` flow that prevents accidental trades. Supports 8 cities with cross-city correlation analysis and AFD change detection.",
    result:
      "Installable via `pip install kalshi-trading-mcp` and plugs into Claude Code or Claude Desktop via standard MCP config. Demo and production environments both supported.",
    tags: ["Python", "FastMCP", "Kalshi API"],
    status: "LIVE",
    screenshot: "/projects/kalshi-mcp/screen.png",
    images: [
      "/projects/kalshi-mcp/image.png",
    ],
    links: [
      { label: "Source", url: "https://github.com/alexandermazza/kalshi-trading-mcp" },
    ],
    deviceType: "laptop",
    screenTexture: "/projects/kalshi-mcp/kalshi-trading-mcp.png",
  },
  {
    slug: "semrush-enricher",
    issueNumber: 9,
    name: "Semrush Enricher",
    description:
      "Web tool that enriches HubSpot domain exports with Semrush traffic data - upload a CSV, paste your API key, get enriched metrics back.",
    context:
      "HubSpot company exports list domains but carry no traffic data. Enriching a list manually means one lookup per domain.",
    build:
      "A Flask web tool that takes a CSV of up to 1,000 HubSpot company domains plus a user-supplied Semrush API key, calls the Semrush `/trends/summary` endpoint in batches of 200, and returns an enriched CSV. API keys live in the request scope only; they are never stored or logged. Docker and one-click deploy paths for Render and Google Cloud Run.",
    result:
      "Serves traffic-enrichment runs on demand. Per-request key handling means no account setup or tenant data to manage.",
    tags: ["Python", "Flask", "Semrush API", "HubSpot"],
    status: "LIVE",
    screenshot: "/projects/semrush-enricher/screen.png",
    images: [
      "/projects/semrush-enricher/semrush.jpg",
    ],
    links: [
      { label: "Source", url: "https://github.com/alexandermazza/semrush-enricher" },
    ],
    deviceType: "laptop",
    screenTexture: "/projects/semrush-enricher/screen.png",
  },
  {
    slug: "f1-globe",
    issueNumber: 10,
    name: "F1 Globe Calendar",
    description:
      "Interactive 3D globe visualizing every race location on the Formula 1 2026 calendar, inspired by the GitHub Globe.",
    context:
      "Built to see the Formula 1 2026 calendar as a real-world route on a globe. Inspired by the GitHub contribution globe.",
    build:
      "A 3D WebGL globe built with vanilla JavaScript and Three.js. Each Grand Prix is pinned to its real-world coordinates; spinning the globe traces the season's journey across continents in calendar order. Updated yearly with the current season.",
    result:
      "Live at f1-globe-calendar.vercel.app.",
    tags: ["JavaScript", "Three.js", "WebGL"],
    status: "LIVE",
    screenshot: "/projects/f1-globe/F1-Logo-PNG-Image.png",
    images: [
      "/projects/f1-globe/newimage.png",
    ],
    links: [
      { label: "Live", url: "https://f1-globe-calendar.vercel.app/" },
      { label: "Source", url: "https://github.com/alexandermazza/f1-globe-calendar" },
    ],
    deviceType: "laptop",
    screenTexture: "/projects/f1-globe/F1-Logo-PNG-Image.png",
    screenBgColor: "#FFFFFF",
    screenTextureScale: 0.6,
  },
];

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
```

- [ ] **Step 2: Typecheck the repo**

Run: `npx tsc --noEmit`
Expected: exit code 0 with no output. One expected error will surface in `src/app/projects/[slug]/page.tsx` at the line that still reads `{project.longDescription}`, since that property no longer exists on the interface. Task 2 fixes it.

If you see *any other* type errors, stop and investigate. They indicate either a typo in the paste or an unexpected consumer of `longDescription` that grep missed.

- [ ] **Step 3: Confirm no other file references the old field name**

Run: `grep -rn "longDescription" src/`
Expected: exactly one match, on the `{project.longDescription}` line in `src/app/projects/[slug]/page.tsx`. That's the known issue Task 2 will fix.

- [ ] **Step 4: Do NOT commit yet**

The file compiles cleanly on its own, but the detail page references a removed field. Committing here would leave `main` in a broken state. Commit after Task 2.

---

## Task 2: Update the detail page to render three labeled sections

**Files:**
- Modify: `src/app/projects/[slug]/page.tsx` (lines 61-66)

- [ ] **Step 1: Replace the Description section with three sibling sections**

In `src/app/projects/[slug]/page.tsx`, find this block (around lines 61-66):

```tsx
      {/* Description */}
      <section className="mb-[var(--space-3xl)]">
        <ScrollTextLines className="max-w-[640px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
          {project.longDescription}
        </ScrollTextLines>
      </section>
```

Replace it with:

```tsx
      {/* Context / Build / Result */}
      <section className="mb-[var(--space-3xl)]">
        <p className="mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          CONTEXT
        </p>
        <ScrollTextLines className="max-w-[640px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
          {project.context}
        </ScrollTextLines>
      </section>

      <section className="mb-[var(--space-3xl)]">
        <p className="mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          BUILD
        </p>
        <ScrollTextLines className="max-w-[640px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
          {project.build}
        </ScrollTextLines>
      </section>

      <section className="mb-[var(--space-3xl)]">
        <p className="mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          RESULT
        </p>
        <ScrollTextLines className="max-w-[640px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
          {project.result}
        </ScrollTextLines>
      </section>
```

Notes on the exact values, all of which are already used elsewhere on this page (see the existing `LINKS` label at line ~71 and `SCREENSHOTS` label at line ~152):

- Label: `font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]`
- Label spacing: `mb-[var(--space-lg)]`
- Section spacing: `mb-[var(--space-3xl)]`
- Body width: `max-w-[640px]` (matches the prior description width)

- [ ] **Step 2: Typecheck again**

Run: `npx tsc --noEmit`
Expected: exit code 0 with no output. The previously-broken reference to `project.longDescription` is gone.

- [ ] **Step 3: Confirm `longDescription` is gone from the whole repo**

Run: `grep -rn "longDescription" src/`
Expected: no matches.

- [ ] **Step 4: Lint the changed files**

Run: `npm run lint`
Expected: no new warnings or errors attributable to these changes.

- [ ] **Step 5: Commit both files together**

```bash
git add src/data/projects.ts src/app/projects/[slug]/page.tsx
git commit -m "feat(projects): split detail descriptions into context/build/result"
```

---

## Task 3: Visual verification in the browser

**Files:** none modified, verification only.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Wait for `ready` on port 3000.

If Turbopack errors appear about a stray `~/yarn.lock`, stop and use `npm run build && npm run start` instead (this is a known issue in this project).

- [ ] **Step 2: Visit three representative detail pages**

Open each URL in a browser and confirm all three beats render with the mono label above each paragraph:

1. Trailmix (a detailed product): `http://localhost:3000/projects/trailmix`
2. F1 Globe (an experiment with the shortest RESULT): `http://localhost:3000/projects/f1-globe`
3. Daily Roman (the only `phone` device project): `http://localhost:3000/projects/daily-roman`

For each page, verify:
- Three labels render in order: `CONTEXT`, `BUILD`, `RESULT`
- Labels appear in Space Mono, uppercase, dim grey (matches `LINKS` label below them)
- Paragraph text appears below each label in the same style as the old single description
- Section spacing matches the other sections on the page (no cramped blocks, no excessive gaps)
- No console errors in the browser devtools
- On scroll, each paragraph animates in via `ScrollTextLines` (the existing scroll-linked reveal)

- [ ] **Step 3: Check mobile layout**

Using browser devtools, switch to a mobile viewport (e.g. iPhone 14 at 390px wide) and reload one page. Confirm:
- Labels and paragraphs stay left-aligned.
- `max-w-[640px]` does not cause horizontal overflow at narrow widths.
- Each beat remains readable.

- [ ] **Step 4: Stop the dev server**

Press Ctrl+C.

- [ ] **Step 5: No commit needed**

This task is verification only. If any issue is found, reopen Task 2 to fix and re-verify.

---

## Self-Review Checklist (completed during plan authoring)

- **Spec coverage:** Every spec requirement is tasked. Interface change (Task 1). 10 entries migrated (Task 1). Page layout (Task 2). Out-of-scope items remain untouched (no task).
- **Placeholder scan:** No TBDs, no "implement later", no "similar to above". All code is present verbatim.
- **Type consistency:** `context`, `build`, `result` field names match across interface definition, data entries, and page references.
- **Scope check:** Two files, three tasks, one commit. Tight.
- **No em dashes:** Plan uses hyphens, commas, and complete sentences throughout, matching the feedback on human voice.
