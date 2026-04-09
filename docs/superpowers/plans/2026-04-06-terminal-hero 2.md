# Terminal Boot Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-screen terminal boot sequence hero that simulates building the portfolio via Claude Code, then hard-cuts to the brand reveal.

**Architecture:** Single client component (`TerminalHero`) using a GSAP timeline with ScrambleTextPlugin for line-by-line text reveal and custom tweens for progress bar fills. Two-layer rendering: a `position: fixed` overlay at `z-9999` for the boot phase (covers all page content including nav), and normal-flow hero text revealed underneath when the overlay disappears. `sessionStorage` controls repeat-visit speed, `prefers-reduced-motion` skips animations.

**Tech Stack:** GSAP (timeline, ScrambleTextPlugin — already registered in `src/lib/gsap.ts`), React refs for GSAP targets, CSS custom properties from `src/styles/tokens.css`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/components/effects/TerminalHero.tsx` | Full hero component: types, data, DOM, GSAP animation, reduced motion, repeat visit |
| Modify | `src/components/effects/index.ts` | Add barrel export for TerminalHero |
| Modify | `src/app/page.tsx` | Replace existing hero sections with TerminalHero |

---

### Task 1: Create TerminalHero component shell with static DOM

**Files:**
- Create: `src/components/effects/TerminalHero.tsx`

- [ ] **Step 1: Create the component with types, boot line data, and static DOM**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { gsap, ENTER_EASE } from "@/lib/gsap";

// ─── Types ────────────────────────────────────────────

type BootLine =
  | { type: "text"; text: string }
  | {
      type: "bar";
      prefix: string;
      barWidth: number;
      suffix: string;
      pauseAt?: number;
    }
  | {
      type: "dots";
      prefix: string;
      dotCount: number;
      suffix: string;
      suffixAccent?: boolean;
      pauseMs?: number;
    };

// ─── Boot sequence content ────────────────────────────

const BOOT_LINES: BootLine[] = [
  { type: "text", text: "> claude-code v4.6 initialized" },
  { type: "text", text: "> loading workspace: mazza-builds-portfolio" },
  {
    type: "bar",
    prefix: "> scanning project structure ",
    barWidth: 10,
    suffix: " 47 files found",
  },
  { type: "text", text: "> compiling next.js app router" },
  { type: "text", text: "> registering fonts: Space Grotesk, Space Mono" },
  {
    type: "bar",
    prefix: "> applying design tokens ",
    barWidth: 16,
    suffix: " nothing-os-theme",
  },
  {
    type: "bar",
    prefix: "> mounting components ",
    barWidth: 16,
    suffix: " 12/12",
  },
  {
    type: "bar",
    prefix: "> fetching projects ",
    barWidth: 10,
    suffix: " 4 loaded",
    pauseAt: 0.6,
  },
  {
    type: "bar",
    prefix: "> initializing gsap scroll engine ",
    barWidth: 16,
    suffix: " OK",
  },
  { type: "text", text: "> three.js renderer: WebGL 2.0" },
  {
    type: "dots",
    prefix: "> running vibe check",
    dotCount: 15,
    suffix: " PASSED",
    suffixAccent: true,
    pauseMs: 400,
  },
  {
    type: "bar",
    prefix: "> bundling assets ",
    barWidth: 16,
    suffix: " 247kb gzipped",
  },
  {
    type: "bar",
    prefix: "> deploying to production ",
    barWidth: 10,
    suffix: "",
  },
  {
    type: "bar",
    prefix: "> deploy complete ",
    barWidth: 16,
    suffix: " launching.",
  },
];

// ─── Timing constants ─────────────────────────────────

const SCRAMBLE_CHARS = "01!<>{}[]/=_";
const FIRST_LINE_DURATION = 0.4;
const LAST_LINE_DURATION = 0.08;
const BAR_FILL_DURATION = 0.3;
const HOLD_DURATION = 0.4;
const REVEAL_SCALE_DURATION = 0.3;
const REPEAT_SPEED = 2.5;

function getLineDuration(index: number, total: number): number {
  const t = index / (total - 1);
  return FIRST_LINE_DURATION - (FIRST_LINE_DURATION - LAST_LINE_DURATION) * t;
}

// ─── Component ────────────────────────────────────────

export function TerminalHero() {
  const bootRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    // Animation will be added in Task 2
    return () => {
      tlRef.current?.kill();
    };
  }, []);

  return (
    <section className="relative h-screen w-full">
      {/* Boot overlay — fixed, covers everything including nav */}
      <div
        ref={bootRef}
        className="fixed inset-0 z-[9999] flex items-center bg-[var(--black)]"
      >
        <div className="mx-auto w-full max-w-[640px] px-[var(--space-lg)]">
          {BOOT_LINES.map((line, i) => (
            <div
              key={i}
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              className="font-mono text-[13px] leading-[1.8] text-[var(--text-secondary)] whitespace-nowrap"
              style={{ opacity: 0 }}
            >
              {line.type === "text" && <span data-text>&nbsp;</span>}
              {line.type === "bar" && (
                <>
                  <span data-prefix>&nbsp;</span>
                  <span data-bar data-bar-width={line.barWidth}>
                    {"[" + "░".repeat(line.barWidth) + "]"}
                  </span>
                  <span data-suffix style={{ opacity: 0 }}>
                    {line.suffix}
                  </span>
                </>
              )}
              {line.type === "dots" && (
                <>
                  <span data-prefix>&nbsp;</span>
                  <span data-dots data-dot-count={line.dotCount} />
                  <span
                    data-suffix
                    className={
                      line.suffixAccent ? "text-[var(--accent)]" : ""
                    }
                    style={{ opacity: 0 }}
                  >
                    {line.suffix}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Hero text — revealed after boot completes */}
      <div
        ref={revealRef}
        className="flex h-full items-center justify-center text-center"
        style={{ opacity: 0 }}
      >
        <div>
          <h1 className="font-sans text-[clamp(48px,12vw,96px)] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]">
            MAZZA BUILDS
          </h1>
          <p className="mt-[var(--space-md)] font-sans text-[clamp(16px,2.5vw,24px)] text-[var(--text-secondary)]">
            building things that work
          </p>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify static render**

Run: `npm run dev`

Navigate to `http://localhost:3000`. Confirm:
- Full-screen black overlay covers the viewport (boot lines hidden since opacity: 0)
- No console errors
- The nav menu button is NOT visible (covered by z-9999 overlay)

