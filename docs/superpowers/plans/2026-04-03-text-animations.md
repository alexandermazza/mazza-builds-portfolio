# Text Animation Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 4 Framer Motion text animation components (SplitTextScatter, TextReveal, ScrollTextLines, TickerText) for the Mazza Builds portfolio.

**Architecture:** Each component is a self-contained `"use client"` file in `src/components/ui/` using constants from `src/lib/motion.ts`. All respect `prefers-reduced-motion`. Components are added to the barrel export and previewed in the design system page.

**Tech Stack:** React 19, Framer Motion (`motion/react`), TypeScript, Tailwind CSS v4, Next.js 16

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/components/ui/TextReveal.tsx` | Word-by-word scroll-triggered reveal |
| Create | `src/components/ui/ScrollTextLines.tsx` | Line-by-line scroll-triggered reveal |
| Create | `src/components/ui/SplitTextScatter.tsx` | Hero scatter/converge on mount |
| Create | `src/components/ui/TickerText.tsx` | Infinite horizontal text loop |
| Modify | `src/components/ui/index.ts` | Add barrel exports |
| Modify | `src/app/page.tsx` | Add preview sections for all 4 |

---

### Task 1: TextReveal

**Files:**
- Create: `src/components/ui/TextReveal.tsx`

- [ ] **Step 1: Create TextReveal component**

```tsx
"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { DURATION, EASE_OUT_MOTION, TEXT_REVEAL_STAGGER } from "@/lib/motion";

type TextRevealElement = "h2" | "h3" | "p" | "span";

interface TextRevealProps {
  children: string;
  as?: TextRevealElement;
  className?: string;
}

export function TextReveal({
  children,
  as: Tag = "p",
  className = "",
}: TextRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const words = children.split(" ");

  // motion.h2, motion.h3, etc.
  const MotionTag = motion.create(Tag);

  return (
    <MotionTag ref={ref} className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{
            duration: DURATION.transition,
            ease: EASE_OUT_MOTION,
            delay: i * TEXT_REVEAL_STAGGER,
          }}
          style={{ display: "inline-block" }}
        >
          {word}
          {i < words.length - 1 && "\u00A0"}
        </motion.span>
      ))}
    </MotionTag>
  );
}
```

- [ ] **Step 2: Add to barrel export**

Add this line to `src/components/ui/index.ts` in alphabetical order:

```ts
export { TextReveal } from "./TextReveal";
```

- [ ] **Step 3: Add preview section to page.tsx**

Add this section after the "TAG CHIPS" section in `src/app/page.tsx`:

Import `TextReveal` in the import line at the top:
```tsx
import { Button, GitHubCard, ProjectCard, StatusBadge, TagChip, TextReveal, UsageCard } from "@/components/ui";
```

Add the section (before "Project cards"):
```tsx
      {/* Text reveal */}
      <section className="mb-[var(--space-3xl)]">
        <p className="mb-[var(--space-md)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
          TEXT REVEAL
        </p>
        <TextReveal as="h2" className="font-sans text-[var(--heading)] leading-[1.2] tracking-[-0.01em] text-[var(--text-display)]">
          // PROJECTS
        </TextReveal>
        <div className="mt-[var(--space-md)]" />
        <TextReveal as="h3" className="font-sans text-[var(--subheading)] leading-[1.3] text-[var(--text-primary)]">
          Words reveal one at a time on scroll
        </TextReveal>
      </section>
```

- [ ] **Step 4: Verify in browser**

Run: The dev server is already running at `http://localhost:3000`.
Scroll down to the "TEXT REVEAL" section and confirm words fade+slide in individually when the section enters the viewport. Scrolling back up should not re-trigger (once: true).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/TextReveal.tsx src/components/ui/index.ts src/app/page.tsx
git commit -m "feat: add TextReveal component — word-by-word scroll reveal"
```

---

### Task 2: ScrollTextLines

**Files:**
- Create: `src/components/ui/ScrollTextLines.tsx`

- [ ] **Step 1: Create ScrollTextLines component**

```tsx
"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { DURATION, EASE_OUT_MOTION, LINE_REVEAL_STAGGER } from "@/lib/motion";

interface ScrollTextLinesProps {
  children: string;
  className?: string;
}

function splitIntoLines(text: string): string[] {
  // Split on explicit newlines first
  if (text.includes("\n")) {
    return text.split("\n").filter((line) => line.trim().length > 0);
  }
  // Otherwise split on sentence boundaries (keep the period)
  const sentences = text.match(/[^.!?]+[.!?]+\s*/g);
  if (sentences && sentences.length > 1) {
    return sentences.map((s) => s.trim());
  }
  // Single sentence — return as-is
  return [text];
}

