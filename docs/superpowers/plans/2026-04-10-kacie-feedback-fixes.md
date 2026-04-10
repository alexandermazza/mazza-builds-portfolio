# Kacie Feedback Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove accidental light mode, raise about-page blueprint contrast, and make the home-page project showcase preview fully clickable by removing broken hover-to-swap behavior.

**Architecture:** Three independent, small changes scoped to two files: (1) delete light-mode token blocks in `tokens.css`, (2) update blueprint-mode token values in the same file for contrast, (3) refactor the desktop branch of `ProjectShowcase.tsx` to remove pointer-driven active-index state and wrap the right-side preview in a single `TransitionLink`. Mobile code path is deliberately untouched.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS v4, Framer Motion (`motion/react`), React Three Fiber.

**Test strategy:** This repo has no unit test framework configured (`package.json` scripts are `dev`/`build`/`start`/`lint` only). Verification for every task uses `npm run lint`, `npm run build`, and manual browser QA. TDD does not apply. The changes are CSS token tweaks and a JSX refactor — type safety and manual verification are the correct signal.

**Spec:** `docs/superpowers/specs/2026-04-10-kacie-feedback-fixes-design.md`

---

## File Map

| File | Change | Purpose |
|---|---|---|
| `src/styles/tokens.css` | Modify | Delete light mode blocks (Task 1), bump blueprint contrast values (Task 2) |
| `src/components/effects/ProjectShowcase.tsx` | Modify | Remove hover-to-swap state (Task 3), wrap right column in TransitionLink (Task 4) |

No new files. No deletions.

---

## Task 1: Kill Light Mode

**Files:**
- Modify: `src/styles/tokens.css` (delete two blocks)

Design spec reference: Section 1.

- [ ] **Step 1: Confirm no external references to `.light` or `prefers-color-scheme`**

Run a Grep over `src/` to be sure nothing else keys off the light mode machinery. The brainstorming pass already did this and found zero external hits, but verify before deleting.

Run:
```bash
# Use the Grep tool (not shell grep)
# Pattern: prefers-color-scheme|\.light\b|className=.*\blight\b
# Path: src/
```

Expected: two hits total, both inside `src/styles/tokens.css` (lines 77 and 109). Any other hits must be investigated before proceeding.

- [ ] **Step 2: Delete the `@media (prefers-color-scheme: light)` block**

In `src/styles/tokens.css`, delete lines 74–90 (including the block comment header and the closing brace).

Current content to remove (exact text for `old_string` in Edit):

```css
/* ───────────────────────────────────────────
   Light mode
   ─────────────────────────────────────────── */
@media (prefers-color-scheme: light) {
  :root {
    --black: #F5F5F5;
    --surface: #FFFFFF;
    --surface-raised: #F0F0F0;
    --border: #E8E8E8;
    --border-visible: #CCCCCC;
    --text-disabled: #999999;
    --text-secondary: #666666;
    --text-primary: #1A1A1A;
    --text-display: #000000;
    --interactive: #007AFF;
  }
}

```

