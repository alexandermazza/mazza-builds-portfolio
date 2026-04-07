# ProjectShowcase: Split-Screen Scroll Lock Design

**Date:** 2026-04-06
**Status:** Approved
**Scope:** New `ProjectShowcase` effect component replacing the home page projects section. Full-bleed sticky scroll-lock with split-screen layout.

---

## Overview

The projects section on the home page is replaced with a full-bleed, viewport-locking split-screen experience. The left column shows a scannable index of all project names. The right column displays the active project's details. Scrolling advances through projects one at a time. Hovering a name on the left temporarily previews that project on the right. Clicking navigates to the project detail page.

Designed for 8-9 projects at launch. Mobile falls back to a simple stacked card layout.

---

## Layout & Scroll Mechanics

### Container Structure

The section breaks out of the `max-w-[960px]` page container and goes full-bleed.

- **Outer wrapper:** `position: relative`, `width: 100%`. Contains the section header (normal flow) followed by the scroll region.
- **Scroll region:** `height: calc(100vh * N)` where N = number of projects. This tall div creates the scroll distance.
- **Inner sticky frame:** `position: sticky`, `top: 0`, `height: 100vh`, inside the scroll region. Locks to the viewport while the user scrolls through.
- **Two columns** inside the sticky frame: left 40%, right 60%.

### Scroll Progress Mapping

- `useScroll({ target: outerRef })` provides a `scrollYProgress` value from 0 to 1.
- Divide progress into N equal segments. When progress enters segment `i`, project `i` becomes active.
- Active index drives both the left column highlight and the right column content.

### Section Header

Above the sticky frame, inside the full-bleed container but within a 960px inner wrapper:

- "FEATURED PROJECTS" — Space Mono, 11px, ALL CAPS, `--text-disabled`, 0.08em tracking
- Entrance via `<ScrollLetterAnimation>`
- Margin-bottom `--space-2xl` before the sticky frame begins

### Mobile (< 768px)

The split-screen is disabled entirely. The component renders a vertical stack of project cards using `<ScrollGridAnimation>` wrapping `<ProjectCard>` with `<LinkHover>`. No scroll-lock, no sticky behavior. The mobile experience reuses existing components.

Breakpoint detection via CSS media query or `window.matchMedia` in a `useEffect`.

---

## Left Column — Project Index

All project names visible at once, vertically centered within the left 40%.

### Row Structure

Each row contains:
- **Issue number:** Space Mono, 11px, ALL CAPS, `--text-disabled`, 0.08em tracking, fixed width
- **Project name:** Space Grotesk, 28px, leading-tight

### States

| State | Name Color | Accent Bar | Trigger |
|-------|-----------|------------|---------|
| Default | `--text-disabled` | Hidden | — |
| Active (scroll) | `--text-display` | 2px vertical bar, left edge, `--accent` | Scroll position enters project's segment |
| Hover | `--text-display` | 2px vertical bar, left edge, `--accent` | Mouse enters row |

- Transitions: `0.3s ease-out` (matches `DURATION.transition`)
- Hover temporarily overrides scroll-driven active state. On mouse leave, control returns to scroll position.
- Only one row is highlighted at a time (active or hovered, not both)

### Spacing

- Rows spaced `--space-lg` (24px) apart
- 8-9 items at 28px font + 24px gap ≈ 400-450px total height
- Vertically centered in the viewport

### Interaction

- **Click** any row: navigates to `/projects/[slug]` via `<TransitionLink>`
- **Hover** any row: overrides active state temporarily
- Cursor: crosshair (global `CrosshairCursor` handles this)

### Reduced Motion

Highlights change based on scroll position but transitions are instant (duration: 0).

---

## Right Column — Detail Panel

The right 60% shows the active project's details. Content crossfades when the active project changes.

### Content Layout

Vertically centered, left-aligned. Padding-left: `--space-3xl` (64px).

Stacked top to bottom:
1. **Status badge** — `<StatusBadge>` component, existing
2. **Description** — Space Grotesk, `--body` (16px), `--text-secondary`, max-width 480px. Uses the short `description` field, not `longDescription`.
3. **Tags** — Row of `<TagChip>` components, flex-wrap, gap `--space-sm`
4. **View link** — "View project →", Space Mono, 13px, ALL CAPS, `--text-secondary`. `<LinkHover>` wrapping `<TransitionLink>` to `/projects/[slug]`.

