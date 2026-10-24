# Design Refresh - Approved Design

Date: 2026-10-24. Status: every page approved by Alex in review rounds, 2026-10-22 to 2026-10-24.

The four mockups in `2026-10-24-design-refresh/` are the source of truth for layout, copy, motion and the three.js scenes. Where this document and a mockup disagree, this document wins (it records decisions made after the mockup was frozen). Published previews, for clicking through:

| Page | Mockup file | Preview |
|---|---|---|
| Home | `home.html` | https://claude.ai/artifact/71LzNjF4zmvckXNxvdDmfS |
| Projects (bento) | `projects.html` | https://claude.ai/artifact/1c8g7vgc8TzEWxkTtYh8fF |
| About | `about.html` | https://claude.ai/artifact/5GU9qhckoaXy7JFw8FnyCX |
| Contact | `contact.html` | https://claude.ai/artifact/4YuRVk91E1SfUGrgaRCwkX |

Mockup media (compressed screenshots, the Distill clip, one-tone logo stencils, the street data) lives in the git-ignored `.design-preview/` folders of the `design-refresh` worktree: `projects-v2/media/` (stencils in `media/marks/`), `about-v1/city.json` and `about-v1/media/sketch.jpg`.

## Design language

- Dark only. Page black `#000000`; the projects page's 9 to 5 shift is deep day blue `#0b1d33`; the about page is a navy blueprint (`#0b1a2d` with a 24px grid).
- Type: **Big Shoulders** (display, 600 to 900, uppercase headings) and **Schibsted Grotesk** (text, 400/500/600, italic 400). Replaces Space Grotesk, Space Mono and Instrument Serif.
- One accent: amber `#ffc24d`. Errors: `#ff8a7a`. Ink `#f1f2f3`, secondary ink `#a9b0b9`, tertiary `#6b727c`, hairlines `rgba(255,255,255,0.14 to 0.16)`.
- 3D look: luminous particle and light scenes on black (dusty filaments, soft additive points, tight bloom with the faintest light clipped to black). Never solid objects.
- Motion: ease `cubic-bezier(0.22, 1, 0.36, 1)`; staggered rises; everything off for `prefers-reduced-motion`.
- No tag pills, no hover underlines, no accordion rows, no tables-as-design. Diagrams, rings, logs and grids instead.

## Site chrome (decided 2026-10-24)

- **Top bar on every page:** MAZZA BUILDS mark on the left (links home); Projects, About, Contact on the right. On phones a Menu button opens a full-screen list (Home, Projects, About, Contact) in large display type; Close or Escape shuts it.
- **Footer:** minimal, every page: email, privacy link, copyright. The old 3D-model credits go with the models.

## Home (`home.html`)

1. **Hero:** the MB claw-hammer logo as a 3D particle object: hammer upright in the centre, M and B extruded and swung back 45 degrees apart, letters filled, near-white, builds from dust, dissolves bottom to top and rebuilds on a loop, cursor distortion field on desktop, tap burst on phones. Headline MAZZA BUILDS, tag "building things that work".
2. **Intro:** today's intro copy, except the day-job line now reads **"Day job: Senior GTM Engineer, AI, at a healthcare SaaS company."** (decided 2026-10-24). Dictionary entry. A particle claw hammer beside it, which morphs into Distill's shape as Selected work arrives.
3. **2026, so far:** tokens (white heatmap) and GitHub contributions (GitHub green heatmap and logo), from the live loaders, both counted for the current calendar year.
4. **Ticker:** "Building things like..." with iOS Apps, AI Agents, Dashboards, Web Crawlers, Trading Bots, Shopify Apps, MCP Servers, Attribution Engines, GTM Tools; drifts on its own, drag or swipe sideways (grab cursor on desktop), coasts on release.
5. **Selected work:** 9 to 5 (day blue, sun glyph): Distill, AI Web Tracker Scanner. 5 to 9 (black, moon glyph): SecondRound, Daily Roman. Each shown by a particle shape: Distill funnel into a light bulb, scanner magnifying glass over a page with three amber trackers, SecondRound fanned resumes, Daily Roman Colosseum. Shifts trigger when a half's heading reaches mid-screen.
6. **How it all connects:** all projects as a draggable 3D network linked through shared tools (tags mapped to hubs, OpenAI/Gemini/OpenRouter/LLM grouped as "Other LLMs"); tap a project to light its links and open a card linking to its project page.
7. **Footer piece:** "Let's build something." with the email, over the contour-lines particle field.

## Projects (`projects.html`, bento layout)

- Header with the 9 to 5 / 5 to 9 switch: sliding pill that stretches as it travels, sun rays spin in, moon rocks in. A three.js particle sun (amber ring and twelve rays) and moon (cool white crescent) morph into each other through dust over about 2 seconds.
- Day: deep blue page, 9 projects. Night: black, 7 projects. Intro lines per half as in the mockup.
- Bento grid, 4 columns (2 on phones): each tile one solid colour with the project's mark stencilled in one tone (stencils from the mockup media, SecondRound as true vector paths, drawn monoline icons for Tracker Scanner, Kalshi Weather Trader, Kalshi Trading MCP, Shakedown). Daily Roman's bust drawn at 58% so it is not pixelated. Names roll letter by letter on hover; marks tilt.
- Tiles rise in one after another on load; on a shift change the old set drops away in sequence, then the new set rises.
- All 16 descriptions are the plain-language copy in the mockup (kind, line, what, why, impact, optional stat). The three forced stats are already dropped.

## Project pages (`/projects/[slug]`)

- The mockup's story page: the half's eyebrow (sun or moon), big name, one-line pitch, media (video, screenshot, or the coloured stencil), one big amber stat when present, then "What it does / Why it's cool / The impact" hanging off one line with a dot per part, then a big "next project" link that crosses from the last 9 to 5 project into the night.
- **Under the hood (decided 2026-10-24):** a collapsed section at the bottom with today's technical write-up (context, build, result) and the stack, for recruiters and developers.

## About (`about.html`)

- Blueprint spec sheet: identity (today's bio, with the same day-job change as Home; the blue-and-white sketch at 85% opacity, no caption), Chicago street map (real streets on a tilted plan, streets rise under the cursor, camera fixed, white labels, red heart on River North, no "River North" label, faded edges), "The system I run at work" wiring diagram (trace on hover or tap), compact activity strip, "A loop, not a line" process ring with monoline icons on stops and steps, the build log (v0.1 Loras to v6.0 Freshpaint), Connections with GitHub, LinkedIn, X and email logos.

## Contact (`contact.html`)

- Fill-in-the-blank note ("Hi Alex, my name is ___, and you can reach me at ___. Here's what's on my mind:") with a message box; today's intro copy verbatim; inline validation and status (no pop-ups); the particle paper plane warms from white to amber as fields fill, launches as a streak on send and settles into a check; "Write another" resets. The real form posts to the existing `/api/contact` (Resend), same three fields and rules. No clock or location in the top bar (removed 2026-10-24).

## Constraints

- Zero upkeep: nothing that needs manual updates or recurring token cost. Live numbers come from the existing usage and GitHub loaders.
- Content stays readable with JavaScript off, with WebGL unavailable, and with storage blocked (the resilience check). Canvases are decoration.
- No em dashes in any copy.