Replace with an empty string (delete the block entirely, including the trailing blank line so the file doesn't get a double blank).

- [ ] **Step 3: Delete the `.light` class toggle block**

In `src/styles/tokens.css`, delete lines 108–120.

Current content to remove (exact text for `old_string` in Edit):

```css
/* Light mode via class toggle */
.light {
  --black: #F5F5F5;
  --surface: #FFFFFF;
  --surface-raised: #F0F0F0;
  --border: #E8E8E8;
  --border-visible: #CCCCCC;
  --text-disabled: #999999;
  --text-secondary: #666666;
  --text-primary: #1A1A1A;
  --text-display: #000000;
  --interactive: #007AFF;
}
```

Replace with an empty string. The `.blueprint` block (lines 92–106) is untouched and remains above this deleted block.

- [ ] **Step 4: Verify lint passes**

Run:
```bash
npm run lint
```

Expected: no errors, no new warnings introduced by these changes. Pre-existing warnings in other files are acceptable — the test is "no regressions from Task 1."

- [ ] **Step 5: Verify build passes**

Run:
```bash
npm run build
```

Expected: successful build. CSS changes should not break TypeScript compilation.

- [ ] **Step 6: Commit**

```bash
git add src/styles/tokens.css
git commit -m "$(cat <<'EOF'
fix(tokens): remove accidental light mode

Deletes the @media (prefers-color-scheme: light) block and the .light
class toggle. The site is dark-only; light mode was never a designed
feature. Blueprint variant on the about page is untouched.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Raise Blueprint Contrast

**Files:**
- Modify: `src/styles/tokens.css` (update values inside `.blueprint` block)

Design spec reference: Section 2.

- [ ] **Step 1: Update the `.blueprint` block values**

In `src/styles/tokens.css`, replace the `.blueprint` block's content with bumped token values.

Current block (exact text for `old_string` in Edit):

```css
.blueprint {
  --black: #0a1628;
  --surface: #0d1b2a;
  --surface-raised: #132238;
  --border: #1b3a5c;
  --border-visible: #4a7fb5;
  --text-disabled: #3d6d94;
  --text-secondary: #6a8fad;
  --text-primary: #c8dce8;
  --text-display: #e8f0f5;
}
```

New block (`new_string`):

```css
.blueprint {
  --black: #0a1628;
  --surface: #0d1b2a;
  --surface-raised: #132238;
  --border: #14294a;
  --border-visible: #4a7fb5;
  --text-disabled: #5a87ad;
  --text-secondary: #a8c3d9;
  --text-primary: #dbe8f2;
  --text-display: #f0f6fb;
}
```

Changes:
- `--border`: `#1b3a5c` → `#14294a` (darker grid lines, still visible)
- `--text-disabled`: `#3d6d94` → `#5a87ad` (readable SPEC labels)
- `--text-secondary`: `#6a8fad` → `#a8c3d9` (body text, ~9:1 contrast, still blueprint blue)
- `--text-primary`: `#c8dce8` → `#dbe8f2` (nudge up)
- `--text-display`: `#e8f0f5` → `#f0f6fb` (nudge up)

No other tokens change. `--black`, `--surface`, `--surface-raised`, `--border-visible` stay identical.

- [ ] **Step 2: Verify lint passes**

Run:
```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Verify build passes**

Run:
```bash
npm run build
```

Expected: successful build.

- [ ] **Step 4: Manual visual check (optional but strongly recommended before commit)**

Run:
```bash
npm run dev
```

Open `http://localhost:3000/about` in a browser. Confirm:
- Grid background is still visible but calmer than before
- Body text (e.g., the "I'm Alex Mazza..." bio paragraph) reads easily against the navy background
- "SPEC: IDENTITY", "SPEC: LOCATION" etc. labels are legible
- Overall aesthetic still reads as "blueprint paper" — it hasn't tipped into looking like a generic dark theme

Stop the dev server (`Ctrl+C`) when done.

If the grid feels too quiet, nudge `--border` back toward `#173250` or `#1b3a5c` (one step back). If body text still feels dim, nudge `--text-secondary` toward `#b8d0e0`. Re-run lint/build after any adjustment.

- [ ] **Step 5: Commit**

```bash
git add src/styles/tokens.css
git commit -m "$(cat <<'EOF'
fix(about): raise blueprint text contrast for accessibility

Brightens body text from #6a8fad to #a8c3d9 (~4.3:1 to ~9:1 contrast
against navy surface) and darkens grid lines slightly so the text has
a calmer backdrop. Feedback from Kacie flagged the light-blue body
copy as marginal for colorblind users. Keeps the blueprint aesthetic
— text is still blue, grid is still visible.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Remove Hover-to-Swap From ProjectShowcase

**Files:**
- Modify: `src/components/effects/ProjectShowcase.tsx` (desktop branch only)

Design spec reference: Section 3, changes 1–2.

This task removes all the state, callbacks, and props that implement hover-driven active-project swapping in the desktop split-screen. Scroll becomes the only driver of `activeIndex`.

- [ ] **Step 1: Remove `hoverIndex` state declaration**

Find this line (currently line 75):

```tsx
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
```

Delete it entirely. After this edit, the state declaration block at the top of `ProjectShowcase` will have `activeIndex`, `projectScrollProgress`, `isMobile` (and `prefersReduced`) — no `hoverIndex`.

- [ ] **Step 2: Remove `hoverTimeoutRef`**

Find this line (currently line 80):

```tsx
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

Delete it entirely.

- [ ] **Step 3: Simplify `displayIndex` assignment**

Find this line (currently line 82):

```tsx
  const displayIndex = hoverIndex ?? activeIndex;
```

Replace with:

```tsx
  const displayIndex = activeIndex;
```

We keep `displayIndex` as a named local rather than inlining `activeIndex` everywhere — it preserves readability of the existing render tree and minimizes diff noise.

- [ ] **Step 4: Remove the "clear hover on scroll" block inside `useMotionValueEvent`**

Find this block (currently lines 169–175, inside the `useMotionValueEvent` callback):

```tsx
    // Scroll is authoritative — clear any hover override so the display
    // tracks the scroll position.  pointermove will re-set hover if the
    // user is actively moving the mouse.
    if (hoverIndex !== null) {
      setHoverIndex(null);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    }

```

Delete it entirely (including the comment and the trailing blank line). The rest of the `useMotionValueEvent` callback — `count`, `index`, `setActiveIndex`, `slotProgress` — stays untouched.

- [ ] **Step 5: Remove `handleRowPointerMove` and `handleRowPointerLeave` callbacks**

Find this block (currently lines 191–203):

```tsx
  // pointermove (not mouseenter) — only fires on real mouse movement,
  // never from elements scrolling under a stationary cursor
  const handleRowPointerMove = useCallback((index: number) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoverIndex((prev) => (prev === index ? prev : index));
  }, []);

  const handleRowPointerLeave = useCallback(() => {
    // Small debounce prevents flicker when moving between rows
    hoverTimeoutRef.current = setTimeout(() => {
      setHoverIndex(null);
    }, 80);
  }, []);

```

Delete it entirely (including the comment and trailing blank line).

- [ ] **Step 6: Remove hover cleanup `useEffect`**

Find this block (currently lines 205–210):

```tsx
  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

```

Delete it entirely (including the comment and trailing blank line).

- [ ] **Step 7: Remove pointer-move / pointer-leave props from left-column `TransitionLink` rows**

Find this element (currently lines 454–460):

```tsx
                <TransitionLink
                  key={project.slug}
                  href={`/projects/${project.slug}`}
                  className="group relative block py-[12px] no-underline"
                  onPointerMove={() => handleRowPointerMove(i)}
                  onPointerLeave={handleRowPointerLeave}
                >
```

Replace with:

```tsx
                <TransitionLink
                  key={project.slug}
                  href={`/projects/${project.slug}`}
                  className="group relative block py-[12px] no-underline"
                >
```

The left column project names remain clickable. Only the pointer handlers are gone.

- [ ] **Step 8: Verify lint passes**

Run:
```bash
npm run lint
```

Expected: no errors. The TypeScript compiler should not complain about unused imports — `useCallback` is still used elsewhere (in `goToProject` at line 234). If lint flags an unused import, remove it. Do NOT remove `useCallback` from the import list without first searching the file to confirm there are no other usages.

- [ ] **Step 9: Verify build passes**

Run:
```bash
npm run build
```

Expected: successful build with no TypeScript errors.

- [ ] **Step 10: Commit**

```bash
git add src/components/effects/ProjectShowcase.tsx
git commit -m "$(cat <<'EOF'
refactor(projects): remove hover-to-swap in desktop showcase

Pointermove on left-column rows was updating hoverIndex and swapping
the active project mid-motion, which broke the right-side click
target. Scroll is now the only driver of activeIndex on desktop.
Mobile carousel branch is untouched. Next commit makes the right
column fully clickable.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Make Right Column a Click Target

**Files:**
- Modify: `src/components/effects/ProjectShowcase.tsx` (desktop branch, right column render)

Design spec reference: Section 3, changes 3–4.

This task wraps the desktop right column in a `TransitionLink` pointing at the currently active project, and replaces the now-nested `LinkHover` with a plain `<span>` (nested anchors are invalid HTML).

- [ ] **Step 1: Wrap the right column in a `TransitionLink`**

Find the right column opening `<div>` and the closing `</div>` (currently lines 510–625, where line 510 is the `{/* Right column — Detail panel */}` comment and line 625 is the matching `</div>` that closes the column).

Current opening (lines 510–511):

```tsx
          {/* Right column — Detail panel */}
          <div className="flex w-[60%] flex-col justify-center pl-[var(--space-3xl)] pr-[var(--space-4xl)]">
```

Replace with:

```tsx
          {/* Right column — Detail panel (entire panel is a click target) */}
          <TransitionLink
            href={`/projects/${activeProject.slug}`}
            className="flex w-[60%] flex-col justify-center pl-[var(--space-3xl)] pr-[var(--space-4xl)] no-underline"
          >
```

Current closing (line 625):

```tsx
          </div>
```

Replace with:

```tsx
          </TransitionLink>
```

Notes for the engineer:
- `TransitionLink` is already imported at the top of the file (line 17) — no new import needed.
- `activeProject` is already computed at line 83 (`projects[displayIndex]`) and is in scope at the render site.
- The layout classes (`flex`, `w-[60%]`, `flex-col`, `justify-center`, `pl-[var(--space-3xl)]`, `pr-[var(--space-4xl)]`) must move from the old `<div>` to the new `TransitionLink`. The `no-underline` class is added so the link does not underline any child text.
- The 3D canvas container and `AnimatePresence` block inside are unchanged.

- [ ] **Step 2: Replace inner `LinkHover` with a plain `<span>`**

Find this element (currently lines 616–621, inside the "View link — fade up after tags" motion wrapper):

```tsx
                  <LinkHover
                    href={`/projects/${activeProject.slug}`}
                    className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)]"
                  >
                    View project →
                  </LinkHover>
