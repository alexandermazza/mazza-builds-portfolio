# Terminal Boot Hero — Design Spec

## Overview

Full-screen hero section for the homepage that simulates a terminal boot sequence building the portfolio in real-time, then smash-cuts to the brand reveal. Pure GSAP + DOM — no Three.js.

## Concept

The hero tells the story of the portfolio being built via Claude Code. Terminal lines type out and accelerate, progress bars fill, then a hard cut reveals "MAZZA BUILDS" in massive type. It's a nod to vibe coding and the Claude Code workflow that actually built the site.

## Layout & Structure

- Full viewport: `100vh`, `--black` background, centered content
- Two phases: **boot** (~3.5s) → **reveal** (instant cut + 300ms settle)
- Nav is hidden during boot, fades in on reveal
- No scroll-locking — the hero is just the first viewport, content follows below
- Replaces the existing `SplitTextScatter` hero section

## Boot Sequence Content

Lines appear one at a time, accumulating on screen like a real terminal. All text is Space Mono, uppercase isn't required (terminal style is lowercase), `--text-secondary` color. Each line prefixed with `> `.

```
> claude-code v4.6 initialized
> loading workspace: mazza-builds-portfolio
> scanning project structure [░░░░░░░░░░] ... 47 files found
> compiling next.js app router
> registering fonts: Space Grotesk, Space Mono
> applying design tokens [████████████████] nothing-os-theme
> mounting components [████████████████] 12/12
> fetching projects [██████░░░░] ... 4 loaded
> initializing gsap scroll engine [████████████████] OK
> three.js renderer: WebGL 2.0
> running vibe check............... PASSED
> bundling assets [████████████████] 247kb gzipped
> deploying to production [░░░░░░░░░░]
> deploy complete [████████████████] launching.
```

### Line behavior

- Lines type in via GSAP `ScrambleTextPlugin`
- Early lines: ~400ms each
- Final lines: ~80ms each (accelerating)
- Progress bars animate from `░` to `█` via GSAP `textContent` replacement
- Some bars fill fast, some crawl with a mid-fill pause before completing
- "running vibe check" dots extend with a deliberate pause before "PASSED"
- "launching." holds for ~400ms before the reveal

### Orange accent

**"PASSED"** is the only element that uses `--accent` (#FF6B35). One flash of color in the entire boot sequence, gone by the time the reveal hits.

## Reveal

Hard cut — no fade, no slide. One frame terminal, next frame hero text.

- **"MAZZA BUILDS"** — Space Grotesk, `clamp(48px, 12vw, 96px)`, `--text-display`, centered
- **"building things that work"** — Space Grotesk, `clamp(16px, 2.5vw, 24px)`, `--text-secondary`, `--space-md` gap below headline

Subtle scale entrance: `scale(1.02)` → `scale(1)` over 300ms with `EASE_OUT` timing. Nav fades in simultaneously (opacity 0→1, 300ms).

## Timing

| Time | Event |
|------|-------|
| 0s–3.5s | Boot lines type in, accelerating |
| 3.5s–3.9s | "launching." holds |
| 3.9s | Hard cut — terminal clears, hero text appears |
| 3.9s–4.2s | Scale ease on hero text, nav fade-in |

## Repeat Visits

`sessionStorage` flag (`hero-seen`):

- **First visit in session**: Full ~4s sequence
- **Repeat visit in same session**: Same sequence at ~1.5s (lines appear faster, bars fill quicker, same hard cut)
- **New browser session**: Full sequence again

## Reduced Motion

When `prefers-reduced-motion: reduce` is active:

- Boot lines appear instantly stacked (no typing/scramble animation)
- Progress bars appear already filled
- 1s pause, then hard cut to hero text
- No scale animation on reveal
- Same content, same structure, just no motion

## Implementation

### Component

`TerminalHero.tsx` in `src/components/effects/` — client component.

### Tech

- GSAP `gsap.timeline()` orchestrates the full sequence
- `ScrambleTextPlugin` for typing effect on each line
- Progress bars: GSAP animating `textContent` (swapping `░` → `█`)
- `sessionStorage.getItem('hero-seen')` for repeat visit detection

### Data structure

Lines defined as an array of objects:

```ts
interface BootLine {
  text: string;
  duration: number; // base duration, scaled by repeat-visit multiplier
  progressBar?: {
    width: number;     // number of bar characters
    fillSpeed: number; // relative speed (1 = normal, 0.5 = slow crawl)
    pauseAt?: number;  // percentage to pause mid-fill (e.g. 0.6)
  };
  accent?: boolean; // applies --accent color to specific text
}
```

### Integration in page.tsx

- `TerminalHero` is the first child of `<main>`
- Remove existing `SplitTextScatter` hero section and subtitle section
- Ticker and everything below remains unchanged

### Nav visibility

`TerminalHero` accepts an `onReveal` callback prop. The page passes a function that sets state to show the nav. This keeps the hero component decoupled from layout concerns.
