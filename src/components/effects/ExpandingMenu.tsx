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

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

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
        <span className="block h-[6px] w-[6px] rounded-full bg-current" />
      </button>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[9998] flex flex-col items-center justify-center"
            style={{ backgroundColor: "var(--surface)" }}
            initial={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0.95, clipPath: "circle(0% at calc(100% - 44px) calc(100% - 44px))" }
            }
            animate={
              reducedMotion
                ? { opacity: 0.95 }
                : { opacity: 0.95, clipPath: "circle(150% at calc(100% - 44px) calc(100% - 44px))" }
            }
            exit={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0.95, clipPath: "circle(0% at calc(100% - 44px) calc(100% - 44px))" }
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
