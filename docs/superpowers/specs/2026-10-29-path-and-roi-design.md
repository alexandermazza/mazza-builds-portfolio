# Path, ROI Calculator and new films: design

Date: 2026-10-29. Branch: `add-path-roi` (from `origin/main` at 9b7701f).

## Intent

Two day-job tools, Path and the ROI Calculator, go on the portfolio, and the motion-design films Alex made for Distill, Path, the ROI Calculator and the AI Web Tracker Scanner replace or fill each project's media. Path and Distill become the two 9 to 5 projects on the homepage, and because both have strong films, the homepage shows those films too, not only their story pages.

Why: these are the strongest current work projects, and the films explain them faster than copy can. The homepage should lead with the two projects that best show what Alex builds at the day job.

## Goals

- Path: new project, its own story page, an xl tile in 9 to 5, and the second 9 to 5 slot on the homepage with its own particle shape (the trail to a flag) and its film.
- ROI Calculator: new project, its own story page, an xl tile in 9 to 5. Not on the homepage.
- Distill: its film is replaced by the new 62-second cut, on its story page and now also on the homepage.
- AI Web Tracker Scanner: gets its new film and poster on its story page. It leaves the homepage (Path takes its slot).
- Copy for Path and the ROI Calculator comes from the tools' own source and docs, and says only what they support.

## Non-goals

- No change to the 5 to 9 half of the homepage (SecondRound, Daily Roman), the hero, stats, ticker or footer. The transit map gets no redesign, but it is built from the project data, so it grows with the two new projects as designed (see Tests and checks).
- No film on the homepage for projects other than Distill and Path. The film slot is driven by the data (a project with `video` gets one), and only those two homepage projects have videos.
- No change to story pages beyond their media; `StoryMedia` already plays `video` with `poster`.
- No links for Path or the ROI Calculator: both are internal tools behind a company sign-in.

## Anti-goals

- The homepage film must not look like a component pasted onto the page (the plain bordered box was rejected for this reason).
- No fading or blurring into the films' captions or UI (an earlier, deeper feather was rejected because it ate into the text).
- No internal pricing, no client names, no teammate names, and no origin story for the ROI Calculator.
- No em dashes anywhere (project rule; the data test enforces it).
- No claims the repos don't support.

## Decisions (made with Alex, 2026-10-29)

The live preview of these is at https://claude.ai/artifact/WSEGJBfBN9wPL3jm9VW2sQ (version 5). Its source is in `.claude/previews/path/`, which is excluded from git locally: `path-preview.html` and `shapes.mjs` (the `trail()` shape there is the one to port).

1. **Homepage 9 to 5 pair:** Distill (`data-proj` 1), then Path (`data-proj` 2) in place of the Web Tracker Scanner.
2. **Path's shape: Trail to a flag.** A trail switchbacks up a hill drawn as five contour rings, with four touchpoint glyphs standing along it as waypoints (ring, diamond, square, ring, warming from cool to amber), and an amber flag on top where the meeting gets booked. Particles stream up the trail. On desktop it draws **5% smaller** than the other shapes; phones keep full size.
3. **Homepage film placement: under the copy**, on desktop and phones. (A film beat after each project and a film playing inside a particle frame were both previewed and turned down.)
4. **Homepage film treatment: "Glow".** The film screen-blends so its black background drops away and only its light shows on the day blue, like the particles. A light contrast lift (`contrast(1.08)`) takes Distill's #090909 background to black so no box shows. The edges feather over the outer 4% (sides) and 6% (top and bottom) only, clear of the captions, which start about 6% in. No border, no radius.
5. **Projects page:** Path and the ROI Calculator are both `xl`, with Distill and Path side by side as the top row.
6. **ROI Calculator status:** LIVE, including the AI deck builder and order forms (Alex confirmed; the order-form copy is written from the film and Alex's description).
7. **Credit:** the ROI write-up has no origin story.
8. **ROI Calculator tile:** mint `#85d7bf` with midnight `#01232d` for the mark and caption (its own app palette), and the drawn icon from the grid preview at https://claude.ai/artifact/Sib8yKer35scterS7NjVUg (source `.claude/previews/path/grid/grid-preview.html`): a slide on a stand with three rising bars and an up-right arrow. On phones mint sits above Persona Automator's green; Alex chose it after seeing the preview.

## The homepage film

A small client component (e.g. `src/components/home/HomeFilm.tsx`) rendered by `Work` in `src/app/page.tsx` whenever the project has a `video`:

- `<video muted loop playsInline preload="metadata" poster={p.poster} src={p.video}>`, 16:9, `object-fit: cover`.
- Plays while at least about a third of it is on screen and pauses otherwise (IntersectionObserver). With `prefers-reduced-motion`, it never autoplays; the poster stays.
- Clicking or tapping opens it bigger: the platform's fullscreen on the video element (`requestFullscreen`, or `webkitEnterFullscreen` on iPhone Safari), with native controls while fullscreen. In fullscreen the blend, mask and filter are switched off. (The preview used a custom dialog; native fullscreen does the same job with less code and works on iPhone. Builder's call if it misbehaves.)
- Accessible name along the lines of "Watch the Path film", and a visible focus ring.
- Size: `min(640px, 43vw)` wide on desktop, overflowing the item's 520px text column on purpose (the shape starts around 47vw). Full width on phones (`max-width: 820px`), sitting below the line, inside the item's existing flex-end layout.

