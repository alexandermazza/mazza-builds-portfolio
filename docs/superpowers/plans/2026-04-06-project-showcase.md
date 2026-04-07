# ProjectShowcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the home page projects section with a full-bleed split-screen scroll-lock component that showcases all projects.

**Architecture:** Single new `ProjectShowcase` component in `src/components/effects/`. Full-bleed sticky container with left column (project index) and right column (detail panel). Scroll progress drives active project index. Mobile falls back to stacked cards. Replaces the current `ScrollGridAnimation` + `ProjectCard` block on the home page.

**Tech Stack:** Framer Motion (`motion/react`) for scroll tracking and crossfade, CSS custom properties for design tokens, existing UI components (StatusBadge, TagChip, LinkHover, TransitionLink).

**Spec:** `docs/superpowers/specs/2026-04-06-project-showcase-design.md`

---

## Codebase Patterns

**Imports:** `motion/react` (NOT `framer-motion`). `@/lib/motion` for constants. `@/transitions` for TransitionLink. `@/components/ui` for StatusBadge, TagChip, ProjectCard. `@/components/effects` for LinkHover, ScrollLetterAnimation, ScrollGridAnimation.

**Components:** `"use client"` directive. Named function exports. `className = ""` default. CSS custom properties via `var(--token)`.

**Motion:** `useScroll`, `useTransform`, `useMotionValueEvent` from `motion/react`. Constants from `@/lib/motion` (`DURATION`, `EASE_OUT_MOTION`). `useReducedMotion()` for accessibility.

**No test framework.** Verification = `next build` + visual check in dev server.

---

## Task 1: Create ProjectShowcase component

**Files:**
- Create: `src/components/effects/ProjectShowcase.tsx`
- Modify: `src/components/effects/index.ts`

- [ ] **Step 1: Create the ProjectShowcase component**

Create `src/components/effects/ProjectShowcase.tsx`:

```tsx
"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  AnimatePresence,
  useReducedMotion,
} from "motion/react";
import { DURATION, EASE_OUT_MOTION } from "@/lib/motion";
import { StatusBadge, TagChip, ProjectCard } from "@/components/ui";
import {
  ScrollLetterAnimation,
  ScrollGridAnimation,
  LinkHover,
} from "@/components/effects";
import { TransitionLink } from "@/transitions";
import type { Project } from "@/data/projects";

interface ProjectShowcaseProps {
  projects: Project[];
  className?: string;
}

export function ProjectShowcase({
  projects,
  className = "",
}: ProjectShowcaseProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const prefersReduced = useReducedMotion();

  const displayIndex = hoverIndex ?? activeIndex;
  const activeProject = projects[displayIndex];

  // Detect mobile
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    function handleChange(e: MediaQueryListEvent) {
      setIsMobile(e.matches);
    }
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  // Scroll-driven active index
  const { scrollYProgress } = useScroll({ target: outerRef });

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    if (isMobile) return;
    const index = Math.min(
      Math.floor(progress * projects.length),
      projects.length - 1
    );
    setActiveIndex(index);
  });

  const handleRowHover = useCallback((index: number) => {
    setHoverIndex(index);
  }, []);

  const handleRowLeave = useCallback(() => {
    setHoverIndex(null);
  }, []);

  // Mobile fallback
  if (isMobile) {
    return (
      <section className={`px-[var(--space-lg)] mb-[var(--space-4xl)] ${className}`}>
        <div className="mx-auto max-w-[960px]">
          <ScrollLetterAnimation
            as="h2"
            className="mb-[var(--space-2xl)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]"
          >
            FEATURED PROJECTS
          </ScrollLetterAnimation>
          <ScrollGridAnimation className="grid gap-[var(--space-md)]">
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
          </ScrollGridAnimation>
        </div>
      </section>
    );
  }

  // Desktop: split-screen scroll lock
  return (
    <section className={className}>
      {/* Section header — constrained width */}
      <div className="mx-auto max-w-[960px] px-[var(--space-lg)]">
        <ScrollLetterAnimation
          as="h2"
          className="mb-[var(--space-2xl)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]"
        >
          FEATURED PROJECTS
        </ScrollLetterAnimation>
      </div>

      {/* Scroll region */}
      <div
        ref={outerRef}
        style={{ height: `calc(100vh * ${projects.length})` }}
      >
        {/* Sticky frame */}
        <div className="sticky top-0 flex h-screen w-full items-stretch bg-[var(--surface)]">
          {/* Left column — Project index */}
          <div className="flex w-[40%] flex-col items-start justify-center pl-[var(--space-4xl)]">
            {projects.map((project, i) => {
              const isActive = displayIndex === i;
              return (
                <TransitionLink
                  key={project.slug}
                  href={`/projects/${project.slug}`}
                  className="group relative block py-[12px] no-underline"
                  onMouseEnter={() => handleRowHover(i)}
                  onMouseLeave={handleRowLeave}
                >
                  {/* Accent bar */}
                  <div
                    className="absolute left-[-16px] top-[12px] bottom-[12px] w-[2px]"
                    style={{
                      backgroundColor: "var(--accent)",
                      opacity: isActive ? 1 : 0,
                      transition: prefersReduced
                        ? "none"
                        : `opacity ${DURATION.transition}s var(--ease-out)`,
                    }}
                  />
                  {/* Issue number + name */}
                  <div className="flex items-baseline gap-[var(--space-md)]">
                    <span
                      className="font-mono text-[11px] uppercase tracking-[0.08em]"
                      style={{
                        color: "var(--text-disabled)",
                        transition: prefersReduced
                          ? "none"
                          : `color ${DURATION.transition}s var(--ease-out)`,
                      }}
                    >
                      {String(project.issueNumber).padStart(2, "0")}
                    </span>
                    <span
                      className="font-sans text-[28px] leading-tight"
                      style={{
                        color: isActive
                          ? "var(--text-display)"
                          : "var(--text-disabled)",
                        transition: prefersReduced
                          ? "none"
                          : `color ${DURATION.transition}s var(--ease-out)`,
                      }}
                    >
                      {project.name}
                    </span>
                  </div>
                </TransitionLink>
              );
            })}
          </div>

          {/* Divider */}
          <div
            className="w-px self-stretch"
            style={{ backgroundColor: "var(--border)" }}
          />

          {/* Right column — Detail panel */}
          <div className="flex w-[60%] items-center pl-[var(--space-3xl)] pr-[var(--space-4xl)]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeProject.slug}
                initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReduced ? { opacity: 1 } : { opacity: 0, y: -8 }}
                transition={{
                  duration: prefersReduced ? 0 : DURATION.transition,
                  ease: EASE_OUT_MOTION,
                }}
                className="max-w-[480px]"
              >
                <div className="mb-[var(--space-lg)]">
                  <StatusBadge status={activeProject.status} />
                </div>

                <p className="mb-[var(--space-lg)] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
                  {activeProject.description}
                </p>

                <div className="mb-[var(--space-2xl)] flex flex-wrap gap-[var(--space-sm)]">
                  {activeProject.tags.map((tag) => (
                    <TagChip key={tag}>{tag}</TagChip>
                  ))}
                </div>

                <LinkHover
                  href={`/projects/${activeProject.slug}`}
                  className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)]"
                >
                  View project →
                </LinkHover>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add to barrel export**

Read `src/components/effects/index.ts` and add this line:

```ts
export { ProjectShowcase } from "./ProjectShowcase";
```

- [ ] **Step 3: Verify build**

Run: `cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx next build`
Expected: Build succeeds. The component is created but not yet used on any page.

- [ ] **Step 4: Commit**

```bash
git add src/components/effects/ProjectShowcase.tsx src/components/effects/index.ts
git commit -m "feat: add ProjectShowcase — split-screen scroll-lock projects section"
```

---

## Task 2: Integrate ProjectShowcase into home page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update the home page**

Replace the entire file with:

```tsx
import {
  Button,
  GitHubCard,
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
  ProjectShowcase,
} from "@/components/effects";
import { projects } from "@/data/projects";