- [ ] **Step 3: Commit**

```bash
git add src/components/effects/TerminalHero.tsx
git commit -m "feat: add TerminalHero component shell with boot line data and static DOM"
```

---

### Task 2: Add GSAP boot sequence animation

**Files:**
- Modify: `src/components/effects/TerminalHero.tsx`

- [ ] **Step 1: Replace the `useEffect` body with the full GSAP timeline**

Replace the existing `useEffect` (the one with the `// Animation will be added in Task 2` comment) with:

```tsx
useEffect(() => {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const isRepeatVisit = sessionStorage.getItem("hero-seen") === "true";
  const speed = isRepeatVisit ? REPEAT_SPEED : 1;

  // ── Reduced motion path ───────────────────────
  if (reducedMotion) {
    lineRefs.current.forEach((el) => {
      if (!el) return;
      el.style.opacity = "1";
      // Show final text for text lines
      const textEl = el.querySelector<HTMLElement>("[data-text]");
      if (textEl) {
        const lineData = BOOT_LINES[lineRefs.current.indexOf(el)];
        if (lineData?.type === "text") textEl.textContent = lineData.text;
      }
      // Show final prefix for bar/dots lines
      const prefixEl = el.querySelector<HTMLElement>("[data-prefix]");
      if (prefixEl) {
        const lineData = BOOT_LINES[lineRefs.current.indexOf(el)];
        if (lineData && "prefix" in lineData) prefixEl.textContent = lineData.prefix;
      }
      // Fill bars
      const barEl = el.querySelector<HTMLElement>("[data-bar]");
      if (barEl) {
        const width = Number(barEl.dataset.barWidth);
        barEl.textContent = "[" + "█".repeat(width) + "]";
      }
      // Show dots
      const dotsEl = el.querySelector<HTMLElement>("[data-dots]");
      if (dotsEl) {
        dotsEl.textContent = ".".repeat(Number(dotsEl.dataset.dotCount));
      }
      // Show suffixes
      const suffixEl = el.querySelector<HTMLElement>("[data-suffix]");
      if (suffixEl) suffixEl.style.opacity = "1";
    });

    const timeout = setTimeout(() => {
      if (bootRef.current) {
        bootRef.current.style.opacity = "0";
        bootRef.current.style.display = "none";
      }
      if (revealRef.current) {
        revealRef.current.style.opacity = "1";
      }
      sessionStorage.setItem("hero-seen", "true");
    }, 1000);

    return () => clearTimeout(timeout);
  }

  // ── Animated path ─────────────────────────────
  const tl = gsap.timeline();
  tlRef.current = tl;

  BOOT_LINES.forEach((line, i) => {
    const el = lineRefs.current[i];
    if (!el) return;

    const dur = getLineDuration(i, BOOT_LINES.length) / speed;

    // Make line visible
    tl.set(el, { opacity: 1 });

    if (line.type === "text") {
      const textEl = el.querySelector("[data-text]");
      if (textEl) {
        tl.to(textEl, {
          duration: dur,
          scrambleText: {
            text: line.text,
            chars: SCRAMBLE_CHARS,
            speed: 0.4,
          },
        });
      }
    } else if (line.type === "bar") {
      const prefixEl = el.querySelector<HTMLElement>("[data-prefix]");
      const barEl = el.querySelector<HTMLElement>("[data-bar]");
      const suffixEl = el.querySelector<HTMLElement>("[data-suffix]");
      const width = line.barWidth;
      const fillDur = BAR_FILL_DURATION / speed;

      // Scramble prefix
      if (prefixEl) {
        tl.to(prefixEl, {
          duration: dur * 0.4,
          scrambleText: {
            text: line.prefix,
            chars: SCRAMBLE_CHARS,
            speed: 0.4,
          },
        });
      }

      // Fill bar (with optional mid-fill pause)
      if (barEl) {
        if (line.pauseAt) {
          const target = { p: 0 };
          tl.to(target, {
            p: line.pauseAt,
            duration: fillDur * line.pauseAt,
            ease: "none",
            onUpdate() {
              const filled = Math.floor(target.p * width);
              barEl.textContent =
                "[" + "█".repeat(filled) + "░".repeat(width - filled) + "]";
            },
          });
          tl.to({}, { duration: 0.3 / speed });
          tl.to(target, {
            p: 1,
            duration: fillDur * (1 - line.pauseAt),
            ease: "none",
            onUpdate() {
              const filled = Math.floor(target.p * width);
              barEl.textContent =
                "[" + "█".repeat(filled) + "░".repeat(width - filled) + "]";
            },
          });
        } else {
          const target = { p: 0 };
          tl.to(target, {
            p: 1,
            duration: fillDur,
            ease: "none",
            onUpdate() {
              const filled = Math.floor(target.p * width);
              barEl.textContent =
                "[" + "█".repeat(filled) + "░".repeat(width - filled) + "]";
            },
          });
        }
      }

      // Show suffix
      if (suffixEl && line.suffix) {
        tl.to(suffixEl, { opacity: 1, duration: 0.1 / speed });
      }
    } else if (line.type === "dots") {
      const prefixEl = el.querySelector<HTMLElement>("[data-prefix]");
      const dotsEl = el.querySelector<HTMLElement>("[data-dots]");
      const suffixEl = el.querySelector<HTMLElement>("[data-suffix]");

      // Scramble prefix
      if (prefixEl) {
        tl.to(prefixEl, {
          duration: dur * 0.4,
          scrambleText: {
            text: line.prefix,
            chars: SCRAMBLE_CHARS,
            speed: 0.4,
          },
        });
      }

      // Extend dots one by one
      if (dotsEl) {
        const dotTarget = { count: 0 };
        tl.to(dotTarget, {
          count: line.dotCount,
          duration: 0.5 / speed,
          ease: "none",
          onUpdate() {
            dotsEl.textContent = ".".repeat(Math.floor(dotTarget.count));
          },
        });
      }

      // Pause before suffix
      if (line.pauseMs) {
        tl.to({}, { duration: line.pauseMs / 1000 / speed });
      }

      // Show suffix
      if (suffixEl) {
        tl.to(suffixEl, { opacity: 1, duration: 0.1 / speed });
      }
    }
  });

  // Hold on "launching." then hard cut to reveal
  tl.to({}, { duration: HOLD_DURATION / speed });

  // Reveal: instant cut
  tl.set(bootRef.current, { opacity: 0, display: "none" });
  tl.set(revealRef.current, { opacity: 1, scale: 1.02 });
  tl.to(revealRef.current, {
    scale: 1,
    duration: REVEAL_SCALE_DURATION,
    ease: ENTER_EASE,
  });

  // Mark as seen
  tl.call(() => sessionStorage.setItem("hero-seen", "true"));

  return () => {
    tl.kill();
  };
}, []);
```

