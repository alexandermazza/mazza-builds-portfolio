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
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { lockOverflow, unlockOverflow } from "@/lib/overflow-lock";
import {
  getTransition,
  registerTransitions,
} from "./registry";
import { forwardTransition } from "./animations/forward";
import { backTransition } from "./animations/back";
import { enterAnimation } from "./animations/enter";

// Register at module level — these are static imports with no DOM dependency.
// Avoids a race where a user clicks a TransitionLink before the useEffect fires.
registerTransitions(forwardTransition, backTransition);

// ── Context ──────────────────────────────────────────────

interface TransitionContextValue {
  navigate: (href: string) => void;
  registerContainer: (el: HTMLDivElement | null) => void;
  warmCanvasCache: () => void;
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

// ── Canvas snapshot cache ────────────────────────────────
// Pre-captures canvas pixels on idle / hover so cloneCurrentPage
// never does a synchronous GPU readback at transition time.

const canvasCache = new WeakMap<HTMLCanvasElement, string>();

function snapshotCanvases(container: HTMLElement) {
  const canvases = container.querySelectorAll("canvas");
  canvases.forEach((c) => {
    try {
      const dataUrl = c.toDataURL();
      if (dataUrl && dataUrl.length > 6) canvasCache.set(c, dataUrl);
    } catch { /* cross-origin or detached — skip */ }
  });
}

function cloneCurrentPage(el: HTMLElement): HTMLDivElement {
  const scrollY = window.scrollY;

  // Use pre-cached snapshots; fall back to sync toDataURL only on cache miss
  const canvases = el.querySelectorAll("canvas");
  const snapshots: string[] = [];
  canvases.forEach((c) => {
    const cached = canvasCache.get(c);
    if (cached) {
      snapshots.push(cached);
    } else {
      try { snapshots.push(c.toDataURL()); } catch { snapshots.push(""); }
    }
  });

  const clone = el.cloneNode(true) as HTMLDivElement;

  // Replace cloned canvases with static images of the last frame
  const clonedCanvases = clone.querySelectorAll("canvas");
  clonedCanvases.forEach((c, i) => {
    if (!snapshots[i]) return;
    const img = document.createElement("img");
    img.src = snapshots[i];
    img.style.width = "100%";
    img.style.height = "100%";
    c.replaceWith(img);
  });

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

// ── Debug logging (set to false for production) ─────────
const DEBUG = false;
function dbg(label: string, data?: Record<string, unknown>) {
  if (!DEBUG) return;
  const t = performance.now().toFixed(1);
  console.log(`[TRANSITION ${t}ms] ${label}`, data ?? "");
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

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cloneRef = useRef<HTMLDivElement | null>(null);
  const isTransitioningRef = useRef(false);
  const transitionRunningRef = useRef(false);
  const pendingHrefRef = useRef<string | null>(null);
  const previousPathRef = useRef(pathname);
  const isPopStateRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const isMobileRef = useRef(false);

  // Detect reduced motion preference
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mql.matches;
    const handler = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    isMobileRef.current = mql.matches;
    const handler = (e: MediaQueryListEvent) => {
      isMobileRef.current = e.matches;
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // ── Canvas pre-cache (idle + on-demand) ────────────────

  const warmCanvasCache = useCallback(() => {
    const el = containerRef.current;
    if (el) snapshotCanvases(el);
  }, []);

  useEffect(() => {
    // Pre-snapshot canvases during idle time so transitions are instant.
    const hasIdleCb = typeof requestIdleCallback !== "undefined";

    let handle: number;
    function loop() {
      warmCanvasCache();
      handle = hasIdleCb
        ? (requestIdleCallback(loop, { timeout: 2000 }) as unknown as number)
        : (setTimeout(loop, 500) as unknown as number);
    }
    handle = hasIdleCb
      ? (requestIdleCallback(loop, { timeout: 1000 }) as unknown as number)
      : (setTimeout(loop, 200) as unknown as number);

    return () => {
      if (hasIdleCb) cancelIdleCallback(handle);
      else clearTimeout(handle);
    };
  }, [warmCanvasCache]);

  // ── Transition runner ──────────────────────────────────

  const runTransition = useCallback(
    async (
      clone: HTMLDivElement,
      nextEl: HTMLDivElement,
      prevPath: string,
      nextPath: string
    ) => {
      if (transitionRunningRef.current) {
        dbg("runTransition:SKIPPED (already running)");
        return;
      }
      transitionRunningRef.current = true;

      try {
        dbg("runTransition:start", { prevPath, nextPath });

        const transitionFn = getTransition(
          prevPath,
          nextPath,
          isPopStateRef.current
        );

        // Don't wait for images. The forward transition reveals bottom-up
        // via clip-path, so top-of-page images have the full animation
        // duration to load, and next/image reserves layout space up front.

        // The container was hidden before router.push (in navigate()).
        // The transition function will set its own initial state (clipPath, position, etc.)
        // and restore opacity as part of the animation setup.
        gsap.set(nextEl, { opacity: 1 });
        dbg("runTransition:starting-animation");

        const tl = transitionFn(clone, nextEl);
        await tl.then();
        dbg("runTransition:animation-complete");
      } finally {
        dbg("cleanup:start");

        // 1. Hide while cleaning up layout
        gsap.set(nextEl, { opacity: 0 });

        // 2. Remove the clone overlay
        clone.remove();
        cloneRef.current = null;

        // 3. Clear GSAP inline styles → element returns to normal flow
        gsap.set(nextEl, {
          clearProps:
            "clipPath,position,top,left,width,height,zIndex,x,y,scale,transform",
        });

        // 4. Scroll to top while hidden
        window.scrollTo(0, 0);

        // 5. Reset state
        isTransitioningRef.current = false;
        isPopStateRef.current = false;
        setIsTransitioning(false);
        previousPathRef.current = nextPath;
        pendingHrefRef.current = null;
        unlockOverflow();

        // 6. Reveal — skip enterAnimation since GSAP already animated the page in.
        // The enter animation's fromTo would hide [data-enter] elements and
        // re-animate them, causing a visible "double load" flash.
        gsap.set(nextEl, { opacity: 1 });
        const footer = document.querySelector("footer");
        if (footer) gsap.set(footer, { opacity: 1 });

        // Recalculate ScrollTrigger positions — they were created while the
        // container was position:fixed / 100vh, so all measurements are wrong.
        // Defer to next frame to avoid layout thrashing during cleanup.
        requestAnimationFrame(() => ScrollTrigger.refresh());

        transitionRunningRef.current = false;
        dbg("cleanup:done");
      }
    },
    []
  );

  // ── Pathname change detection ─────────────────────────
  // The container lives in layout.tsx (persistent, never remounts).
  // When pathname changes, React has swapped the children inside the
  // container. We start the animation here.

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
      // Mobile: slide + fade in the new page (direction-aware)
      previousPathRef.current = pathname;
      const nextEl = containerRef.current;
      if (nextEl) {
        window.scrollTo(0, 0);
        const footer = document.querySelector("footer");
        const enterFromY = isPopStateRef.current ? -30 : 30;
        gsap.fromTo(
          [nextEl, footer].filter(Boolean),
          { y: enterFromY, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.3,
            ease: "power2.out",
            force3D: true,
            onComplete: () => {
              gsap.set([nextEl, footer].filter(Boolean), { clearProps: "y,transform" });
              isTransitioningRef.current = false;
              isPopStateRef.current = false;
              setIsTransitioning(false);
              pendingHrefRef.current = null;
              unlockOverflow();
              requestAnimationFrame(() => ScrollTrigger.refresh());
            },
          }
        );
      } else {
        isTransitioningRef.current = false;
        isPopStateRef.current = false;
        setIsTransitioning(false);
        pendingHrefRef.current = null;
        unlockOverflow();
      }
    } else {
      // Non-animated navigation (reduced motion, etc.)
      previousPathRef.current = pathname;
    }
  }, [pathname, runTransition]);

