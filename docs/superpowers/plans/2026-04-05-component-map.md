# Component Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full effect layer, UI primitives, page compositions, and global elements defined in the component map spec.

**Architecture:** Two-tier approach — reusable effect components in `src/components/effects/` wrap children with animation behaviors, composed into pages alongside existing UI primitives from `src/components/ui/`. Global elements (CrosshairCursor, ExpandingMenu) mount once in the root layout.

**Tech Stack:** Next.js App Router, Framer Motion (`motion/react`), GSAP (transitions only), Tailwind CSS v4, CSS custom properties from `src/styles/tokens.css`

**Spec:** `docs/superpowers/specs/2026-04-05-component-map-design.md`

---

## Codebase Patterns (read before implementing)

**Imports:** Use `motion/react` (NOT `framer-motion`). Use `@/lib/motion` for constants. Use `@/transitions` for TransitionLink/Provider.

**Components:** Every component is `"use client"`. Props extend `ComponentProps<"element">` where applicable. Default `className = ""`. Export named functions (not default exports).

**Barrel exports:** `src/components/ui/index.ts` and (new) `src/components/effects/index.ts` use `export { Name } from "./Name"` pattern.

**CSS:** Use CSS custom properties via `var(--token)` in className strings or style props. Tailwind for layout/spacing. Tokens defined in `src/styles/tokens.css`.

**Motion:** Spring configs and durations come from `src/lib/motion.ts`. Scroll-triggered animations use `useInView(ref, { once: true, margin: "-60px" })`. Framer Motion `motion.span`/`motion.div` for animated elements.

**Reduced motion:** Check `window.matchMedia("(prefers-reduced-motion: reduce)")` in useEffect, or use Framer Motion's built-in handling.

**No test framework.** Verification = `next build` succeeds + visual check in dev server.

---

## Phase 1: Foundation

### Task 1: Add motion constants for new effects

**Files:**
- Modify: `src/lib/motion.ts`

- [ ] **Step 1: Add new constants to motion.ts**

Add these after the existing constants in `src/lib/motion.ts`:

```ts
/** Per-character stagger for ScrollLetterAnimation */
export const LETTER_ANIMATION_STAGGER = 0.03;

/** Per-item stagger for ScrollGridAnimation */
export const GRID_ITEM_STAGGER = 0.1;

/** Default magnetic pull strength (0-1) */
export const MAGNETIC_STRENGTH = 0.4;

/** Default magnetic activation radius in px */
export const MAGNETIC_RADIUS = 150;

/** Menu item stagger for ExpandingMenu */
export const MENU_ITEM_STAGGER = 0.08;
```

- [ ] **Step 2: Verify build**

Run: `cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx next build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/motion.ts
git commit -m "feat: add motion constants for new effect components"
```

---

### Task 2: Create effects directory and barrel export

**Files:**
- Create: `src/components/effects/index.ts`

- [ ] **Step 1: Create the barrel export file**

```ts
// Effects barrel — add exports as components are built
```

- [ ] **Step 2: Verify build**

Run: `cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx next build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/effects/index.ts
git commit -m "feat: create effects directory with barrel export"
```

---

## Phase 2: Effect Components

### Task 3: LinkHover

CSS-only animated underline wrapper for links. Simplest effect — no JS animation.

**Files:**
- Create: `src/components/effects/LinkHover.tsx`
- Modify: `src/components/effects/index.ts`

- [ ] **Step 1: Create LinkHover component**

```tsx
"use client";

import { type ComponentProps } from "react";
import { TransitionLink } from "@/transitions";

interface LinkHoverProps extends Omit<ComponentProps<typeof TransitionLink>, "ref"> {
  children: React.ReactNode;
}

export function LinkHover({ children, className = "", ...props }: LinkHoverProps) {
  return (
    <TransitionLink
      className={`group relative inline-block ${className}`}
      {...props}
    >
      {children}
      <span
        className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-[var(--text-primary)] transition-transform group-hover:scale-x-100"
        style={{
          transitionDuration: "var(--duration-transition)",
          transitionTimingFunction: "var(--ease-out)",
        }}
      />
    </TransitionLink>
  );
}
```

- [ ] **Step 2: Add to barrel export**

Add to `src/components/effects/index.ts`:

```ts
export { LinkHover } from "./LinkHover";
```

- [ ] **Step 3: Verify build**

Run: `cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx next build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/effects/LinkHover.tsx src/components/effects/index.ts
git commit -m "feat: add LinkHover effect — CSS animated underline for links"
```

---

### Task 4: ScrollLetterAnimation

Per-character scroll-triggered animation with vertical translate + opacity. Similar pattern to TextReveal but per-character with Y movement.

**Files:**
- Create: `src/components/effects/ScrollLetterAnimation.tsx`
- Modify: `src/components/effects/index.ts`

- [ ] **Step 1: Create ScrollLetterAnimation component**

