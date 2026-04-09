# Spotlight Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a cinematic "spotlight" section between the ticker and project showcase on the home page, featuring Daily Roman with a canvas iris animation and staggered content reveal.

**Architecture:** A single new component `SpotlightSection` owns a GSAP-driven canvas (for the spotlight iris + wobble) and Framer Motion elements (for staggered content reveal). The existing `SplitFlapText` needs a small `isActive` prop addition. The section is inserted into `page.tsx` between the ticker and `ProjectShowcase`.

**Tech Stack:** GSAP (canvas animation via `gsap.ticker`), Framer Motion (content entrance), Canvas 2D API (`destination-out` compositing)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/effects/SplitFlapText.tsx` | Modify | Add `isActive` boolean prop for JS-driven trigger |
| `src/components/effects/SpotlightSection.tsx` | Create | Canvas spotlight + content layout + entrance animations |
| `src/components/effects/index.ts` | Modify | Add barrel export for `SpotlightSection` |
| `src/app/page.tsx` | Modify | Insert `<SpotlightSection />` between ticker and projects |

---

### Task 1: Add `isActive` prop to `SplitFlapText`

**Files:**
- Modify: `src/components/effects/SplitFlapText.tsx`

The current `SplitFlapText` only triggers on CSS `group-hover/flap`. We need a JS-driven trigger for the spotlight entrance.

- [ ] **Step 1: Add `isActive` prop to the interface and apply it**

In `src/components/effects/SplitFlapText.tsx`, add an `isActive` boolean prop. When `true`, apply the `-translate-y-1/2` transform directly via inline style, bypassing the CSS hover trigger. When `false` or undefined, keep existing hover behavior.

```tsx
"use client";

interface SplitFlapTextProps {
  children: string;
  className?: string;
  staggerMs?: number;
  /** When true, omits the group/flap wrapper — expects an ancestor with `group/flap` */
  externalTrigger?: boolean;
  /** When true, applies the flip transform directly (bypasses CSS hover trigger) */
  isActive?: boolean;
}

export function SplitFlapText({
  children,
  className = "",
  staggerMs = 30,
  externalTrigger = false,
  isActive,
}: SplitFlapTextProps) {
  const chars = children.split("");

  return (
    <span className={`${externalTrigger ? "" : "group/flap "}inline-flex ${className}`} aria-label={children}>
      {chars.map((char, i) => (
        <span
          key={`${char}-${i}`}
          className="inline-block overflow-hidden leading-[1.3]"
          style={{ height: "1.3em" }}
          aria-hidden="true"
        >
          <span
            className={`block transition-transform ${isActive === undefined ? "group-hover/flap:-translate-y-1/2" : ""}`}
            style={{
              transitionDuration: "var(--duration-transition)",
              transitionTimingFunction: "var(--ease-out)",
              transitionDelay: `${i * staggerMs}ms`,
              ...(isActive !== undefined ? { transform: isActive ? "translateY(-50%)" : "translateY(0)" } : {}),
            }}
          >
            <span className="block">{char === " " ? "\u00A0" : char}</span>
            <span className="block">{char === " " ? "\u00A0" : char}</span>
          </span>
        </span>
      ))}
    </span>
  );
}
```

- [ ] **Step 2: Verify existing hover behavior still works**

Run: `npm run dev`

Open the site in a browser, navigate to any page that uses `SplitFlapText` with hover, and verify the hover flip still works. The change is backwards-compatible — `isActive` defaults to `undefined`, which preserves the CSS hover path.

- [ ] **Step 3: Commit**

```bash
git add src/components/effects/SplitFlapText.tsx
git commit -m "feat: add isActive prop to SplitFlapText for JS-driven trigger"
```

---

### Task 2: Create `SpotlightSection` component — canvas spotlight

**Files:**
- Create: `src/components/effects/SpotlightSection.tsx`

Build the canvas layer first — iris animation and human-held wobble — with placeholder content to verify the effect.

- [ ] **Step 1: Create the component with canvas spotlight**

Create `src/components/effects/SpotlightSection.tsx`:

```tsx
"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { gsap } from "@/lib/gsap";
import { DURATION, EASE_OUT_MOTION } from "@/lib/motion";
import { SplitFlapText } from "@/components/effects/SplitFlapText";
import { Button } from "@/components/ui";
import Image from "next/image";
import { projects } from "@/data/projects";