  // ── Navigate (called by TransitionLink) ────────────────

  const navigate = useCallback(
    (href: string) => {
      dbg("navigate:called", {
        href,
        alreadyTransitioning: isTransitioningRef.current,
        currentPath: window.location.pathname,
      });
      if (isTransitioningRef.current) return;
      if (href === window.location.pathname) return;

      // External URLs
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) {
          window.location.href = href;
          return;
        }
      } catch {
        // Let Next.js handle
      }

      if (reducedMotionRef.current) {
        router.push(href);
        return;
      }

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
        const mobileFadeTween = gsap.to(
          [currentEl, footer].filter(Boolean),
          {
            y: -30,
            opacity: 0,
            duration: 0.25,
            ease: "power2.out",
            force3D: true,
            onComplete: () => {
              router.push(href, { scroll: false });
            },
          }
        );
        setTimeout(() => {
          if (isTransitioningRef.current) {
            mobileFadeTween.kill();
            if (containerRef.current) gsap.set(containerRef.current, { opacity: 1, y: 0, clearProps: "transform" });
            const safetyFooter = document.querySelector("footer");
            if (safetyFooter) gsap.set(safetyFooter, { opacity: 1, y: 0, clearProps: "transform" });
            isTransitioningRef.current = false;
            transitionRunningRef.current = false;
            setIsTransitioning(false);
            pendingHrefRef.current = null;
            unlockOverflow();
          }
        }, 2000);
        return;
      }

      dbg("navigate:starting-transition", { href });
      isTransitioningRef.current = true;
      setIsTransitioning(true);
      pendingHrefRef.current = href;
      lockOverflow();

      // Clone current page before Next.js swaps content
      const currentEl = containerRef.current;
      if (!currentEl) {
        isTransitioningRef.current = false;
        setIsTransitioning(false);
        unlockOverflow();
        router.push(href);
        return;
      }

      cloneRef.current = cloneCurrentPage(currentEl);

      // Hide the real container (and footer) BEFORE router.push.
      // The clone covers the viewport, so the user sees the old page.
      // When React swaps children underneath, it's invisible.
      gsap.set(currentEl, { opacity: 0 });
      const footer = document.querySelector("footer");
      if (footer) gsap.set(footer, { opacity: 0 });

      dbg("navigate:cloned-and-hidden, calling router.push");
      router.push(href, { scroll: false });

      // Safety timeout
      setTimeout(() => {
        if (isTransitioningRef.current) {
          dbg("navigate:safety-timeout-fired");
          cloneRef.current?.remove();
          cloneRef.current = null;
          if (containerRef.current) {
            gsap.set(containerRef.current, { clearProps: "all" });
          }
          const safetyFooter = document.querySelector("footer");
          if (safetyFooter) gsap.set(safetyFooter, { opacity: 1 });
          isTransitioningRef.current = false;
          isPopStateRef.current = false;
          transitionRunningRef.current = false;
          setIsTransitioning(false);
          pendingHrefRef.current = null;
          unlockOverflow();
        }
      }, 5000);
    },
    [router]
  );

  // ── Container registration (one-time, from layout) ─────

  const registerContainer = useCallback(
    (el: HTMLDivElement | null) => {
      dbg("registerContainer", { hasEl: !!el });
      containerRef.current = el;
    },
    []
  );

  // ── Browser back/forward ───────────────────────────────

  useEffect(() => {
    const handlePopState = () => {
      if (isTransitioningRef.current) return;
      if (reducedMotionRef.current) return;

      if (isMobileRef.current) {
        isPopStateRef.current = true;
        isTransitioningRef.current = true;
        setIsTransitioning(true);
        lockOverflow();
        const currentEl = containerRef.current;
        if (currentEl) {
          const footer = document.querySelector("footer");
          const mobileFadeTween = gsap.to(
            [currentEl, footer].filter(Boolean),
            {
              y: 30,
              opacity: 0,
              duration: 0.25,
              ease: "power2.out",
              force3D: true,
            }
          );
          setTimeout(() => {
            if (isTransitioningRef.current) {
              mobileFadeTween.kill();
              if (containerRef.current) gsap.set(containerRef.current, { opacity: 1, y: 0, clearProps: "transform" });
              const safetyFooter = document.querySelector("footer");
              if (safetyFooter) gsap.set(safetyFooter, { opacity: 1, y: 0, clearProps: "transform" });
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

      isPopStateRef.current = true;
      isTransitioningRef.current = true;
      setIsTransitioning(true);
      lockOverflow();

      const currentEl = containerRef.current;
      if (currentEl) {
        cloneRef.current = cloneCurrentPage(currentEl);
        gsap.set(currentEl, { opacity: 0 });
        const popFooter = document.querySelector("footer");
        if (popFooter) gsap.set(popFooter, { opacity: 0 });

        setTimeout(() => {
          if (isTransitioningRef.current && cloneRef.current) {
            cloneRef.current.remove();
            cloneRef.current = null;
            if (containerRef.current) {
              gsap.set(containerRef.current, { clearProps: "all" });
            }
            const safetyFooter = document.querySelector("footer");
            if (safetyFooter) gsap.set(safetyFooter, { opacity: 1 });
            isTransitioningRef.current = false;
            isPopStateRef.current = false;
            transitionRunningRef.current = false;
            setIsTransitioning(false);
            unlockOverflow();
          }
        }, 5000);
      } else {
        isPopStateRef.current = false;
        isTransitioningRef.current = false;
        setIsTransitioning(false);
        unlockOverflow();
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <TransitionContext value={{ navigate, registerContainer, warmCanvasCache, isTransitioning }}>
      {children}
    </TransitionContext>
  );
}
