# About Page Blueprint Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the About page with a vivid blueprint color palette, replace skill bars with three new sections (system diagram, process flow, experience timeline), and clean up annotation line noise.

**Architecture:** Update scoped CSS token overrides in `.blueprint` class, simplify `SpecBlock` by removing pixel measurement animations, create three new GSAP+ScrollTrigger effect components (`SystemDiagram`, `ProcessFlow`, `ExperienceTimeline`), and rewrite the About page layout.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, GSAP + ScrollTrigger, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-06-about-blueprint-redesign-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/styles/tokens.css` | Update `.blueprint` token values for vivid blue palette |
| Modify | `src/components/effects/SpecBlock.tsx` | Remove pixel measurement animation, keep bracket lines |
| Create | `src/components/effects/SystemDiagram.tsx` | Hub-and-spoke project architecture diagram |
| Create | `src/components/effects/ProcessFlow.tsx` | Horizontal/vertical process flowchart |
| Create | `src/components/effects/ExperienceTimeline.tsx` | Vertical timeline with branching cards |
| Modify | `src/components/effects/index.ts` | Register three new exports |
| Modify | `src/app/about/page.tsx` | New page layout with new sections, remove SkillBar/DimensionOverlay |

---

### Task 1: Update Blueprint Color Tokens

**Files:**
- Modify: `src/styles/tokens.css:96-106`

- [ ] **Step 1: Update the `.blueprint` class token values**

The current values are slate-toned and muted. Update them to a more saturated blueprint blue per the design spec.

In `src/styles/tokens.css`, replace lines 96-106:

```css
.blueprint {
  --black: #0a1628;
  --surface: #0d1b2a;
  --surface-raised: #132238;
  --border: #1b3a5c;
  --border-visible: #4a7fb5;
  --text-disabled: #3d6d94;
  --text-secondary: #6a8fad;
  --text-primary: #c8dce8;
  --text-display: #e8f0f5;
}
```

Key changes from current values:
- `--border`: `#1e3a5f` → `#1b3a5c` (grid lines — slightly more blue)
- `--border-visible`: `#2c5282` → `#4a7fb5` (line work — significantly brighter, this is the big one)
- `--text-disabled`: `#475569` → `#3d6d94` (spec labels — blue-toned instead of slate)
- `--text-secondary`: `#64748b` → `#6a8fad` (descriptions — more blue saturation)
- `--text-primary`: `#94a3b8` → `#c8dce8` (body text — much brighter for readability)
- `--text-display`: `#e2e8f0` → `#e8f0f5` (heading — near white)

- [ ] **Step 2: Verify the dev server picks up the changes**

Run: `curl -s http://localhost:3000/about | head -1`
Expected: The page loads (any HTML output). Then take a Playwright screenshot to visually confirm the colors have shifted bluer and brighter.

- [ ] **Step 3: Commit**

```bash
git add src/styles/tokens.css
git commit -m "style: update blueprint tokens to vivid blue palette"
```

---

### Task 2: Simplify SpecBlock

**Files:**
- Modify: `src/components/effects/SpecBlock.tsx`

The SpecBlock currently draws a vertical bracket line with tick marks AND a rotating pixel-height measurement label that counts up (e.g., "↕ 1227px"). The measurement is meaningless to visitors. Keep the bracket, remove the measurement.

- [ ] **Step 1: Remove the measurement animation and label from SpecBlock**

