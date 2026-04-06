# Async Page Transitions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable GSAP-powered page transition system adapted from the Codrops async page transitions pattern, integrated into Next.js App Router.

**Architecture:** A `TransitionProvider` context in `layout.tsx` manages the transition lifecycle. On navigation via `TransitionLink`, the provider clones the current page DOM, lets Next.js swap the route (via `template.tsx` remounting), then runs a GSAP timeline animating both the clone (old) and new page simultaneously. A transition registry maps route pairs to animation functions (forward clip-path reveal + back horizontal slide).

**Tech Stack:** Next.js 16 (App Router), React 19, GSAP (core), TypeScript, Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-04-05-async-page-transitions-design.md`

---

## File Plan

### New files
| File | Responsibility |
|------|---------------|
| `src/lib/gsap.ts` | GSAP imports + transition constants (easing, duration) |
| `src/transitions/registry.ts` | Route-pair → animation lookup + direction heuristic |
| `src/transitions/animations/forward.ts` | Default forward transition (clip-path reveal from bottom) |
| `src/transitions/animations/back.ts` | Default back transition (horizontal slide) |
| `src/transitions/animations/enter.ts` | Post-transition enter choreography for `[data-enter]` elements |
| `src/transitions/TransitionProvider.tsx` | React context provider — owns transition state, cloning, GSAP lifecycle |
| `src/transitions/TransitionContainer.tsx` | Wrapper in `template.tsx` — registers DOM ref with provider |
| `src/transitions/TransitionLink.tsx` | Drop-in `<Link>` replacement — intercepts clicks for animated navigation |
| `src/transitions/index.ts` | Barrel export |
| `src/app/template.tsx` | Next.js template file — wraps children in `TransitionContainer` |
| `src/app/about/page.tsx` | Minimal test route for smoke-testing transitions |

### Modified files
| File | Change |
|------|--------|
| `src/app/layout.tsx` | Wrap `{children}` in `<TransitionProvider>` |
| `src/app/page.tsx` | Add `TransitionLink` to `/about` for testing |

---

### Task 1: Install GSAP and create constants module

**Files:**
- Create: `src/lib/gsap.ts`

- [ ] **Step 1: Install GSAP**

```bash
cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npm install gsap
```

- [ ] **Step 2: Create `src/lib/gsap.ts`**

```ts
export { default as gsap } from "gsap";

/** Nothing-style ease — no spring, no bounce */
export const TRANSITION_EASE = "power2.out";

/** Slightly more dramatic ease for enter choreography */
export const ENTER_EASE = "power3.out";

/** Transition duration in seconds — tight and purposeful per Nothing design */
export const TRANSITION_DURATION = 0.6;
```

- [ ] **Step 3: Verify types resolve**

```bash
cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: no errors related to gsap imports.

- [ ] **Step 4: Commit**

```bash
git add src/lib/gsap.ts package.json package-lock.json && git commit -m "feat: install GSAP and add transition constants"
```

---

### Task 2: Create transition registry

**Files:**
- Create: `src/transitions/registry.ts`

- [ ] **Step 1: Create `src/transitions/registry.ts`**

```ts
import type gsap from "gsap";

export type TransitionFn = (
  current: HTMLElement,
  next: HTMLElement
) => gsap.core.Timeline;

// Lazy imports — animation modules register themselves
let forwardFn: TransitionFn | null = null;
let backFn: TransitionFn | null = null;

export function registerTransitions(forward: TransitionFn, back: TransitionFn) {
  forwardFn = forward;
  backFn = back;
}

/**
 * Determine navigation direction from URL path depth.
 * Deeper or equal = forward, shallower = back.
 */
export function getDirection(
  currentPath: string,
  nextPath: string
): "forward" | "back" {
  const currentDepth = currentPath.split("/").filter(Boolean).length;
  const nextDepth = nextPath.split("/").filter(Boolean).length;
  return nextDepth < currentDepth ? "back" : "forward";
}

/**
 * Look up the transition animation for a given route change.
 * popstate always uses the back transition.
 */
export function getTransition(
  currentPath: string,
  nextPath: string,
  isPopState = false
): TransitionFn {
  if (!forwardFn || !backFn) {
    throw new Error("Transitions not registered. Call registerTransitions() first.");
  }

  if (isPopState) return backFn;

  const direction = getDirection(currentPath, nextPath);
  return direction === "back" ? backFn : forwardFn;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/transitions/registry.ts && git commit -m "feat: add transition registry with direction heuristic"
```

