---
name: adding-portfolio-project
description: Use when adding a new project to this portfolio (the Mazza Builds site). Trigger when the user has dropped a logo plus an optional screen recording or screenshots into public/projects/ and wants it on the projects page (9 to 5 or 5 to 9), the homepage network, and its own story page.
---

# Adding a Portfolio Project

## Overview

A new project is one entry in `src/data/projects.ts` plus its files in `public/projects/<slug>/`, and two list updates in `src/data/projects.test.ts`. The data drives everything:
- the projects page bento grid, either 9 to 5 (`half: "day"`) or 5 to 9 (`half: "night"`), in array order
- the `/projects/<slug>` story page and its Under the hood section
- the next-project chain
- the homepage's "How it all connects" network, linked through `tags`

The homepage's Selected work shows four hand-picked projects with custom particle shapes in `src/components/home/stage/work.ts`. A new project does not appear there unless the user asks, and that is a design task, not a data change.

## Step 0: Preflight, do the assets exist?

The user drops assets into `public/projects/<folder>/` first. Before asking anything, `ls` that folder and confirm:

- **Required:** a logo to stencil onto the tile. If there is no logo, the fallback is a drawn monoline icon, which needs a design decision (see Step 4).
- **Optional:** a screen recording or a screenshot for the story page.

If the folder or a usable image is missing, stop and tell the user what to add. Don't invent assets. Folder and file names often have spaces, so quote paths and normalize names in Step 2.

## Step 1: Ask the user four things

1. **Which half:** 9 to 5 (built at the day job) or 5 to 9 (side project)? And where in that half, by default last.
2. **Name.** The slug is the kebab-case folder name under `public/projects/`.
3. **What to reference:** a GitHub repo (`owner/name`) and/or a live URL. The README is the source for the copy.
4. **Tile colour:** the project's main brand colour, if it has one. Otherwise propose one that differs from the other tiles in that half.

## Step 2: Normalize the assets

In `public/projects/<slug>/`:

- **Stencil:** make `stencil.png`, a one-tone mark where the alpha channel carries the shape and any shading. The tile paints it in `markColor` through a CSS mask, so its colours don't matter.
  - For a logo on a transparent background, keep its alpha.
  - For a logo on white, take alpha from darkness:

```bash
python3 - <<'PY'
from PIL import Image, ImageOps
src, out = "public/projects/<slug>/logo.png", "public/projects/<slug>/stencil.png"
im = Image.open(src).convert("RGBA")
if im.getextrema()[3][0] < 250:          # has real transparency: keep it
    alpha = im.getchannel("A")
else:                                     # logo on white: darker means more ink
    alpha = ImageOps.invert(im.convert("L"))
mark = Image.new("RGBA", im.size, (255, 255, 255, 0)); mark.putalpha(alpha)
mark.crop(mark.getbbox()).save(out)
PY
```

  Open the result and check it reads as the logo. Low-resolution sources look pixelated at tile size, so set `markScale` (Daily Roman uses 0.58).
- **Video:** rename and compress any recording to `clip.mp4`. Story pages autoplay it muted, so drop the audio. Grab a `poster.jpg` from its first frame:

```bash
ffmpeg -y -i "<source>.mov" -vf "scale=1280:-2,fps=30" -c:v libx264 -crf 28 -preset medium -an -movflags +faststart -pix_fmt yuv420p clip.mp4
ffmpeg -y -i clip.mp4 -frames:v 1 -q:v 3 poster.jpg
```

  Delete the original and keep `clip.mp4` under about 10MB. If it's heavier, raise `-crf` to 30 or 32, or trim the clip.
- **Screenshot:** a single screenshot becomes `image.jpg` (about 1600px wide).

## Step 3: Write the copy

Read the README (private repos: `gh repo view <owner>/<name>`). There are two registers.

