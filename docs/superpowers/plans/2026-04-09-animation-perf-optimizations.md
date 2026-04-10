# Animation Performance Optimizations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate wasted GPU/CPU work from off-screen draw loops, per-frame layout reads, and excessive GSAP tweens — without any visual changes.

**Architecture:** Seven targeted surgical fixes to existing animation components. Each fix is independent and can be verified in isolation. The biggest wins come from pausing canvas draw loops when components scroll off-screen (Tasks 1-4), then eliminating per-frame layout thrashing (Task 5), then reducing GSAP tween count (Task 6), and finally guarding hidden 3D model work (Task 7).

**Tech Stack:** GSAP (ticker, ScrollTrigger), Framer Motion, Three.js/R3F, Canvas 2D API, IntersectionObserver

---

## File Map

| # | File | Change | Responsibility |
|---|------|--------|---------------|
| 1 | `src/components/effects/SpotlightSection.tsx` | Modify | Add IO pause for canvas draw loop + cache dimensions |
| 2 | `src/components/effects/MagneticField.tsx` | Modify | Add IO pause for canvas draw loop |
| 3 | `src/components/effects/MorphingGrid.tsx` | Modify | Add IO pause + replace per-point tweens with manual ticker loop |
| 4 | `src/components/DepthGallery/engine.ts` | Modify | Add IO-driven start/stop for rAF loop |
| 5 | `src/components/DepthGallery/DepthGallery.tsx` | Modify | Wire IO to engine start/stop |
| 6 | `src/components/DepthGallery/scroll.ts` | Modify | Cache layout reads, update on resize only |
| 7 | `src/components/3d/PhoneModel.tsx` | Modify | Guard video texture update on visibility |
| 8 | `src/components/3d/LaptopModel.tsx` | Modify | Guard video texture update on visibility |
| 9 | `src/components/3d/DeviceScene.tsx` | Modify | Pass device visibility to model components |

---

### Task 1: Pause SpotlightSection canvas when off-screen + cache dimensions

**Files:**
- Modify: `src/components/effects/SpotlightSection.tsx:29-126`

The SpotlightSection canvas draw loop (`gsap.ticker.add(draw)`) runs at 60fps forever after mount. It also reads `canvas!.offsetWidth` and `canvas!.offsetHeight` every frame (lines 77-78), forcing layout recalculation. Fix both: cache dimensions in `resize()`, and use an IntersectionObserver to add/remove the draw callback from the GSAP ticker.

- [ ] **Step 1: Add a size cache ref and visibility ref**

At the top of the component (after existing refs around line 33), add:

```tsx
const sizeRef = useRef({ w: 0, h: 0 });
const visibleRef = useRef(false);
```

- [ ] **Step 2: Update `resize()` to populate the size cache**

Replace the existing `resize()` function (lines 69-74) with:

```tsx
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };
    }
```

- [ ] **Step 3: Update `draw()` to use cached dimensions and respect visibility**

Replace the existing `draw()` function (lines 76-116) with:

```tsx
    function draw() {
      if (!visibleRef.current) return;

      const { w, h } = sizeRef.current;
      if (w === 0 || h === 0) return;

      const progress = irisProgress.current.value;
      const mobile = isMobileRef.current;
      const radiusFraction = mobile ? IRIS_RADIUS_VW_MOBILE : IRIS_RADIUS_VW_DESKTOP;
      const wobbleAmp = mobile ? WOBBLE_AMP_MOBILE : WOBBLE_AMP_DESKTOP;

      // Full iris radius in px
      const maxRadius = w * radiusFraction;
      const currentRadius = maxRadius * progress;

      // Wobble offset — only after iris starts
      let wobbleX = 0;
      let wobbleY = 0;
      if (progress > 0 && !reducedMotion) {
        const elapsed = (Date.now() - startTime.current) / 1000;
        wobbleX = Math.sin(elapsed * WOBBLE_FREQ_X * Math.PI * 2) * wobbleAmp;
        wobbleY = Math.sin(elapsed * WOBBLE_FREQ_Y * Math.PI * 2) * wobbleAmp;
      }

      const cx = w / 2 + wobbleX;
      const cy = h / 2 + wobbleY;

      // 1. Fill black
      ctx!.globalCompositeOperation = "source-over";
      ctx!.fillStyle = "#000000";
      ctx!.fillRect(0, 0, w, h);

      if (currentRadius > 0) {
        // 2. Punch out the spotlight with destination-out
        ctx!.globalCompositeOperation = "destination-out";
        const gradient = ctx!.createRadialGradient(cx, cy, 0, cx, cy, currentRadius);
        gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
        gradient.addColorStop(0.7, "rgba(0, 0, 0, 0.8)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx!.fillStyle = gradient;
        ctx!.fillRect(0, 0, w, h);
        ctx!.globalCompositeOperation = "source-over";
      }
    }
```