---

### Task 3: Create forward transition animation

**Files:**
- Create: `src/transitions/animations/forward.ts`

- [ ] **Step 1: Create `src/transitions/animations/forward.ts`**

The forward transition: current page translates up and fades, next page reveals from bottom via clip-path.

```ts
import { gsap, TRANSITION_EASE, TRANSITION_DURATION } from "@/lib/gsap";

export function forwardTransition(
  current: HTMLElement,
  next: HTMLElement
): gsap.core.Timeline {
  // Position next page fixed, hidden behind clip-path
  gsap.set(next, {
    clipPath: "inset(100% 0% 0% 0%)",
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100vh",
    zIndex: 50,
    opacity: 1,
  });

  const tl = gsap.timeline();

  // Current page slides up and fades
  tl.to(
    current,
    {
      y: "-20vh",
      opacity: 0.5,
      duration: TRANSITION_DURATION,
      ease: TRANSITION_EASE,
      force3D: true,
    },
    0
  );

  // Next page reveals from bottom
  tl.to(
    next,
    {
      clipPath: "inset(0% 0% 0% 0%)",
      duration: TRANSITION_DURATION,
      ease: TRANSITION_EASE,
      force3D: true,
    },
    0
  );

  return tl;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/transitions/animations/forward.ts && git commit -m "feat: add forward page transition (clip-path reveal)"
```

---

### Task 4: Create back transition animation

**Files:**
- Create: `src/transitions/animations/back.ts`

- [ ] **Step 1: Create `src/transitions/animations/back.ts`**

The back transition: current page slides right (on top), next page slides in from the left (underneath).

```ts
import { gsap, TRANSITION_EASE, TRANSITION_DURATION } from "@/lib/gsap";

export function backTransition(
  current: HTMLElement,
  next: HTMLElement
): gsap.core.Timeline {
  // Next page starts shifted left, underneath
  gsap.set(next, {
    x: "-30%",
    opacity: 0.7,
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100vh",
    zIndex: 45,
  });

  // Current page (clone) stays on top
  gsap.set(current, { zIndex: 50 });

  const tl = gsap.timeline();

  // Current page slides out to the right
  tl.to(
    current,
    {
      x: "100%",
      opacity: 0.5,
      duration: TRANSITION_DURATION,
      ease: TRANSITION_EASE,
      force3D: true,
    },
    0
  );

  // Next page slides into place
  tl.to(
    next,
    {
      x: "0%",
      opacity: 1,
      duration: TRANSITION_DURATION,
      ease: TRANSITION_EASE,
      force3D: true,
    },
    0
  );

  return tl;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/transitions/animations/back.ts && git commit -m "feat: add back page transition (horizontal slide)"
```

---

### Task 5: Create enter animation

**Files:**
- Create: `src/transitions/animations/enter.ts`

- [ ] **Step 1: Create `src/transitions/animations/enter.ts`**

Opt-in enter choreography for elements marked with `data-enter`. Only runs after transitions — existing Framer Motion components handle their own first-load animations.

```ts
import { gsap, ENTER_EASE } from "@/lib/gsap";

/**
 * Animate elements marked with [data-enter] after a page transition completes.
 * Elements without this attribute are left to Framer Motion scroll triggers.
 */
export function enterAnimation(container: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();

  const enterEls = container.querySelectorAll<HTMLElement>("[data-enter]");
  if (enterEls.length === 0) return tl;

  tl.fromTo(
    enterEls,
    { y: 24, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.5,
      ease: ENTER_EASE,
      stagger: 0.06,
    }
  );

  return tl;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/transitions/animations/enter.ts && git commit -m "feat: add post-transition enter choreography"
```

---

### Task 6: Create TransitionProvider

