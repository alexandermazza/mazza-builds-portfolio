# Site Scaffolding — Homepage Resequencing + About Page Sync

**Date:** 2026-04-07
**Status:** Approved
**Scope:** Homepage layout reorder, intro section upgrade, About page content sync

## Problem

The homepage sections are in a functional but narratively weak order. The intro paragraph sits below the ticker where it gets lost, the UsageCard/GitHubCard float between projects and the CTA with no clear purpose, and the About page's SystemDiagram only references 3 of 10 projects.

## Homepage — New Section Order

```
1. TerminalHero              [full bleed, unchanged]
2. Intro Section             [constrained 960px, upgraded]
   ├── SPEC: IDENTITY label  [Space Mono 11px, --text-disabled]
   ├── Body copy             [Space Grotesk, bumped from body-sm to body size, --text-secondary]
   └── UsageCard + GitHubCard [2-col grid, compact variant]
3. TickerText                [full bleed, unchanged]
4. ProjectShowcase           [full bleed, unchanged]
5. CTA                       [constrained, "Get in touch" button]
6. Footer                    [constrained, attribution]
```

### Narrative arc

Intrigue (hero) → Identity (who + proof of activity) → Energy (ticker) → Evidence (projects) → Action (CTA)

### Intro section details

- Add a `SPEC: IDENTITY` label above the copy in Space Mono, matching the About page's blueprint vocabulary
- Bump copy from `body-sm` to `body` size (keeps `--text-secondary` color) for better presence
- UsageCard and GitHubCard sit in a 2-col responsive grid below the copy, using the existing `compact` prop
- Wrapped in the standard constrained container (`max-w-[960px]`)
- Remove the old standalone usage/GitHub section that currently sits between ProjectShowcase and CTA

## About Page — Changes

### 1. SystemDiagram — expand to 4 domain groups

Current state: 3 top-level nodes (Daily Roman, Shopify App, AI Systems)

New state: 4 domain group nodes, each containing sub-project lists:

| Domain | Sublabel | Projects |
|--------|----------|----------|
| MOBILE | iOS / SwiftUI | Daily Roman, F1 Globe |
| COMMERCE / WEB | Next.js / Shopify | Shopify App, Trailmix, Semrush Enricher |
| AI / AUTOMATION | Claude API / MCP | AI Automation, Shakedown, Web Tracker Scanner |
| TRADING / DATA | Python / Markets | Kalshi Trader, Kalshi MCP |

- Hub → horizontal line → drop line animation unchanged
- Grid becomes 4 columns on desktop (md:grid-cols-4), stacks to 1 column on mobile
- Each node card now renders a list of project names below the domain sublabel

### 2. New SPEC: ACTIVITY section

Insert between SPEC: SYSTEMS and SPEC: PROCESS:

```
SPEC: ACTIVITY
├── UsageCard
└── GitHubCard
```

- Same 2-col responsive grid layout as homepage intro
- Wrapped in a SpecBlock component to match existing About page pattern
- Uses the full (non-compact) variant of both cards for the About page context

## Files Changed

| File | Change |
|------|--------|
| `src/app/page.tsx` | Reorder sections, upgrade intro, remove standalone usage section |
| `src/components/effects/SystemDiagram.tsx` | Expand from 3 simple nodes to 4 domain groups with sub-project lists |
| `src/app/about/page.tsx` | Add SPEC: ACTIVITY section with UsageCard + GitHubCard |

## Out of Scope

- Nav trigger redesign (in progress separately)
- Project detail pages
- Project screenshot assets
- Contact page
