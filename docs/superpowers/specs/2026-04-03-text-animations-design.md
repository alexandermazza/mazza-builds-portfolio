# Text Animation Components — Design Spec

**Date:** 2026-04-03
**Status:** Approved
**Scope:** 4 Framer Motion components for the Mazza Builds portfolio

---

## Overview

Four text animation components that form the motion layer of the portfolio. These overlay onto the existing page structure without changing layout. All respect `prefers-reduced-motion` (instant display, no animation).

## Components

### 1. SplitTextScatter

**File:** `src/components/ui/SplitTextScatter.tsx`
**Purpose:** Hero headline entrance animation. The ONE moment of surprise on the page.

**Props:**
- `text: string` — the text to render (e.g. `"MAZZA BUILDS"`)
- `className?: string` — applied to the outer wrapper

**Behavior — Desktop (>= 768px):**
- Text splits by word (for line wrapping), then by character
- Each character starts at random X (±40–60px), random Y (±40–60px), random rotation (±15deg), opacity 0
- All converge to final position on mount
- Transition: `SPRING_FLUID` (stiffness 180, damping 24)
- Character stagger: ~0.02s between characters
- Random offsets seeded per-character (deterministic across renders using index-based math, not `Math.random()`)

**Behavior — Mobile (< 768px):**
- Falls back to line-by-line fade + slide up (12px), no scatter
- Uses `EASE_OUT_MOTION` + `DURATION.transition`
- Stagger: `LINE_REVEAL_STAGGER` between lines

**Render:** `<h1>` containing `<span>` per word (for natural wrapping) containing `<motion.span>` per character. Words separated by a space character in its own span.

**Responsive detection:** `window.matchMedia("(min-width: 768px)")` checked once on mount via `useState` + `useEffect`. No resize listener needed — the animation plays once.

### 2. TextReveal

**File:** `src/components/ui/TextReveal.tsx`
**Purpose:** Section headers fade+slide in on scroll.

**Props:**
- `children: string` — the text content
- `as?: "h2" | "h3" | "p" | "span"` — HTML element to render (default `"p"`)
- `className?: string`

**Behavior:**
- Splits text by words
- Each word: opacity 0 → 1, y: 12px → 0
- Stagger: `TEXT_REVEAL_STAGGER` (0.035s) between words
- Transition: `EASE_OUT_MOTION`, `DURATION.transition`
- Trigger: `whileInView`, `once: true`, viewport margin `-80px`

**Render:** Outer element (determined by `as` prop) as `motion.[element]`. Each word is a `motion.span` with `display: inline-block` and a trailing space.

### 3. ScrollTextLines

**File:** `src/components/ui/ScrollTextLines.tsx`
**Purpose:** Body paragraphs reveal line-by-line on scroll.

**Props:**
- `children: string` — the paragraph text
- `className?: string`

**Behavior:**
- Splits text by newlines (`\n`). If no newlines, splits by sentences (`. ` boundary, keeping the period).
- Each line: opacity 0 → 1, y: 16px → 0
- Stagger: `LINE_REVEAL_STAGGER` (0.08s) between lines
- Transition: `EASE_OUT_MOTION`, `DURATION.transition`
- Trigger: `whileInView`, `once: true`, viewport margin `-60px`

**Render:** Outer `<div>`. Each line is a `<motion.p>` (or `<motion.span style="display:block">` if semantic `<p>` nesting is an issue).

### 4. TickerText

**File:** `src/components/ui/TickerText.tsx`
**Purpose:** Infinite horizontal scrolling loop of builder identity items.

**Default items:** `["IOS APPS", "SHOPIFY TOOLS", "AI PIPELINES", "VIDEO AUTOMATION", "WEB APPS", "CONTENT SYSTEMS"]`

**Props:**
- `items: string[]` — the items to display
- `speed?: number` — pixels per second (default `TICKER_SPEED` = 60)
- `className?: string` — applied to outer container

**Behavior:**
- Items rendered in a row, duplicated once for seamless loop
- Separated by a centered dot (`·`) in `--text-disabled`
- CSS `@keyframes` animation using `translateX` for GPU-accelerated performance (not Framer Motion per-frame)
- Animation duration calculated: `(total content width) / speed` seconds
- `linear` timing, `infinite` iteration
- On hover over any item: item text color transitions from `--text-disabled` to `--text-primary`. The ticker does NOT pause (continuous motion is the point).

**Render:** Outer `<div>` with `overflow: hidden`. Inner `<div>` with the CSS animation. Each item is a `<span>` in Space Mono, 11px, ALL CAPS, 0.08em tracking.

**Width measurement:** Use a `ref` + `useEffect` to measure the rendered width of one set of items, then set the animation `translateX` from `0` to `-measuredWidth`.

---

## Shared Rules

- All components are `"use client"`
- All import motion constants from `@/lib/motion`
- All respect `prefers-reduced-motion`: check via `window.matchMedia("(prefers-reduced-motion: reduce)")` — if true, render text immediately with no animation
- No springs with bounce (per Nothing anti-patterns) except `SPRING_FLUID` on the scatter which has high damping (24) and reads as a deceleration, not a bounce
- Barrel export all from `src/components/ui/index.ts`

## Integration Points

These components replace static text in the existing sections:

| Component | Replaces |
|-----------|----------|
| `SplitTextScatter` | Hero `<h1>` in `sections/Hero.tsx` |
| `TextReveal` | Section labels (`// PROJECTS`, `// ABOUT`, `// CONTACT`) |
| `ScrollTextLines` | About bio paragraphs |
| `TickerText` | New element — placed between Hero and Projects as a full-width horizontal band |

## Out of Scope

- Structural layout changes (horizontal scroll, radial menu, etc.) — separate future spec
- Magnetic filings, cursor effects — ambient layer, separate future spec
- Notifications stack — separate future spec
