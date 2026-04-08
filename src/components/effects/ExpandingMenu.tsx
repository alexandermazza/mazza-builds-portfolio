"use client";

import { useState, useEffect, useCallback, type MouseEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TransitionLink } from "@/transitions";
import { DURATION, EASE_OUT_MOTION, MENU_ITEM_STAGGER } from "@/lib/motion";
import { lockOverflow, unlockOverflow } from "@/lib/overflow-lock";

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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  useEffect(() => {
    if (!isOpen) return;
    lockOverflow();
    return () => { unlockOverflow(); };
  }, [isOpen]);

  return (
    <div className={className}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed top-[var(--space-lg)] right-[var(--space-lg)] z-[9999] flex h-[44px] w-[44px] items-center justify-center rounded-full border border-[var(--accent)] bg-[var(--surface)] transition-colors hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] max-md:top-[var(--space-md)] max-md:left-1/2 max-md:right-auto max-md:-translate-x-1/2 max-md:h-[48px] max-md:w-[48px]"
        style={{
          transitionDuration: "var(--duration-micro)",
          transitionTimingFunction: "var(--ease-out)",
        }}
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        <span className="sr-only">Menu</span>
        <div className="relative flex w-[20px] flex-col items-center gap-[5px]">
          {/* Hamburger lines (visible when closed) */}
          <span
            className="block h-[1.5px] w-full origin-center bg-current transition-all"
            style={{
              transitionDuration: reducedMotion ? `${DURATION.micro}s` : `${DURATION.transition}s`,
              transitionTimingFunction: `cubic-bezier(${EASE_OUT_MOTION.join(",")})`,
              ...(reducedMotion
                ? { opacity: isOpen ? 0 : 1 }
                : { transform: isOpen ? "translateY(6.5px) rotate(45deg)" : "none" }),
              color: isOpen ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          />
          <span
            className="block h-[1.5px] w-full origin-center bg-current transition-all"
            style={{
              transitionDuration: reducedMotion ? `${DURATION.micro}s` : `${DURATION.transition}s`,
              transitionTimingFunction: `cubic-bezier(${EASE_OUT_MOTION.join(",")})`,
              opacity: isOpen ? 0 : 1,
              ...(reducedMotion ? {} : { transform: isOpen ? "scaleX(0)" : "none" }),
              color: isOpen ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          />
          <span
            className="block h-[1.5px] w-full origin-center bg-current transition-all"
            style={{
              transitionDuration: reducedMotion ? `${DURATION.micro}s` : `${DURATION.transition}s`,
              transitionTimingFunction: `cubic-bezier(${EASE_OUT_MOTION.join(",")})`,
              ...(reducedMotion
                ? { opacity: isOpen ? 0 : 1 }
                : { transform: isOpen ? "translateY(-6.5px) rotate(-45deg)" : "none" }),
              color: isOpen ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          />
        </div>
      </button>

      {/* Overlay */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[9998] flex flex-col items-center justify-center"
            style={{ backgroundColor: "var(--surface)" }}
            onClick={close}
            initial={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0.95, clipPath: isMobile
                    ? "circle(0% at 50% 40px)"
                    : "circle(0% at calc(100% - 44px) 44px)" }
            }
            animate={
              reducedMotion
                ? { opacity: 0.95 }
                : { opacity: 0.95, clipPath: isMobile
                    ? "circle(150% at 50% 40px)"
                    : "circle(150% at calc(100% - 44px) 44px)" }
            }
            exit={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0.95, clipPath: isMobile
                    ? "circle(0% at 50% 40px)"
                    : "circle(0% at calc(100% - 44px) 44px)" }
            }
            transition={{
              duration: reducedMotion ? 0 : 0.6,
              ease: EASE_OUT_MOTION,
            }}
          >
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
                    onClick={(e: MouseEvent) => {
                      e.stopPropagation();
                      close();
                    }}
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