- [ ] **Step 4: Add IntersectionObserver to control visibility**

Add an IntersectionObserver inside the same `useEffect` block, after the `resize()` call (after current line 118) and before the `gsap.ticker.add(draw)` line:

```tsx
    resize();

    // Pause draw loop when section is off-screen
    const io = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting; },
      { rootMargin: "100px" }
    );
    if (sectionRef.current) io.observe(sectionRef.current);

    gsap.ticker.add(draw);
    window.addEventListener("resize", resize);

    return () => {
      gsap.ticker.remove(draw);
      window.removeEventListener("resize", resize);
      io.disconnect();
    };
```

- [ ] **Step 5: Verify**

Run `npm run dev`, scroll through the homepage. The spotlight section should look identical — iris opens, wobble runs while visible, and the canvas stops drawing when scrolled off-screen. Check with browser DevTools Performance tab: no canvas draw calls when section is not in viewport.

- [ ] **Step 6: Commit**

```bash
git add src/components/effects/SpotlightSection.tsx
git commit -m "perf: pause SpotlightSection canvas when off-screen + cache dimensions"
```

---

### Task 2: Pause MagneticField canvas when off-screen

**Files:**
- Modify: `src/components/effects/MagneticField.tsx:148-324`

MagneticField already caches dimensions in `sizeRef` (good!), but the draw loop runs forever via `gsap.ticker`. Add an IntersectionObserver to skip drawing when not visible. The canvas is mounted inside TerminalHero's reveal section, so we observe the canvas element itself.

- [ ] **Step 1: Add a visibility ref**

After the existing `sizeRef` declaration (line 157), add:

```tsx
  const visibleRef = useRef(false);
```

- [ ] **Step 2: Add early return in `draw()` when not visible**

At the very top of the existing `draw()` function (line 236), before the `pendingMs += deltaTime` line, add:

```tsx
      if (!visibleRef.current) return;
```

- [ ] **Step 3: Add IntersectionObserver setup and cleanup**

After the existing `gsap.ticker.add(draw)` and `window.addEventListener("resize", init)` lines (lines 317-318), add the observer setup. Replace the cleanup return (lines 320-323) with:

```tsx
    init();
    gsap.ticker.add(draw);
    window.addEventListener("resize", init);

    // Pause draw loop when canvas is off-screen
    const io = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting; },
      { rootMargin: "100px" }
    );
    io.observe(canvas);

    return () => {
      gsap.ticker.remove(draw);
      window.removeEventListener("resize", init);
      io.disconnect();
    };
```

- [ ] **Step 4: Verify**

Run `npm run dev`, verify the MagneticField background in the hero section animates normally when visible. Scroll down past the hero — the canvas should stop drawing. Scroll back — pulses resume.

- [ ] **Step 5: Commit**

```bash
git add src/components/effects/MagneticField.tsx
git commit -m "perf: pause MagneticField canvas when off-screen"
```

---

### Task 3: Rewrite MorphingGrid — IO pause + manual ticker loop (no per-point tweens)

**Files:**
- Modify: `src/components/effects/MorphingGrid.tsx` (full rewrite of useEffect body)