- [ ] **Step 2: Verify boot animation plays**

Run: `npm run dev`

Navigate to `http://localhost:3000`. Confirm:
- Terminal lines appear one by one, accelerating
- ScrambleText resolves each text line from garbled characters
- Progress bars fill from ░ to █ (the "fetching projects" bar pauses mid-fill)
- "running vibe check" dots extend, pause, then "PASSED" appears in orange
- After "launching." holds, the terminal instantly disappears and "MAZZA BUILDS" / "building things that work" appears with a subtle scale-in
- Menu button becomes visible after reveal

- [ ] **Step 3: Verify repeat visit speed**

Reload the page (same tab). Confirm:
- The same sequence plays noticeably faster (~1.5s total)
- Same hard cut at the end

Open a new browser tab, navigate to `http://localhost:3000`. Confirm:
- New tab = new sessionStorage = full speed sequence

- [ ] **Step 4: Verify reduced motion**

In browser DevTools, enable `prefers-reduced-motion: reduce` (Rendering panel > Emulate CSS media feature). Reload. Confirm:
- All lines appear instantly with final text
- Bars show filled
- After 1 second pause, hero text appears with no scale animation

- [ ] **Step 5: Commit**

```bash
git add src/components/effects/TerminalHero.tsx
git commit -m "feat: add GSAP boot sequence animation with reveal, repeat visit speed, and reduced motion"
```