```tsx
"use client";

import { useRef } from "react";
import type React from "react";
import { motion, useInView } from "motion/react";
import { DURATION, EASE_OUT_MOTION, LETTER_ANIMATION_STAGGER } from "@/lib/motion";

type ElementTag = "h1" | "h2" | "h3" | "p";

interface ScrollLetterAnimationProps {
  children: string;
  as?: ElementTag;
  stagger?: number;
  className?: string;
}

const motionElements = {
  h1: motion.create("h1"),
  h2: motion.create("h2"),
  h3: motion.create("h3"),
  p: motion.create("p"),
} as const;

export function ScrollLetterAnimation({
  children,
  as: Tag = "h2",
  stagger = LETTER_ANIMATION_STAGGER,
  className = "",
}: ScrollLetterAnimationProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  const MotionTag = motionElements[Tag];
  const chars = children.split("");

  return (
    <MotionTag ref={ref as React.Ref<never>} className={className} aria-label={children}>
      {chars.map((char, i) => (
        <motion.span
          key={`${char}-${i}`}
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : undefined}
          transition={{
            duration: DURATION.transition,
            ease: EASE_OUT_MOTION,
            delay: i * stagger,
          }}
          style={{ display: "inline-block" }}
          aria-hidden="true"
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </MotionTag>
  );
}
```

- [ ] **Step 2: Add to barrel export**

Add to `src/components/effects/index.ts`:

```ts
export { ScrollLetterAnimation } from "./ScrollLetterAnimation";
```

- [ ] **Step 3: Verify build**

Run: `cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx next build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/effects/ScrollLetterAnimation.tsx src/components/effects/index.ts
git commit -m "feat: add ScrollLetterAnimation — per-character scroll reveal"
```

---

### Task 5: ScrollGridAnimation

Wraps grid children with staggered scroll-triggered entrance animations.

**Files:**
- Create: `src/components/effects/ScrollGridAnimation.tsx`
- Modify: `src/components/effects/index.ts`

- [ ] **Step 1: Create ScrollGridAnimation component**

```tsx
"use client";

import { useRef, Children } from "react";
import { motion, useInView } from "motion/react";
import { DURATION, EASE_OUT_MOTION, GRID_ITEM_STAGGER } from "@/lib/motion";

type Variant = "fade-up" | "scale" | "slide-in";

interface ScrollGridAnimationProps {
  children: React.ReactNode;
  stagger?: number;
  variant?: Variant;
  className?: string;
}

const variants: Record<Variant, { initial: object; animate: object }> = {
  "fade-up": {
    initial: { opacity: 0, y: 32 },
    animate: { opacity: 1, y: 0 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.92 },
    animate: { opacity: 1, scale: 1 },
  },
  "slide-in": {
    initial: { opacity: 0, x: -24 },
    animate: { opacity: 1, x: 0 },
  },
};

export function ScrollGridAnimation({
  children,
  stagger = GRID_ITEM_STAGGER,
  variant = "fade-up",
  className = "",
}: ScrollGridAnimationProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  const { initial, animate } = variants[variant];

  return (
    <div ref={ref} className={className}>
      {Children.map(children, (child, i) => (
        <motion.div
          key={i}
          initial={initial}
          animate={isInView ? animate : undefined}
          transition={{
            duration: DURATION.transition,
            ease: EASE_OUT_MOTION,
            delay: i * stagger,
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Add to barrel export**

Add to `src/components/effects/index.ts`:

```ts
export { ScrollGridAnimation } from "./ScrollGridAnimation";
```

- [ ] **Step 3: Verify build**

Run: `cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx next build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/effects/ScrollGridAnimation.tsx src/components/effects/index.ts
git commit -m "feat: add ScrollGridAnimation — staggered grid entrance on scroll"
```

---

### Task 6: MagneticWrapper

Child element pulls toward cursor on hover. Desktop only. Sets `data-magnetic` for CrosshairCursor coordination.

**Files:**
- Create: `src/components/effects/MagneticWrapper.tsx`
- Modify: `src/components/effects/index.ts`

- [ ] **Step 1: Create MagneticWrapper component**

```tsx
"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { SPRING_SNAPPY, MAGNETIC_STRENGTH, MAGNETIC_RADIUS } from "@/lib/motion";

interface MagneticWrapperProps {
  children: React.ReactNode;
  strength?: number;
  radius?: number;
  className?: string;
}

export function MagneticWrapper({
  children,
  strength = MAGNETIC_STRENGTH,
  radius = MAGNETIC_RADIUS,
  className = "",
}: MagneticWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isTouch, setIsTouch] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, SPRING_SNAPPY);
  const springY = useSpring(y, SPRING_SNAPPY);

  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isTouch) return;
      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < radius) {
        const pull = (1 - distance / radius) * strength;
        x.set(dx * pull);
        y.set(dy * pull);
      }
    },
    [isTouch, radius, strength, x, y]
  );

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.div
      ref={ref}
      data-magnetic
      className={`inline-block ${className}`}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Add to barrel export**

Add to `src/components/effects/index.ts`:

```ts
export { MagneticWrapper } from "./MagneticWrapper";
```

- [ ] **Step 3: Verify build**

Run: `cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx next build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/effects/MagneticWrapper.tsx src/components/effects/index.ts
git commit -m "feat: add MagneticWrapper — cursor-attracted interactive wrapper"
```

---

### Task 7: CrosshairCursor

Global custom cursor. Monoline crosshair that tracks pointer. Reacts to `[data-magnetic]` elements.

**Files:**
- Create: `src/components/effects/CrosshairCursor.tsx`
- Modify: `src/components/effects/index.ts`