MorphingGrid creates ~400 individual `gsap.to()` tweens (one per grid point with repeat/yoyo). Replace with a single `gsap.ticker` callback that manually advances point positions using sine waves. Also add IntersectionObserver to pause when off-screen, and debounce resize.

- [ ] **Step 1: Replace the entire component**

Replace the full content of `src/components/effects/MorphingGrid.tsx` with:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

interface Point {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  // Per-point phase offsets for sine-wave drift (replaces individual GSAP tweens)
  phaseX: number;
  phaseY: number;
  speedX: number;
  speedY: number;
}

const SPACING = 70;
const DRIFT = 25;

export function MorphingGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Point[]>([]);
  const colsRef = useRef(0);
  const visibleRef = useRef(false);
  const sizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const lineColor = "rgba(255, 255, 255, 0.12)";
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    function initGrid() {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };

      const cols = Math.ceil(w / SPACING) + 2;
      const rows = Math.ceil(h / SPACING) + 2;
      const offsetX = (w - (cols - 1) * SPACING) / 2;
      const offsetY = (h - (rows - 1) * SPACING) / 2;

      colsRef.current = cols;
      pointsRef.current = [];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const baseX = offsetX + c * SPACING;
          const baseY = offsetY + r * SPACING;
          pointsRef.current.push({
            baseX,
            baseY,
            x: baseX,
            y: baseY,
            phaseX: Math.random() * Math.PI * 2,
            phaseY: Math.random() * Math.PI * 2,
            speedX: 0.3 + Math.random() * 0.4,
            speedY: 0.3 + Math.random() * 0.4,
          });
        }
      }
    }

    function draw(_time: number, deltaTime: number) {
      if (!visibleRef.current) return;

      const { w, h } = sizeRef.current;
      if (w === 0 || h === 0) return;

      const dt = deltaTime / 1000;

      // Advance point positions via sine waves (replaces 400 GSAP tweens)
      if (!reducedMotion) {
        for (const p of pointsRef.current) {
          p.phaseX += dt * p.speedX;
          p.phaseY += dt * p.speedY;
          p.x = p.baseX + Math.sin(p.phaseX) * DRIFT;
          p.y = p.baseY + Math.sin(p.phaseY) * DRIFT;
        }
      }

      ctx!.clearRect(0, 0, w, h);

      const points = pointsRef.current;
      const cols = colsRef.current;
      if (!points.length || !cols) return;

      ctx!.strokeStyle = lineColor;
      ctx!.lineWidth = 1;

      // Draw horizontal lines
      ctx!.beginPath();
      for (let i = 0; i < points.length; i++) {
        if (i % cols < cols - 1) {
          const p1 = points[i];
          const p2 = points[i + 1];
          ctx!.moveTo(p1.x, p1.y);
          ctx!.lineTo(p2.x, p2.y);
        }
      }
      ctx!.stroke();

      // Draw vertical lines
      ctx!.beginPath();
      for (let i = 0; i < points.length - cols; i++) {
        const p1 = points[i];
        const p2 = points[i + cols];
        ctx!.moveTo(p1.x, p1.y);
        ctx!.lineTo(p2.x, p2.y);
      }
      ctx!.stroke();
    }

    initGrid();

    gsap.ticker.add(draw);

    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(initGrid, 150);
    };
    window.addEventListener("resize", onResize);

    // Pause draw loop when canvas is off-screen
    const io = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting; },
      { rootMargin: "100px" }
    );
    io.observe(canvas);

    return () => {
      gsap.ticker.remove(draw);
      window.removeEventListener("resize", onResize);
      if (resizeTimer) clearTimeout(resizeTimer);
      io.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ opacity: 1 }}
    />
  );
}
```

- [ ] **Step 2: Verify**

Run `npm run dev`, navigate to the page that uses MorphingGrid (about page). The grid should drift smoothly — visually identical to before. Resize the window — grid should reinit after a 150ms debounce. Scroll away — no draw calls in Performance tab.

- [ ] **Step 3: Commit**

```bash
git add src/components/effects/MorphingGrid.tsx
git commit -m "perf: replace 400 GSAP tweens with single ticker loop + IO pause in MorphingGrid"
```

---

### Task 4: Add IO-driven start/stop to DepthGallery engine

**Files:**
- Modify: `src/components/DepthGallery/engine.ts:104-127`
- Modify: `src/components/DepthGallery/DepthGallery.tsx:31-46`

The engine's rAF loop runs at 60fps even when the gallery section is scrolled off-screen. Expose `start()`/`stop()` methods and let the React component control them via IntersectionObserver.

- [ ] **Step 1: Make `start()` public and add a `stop()` method in engine.ts**

In `engine.ts`, change the `start()` method from `private` to `public` (line 104), and add a `stop()` method after it:

```ts
  start() {
    if (this.isRunning) return
    this.isRunning = true
    this.update()
  }

  stop() {
    this.isRunning = false
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }
```

- [ ] **Step 2: Also debounce the resize handler**

Replace the `onResize` handler (lines 90-92) with a debounced version:

```ts
  private resizeTimer: ReturnType<typeof setTimeout> | null = null

  private onResize = () => {
    if (this.resizeTimer) clearTimeout(this.resizeTimer)
    this.resizeTimer = setTimeout(() => this.resize(), 150)
  }
