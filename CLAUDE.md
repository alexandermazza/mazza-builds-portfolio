@AGENTS.md

# Mazza Builds - Portfolio

## Project Overview
Personal portfolio for Alex Mazza, brand name "Mazza Builds." Solo indie developer.
Projects: Daily Roman (iOS app), a Shopify app, AI/automation systems (Claude API, HeyGen, ElevenLabs).
Audience: recruiters, indie devs, general public.

## Stack
- **Framework:** Next.js (App Router, `src/` directory)
- **Styling:** CSS Modules per component, on the tokens in `src/styles/tokens.css`. Tailwind CSS v4 is imported in `globals.css` only for its reset; components don't use utility classes.
- **3D:** three.js (`three`, `three/addons/...`) in plain scene modules (see below). Page transitions use GSAP (`src/lib/gsap.ts`, `src/transitions/`).
- **Language:** TypeScript throughout
- **No:** shadcn, Radix, Inter, system-ui for display text

## Design Language

The approved design is `docs/superpowers/specs/2026-10-24-design-refresh-design.md`. The mockups in `docs/superpowers/specs/2026-10-24-design-refresh/` (`home.html`, `projects.html`, `about.html`, `contact.html`) are the visual source of truth for layout, copy, motion and the three.js scenes; where the spec and a mockup disagree, the spec wins. Port from the mockups rather than reinventing.

- Dark only. Page black `#000000`; the projects page's 9 to 5 shift is deep day blue `#0b1d33`; the about page is a navy blueprint (`#0b1a2d` with a 24px grid).
- One accent: amber `#ffc24d`. Errors: `#ff8a7a`. Everything else is ink on the page colour.
- 3D look: luminous particle and light scenes on black (dusty filaments, soft additive points, tight bloom with the faintest light clipped to black). Never solid objects.
- Motion: ease `cubic-bezier(0.22, 1, 0.36, 1)`, staggered rises, and everything off for `prefers-reduced-motion`.

### Fonts (loaded via `next/font/google` in `layout.tsx`)
| Role | Font | CSS | Usage |
|------|------|-----|-------|
| Display | Big Shoulders (variable) | `var(--display)` | Uppercase headings, nav, big figures; 600 to 900 |
| Text | Schibsted Grotesk (400, 500, 600, italic 400) | `var(--text)` | Body, labels, UI |

### Anti-Patterns (never do these)
- No tag pills, no hover underlines, no accordion rows, no tables as design: use diagrams, rings, logs and grids
- No solid-object 3D (chrome, ceramic, voxels, cities): particles and light only
- No pop-ups or toasts: inline validation and status text
- No canvas that carries content: canvases are `aria-hidden="true"` decoration, and the text they illustrate is in the DOM
- No em dashes in any copy
- Nothing that needs manual updates or a recurring token cost: live numbers come from the usage and GitHub loaders

## Design Tokens (`src/styles/tokens.css`, imported by `globals.css`)

| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#000000` | Page colour, also behind the top bar and footer |
| `--day` | `#0b1d33` | The projects 9 to 5 blue |
| `--ink` | `#f1f2f3` | Primary text |
| `--ink-2` | `#a9b0b9` | Secondary text |
| `--ink-3` | `#6b727c` | Tertiary text |
| `--line` | `rgba(255, 255, 255, 0.14)` | Hairlines |
| `--amber` | `#ffc24d` | The one accent |
| `--err` | `#ff8a7a` | Errors |
| `--ease` | `cubic-bezier(0.22, 1, 0.36, 1)` | All motion |
| `--display`, `--text` | font stacks | Display and text faces |
| `--gl`, `--gr` | `max(16px, safe area)` under 720px, `max(32px, safe area)` from 720px | Side gutters |

Pages that change the page colour override `--bg` instead of painting their own background: the projects board sets `--bg` (with `--tile` and `--line`) on `:root` for the current shift, plus a `<style>` for the first paint; `About.module.css` sets the blueprint navy on `html:has(.page)`. The top bar and footer are transparent or `var(--bg)`, so they follow.

## Three.js Scene Modules

Each scene is a plain TypeScript module ported from its mockup, exporting a `mount...()` that returns a dispose (or a handle with `dispose()`):

| Module | Export | Loaded by |
|--------|--------|-----------|
| `src/components/home/stage/index.ts` (+ `gpgpu`, `logo`, `work`, `constellation`, `foot`) | `mountHomeStage` | `HomeStage.tsx` |
| `src/components/projects/sky.ts` | `mountShiftSky` | `ShiftSky.tsx` |
| `src/components/about/map.ts` | `mountStreetMap` | `StreetMap.tsx` (fetches `/about/city.json` within a viewport of the map) |
| `src/components/contact/plane.ts` | `mountPlane` | `PlaneSky.tsx` |

