# Mobile Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 8 mobile UX issues: ticker threshold, nav overlap, page transition stutter, heatmap overflow, choppy scroll animations, broken projects grid, flat 3D entrance, disconnected swipe.

**Architecture:** Each task is an isolated file edit. No new files or abstractions required. Tasks 1–2 are trivial one-liners. Tasks 3–8 are self-contained component edits with no cross-task dependencies — they can be executed in any order after Task 1–2, but the listed order (lowest-risk first) is recommended.

**Tech Stack:** Next.js App Router, Framer Motion (`motion/react`), GSAP + ScrollTrigger, React Three Fiber, TypeScript, Tailwind CSS v4.

---

### Task 1: Ticker scroll threshold

**Files:**
- Modify: `src/components/ui/TickerText.tsx:42`

- [ ] **Step 1: Apply the fix**

In `TickerText.tsx` line 42, change the `rootMargin` string:

```tsx
// Before:
{ rootMargin: "-45% 0px -55% 0px" }

// After:
{ rootMargin: "-55% 0px -45% 0px" }
```

The full `useEffect` block becomes:

```tsx
useEffect(() => {
  if (!isMobile || !rowRef.current) return;
  const io = new IntersectionObserver(
    ([entry]) => setScrollActive(entry.isIntersecting),
    { rootMargin: "-55% 0px -45% 0px" }
  );
  io.observe(rowRef.current);
  return () => io.disconnect();
}, [isMobile]);
```

- [ ] **Step 2: Verify**

Open the site on mobile (or Chrome DevTools, 390px). Scroll to the ticker section. The ticker should activate when the row is ~55% down the screen (slightly past center), not 45%.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/TickerText.tsx
git commit -m "fix: ticker activates at 55% viewport depth on mobile"
```

---

### Task 2: Nav button overlapping page H1

**Files:**
- Modify: `src/app/projects/page.tsx:19`
- Modify: `src/app/projects/[slug]/page.tsx:41`

The nav button sits at `top: 16px`, height `48px` → occupies `16–64px`. Pages with `py-[var(--space-2xl)]` (48px) have their H1 inside that zone. Fix: `pt-[80px]` clears the 64px zone with 16px breathing room. Desktop keeps the original `md:py-[var(--space-4xl)]`.

- [ ] **Step 1: Fix projects/page.tsx**

Line 19, change the `<main>` className:

```tsx
// Before:
<main className="mx-auto max-w-[960px] px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-2xl)] md:py-[var(--space-4xl)]">

// After:
<main className="mx-auto max-w-[960px] px-[var(--space-md)] md:px-[var(--space-lg)] pt-[80px] pb-[var(--space-2xl)] md:py-[var(--space-4xl)]">
```

- [ ] **Step 2: Fix projects/[slug]/page.tsx**

Line 41, same change on the `<main>` element:

```tsx
// Before:
<main className="mx-auto max-w-[960px] px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-2xl)] md:py-[var(--space-4xl)]">

// After:
<main className="mx-auto max-w-[960px] px-[var(--space-md)] md:px-[var(--space-lg)] pt-[80px] pb-[var(--space-2xl)] md:py-[var(--space-4xl)]">
```

- [ ] **Step 3: Verify**

On mobile, navigate to `/projects` and any project detail page. The H1 should sit below the nav button with clear breathing room. On desktop, padding should be unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/app/projects/page.tsx src/app/projects/[slug]/page.tsx
git commit -m "fix: clear nav button overlap on projects pages (mobile)"
```

---

### Task 3: Page transitions — mobile opacity fade

**Files:**
- Modify: `src/transitions/TransitionProvider.tsx`

The current `navigate()` calls `cloneCurrentPage()` which does `canvas.toDataURL()` (GPU→CPU readback) on every WebGL canvas before navigation — expensive on mobile. Fix: detect mobile (≤767px), skip the clone entirely, use a 150ms GSAP opacity fade instead.

- [ ] **Step 1: Add isMobileRef and its effect**

After the existing `reducedMotionRef` declaration (line 142), add:

```tsx
const isMobileRef = useRef(false);
```

After the existing `reducedMotion` `useEffect` block (after line 153), add:

```tsx
useEffect(() => {
  const mql = window.matchMedia("(max-width: 767px)");
  isMobileRef.current = mql.matches;
  const handler = (e: MediaQueryListEvent) => {
    isMobileRef.current = e.matches;
  };
  mql.addEventListener("change", handler);
  return () => mql.removeEventListener("change", handler);
}, []);
```

- [ ] **Step 2: Add mobile path in navigate()**

In `navigate()`, after the `if (reducedMotionRef.current)` block (line 283–286), insert the mobile fade-out path:

```tsx
if (isMobileRef.current) {
  isTransitioningRef.current = true;
  setIsTransitioning(true);
  pendingHrefRef.current = href;
  lockOverflow();
  const currentEl = containerRef.current;
  if (!currentEl) {
    isTransitioningRef.current = false;
    setIsTransitioning(false);
    unlockOverflow();
    router.push(href);
    return;
  }
  const footer = document.querySelector("footer");
  gsap.to(
    [currentEl, footer].filter(Boolean),
    {
      opacity: 0,
      duration: 0.15,
      ease: "power1.out",
      onComplete: () => {
        router.push(href, { scroll: false });
      },
    }
  );
  return;
}
```

- [ ] **Step 3: Add mobile fade-in in the pathname change effect**

The `useEffect` that watches `pathname` (line 243–258) currently has two branches: the clone path and the fallback `else`. Add a middle branch for mobile:

```tsx
useEffect(() => {
  if (pathname === previousPathRef.current) return;
  dbg("pathname-changed", { from: previousPathRef.current, to: pathname });

  const clone = cloneRef.current;
  const el = containerRef.current;

  if (clone && el && isTransitioningRef.current) {
    const prevPath = previousPathRef.current;
    dbg("pathname-changed:triggering-transition");
    runTransition(clone, el, prevPath, pathname);
  } else if (isTransitioningRef.current && isMobileRef.current) {
    // Mobile: fade in the new page
    previousPathRef.current = pathname;
    const nextEl = containerRef.current;
    if (nextEl) {
      window.scrollTo(0, 0);
      gsap.fromTo(
        nextEl,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.15,
          ease: "power1.out",
          onComplete: () => {
            isTransitioningRef.current = false;
            setIsTransitioning(false);
            pendingHrefRef.current = null;
            unlockOverflow();
            requestAnimationFrame(() => ScrollTrigger.refresh());
          },
        }
      );
    }
    const footer = document.querySelector("footer");
    if (footer) {
      gsap.fromTo(footer, { opacity: 0 }, { opacity: 1, duration: 0.15, ease: "power1.out" });
    }
  } else {
    // Non-animated navigation (reduced motion, etc.)
    previousPathRef.current = pathname;
  }
}, [pathname, runTransition]);
```

- [ ] **Step 4: Add mobile path in handlePopState**

In the `handlePopState` handler (inside the `useEffect` on line 351), after the `if (reducedMotionRef.current) return;` check (line 354), insert:

```tsx
if (isMobileRef.current) {
  isPopStateRef.current = true;
  isTransitioningRef.current = true;
  setIsTransitioning(true);
  lockOverflow();
  const currentEl = containerRef.current;
  if (currentEl) {
    const footer = document.querySelector("footer");
    gsap.to(
      [currentEl, footer].filter(Boolean),
      { opacity: 0, duration: 0.15, ease: "power1.out" }
    );
    setTimeout(() => {
      if (isTransitioningRef.current) {
        if (containerRef.current) gsap.set(containerRef.current, { opacity: 1 });
        const safetyFooter = document.querySelector("footer");
        if (safetyFooter) gsap.set(safetyFooter, { opacity: 1 });
        isTransitioningRef.current = false;
        isPopStateRef.current = false;
        transitionRunningRef.current = false;
        setIsTransitioning(false);
        unlockOverflow();
      }
    }, 2000);
  } else {
    isTransitioningRef.current = false;
    isPopStateRef.current = false;
    setIsTransitioning(false);
    unlockOverflow();
  }
  return;
}
```

- [ ] **Step 5: Verify**