**The story, for friends and family.** No jargon, no stack names. Match the voice and length of the existing entries:
- `kind`: what it is and where, e.g. "Internal app at Freshpaint" or "iPhone app".
- `line`: one sentence on what it does. It shows on the tile and the homepage card.
- `what`: what it does, 2 or 3 sentences.
- `why`: why it's cool, i.e. the problem before and what changes.
- `impact`: the result, with a number only if the source supports it.
- `stat`: optional, `[figure, what it counts]`. Leave it out rather than force one.
- `link`: optional, `[label, url]`, for public projects only.

**Under the hood, for recruiters and developers:**
- `context`: the problem.
- `build`: what it is and the engineering decisions worth calling out.
- `result`: where it landed.
- `tags`: 3 or 4, from the real stack, using the house names (`Claude API`, not `@anthropic-ai/sdk`). Tags drive the homepage network, so reuse existing names wherever they fit. A tag only becomes a hub when two or more projects share it; synonyms are folded in `src/lib/constellation.ts`.
- `links`: `[]` for private or gated tools, otherwise `Live` and/or `Source`. Confirm with the user.

No em dashes anywhere. Don't fabricate: if the source doesn't say it, leave it out.

## Step 4: Add the entry to `src/data/projects.ts`

Place it in the half's run of the array where the user wants it: day entries come first, then night. Copy the shape of a neighbour:

```ts
{
  slug: "event-hub",
  half: "day",
  name: "Event Hub",
  kind: "Internal app at Freshpaint",
  line: "...", what: "...", why: "...", impact: "...",
  stat: ["4x", "..."],                       // optional
  fill: "#f2645f",                           // tile colour
  markColor: "#3b0f0d",                      // the stencil's one tone
  textColor: "#2d0b0a",                      // name and caption on the tile
  bento: "wide",                             // "xl" | "wide" | "tall" | "sm"
  mark: { type: "stencil", src: "/projects/event-hub/stencil.png" },
  image: "/projects/event-hub/image.jpg",    // or video + poster
  context: "...", build: "...", result: "...",
  tags: ["Next.js", "TypeScript", "SQLite", "HubSpot"],
  links: [],
},
```

**Colours.** On a light `fill`, use a very dark shade of the same hue for `markColor` and a slightly darker one for `textColor`. On a dark or saturated `fill`, use white for both. Check that the caption is readable.

**Tile size.** Cells are xl 4, wide 2, tall 2, sm 1. Each half's total must be a multiple of 4, or the grid ends with a gap. A new tile usually means rebalancing: for example, add two `sm` tiles, or turn a `wide` into an `xl`. Check the result at 1440px and 390px.

**Mark types.** `stencil` is the default. `vector` is for logos that exist as SVG paths (SecondRound). `icon` uses the drawn monoline icons in `ProjectMark.tsx`; adding a new icon means drawing one in that style, so ask first.

## Step 5: Update the tests

In `src/data/projects.test.ts`, add the slug to `DAY` or `NIGHT` in its position, and bump the total in the "has N entries" test. The test then checks:
- every story string, and that there are no em dashes
- that every media path exists
- that both halves fill whole rows
- that the next-project chain walks every project

## Step 6: Verify

```bash
npm test
npm run build && npx next start -p 3100
node scripts/check-site.mjs http://localhost:3100 projects project home
```

Never use `npm run dev` for checks; the Turbopack cache is flaky on this machine. Then offer the user a look at `/projects` (both halves) and the new story page.

## Common mistakes

| Mistake | Fix |
|---|---|
| A gap at the end of the grid | That half's cells aren't a multiple of 4; rebalance `bento` sizes (Step 4). |
| The stencil is a solid rectangle | The logo sat on white and its alpha was kept; rebuild it with the invert branch (Step 2). |
| A pixelated mark | Set `markScale` below 1, or find a larger logo. |
| Jargon in `line` / `what` / `why` / `impact` | Move it to `build`; the story is for friends and family. |
| The project floats alone in the homepage network | None of its tags is shared; reuse an existing tag name if one is true. |
| Committing a 90MB `.mov` | Always compress to `clip.mp4` first (Step 2). |
| Em dashes in copy | Project rule: never. Use hyphens or rephrase. |