export function ScrollTextLines({
  children,
  className = "",
}: ScrollTextLinesProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  const lines = splitIntoLines(children);

  return (
    <div ref={ref} className={className}>
      {lines.map((line, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{
            duration: DURATION.transition,
            ease: EASE_OUT_MOTION,
            delay: i * LINE_REVEAL_STAGGER,
          }}
          style={{ display: "block" }}
        >
          {line}
        </motion.span>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Add to barrel export**

Add to `src/components/ui/index.ts`:

```ts
export { ScrollTextLines } from "./ScrollTextLines";
```

- [ ] **Step 3: Add preview section to page.tsx**

Update the import line:
```tsx
import { Button, GitHubCard, ProjectCard, ScrollTextLines, StatusBadge, TagChip, TextReveal, UsageCard } from "@/components/ui";
```

Add section after the "TEXT REVEAL" section:
```tsx
      {/* Scroll text lines */}
      <section className="mb-[var(--space-3xl)]">
        <p className="mb-[var(--space-md)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
          SCROLL TEXT LINES
        </p>
        <ScrollTextLines className="max-w-[480px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
          I'm Alex Mazza, a solo indie developer who builds things from concept to production. I care about clean interfaces, thoughtful systems, and shipping work that holds up.
        </ScrollTextLines>
      </section>
```

- [ ] **Step 4: Verify in browser**

Scroll to the "SCROLL TEXT LINES" section. Each sentence should fade+slide in independently with a stagger between them.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/ScrollTextLines.tsx src/components/ui/index.ts src/app/page.tsx
git commit -m "feat: add ScrollTextLines component — line-by-line scroll reveal"
```

---

### Task 3: SplitTextScatter

**Files:**
- Create: `src/components/ui/SplitTextScatter.tsx`

- [ ] **Step 1: Create SplitTextScatter component**

```tsx
"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  DURATION,
  EASE_OUT_MOTION,
  LINE_REVEAL_STAGGER,
  SPRING_FLUID,
} from "@/lib/motion";

interface SplitTextScatterProps {
  text: string;
  className?: string;
}

// Deterministic pseudo-random based on index (no Math.random)
function seededOffset(index: number, range: number): number {
  const x = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  const normalized = x - Math.floor(x); // 0..1
  return (normalized - 0.5) * 2 * range; // -range..+range
}

const CHAR_STAGGER = 0.02;

export function SplitTextScatter({
  text,
  className = "",
}: SplitTextScatterProps) {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    setIsDesktop(window.matchMedia("(min-width: 768px)").matches);
  }, []);

  // SSR / first render: show nothing until we know the mode
  if (isDesktop === null) {
    return (
      <h1 className={className} style={{ visibility: "hidden" }}>
        {text}
      </h1>
    );
  }

  const words = text.split(" ");

  // ─── Mobile: line-by-line fade + slide ─────────────────────────────
  if (!isDesktop) {
    return (
      <h1 className={className}>
        {words.map((word, wi) => (
          <motion.span
            key={wi}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: DURATION.transition,
              ease: EASE_OUT_MOTION,
              delay: wi * LINE_REVEAL_STAGGER,
            }}
            style={{ display: "inline-block" }}
          >
            {word}
            {wi < words.length - 1 && "\u00A0"}
          </motion.span>
        ))}
      </h1>
    );
  }

  // ─── Desktop: character scatter ────────────────────────────────────
  let charIndex = 0;

  return (
    <h1 className={className}>
      {words.map((word, wi) => (
        <span key={wi} style={{ display: "inline-block", whiteSpace: "pre" }}>
          {word.split("").map((char) => {
            const ci = charIndex++;
            const offsetX = seededOffset(ci, 50);
            const offsetY = seededOffset(ci + 100, 50);
            const rotation = seededOffset(ci + 200, 15);

            return (
              <motion.span
                key={ci}
                initial={{
                  opacity: 0,
                  x: offsetX,
                  y: offsetY,
                  rotate: rotation,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                  y: 0,
                  rotate: 0,
                }}
                transition={{
                  ...SPRING_FLUID,
                  delay: ci * CHAR_STAGGER,
                }}
                style={{ display: "inline-block" }}
              >
                {char}
              </motion.span>
            );
          })}
          {wi < words.length - 1 && (
            <span style={{ display: "inline-block" }}>{"\u00A0"}</span>
          )}
        </span>
      ))}
    </h1>
  );
}
```

- [ ] **Step 2: Add to barrel export**

Add to `src/components/ui/index.ts`:

```ts
export { SplitTextScatter } from "./SplitTextScatter";
```

- [ ] **Step 3: Add preview section to page.tsx**

Update the import line:
```tsx
import { Button, GitHubCard, ProjectCard, ScrollTextLines, SplitTextScatter, StatusBadge, TagChip, TextReveal, UsageCard } from "@/components/ui";
```

Add section at the TOP of the main content (right after the "DESIGN SYSTEM PREVIEW" label):
```tsx
      {/* Split text scatter */}
      <section className="mb-[var(--space-3xl)]">
        <p className="mb-[var(--space-md)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
          SPLIT TEXT SCATTER
        </p>
        <SplitTextScatter
          text="MAZZA BUILDS"
          className="font-sans text-[clamp(48px,12vw,96px)] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]"
        />
      </section>
