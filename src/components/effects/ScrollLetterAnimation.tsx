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
