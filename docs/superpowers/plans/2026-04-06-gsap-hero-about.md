# GSAP Oscilloscope Hero & Spec Sheet About Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hero section with a scroll-pinned oscilloscope waveform-to-text animation, and redesign the about page as a technical spec sheet with dimension lines and skill bar meters.

**Architecture:** Canvas-based point sampling renders "MAZZA BUILDS" text to extract outline points, then GSAP ScrollTrigger scrubs between animation states (flat line -> sine wave -> text outline -> solid text). The about page uses GSAP ScrollTrigger with scrub for dimension lines, skill bars, and connection lines — all SVG-based. Both pages share the technical/instrument visual language.

**Tech Stack:** GSAP 3.14 (ScrollTrigger, ScrambleTextPlugin), Canvas 2D API, SVG, React, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-06-gsap-hero-about-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/lib/text-sampler.ts` | Offscreen canvas text-to-points extraction utility |
| `src/components/effects/OscilloscopeHero.tsx` | Scroll-pinned hero with canvas waveform animation |
| `src/components/effects/SpecBlock.tsx` | Dimension-line-wrapped content block with measurement annotations |
| `src/components/effects/SkillBar.tsx` | Individual horizontal skill bar meter |
| `src/components/effects/ConnectionLine.tsx` | Node + line + label row for social links |
| `src/components/effects/DimensionOverlay.tsx` | Full-page SVG dimension line system |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/gsap.ts` | Register ScrollTrigger and ScrambleTextPlugin |
| `src/components/effects/index.ts` | Add new exports |
| `src/app/page.tsx` | Replace SplitTextScatter hero with OscilloscopeHero |
| `src/app/about/page.tsx` | Replace current layout with spec sheet components |

---

## Task 1: Register GSAP Plugins

**Files:**
- Modify: `src/lib/gsap.ts`

- [ ] **Step 1: Update gsap.ts to register ScrollTrigger and ScrambleTextPlugin**

```ts
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin);
}

export { gsap, ScrollTrigger };

/** Closer to the Codrops demo custom curve — dramatic in-out */
export const TRANSITION_EASE = "power2.inOut";

/** Enter choreography ease */
export const ENTER_EASE = "power3.out";

/** Transition duration — matches Codrops demo */
export const TRANSITION_DURATION = 0.7;
```

- [ ] **Step 2: Verify the app still compiles**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds (or at least no errors related to gsap imports)

- [ ] **Step 3: Commit**

```bash
git add src/lib/gsap.ts
git commit -m "feat: register ScrollTrigger and ScrambleTextPlugin with GSAP"
```

---

## Task 2: Text Point Sampler Utility

**Files:**
- Create: `src/lib/text-sampler.ts`

This utility renders text to an offscreen canvas, then scans the pixels to extract outline points. These points are used as the target shape for the oscilloscope animation.

- [ ] **Step 1: Create the text-sampler module**