On mobile (375px), navigate between pages (Home → Projects → back). Should see a smooth 150ms opacity fade with no stutter. Canvas snapshot warning should not appear in console. Desktop transitions should be completely unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/transitions/TransitionProvider.tsx
git commit -m "fix: skip canvas clone on mobile, use 150ms opacity fade instead"
```

---

### Task 4: Heatmap 20-week rolling window on mobile

**Files:**
- Modify: `src/components/ui/UsageHeatmap.tsx`
- Modify: `src/components/ui/GitHubHeatmap.tsx`

Both heatmaps build a full-year grid (~52 weeks × 12px = ~624px wide at 10px cells + 2px gap). On 375px screens this overflows. On mobile, show only the last 20 weeks (~240px wide), which fits without scrolling.

#### UsageHeatmap.tsx

- [ ] **Step 1: Add isMobile state**

In `UsageHeatmap`, after the `gridRef` declaration (line 126), add:

```tsx
const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const mq = window.matchMedia("(max-width: 767px)");
  setIsMobile(mq.matches);
  const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}, []);
```

- [ ] **Step 2: Add buildMobileGrid helper**

Add this function next to the existing `buildGrid` function (after line 107):

```tsx
function buildMobileGrid(today: Date): { start: Date; weeks: number } {
  const MOBILE_WEEKS = 20;
  // Go back (MOBILE_WEEKS - 1) weeks from the current week's Sunday
  const thisSunday = toSunday(today);
  const start = new Date(thisSunday);
  start.setDate(thisSunday.getDate() - (MOBILE_WEEKS - 1) * 7);
  return { start, weeks: MOBILE_WEEKS };
}
```

- [ ] **Step 3: Use mobile grid in useMemo**

Update the `useMemo` block to branch on `isMobile`. Change the opening of the `useMemo` (lines 164–199):

```tsx
const { weeks, monthLabels, gridWidth, gridHeight } = useMemo(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { start: startDate, weeks: totalWeeks } = isMobile
    ? buildMobileGrid(today)
    : buildGrid(today);

  const w: Cell[][] = [];
  for (let wi = 0; wi < totalWeeks; wi++) {
    const week: Cell[] = [];
    for (let d = 0; d < DAYS; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + wi * 7 + d);
      week.push({ date, inFuture: date > today });
    }
    w.push(week);
  }

  const labels: MonthLabel[] = [];
  let lastMonth = -1;
  for (let wi = 0; wi < totalWeeks; wi++) {
    const firstDayOfWeek = w[wi][0].date;
    const month = firstDayOfWeek.getMonth();
    if (month !== lastMonth) {
      if (wi > 0 || firstDayOfWeek.getDate() <= 7) {
        labels.push({ weekIndex: wi, label: MONTH_ABBREVS[month] });
      }
      lastMonth = month;
    }
  }

  return {
    weeks: w,
    monthLabels: labels,
    gridWidth: totalWeeks * cfg.cellStep - cfg.gap,
    gridHeight: DAYS * cfg.cellStep - cfg.gap,
  };
}, [cfg.cellStep, cfg.gap, isMobile]);
```

#### GitHubHeatmap.tsx

- [ ] **Step 4: Apply the same three changes to GitHubHeatmap**

Add `isMobile` state (same pattern as Step 1) after `gridRef` declaration (line 113):

```tsx
const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const mq = window.matchMedia("(max-width: 767px)");
  setIsMobile(mq.matches);
  const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}, []);
