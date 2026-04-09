# Spotlight Section — Design Spec
**Date:** 2026-04-08
**Status:** Approved

## Overview

A full-bleed "spotlight" section on the home page that sits between the ticker and `ProjectShowcase` sections. It centers attention on Daily Roman — the flagship iOS app — with a cinematic canvas-based spotlight effect, iris entrance animation, and staggered content reveal.

---

## Placement

In `src/app/page.tsx`, inserted between the ticker `<section>` and `<ProjectShowcase>`. Uses its own `<section>` wrapper with no `max-width` constraint — full bleed.

---

## Background & Canvas

- Background: pure `#000000` (not `--surface`) for maximum spotlight contrast
- A `<canvas>` fills the entire section (`position: absolute`, `inset: 0`, `z-index: 0`)
- Content sits in a `position: relative` div above the canvas (`z-index: 1`)
- Canvas render loop runs on `gsap.ticker` (same pattern as `MagneticField`)

### Spotlight rendering (each frame)

1. Fill entire canvas black
2. Set `globalCompositeOperation = "destination-out"`
3. Create a `CanvasGradient` — radial, centered at the current wobble offset, **opaque** at center (`rgba(0,0,0,1)`) fading to **fully transparent** (`rgba(0,0,0,0)`) at the iris radius edge
4. Draw the gradient — `destination-out` erases the opaque center region from the black fill, creating a transparent hole that reveals content beneath with soft falloff edges
5. Reset `globalCompositeOperation = "source-over"` for next frame

### Iris entrance

- Triggered by `useInView` (once, `-100px` margin)
- GSAP animates a progress value `0 → 1` over `1.2s`, `ease: "power2.out"`
- Progress maps to iris radius: `0 → ~40vw` diameter on desktop, `~45vw` on mobile
- Content entrance stagger begins after the iris starts (no gate — they can overlap slightly)

### Human-held wobble

- Two independent sine waves drive x/y offset of the gradient center:
  - X: frequency `~0.3Hz`, amplitude `8–12px` desktop / `5px` mobile
  - Y: frequency `~0.17Hz`, amplitude `8–12px` desktop / `5px` mobile
- Different frequencies ensure the pattern never visibly repeats
- Runs continuously after iris opens

---

## Content Stack

Centered column, `position: relative`, stacked vertically. Desktop: `100vh` section height, content vertically centered. Mobile: `auto` height with generous vertical padding (`--space-4xl` top/bottom).

| Order | Element | Specs |
|-------|---------|-------|
| 1 | App icon | `96px` desktop / `80px` mobile, iOS corners (`border-radius: 22%`), no border |
| 2 | App name | `clamp(40px, 6vw, 72px)`, Space Grotesk, `--text-display`, `SplitFlapText` |
| 3 | Tagline | Space Mono, `13px`, ALL CAPS, `0.06em` tracking, `--text-secondary`, max-width `280px` |
| 4 | App Store button | `<Button variant="primary">` wrapping `<a>` to App Store URL, no `MagneticWrapper` |

---

## Entrance Stagger

All content uses Framer Motion fade-up (`opacity: 0, y: 16 → opacity: 1, y: 0`) with `EASE_OUT_MOTION` and `DURATION.transition`. Delays:

| Element | Delay |
|---------|-------|
| App icon | `0ms` |
| App name (split-flap) | `100ms` |
| Tagline | `300ms` |
| Button | `500ms` |

`SplitFlapText` requires a small addition: an `isActive` boolean prop. When `true`, it applies the `-translate-y-1/2` transform directly (bypassing the CSS `group-hover` trigger). `SpotlightSection` holds an `isRevealed` state that flips to `true` when the iris animation starts, and passes it as `isActive` to `SplitFlapText`.

---

## Mobile Behavior

- Section height: `auto` with `--space-4xl` vertical padding
- Iris radius: `~45vw`
- Icon: `80px`
- App name: same `clamp` (naturally smaller)
- Tagline: wraps at `280px` max-width
- Wobble amplitude: `5px` on both axes

---

## Component

New file: `src/components/effects/SpotlightSection.tsx`

- `"use client"`
- Uses: `useRef`, `useEffect`, `useState`, `useInView` (motion/react), `useReducedMotion` (motion/react), `gsap` (from `@/lib/gsap`)
- Imports: `SplitFlapText`, `Button` from `@/components/ui`
- App Store URL sourced from `projects[0].links` (Daily Roman's App Store link) — not hardcoded

### Reduced motion

- Canvas draws static full-brightness spotlight (no iris animation, no wobble)
- All content renders at full opacity with no transition delays

---

## Assets

- App icon: `public/projects/daily-roman/appicon.png`
- App Store URL: `https://apps.apple.com/mx/app/daily-roman-ancient-history/id6759132785?l=en-GB` (from `src/data/projects.ts`)

---

## What This Is Not

- No hover effects on icon or button (spotlight provides ongoing animation interest)
- No beam cone from above — pool-only spotlight
- No `MagneticWrapper` on the button
- Not part of the `ProjectShowcase` scroll section — standalone section