```

Replace with:

```tsx
                  <span className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)]">
                    View project →
                  </span>
```

Why: nesting `<a>` inside `<a>` is invalid HTML. `LinkHover` renders an anchor; wrapping it in a `TransitionLink` (also an anchor) would cause invalid markup and unpredictable click behavior. The `<span>` keeps the visual affordance — the wrapping `TransitionLink` is now the click target.

- [ ] **Step 3: Check if `LinkHover` is still imported but unused**

Search the file for other usages of `LinkHover`:

```bash
# Use Grep tool (not shell grep)
# Pattern: LinkHover
# Path: src/components/effects/ProjectShowcase.tsx
```

If the only remaining references are the import line (currently line 15) and no other usages, remove `LinkHover` from the import. Current import block (lines 13–16):

```tsx
import {
  ScrollGridAnimation,
  LinkHover,
} from "@/components/effects";
```

If `LinkHover` is unused after Step 2, change to:

```tsx
import { ScrollGridAnimation } from "@/components/effects";
```

If there's still at least one other `LinkHover` usage in the file, leave the import alone.

- [ ] **Step 4: Verify lint passes**

Run:
```bash
npm run lint
```

Expected: no errors. If lint complains about an unused import, you missed Step 3 — go back and fix.

- [ ] **Step 5: Verify build passes**

Run:
```bash
npm run build
```

Expected: successful build. Watch specifically for any "invalid DOM nesting" warning — if one appears, there's still a nested anchor somewhere.

- [ ] **Step 6: Commit**

```bash
git add src/components/effects/ProjectShowcase.tsx
git commit -m "$(cat <<'EOF'
feat(projects): make desktop right column a click target