### Crossfade Animation

- Framer Motion `AnimatePresence` with `mode="wait"`
- Key: active project slug
- Exit: `opacity: 0, y: -8` over `DURATION.transition`
- Enter: `opacity: 0 → 1, y: 8 → 0` over `DURATION.transition`
- Ease: `EASE_OUT_MOTION`

### Default State

First project (index 0) is active on load. The right panel is never empty.

### Reduced Motion

Content swaps instantly, no fade or translate.

---

## Visual Divider

A 1px vertical line between the two columns:
- Color: `--border`
- Full height of the sticky frame (100vh)
- No animation — static structural element
- Nothing aesthetic: the line is the only separator, no shadow or gradient

---

## Section Transitions

### Entering

The user scrolls from the intro paragraph into the full-bleed section. The "FEATURED PROJECTS" label appears first (within 960px alignment), then the sticky frame engages.

### Exiting

After scrolling past the last project, the sticky frame releases naturally and the heatmap cards section scrolls in below. No special exit animation.

### Background

`--surface` background (same as page). The layout change itself (full-bleed, two-column, sticky) signals the zone change.

---

## Component Architecture

### File

`src/components/effects/ProjectShowcase.tsx`

### Props

```ts
interface ProjectShowcaseProps {
  projects: Project[];
  className?: string;
}
```

### Internal Structure

One component file, ~150-180 lines. No sub-component splitting — the pieces share state (active index, hover override) and are tightly coupled.

Internal sections (JSX, not separate exports):
- **Project Index (left)** — maps over projects, renders name rows, highlights active
- **Detail Panel (right)** — `AnimatePresence` wrapper, renders active project details
- **Divider** — 1px vertical line

### State

- `activeIndex: number` — derived from scroll progress
- `hoverIndex: number | null` — set on mouse enter, cleared on mouse leave
- `displayIndex` = `hoverIndex ?? activeIndex` — the index that drives both columns

### Hooks

- `useScroll({ target: outerRef })` — scroll progress
- `useTransform(scrollYProgress, ...)` — map progress to active index
- `useMotionValueEvent` or `useTransform` callback to update `activeIndex`
- `useReducedMotion()` — disable animations
- `useEffect` + `matchMedia` — detect mobile breakpoint

### Barrel Export

Add `export { ProjectShowcase } from "./ProjectShowcase"` to `src/components/effects/index.ts`.

### Existing Components Used

- `StatusBadge` — project status in detail panel
- `TagChip` — tech tags in detail panel
- `TransitionLink` — navigation on click (via `LinkHover`)
- `LinkHover` — "View project →" link
- `ScrollLetterAnimation` — section header entrance
- `ScrollGridAnimation` — mobile fallback
- `ProjectCard` — mobile fallback

---

## Home Page Integration

### Changes to `src/app/page.tsx`

Replace the current projects section:

```tsx
// REMOVE: ScrollGridAnimation + ProjectCard loop
// REPLACE WITH:
<ProjectShowcase projects={projects} />
```

- Import `ProjectShowcase` from `@/components/effects`
- Import all projects (remove the `.slice(0, 3)`)
- The component handles its own full-bleed breakout, section header, and mobile fallback

### Surrounding Sections

No changes to hero, subtitle, ticker, intro (above) or heatmaps, CTA (below).

---

## Data

Uses the existing `Project` interface and `projects` array from `src/data/projects.ts`. Fields used:

- `slug` — URL routing and AnimatePresence key
- `issueNumber` — left column display
- `name` — left column display
- `description` — right column detail (short description)
- `tags` — right column TagChips
- `status` — right column StatusBadge

No data model changes needed.

---

## Nothing Design Compliance

- One accent element per section: the 2px `--accent` bar on the active project name
- No gradients, shadows, or blur
- Flat surfaces only (`--surface` background)
- Space Mono for labels/numbers, Space Grotesk for names/body
- `ease-out` transitions, no spring/bounce
- `prefers-reduced-motion` respected throughout
- Monoline 1px divider, no decorative elements

---

## Future: Ticker Board

The ticker board concept (departure-board-style rows with expand-on-hover) was also approved in principle. It's being kept as a candidate for other sections — tech stack display, "currently building" widget, or a secondary projects view. Not in scope for this spec.