```ts
export interface Point {
  x: number;
  y: number;
}

/**
 * Render text to an offscreen canvas, then sample points along the
 * filled pixel edges. Returns a fixed-length array of {x, y} points
 * normalized to 0..1 range (caller maps to viewport).
 */
export function sampleTextPoints(
  text: string,
  fontFamily: string,
  targetCount: number
): Point[] {
  const fontSize = 200;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // Measure text dimensions
  ctx.font = `700 ${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const textHeight = fontSize; // approximate

  // Size canvas to fit text with padding
  const padding = 20;
  canvas.width = Math.ceil(textWidth + padding * 2);
  canvas.height = Math.ceil(textHeight + padding * 2);

  // Re-set font after canvas resize (resets context)
  ctx.font = `700 ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "top";
  ctx.fillText(text, padding, padding);

  // Extract pixel data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;

  // Collect all filled pixels (alpha > 128)
  const filledPixels: Point[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 128) {
        // Check if this pixel is on an edge (has a transparent neighbor)
        const isEdge =
          x === 0 ||
          x === width - 1 ||
          y === 0 ||
          y === height - 1 ||
          data[(y * width + (x - 1)) * 4 + 3] <= 128 ||
          data[(y * width + (x + 1)) * 4 + 3] <= 128 ||
          data[((y - 1) * width + x) * 4 + 3] <= 128 ||
          data[((y + 1) * width + x) * 4 + 3] <= 128;

        if (isEdge) {
          filledPixels.push({
            x: x / width,
            y: y / height,
          });
        }
      }
    }
  }

  // Downsample to target count using uniform spacing
  if (filledPixels.length === 0) {
    // Fallback: return evenly spaced points on a horizontal line
    return Array.from({ length: targetCount }, (_, i) => ({
      x: i / (targetCount - 1),
      y: 0.5,
    }));
  }

  // Sort by x then y for consistent ordering (left-to-right scan)
  filledPixels.sort((a, b) => a.x - b.x || a.y - b.y);

  const step = Math.max(1, Math.floor(filledPixels.length / targetCount));
  const sampled: Point[] = [];
  for (let i = 0; i < filledPixels.length && sampled.length < targetCount; i += step) {
    sampled.push(filledPixels[i]);
  }

  // Pad if we got fewer than targetCount
  while (sampled.length < targetCount) {
    sampled.push(sampled[sampled.length - 1]);
  }

  return sampled;
}

/**
 * Generate a flat horizontal line as an array of points.
 * All points share the same y (0.5 = vertical center).
 */
export function flatLinePoints(count: number): Point[] {
  return Array.from({ length: count }, (_, i) => ({
    x: i / (count - 1),
    y: 0.5,
  }));
}

/**
 * Generate a sine wave as an array of points.
 * frequency and amplitude control the wave shape.
 */
export function sineWavePoints(
  count: number,
  frequency: number,
  amplitude: number
): Point[] {
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    return {
      x: t,
      y: 0.5 + Math.sin(t * Math.PI * 2 * frequency) * amplitude,
    };
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit src/lib/text-sampler.ts 2>&1 | head -10`
Expected: No errors (or only unrelated ones from other files)

- [ ] **Step 3: Commit**

```bash
git add src/lib/text-sampler.ts
git commit -m "feat: add text-sampler utility for canvas point extraction"
```

---

## Task 3: Oscilloscope Hero Component

**Files:**
- Create: `src/components/effects/OscilloscopeHero.tsx`
- Modify: `src/components/effects/index.ts`

This is the main hero component. It manages the canvas, the GSAP ScrollTrigger pin, and the four-phase animation sequence.

- [ ] **Step 1: Create the OscilloscopeHero component**

```tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import {
  sampleTextPoints,
  flatLinePoints,
  sineWavePoints,
  type Point,
} from "@/lib/text-sampler";

interface OscilloscopeHeroProps {
  text?: string;
  className?: string;
}

const POINT_COUNT_DESKTOP = 900;
const POINT_COUNT_MOBILE = 400;
const STATUS_LABELS = [
  { at: 0, text: "[SIGNAL IDLE]" },
  { at: 0.15, text: "[SIGNAL DETECTED]" },
  { at: 0.3, text: "[DECODING...]" },
  { at: 0.45, text: "[SIGNAL LOCKED]" },
  { at: 0.75, text: "[MAZZA_BUILDS.INIT()]" },
];

function getStatusLabel(progress: number): string {
  let label = STATUS_LABELS[0].text;
  for (const s of STATUS_LABELS) {
    if (progress >= s.at) label = s.text;
  }
  return label;
}

function lerpColor(
  from: [number, number, number],
  to: [number, number, number],
  t: number
): string {
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);
  return `rgb(${r},${g},${b})`;
}

// --text-disabled: #666 = [102,102,102]
// --text-primary: #E8E8E8 = [232,232,232]
// --text-display: #FFF = [255,255,255]
const COLOR_DISABLED: [number, number, number] = [102, 102, 102];
const COLOR_PRIMARY: [number, number, number] = [232, 232, 232];
const COLOR_DISPLAY: [number, number, number] = [255, 255, 255];

export function OscilloscopeHero({
  text = "MAZZA BUILDS",
  className = "",
}: OscilloscopeHeroProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const pointsRef = useRef<Point[]>([]);
  const statesRef = useRef<{
    flat: Point[];
    wave: Point[];
    text: Point[];
  } | null>(null);
  const animFrameRef = useRef<number>(0);
  const [ready, setReady] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);

  // Check reduced motion
  useEffect(() => {
    setPrefersReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const pointCount = isMobile ? POINT_COUNT_MOBILE : POINT_COUNT_DESKTOP;

  // Initialize points and states after font loads
  useEffect(() => {
    if (prefersReduced) return;

    async function init() {
      await document.fonts.ready;

      const flat = flatLinePoints(pointCount);
      const wave = sineWavePoints(pointCount, 8, 0.15);
      const textPts = sampleTextPoints(text, "Space Grotesk", pointCount);

      statesRef.current = { flat, wave, text: textPts };
      // Start at flat line
      pointsRef.current = flat.map((p) => ({ ...p }));
      setReady(true);
    }

    init();
  }, [text, pointCount, prefersReduced]);

  // Canvas draw loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const progress = progressRef.current;
    const points = pointsRef.current;

    ctx.clearRect(0, 0, w, h);

    // Determine line color based on progress
    let color: string;
    if (progress < 0.15) {
      color = lerpColor(COLOR_DISABLED, COLOR_DISABLED, 0);
    } else if (progress < 0.45) {
      const t = (progress - 0.15) / 0.3;
      color = lerpColor(COLOR_DISABLED, COLOR_PRIMARY, t);
    } else if (progress < 0.75) {
      const t = (progress - 0.45) / 0.3;
      color = lerpColor(COLOR_PRIMARY, COLOR_DISPLAY, t);
    } else {
      color = lerpColor(COLOR_DISPLAY, COLOR_DISPLAY, 0);
    }

    // Draw polyline
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();

    // Map normalized points to canvas coordinates
    // For text state, center the text in the canvas
    const margin = w * 0.05;
    const drawW = w - margin * 2;
    const drawH = h * 0.6;
    const offsetY = h * 0.2;

    for (let i = 0; i < points.length; i++) {
      const px = margin + points[i].x * drawW;
      const py = offsetY + points[i].y * drawH;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Phase 4: brightness pulse sweep (75%-85%)
    if (progress >= 0.75 && progress < 0.85) {
      const sweepT = (progress - 0.75) / 0.1; // 0..1
      const sweepX = margin + sweepT * drawW;
      const bandWidth = 40;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(255,255,255,0.6)`;
      ctx.lineWidth = 3;
      ctx.beginPath();

      for (let i = 0; i < points.length; i++) {
        const px = margin + points[i].x * drawW;
        const py = offsetY + points[i].y * drawH;
        const dist = Math.abs(px - sweepX);
        if (dist < bandWidth) {
          if (i === 0 || Math.abs(margin + points[i - 1].x * drawW - sweepX) >= bandWidth) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    // Update status label
    if (statusRef.current) {
      statusRef.current.textContent = getStatusLabel(progress);
    }
  }, []);

  // Set up ScrollTrigger and animation
  useEffect(() => {
    if (!ready || prefersReduced) return;
    const section = sectionRef.current;
    if (!section) return;

    const states = statesRef.current!;
    const points = pointsRef.current;

    // Proxy object for GSAP to tween
    const proxy = { progress: 0 };

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: isMobile ? "+=200%" : "+=300%",
      pin: true,
      scrub: 1,
      onUpdate: (self) => {
        proxy.progress = self.progress;
        progressRef.current = self.progress;

        const p = self.progress;

        // Interpolate points between states
        for (let i = 0; i < points.length; i++) {
          if (p < 0.15) {
            // Phase 1: flat line
            points[i].x = states.flat[i].x;
            points[i].y = states.flat[i].y;
          } else if (p < 0.45) {
            // Phase 2: flat -> wave
            const t = (p - 0.15) / 0.3;
            points[i].x = states.flat[i].x + (states.wave[i].x - states.flat[i].x) * t;
            points[i].y = states.flat[i].y + (states.wave[i].y - states.flat[i].y) * t;
          } else if (p < 0.75) {
            // Phase 3: wave -> text
            const t = (p - 0.45) / 0.3;
            points[i].x = states.wave[i].x + (states.text[i].x - states.wave[i].x) * t;
            points[i].y = states.wave[i].y + (states.text[i].y - states.wave[i].y) * t;
          } else {
            // Phase 4: hold at text
            points[i].x = states.text[i].x;
            points[i].y = states.text[i].y;
          }
        }

        // Show/hide h1 and canvas at lock point
        if (h1Ref.current && canvasRef.current && dividerRef.current) {
          if (p >= 0.85) {
            canvasRef.current.style.opacity = "0";
            h1Ref.current.style.opacity = "1";
            dividerRef.current.style.opacity = "1";
          } else {
            canvasRef.current.style.opacity = "1";
            h1Ref.current.style.opacity = "0";
            dividerRef.current.style.opacity = "0";
          }
        }
      },
    });

    // Render loop
    function loop() {
      draw();
      animFrameRef.current = requestAnimationFrame(loop);
    }
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      trigger.kill();
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [ready, prefersReduced, draw, isMobile]);

  // Reduced motion: just show the text
  if (prefersReduced) {
    return (
      <section className={className}>
        <h1 className="font-sans text-[clamp(48px,12vw,96px)] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]">
          {text}
        </h1>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className={`relative h-screen ${className}`}>
      {/* Canvas for waveform animation */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ transition: "opacity 0.15s ease-out" }}
      />

      {/* Real h1 — hidden until lock, always in DOM for a11y */}
      <h1
        ref={h1Ref}
        className="absolute inset-0 flex items-center justify-center font-sans text-[clamp(48px,12vw,96px)] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]"
        style={{ opacity: 0, transition: "opacity 0.15s ease-out" }}
      >
        {text}
      </h1>

      {/* Divider line — appears at lock */}
      <div
        ref={dividerRef}
        className="absolute bottom-[20%] left-[5%] right-[5%] h-px bg-[var(--text-disabled)]"
        style={{ opacity: 0, transition: "opacity 0.15s ease-out" }}
      />

      {/* Status label */}
      <span
        ref={statusRef}
        aria-hidden="true"
        className="absolute bottom-[var(--space-lg)] left-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)] hidden sm:block"
      >
        [SIGNAL IDLE]
      </span>
    </section>
  );
}
```

- [ ] **Step 2: Export from effects barrel**

Add to `src/components/effects/index.ts`:

```ts
export { OscilloscopeHero } from "./OscilloscopeHero";
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -i "OscilloscopeHero\|text-sampler" | head -10`
Expected: No errors related to these files

- [ ] **Step 4: Commit**

```bash
git add src/components/effects/OscilloscopeHero.tsx src/components/effects/index.ts
git commit -m "feat: add OscilloscopeHero scroll-pinned waveform component"
```

---

## Task 4: Integrate OscilloscopeHero into Home Page

**Files:**
- Modify: `src/app/page.tsx`

Replace the SplitTextScatter hero with the OscilloscopeHero. The subtitle, ticker, and intro paragraph remain below — they'll naturally appear after the pin releases.

- [ ] **Step 1: Update page.tsx**

Replace the full file content with:

```tsx
import {
  Button,
  GitHubCard,
  ProjectCard,
  ScrollTextLines,
  TickerText,
  UsageCard,
} from "@/components/ui";
import {
  OscilloscopeHero,
  ScrollLetterAnimation,
  ScrollGridAnimation,
  MagneticWrapper,
  LinkHover,
} from "@/components/effects";
import { projects } from "@/data/projects";