```

And in `dispose()`, add cleanup for the timer (after `window.removeEventListener`):

```ts
    if (this.resizeTimer) clearTimeout(this.resizeTimer)
```

- [ ] **Step 3: Wire IntersectionObserver in DepthGallery.tsx**

In `DepthGallery.tsx`, add an IO inside the existing `useEffect` (after `engineRef.current = engine` on line 39), before the return cleanup:

```tsx
    const engine = new Engine(canvas, section, projects, onActivePlaneChange, reducedMotion)
    engineRef.current = engine

    // Pause rendering when gallery is off-screen
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) engine.start()
        else engine.stop()
      },
      { rootMargin: "200px" }
    )
    io.observe(section)

    return () => {
      engine.dispose()
      engineRef.current = null
      io.disconnect()
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current)
    }
```

- [ ] **Step 4: Verify**

Run `npm run dev`, navigate to the page with DepthGallery. Scroll through it — rendering should work normally. Scroll away — engine stops. Scroll back — engine resumes. Check Performance tab.

- [ ] **Step 5: Commit**

```bash
git add src/components/DepthGallery/engine.ts src/components/DepthGallery/DepthGallery.tsx
git commit -m "perf: pause DepthGallery engine when off-screen + debounce resize"
```

---

### Task 5: Cache layout reads in DepthGallery Scroll

**Files:**
- Modify: `src/components/DepthGallery/scroll.ts:65-84`

`readScrollProgress()` calls `getBoundingClientRect()` and reads `offsetHeight` every frame. Cache these values and update only when the section is bound or on resize events.

- [ ] **Step 1: Add cached rect fields to the Scroll class**

After the existing `private section` field (line 27), add:

```ts
  private sectionTop = 0
  private sectionHeight = 0
  private viewportHeight = 0
```

- [ ] **Step 2: Add a `cacheLayout()` method**

After the `bindEvents` method (line 67), add:

```ts
  /** Cache expensive layout reads — call on bind and on resize */
  cacheLayout() {
    if (!this.section) return
    const rect = this.section.getBoundingClientRect()
    this.sectionTop = rect.top + window.scrollY
    this.sectionHeight = this.section.offsetHeight
    this.viewportHeight = window.innerHeight
  }
```

- [ ] **Step 3: Call `cacheLayout()` from `bindEvents`**

Update `bindEvents` to also cache:

```ts
  bindEvents(section: HTMLElement) {
    this.section = section
    this.cacheLayout()
  }