```

Add `buildMobileGrid` helper after the existing `buildGrid` function (after line 94):

```tsx
function buildMobileGrid(today: Date): { start: Date; weeks: number } {
  const MOBILE_WEEKS = 20;
  const thisSunday = toSunday(today);
  const start = new Date(thisSunday);
  start.setDate(thisSunday.getDate() - (MOBILE_WEEKS - 1) * 7);
  return { start, weeks: MOBILE_WEEKS };
}
```

Update `useMemo` (lines 149–184) to use `isMobile`:

```tsx
const { weeks, monthLabels, gridWidth, gridHeight } = useMemo(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { start: startDate, weeks: totalWeeks } = isMobile
    ? buildMobileGrid(today)
    : buildGrid(today);

  const w: Cell[][] = [];
  for (let wi = 0; wi < totalWeeks; wi++) {
    const week: Cell[] = [];
    for (let d = 0; d < DAYS; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + wi * 7 + d);
      week.push({ date, inFuture: date > today });
    }
    w.push(week);
  }

  const labels: MonthLabel[] = [];
  let lastMonth = -1;
  for (let wi = 0; wi < totalWeeks; wi++) {
    const firstDayOfWeek = w[wi][0].date;
    const month = firstDayOfWeek.getMonth();
    if (month !== lastMonth) {
      if (wi > 0 || firstDayOfWeek.getDate() <= 7) {
        labels.push({ weekIndex: wi, label: MONTH_ABBREVS[month] });
      }
      lastMonth = month;
    }
  }

  return {
    weeks: w,
    monthLabels: labels,
    gridWidth: totalWeeks * cfg.cellStep - cfg.gap,
    gridHeight: DAYS * cfg.cellStep - cfg.gap,
  };
}, [cfg.cellStep, cfg.gap, isMobile]);
```

- [ ] **Step 5: Verify**

On mobile, navigate to the about page. Both heatmaps should show ~20 columns that fit within the screen width without horizontal scrolling. On desktop, both should still show the full year.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/UsageHeatmap.tsx src/components/ui/GitHubHeatmap.tsx
git commit -m "fix: heatmaps show 20-week rolling window on mobile"
```

---

### Task 5: About page scroll animations — remove scrub

**Files:**
- Modify: `src/components/effects/ExperienceTimeline.tsx:52-58`
- Modify: `src/components/effects/ProcessFlow.tsx:48-54`

`scrub: true` recalculates tween progress on every scroll event. On mobile this produces visible jank. Replacing with `toggleActions: "play none none none"` plays the animation once on enter — identical visual result, no continuous recalculation.

#### ExperienceTimeline.tsx

- [ ] **Step 1: Replace scrub with toggleActions**

In the `gsap.timeline` call (lines 52–59), replace the `scrollTrigger` config:

```tsx
// Before:
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: container,
    start: "top 80%",
    end: "bottom 50%",
    scrub: true,
  },
});

// After:
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: container,
    start: "top 80%",
    toggleActions: "play none none none",
  },
});
```

#### ProcessFlow.tsx

- [ ] **Step 2: Replace scrub with toggleActions**

In the `gsap.timeline` call (lines 48–55), replace the `scrollTrigger` config:

```tsx
// Before:
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: container,
    start: "top 80%",
    end: "top 30%",
    scrub: true,
  },
});

// After:
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: container,
    start: "top 80%",
    toggleActions: "play none none none",
  },
});
```

- [ ] **Step 3: Verify**

On mobile, scroll to the about page's experience timeline and process flow sections. Both should animate in smoothly as they enter the viewport without jank. The animations should play once (not scrub with scroll position).

- [ ] **Step 4: Commit**

```bash
git add src/components/effects/ExperienceTimeline.tsx src/components/effects/ProcessFlow.tsx
git commit -m "fix: replace GSAP scrub with toggleActions on about page animations"
```

---

### Task 6: Projects grid — ConnectedGrid + ScrollVelocityOffset

**Files:**
- Modify: `src/components/effects/ConnectedGrid.tsx`
- Modify: `src/components/effects/ScrollVelocityOffset.tsx`

Two issues: (1) `ConnectedGrid` computes SVG lines using a 2-column layout before `isMobile` state updates, leaving stale coordinates. (2) `ScrollVelocityOffset` adds a `y` transform that can prevent the `IntersectionObserver` from detecting cards on mobile.

#### ConnectedGrid.tsx

- [ ] **Step 1: Use margin:"0px" on mobile for useInView**

Line 30, change the `useInView` call:

```tsx
// Before:
const isInView = useInView(containerRef, { once: true, margin: "-60px" });

// After:
const isInView = useInView(containerRef, { once: true, margin: isMobile ? "0px" : "-60px" });
```

Note: `isMobile` is already declared on line 32; `useInView` is called before the `isMobile` state effect runs on first render (so it starts as `"-60px"`), but after `isMobile` flips to `true` the hook recreates its observer with `"0px"`.

- [ ] **Step 2: Add rAF delay before computeLines**

The `useEffect` that calls `computeLines` (lines 96–101):

