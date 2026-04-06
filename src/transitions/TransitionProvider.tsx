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

  // Detect reduced motion preference (reactive)
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
      try {
        const transitionFn = getTransition(
          prevPath,
          nextPath,
          isPopStateRef.current
        );
        await waitForImages(nextEl);

        const tl = transitionFn(clone, nextEl);
        await tl.then();
      } finally {
        // Cleanup always runs, even if GSAP throws
        clone.remove();
        cloneRef.current = null;
        gsap.set(nextEl, {
          clearProps:
            "clipPath,position,top,left,width,height,zIndex,opacity,x,y,scale,transform",
        });

        isTransitioningRef.current = false;
        isPopStateRef.current = false;
        setIsTransitioning(false);
        previousPathRef.current = nextPath;
        pendingHrefRef.current = null;
        document.body.style.overflow = "";

        window.scrollTo(0, 0);
        enterAnimation(nextEl);
      }
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
      } else {
        isTransitioningRef.current = false;
        setIsTransitioning(false);
        document.body.style.overflow = "";
        router.push(href);
        return;
      }

      router.push(href, { scroll: false });

      // Safety: if transition doesn't complete within 5s, force cleanup
      setTimeout(() => {
        if (isTransitioningRef.current) {
          cloneRef.current?.remove();
          cloneRef.current = null;
          isTransitioningRef.current = false;
          isPopStateRef.current = false;
          setIsTransitioning(false);
          pendingHrefRef.current = null;
          document.body.style.overflow = "";
        }
      }, 5000);
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

        // Safety: if transition doesn't complete within 5s, force cleanup
        setTimeout(() => {
          if (isTransitioningRef.current && cloneRef.current) {
            cloneRef.current.remove();
            cloneRef.current = null;
            isTransitioningRef.current = false;
            isPopStateRef.current = false;
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

  // ── Render ─────────────────────────────────────────────

  return (
    <TransitionContext value={{ navigate, registerContainer, isTransitioning }}>
      {children}
    </TransitionContext>
  );
}