**Files:**
- Create: `src/transitions/TransitionProvider.tsx`

This is the core component. It manages the full transition lifecycle:
1. Intercepts navigation via `navigate(href)`
2. Clones current page DOM before Next.js swaps routes
3. Detects when the new page mounts (via `registerContainer`)
4. Runs GSAP timeline on both clone + new page
5. Cleans up clone, resets state

- [ ] **Step 1: Create `src/transitions/TransitionProvider.tsx`**

```tsx
"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { gsap } from "@/lib/gsap";
import {
  getTransition,
  registerTransitions,
} from "./registry";
import { forwardTransition } from "./animations/forward";
import { backTransition } from "./animations/back";
import { enterAnimation } from "./animations/enter";

// ── Context ──────────────────────────────────────────────

interface TransitionContextValue {
  navigate: (href: string) => void;
  registerContainer: (el: HTMLDivElement | null) => void;
  isTransitioning: boolean;
}

const TransitionContext = createContext<TransitionContextValue | null>(null);

export function useTransitionContext() {
  const ctx = useContext(TransitionContext);
  if (!ctx)
    throw new Error(
      "useTransitionContext must be used within TransitionProvider"
    );
  return ctx;
}

// ── Helpers ──────────────────────────────────────────────

function waitForImages(
  container: HTMLElement,
  timeout = 2000
): Promise<void> {
  const images = container.querySelectorAll("img");
  if (images.length === 0) return Promise.resolve();

  return Promise.race([
    Promise.all(
      Array.from(images).map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
      )
    ).then(() => {}),
    new Promise<void>((resolve) => setTimeout(resolve, timeout)),
  ]);
}

function cloneCurrentPage(el: HTMLElement): HTMLDivElement {
  const scrollY = window.scrollY;
  const clone = el.cloneNode(true) as HTMLDivElement;

  clone.setAttribute("aria-hidden", "true");
  clone.style.position = "fixed";
  clone.style.top = "0";
  clone.style.left = "0";
  clone.style.width = "100%";
  clone.style.height = "100vh";
  clone.style.overflow = "hidden";
  clone.style.zIndex = "40";
  clone.style.pointerEvents = "none";

  // Offset content to match scroll position
  if (scrollY > 0) {
    const wrapper = document.createElement("div");
    wrapper.style.transform = `translateY(-${scrollY}px)`;
    while (clone.firstChild) {
      wrapper.appendChild(clone.firstChild);
    }
    clone.appendChild(wrapper);
  }

  document.body.appendChild(clone);
  return clone;
}

// ── Provider ─────────────────────────────────────────────

export function TransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);

  // All mutable state lives in refs to avoid stale closures
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cloneRef = useRef<HTMLDivElement | null>(null);
  const isTransitioningRef = useRef(false);
  const pendingHrefRef = useRef<string | null>(null);
  const previousPathRef = useRef(pathname);
  const isPopStateRef = useRef(false);
  const reducedMotionRef = useRef(false);

  // Register animation functions on mount
  useEffect(() => {
    registerTransitions(forwardTransition, backTransition);
  }, []);

  // Detect reduced motion preference
  useEffect(() => {
    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  // ── Transition runner ──────────────────────────────────

  const runTransition = useCallback(
    async (
      clone: HTMLDivElement,
      nextEl: HTMLDivElement,
      prevPath: string,
      nextPath: string
    ) => {
      const transitionFn = getTransition(
        prevPath,
        nextPath,
        isPopStateRef.current
      );
      await waitForImages(nextEl);

      const tl = transitionFn(clone, nextEl);
      await tl.then();

      // Cleanup
      clone.remove();
      cloneRef.current = null;
      gsap.set(nextEl, {
        clearProps:
          "clipPath,position,top,left,width,height,zIndex,opacity,x,y,transform",
      });

      isTransitioningRef.current = false;
      isPopStateRef.current = false;
      setIsTransitioning(false);
      previousPathRef.current = nextPath;
      pendingHrefRef.current = null;
      document.body.style.overflow = "";

      window.scrollTo(0, 0);
      enterAnimation(nextEl);
    },
    []
  );

  // ── Navigate (called by TransitionLink) ────────────────

  const navigate = useCallback(
    (href: string) => {
      if (isTransitioningRef.current) return;
      if (href === window.location.pathname) return;

      // External URLs — let browser handle
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) {
          window.location.href = href;
          return;
        }
      } catch {
        // Let Next.js handle unparseable hrefs
      }

      if (reducedMotionRef.current) {
        router.push(href);
        return;
      }

      isTransitioningRef.current = true;
      setIsTransitioning(true);
      pendingHrefRef.current = href;
      document.body.style.overflow = "hidden";

      // Clone current page before Next.js swaps
      const currentEl = containerRef.current;
      if (currentEl) {
        cloneRef.current = cloneCurrentPage(currentEl);
      }

      router.push(href, { scroll: false });
    },
    [router]
  );

  // ── Container registration (called by TransitionContainer) ──

  const registerContainer = useCallback(
    (el: HTMLDivElement | null) => {
      containerRef.current = el;

      if (el && cloneRef.current && isTransitioningRef.current) {
        const clone = cloneRef.current;
        const prevPath = previousPathRef.current;
        const nextPath =
          pendingHrefRef.current || window.location.pathname;
        runTransition(clone, el, prevPath, nextPath);
      }
    },
    [runTransition]
  );

  // ── Browser back/forward ───────────────────────────────

  useEffect(() => {
    const handlePopState = () => {
      if (isTransitioningRef.current) return;
      if (reducedMotionRef.current) return;

      isPopStateRef.current = true;
      isTransitioningRef.current = true;
      setIsTransitioning(true);
      document.body.style.overflow = "hidden";

      const currentEl = containerRef.current;
      if (currentEl) {
        cloneRef.current = cloneCurrentPage(currentEl);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // ── Render ─────────────────────────────────────────────

  return (
    <TransitionContext value={{ navigate, registerContainer, isTransitioning }}>
      {children}
    </TransitionContext>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx tsc --noEmit --pretty 2>&1 | head -30
```