```tsx
// Before:
useEffect(() => {
  computeLines();
  const ro = new ResizeObserver(computeLines);
  if (containerRef.current) ro.observe(containerRef.current);
  return () => ro.disconnect();
}, [computeLines, childArray.length]);

// After:
useEffect(() => {
  const raf = requestAnimationFrame(computeLines);
  const ro = new ResizeObserver(computeLines);
  if (containerRef.current) ro.observe(containerRef.current);
  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
  };
}, [computeLines, childArray.length]);
```

When `isMobile` changes, `computeLines` (which depends on `effectiveColumns`) changes too, triggering this effect. The `requestAnimationFrame` waits one frame for React's DOM update (grid goes from 2-column to 1-column) before recomputing line coordinates.

#### ScrollVelocityOffset.tsx

- [ ] **Step 3: Disable on mobile**

Add `isMobile` state + early return. The full component becomes:

```tsx
"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useVelocity, useTransform, useSpring, useReducedMotion } from "motion/react";
import { SCROLL_VELOCITY_MULTIPLIER, SPRING_FLUID } from "@/lib/motion";

interface ScrollVelocityOffsetProps {
  children: React.ReactNode;
  multiplier?: number;
  axis?: "x" | "y";
  className?: string;
}

export function ScrollVelocityOffset({
  children,
  multiplier = SCROLL_VELOCITY_MULTIPLIER,
  axis = "y",
  className = "",
}: ScrollVelocityOffsetProps) {
  const prefersReduced = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const clampedVelocity = useTransform(scrollVelocity, [-3000, 0, 3000], [-1, 0, 1]);
  const offset = useTransform(clampedVelocity, (v) => prefersReduced ? 0 : v * multiplier * 40);
  const smoothOffset = useSpring(offset, SPRING_FLUID);
  const style = axis === "y" ? { y: smoothOffset } : { x: smoothOffset };

  if (isMobile) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} style={style}>
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 4: Verify**

On mobile, navigate to `/projects`. The project cards grid should be visible and SVG connecting lines should appear correctly in a 1-column layout. On desktop, the grid should show 2 columns with SVG lines, and the scroll velocity offset should still be active.

- [ ] **Step 5: Commit**

```bash
git add src/components/effects/ConnectedGrid.tsx src/components/effects/ScrollVelocityOffset.tsx
git commit -m "fix: projects grid visible on mobile (correct line coords, no velocity offset)"
```

---

### Task 7: 3D model entrance — dramatic spin-in with scale

**Files:**
- Modify: `src/components/3d/DeviceScene.tsx:70-71` (AnimatedDevice)

Currently the device starts at `0.785` rad (~45°) and lerps to `0.09` (~5°). The 40° arc reads as subtle. Fix: start at `Math.PI / 2` (~90°, edge-on) so the 3D nature is immediately obvious, and add a scale entrance from `0.75` → `1.0` so the device appears to move toward the camera.

- [ ] **Step 1: Change initial rotation and add scaleRef**

In `AnimatedDevice` (starting at line 58), find the ref declarations at lines 70–74:

```tsx
// Before:
const rotationRef = useRef(0.785); // Start at ~45°
const floatRef = useRef(0);
const smoothTiltX = useRef(0);
const smoothTiltY = useRef(0);
const groupRef = useRef<THREE.Group>(null);

// After:
const rotationRef = useRef(Math.PI / 2); // Start edge-on at 90°
const scaleRef = useRef(0.75); // Scale entrance 0.75 → 1.0
const floatRef = useRef(0);
const smoothTiltX = useRef(0);
const smoothTiltY = useRef(0);
const groupRef = useRef<THREE.Group>(null);
```

- [ ] **Step 2: Set scale in prefersReduced branch**

In the `useFrame` callback, the `prefersReduced` early-return block (lines 117–130) needs to also set scale:

```tsx
if (prefersReduced) {
  groupRef.current.rotation.set(0, 0, 0);
  groupRef.current.position.y = 0;
  groupRef.current.scale.setScalar(modelScale); // ensure full scale instantly
  // Instant swap for reduced-motion
  if (phoneGroupRef.current) {
    phoneGroupRef.current.position.y = deviceType === "phone" ? 0 : -2;
    phoneGroupRef.current.visible = deviceType === "phone";
  }
  if (laptopGroupRef.current) {
    laptopGroupRef.current.position.y = deviceType === "laptop" ? 0 : 2;
    laptopGroupRef.current.visible = deviceType === "laptop";
  }
  return;
}
```

- [ ] **Step 3: Add scale lerp to useFrame**

In the main (non-prefersReduced) section of `useFrame`, after the rotation lerp lines (143–144), add scale lerp and apply to group. Also replace the existing `<group ref={groupRef} scale={modelScale}>` — since `useFrame` now drives scale, the `scale` prop on the group is no longer needed. Do both changes together:

After line 144 (`rotationRef.current += ...`), add:

```tsx
// Scale entrance: lerp from 0.75 to modelScale
scaleRef.current += (1.0 - scaleRef.current) * delta * 4;
groupRef.current.scale.setScalar(scaleRef.current * modelScale);
```

The group's `scale` JSX prop (line 198) should be removed since `useFrame` drives it:

```tsx
// Before:
<group ref={groupRef} scale={modelScale}>