Wraps the entire right-side preview panel (3D device, description,
tags, "View project →" affordance) in a single TransitionLink
pointing at the currently active project. Replaces the inner
LinkHover with a plain span to avoid nested anchors. Users can now
click anywhere in the preview to navigate to the project — matching
the mental model that the preview IS the thing to click.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Manual QA

**Files:** None modified.

This task exists to enforce a manual verification pass before the branch is considered done. There are no automated tests to run — the signal comes from eyeballing the site.

- [ ] **Step 1: Start the dev server**

Run:
```bash
npm run dev
```

Wait for the "Ready" message, then open `http://localhost:3000` in a browser.

- [ ] **Step 2: Verify light mode is dead**

1. With the dev server running, toggle your OS to light mode (macOS: System Settings → Appearance → Light).
2. Hard-refresh the home page (`Cmd+Shift+R`).

Expected: the site remains fully dark (black background, white text). No white/gray homepage, no light-mode variant on any page.

3. Navigate to `/about`. Expected: navy blueprint variant, unchanged from before Task 2 except for the contrast tweaks.
4. Navigate to `/contact`, `/projects/trailmix`, or any other route. Expected: dark throughout.
5. Toggle your OS back to whatever you prefer.

- [ ] **Step 3: Verify about page contrast**

Navigate to `http://localhost:3000/about`.

