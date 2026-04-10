# Kacie Feedback Fixes — Design

**Date:** 2026-04-10
**Source:** User feedback via Slack (Kacie Sommers, 2026-04-10)

---

## Problem Statement

Three issues surfaced in user feedback on the portfolio:

1. **Home page project showcase click target is broken.** The "View project →" button in the right-side preview panel is effectively unclickable — as the user moves their mouse toward it, hover-driven state changes swap the active project mid-motion. Only the first project in the list (Trailmix) is reliably clickable. Other users report the same symptom: they instinctively try to click the device preview thinking it's the primary click target, and the content keeps shifting under them.

2. **About page has borderline text contrast.** The light-blue body text (`#6a8fad`) on navy background (`#0d1b2a`) sits at roughly 4.3:1 contrast — technically passes AA for large text but is marginal for body copy and difficult for colorblind and low-vision users. The blueprint grid background also feels prominent enough to compete with the text.

3. **Light mode is accidentally enabled.** The global tokens include a `@media (prefers-color-scheme: light)` block that auto-switches the site to light mode for users whose OS is set to light. This was not an intentional feature and has never been designed or QAed. The site is meant to be dark-only.

---

## Goals

- Kill light mode as a feature; site is always dark (except for the blueprint navy variant on the about page, which stays).
- Make the about page comfortably readable, including for colorblind users, without losing the blueprint paper aesthetic.
- Fix the home page project showcase so clicking through to a project is obvious, reliable, and matches user intuition — the preview panel itself should be the click target.

## Non-Goals

- No redesign of the blueprint aesthetic beyond token tweaks.
- No changes to the mobile project showcase branch — mobile swipe UX is unaffected.
- No changes to the scroll-driven active project index or any of the existing animations (masked line reveals, device fades, staggered tags).
- No new hover states, accent treatments, or visual flourishes beyond what's needed to fix the issues.

---

## Section 1 — Remove Light Mode

### Files touched

- `src/styles/tokens.css`

### Changes

1. Delete the `@media (prefers-color-scheme: light)` block (currently lines 74–90).
2. Delete the `.light` class toggle block (currently lines 108–120).

### What stays

- The default `:root` dark tokens (lines 12–72).
- The `.blueprint` class (lines 92–106) — this is a standalone navy theme for the about page, not a light variant.

### Verification

- Grep confirmed no other references to `.light` class or `prefers-color-scheme` exist in `src/`. Deletion is safe.
- Manual check: toggle OS light mode after deployment — site should remain dark.

---

## Section 2 — About Page Contrast

### Files touched

- `src/styles/tokens.css` (blueprint block)

### Token changes inside `.blueprint`

| Token | Current | New | Rationale |
|---|---|---|---|
| `--black` | `#0a1628` | `#0a1628` | Unchanged |
| `--surface` | `#0d1b2a` | `#0d1b2a` | Unchanged — page background |
| `--surface-raised` | `#132238` | `#132238` | Unchanged |
| `--border` | `#1b3a5c` | `#14294a` | ~20% darker. The grid background uses this token. Still clearly visible as blueprint lines, but calmer against the body text. |
| `--border-visible` | `#4a7fb5` | `#4a7fb5` | Unchanged — used for rules and card borders, already reads well |
| `--text-disabled` | `#3d6d94` | `#5a87ad` | Raised so SPEC labels are actually legible |
| `--text-secondary` | `#6a8fad` | `#a8c3d9` | **Primary fix.** Body text. Contrast against `--surface` jumps from ~4.3:1 to ~9:1. Still reads as blueprint blue — not white. |
| `--text-primary` | `#c8dce8` | `#dbe8f2` | Small nudge up |
| `--text-display` | `#e8f0f5` | `#f0f6fb` | Small nudge up for headings |

### No component changes needed

All about page surfaces consume these tokens via CSS custom properties — no JSX or Tailwind class changes required. The blueprint grid background in `src/app/about/page.tsx` (lines 58–66) uses `var(--border)` for its grid lines, so the grid visually calms automatically from the token change.

### Alternatives considered and rejected

- **Lower grid via CSS opacity or a pseudo-element.** Creates a second source of truth for "how visible is the grid." Adjusting the token is simpler and keeps the design system consistent.
- **Turn text near-white.** Would fix contrast decisively but kills the blueprint feel. The `#a8c3d9` value preserves the blue-tinted identity while hitting AAA contrast.

### Verification

- Manual eyeball of about page in browser after applying.
- Contrast check on `#a8c3d9` against `#0d1b2a` — target ≥7:1 (AAA for normal text). Calculation: ~9:1. Passes.
- If grid feels too quiet in practice, nudge `--border` back toward `#1b3a5c` one step.

---

## Section 3 — Home Page Project Showcase Click Target

### Files touched

- `src/components/effects/ProjectShowcase.tsx` (desktop branch only)

### Problem mechanics

Current behavior (lines 437–629, desktop split-screen):
- **Left column:** clickable project names (`TransitionLink`s) with `onPointerMove` handlers that update `hoverIndex` state.
- **Right column:** 3D device preview + text content + a small `LinkHover` "View project →" text link at the bottom. The 3D preview itself is NOT a link.
- **State coupling:** `displayIndex = hoverIndex ?? activeIndex` drives what's shown in the right column. `activeIndex` is scroll-driven. `hoverIndex` is pointer-driven from the left column rows.

The bug: when the user moves their mouse through the left column to reach the right-side "View project" text, each `pointermove` event across a row updates `hoverIndex`, which swaps the active project under the cursor. The click target moves mid-motion.