// After:
<group ref={groupRef}>
```

- [ ] **Step 4: Verify**

On desktop and mobile, navigate to the homepage. The 3D device should enter by spinning from edge-on (~90°) to face-forward (~5°) while simultaneously scaling up from 75% to 100%. The motion should feel dramatic but natural, not abrupt. Devices should float subtly when fully active.

- [ ] **Step 5: Commit**

```bash
git add src/components/3d/DeviceScene.tsx
git commit -m "feat: 3D model entrance spins from edge-on 90° with scale-up 0.75→1.0"
```

---

### Task 8: Mobile carousel — physical swipe animation

**Files:**
- Modify: `src/components/effects/ProjectShowcase.tsx`

Currently the mobile carousel swaps `mobileIndex` directly in `onDragEnd` — the device "pops" to the new texture with no transition. The info panel direction is also hardcoded. Fix: animate the device container off-screen, swap the index while invisible, snap to the opposite side, animate back to center. Track `swipeDirection` to match the info panel's `AnimatePresence` direction.

- [ ] **Step 1: Update imports**

At the top of `ProjectShowcase.tsx`, add `useAnimation` to the `motion/react` import, and `SPRING_SNAPPY` to the `@/lib/motion` import:

```tsx
// Before:
import {
  motion,
  useScroll,
  useMotionValueEvent,
  AnimatePresence,
  useReducedMotion,
} from "motion/react";
import { DURATION, EASE_OUT_MOTION } from "@/lib/motion";