export default function Home() {
  return (
    <main>
      {/* Hero — constrained */}
      <div className="mx-auto max-w-[960px] px-[var(--space-lg)] pt-[var(--space-4xl)]">
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
      </div>

      {/* Ticker — full bleed */}
      <section className="mb-[var(--space-3xl)]">
        <TickerText
          items={["IOS APPS", "SHOPIFY TOOLS", "AI PIPELINES", "VIDEO AUTOMATION", "WEB APPS", "CONTENT SYSTEMS"]}
        />
      </section>

      {/* Intro — constrained */}
      <div className="mx-auto max-w-[960px] px-[var(--space-lg)]">
        <section className="mb-[var(--space-4xl)]">
          <ScrollTextLines className="max-w-[480px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
            I&apos;m Alex Mazza, a solo indie developer who builds things from concept to production. I care about clean interfaces, thoughtful systems, and shipping work that holds up.
          </ScrollTextLines>
        </section>
      </div>

      {/* Projects — full bleed */}
      <ProjectShowcase projects={projects} className="mb-[var(--space-4xl)]" />

      {/* Activity + CTA — constrained */}
      <div className="mx-auto max-w-[960px] px-[var(--space-lg)] pb-[var(--space-4xl)]">
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
    </main>
  );
}
```

Key changes from the current page:
- Removed the outer `<main className="mx-auto max-w-[960px] ...">` wrapper. The page now uses `<main>` with no constraints, and each section applies its own width.
- Hero, subtitle, intro, activity, and CTA are wrapped in `<div className="mx-auto max-w-[960px] px-[var(--space-lg)]">` for constrained width.
- Ticker and ProjectShowcase go full-bleed (no max-width wrapper).
- `projects.slice(0, 3)` replaced with `projects` (all projects).
- Removed `ProjectCard` import (now internal to ProjectShowcase).
- Padding moved from `<main>` to individual wrapper divs.

- [ ] **Step 2: Verify build**

Run: `cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx next build`
Expected: Build succeeds with all 13 pages generated.

- [ ] **Step 3: Visual check**

Run: `cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx next dev`

Verify on desktop (1440px):
1. Hero, subtitle, ticker, intro render as before
2. Full-bleed projects section appears with sticky scroll behavior
3. Left column shows all project names, first one highlighted with accent bar
4. Right column shows first project's details (status, description, tags, link)
5. Scrolling advances through projects — left highlight moves, right panel crossfades
6. Hovering a name on the left overrides the scroll-driven active state
7. Clicking a name navigates to the project detail page
8. After scrolling past all projects, heatmaps and CTA appear below

Verify on mobile (390px):
1. Projects section shows stacked ProjectCards (no split-screen)
2. No scroll-locking behavior

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: integrate ProjectShowcase into home page, full-bleed layout"
```

---

## Task 3: Visual polish and edge cases

**Files:**
- Modify: `src/components/effects/ProjectShowcase.tsx` (if needed)

- [ ] **Step 1: Test scroll boundary behavior**

Run dev server. Scroll through the entire projects section and verify:
- Active index starts at 0 (first project) when entering the section
- Active index reaches `N-1` (last project) before exiting
- No flicker or jump at section boundaries (entering/exiting sticky)
- The last project holds as active through the final scroll segment

If the `Math.floor(progress * projects.length)` calculation causes the last project to only appear briefly (because `progress` hits 1.0 only at the very end), adjust the mapping:

```ts
const index = Math.min(
  Math.floor(progress * projects.length),
  projects.length - 1
);
```

This is already in the code — verify it works correctly.

- [ ] **Step 2: Test AnimatePresence crossfade**

Scroll through projects at various speeds:
- Slow scroll: each project's detail panel fades in cleanly
- Fast scroll: panels don't stack or flash (mode="wait" prevents this)
- Hover while scrolling: hover override takes precedence, no conflict

- [ ] **Step 3: Test reduced motion**

Enable "Reduce motion" in System Preferences > Accessibility > Display.
Verify:
- Accent bar highlight changes instantly (no transition)
- Detail panel swaps instantly (no crossfade)
- Scroll tracking still works (just no animation)

- [ ] **Step 4: Fix any issues found, commit**

If fixes are needed:
```bash
git add src/components/effects/ProjectShowcase.tsx
git commit -m "fix: polish ProjectShowcase scroll boundaries and transitions"
```

If no fixes needed, skip this step.

---

## Task 4: Final build verification

**Files:** None (verification only)

- [ ] **Step 1: Production build**

Run: `cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx next build`
Expected: Build succeeds, 13 pages generated, no TypeScript errors.

- [ ] **Step 2: Cross-page navigation check**

Run dev server. Verify:
1. Home page → scroll through projects → click project name → detail page loads with transition
2. Use ExpandingMenu to navigate to Projects index → projects display in ConnectedGrid
3. Navigate back to Home → ProjectShowcase re-renders correctly
4. Mobile viewport → projects section shows stacked cards, no scroll-lock