### Fix — two changes together

**Change A: Remove hover-to-swap entirely.** Scroll is the only driver of `activeIndex`.

**Change B: Wrap the right column content in a single `TransitionLink`.** Click anywhere in the preview panel navigates to the currently-displayed project.

### Detailed change list

All changes below are inside `ProjectShowcase.tsx`, desktop branch only (lines 437–629). Mobile branch (lines 299–434) is untouched.

**1. Remove hover state and handlers (component body, lines ~74–210)**

- Delete `hoverIndex` state and its setter.
- Delete `hoverTimeoutRef` ref.
- Delete `handleRowPointerMove` and `handleRowPointerLeave` callbacks.
- Delete the cleanup effect that clears `hoverTimeoutRef` on unmount.
- Delete the "clear hover on scroll" block inside `useMotionValueEvent` (lines 172–175).
- Change `const displayIndex = hoverIndex ?? activeIndex` to `const displayIndex = activeIndex`.

Note: `displayIndex` is kept as a local variable (rather than inlining `activeIndex` throughout) to minimize diff noise in the render tree and preserve readability.

**2. Remove pointermove handlers from left column rows (lines ~454–460)**

- Delete `onPointerMove={() => handleRowPointerMove(i)}` and `onPointerLeave={handleRowPointerLeave}` props on the left-column `TransitionLink`.
- Left column project names remain clickable as `TransitionLink`s — unchanged.

**3. Wrap right column content in a `TransitionLink` (lines ~510–626)**

The right column currently has a plain `<div>` with width/layout classes. Wrap its entire contents in a `TransitionLink`:

- `href={`/projects/${activeProject.slug}`}`
- `className="flex w-[60%] flex-col justify-center pl-[var(--space-3xl)] pr-[var(--space-4xl)] no-underline"` (move existing layout classes here)
- Inside the link: the device scene container, the `AnimatePresence` block with description/tags/"View project" affordance.

**4. Swap inner `LinkHover` "View project →" for a plain `<span>` (lines ~602–622)**

The inner element can no longer be an anchor — nesting `<a>` inside `<a>` is invalid HTML. Change:

- `<LinkHover href="..." className="...">View project →</LinkHover>`

To:

- `<span className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)]">View project →</span>`

The "View project →" text remains as a visual affordance. The hover effect from `LinkHover` is lost at this specific spot, but the entire panel is now clickable, so the affordance still signals "this is a link." If we want the underline-sweep effect back, we can apply it to the outer wrapper later — out of scope for this fix.

**5. No `pointer-events` changes**

Initial instinct was to set `pointer-events: none` on the 3D canvas to prevent it from "swallowing" clicks. This is unnecessary and would have broken mobile swipe. `DeviceScene` already uses `onPointerMove`/`onPointerLeave` on its container for device tilt parallax — those handlers don't `preventDefault` or `stopPropagation`, so click events bubble naturally to the wrapping `TransitionLink`. Tilt parallax continues to work inside the link wrapper.

**6. Cursor affordance**

No explicit `cursor: pointer` needed — `TransitionLink` renders as an `<a>` and browsers apply the pointer cursor automatically.

### What mobile is not affected

- Mobile renders a completely different JSX tree inside `if (isMobile) { return ... }` (lines 299–434).
- `hoverIndex` is only consumed in the desktop tree. Removing it is a no-op on mobile.
- `activeIndex` stays at 0 on mobile because `useMotionValueEvent` returns early on mobile.
- `deviceIndex` / `deviceOpacity` are shared state, but mobile has its own effect (lines 217–232) driven by `mobileIndex`. The desktop fade effect watches `displayIndex`, which never changes on mobile. No interference.
- Mobile swipe handlers (lines 305–309) on the wrapping div remain intact.

### What desktop behavior changes for existing users

- **Before:** As the user moves their mouse over project names in the left column, the right panel content swaps to show that project. Clicking a project name navigates.
- **After:** Moving the mouse has no effect on the right panel. Scroll drives which project is shown. Clicking a project name navigates. Clicking anywhere in the right panel (including the 3D preview) also navigates to the currently-shown project.

The hover-peek interaction is gone. Trade-off is acceptable: it was the source of the bug, it was non-obvious to users, and scroll already provides a way to cycle through projects.

### Verification

- Manual desktop QA: scroll through project list, confirm right panel updates. Click anywhere in right panel → navigates to correct project. Click project name on left → navigates to correct project.
- Manual mobile QA: swipe carousel, confirm navigation still works. No regressions.
- Visual regression: device tilt parallax should still respond to mouse movement over the 3D canvas.
- Check browser console for invalid HTML nesting warnings (should be none after replacing `LinkHover` with `<span>`).

---

## Out of scope

- No redesign of the left-column hover state (accent bar, text color transitions are unchanged; they're driven by `isActive === activeIndex`).
- No new brightening hover state on non-active left-column rows.
- No restoration of the `LinkHover` underline-sweep effect on the "View project →" text (see Section 3, note 4).
- Mobile-specific improvements.
- Any other contrast audit beyond the about page blueprint variant.

---

## Rollback plan

Each section is independent and can be reverted individually:
- Section 1: restore the two deleted blocks in `tokens.css`.
- Section 2: revert token values in `.blueprint`.
- Section 3: revert `ProjectShowcase.tsx` to restore `hoverIndex` state and handlers, unwrap the `TransitionLink` from the right column, restore `LinkHover` for the "View project →" text.

---

## Open questions

None — all intent is confirmed with the user.