- [ ] **Step 1: Create CrosshairCursor component**

```tsx
"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { SPRING_SNAPPY } from "@/lib/motion";

interface CrosshairCursorProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function CrosshairCursor({
  size = 32,
  color = "var(--text-secondary)",
  strokeWidth = 1,
}: CrosshairCursorProps) {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isTouch, setIsTouch] = useState(true); // default hidden

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  const springX = useSpring(mouseX, SPRING_SNAPPY);
  const springY = useSpring(mouseY, SPRING_SNAPPY);

  useEffect(() => {
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
    setIsTouch(isTouchDevice);
    if (isTouchDevice) return;

    // Hide default cursor globally
    document.documentElement.style.cursor = "none";

    function handleMouseMove(e: MouseEvent) {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      setVisible(true);
    }

    function handleMouseLeave() {
      setVisible(false);
    }

    // Magnetic element detection via event delegation
    function handlePointerOver(e: PointerEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-magnetic]")) {
        setExpanded(true);
      }
    }

    function handlePointerOut(e: PointerEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-magnetic]")) {
        setExpanded(false);
      }
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("pointerover", handlePointerOver);
    document.addEventListener("pointerout", handlePointerOut);

    return () => {
      document.documentElement.style.cursor = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("pointerover", handlePointerOver);
      document.removeEventListener("pointerout", handlePointerOut);
    };
  }, [mouseX, mouseY]);

  if (isTouch) return null;

  const half = size / 2;
  const expandedSize = size * 1.5;
  const currentSize = expanded ? expandedSize : size;

  return (
    <motion.div
      className="pointer-events-none fixed top-0 left-0 z-[9999]"
      style={{
        x: springX,
        y: springY,
        translateX: "-50%",
        translateY: "-50%",
        opacity: visible ? 1 : 0,
      }}
    >
      <svg
        width={expandedSize}
        height={expandedSize}
        viewBox={`0 0 ${expandedSize} ${expandedSize}`}
        fill="none"
      >
        {/* Crosshair lines */}
        <line
          x1={expandedSize / 2 - currentSize / 2}
          y1={expandedSize / 2}
          x2={expandedSize / 2 + currentSize / 2}
          y2={expandedSize / 2}
          stroke={color}
          strokeWidth={strokeWidth}
          style={{ transition: "all 0.15s var(--ease-out)" }}
        />
        <line
          x1={expandedSize / 2}
          y1={expandedSize / 2 - currentSize / 2}
          x2={expandedSize / 2}
          y2={expandedSize / 2 + currentSize / 2}
          stroke={color}
          strokeWidth={strokeWidth}
          style={{ transition: "all 0.15s var(--ease-out)" }}
        />
        {/* Circle appears on magnetic hover */}
        {expanded && (
          <circle
            cx={expandedSize / 2}
            cy={expandedSize / 2}
            r={half * 0.8}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            style={{
              transition: "all 0.15s var(--ease-out)",
            }}
          />
        )}
      </svg>
    </motion.div>
  );
}
```

- [ ] **Step 2: Add to barrel export**

Add to `src/components/effects/index.ts`:

```ts
export { CrosshairCursor } from "./CrosshairCursor";
```

- [ ] **Step 3: Verify build**

Run: `cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx next build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/effects/CrosshairCursor.tsx src/components/effects/index.ts
git commit -m "feat: add CrosshairCursor — global monoline crosshair with magnetic detection"
```

---

### Task 8: ScrollVelocityOffset

Children shift based on scroll velocity for a "dragging through space" feel.

**Files:**
- Create: `src/components/effects/ScrollVelocityOffset.tsx`
- Modify: `src/components/effects/index.ts`

- [ ] **Step 1: Create ScrollVelocityOffset component**

```tsx
"use client";

import { motion, useScroll, useVelocity, useTransform, useSpring } from "motion/react";
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
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);

  // Clamp velocity to prevent extreme offsets
  const clampedVelocity = useTransform(scrollVelocity, [-3000, 0, 3000], [-1, 0, 1]);
  const offset = useTransform(clampedVelocity, (v) => v * multiplier * 40);
  const smoothOffset = useSpring(offset, SPRING_FLUID);

  const style =
    axis === "y" ? { y: smoothOffset } : { x: smoothOffset };

  return (
    <motion.div className={className} style={style}>
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Add to barrel export**

Add to `src/components/effects/index.ts`:

```ts
export { ScrollVelocityOffset } from "./ScrollVelocityOffset";
```

- [ ] **Step 3: Verify build**

Run: `cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx next build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/effects/ScrollVelocityOffset.tsx src/components/effects/index.ts
git commit -m "feat: add ScrollVelocityOffset — scroll-velocity-linked position shift"
```

---

### Task 9: ConnectedGrid

Grid with SVG connecting lines between items that draw on scroll enter.

**Files:**
- Create: `src/components/effects/ConnectedGrid.tsx`
- Modify: `src/components/effects/index.ts`

- [ ] **Step 1: Create ConnectedGrid component**

```tsx
"use client";

import { useRef, useEffect, useState, Children, useCallback } from "react";
import { motion, useInView } from "motion/react";
import { DURATION, EASE_OUT_MOTION, GRID_ITEM_STAGGER } from "@/lib/motion";

interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface ConnectedGridProps {
  children: React.ReactNode;
  columns?: number;
  lineColor?: string;
  className?: string;
}

export function ConnectedGrid({
  children,
  columns = 2,
  lineColor = "var(--border-visible)",
  className = "",
}: ConnectedGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const isInView = useInView(containerRef, { once: true, margin: "-60px" });

  const childArray = Children.toArray(children);

  // Resize refs array
  if (itemRefs.current.length !== childArray.length) {
    itemRefs.current = new Array(childArray.length).fill(null);
  }

  const computeLines = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const computed: Line[] = [];
    const rects = itemRefs.current.map((el) =>
      el ? el.getBoundingClientRect() : null
    );
    const containerRect = container.getBoundingClientRect();

    for (let i = 0; i < rects.length; i++) {
      const a = rects[i];
      if (!a) continue;

      // Connect to right neighbor
      if ((i + 1) % columns !== 0 && i + 1 < rects.length) {
        const b = rects[i + 1];
        if (b) {
          computed.push({
            x1: a.right - containerRect.left,
            y1: a.top + a.height / 2 - containerRect.top,
            x2: b.left - containerRect.left,
            y2: b.top + b.height / 2 - containerRect.top,
          });
        }
      }

      // Connect to bottom neighbor
      if (i + columns < rects.length) {
        const b = rects[i + columns];
        if (b) {
          computed.push({
            x1: a.left + a.width / 2 - containerRect.left,
            y1: a.bottom - containerRect.top,
            x2: b.left + b.width / 2 - containerRect.left,
            y2: b.top - containerRect.top,
          });
        }
      }
    }

    setLines(computed);
  }, [columns]);

  useEffect(() => {
    computeLines();
    const ro = new ResizeObserver(computeLines);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [computeLines, childArray.length]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* SVG lines */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ overflow: "visible" }}>
        {lines.map((line, i) => {
          const length = Math.sqrt(
            (line.x2 - line.x1) ** 2 + (line.y2 - line.y1) ** 2
          );
          return (
            <motion.line
              key={`${line.x1}-${line.y1}-${line.x2}-${line.y2}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={lineColor}
              strokeWidth={1}
              strokeDasharray={length}
              initial={{ strokeDashoffset: length }}
              animate={isInView ? { strokeDashoffset: 0 } : undefined}
              transition={{
                duration: DURATION.transition * 2,
                ease: EASE_OUT_MOTION,
                delay: i * 0.1,
              }}
            />
          );
        })}
      </svg>

      {/* Grid items */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: "var(--space-lg)",
        }}
      >
        {childArray.map((child, i) => (
          <motion.div
            key={i}
            ref={(el) => { itemRefs.current[i] = el; }}
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : undefined}
            transition={{
              duration: DURATION.transition,
              ease: EASE_OUT_MOTION,
              delay: i * GRID_ITEM_STAGGER,
            }}
          >
            {child}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add to barrel export**

Add to `src/components/effects/index.ts`:

```ts
export { ConnectedGrid } from "./ConnectedGrid";
```

- [ ] **Step 3: Verify build**

Run: `cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx next build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/effects/ConnectedGrid.tsx src/components/effects/index.ts
git commit -m "feat: add ConnectedGrid — grid with SVG connecting lines on scroll"
```

---

### Task 10: ExpandingMenu

Floating trigger that expands to full-screen nav overlay. Uses Framer Motion AnimatePresence + clip-path.

**Files:**
- Create: `src/components/effects/ExpandingMenu.tsx`
- Modify: `src/components/effects/index.ts`

- [ ] **Step 1: Create ExpandingMenu component**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TransitionLink } from "@/transitions";
import { DURATION, EASE_OUT_MOTION, MENU_ITEM_STAGGER } from "@/lib/motion";

interface MenuItem {
  label: string;
  href: string;
}

interface ExpandingMenuProps {
  items: MenuItem[];
  className?: string;
}

export function ExpandingMenu({ items, className = "" }: ExpandingMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  // Prevent scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <div className={className}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-[var(--space-lg)] right-[var(--space-lg)] z-[9998] flex h-[44px] w-[44px] items-center justify-center rounded-full border border-[var(--border-visible)] bg-[var(--surface)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)] transition-colors hover:border-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        style={{
          transitionDuration: "var(--duration-micro)",
          transitionTimingFunction: "var(--ease-out)",
        }}
        aria-label="Open menu"
      >
        <span className="sr-only">Menu</span>
        {/* Dot icon */}
        <span className="block h-[6px] w-[6px] rounded-full bg-current" />
      </button>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[9998] flex flex-col items-center justify-center"
            style={{ backgroundColor: "var(--surface)", opacity: 0.97 }}
            initial={
              reducedMotion
                ? { opacity: 0 }
                : { clipPath: "circle(0% at calc(100% - 44px) calc(100% - 44px))" }
            }
            animate={
              reducedMotion
                ? { opacity: 1 }
                : { clipPath: "circle(150% at calc(100% - 44px) calc(100% - 44px))" }
            }
            exit={
              reducedMotion
                ? { opacity: 0 }
                : { clipPath: "circle(0% at calc(100% - 44px) calc(100% - 44px))" }
            }
            transition={{
              duration: reducedMotion ? 0 : 0.6,
              ease: EASE_OUT_MOTION,
            }}
          >
            {/* Close button */}
            <button
              onClick={close}
              className="absolute top-[var(--space-lg)] right-[var(--space-lg)] flex h-[44px] w-[44px] items-center justify-center font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              aria-label="Close menu"
            >
              ✕
            </button>

            {/* Menu items */}
            <nav className="flex flex-col items-center gap-[var(--space-xl)]">
              {items.map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: DURATION.transition,
                    ease: EASE_OUT_MOTION,
                    delay: (reducedMotion ? 0 : 0.3) + i * MENU_ITEM_STAGGER,
                  }}
                >
                  <TransitionLink
                    href={item.href}
                    onClick={close}
                    className="block font-mono text-[clamp(24px,5vw,48px)] uppercase tracking-[0.06em] text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]"
                    style={{
                      transitionDuration: "var(--duration-micro)",
                      transitionTimingFunction: "var(--ease-out)",
                    }}
                  >
                    {item.label}
                  </TransitionLink>
                </motion.div>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Add to barrel export**

Add to `src/components/effects/index.ts`:

```ts
export { ExpandingMenu } from "./ExpandingMenu";
```

- [ ] **Step 3: Verify build**

Run: `cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx next build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/effects/ExpandingMenu.tsx src/components/effects/index.ts
git commit -m "feat: add ExpandingMenu — floating trigger with full-screen clip-path overlay"
```

---

## Phase 3: UI Primitives

### Task 11: Input, Textarea, FormStatus

Nothing-styled form components for the Contact page.

**Files:**
- Create: `src/components/ui/Input.tsx`
- Create: `src/components/ui/Textarea.tsx`
- Create: `src/components/ui/FormStatus.tsx`
- Modify: `src/components/ui/index.ts`

- [ ] **Step 1: Create Input component**

```tsx
"use client";

import { type ComponentProps } from "react";

interface InputProps extends ComponentProps<"input"> {
  label: string;
}

export function Input({ label, className = "", id, ...props }: InputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className="mb-[var(--space-xs)] block font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]"
      >
        {label}
      </label>
      <input
        id={inputId}
        className="w-full border-b border-[var(--border)] bg-transparent py-[var(--space-sm)] font-sans text-[var(--body)] text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--text-display)]"
        style={{
          transitionDuration: "var(--duration-micro)",
          transitionTimingFunction: "var(--ease-out)",
        }}
        {...props}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create Textarea component**

```tsx
"use client";

import { type ComponentProps } from "react";

interface TextareaProps extends ComponentProps<"textarea"> {
  label: string;
}

export function Textarea({ label, className = "", id, ...props }: TextareaProps) {
  const textareaId = id || label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={className}>
      <label
        htmlFor={textareaId}
        className="mb-[var(--space-xs)] block font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]"
      >
        {label}
      </label>
      <textarea
        id={textareaId}
        className="w-full resize-y border-b border-[var(--border)] bg-transparent py-[var(--space-sm)] font-sans text-[var(--body)] text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--text-display)]"
        style={{
          transitionDuration: "var(--duration-micro)",
          transitionTimingFunction: "var(--ease-out)",
          minHeight: "120px",
        }}
        {...props}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create FormStatus component**

```tsx
"use client";

type FormState = "idle" | "sending" | "sent" | "error";

interface FormStatusProps {
  state: FormState;
  errorMessage?: string;
  className?: string;
}

const labels: Record<FormState, string> = {
  idle: "",
  sending: "[SENDING...]",
  sent: "[SENT]",
  error: "[ERROR]",
};

const colors: Record<FormState, string> = {
  idle: "var(--text-secondary)",
  sending: "var(--text-secondary)",
  sent: "var(--success)",
  error: "var(--error)",
};

export function FormStatus({ state, errorMessage, className = "" }: FormStatusProps) {
  if (state === "idle") return null;

  const text = state === "error" && errorMessage
    ? `[ERROR: ${errorMessage}]`
    : labels[state];

  return (
    <p
      className={`font-mono text-[11px] uppercase tracking-[0.08em] ${className}`}
      style={{ color: colors[state] }}
      role="status"
      aria-live="polite"
    >
      {text}
    </p>
  );
}
```

- [ ] **Step 4: Add all three to barrel export**

Add to `src/components/ui/index.ts`:

```ts
export { Input } from "./Input";
export { Textarea } from "./Textarea";
export { FormStatus } from "./FormStatus";
```

- [ ] **Step 5: Verify build**

Run: `cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx next build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Input.tsx src/components/ui/Textarea.tsx src/components/ui/FormStatus.tsx src/components/ui/index.ts
git commit -m "feat: add Input, Textarea, FormStatus — Nothing-styled form primitives"
```

---

## Phase 4: Global Layout Updates

### Task 12: Wire CrosshairCursor and ExpandingMenu into layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update layout.tsx**

The current layout wraps children in `<TransitionProvider>`. Add `CrosshairCursor` and `ExpandingMenu` inside the body, outside TransitionProvider so they persist across page transitions.

Update `src/app/layout.tsx` to:

```tsx
import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import { TransitionProvider } from "@/transitions";
import { CrosshairCursor, ExpandingMenu } from "@/components/effects";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Mazza Builds",
  description: "Portfolio of Alex Mazza — solo indie developer",
};

const menuItems = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TransitionProvider>
          {children}
          <CrosshairCursor />
          <ExpandingMenu items={menuItems} />
        </TransitionProvider>
      </body>
    </html>
  );
}
```

Note: CrosshairCursor and ExpandingMenu go inside TransitionProvider because they are client components that need to be part of the React tree, but they render as fixed-position elements so they persist visually across transitions.

- [ ] **Step 2: Verify build**

Run: `cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx next build`
Expected: Build succeeds.

- [ ] **Step 3: Visual check**

Run: `cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx next dev`
Verify: Crosshair cursor appears on desktop. Menu dot visible bottom-right. Clicking dot opens full-screen menu overlay.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: wire CrosshairCursor and ExpandingMenu into root layout"
```

---

## Phase 5: Pages

### Task 13: Rebuild Home page

Transform from design system preview into curated portfolio landing page.

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Rewrite page.tsx**

Replace the entire file content with:

```tsx
import {
  Button,
  GitHubCard,
  ProjectCard,
  ScrollTextLines,
  SplitTextScatter,
  TickerText,
  UsageCard,
} from "@/components/ui";
import {
  ScrollLetterAnimation,
  ScrollGridAnimation,
  MagneticWrapper,
  LinkHover,
} from "@/components/effects";
import { projects } from "@/data/projects";

export default function Home() {
  const featured = projects.slice(0, 3);

  return (
    <main className="mx-auto max-w-[960px] px-[var(--space-lg)] py-[var(--space-4xl)]">
      {/* Hero */}
      <section className="mb-[var(--space-3xl)]">
        <SplitTextScatter
          text="MAZZA BUILDS"
          className="font-sans text-[clamp(48px,12vw,96px)] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]"
        />
      </section>

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
        <ScrollGridAnimation className="grid gap-[var(--space-lg)]" stagger={0.15}>
          <UsageCard />
          <GitHubCard />
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
    </main>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx next build`
Expected: Build succeeds.

- [ ] **Step 3: Visual check**

Run dev server. Verify: Hero title scatters in. Subtitle animates per-character. Ticker scrolls. Intro reveals line by line. Project cards stagger in on scroll. Heatmaps appear. CTA button has magnetic pull.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: rebuild home page as curated portfolio landing"
```

---

### Task 14: Projects index page

New page at `/projects` with ConnectedGrid and ScrollVelocityOffset.

**Files:**
- Create: `src/app/projects/page.tsx`

- [ ] **Step 1: Create the projects index page**

```tsx
import { ProjectCard } from "@/components/ui";
import {
  ScrollLetterAnimation,
  ConnectedGrid,
  ScrollVelocityOffset,
  LinkHover,
} from "@/components/effects";
import { projects } from "@/data/projects";

export default function ProjectsPage() {
  return (
    <main className="mx-auto max-w-[960px] px-[var(--space-lg)] py-[var(--space-4xl)]">
      <section className="mb-[var(--space-3xl)]">
        <ScrollLetterAnimation
          as="h1"
          className="font-sans text-[clamp(36px,8vw,72px)] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]"
        >
          PROJECTS
        </ScrollLetterAnimation>
      </section>

      <ScrollVelocityOffset multiplier={0.15}>
        <ConnectedGrid columns={2} className="mb-[var(--space-4xl)]">
          {projects.map((project) => (
            <LinkHover
              key={project.slug}
              href={`/projects/${project.slug}`}
              className="block no-underline"
            >
              <ProjectCard
                issueNumber={project.issueNumber}
                name={project.name}
                description={project.description}
                tags={project.tags}
                status={project.status}
              />
            </LinkHover>
          ))}
        </ConnectedGrid>
      </ScrollVelocityOffset>
    </main>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx next build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/projects/page.tsx
git commit -m "feat: add projects index page with ConnectedGrid and velocity offset"
```

---

### Task 15: Project detail page

Dynamic route at `/projects/[slug]` showing full project info.

**Files:**
- Create: `src/app/projects/[slug]/page.tsx`

- [ ] **Step 1: Create the project detail page**

```tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import { StatusBadge, TagChip, ScrollTextLines } from "@/components/ui";
import {
  ScrollLetterAnimation,
  ScrollGridAnimation,
  LinkHover,
} from "@/components/effects";
import { projects, getProjectBySlug } from "@/data/projects";

interface ProjectDetailProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export default async function ProjectDetailPage({ params }: ProjectDetailProps) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) notFound();

  return (
    <main className="mx-auto max-w-[960px] px-[var(--space-lg)] py-[var(--space-4xl)]">
      {/* Header */}
      <section className="mb-[var(--space-2xl)]">
        <p className="mb-[var(--space-md)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          ISSUE {String(project.issueNumber).padStart(2, "0")}
        </p>
        <ScrollLetterAnimation
          as="h1"
          className="mb-[var(--space-lg)] font-sans text-[clamp(36px,8vw,72px)] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]"
        >
          {project.name}
        </ScrollLetterAnimation>
        <div className="flex flex-wrap items-center gap-[var(--space-md)]">
          <StatusBadge status={project.status} />
          {project.tags.map((tag) => (
            <TagChip key={tag}>{tag}</TagChip>
          ))}
        </div>
      </section>

      {/* Description */}
      <section className="mb-[var(--space-3xl)]">
        <ScrollTextLines className="max-w-[640px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
          {project.longDescription}
        </ScrollTextLines>
      </section>

      {/* Screenshots */}
      {project.images.length > 0 && (
        <section className="mb-[var(--space-3xl)]">
          <p className="mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
            SCREENSHOTS
          </p>
          <ScrollGridAnimation
            variant="fade-up"
            className="grid grid-cols-1 gap-[var(--space-md)] sm:grid-cols-2"
          >
            {project.images.map((src, i) => (
              <div
                key={src}
                className="overflow-hidden border border-[var(--border)] bg-[var(--surface-raised)]"
                style={{ borderRadius: "var(--radius-card)" }}
              >
                <Image
                  src={src}
                  alt={`${project.name} screenshot ${i + 1}`}
                  width={640}
                  height={400}
                  className="h-auto w-full"
                />
              </div>
            ))}
          </ScrollGridAnimation>
        </section>
      )}

      {/* Links */}
      {project.links.length > 0 && (
        <section className="mb-[var(--space-3xl)]">
          <p className="mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
            LINKS
          </p>
          <div className="flex flex-wrap gap-[var(--space-lg)]">
            {project.links.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-block font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                style={{
                  transitionDuration: "var(--duration-micro)",
                  transitionTimingFunction: "var(--ease-out)",
                }}
              >
                {link.label} ↗
                <span
                  className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-[var(--text-primary)] transition-transform group-hover:scale-x-100"
                  style={{
                    transitionDuration: "var(--duration-transition)",
                    transitionTimingFunction: "var(--ease-out)",
                  }}
                />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Back */}
      <LinkHover
        href="/projects"
        className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)]"
      >
        ← All projects
      </LinkHover>
    </main>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx next build`
Expected: Build succeeds. Static params generate pages for daily-roman, shopify-app, ai-automation.

- [ ] **Step 3: Commit**

```bash
git add src/app/projects/\[slug\]/page.tsx
git commit -m "feat: add project detail page with screenshots and scroll animations"
```

---

### Task 16: Rebuild About page

Replace the stub with full bio, MagneticFilings background, skills, social links.

**Files:**
- Modify: `src/app/about/page.tsx`

- [ ] **Step 1: Rewrite about/page.tsx**

```tsx
import { TagChip, MagneticFilings, ScrollTextLines } from "@/components/ui";
import { ScrollLetterAnimation, LinkHover } from "@/components/effects";

const skillGroups = [
  {
    label: "LANGUAGES",
    skills: ["Swift", "TypeScript", "Python", "SQL"],
  },
  {
    label: "FRAMEWORKS",
    skills: ["Next.js", "SwiftUI", "React", "Tailwind CSS"],
  },
  {
    label: "TOOLS & APIS",
    skills: ["Claude API", "Shopify API", "HeyGen", "ElevenLabs", "Prisma"],
  },
];

const socials = [
  { label: "GitHub", href: "https://github.com/alexandermazza" },
  { label: "Twitter", href: "https://twitter.com/maboroshi_alex" },
  { label: "Email", href: "mailto:hello@mazzabuilds.com" },
];

export default function AboutPage() {
  return (
    <main className="relative mx-auto max-w-[960px] px-[var(--space-lg)] py-[var(--space-4xl)]">
      {/* MagneticFilings background */}
      <MagneticFilings className="pointer-events-auto absolute inset-0 -z-10 h-full w-full opacity-20" />

      {/* Heading */}
      <section className="mb-[var(--space-3xl)]">
        <ScrollLetterAnimation
          as="h1"
          className="font-sans text-[clamp(36px,8vw,72px)] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]"
        >
          ABOUT
        </ScrollLetterAnimation>
      </section>

      {/* Bio */}
      <section className="mb-[var(--space-4xl)]">
        <ScrollTextLines className="max-w-[640px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
          I&apos;m Alex Mazza, a solo indie developer based out of the Midwest. I build things from concept to production — iOS apps, Shopify tools, AI-powered automation systems, and the web experiences that tie them together.
        </ScrollTextLines>
        <div className="mt-[var(--space-2xl)]">
          <ScrollTextLines className="max-w-[640px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
            I care about clean interfaces, thoughtful systems, and shipping work that holds up. Every project here was designed, built, and shipped by me — no agencies, no templates.
          </ScrollTextLines>
        </div>
      </section>

      {/* Skills */}
      <section className="mb-[var(--space-4xl)]">
        <p className="mb-[var(--space-2xl)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          TOOLKIT
        </p>
        <div className="grid gap-[var(--space-2xl)]">
          {skillGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-[var(--space-md)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-[var(--space-sm)]">
                {group.skills.map((skill) => (
                  <TagChip key={skill}>{skill}</TagChip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Social links */}
      <section>
        <p className="mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          ELSEWHERE
        </p>
        <div className="flex flex-wrap gap-[var(--space-lg)]">
          {socials.map((social) => (
            <LinkHover key={social.label} href={social.href}>
              <span className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)]">
                {social.label}
              </span>
            </LinkHover>
          ))}
        </div>
      </section>
    </main>
  );
}
```

**Note:** The social links use `LinkHover` which wraps `TransitionLink`. For external links (GitHub, Twitter, email), `TransitionLink` will let them through since they're external origins. If this causes issues, replace with plain `<a>` tags with the LinkHover underline pattern inline. Verify during visual check.

- [ ] **Step 2: Verify build**

Run: `cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx next build`
Expected: Build succeeds.

- [ ] **Step 3: Visual check**

Verify: MagneticFilings renders as subtle background. Bio text reveals on scroll. Skills grouped correctly. Social links have animated underlines.

- [ ] **Step 4: Commit**

```bash
git add src/app/about/page.tsx
git commit -m "feat: rebuild about page with MagneticFilings background and skills"
```

---

### Task 17: Contact page and API route

New contact page with form + direct links. New API route for form submission.

**Files:**
- Create: `src/app/contact/page.tsx`
- Create: `src/app/api/contact/route.ts`

- [ ] **Step 1: Create the contact API route**

```ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Valid email is required" },
        { status: 400 }
      );
    }
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      );
    }

    // TODO: Wire up email provider (Resend, Mailgun, etc.) at deployment time.
    // For now, log and return success.
    console.log("Contact form submission:", { name, email, message: message.slice(0, 100) });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
```

- [ ] **Step 2: Create the contact page**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { Button, Input, Textarea, FormStatus, ScrollTextLines } from "@/components/ui";
import {
  ScrollLetterAnimation,
  MagneticWrapper,
  LinkHover,
} from "@/components/effects";

type FormState = "idle" | "sending" | "sent" | "error";

const directLinks = [
  { label: "Email", href: "mailto:hello@mazzabuilds.com" },
  { label: "GitHub", href: "https://github.com/alexandermazza" },
  { label: "Twitter", href: "https://twitter.com/maboroshi_alex" },
];

export default function ContactPage() {
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormState("sending");
    setErrorMessage("");

    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      message: formData.get("message") as string,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        setFormState("sent");
        (e.target as HTMLFormElement).reset();
      } else {
        setFormState("error");
        setErrorMessage(data.error || "Something went wrong");
      }
    } catch {
      setFormState("error");
      setErrorMessage("Failed to send");
    }
  }

  return (
    <main className="mx-auto max-w-[960px] px-[var(--space-lg)] py-[var(--space-4xl)]">
      {/* Heading */}
      <section className="mb-[var(--space-3xl)]">
        <ScrollLetterAnimation
          as="h1"
          className="font-sans text-[clamp(36px,8vw,72px)] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]"
        >
          CONTACT
        </ScrollLetterAnimation>
      </section>

      {/* Intro */}
      <section className="mb-[var(--space-3xl)]">
        <ScrollTextLines className="max-w-[480px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
          Have a project in mind, want to collaborate, or just want to say hello? Drop a message below or reach out directly.
        </ScrollTextLines>
      </section>

      <div className="grid gap-[var(--space-4xl)] md:grid-cols-[2fr_1fr]">
        {/* Form */}
        <section>
          <form onSubmit={handleSubmit} className="grid gap-[var(--space-2xl)]">
            <Input label="Name" name="name" type="text" required />
            <Input label="Email" name="email" type="email" required />
            <Textarea label="Message" name="message" required />
            <div className="flex items-center gap-[var(--space-lg)]">
              <MagneticWrapper>
                <Button type="submit" disabled={formState === "sending"}>
                  {formState === "sending" ? "Sending..." : "Send message"}
                </Button>
              </MagneticWrapper>
              <FormStatus state={formState} errorMessage={errorMessage} />
            </div>
          </form>
        </section>

        {/* Direct links */}
        <section>
          <p className="mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
            DIRECT
          </p>
          <div className="flex flex-col gap-[var(--space-md)]">
            {directLinks.map((link) => (
              <LinkHover key={link.label} href={link.href}>
                <span className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)]">
                  {link.label}
                </span>
              </LinkHover>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx next build`
Expected: Build succeeds.

- [ ] **Step 4: Visual check**

Run dev server. Navigate to `/contact`. Verify: Form renders with Nothing-styled inputs. Submit shows `[SENDING...]` then `[SENT]`. Direct links have animated underlines. Submit button has magnetic pull.

- [ ] **Step 5: Commit**

```bash
git add src/app/contact/page.tsx src/app/api/contact/route.ts
git commit -m "feat: add contact page with form, API route, and direct links"
```

---

## Phase 6: Final Verification

### Task 18: Full build and cross-page navigation check

**Files:** None (verification only)

- [ ] **Step 1: Production build**

Run: `cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx next build`
Expected: Build succeeds with no errors or warnings.

- [ ] **Step 2: Cross-page navigation check**

Run dev server. Verify these flows:
1. Home → click project card → project detail page → back to projects
2. Menu dot → expand → click "About" → about page loads with transitions
3. Menu dot → expand → click "Contact" → contact page loads
4. About page → social links work (external links open in new tab)
5. Contact form → submit → status updates inline
6. Crosshair cursor visible on all pages (desktop)
7. Menu overlay closes on Escape key

- [ ] **Step 3: Commit any fixes if needed**

If the verification reveals issues, fix them and commit with descriptive messages.