// ─── Constants ────────────────────────────────────────

/** Desktop spotlight radius as fraction of viewport width */
const IRIS_RADIUS_VW_DESKTOP = 0.4;
/** Mobile spotlight radius as fraction of viewport width */
const IRIS_RADIUS_VW_MOBILE = 0.45;
/** Iris open duration in seconds */
const IRIS_DURATION = 1.2;

/** Wobble frequencies (Hz) — intentionally incommensurate so pattern never repeats */
const WOBBLE_FREQ_X = 0.3;
const WOBBLE_FREQ_Y = 0.17;
/** Wobble amplitude in px */
const WOBBLE_AMP_DESKTOP = 10;
const WOBBLE_AMP_MOBILE = 5;

// ─── Component ────────────────────────────────────────

export function SpotlightSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const irisProgress = useRef({ value: 0 });
  const startTime = useRef(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const prefersReduced = useReducedMotion();

  // Daily Roman data
  const dailyRoman = projects.find((p) => p.slug === "daily-roman")!;
  const appStoreUrl = dailyRoman.links.find((l) => l.label === "App Store")?.url ?? "#";

  // Detect mobile
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    function onChange(e: MediaQueryListEvent) {
      setIsMobile(e.matches);
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Canvas setup + animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = canvas!.offsetWidth * dpr;
      canvas!.height = canvas!.offsetHeight * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      const progress = irisProgress.current.value;
      const mobile = window.matchMedia("(max-width: 767px)").matches;
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

    resize();
    gsap.ticker.add(draw);
    window.addEventListener("resize", resize);

    return () => {
      gsap.ticker.remove(draw);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Trigger iris animation when in view
  useEffect(() => {
    if (!isInView) return;
    if (prefersReduced) {
      irisProgress.current.value = 1;
      setIsRevealed(true);
      return;
    }

    startTime.current = Date.now();
    gsap.to(irisProgress.current, {
      value: 1,
      duration: IRIS_DURATION,
      ease: "power2.out",
      onStart: () => setIsRevealed(true),
    });
  }, [isInView, prefersReduced]);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-black md:h-dvh"
      style={{ padding: isMobile ? "var(--space-4xl) var(--space-md)" : undefined }}
    >
      {/* Canvas overlay */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ zIndex: 1 }}
      />

      {/* Content */}
      <div className="relative flex flex-col items-center text-center" style={{ zIndex: 2 }}>
        {/* App icon */}
        <motion.div
          initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
          animate={isRevealed ? { opacity: 1, y: 0 } : undefined}
          transition={{
            duration: prefersReduced ? 0 : DURATION.transition,
            ease: EASE_OUT_MOTION,
            delay: 0,
          }}
          className="mb-[var(--space-lg)]"
        >
          <Image
            src="/projects/daily-roman/appicon.png"
            alt="Daily Roman app icon"
            width={96}
            height={96}
            className="md:h-[96px] md:w-[96px] h-[80px] w-[80px]"
            style={{ borderRadius: "22%" }}
          />
        </motion.div>

        {/* App name — SplitFlapText */}
        <motion.div
          initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
          animate={isRevealed ? { opacity: 1, y: 0 } : undefined}
          transition={{
            duration: prefersReduced ? 0 : DURATION.transition,
            ease: EASE_OUT_MOTION,
            delay: prefersReduced ? 0 : 0.1,
          }}
          className="mb-[var(--space-sm)]"
        >
          <SplitFlapText
            isActive={isRevealed}
            staggerMs={40}
            className="font-sans text-[clamp(40px,6vw,72px)] leading-[1.1] tracking-[-0.02em] text-[var(--text-display)]"
          >
            Daily Roman
          </SplitFlapText>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
          animate={isRevealed ? { opacity: 1, y: 0 } : undefined}
          transition={{
            duration: prefersReduced ? 0 : DURATION.transition,
            ease: EASE_OUT_MOTION,
            delay: prefersReduced ? 0 : 0.3,
          }}
          className="mb-[var(--space-xl)] max-w-[280px] font-mono text-[13px] uppercase leading-[1.5] tracking-[0.06em] text-[var(--text-secondary)]"
        >
          The Duolingo for Ancient Rome
        </motion.p>

        {/* App Store button */}
        <motion.div
          initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
          animate={isRevealed ? { opacity: 1, y: 0 } : undefined}
          transition={{
            duration: prefersReduced ? 0 : DURATION.transition,
            ease: EASE_OUT_MOTION,
            delay: prefersReduced ? 0 : 0.5,
          }}
        >
          <a href={appStoreUrl} target="_blank" rel="noopener noreferrer">
            <Button>Download on the App Store</Button>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify canvas renders correctly**

Run: `npm run dev`

Open the site. The component isn't mounted yet, but you can temporarily import it in `page.tsx` to verify the canvas spotlight renders. You should see a black section with a radial spotlight hole that irises open on scroll-enter, with a subtle wobble drift.

- [ ] **Step 3: Commit**

```bash
git add src/components/effects/SpotlightSection.tsx
git commit -m "feat: create SpotlightSection with canvas iris spotlight and content"
```

---

### Task 3: Wire up exports and mount in page

**Files:**
- Modify: `src/components/effects/index.ts`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add barrel export**

In `src/components/effects/index.ts`, add this line after the existing exports:

```ts
export { SpotlightSection } from "./SpotlightSection";
```

- [ ] **Step 2: Mount in page.tsx**

In `src/app/page.tsx`, add the import and insert the component between the ticker section and `ProjectShowcase`.

The import line becomes:

```tsx
import {
  ScrollGridAnimation,
  MagneticWrapper,
  ProjectShowcase,
  TerminalHero,
  SpotlightSection,
} from "@/components/effects";
```

Insert `<SpotlightSection />` between the closing `</section>` of the ticker (line 67) and the `<ProjectShowcase>` (line 70):

```tsx
      {/* Spotlight — Daily Roman showcase */}
      <SpotlightSection />

      {/* Projects — full bleed */}
      <ProjectShowcase id="projects" projects={projects} className="mb-[var(--space-4xl)]" />
```

- [ ] **Step 3: Verify full integration**

Run: `npm run dev`

Scroll the home page. After the ticker, you should see:
1. A black section fills the viewport
2. As it scrolls into view, the spotlight irises open from a pinpoint to a soft radial pool of light
3. The spotlight has a subtle human-held wobble (different x/y frequencies)
4. Content staggers in: icon fades up → "Daily Roman" split-flaps → tagline fades up → App Store button fades up
5. The App Store button links to the correct URL and opens in a new tab
6. On mobile (< 768px): section has auto height with padding, smaller icon (80px), reduced wobble

- [ ] **Step 4: Commit**

```bash
git add src/components/effects/index.ts src/app/page.tsx
git commit -m "feat: mount SpotlightSection between ticker and project showcase"
```

---

### Task 4: Reduced motion and polish

**Files:**
- Modify: `src/components/effects/SpotlightSection.tsx`

- [ ] **Step 1: Test reduced motion behavior**

In macOS System Settings → Accessibility → Display, enable "Reduce motion" (or use browser DevTools to emulate `prefers-reduced-motion: reduce`).

Verify:
- Canvas shows static full-brightness spotlight (no iris animation, no wobble)
- All content renders immediately at full opacity with no delays
- `SplitFlapText` shows both halves without animation

- [ ] **Step 2: Visual polish pass**

Check in the browser and tune as needed:
- Verify the gradient falloff looks soft, not hard-edged (the `0.7` color stop in the gradient controls the falloff curve — adjust if the edge is too sharp or too diffuse)
- Verify wobble feels human — not too fast, not too slow, not too wide
- Verify stagger timing feels natural — content should start appearing as the iris is still opening, not after
- Test on a narrow viewport (375px) to confirm mobile layout wraps correctly

- [ ] **Step 3: Commit any polish adjustments**

```bash
git add src/components/effects/SpotlightSection.tsx
git commit -m "fix: polish spotlight falloff and timing"
```
