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

  // Register animation functions on mount
  useEffect(() => {
    registerTransitions(forwardTransition, backTransition);
  }, []);

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

        dbg("runTransition:waiting-for-images");
        await waitForImages(nextEl);
        dbg("runTransition:images-ready");

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
        document.body.style.overflow = "";

        // 6. Reveal — skip enterAnimation since GSAP already animated the page in.
        // The enter animation's fromTo would hide [data-enter] elements and
        // re-animate them, causing a visible "double load" flash.
        gsap.set(nextEl, { opacity: 1 });
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

      dbg("navigate:starting-transition", { href });
      isTransitioningRef.current = true;
      setIsTransitioning(true);
      pendingHrefRef.current = href;
      document.body.style.overflow = "hidden";

      // Clone current page before Next.js swaps content
      const currentEl = containerRef.current;
      if (!currentEl) {
        isTransitioningRef.current = false;
        setIsTransitioning(false);
        document.body.style.overflow = "";
        router.push(href);
        return;
      }

      cloneRef.current = cloneCurrentPage(currentEl);

      // Hide the real container BEFORE router.push.
      // The clone covers the viewport, so the user sees the old page.
      // When React swaps children underneath, it's invisible.
      gsap.set(currentEl, { opacity: 0 });

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
          isTransitioningRef.current = false;
          isPopStateRef.current = false;
          transitionRunningRef.current = false;
          setIsTransitioning(false);
          pendingHrefRef.current = null;
          document.body.style.overflow = "";
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

      isPopStateRef.current = true;
      isTransitioningRef.current = true;
      setIsTransitioning(true);
      document.body.style.overflow = "hidden";

      const currentEl = containerRef.current;
      if (currentEl) {
        cloneRef.current = cloneCurrentPage(currentEl);
        gsap.set(currentEl, { opacity: 0 });

        setTimeout(() => {
          if (isTransitioningRef.current && cloneRef.current) {
            cloneRef.current.remove();
            cloneRef.current = null;
            if (containerRef.current) {
              gsap.set(containerRef.current, { clearProps: "all" });
            }
            isTransitioningRef.current = false;
            isPopStateRef.current = false;
            transitionRunningRef.current = false;
            setIsTransitioning(false);
            document.body.style.overflow = "";
          }
        }, 5000);
      } else {
        isPopStateRef.current = false;
        isTransitioningRef.current = false;
        setIsTransitioning(false);
        document.body.style.overflow = "";
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <TransitionContext value={{ navigate, registerContainer, isTransitioning }}>
      {children}
    </TransitionContext>
  );
}