Expected: no errors in TransitionProvider.tsx.

- [ ] **Step 3: Commit**

```bash
git add src/transitions/TransitionProvider.tsx && git commit -m "feat: add TransitionProvider with full transition lifecycle"
```

---

### Task 7: Create TransitionContainer

**Files:**
- Create: `src/transitions/TransitionContainer.tsx`

- [ ] **Step 1: Create `src/transitions/TransitionContainer.tsx`**

```tsx
"use client";

import { useRef, useEffect } from "react";
import { useTransitionContext } from "./TransitionProvider";

export function TransitionContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { registerContainer } = useTransitionContext();

  useEffect(() => {
    registerContainer(ref.current);
    return () => registerContainer(null);
  }, [registerContainer]);

  return <div ref={ref} data-transition-container="">{children}</div>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/transitions/TransitionContainer.tsx && git commit -m "feat: add TransitionContainer wrapper"
```

---

### Task 8: Create TransitionLink

**Files:**
- Create: `src/transitions/TransitionLink.tsx`

- [ ] **Step 1: Create `src/transitions/TransitionLink.tsx`**

```tsx
"use client";

import { type ComponentProps, type MouseEvent } from "react";
import Link from "next/link";
import { useTransitionContext } from "./TransitionProvider";

type TransitionLinkProps = ComponentProps<typeof Link>;

export function TransitionLink({
  href,
  onClick,
  children,
  ...props
}: TransitionLinkProps) {
  const { navigate, isTransitioning } = useTransitionContext();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Let browser handle modifier-key clicks (new tab, etc.)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const hrefStr = typeof href === "string" ? href : href.pathname || "/";

    // External links fall through
    try {
      const url = new URL(hrefStr, window.location.origin);
      if (url.origin !== window.location.origin) return;
    } catch {
      return;
    }

    e.preventDefault();
    if (!isTransitioning) {
      navigate(hrefStr);
    }

    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/transitions/TransitionLink.tsx && git commit -m "feat: add TransitionLink component"
```

---

### Task 9: Create barrel export

**Files:**
- Create: `src/transitions/index.ts`