---

### Task 3: Export and integrate into page.tsx

**Files:**
- Modify: `src/components/effects/index.ts`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add barrel export**

In `src/components/effects/index.ts`, add this line:

```ts
export { TerminalHero } from "./TerminalHero";
```

- [ ] **Step 2: Update page.tsx — replace existing hero with TerminalHero**

Replace the full contents of `src/app/page.tsx` with:

```tsx
import {
  Button,
  GitHubCard,
  ScrollTextLines,
  TickerText,
  UsageCard,
} from "@/components/ui";
import {
  ScrollGridAnimation,
  MagneticWrapper,
  LinkHover,
  ProjectShowcase,
  TerminalHero,
} from "@/components/effects";
import { projects } from "@/data/projects";

export default function Home() {
  return (
    <main>
      {/* Hero — terminal boot sequence */}
      <TerminalHero />

      {/* Ticker — full bleed */}
      <section className="mb-[var(--space-3xl)]">
        <TickerText
          items={["IOS APPS", "SHOPIFY TOOLS", "AI PIPELINES", "VIDEO AUTOMATION", "WEB APPS", "CONTENT SYSTEMS"]}
        />
      </section>

      {/* Intro — constrained */}
      <div className="mx-auto max-w-[960px] px-[var(--space-md)] md:px-[var(--space-lg)]">
        <section className="mb-[var(--space-4xl)]">
          <ScrollTextLines className="max-w-[480px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
            I&apos;m Alex Mazza, a solo indie developer who builds things from concept to production. I care about clean interfaces, thoughtful systems, and shipping work that holds up.
          </ScrollTextLines>
        </section>
      </div>

      {/* Projects — full bleed */}
      <ProjectShowcase projects={projects} className="mb-[var(--space-4xl)]" />

      {/* Activity + CTA — constrained */}
      <div className="mx-auto max-w-[960px] px-[var(--space-md)] md:px-[var(--space-lg)] pb-[var(--space-2xl)] md:pb-[var(--space-4xl)]">
        <section className="mb-[var(--space-4xl)]">
          <ScrollGridAnimation className="grid grid-cols-1 gap-[var(--space-md)] md:grid-cols-2" stagger={0.15}>
            <UsageCard compact />
            <GitHubCard compact />
          </ScrollGridAnimation>
        </section>

        <section className="flex justify-center">
          <MagneticWrapper>
            <LinkHover href="/contact" className="no-underline">
              <Button>Get in touch</Button>
            </LinkHover>
          </MagneticWrapper>
        </section>
      </div>

      {/* Attribution */}
      <footer className="mx-auto max-w-[960px] px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-xl)]">
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          3D models:{" "}
          <a
            href="https://sketchfab.com/3d-models/iphone-17-pro-max-87fc1df741384124a8ce0226d2b2058d"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            iPhone 17 Pro Max
          </a>{" "}
          by MajdyModels,{" "}
          <a
            href="https://sketchfab.com/3d-models/macbook-pro-m3-16-inch-2024-8e34fc2b303144f78490007d91ff57c4"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            MacBook Pro M3
          </a>{" "}
          by jackbaeten — CC-BY-4.0
        </p>
      </footer>
    </main>
  );
}
```

Key changes from original:
- Removed `SplitTextScatter` and `ScrollLetterAnimation` imports (no longer used in this file)
- Removed the hero `<div>` containing `SplitTextScatter` + subtitle `ScrollLetterAnimation`
- Added `TerminalHero` import and placed it as first child of `<main>`
- Everything from the ticker section onward is unchanged

- [ ] **Step 3: Verify full integration**

Run: `npm run dev`

Navigate to `http://localhost:3000`. Confirm:
- Boot sequence plays, then reveals "MAZZA BUILDS" / "building things that work"
- After hero, ticker section follows with correct spacing
- Scrolling past the hero shows the rest of the page (intro, projects, activity cards, CTA, footer)
- Nav menu button appears after the reveal
- No console errors
- Page transitions still work (navigate to /about and back)

- [ ] **Step 4: Verify the build passes**

Run: `npm run build`

Expected: Build succeeds with no TypeScript or lint errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/effects/index.ts src/components/effects/TerminalHero.tsx src/app/page.tsx
git commit -m "feat: integrate TerminalHero into homepage, replace SplitTextScatter hero"
```