export default function Home() {
  const featured = projects.slice(0, 3);

  return (
    <main>
      {/* Hero — scroll-pinned oscilloscope */}
      <OscilloscopeHero text="MAZZA BUILDS" />

      {/* Content after pin releases */}
      <div className="mx-auto max-w-[960px] px-[var(--space-lg)] py-[var(--space-4xl)]">
        {/* Subtitle */}
        <section className="mb-[var(--space-2xl)]">
          <ScrollLetterAnimation
            as="h2"
            className="font-sans text-[clamp(18px,3vw,24px)] leading-[1.3] tracking-[-0.01em] text-[var(--text-secondary)]"
          >
            Solo indie developer
          </ScrollLetterAnimation>
        </section>

        {/* Ticker */}
        <section className="-mx-[var(--space-lg)] mb-[var(--space-3xl)]">
          <TickerText
            items={["IOS APPS", "SHOPIFY TOOLS", "AI PIPELINES", "VIDEO AUTOMATION", "WEB APPS", "CONTENT SYSTEMS"]}
          />
        </section>

        {/* Intro */}
        <section className="mb-[var(--space-4xl)]">
          <ScrollTextLines className="max-w-[480px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
            I&apos;m Alex Mazza, a solo indie developer who builds things from concept to production. I care about clean interfaces, thoughtful systems, and shipping work that holds up.
          </ScrollTextLines>
        </section>

        {/* Featured Projects */}
        <section className="mb-[var(--space-4xl)]">
          <ScrollLetterAnimation
            as="h2"
            className="mb-[var(--space-2xl)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]"
          >
            FEATURED PROJECTS
          </ScrollLetterAnimation>
          <ScrollGridAnimation className="grid gap-[var(--space-md)]">
            {featured.map((project) => (
              <LinkHover key={project.slug} href={`/projects/${project.slug}`} className="block no-underline">
                <ProjectCard
                  issueNumber={project.issueNumber}
                  name={project.name}
                  description={project.description}
                  tags={project.tags}
                  status={project.status}
                />
              </LinkHover>
            ))}
          </ScrollGridAnimation>
        </section>

        {/* Activity */}
        <section className="mb-[var(--space-4xl)]">
          <ScrollGridAnimation className="grid grid-cols-1 gap-[var(--space-md)] md:grid-cols-2" stagger={0.15}>
            <UsageCard compact />
            <GitHubCard compact />
          </ScrollGridAnimation>
        </section>

        {/* CTA */}
        <section className="flex justify-center">
          <MagneticWrapper>
            <LinkHover href="/contact" className="no-underline">
              <Button>Get in touch</Button>
            </LinkHover>
          </MagneticWrapper>
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Run dev server and verify the hero renders**

Run: `npx next build 2>&1 | tail -10`
Expected: Build succeeds. (Visual verification in browser: hero pins on scroll, waveform animates through phases.)

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: integrate OscilloscopeHero into home page"
```

---

## Task 5: SkillBar Component

**Files:**
- Create: `src/components/effects/SkillBar.tsx`

Individual horizontal bar meter for a single skill. Uses GSAP ScrollTrigger with scrub to fill the bar as the user scrolls.

- [ ] **Step 1: Create the SkillBar component**

```tsx
"use client";

import { useRef, useEffect, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface SkillBarProps {
  name: string;
  /** Fill percentage 0-100 (aesthetic, not meaningful) */
  fill: number;
  /** Delay offset in seconds for staggered entrance */
  delay?: number;
  className?: string;
}

export function SkillBar({
  name,
  fill,
  delay = 0,
  className = "",
}: SkillBarProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const capRef = useRef<HTMLDivElement>(null);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    setPrefersReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (prefersReduced) return;
    const row = rowRef.current;
    const bar = barRef.current;
    const cap = capRef.current;
    if (!row || !bar || !cap) return;

    // Set initial state
    gsap.set(bar, { width: "0%" });
    gsap.set(cap, { opacity: 0 });
    gsap.set(row, { opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: row,
        start: "top 85%",
        end: "top 40%",
        scrub: true,
      },
    });

    tl.to(row, { opacity: 1, duration: 0.1, delay })
      .to(bar, { width: `${fill}%`, duration: 0.8, ease: "power2.out" }, `<+0.05`)
      .to(cap, { opacity: 1, duration: 0.1 }, ">-0.1");

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [fill, delay, prefersReduced]);

  return (
    <div
      ref={rowRef}
      className={`flex items-center gap-[var(--space-lg)] ${className}`}
      style={{ opacity: prefersReduced ? 1 : 0 }}
    >
      {/* Skill name */}
      <span className="w-[120px] shrink-0 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
        {name}
      </span>

      {/* Bar track */}
      <div className="relative h-[6px] flex-1 bg-[var(--border)]">
        {/* Bar fill */}
        <div
          ref={barRef}
          className="absolute inset-y-0 left-0 bg-[var(--text-primary)]"
          style={{ width: prefersReduced ? `${fill}%` : "0%" }}
        />
        {/* End cap */}
        <div
          ref={capRef}
          className="absolute top-[-3px] h-[12px] w-px bg-[var(--text-primary)]"
          style={{
            left: `${fill}%`,
            opacity: prefersReduced ? 1 : 0,
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/effects/SkillBar.tsx
git commit -m "feat: add SkillBar component with scroll-scrubbed fill animation"
```

---

## Task 6: SpecBlock Component

**Files:**
- Create: `src/components/effects/SpecBlock.tsx`

A wrapper that adds dimension lines, tick marks, and measurement annotations around its children. Uses GSAP ScrollTrigger to draw the lines and count up the measurement.

- [ ] **Step 1: Create the SpecBlock component**

```tsx
"use client";

import { useRef, useEffect, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface SpecBlockProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function SpecBlock({
  label,
  children,
  className = "",
}: SpecBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const topTickRef = useRef<SVGLineElement>(null);
  const bottomTickRef = useRef<SVGLineElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    setPrefersReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Measure content height
  useEffect(() => {
    if (!contentRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setHeight(Math.round(entry.contentRect.height));
    });
    ro.observe(contentRef.current);
    return () => ro.disconnect();
  }, []);

  // Animate dimension lines
  useEffect(() => {
    if (prefersReduced || !height) return;
    const container = containerRef.current;
    if (!container) return;

    const line = lineRef.current;
    const topTick = topTickRef.current;
    const bottomTick = bottomTickRef.current;
    const measure = measureRef.current;

    if (!line || !topTick || !bottomTick || !measure) return;

    // Set initial states
    gsap.set(line, { attr: { y2: 0 } });
    gsap.set([topTick, bottomTick], { attr: { x1: 0, x2: 0 } });
    gsap.set(measure, { opacity: 0 });

    const proxy = { val: 0 };

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top 80%",
        end: "top 30%",
        scrub: true,
      },
    });

    // Draw vertical line
    tl.to(line, { attr: { y2: height }, duration: 0.5, ease: "none" })
      // Extend tick marks
      .to([topTick, bottomTick], { attr: { x1: -12, x2: 0 }, duration: 0.2 }, ">-0.2")
      // Count up measurement
      .to(proxy, {
        val: height,
        duration: 0.3,
        snap: { val: 1 },
        onUpdate: () => {
          measure.textContent = `\u2195 ${Math.round(proxy.val)}px`;
        },
      }, ">-0.1")
      // Fade in measurement label
      .to(measure, { opacity: 1, duration: 0.1 }, "<");

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [height, prefersReduced]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Section label */}
      <p className="mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
        {label}
      </p>

      {/* Content with dimension lines */}
      <div className="relative pl-[var(--space-2xl)]">
        {/* SVG dimension lines — desktop only */}
        <svg
          className="absolute left-0 top-0 hidden h-full w-[var(--space-2xl)] overflow-visible md:block"
          style={{ pointerEvents: "none" }}
        >
          {/* Vertical dimension line */}
          <line
            ref={lineRef}
            x1={16}
            y1={0}
            x2={16}
            y2={prefersReduced ? height : 0}
            stroke="var(--border-visible)"
            strokeWidth={1}
          />
          {/* Top tick mark */}
          <line
            ref={topTickRef}
            x1={prefersReduced ? -12 : 0}
            y1={0}
            x2={0}
            y2={0}
            stroke="var(--border-visible)"
            strokeWidth={1}
            transform="translate(16, 0)"
          />
          {/* Bottom tick mark */}
          <line
            ref={bottomTickRef}
            x1={prefersReduced ? -12 : 0}
            y1={0}
            x2={0}
            y2={0}
            stroke="var(--border-visible)"
            strokeWidth={1}
            transform={`translate(16, ${height})`}
          />
        </svg>

        {/* Measurement annotation — desktop only */}
        <span
          ref={measureRef}
          className="absolute left-[-60px] top-1/2 hidden -translate-y-1/2 -rotate-90 font-mono text-[11px] tracking-[0.08em] text-[var(--text-disabled)] md:block"
          style={{ opacity: prefersReduced ? 1 : 0 }}
        >
          {prefersReduced ? `\u2195 ${height}px` : "\u2195 0px"}
        </span>

        {/* Actual content */}
        <div ref={contentRef}>
          {children}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/effects/SpecBlock.tsx
git commit -m "feat: add SpecBlock component with dimension line animations"
```

---

## Task 7: ConnectionLine Component

**Files:**
- Create: `src/components/effects/ConnectionLine.tsx`

A row with an animated node, horizontal line, and label for the social links section.

- [ ] **Step 1: Create the ConnectionLine component**

```tsx
"use client";

import { useRef, useEffect, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface ConnectionLineProps {
  label: string;
  href: string;
  /** Delay offset in seconds for staggered entrance */
  delay?: number;
  className?: string;
}

export function ConnectionLine({
  label,
  href,
  delay = 0,
  className = "",
}: ConnectionLineProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const nodeRef = useRef<SVGCircleElement>(null);
  const labelRef = useRef<HTMLAnchorElement>(null);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    setPrefersReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (prefersReduced) return;
    const row = rowRef.current;
    const line = lineRef.current;
    const node = nodeRef.current;
    const labelEl = labelRef.current;
    if (!row || !line || !node || !labelEl) return;

    gsap.set(line, { attr: { x2: 16 } }); // start collapsed
    gsap.set(node, { attr: { fill: "transparent" } });
    gsap.set(labelEl, { opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: row,
        start: "top 85%",
        end: "top 50%",
        scrub: true,
      },
    });

    tl.to(line, { attr: { x2: 200 }, duration: 0.6, ease: "power2.out", delay })
      .to(labelEl, { opacity: 1, duration: 0.2 }, ">-0.2")
      .to(node, { attr: { fill: "var(--text-primary)" }, duration: 0.2 }, ">-0.1");

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [delay, prefersReduced]);

  return (
    <div ref={rowRef} className={`flex items-center gap-[var(--space-md)] ${className}`}>
      <svg width="220" height="20" className="shrink-0" style={{ overflow: "visible" }}>
        {/* Node circle */}
        <circle
          ref={nodeRef}
          cx={8}
          cy={10}
          r={4}
          stroke="var(--border-visible)"
          strokeWidth={1}
          fill={prefersReduced ? "var(--text-primary)" : "transparent"}
        />
        {/* Horizontal line */}
        <line
          ref={lineRef}
          x1={16}
          y1={10}
          x2={prefersReduced ? 200 : 16}
          y2={10}
          stroke="var(--border-visible)"
          strokeWidth={1}
        />
      </svg>

      <a
        ref={labelRef}
        href={href}
        target={href.startsWith("mailto:") ? undefined : "_blank"}
        rel={href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
        className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        style={{
          opacity: prefersReduced ? 1 : 0,
          transitionDuration: "var(--duration-micro)",
        }}
      >
        {label}
      </a>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/effects/ConnectionLine.tsx
git commit -m "feat: add ConnectionLine component with draw animation"
```

---

## Task 8: DimensionOverlay Component

**Files:**
- Create: `src/components/effects/DimensionOverlay.tsx`

A full-page SVG overlay that draws vertical dimension lines along the left margin with tick marks at section boundaries. Desktop only.

- [ ] **Step 1: Create the DimensionOverlay component**

```tsx
"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface SectionMark {
  y: number;
  height: number;
}

interface DimensionOverlayProps {
  /** Refs or query selector for the sections to mark */
  sectionSelector?: string;
  className?: string;
}

export function DimensionOverlay({
  sectionSelector = "[data-spec-section]",
  className = "",
}: DimensionOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [marks, setMarks] = useState<SectionMark[]>([]);
  const [totalHeight, setTotalHeight] = useState(0);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    setPrefersReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const computeMarks = useCallback(() => {
    const sections = document.querySelectorAll<HTMLElement>(sectionSelector);
    const parent = svgRef.current?.parentElement;
    if (!parent || sections.length === 0) return;

    const parentRect = parent.getBoundingClientRect();
    const newMarks: SectionMark[] = [];

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      newMarks.push({
        y: rect.top - parentRect.top,
        height: rect.height,
      });
    });

    setMarks(newMarks);
    setTotalHeight(parent.scrollHeight);
  }, [sectionSelector]);

  useEffect(() => {
    // Wait for layout to settle
    const timer = setTimeout(computeMarks, 100);
    const ro = new ResizeObserver(computeMarks);
    if (svgRef.current?.parentElement) {
      ro.observe(svgRef.current.parentElement);
    }
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [computeMarks]);

  // Animate the vertical line drawing
  useEffect(() => {
    if (prefersReduced || !totalHeight || !svgRef.current) return;

    const mainLine = svgRef.current.querySelector<SVGLineElement>("[data-main-line]");
    if (!mainLine) return;

    gsap.set(mainLine, { attr: { y2: 0 } });

    ScrollTrigger.create({
      trigger: svgRef.current.parentElement,
      start: "top 80%",
      end: "bottom 20%",
      scrub: true,
      onUpdate: (self) => {
        gsap.set(mainLine, { attr: { y2: totalHeight * self.progress } });
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => {
        if (t.trigger === svgRef.current?.parentElement) t.kill();
      });
    };
  }, [totalHeight, prefersReduced]);

  return (
    <svg
      ref={svgRef}
      className={`pointer-events-none absolute left-[16px] top-0 hidden h-full w-[32px] md:block ${className}`}
      style={{ overflow: "visible" }}
    >
      {/* Main vertical line */}
      <line
        data-main-line
        x1={16}
        y1={0}
        x2={16}
        y2={prefersReduced ? totalHeight : 0}
        stroke="var(--border-visible)"
        strokeWidth={1}
      />

      {/* Tick marks and annotations at each section */}
      {marks.map((mark, i) => (
        <g key={i}>
          {/* Top tick */}
          <line
            x1={8}
            y1={mark.y}
            x2={24}
            y2={mark.y}
            stroke="var(--border-visible)"
            strokeWidth={1}
          />
          {/* Height annotation */}
          {i < marks.length - 1 && (
            <text
              x={28}
              y={mark.y + mark.height / 2}
              fill="var(--text-disabled)"
              fontSize={9}
              fontFamily="var(--font-space-mono), monospace"
              dominantBaseline="middle"
            >
              {Math.round(mark.height)}px
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/effects/DimensionOverlay.tsx
git commit -m "feat: add DimensionOverlay full-page SVG dimension lines"
```

---

## Task 9: Update Effects Barrel + Integrate About Page

**Files:**
- Modify: `src/components/effects/index.ts`
- Modify: `src/app/about/page.tsx`

Wire everything together. Add all new exports and rewrite the about page.

- [ ] **Step 1: Update effects barrel export**

Add the following exports to `src/components/effects/index.ts`:

```ts
export { SkillBar } from "./SkillBar";
export { SpecBlock } from "./SpecBlock";
export { ConnectionLine } from "./ConnectionLine";
export { DimensionOverlay } from "./DimensionOverlay";
```

- [ ] **Step 2: Rewrite about/page.tsx**

Replace the full content of `src/app/about/page.tsx` with:

```tsx
import { ScrollTextLines } from "@/components/ui";
import {
  ScrollLetterAnimation,
  SpecBlock,
  SkillBar,
  ConnectionLine,
  DimensionOverlay,
} from "@/components/effects";

const skillGroups = [
  {
    label: "LANGUAGES",
    skills: [
      { name: "Swift", fill: 85 },
      { name: "TypeScript", fill: 90 },
      { name: "Python", fill: 72 },
      { name: "SQL", fill: 65 },
    ],
  },
  {
    label: "FRAMEWORKS",
    skills: [
      { name: "Next.js", fill: 88 },
      { name: "SwiftUI", fill: 82 },
      { name: "React", fill: 85 },
      { name: "Tailwind CSS", fill: 90 },
    ],
  },
  {
    label: "TOOLS & APIS",
    skills: [
      { name: "Claude API", fill: 78 },
      { name: "Shopify API", fill: 75 },
      { name: "HeyGen", fill: 60 },
      { name: "ElevenLabs", fill: 62 },
      { name: "Prisma", fill: 70 },
    ],
  },
];

const connections = [
  { label: "GitHub", href: "https://github.com/alexandermazza" },
  { label: "Twitter", href: "https://twitter.com/maboroshi_alex" },
  { label: "Email", href: "mailto:hello@mazzabuilds.com" },
];

export default function AboutPage() {
  let barIndex = 0;

  return (
    <main className="relative mx-auto max-w-[960px] px-[var(--space-lg)] py-[var(--space-4xl)]">
      {/* Full-page dimension overlay */}
      <DimensionOverlay />

      {/* Heading */}
      <section data-spec-section className="mb-[var(--space-lg)]">
        <ScrollLetterAnimation
          as="h1"
          className="font-sans text-[clamp(36px,8vw,72px)] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]"
        >
          ABOUT
        </ScrollLetterAnimation>
      </section>

      {/* Header rule with revision */}
      <section className="mb-[var(--space-3xl)] flex items-center gap-[var(--space-md)]">
        <div className="h-px flex-1 bg-[var(--border-visible)]" />
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          REV 01 - 2026
        </span>
      </section>

      {/* Bio / Identity Spec */}
      <section data-spec-section className="mb-[var(--space-4xl)]">
        <SpecBlock label="SPEC: IDENTITY">
          <ScrollTextLines className="max-w-[640px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
            I&apos;m Alex Mazza, a solo indie developer based out of the Midwest. I build things from concept to production — iOS apps, Shopify tools, AI-powered automation systems, and the web experiences that tie them together.
          </ScrollTextLines>
          <div className="mt-[var(--space-2xl)]">
            <ScrollTextLines className="max-w-[640px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
              I care about clean interfaces, thoughtful systems, and shipping work that holds up. Every project here was designed, built, and shipped by me — no agencies, no templates.
            </ScrollTextLines>
          </div>
        </SpecBlock>
      </section>

      {/* Capabilities Spec */}
      <section data-spec-section className="mb-[var(--space-4xl)]">
        <p className="mb-[var(--space-2xl)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          SPEC: CAPABILITIES
        </p>
        <div className="grid gap-[var(--space-2xl)]">
          {skillGroups.map((group) => (
            <div key={group.label}>
              {/* Group header with extending line */}
              <div className="mb-[var(--space-md)] flex items-center gap-[var(--space-md)]">
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                  {group.label}
                </span>
                <div className="h-px flex-1 bg-[var(--border)]" />
              </div>
              {/* Skill bars */}
              <div className="grid gap-[var(--space-md)]">
                {group.skills.map((skill) => {
                  const index = barIndex++;
                  return (
                    <SkillBar
                      key={skill.name}
                      name={skill.name}
                      fill={skill.fill}
                      delay={index * 0.05}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Connections Spec */}
      <section data-spec-section className="mb-[var(--space-4xl)]">
        <div className="mb-[var(--space-2xl)] flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
            SPEC: CONNECTIONS
          </p>
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
            {connections.length} ENDPOINTS ACTIVE
          </span>
        </div>
        <div className="grid gap-[var(--space-lg)]">
          {connections.map((conn, i) => (
            <ConnectionLine
              key={conn.label}
              label={conn.label}
              href={conn.href}
              delay={i * 0.1}
            />
          ))}
        </div>
      </section>

      {/* Footer */}
      <section data-spec-section className="flex flex-col items-center gap-[var(--space-md)]">
        <div className="h-px w-full bg-[var(--border-visible)]" />
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          END OF SPEC
        </span>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Build and verify**

Run: `npx next build 2>&1 | tail -10`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/effects/index.ts src/app/about/page.tsx
git commit -m "feat: integrate spec sheet about page with skill bars and dimension lines"
```

---

## Task 10: Visual QA and Polish

**Files:**
- Possibly modify: any of the above files

This is a manual testing pass. Run the dev server, test both pages in the browser, and fix any issues.

- [ ] **Step 1: Start dev server**

Run: `npx next dev`

- [ ] **Step 2: Test hero page in browser**

Verify:
- Hero section pins when scrolling
- Flat line is visible at start
- Waveform oscillates as you scroll
- Text emerges from waveform
- Brightness pulse sweeps across text
- Canvas swaps to solid h1 text
- Divider line appears
- Status labels update in corner
- Post-pin content (subtitle, ticker, intro) appears naturally
- On mobile viewport: fewer points, shorter pin, no status labels

- [ ] **Step 3: Test about page in browser**

Verify:
- ABOUT heading animates in
- Header rule with "REV 01 - 2026" appears
- SpecBlock dimension lines draw on scroll (desktop)
- Measurement value counts up
- Bio text fades in
- Skill bars fill on scroll with staggered timing
- End caps appear at fill points
- Connection lines draw with nodes filling
- "3 ENDPOINTS ACTIVE" annotation visible
- "END OF SPEC" footer appears
- Links are clickable
- Dimension overlay vertical line draws along left margin (desktop)
- On mobile: no dimension lines/overlay, bars still animate

- [ ] **Step 4: Test reduced motion**

In browser DevTools, enable `prefers-reduced-motion: reduce`. Verify:
- Hero shows solid text immediately, no pin
- About page shows all elements at final state, no animation

- [ ] **Step 5: Fix any issues found, commit**

```bash
git add -A
git commit -m "fix: polish oscilloscope hero and spec sheet about page"
```