Replace the entire contents of `src/components/effects/SpecBlock.tsx` with:

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
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    setPrefersReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (!contentRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setHeight(Math.round(entry.contentRect.height));
    });
    ro.observe(contentRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (prefersReduced || !height) return;
    const container = containerRef.current;
    const line = lineRef.current;
    const topTick = topTickRef.current;
    const bottomTick = bottomTickRef.current;
    if (!container || !line || !topTick || !bottomTick) return;

    gsap.set(line, { attr: { y2: 0 } });
    gsap.set([topTick, bottomTick], { attr: { x1: 0, x2: 0 } });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top 80%",
        end: "top 30%",
        scrub: true,
      },
    });

    tl.to(line, { attr: { y2: height }, duration: 0.5, ease: "none" })
      .to([topTick, bottomTick], { attr: { x1: -12, x2: 0 }, duration: 0.2 }, ">-0.2");

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [height, prefersReduced]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <p className="mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
        {label}
      </p>

      <div className="relative pl-[var(--space-2xl)]">
        <svg
          className="absolute left-0 top-0 hidden h-full w-[var(--space-2xl)] overflow-visible md:block"
          style={{ pointerEvents: "none" }}
        >
          <line
            ref={lineRef}
            x1={16}
            y1={0}
            x2={16}
            y2={prefersReduced ? height : 0}
            stroke="var(--border-visible)"
            strokeWidth={1}
          />
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

        <div ref={contentRef}>
          {children}
        </div>
      </div>
    </div>
  );
}
```

Changes from original:
- Removed `measureRef` (the rotated `<span>` showing "↕ 1227px")
- Removed the `proxy` object and `onUpdate` counter animation from the timeline
- Removed the measurement label fade-in from the timeline
- Kept: vertical line draw, tick mark extensions, bracket framing

- [ ] **Step 2: Verify SpecBlock renders without measurement label**

Navigate to `http://localhost:3000/about` and confirm the SPEC: IDENTITY section shows the bracket line on the left but no rotating pixel measurement text.

- [ ] **Step 3: Commit**

```bash
git add src/components/effects/SpecBlock.tsx
git commit -m "refactor: remove pixel measurement from SpecBlock, keep bracket lines"
```

---

### Task 3: Create SystemDiagram Component

**Files:**
- Create: `src/components/effects/SystemDiagram.tsx`

A hub-and-spoke diagram showing project domains. "MAZZA BUILDS" hub at top, three project nodes below connected by lines. Desktop: horizontal node row with vertical connector lines from a horizontal spine. Mobile: vertical stack with nodes only (no connector lines).

- [ ] **Step 1: Create the SystemDiagram component**

Create `src/components/effects/SystemDiagram.tsx`:

```tsx
"use client";

import { useRef, useEffect, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface SystemNode {
  name: string;
  sublabel: string;
}

const nodes: SystemNode[] = [
  { name: "DAILY ROMAN", sublabel: "iOS / SwiftUI" },
  { name: "SHOPIFY APP", sublabel: "Commerce / Remix" },
  { name: "AI SYSTEMS", sublabel: "Claude API / Automation" },
];

export function SystemDiagram({ className = "" }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const vertLineRef = useRef<HTMLDivElement>(null);
  const horizLineRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dropRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    setPrefersReduced(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  useEffect(() => {
    if (prefersReduced) return;
    const container = containerRef.current;
    const hub = hubRef.current;
    const vertLine = vertLineRef.current;
    const horizLine = horizLineRef.current;
    if (!container || !hub || !vertLine || !horizLine) return;

    const nodeEls = nodeRefs.current.filter(Boolean) as HTMLDivElement[];
    const dropEls = dropRefs.current.filter(Boolean) as HTMLDivElement[];

    gsap.set(hub, { opacity: 0 });
    gsap.set(vertLine, { scaleY: 0, transformOrigin: "top" });
    gsap.set(horizLine, { scaleX: 0 });
    gsap.set(dropEls, { scaleY: 0, transformOrigin: "top" });
    gsap.set(nodeEls, { opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top 80%",
        end: "top 30%",
        scrub: true,
      },
    });

    tl.to(hub, { opacity: 1, duration: 0.15 })
      .to(vertLine, { scaleY: 1, duration: 0.15, ease: "none" })
      .to(horizLine, { scaleX: 1, duration: 0.2, ease: "none" })
      .to(dropEls, {
        scaleY: 1,
        duration: 0.15,
        ease: "none",
        stagger: 0.05,
      })
      .to(nodeEls, { opacity: 1, duration: 0.15, stagger: 0.05 });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [prefersReduced]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col items-center ${className}`}
    >
      {/* Hub node */}
      <div
        ref={hubRef}
        className="border border-[var(--border-visible)] px-[var(--space-lg)] py-[var(--space-sm)]"
        style={{ opacity: prefersReduced ? 1 : 0 }}
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-primary)]">
          MAZZA BUILDS
        </span>
      </div>

      {/* Vertical line from hub — desktop only */}
      <div
        ref={vertLineRef}
        className="hidden h-[var(--space-2xl)] w-px bg-[var(--border-visible)] md:block"
        style={{
          transform: prefersReduced ? "none" : "scaleY(0)",
          transformOrigin: "top",
        }}
      />

      {/* Horizontal connector — desktop only */}
      <div
        ref={horizLineRef}
        className="hidden h-px w-full bg-[var(--border-visible)] md:block"
        style={{ transform: prefersReduced ? "none" : "scaleX(0)" }}
      />

      {/* Node cards */}
      <div className="mt-[var(--space-lg)] grid w-full grid-cols-1 gap-[var(--space-lg)] md:mt-0 md:grid-cols-3">
        {nodes.map((node, i) => (
          <div key={node.name} className="flex flex-col items-center">
            {/* Vertical drop line — desktop only */}
            <div
              ref={(el) => {
                dropRefs.current[i] = el;
              }}
              className="hidden h-[var(--space-xl)] w-px bg-[var(--border-visible)] md:block"
              style={{
                transform: prefersReduced ? "none" : "scaleY(0)",
                transformOrigin: "top",
              }}
            />
            {/* Node card */}
            <div
              ref={(el) => {
                nodeRefs.current[i] = el;
              }}
              className="w-full border border-[var(--border-visible)] px-[var(--space-lg)] py-[var(--space-md)] text-center"
              style={{ opacity: prefersReduced ? 1 : 0 }}
            >
              <p className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-primary)]">
                {node.name}
              </p>
              <p className="mt-[var(--space-xs)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                {node.sublabel}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/effects/SystemDiagram.tsx
git commit -m "feat: add SystemDiagram component for project architecture display"
```

---

### Task 4: Create ProcessFlow Component

**Files:**
- Create: `src/components/effects/ProcessFlow.tsx`

A sequential flowchart: CONCEPT → DESIGN → BUILD → TEST → SHIP. Horizontal on desktop, vertical on mobile. Steps and connector lines animate in sequentially on scroll.

- [ ] **Step 1: Create the ProcessFlow component**

Create `src/components/effects/ProcessFlow.tsx`:

```tsx
"use client";

import { Fragment, useRef, useEffect, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface ProcessStep {
  label: string;
  annotation: string;
}

const steps: ProcessStep[] = [
  { label: "CONCEPT", annotation: "Research, scope" },
  { label: "DESIGN", annotation: "UI/UX, architecture" },
  { label: "BUILD", annotation: "Swift, TS, Next.js" },
  { label: "TEST", annotation: "QA, iteration" },
  { label: "SHIP", annotation: "Deploy, monitor" },
];

export function ProcessFlow({ className = "" }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    setPrefersReduced(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  useEffect(() => {
    if (prefersReduced) return;
    const container = containerRef.current;
    if (!container) return;

    const stepEls = stepRefs.current.filter(Boolean) as HTMLDivElement[];
    const lineEls = lineRefs.current.filter(Boolean) as HTMLDivElement[];

    // Interleave steps and lines for sequential animation
    const allEls: HTMLDivElement[] = [];
    stepEls.forEach((step, i) => {
      allEls.push(step);
      if (lineEls[i]) allEls.push(lineEls[i]);
    });

    gsap.set(allEls, { opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top 80%",
        end: "top 30%",
        scrub: true,
      },
    });

    tl.to(allEls, { opacity: 1, duration: 0.08, stagger: 0.08 });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [prefersReduced]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col items-stretch gap-0 md:flex-row md:items-center ${className}`}
    >
      {steps.map((step, i) => (
        <Fragment key={step.label}>
          {/* Step box */}
          <div
            ref={(el) => {
              stepRefs.current[i] = el;
            }}
            className="shrink-0 border border-[var(--border-visible)] px-[var(--space-md)] py-[var(--space-sm)] text-center"
            style={{ opacity: prefersReduced ? 1 : 0 }}
          >
            <p className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-primary)]">
              {step.label}
            </p>
            <p className="mt-[var(--space-2xs)] font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
              {step.annotation}
            </p>
          </div>

          {/* Connector line */}
          {i < steps.length - 1 && (
            <div
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              className="mx-auto h-[var(--space-md)] w-px bg-[var(--border-visible)] md:mx-0 md:h-px md:w-auto md:flex-1"
              style={{ opacity: prefersReduced ? 1 : 0 }}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}
```

Responsive behavior: `flex-col` on mobile (vertical stack with vertical connector lines between steps), `flex-row` on desktop (horizontal with horizontal connectors). Animation uses opacity stagger for both orientations.

- [ ] **Step 2: Commit**

```bash
git add src/components/effects/ProcessFlow.tsx
git commit -m "feat: add ProcessFlow component for development process flowchart"
```

---

### Task 5: Create ExperienceTimeline Component

**Files:**
- Create: `src/components/effects/ExperienceTimeline.tsx`

Vertical spine on the left with node circles branching to role cards. Spine draws down on scroll, then nodes/connectors/cards animate in sequentially.

- [ ] **Step 1: Create the ExperienceTimeline component**

Create `src/components/effects/ExperienceTimeline.tsx`:

```tsx
"use client";

import { useRef, useEffect, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface ExperienceEntry {
  title: string;
  company: string;
  dateRange: string;
  description: string;
}

interface ExperienceTimelineProps {
  entries: ExperienceEntry[];
  className?: string;
}

export function ExperienceTimeline({
  entries,
  className = "",
}: ExperienceTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spineRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const connectorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    setPrefersReduced(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  useEffect(() => {
    if (prefersReduced) return;
    const container = containerRef.current;
    const spine = spineRef.current;
    if (!container || !spine) return;

    const nodeEls = nodeRefs.current.filter(Boolean) as HTMLDivElement[];
    const connectorEls = connectorRefs.current.filter(
      Boolean,
    ) as HTMLDivElement[];
    const cardEls = cardRefs.current.filter(Boolean) as HTMLDivElement[];

    gsap.set(spine, { scaleY: 0, transformOrigin: "top" });
    gsap.set(nodeEls, { scale: 0 });
    gsap.set(connectorEls, { scaleX: 0, transformOrigin: "left" });
    gsap.set(cardEls, { opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top 80%",
        end: "bottom 50%",
        scrub: true,
      },
    });

    // Spine draws down first
    tl.to(spine, { scaleY: 1, duration: 0.3, ease: "none" });

    // Each entry: node pops, connector extends, card fades in
    nodeEls.forEach((_, i) => {
      tl.to(nodeEls[i], { scale: 1, duration: 0.05 })
        .to(connectorEls[i], { scaleX: 1, duration: 0.08 }, ">")
        .to(cardEls[i], { opacity: 1, duration: 0.08 }, ">");
    });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [prefersReduced, entries.length]);

  return (
    <div ref={containerRef} className={`relative pl-12 ${className}`}>
      {/* Vertical spine */}
      <div
        ref={spineRef}
        className="absolute left-[4px] top-0 h-full w-px bg-[var(--border-visible)]"
        style={{
          transform: prefersReduced ? "none" : "scaleY(0)",
          transformOrigin: "top",
        }}
      />

      {entries.map((entry, i) => (
        <div
          key={entry.company}
          className={i > 0 ? "mt-[var(--space-2xl)]" : ""}
        >
          <div className="relative">
            {/* Node circle — centered on spine */}
            <div
              ref={(el) => {
                nodeRefs.current[i] = el;
              }}
              className="absolute -left-12 top-4 h-[10px] w-[10px] rounded-full border border-[var(--border-visible)] bg-[var(--surface)]"
              style={{ transform: prefersReduced ? "none" : "scale(0)" }}
            />

            {/* Horizontal connector — from node to card */}
            <div
              ref={(el) => {
                connectorRefs.current[i] = el;
              }}
              className="absolute -left-[37px] top-[18px] h-px w-[37px] bg-[var(--border-visible)]"
              style={{
                transform: prefersReduced ? "none" : "scaleX(0)",
                transformOrigin: "left",
              }}
            />

            {/* Card */}
            <div
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className="border border-[var(--border-visible)] p-[var(--space-md)]"
              style={{ opacity: prefersReduced ? 1 : 0 }}
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
                {entry.dateRange}
              </p>
              <h3 className="mt-[var(--space-xs)] font-sans text-[16px] font-medium text-[var(--text-primary)]">
                {entry.title}
              </h3>
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                {entry.company}
              </p>
              <p className="mt-[var(--space-sm)] font-sans text-[var(--body-sm)] leading-[1.5] text-[var(--text-secondary)]">
                {entry.description}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

Design notes:
- `pl-12` (48px) makes room for the spine + node + connector on the left
- Spine at `left-[4px]` aligns with the center of the 10px node at `left-[-48px]` from content
- Connector spans from right edge of node to left edge of card content
- Entries are passed as props (not hardcoded) so the About page controls the data

- [ ] **Step 2: Commit**

```bash
git add src/components/effects/ExperienceTimeline.tsx
git commit -m "feat: add ExperienceTimeline component with vertical spine and branching cards"
```

---

### Task 6: Register New Components in Barrel Export

**Files:**
- Modify: `src/components/effects/index.ts`

- [ ] **Step 1: Add exports for the three new components**

Add these three lines to the end of `src/components/effects/index.ts` (after the `AnimatedRule` export on line 14):

```ts
export { SystemDiagram } from "./SystemDiagram";
export { ProcessFlow } from "./ProcessFlow";
export { ExperienceTimeline } from "./ExperienceTimeline";
```

- [ ] **Step 2: Commit**

```bash
git add src/components/effects/index.ts
git commit -m "chore: register SystemDiagram, ProcessFlow, ExperienceTimeline exports"
```

---

### Task 7: Rewrite About Page

**Files:**
- Modify: `src/app/about/page.tsx`

Remove `DimensionOverlay`, `SkillBar`, and `skillGroups` data. Add the three new sections. Keep existing header, identity, connections, and footer sections.

- [ ] **Step 1: Replace the entire About page**

Replace the full contents of `src/app/about/page.tsx` with:

```tsx
import { ScrollTextLines } from "@/components/ui";
import {
  ScrollLetterAnimation,
  SpecBlock,
  ConnectionLine,
  AnimatedRule,
  SystemDiagram,
  ProcessFlow,
  ExperienceTimeline,
} from "@/components/effects";

const connections = [
  { label: "GitHub", href: "https://github.com/alexandermazza" },
  { label: "Twitter", href: "https://twitter.com/maboroshi_alex" },
  { label: "Email", href: "mailto:hello@mazzabuilds.com" },
];

const experience = [
  {
    title: "Software Developer",
    company: "Company Name",
    dateRange: "2024 — PRESENT",
    description: "Building web applications and internal tools.",
  },
  {
    title: "Freelance Developer",
    company: "Self-Employed",
    dateRange: "2022 — 2024",
    description: "iOS apps, Shopify integrations, and AI automation systems.",
  },
];

export default function AboutPage() {
  return (
    <main
      className="blueprint relative min-h-screen px-[var(--space-lg)] py-[var(--space-4xl)]"
      style={{
        backgroundColor: "var(--surface)",
        backgroundImage:
          "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
        backgroundSize: "var(--space-lg) var(--space-lg)",
      }}
    >
      <div className="relative mx-auto max-w-[960px]">
        {/* Heading */}
        <section className="mb-[var(--space-lg)]">
          <ScrollLetterAnimation
            as="h1"
            className="font-sans text-[clamp(36px,8vw,72px)] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]"
          >
            ABOUT
          </ScrollLetterAnimation>
        </section>

        {/* Header rule with revision */}
        <section className="mb-[var(--space-3xl)]">
          <AnimatedRule />
        </section>

        {/* Bio / Identity Spec */}
        <section className="mb-[var(--space-4xl)]">
          <SpecBlock label="SPEC: IDENTITY">
            <ScrollTextLines className="max-w-[640px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
              I&apos;m Alex Mazza, a solo indie developer based out of the
              Midwest. I build things from concept to production — iOS apps,
              Shopify tools, AI-powered automation systems, and the web
              experiences that tie them together.
            </ScrollTextLines>
            <div className="mt-[var(--space-2xl)]">
              <ScrollTextLines className="max-w-[640px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
                I care about clean interfaces, thoughtful systems, and shipping
                work that holds up. Every project here was designed, built, and
                shipped by me — no agencies, no templates.
              </ScrollTextLines>
            </div>
          </SpecBlock>
        </section>

        {/* Systems Spec */}
        <section className="mb-[var(--space-4xl)]">
          <p className="mb-[var(--space-2xl)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
            SPEC: SYSTEMS
          </p>
          <SystemDiagram />
        </section>

        {/* Process Spec */}
        <section className="mb-[var(--space-4xl)]">
          <p className="mb-[var(--space-2xl)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
            SPEC: PROCESS
          </p>
          <ProcessFlow />
        </section>

        {/* History Spec */}
        <section className="mb-[var(--space-4xl)]">
          <p className="mb-[var(--space-2xl)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
            SPEC: HISTORY
          </p>
          <ExperienceTimeline entries={experience} />
        </section>

        {/* Connections Spec */}
        <section className="mb-[var(--space-4xl)]">
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
        <section className="flex flex-col items-center gap-[var(--space-md)]">
          <div className="h-px w-full bg-[var(--border-visible)]" />
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
            END OF SPEC
          </span>
        </section>
      </div>
    </main>
  );
}
```

Key changes:
- Removed `DimensionOverlay` import and usage (no more full-page annotation spine)
- Removed `SkillBar` import and `skillGroups` data
- Removed `data-spec-section` attributes (no longer needed without DimensionOverlay)
- Removed `barIndex` counter
- Added `SystemDiagram`, `ProcessFlow`, `ExperienceTimeline` sections
- Added `experience` data array (placeholder company names — user will update with real data)
- Kept header, identity, connections, and footer sections intact

- [ ] **Step 2: Verify the page compiles and renders**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/about`
Expected: `200`

Then take a Playwright screenshot to verify all sections render correctly.

- [ ] **Step 3: Commit**

```bash
git add src/app/about/page.tsx
git commit -m "feat: rewrite About page with systems diagram, process flow, and experience timeline"
```

---

### Task 8: Visual QA

- [ ] **Step 1: Full-page screenshot and review**

Navigate to `http://localhost:3000/about` and take screenshots at:
1. Top of page (heading + identity)
2. Middle (systems diagram + process flow)
3. Bottom (experience timeline + connections + footer)

Check for:
- Blueprint blue palette is vivid and consistent (no slate/gray remnants)
- Grid background uses the new `--border` blue
- No orphan annotation lines (DimensionOverlay gone, SpecBlock has clean brackets only)
- All scroll animations trigger correctly
- Text is legible against the blueprint blue background
- Mobile viewport: sections stack cleanly

- [ ] **Step 2: Fix any visual issues found**

Address spacing, alignment, or color issues. Common things to watch for:
- Connector line alignment in SystemDiagram (hub to nodes)
- ProcessFlow step boxes fitting within viewport width on desktop
- ExperienceTimeline node/connector alignment with cards

- [ ] **Step 3: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: visual polish for About page blueprint redesign"
```