The home stage sizes itself from its canvas (`ctx.size`; the canvas is the full screen height, `100lvh`), not the window, so a phone's address bar hiding mid-scroll never resizes or reframes it. Its hero zoom eases toward the scroll position with `follow` instead of jumping with each scroll event.

The client component dynamically imports its module inside `useEffect`, so three.js never runs on the server and never blocks content. Every module:
- catches renderer creation and hides its canvas on failure (asking for the `webgl2` context first, as the sky, map and home stage do, keeps three.js from logging a console error)
- caps the pixel ratio at 1.5, and at 1 on phones (`pointer: coarse` or under 820px) for the pixel-bound home stage, sky and plane: at 1.5 phone GPUs fall behind and scrolling stutters. The about map is bound by its vertices, so it keeps 1.5 and leaves out the streets past its fade (`REACH`)
- pauses when off screen or when the tab is hidden
- respects `prefers-reduced-motion` exactly as its mockup does
- disposes fully: cancels the animation frame, disconnects observers, removes listeners, disposes geometries, materials, render targets and composer, then calls `renderer.dispose()` and `renderer.forceContextLoss()`

`src/lib/three/glow.ts` (`createGlowComposer`) is the shared particle glow: bloom, then the faintest light clipped to black. The mockups load three 0.160 and the site runs 0.183, so it restores the 0.160 blur kernels and bloom gain; its unit test fails if a three upgrade changes the composite it corrects.

## Shared Components

- `src/components/site/`: `SiteHeader` (mark plus Projects, About, Contact; a full-screen Menu dialog on phones), `SiteFooter` (email, privacy, copyright), `PlatformIcon name="github" | "linkedin" | "x" | "email"`, `ArrowIcon` (the outbound-link arrow; never the "↗" character, which phones draw as an emoji), `RollText text` (the letter roll on hover), `Heatmap values tone="white" | "green" label compact?`, and `PlainPage.module.css` (privacy, not-found and error pages).
- `TransitionLink` from `@/transitions` for every internal link, so page transitions run.
- `src/data/projects.ts`: the 16 projects in day then night order, with `projectsByHalf`, `nextProject` and `getProjectBySlug`. Each project's story copy (`kind`, `line`, `what`, `why`, `impact`, `stat`) drives the bento, the story page and the home constellation; `context`, `build`, `result` and `tags` fill "Under the hood".
- `src/lib/activity.ts` (`toYearSeries`, `formatCompact`) for the live usage and GitHub figures on Home and About.

## Commands

- `npm test`: unit tests (`node --test` on `src/**/*.test.ts`; Node 23 strips types)
- `npm run build && npx next start -p 3000`: verify against a production build. Avoid `next dev` here (Turbopack has a stray-lockfile cache problem on this machine).
- `npm run check:site -- http://localhost:3000 [group...]`: end-to-end checks in headless Chromium, one group per `scripts/checks/<group>.mjs` (chrome, home, nav-loop, projects, project, about, contact, perf). The contact group intercepts every `/api/contact` request, so it never sends email.
- `npm run check:resilience -- http://localhost:3000/`: the homepage stays readable in a normal browser, with storage blocked, and with JavaScript off.
- `npm run lint`

## File Structure
```
src/
├── app/                     # server pages own the copy and data; force-dynamic where they read the usage DB
│   ├── globals.css          # Tailwind reset, token import, base styles, reduced motion
│   ├── layout.tsx           # fonts, SiteHeader, SiteFooter, page transitions
│   ├── page.tsx             # Home
│   ├── projects/            # bento board (?shift=night) and [slug] story pages
│   ├── about/  contact/  privacy/
│   └── api/                 # contact (Resend), usage, github
├── components/
│   ├── home/                # HomeStage, Ticker, StatsSection, stage/ scene modules
│   ├── projects/            # ProjectsBoard, BentoTile, ProjectMark, ShiftSky + sky.ts, StoryMedia
│   ├── about/               # StreetMap + map.ts, SystemDiagram, ProcessLoop, BuildLog, Connections
│   ├── contact/             # ContactNote, PlaneSky + plane.ts
│   └── site/                # header, footer, icons, RollText, Heatmap
├── data/projects.ts
├── lib/                     # activity, constellation, contact-rules, three/glow, usage and GitHub loaders, gsap
├── styles/tokens.css
└── transitions/             # TransitionProvider, TransitionLink, GSAP page animations
scripts/
├── check-site.mjs + checks/ # end-to-end check groups
└── check-resilience.mjs
```

## Conventions
- `prefers-reduced-motion` is respected globally in `globals.css`, and each scene module follows its mockup
- Dark mode only; pages change the page colour through `--bg`
- Pages are server components; each interactive piece is a small client component (`"use client"`)
- All copy renders with JavaScript off and with WebGL unavailable
- Modules under unit test are pure: relative imports with the `.ts` extension, `import type` for types, no `@/` alias and no `server-only`
- TypeScript strict mode enabled
