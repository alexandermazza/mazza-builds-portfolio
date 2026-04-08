# Mobile Optimization — Design Spec
**Date:** 2026-04-07

## Overview
Full mobile experience audit and fix pass. Addresses performance, animation quality, layout correctness, and data visualization responsiveness.

---

## 1. Page Transitions on Mobile

### Problem
`TransitionProvider` clones the entire DOM and calls `canvas.toDataURL()` (GPU→CPU readback) before every navigation. On mobile this causes a visible stutter (the canvas snapshot is expensive) and the animation itself runs at the same duration as desktop.

### Fix
Detect mobile (`≤767px`) inside `TransitionProvider`. On mobile, skip the clone entirely and use a simple opacity cross-fade:

1. Fade out current container (150ms ease-out)
2. `router.push()`
3. Fade in new container (150ms ease-out)

No clone, no canvas snapshot, no GSAP clone animation. On desktop, the existing GSAP clone animation is unchanged.

**Files:** `src/transitions/TransitionProvider.tsx`

---

## 2. Mobile Project Carousel — Swipe Animation & Lag

### Problem
- **Lag:** When `mobileIndex` changes, `DeviceScene` receives a new `screenTexture`. There's no animation masking the texture swap — the scene feels like it "pops."
- **No lateral movement:** The 3D device doesn't move with the swipe gesture. Swiping feels disconnected from the result.

### Fix

#### Real-time drag feedback
During drag, translate the device container at 25% of the finger's x offset. This gives immediate physical feedback without letting the device leave the frame.

#### Swipe sequence (valid swipe)
1. Animate container off-screen in swipe direction (200ms, ease-out)
2. Change `mobileIndex` — texture swaps while device is offscreen (invisible)
3. Snap container instantly to opposite side (`x = ±400`)
4. Animate back to center (250ms, ease-out)

#### Cancelled swipe
Spring back to `x: 0` using `SPRING_SNAPPY`.

#### Direction matching
The info panel's existing `AnimatePresence` (`x: ±20`) direction must match the swipe direction. Track `swipeDirection: 1 | -1` state alongside `mobileIndex`.

**Files:** `src/components/effects/ProjectShowcase.tsx`

---

## 3. 3D Model Entrance Spin — More Dramatic

### Problem
Models start at `0.785` rad (~45°) and lerp to `0.09` (~5°). The 40° arc is too subtle to clearly read as 3D, especially on mobile where the model is smaller.

### Fix

**Rotation:** Change initial `rotationRef.current` from `0.785` to `Math.PI / 2` (~90°). The device enters edge-on — clearly a 3D object — then rotates forward to face the user.

**Scale:** Add `scaleRef.current` initialized at `0.75`, lerping to `1.0` when active. Apply via `groupRef.current.scale.setScalar(scaleRef.current)` inside `useFrame`. The device appears to come toward the camera as it turns, amplifying the depth read.

Lerp speed unchanged (`delta * 4`) — the longer arc creates natural easing without code changes.

Applies to both mobile and desktop.

**Files:** `src/components/3d/DeviceScene.tsx` (`AnimatedDevice`)

---

## 4. About Page — Choppy Scroll Animations

### Problem
`ExperienceTimeline` and `ProcessFlow` both use GSAP `scrub: true`, which recalculates tween progress on every scroll event. On mobile, this is expensive and produces visible jank.

### Fix — Both components
Replace `scrub` scroll trigger config:

**Before:**
```js
scrollTrigger: {
  trigger: container,
  start: "top 80%",
  end: "bottom 50%",  // or "top 30%"
  scrub: true,
}
```

**After:**
```js
scrollTrigger: {
  trigger: container,
  start: "top 80%",
  toggleActions: "play none none none",
}
```

Remove `end`. Animations play forward once on enter — identical visual result, no continuous scroll recalculation.