```

- [ ] **Step 4: Replace `readScrollProgress()` to use cached values**

Replace the existing `readScrollProgress()` method (lines 70-84) with:

```ts
  /** Read native scroll position and convert to 0..1 progress using cached layout */
  private readScrollProgress(): number {
    if (!this.section) return 0

    const scrolled = window.scrollY - this.sectionTop
    const scrollableDistance = this.sectionHeight - this.viewportHeight

    if (scrollableDistance <= 0) return 0
    return THREE.MathUtils.clamp(scrolled / scrollableDistance, 0, 1)
  }
```

- [ ] **Step 5: Expose `cacheLayout` so the Engine can call it on resize**

In `engine.ts`, call `this.scroll.cacheLayout()` inside the `resize()` method (after `this.camera.updateProjectionMatrix()`):

```ts
  private resize() {
    const width = this.canvas.clientWidth || window.innerWidth || 1
    const height = this.canvas.clientHeight || window.innerHeight || 1
    if (width <= 0 || height <= 0) return

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
    this.scroll.cacheLayout()
  }
```

- [ ] **Step 6: Verify**

Run `npm run dev`, scroll through the DepthGallery. Camera movement should be identical — smooth scroll-driven progress with snapping. Resize window — layout cache updates correctly.

- [ ] **Step 7: Commit**

```bash
git add src/components/DepthGallery/scroll.ts src/components/DepthGallery/engine.ts
git commit -m "perf: cache layout reads in DepthGallery Scroll, update on resize only"
```

---

### Task 6: Guard video texture useFrame on hidden 3D models

**Files:**
- Modify: `src/components/3d/DeviceScene.tsx:58-68`
- Modify: `src/components/3d/PhoneModel.tsx:21-26, 102-107`
- Modify: `src/components/3d/LaptopModel.tsx:21-26, 93-98`

Both PhoneModel and LaptopModel run `texture.needsUpdate = true` + `state.invalidate()` every frame for video textures, even when their group is hidden (`visible = false`). Pass a `visible` prop and guard the useFrame callback.

- [ ] **Step 1: Add `visible` prop to PhoneModel**

Update the interface and destructuring in `PhoneModel.tsx`:

```tsx
interface PhoneModelProps {
  screenTexture: string;
  rotationY: number;
  tiltX: number;
  tiltY: number;
  visible?: boolean;
}