- [ ] **Step 1: Create `src/transitions/index.ts`**

```ts
export { TransitionProvider } from "./TransitionProvider";
export { TransitionContainer } from "./TransitionContainer";
export { TransitionLink } from "./TransitionLink";
export { useTransitionContext } from "./TransitionProvider";
```

- [ ] **Step 2: Commit**

```bash
git add src/transitions/index.ts && git commit -m "feat: add transitions barrel export"
```

---

### Task 10: Wire into layout.tsx and create template.tsx

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/template.tsx`

- [ ] **Step 1: Modify `src/app/layout.tsx`**

Add `TransitionProvider` wrapping `{children}` inside `<body>`:

```tsx
import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import { TransitionProvider } from "@/transitions";
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
        <TransitionProvider>{children}</TransitionProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create `src/app/template.tsx`**

```tsx
import { TransitionContainer } from "@/transitions";

export default function Template({ children }: { children: React.ReactNode }) {
  return <TransitionContainer>{children}</TransitionContainer>;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx src/app/template.tsx && git commit -m "feat: wire TransitionProvider into layout, add template.tsx"
```

---

### Task 11: Add test route and TransitionLinks

**Files:**
- Create: `src/app/about/page.tsx`
- Modify: `src/app/page.tsx`

We need at least two routes to test transitions.

- [ ] **Step 1: Create `src/app/about/page.tsx`**

A minimal page with a heading and a link back to home:

```tsx
import { TransitionLink } from "@/transitions";

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-[960px] px-[var(--space-lg)] py-[var(--space-4xl)]">
      <h1
        className="mb-[var(--space-lg)] font-sans text-[var(--display-lg)] font-bold text-[var(--text-display)]"
        data-enter=""
      >
        About
      </h1>
      <p
        className="mb-[var(--space-2xl)] max-w-[480px] text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]"
        data-enter=""
      >
        Solo indie developer building iOS apps, Shopify tools, and AI automation
        systems.
      </p>
      <TransitionLink
        href="/"
        className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--accent)] hover:brightness-110"
      >
        ← Back to home
      </TransitionLink>
    </main>
  );
}
```

- [ ] **Step 2: Add TransitionLink to `src/app/page.tsx`**

Add a navigation link at the top of the page, before the existing sections. Insert this as the first child of `<main>`:

```tsx
<TransitionLink
  href="/about"
  className="mb-[var(--space-2xl)] inline-block font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--accent)] hover:brightness-110"
>
  Go to About →
</TransitionLink>
```

Also add the import at the top of the file:

```tsx
import { TransitionLink } from "@/transitions";
```

- [ ] **Step 3: Commit**

```bash
git add src/app/about/page.tsx src/app/page.tsx && git commit -m "feat: add about page and TransitionLinks for smoke testing"
```

---

### Task 12: Type check and build verification

- [ ] **Step 1: Run TypeScript type check**

```bash
cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx tsc --noEmit --pretty
```

Expected: zero errors.

- [ ] **Step 2: Run production build**

```bash
cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Fix any issues found**

If type errors or build errors appear, fix them in the relevant files and re-run the checks.

- [ ] **Step 4: Commit if fixes were needed**

```bash
git add -A && git commit -m "fix: resolve build issues in transition system"
```

---

### Task 13: Manual smoke test

- [ ] **Step 1: Start dev server**

```bash
cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npm run dev
```

- [ ] **Step 2: Verify in browser**

Open `http://localhost:3000` and test:

1. Click "Go to About →" — forward transition should play (current page slides up + fades, about page reveals from bottom via clip-path)
2. Click "← Back to home" — back transition should play (about page slides right, home page slides in from left)
3. Use browser back button — should trigger back transition
4. Use browser forward button — should trigger forward transition
5. Click rapidly — should not break (second click ignored during transition)
6. Cmd+click a link — should open in new tab (no transition)
7. Elements with `data-enter` on the about page should fade/slide in after transition completes

- [ ] **Step 3: Check reduced motion**

In browser devtools, enable "prefers-reduced-motion: reduce" and verify navigation works with instant swaps (no animation).