Check:
- **Grid background**: visible but not loud — you should be able to see the blueprint grid lines, but they should not compete with the body text.
- **Bio text** ("I'm Alex Mazza. Spent years in GTM ops..."): reads comfortably without squinting.
- **SPEC labels** ("SPEC: IDENTITY", "SPEC: LOCATION", etc.): legible.
- **Headings** ("ABOUT", section titles): sharp near-white.
- **Overall aesthetic**: still reads as blueprint paper, not as a generic dark page.

If the grid is too quiet: revisit Task 2 and nudge `--border` back toward `#1b3a5c`. If text still looks dim: nudge `--text-secondary` toward `#b8d0e0`.

- [ ] **Step 4: Verify home page project showcase click target**

Navigate to `http://localhost:3000`. Scroll down to the "FEATURED PROJECTS" section.

Check:
- **Scroll swaps projects**: as you scroll, the right-side 3D device and text content update to show the active project.
- **Left-column names are clickable**: click any project name in the left column. Expected: navigation to `/projects/<slug>`.
- **Right-panel click target**: navigate back. Scroll to the *second* or *third* project in the list (not Trailmix). Move your mouse into the right panel and click anywhere — on the 3D device, on the description, on the "View project →" text, on blank space. Expected: every click navigates to the currently displayed project.
- **No hover-swap ghost**: move your mouse slowly across the left column (hovering over project names *without* scrolling). Expected: the right panel stays on whatever the scroll position dictates. Project names in the left column do NOT cause the right panel to switch.
- **Device tilt parallax still works**: move your mouse within the right-panel area. Expected: the 3D device tilts slightly in response to cursor movement (pre-existing behavior inside `DeviceScene`).

- [ ] **Step 5: Verify mobile carousel is untouched**

Open DevTools, switch to a mobile device emulation (e.g., iPhone 14, 390×844), reload the page.

Check:
- The "FEATURED PROJECTS" section switches to the mobile carousel layout (single device on top, text below, dot indicators).
- Swipe (or click-drag) left and right — the carousel navigates between projects.
- Tapping the "View project →" link navigates to the project.
- The 3D device fade between projects works.

- [ ] **Step 6: Check browser console for warnings**

With the home page open in the browser (desktop size), open the DevTools Console.

Expected: no "Warning: validateDOMNesting" or "nested `<a>`" errors. Any pre-existing warnings from before these changes are acceptable, but nothing new should appear tied to `ProjectShowcase`.

- [ ] **Step 7: Stop the dev server**

`Ctrl+C` in the terminal running `npm run dev`.

- [ ] **Step 8: No commit for this task**

This task is verification only. No files changed. Do not create an empty commit.

---

## Self-Review Notes

Completed during plan authoring:

**Spec coverage:**
- Section 1 (kill light mode) → Task 1. ✓
- Section 2 (about contrast) → Task 2. ✓
- Section 3, changes 1–2 (remove hover-to-swap) → Task 3. ✓
- Section 3, changes 3–4 (wrap right column, replace LinkHover) → Task 4. ✓
- Section 3, note 5 (no pointer-events changes) — honored by *not* adding any such change. ✓
- Rollback plan → implicit per task (each task is a single commit, revertable independently). ✓
- Out-of-scope items (no new hover states, no LinkHover restoration) → respected. ✓

**Placeholder scan:** No TBD/TODO/"fill in later" language. Every code change shows the exact before and after.

**Type consistency:** `displayIndex`, `activeIndex`, `activeProject`, `TransitionLink` — all names used in later tasks match their definitions.

**Line-number caveat:** Line numbers in this plan are from the current state of the files at the time of writing (2026-04-10). If earlier tasks shift line numbers in `ProjectShowcase.tsx`, the engineer should use the `old_string`/search-anchor text in each step rather than relying on the numeric line references.

**No pre-existing hooks/handlers retained by accident:** After Task 3, the following symbols should no longer appear anywhere in `ProjectShowcase.tsx`: `hoverIndex`, `setHoverIndex`, `hoverTimeoutRef`, `handleRowPointerMove`, `handleRowPointerLeave`. A final grep for these strings in Task 3 Step 8's lint run should produce zero results — if lint doesn't catch them, Grep will.