**Layering, the one non-obvious part.** `.root` in `Home.module.css` is `position: relative; z-index: 2`, which makes it a stacking context. A screen blend inside it blends against a transparent backdrop, so the film's black would stay black and the box would show. (An opaque day-blue backing behind the film was considered and dropped: on phones the stage canvas is fixed while the copy scrolls, so each film passes up through the shape on its way out, and an opaque box would cut a hard rectangle out of the particles.)

So the film blends with the real page instead, and nothing gets a backing:
- `HomeStage.tsx` mounts the stage canvas with `document.body.prepend(canvas)` instead of `appendChild`. It stays on body, outside the transition container, as its comment requires.
- `.root` drops `z-index: 2` and keeps `position: relative`. The canvas (fixed, `z-index: 0`) and `.root` (positioned, `z-index: auto`) now paint in the same layer in document order, so the page still paints above the canvas, and the canvas still paints over the in-flow site footer as it does today. The transition container has no stacking properties at rest (`flex: 1 0 auto` only), and the site header (fixed, z-index 20 and 100) is unaffected.
- The film's screen blend then reaches the body's background and the particles. It follows the page's fade between day blue and black without extra code, and still works without WebGL.
- Known gap: during a page transition the container briefly gets a z-index, so a film that is on screen then shows its black box for the length of the animation. Accepted.
- Update the comments that explain these lines (the canvas mount in `HomeStage.tsx`, `.root` and `.stage` in `Home.module.css`).

## Path's particle shape

In `src/components/home/stage/work.ts`:

- Port `trail()` from `.claude/previews/path/shapes.mjs` into the TypeScript conventions of the file (`P3`, `Bundle`, `ShapeDef`), with the touchpoint `glyph` helper (ring, diamond, square) it uses. It has 14 bundles, like every shape.
- Replace `scanner()` with it in the shape list: `[hammer(), distill(), trail(), secondRound(), colosseum()]`. Delete `scanner()`, which nothing else uses.
- Add a desktop-only scale to `ShapeDef` (for example `wide?: number`, default 1), blended like `size` when the shape changes, and applied only when `!ctx.narrow()`. The trail sets it to 0.95. `uLit` dims by the drawn area, as it already does for `size`, so use the combined scale there.
- `scripts/checks/home.mjs` lists the homepage work slugs and has `phoneShapes` cases that name the Scanner; point both at `path`.

## Projects page order (9 to 5)

The array order, which the bento grid fills densely on 4 columns:

`distill, path, roi-calculator, pipeline-attribution, event-hub, web-tracker-scanner, vendor-fingerprint, persona-automator, trailmix, semrush-enricher, event-attributor`

Cells: 4 + 4 + 4 + 2 + 2 + 2 + 2 + 1 + 1 + 1 + 1 = 24, six full rows. On desktop it lands as:

```
DISTILL  DISTILL  PATH      PATH
DISTILL  DISTILL  PATH      PATH
ROI      ROI      PIPELINE  PERSONA
ROI      ROI      PIPELINE  TRAILMIX
EVENTHUB EVENTHUB SCANNER   SCANNER
VENDOR   VENDOR   SEMRUSH   ATTRIBUTOR
```

My call: the Scanner moves down a row and Persona moves ahead of Trailmix, so that no two similar colours touch. Without that, ROI's tile sits beside the Scanner's teal, and Path's orange sits on top of Trailmix's amber. This also changes the next-project chain, which follows the array.

## Data entries (`src/data/projects.ts`)

Story copy (`kind`, `line`, `what`, `why`, `impact`, `stat`) is for friends and family, with no jargon or stack names. Under the hood (`context`, `build`, `result`, `tags`) is for recruiters and developers.

### Path (new, `half: "day"`, second in the list)

