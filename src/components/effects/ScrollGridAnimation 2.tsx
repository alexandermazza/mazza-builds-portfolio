"use client";

import { useRef, Children } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import type { TargetAndTransition } from "motion/react";
import { DURATION, EASE_OUT_MOTION, GRID_ITEM_STAGGER } from "@/lib/motion";

type Variant = "fade-up" | "scale" | "slide-in";

interface ScrollGridAnimationProps {
  children: React.ReactNode;
  stagger?: number;
  variant?: Variant;
  className?: string;
}

const variants: Record<Variant, { initial: TargetAndTransition; animate: TargetAndTransition }> = {
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
  const prefersReduced = useReducedMotion();

  const { initial, animate } = variants[variant];

  return (
    <div ref={ref} className={className}>
      {Children.map(children, (child, i) => (
        <motion.div
          key={i}
          style={{ minWidth: 0 }}
          initial={prefersReduced ? animate : initial}
          animate={isInView ? animate : initial}
          transition={prefersReduced ? { duration: 0 } : {
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