// After:
import {
  motion,
  useScroll,
  useMotionValueEvent,
  AnimatePresence,
  useReducedMotion,
  useAnimation,
} from "motion/react";
import { DURATION, EASE_OUT_MOTION, SPRING_SNAPPY } from "@/lib/motion";
```

- [ ] **Step 2: Add swipe state and controls**

In the mobile carousel section (around line 172), alongside `mobileIndex` and `goToProject`, add:

```tsx
const [swipeDirection, setSwipeDirection] = useState<1 | -1>(1);
const carouselControls = useAnimation();
const pointerStartX = useRef(0);
const isDraggingRef = useRef(false);
const currentDragX = useRef(0);
const isSwipeAnimatingRef = useRef(false);
```

- [ ] **Step 3: Replace handleDragEnd with pointer handlers**

Remove the existing `handleDragEnd` function (lines 185–202). Add these three handlers in its place:

```tsx
function handlePointerDown(e: React.PointerEvent) {
  if (isSwipeAnimatingRef.current) return;
  pointerStartX.current = e.clientX;
  currentDragX.current = 0;
  isDraggingRef.current = true;
  (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
}

function handlePointerMove(e: React.PointerEvent) {
  if (!isDraggingRef.current) return;
  const offset = e.clientX - pointerStartX.current;
  currentDragX.current = offset;
  carouselControls.set({ x: offset * 0.25 });
}

async function handlePointerUp() {
  if (!isDraggingRef.current) return;
  isDraggingRef.current = false;

  const offset = currentDragX.current;
  const THRESHOLD = 50;

  if (Math.abs(offset) < THRESHOLD) {
    // Cancelled swipe — spring back to center
    carouselControls.start({ x: 0, transition: SPRING_SNAPPY });
    return;
  }

  isSwipeAnimatingRef.current = true;
  const goingLeft = offset < 0; // swipe left = next project
  const exitX = goingLeft ? -400 : 400;
  const enterFromX = goingLeft ? 400 : -400;
  const direction: 1 | -1 = goingLeft ? 1 : -1;

  // 1. Slide off screen
  await carouselControls.start({
    x: exitX,
    transition: { duration: 0.2, ease: EASE_OUT_MOTION },
  });

  // 2. Swap index while offscreen
  setSwipeDirection(direction);
  goToProject(mobileIndex + (goingLeft ? 1 : -1));

  // 3. Snap to opposite side (instant)
  carouselControls.set({ x: enterFromX });

  // 4. Animate back to center
  await carouselControls.start({
    x: 0,
    transition: { duration: 0.25, ease: EASE_OUT_MOTION },
  });

  isSwipeAnimatingRef.current = false;
}

function handlePointerCancel() {
  if (!isDraggingRef.current) return;
  isDraggingRef.current = false;
  carouselControls.start({ x: 0, transition: SPRING_SNAPPY });
}
```

- [ ] **Step 4: Update the mobile device container JSX**

Replace the current swipeable `motion.div` (lines 210–225). Remove `drag`, `dragConstraints`, `dragElastic`, `onDragEnd`, and instead use `animate={carouselControls}` and the pointer handlers:

```tsx
<motion.div
  className="relative min-h-0 flex-1 overflow-hidden touch-none"
  animate={carouselControls}
  onPointerDown={handlePointerDown}
  onPointerMove={handlePointerMove}
  onPointerUp={handlePointerUp}
  onPointerCancel={handlePointerCancel}
>
  <DeviceScene
    deviceType={mobileProject.deviceType}
    screenTexture={mobileProject.screenTexture}
    scrollProgress={0}
    isActive={true}
    projectSlug={mobileProject.slug}
    modelScale={0.85}
  />
</motion.div>
```

Note: `touch-pan-y` changed to `touch-none` since we're handling all pointer events manually now.

- [ ] **Step 5: Update AnimatePresence direction**

The info panel `AnimatePresence` (lines 251–298) currently has hardcoded `x: 20` / `x: -20`. Update to use `swipeDirection`:

```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={mobileProject.slug}
    initial={prefersReduced ? { opacity: 1 } : { opacity: 0, x: swipeDirection * 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={prefersReduced ? { opacity: 1 } : { opacity: 0, x: swipeDirection * -20 }}
    transition={{
      duration: prefersReduced ? 0 : DURATION.transition,
      ease: EASE_OUT_MOTION,
    }}
    className="shrink-0 px-[var(--space-md)] pb-[var(--space-lg)] pt-[var(--space-xs)]"
  >
```

- [ ] **Step 6: Verify**

On mobile, swipe left and right on the homepage 3D device. Each swipe should:
- Provide immediate 25% drag feedback during the gesture
- Animate the device off-screen on release, swap silently, snap to opposite side, glide back to center
- The info panel text should slide out/in from the correct direction matching the swipe

Cancelled swipes (small offset) should spring back. Dot indicators should update to match the current project.

- [ ] **Step 7: Commit**

```bash
git add src/components/effects/ProjectShowcase.tsx
git commit -m "feat: mobile carousel physical swipe animation with directional info panel"
```

---

## Implementation Order Summary

| # | Task | Files | Risk |
|---|------|-------|------|
| 1 | Ticker threshold | `TickerText.tsx` | Low — 1 string |
| 2 | Nav H1 padding | `projects/page.tsx`, `[slug]/page.tsx` | Low — class swap |
| 3 | Page transitions | `TransitionProvider.tsx` | Medium — async flow |
| 4 | Heatmap window | `UsageHeatmap.tsx`, `GitHubHeatmap.tsx` | Low — additive |
| 5 | Remove scrub | `ExperienceTimeline.tsx`, `ProcessFlow.tsx` | Low — config change |
| 6 | Projects grid | `ConnectedGrid.tsx`, `ScrollVelocityOffset.tsx` | Medium — timing |
| 7 | 3D entrance | `DeviceScene.tsx` | Low — animation tweak |
| 8 | Swipe animation | `ProjectShowcase.tsx` | High — gesture rewrite |