```

- [ ] **Step 4: Verify in browser**

Reload the page. On desktop: characters should start scattered (displaced ~50px, slightly rotated) and converge into "MAZZA BUILDS" with a spring snap. On mobile (resize below 768px and reload): words should fade+slide in sequentially.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/SplitTextScatter.tsx src/components/ui/index.ts src/app/page.tsx
git commit -m "feat: add SplitTextScatter component — desktop scatter, mobile fade"
```

---

### Task 4: TickerText

**Files:**
- Create: `src/components/ui/TickerText.tsx`

- [ ] **Step 1: Create TickerText component**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { TICKER_SPEED } from "@/lib/motion";

interface TickerTextProps {
  items: string[];
  speed?: number;
  className?: string;
}

export function TickerText({
  items,
  speed = TICKER_SPEED,
  className = "",
}: TickerTextProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState<number>(0);

  useEffect(() => {
    if (!trackRef.current) return;
    // Measure the width of one set of items (first half of children)
    const firstHalf = trackRef.current.scrollWidth / 2;
    setDuration(firstHalf / speed);
  }, [items, speed]);

  const itemElements = items.map((item, i) => (
    <span key={i} className="inline-flex items-center">
      <span
        className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)] transition-colors hover:text-[var(--text-primary)]"
        style={{ transitionDuration: "var(--duration-micro)" }}
      >
        {item}
      </span>
      <span
        className="mx-[var(--space-md)] text-[11px] text-[var(--text-disabled)] select-none"
        aria-hidden="true"
      >
        ·
      </span>
    </span>
  ));

  return (
    <div className={`overflow-hidden ${className}`}>
      <div
        ref={trackRef}
        className="inline-flex whitespace-nowrap"
        style={{
          animation:
            duration > 0
              ? `ticker ${duration}s linear infinite`
              : undefined,
        }}
      >
        {/* Two copies for seamless loop */}
        <div className="inline-flex">{itemElements}</div>
        <div className="inline-flex" aria-hidden="true">
          {itemElements}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add ticker keyframe to globals.css**

Add this at the bottom of `src/app/globals.css`, before the `@media (prefers-reduced-motion)` block:

```css
@keyframes ticker {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}
```

The existing `prefers-reduced-motion` block already sets `animation-duration: 0.01ms !important`, so the ticker will effectively freeze for users who prefer reduced motion.

- [ ] **Step 3: Add to barrel export**

Add to `src/components/ui/index.ts`:

```ts
export { TickerText } from "./TickerText";
```

- [ ] **Step 4: Add preview section to page.tsx**

Update the import line:
```tsx
import { Button, GitHubCard, ProjectCard, ScrollTextLines, SplitTextScatter, StatusBadge, TagChip, TextReveal, TickerText, UsageCard } from "@/components/ui";
```

Add section after the "SPLIT TEXT SCATTER" section:
```tsx
      {/* Ticker text */}
      <section className="mb-[var(--space-3xl)]">
        <p className="mb-[var(--space-md)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
          TICKER TEXT
        </p>
        <TickerText
          items={["IOS APPS", "SHOPIFY TOOLS", "AI PIPELINES", "VIDEO AUTOMATION", "WEB APPS", "CONTENT SYSTEMS"]}
        />
      </section>
```

- [ ] **Step 5: Verify in browser**

Reload the page. The ticker should scroll continuously left-to-right. Items are separated by centered dots. Hovering an item should brighten it to `--text-primary`. The loop should be seamless with no jump.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/TickerText.tsx src/app/globals.css src/components/ui/index.ts src/app/page.tsx
git commit -m "feat: add TickerText component — infinite horizontal scroll loop"
```

---

### Task 5: Build verification

- [ ] **Step 1: Run production build**

```bash
npx next build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 2: Full visual check**

Open `http://localhost:3000` and verify all 4 components:
1. SplitTextScatter — characters scatter in from displaced positions
2. TickerText — smooth infinite horizontal scroll, hover brightens items
3. TextReveal — words stagger in on scroll
4. ScrollTextLines — sentences stagger in on scroll

- [ ] **Step 3: Final commit if any fixes needed**

Only if adjustments were made in steps 1-2.