**Files:**
- `src/components/effects/ExperienceTimeline.tsx`
- `src/components/effects/ProcessFlow.tsx`

---

## 5. Heatmap Rolling Window (Mobile)

### Problem
Both heatmaps render a full-year grid (~52 weeks × 7px = ~364px wide). On mobile screens (~375px with padding), this overflows and clips at approximately May.

### Fix
Add `isMobile` detection (`≤767px`) to both `UsageHeatmap` and `GitHubHeatmap`. On mobile, replace the full-year `buildGrid` with a 20-week rolling window ending at today:

- Grid width: `20 × 7px = 140px` — fits any phone without scrolling
- Window starts at: `today - (20 * 7) days`, aligned to Sunday
- Month labels render correctly within the window (same labeling logic)
- Stats bar (tokens/contributions/days active) unchanged above grid

**Files:**
- `src/components/ui/UsageHeatmap.tsx`
- `src/components/ui/GitHubHeatmap.tsx`

---

## 6. Ticker Scroll Threshold

### Problem
Ticker rows activate at 45% from viewport top on mobile. User wants ~55%.

### Fix
`TickerText.tsx` line 43:

**Before:** `rootMargin: "-45% 0px -55% 0px"`
**After:** `rootMargin: "-55% 0px -45% 0px"`

Shifts trigger point from 45% to 55% down the viewport.

**Files:** `src/components/ui/TickerText.tsx`

---

## 7. Nav Button Touching Page H1

### Problem
The fixed nav button on mobile sits at `top: 16px`, height `48px` → occupies viewport 16–64px. Pages using `py-[var(--space-2xl)]` (48px) have their H1 text at ~48px — inside the button zone.

**Affected pages:**
- `/projects` — `py-[var(--space-2xl)] md:py-[var(--space-4xl)]`
- `/projects/[slug]` — `py-[var(--space-2xl)] md:py-[var(--space-4xl)]`

About page uses `py-[var(--space-4xl)]` (96px) — already clear.

### Fix
Change top padding on affected pages:

**Before:** `py-[var(--space-2xl)] md:py-[var(--space-4xl)]`
**After:** `pt-[80px] pb-[var(--space-2xl)] md:py-[var(--space-4xl)]`

80px clears the 64px button zone with 16px breathing room.

**Files:**
- `src/app/projects/page.tsx`
- `src/app/projects/[slug]/page.tsx`

---

## 8. Projects Page Grid Not Appearing

### Problem
`ConnectedGrid` initializes `isMobile: false` (SSR default). On first render, `effectiveColumns = 2`. Framer Motion's `useInView` with `once: true` may fire during this wrong 2-column layout. When `isMobile` flips to `true` and layout becomes 1-column, the SVG lines may have stale coordinates.

Additionally, `ScrollVelocityOffset` wrapping the grid on mobile adds touch jitter and a `y` transform that can interfere with IntersectionObserver.

### Fix

**ConnectedGrid:** On mobile, use `margin: "0px"` for `useInView` (not `-60px`) so cards are visible the moment they enter the viewport. After `isMobile` updates, trigger a `requestAnimationFrame` delay before `computeLines` so the DOM has settled to the correct 1-column layout.

**ScrollVelocityOffset:** Disable on mobile — the effect is imperceptible on touch and the transform causes issues. The component already reads `prefersReduced`; add `isMobile` as a second bail-out so it renders children without the motion wrapper on mobile.

**Files:**
- `src/components/effects/ConnectedGrid.tsx`
- `src/components/effects/ScrollVelocityOffset.tsx`

---

## Implementation Order

1. Ticker threshold (1 line change, lowest risk)
2. Nav H1 padding (2 files, trivial)
3. Page transitions — mobile fade
4. Heatmap rolling window
5. About page animation — remove scrub
6. Projects grid — ConnectedGrid + ScrollVelocityOffset
7. 3D entrance spin — scale + rotation angle
8. Mobile carousel — swipe animation sequence