- slug `path`, name `Path`
- copy (`kind`, `line`, `what`, `why`, `impact`, `stat`, `context`, `build`, `result`): as approved and shipped in `src/data/projects.ts`
- tags: `["Next.js", "Postgres", "HubSpot", "OpenRouter"]`
- bento `xl`, mark `{ type: "stencil", src: "/projects/path/stencil.png" }`
- fill `#ff8b3d` (the logo's orange), with markColor and textColor very dark shades of that orange, per the skill's colour rule. Check the caption reads.
- video `/projects/path/clip.mp4`, poster `/projects/path/poster.jpg`, links `[]`


### ROI Calculator (new, `half: "day"`, third in the list)

- slug `roi-calculator`, name `ROI Calculator`
- copy (`kind`, `line`, `what`, `why`, `impact`, `stat`, `context`, `build`, `result`): as approved and shipped in `src/data/projects.ts`
- tags: `["Python", "FastAPI", "Claude API", "Playwright"]` (all existing hubs on the transit map)
- bento `xl`, video `/projects/roi-calculator/clip.mp4`, poster `/projects/roi-calculator/poster.jpg`, links `[]`
- fill `#85d7bf`, markColor `#01232d`, textColor `#01232d`
- mark `{ type: "icon", name: "roi-calculator" }`: add `"roi-calculator"` to the icon union in `Mark` (`src/data/projects.ts`) and draw it in `ICONS` (`src/components/projects/ProjectMark.tsx`), in the house style (100x100 viewBox, 6.5 stroke, round caps and joins). The approved drawing, from the grid preview: `<rect x="10" y="12" width="80" height="58" rx="6"/>`, `<path d="M50 70v12M34 92l16-10 16 10"/>`, `<path d="M28 56v-8M42 56V40M56 56V32"/>`, `<path d="M66 44l12-14M68 30h10v10"/>`.


### Distill (changed)

- `clip.mp4` and `poster.jpg` replaced with the new cut (`~/Downloads/distill.mp4`, 960x540, 62 s). No copy changes.

### AI Web Tracker Scanner (changed)

- Add `video: "/projects/web-tracker-scanner/clip.mp4"` and `poster: "/projects/web-tracker-scanner/poster.jpg"` (from `~/Downloads/web-tracker-scanner.mp4`, 1920x1080, 30 s, and `~/Downloads/web-tracker-scanner-poster.jpg`).
- Drop its `image` (StoryMedia prefers the video), and delete `public/projects/web-tracker-scanner/scannerhome.jpg`, which nothing else uses. Confirm with a grep before deleting.

## Assets

The sources are in `~/Downloads`, treated as untrusted input files: ffmpeg reads them, nothing executes them.

| File | From | How |
|---|---|---|
| `public/projects/path/clip.mp4` | `path.mp4` (1920x1080, 60 fps, 35 s) | `scale=1280:-2,fps=30`, libx264 `-crf 26 -preset slow`, `-an`, `+faststart`, yuv420p. About 2 MB. |
| `public/projects/path/poster.jpg` | the same film, at 31 s (the end card) | `-q:v 3`, 1280 wide |
| `public/projects/path/stencil.png` | Path's logo (1000 px, orange P with black arches on white) | Alpha from darkness, the skill's "logo on white" branch, so the P carries as a lighter tone and the arches as full ink, cropped to its bounding box. PIL is broken on this machine (wrong architecture), so do it with ffmpeg (`format=gray,negate` merged as alpha onto white). Look at it on the tile. |
| `public/projects/roi-calculator/clip.mp4` | `roi-business-case-builder.mp4` (1920x1080, 60 fps, 35 s) | same settings as Path. About 2 MB. |
| `public/projects/roi-calculator/poster.jpg` | its end card | as above |
| `public/projects/distill/clip.mp4` | `distill.mp4` (960x540, 30 fps, 62 s, 1.5 MB) | stream copy with `-an -movflags +faststart` |
| `public/projects/distill/poster.jpg` | the same film at about 7 s (Gong and HubSpot flowing into Distill) | `-q:v 3` |
| `public/projects/web-tracker-scanner/clip.mp4` | `web-tracker-scanner.mp4` | same settings as Path |
| `public/projects/web-tracker-scanner/poster.jpg` | `web-tracker-scanner-poster.jpg` (1920x1080) | scale to 1280 wide |

Compressed copies of the Path and Distill films already exist in `.claude/previews/path/` with exactly these settings.

## Proprietary screenshots come off five story pages

Alex asked (2026-10-29) to stop showing screenshots of five work tools. Each drops its `image`, so `StoryMedia` falls back to the project's mark on its own colour, as Persona Automator already does. Then delete the file, since anything left in `public/` is still downloadable by URL:

| Project | Field to drop | File to delete |
|---|---|---|
| Event Hub | `image: "/projects/event-hub/video-poster.jpg"` | `public/projects/event-hub/video-poster.jpg` |
| Pipeline Attribution Agent | `image: "/projects/pipeline-attribution/dashboard.jpg"` | `public/projects/pipeline-attribution/dashboard.jpg` |
| Trailmix | `image: "/projects/trailmix/trailmixslack.jpg"` | `public/projects/trailmix/trailmixslack.jpg` |
| Vendor Fingerprint | `image: "/projects/vendor-fingerprint/image.png"` | `public/projects/vendor-fingerprint/image.png` |
| Semrush Enricher | `image: "/projects/semrush-enricher/semrush.jpg"` | `public/projects/semrush-enricher/semrush.jpg` |

The repo is public, so these files stay in its git history. Alex chose not to rewrite history.

## The about page's systems diagram

`src/components/about/SystemDiagram.tsx` lists, by hand, where the data lives, the tools, and the teams who use them, and draws wires between them. It doesn't read `projects.ts`, so add two rows to `TOOLS`, after Distill, in the same `[id, name, note, sources, teams]` form:

- `["path", "Path", "Who's warm, and what to do next", ["hubspot", "web"], ["sales", "mkt", "lead"]]`: HubSpot is its data spine, and its SDR research hub searches the open web. Reps and SDRs work its lists, marketing reads its content scorecard, and sales leadership set its trust bar.
- `["roi", "ROI Calculator", "A business case for every deal", ["hubspot", "gong"], ["sales"]]`: the brief pulls the deal from HubSpot and call transcripts from Gong, and the reps build the cases.

(My mapping. Alex can correct it.)

The homepage's "How it all connects" transit map needs no code: it is built from `projects.ts`, so both new projects appear on it (see Tests and checks).

## The bio (homepage intro and about page)

Alex's new bio replaces the current one ("Spent years in GTM ops...") on both pages, word for word:

> I'm Alex Mazza. I've spent years as an operator at different startups. I realized that I'm better off building great tools than working within the confines of rigid ones. Now I'm building my own tools that reduce friction, turn hours of work into minutes, and are genuinely fun to use.
>
> Day job: GTM Engineer at a healthcare SaaS company. Side projects: whatever I can't stop thinking about.

- About page (`src/app/about/page.tsx`): the first paragraph becomes the bio, and the second becomes the "Day job" line. The old list ("AI-powered apps, automation systems, and tools end-to-end...") goes.
- Homepage (`src/app/page.tsx`, the `lede` paragraph): the same text, kept as the one paragraph it is today (my call; a second paragraph at lede size would push the intro down).
- The title is "GTM Engineer", dropping "Senior" and ", AI". These two bios are the only places it appears.
- Use `&apos;` for apostrophes in JSX, as the surrounding code does.

## Tests and checks

- `src/data/projects.test.ts`: 18 entries; the new `DAY` order above; the next-project walk becomes 18 long and still wraps from `f1-globe` back to `distill`; the chain crosses from `event-attributor` to `secondround`. The existing tests then cover em dashes, empty strings, media paths and whole bento rows.
- The transit map is built from the data by `buildTransit` and grows on its own: 18 stops, Claude runs through 6 projects, and FastAPI and Playwright each reach three projects, so phones show 8 lines instead of 6. That's intended. Update the expectations in `scripts/checks/home.mjs` to match (phone line chips, the Claude count).
- `src/components/projects/shift.tsx` hard-codes "9 projects." for 9 to 5; it becomes "11 projects.". Change only the number: importing the project data there would pull it into a client bundle.
- `scripts/checks/home.mjs` checks that the intro contains "Senior GTM Engineer, AI"; change it to "GTM Engineer at a healthcare SaaS company".
- Both new films label their screens "Example data", so showing them publicly is fine.
- `npm test`, `npx tsc --noEmit`, then `npm run build && npx next start -p 3100` and `node scripts/check-site.mjs http://localhost:3100 projects project home`. Never `npm run dev` (flaky Turbopack cache on this machine).
- Alex checks visually: the homepage 9 to 5 half on desktop and a phone (shape, film edges, autoplay and pause, fullscreen), `/projects` in both halves at 1440 px and 390 px, and the four story pages.

## Left to the builder

- How `HomeFilm` is structured, and where its CSS lives (a CSS module next to it, or `Home.module.css`).
- The exact very-dark mark and text shades for Path, under the skill's colour rule.
- The visibility threshold for play and pause (the preview used 35%).
- Whether to keep a custom viewer if native fullscreen misbehaves somewhere.

## Open

Nothing. Alex chose mint and the drawn icon for the ROI Calculator after seeing the grid preview.
