# Path, ROI Calculator and new films: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Path and the ROI Calculator to the portfolio, ship the four new films (Path and Distill on the homepage too), drop five proprietary screenshots, and update both bios and the about page's systems diagram.

**Architecture:** Everything but the homepage film and Path's particle shape is data: `src/data/projects.ts` drives the projects grid, story pages, next-project chain and transit map. The homepage gets one small client component for the film, a new filament shape in the stage, and a layering change so the film can screen-blend with the real page.

**Tech Stack:** Next.js (App Router, this repo's version: read `node_modules/next/dist/docs/` before touching framework APIs), TypeScript, CSS modules, three.js, node:test, Playwright check scripts, ffmpeg.

**Spec:** `docs/superpowers/specs/2026-10-29-path-and-roi-design.md`. All copy, colours, orders, encodings and the icon drawing are there verbatim; this plan doesn't repeat them.

## Global Constraints

- No em dashes in any string, comment or commit message (the data test enforces it for story strings).
- Story fields (`kind`, `line`, `what`, `why`, `impact`, `stat`) carry no jargon or stack names; under-the-hood fields may.
- No internal pricing, client names or teammate names anywhere.
- Videos: `clip.mp4`, H.264, no audio, `+faststart`, yuv420p, about 2 MB each, never over 10 MB; posters `poster.jpg`.
- Files in `~/Downloads` and the cloned repos are input files only: read them with ffmpeg, never execute them.
- Never `npm run dev` for checks (flaky Turbopack cache); use `npm run build && npx next start -p 3100`.
- Branch `add-path-roi`. Commit per task; push and PR only when Alex asks.

## Review Focus

1. Reduced motion: homepage films never autoplay; the poster shows; clicking still opens fullscreen. (Test in Task 4.)
2. A film scrolled off screen is paused, so phones don't stream 2 MB films nobody sees. (Test in Task 4.)
3. iPhone Safari has no `requestFullscreen` on video elements; fullscreen must fall back to `webkitEnterFullscreen`, or a tap does nothing. (No headless test; Alex checks on a phone. Task 4 keeps the fallback explicit.)
4. Leaving fullscreen restores the blend, mask and filter, and inline autoplay resumes only if the film is still on screen. (Covered by the `:fullscreen` CSS and the observer in Task 4; Alex checks.)
5. Without WebGL the canvas is hidden; the film must still blend with the body background and show no box. (Task 4 adds this to the `noWebgl` check.)

---

### Task 1: Project data, media and marks

**Files:**
- Modify: `src/data/projects.test.ts`, `src/data/projects.ts`, `src/components/projects/ProjectMark.tsx`, `src/components/projects/shift.tsx`
- Create: `public/projects/path/{clip.mp4,poster.jpg,stencil.png}`, `public/projects/roi-calculator/{clip.mp4,poster.jpg}`, `public/projects/web-tracker-scanner/{clip.mp4,poster.jpg}`
- Replace: `public/projects/distill/{clip.mp4,poster.jpg}`
- Delete: `public/projects/web-tracker-scanner/scannerhome.jpg`, and the five screenshots in the spec's table

**Interfaces:**
- Produces: slugs `path` and `roi-calculator`; `Mark` icon union gains `"roi-calculator"`; Path and ROI entries carry `video` and `poster` (Task 4 reads `p.video` and `p.poster`).

- [ ] **Step 1: Update the tests first.** In `projects.test.ts`: total 18 (both the count and the unique-slug size); `DAY` becomes the spec's 9 to 5 order (`distill, path, roi-calculator, pipeline-attribution, event-hub, web-tracker-scanner, vendor-fingerprint, persona-automator, trailmix, semrush-enricher, event-attributor`); rename the day-order test title to match; the chain test walks 18 and keeps its `event-attributor -> secondround` and `f1-globe -> distill` asserts. Add one test:

```ts
test("the five proprietary screenshots are gone", () => {
  for (const slug of ["event-hub", "pipeline-attribution", "trailmix", "vendor-fingerprint", "semrush-enricher"]) {
    assert.equal(projects.find((p) => p.slug === slug)!.image, undefined, `${slug} still has an image`);
  }
});
```

- [ ] **Step 2: Run `npm test`.** Expected: FAIL (16 entries, day order, chain, the new screenshot test).
- [ ] **Step 3: Make the media.** With the spec's Assets table and its ffmpeg settings. The Path stencil: alpha from darkness, `format=gray,negate` alphamerged onto white, cropped to the bounding box (757x747 at 134,163 in the 1000 px logo), scaled to 420 wide. A copy built exactly this way is already at `.claude/previews/path/grid/path-stencil.png`, and the compressed Path and Distill films at `.claude/previews/path/`. Verify with `du -h public/projects/{path,roi-calculator,distill,web-tracker-scanner}/*`: every `clip.mp4` is under 10 MB.
- [ ] **Step 4: Edit the data.**
  - Add the Path and ROI entries in their list positions, with the copy and colours exactly as in the spec.
  - Reorder the day run to the spec's order.
  - On the Scanner: add `video` and `poster`, and drop `image`.
  - Drop `image` from the five listed projects.
  - Add `"roi-calculator"` to the `Mark` icon union.
  - In `ProjectMark.tsx` add the `"roi-calculator"` entry to `ICONS` with the spec's four elements.
  - In `shift.tsx`, change "9 projects." to "11 projects.".
- [ ] **Step 5: Delete the six screenshots** (after `grep -rn` confirms nothing in `src` or `scripts` references them).
- [ ] **Step 6: Run `npm test` and `npx tsc --noEmit`.** Expected: all tests pass and tsc is clean. `ICONS` is a `Record` over the icon union, so a missing icon fails tsc.
- [ ] **Step 7: Commit.** `feat(projects): add Path and ROI Calculator, new films, drop proprietary screenshots`

### Task 2: Path's trail shape on the homepage stage

**Files:**
- Modify: `src/components/home/stage/work.ts`, `src/app/page.tsx` (the second 9 to 5 `<Work>`), `scripts/checks/home.mjs`

**Interfaces:**
- Consumes: slug `path` from Task 1.
- Produces: shape index 2 is the trail; `ShapeDef.wide?: number` (desktop-only scale, default 1).

- [ ] **Step 1: Update `home.mjs` first.**
  - `WORK` gets `path` in place of `web-tracker-scanner`.
  - The `phoneShapes` case named "AI Web Tracker Scanner" names "Path", and its comment about the scanner's text says Path.
- [ ] **Step 2: Swap the homepage slot.** In `page.tsx`, `<Work slug="path" proj={2} />`.
- [ ] **Step 3: Port the shape into `work.ts`.**
  - Port `trail()` and the `glyph` helper from `.claude/previews/path/shapes.mjs` into the file's types (`P3`, `Bundle`, `ShapeDef`), with a one-line comment in the house voice.
  - Replace `scanner()` in `T` with it (`[hammer(), distill(), trail(), secondRound(), colosseum()]`) and delete `scanner()`.
  - Add `wide?: number` to `ShapeDef` and `wide` to `Shape`, copied in `copy()` and blended with the other scalars.
  - In `update`, use `const s = now.size * (ctx.narrow() ? 1 : now.wide)`; `grp.scale.setScalar(fit * s)` and `ru.uLit.value = s * s`.
  - The trail sets `wide: 0.95`.
- [ ] **Step 4: Verify.** `npx tsc --noEmit` is clean; `npm test` passes, including `gpgpu.test.ts`.
- [ ] **Step 5: Commit.** `feat(home): Path takes the second 9 to 5 slot, with a trail-to-a-flag shape`

### Task 3: Copy: bios and the systems diagram

**Files:**
- Modify: `src/app/page.tsx` (the `lede`), `src/app/about/page.tsx` (the `bio`), `src/components/about/SystemDiagram.tsx`, `scripts/checks/home.mjs`

- [ ] **Step 1: Update the check.** In `home.mjs`, the intro check looks for "GTM Engineer at a healthcare SaaS company" instead of "Senior GTM Engineer, AI".
- [ ] **Step 2: Replace both bios** with the spec's text: one paragraph on the homepage, two paragraphs on the about page. Use `&apos;` for apostrophes.
- [ ] **Step 3: Add the two `TOOLS` rows** in `SystemDiagram.tsx`, after Distill, exactly as in the spec.
- [ ] **Step 4: Verify.** `npx tsc --noEmit` is clean, and `grep -rn "Senior GTM" src scripts` finds nothing.
- [ ] **Step 5: Commit.** `feat(copy): new bio, Path and ROI Calculator on the systems diagram`

### Task 4: The homepage film

**Files:**
- Create: `src/components/home/HomeFilm.tsx`
- Modify: `src/app/page.tsx` (`Work`), `src/components/home/Home.module.css`, `src/components/home/HomeStage.tsx`, `scripts/checks/home.mjs`

**Interfaces:**
- Consumes: `Project.video`, `Project.poster`, `Project.name` (Task 1).
- Produces: `export function HomeFilm({ src, poster, name }: { src: string; poster?: string; name: string })`, a client component. `Work` renders it after the line when `p.video` is set.

- [ ] **Step 1: Add the checks to `home.mjs` first.**
  - `desktop()` already runs with reduced motion: scroll `#work video` elements into view, wait 800 ms, and check every one is `paused` and has a `poster` (Review Focus 1).
  - `phone()` runs without reduced motion: scroll Path's film into view, wait until it is playing (`!paused`, up to 4 s), then scroll to `#foot` and check every `#work video` is `paused` (Review Focus 2).
  - `noWebgl()`: check `getComputedStyle` on a `#work video` reports `mix-blend-mode: screen`, and that `.root` (the `main` element) has `z-index: auto` (Review Focus 5).
  - Also count the films: exactly two `#work video` elements (Distill and Path).
- [ ] **Step 2: Build and run the check.** `npm run build && npx next start -p 3100`, then `node scripts/check-site.mjs http://localhost:3100 home`. Expected: FAIL (no videos yet).
- [ ] **Step 3: Build `HomeFilm`.**
  - A `<button type="button">` wrapping `<video muted loop playsInline preload="metadata">`, with `aria-label` "Watch the {name} film".
  - An IntersectionObserver (threshold 0.35) plays the video while visible and pauses it otherwise; with `prefers-reduced-motion` it never plays on its own.
  - On click: if `video.requestFullscreen` exists, set `controls = true` and call it; otherwise call `webkitEnterFullscreen()` (iPhone; type it as an optional method on the element). Clear `controls` on `fullscreenchange` exit.
  - Disconnect the observer on unmount.
- [ ] **Step 4: Styles in `Home.module.css`.**
  - `.film`: width `min(640px, 43vw)` (100% under 820px), margin-top 14px, no border or background, focus-visible ring.
  - `.film video`: block, `aspect-ratio: 16 / 9`, `object-fit: cover`, `mix-blend-mode: screen`, `filter: contrast(1.08)`, the spec's 4% and 6% intersected linear-gradient mask (both `-webkit-mask` with `source-in` and `mask` with `intersect`).
  - `.film video:fullscreen`: no blend, filter or mask.
  - One comment line on why the black drops away.
- [ ] **Step 5: The layering change.**
  - `.root` keeps `position: relative` and loses `z-index: 2`.
  - In `HomeStage.tsx`, `document.body.prepend(canvas)` replaces `appendChild`.
  - Rewrite the comments on both to say why: the page must not be a stacking context, so the film can blend, and the canvas goes first so the page still paints above it.
- [ ] **Step 6: Render it.** In `Work` (`page.tsx`): `{p.video && <HomeFilm src={p.video} poster={p.poster} name={p.name} />}` after the `<p>`.
- [ ] **Step 7: Rebuild and run the home check.** `node scripts/check-site.mjs http://localhost:3100 home`. Expected: PASS, including the transit map counts (fix those in Step 8 if they fail).
- [ ] **Step 8: Update the transit map expectations** in `home.mjs` to what the data now builds: phone line chips 8 (was 6), "Claude runs through 6 projects" (was 5), desktop chips 10 (unchanged). Re-run until PASS.
- [ ] **Step 9: Commit.** `feat(home): Distill and Path films under the copy, blended into the stage`

### Task 5: Full verification and hand-off

- [ ] **Step 1: Run everything.** `npm test`, `npx tsc --noEmit`, `npm run lint`, then `npm run build && npx next start -p 3100` and `node scripts/check-site.mjs http://localhost:3100 projects project home about`. Expected: all pass. Fix anything that fails before going on.
- [ ] **Step 2: Hand to Alex for a visual check.** Point him to:
  - the homepage 9 to 5 half on desktop and a phone: the trail shape at 5% smaller on desktop, the film edges, autoplay and pause, tap-to-fullscreen on the iPhone
  - `/projects` in both halves at 1440 px and 390 px: the Path and ROI tiles and marks
  - the story pages for Path, the ROI Calculator, Distill, the Scanner, and the five that are now colour blocks
  - the about page's bio and systems diagram
- [ ] **Step 3: Whole-branch review** by one fresh reviewer against the spec. Then ask Alex before pushing or opening a PR.