export function PhoneModel({
  screenTexture,
  rotationY,
  tiltX,
  tiltY,
  visible = true,
}: PhoneModelProps) {
```

- [ ] **Step 2: Guard the useFrame in PhoneModel**

Replace the existing useFrame block (lines 102-107) with:

```tsx
  // Keep video texture updating every frame — but only when visible
  useFrame((state) => {
    if (visible && videoRef.current && texture) {
      texture.needsUpdate = true;
      state.invalidate();
    }
  });
```

- [ ] **Step 3: Add `visible` prop to LaptopModel**

Same change in `LaptopModel.tsx` — update the interface and destructuring:

```tsx
interface LaptopModelProps {
  screenTexture: string;
  rotationY: number;
  tiltX: number;
  tiltY: number;
  visible?: boolean;
}

export function LaptopModel({
  screenTexture,
  rotationY,
  tiltX,
  tiltY,
  visible = true,
}: LaptopModelProps) {
```

- [ ] **Step 4: Guard the useFrame in LaptopModel**

Replace the existing useFrame block (lines 93-98) with:

```tsx
  // Keep video texture updating every frame — but only when visible
  useFrame((state) => {
    if (visible && videoRef.current && texture) {
      texture.needsUpdate = true;
      state.invalidate();
    }
  });
```

- [ ] **Step 5: Pass visibility from DeviceScene's AnimatedDevice**

In `DeviceScene.tsx`, update the model JSX inside `AnimatedDevice` (around line 162-174). Pass the `visible` prop based on `deviceType`:

```tsx
  return (
    <group ref={groupRef}>
      <group ref={phoneGroupRef}>
        {phoneTexture && (
          <PhoneModel screenTexture={phoneTexture} rotationY={0} tiltX={0} tiltY={0} visible={deviceType === "phone"} />
        )}
      </group>
      <group ref={laptopGroupRef}>
        {laptopTexture && (
          <LaptopModel screenTexture={laptopTexture} rotationY={0} tiltX={0} tiltY={0} visible={deviceType === "laptop"} />
        )}
      </group>
    </group>
  );
```

- [ ] **Step 6: Verify**

Run `npm run dev`, scroll through ProjectShowcase. Device models should display correctly, video textures play when visible, and the hidden device's useFrame callback no longer runs needsUpdate. Switch between phone/laptop projects — cross-fade should be identical.

- [ ] **Step 7: Commit**

```bash
git add src/components/3d/PhoneModel.tsx src/components/3d/LaptopModel.tsx src/components/3d/DeviceScene.tsx
git commit -m "perf: skip video texture updates on hidden 3D models"
```

---

### Task 7: Shared `useIsMobile` hook

**Files:**
- Create: `src/lib/use-is-mobile.ts`
- Modify: `src/components/effects/SpotlightSection.tsx`
- Modify: `src/components/effects/ConnectedGrid.tsx`
- Modify: `src/components/ui/GitHubHeatmap.tsx`

Seven+ components independently observe `(max-width: 767px)`. Extract a shared hook. Only convert the 3 simplest consumers to keep this task focused — the pattern is established for future cleanup.

- [ ] **Step 1: Create the shared hook**

Create `src/lib/use-is-mobile.ts`:

```ts
"use client";

import { useState, useEffect } from "react";

const QUERY = "(max-width: 767px)";

/**
 * Shared mobile breakpoint hook — avoids duplicate MediaQueryList listeners.
 * Returns `false` during SSR, hydrates to actual value on mount.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    setIsMobile(mq.matches);
    function onChange(e: MediaQueryListEvent) {
      setIsMobile(e.matches);
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
```

- [ ] **Step 2: Convert SpotlightSection to use the hook**

In `SpotlightSection.tsx`, replace the mobile detection state + useEffect (lines 35-56) with:

```tsx
import { useIsMobile } from "@/lib/use-is-mobile";

// Inside the component, replace:
//   const [isMobile, setIsMobile] = useState(false);
//   const isMobileRef = useRef(false);
//   useEffect(() => { ... media query ... }, []);
// With:
  const isMobile = useIsMobile();
  const isMobileRef = useRef(false);
  useEffect(() => { isMobileRef.current = isMobile; }, [isMobile]);
```

Keep `isMobileRef` because the canvas draw loop reads it synchronously — the ref avoids stale closures.

- [ ] **Step 3: Convert ConnectedGrid to use the hook**

In `ConnectedGrid.tsx`, replace the mobile detection state + useEffect (lines 30-44) with:

```tsx
import { useIsMobile } from "@/lib/use-is-mobile";

// Inside the component, replace:
//   const [isMobile, setIsMobile] = useState(...)
//   useEffect(() => { ... media query ... }, []);
// With:
  const isMobile = useIsMobile();
```

- [ ] **Step 4: Convert GitHubHeatmap to use the hook**

In `GitHubHeatmap.tsx`, replace the mobile detection state + useEffect (lines 128-139) with:

```tsx
import { useIsMobile } from "@/lib/use-is-mobile";

// Inside the component, replace:
//   const [isMobile, setIsMobile] = useState<boolean>(...)
//   useEffect(() => { ... media query ... }, []);
// With:
  const isMobile = useIsMobile();
```

- [ ] **Step 5: Verify**

Run `npm run dev`, test all three components at desktop and mobile widths. Resize the browser — all three should still react to the breakpoint. No visual changes.

- [ ] **Step 6: Commit**

```bash
git add src/lib/use-is-mobile.ts src/components/effects/SpotlightSection.tsx src/components/effects/ConnectedGrid.tsx src/components/ui/GitHubHeatmap.tsx
git commit -m "refactor: extract shared useIsMobile hook, convert 3 consumers"
```
