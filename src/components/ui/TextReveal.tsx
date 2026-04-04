"use client";

import { useRef } from "react";
import type React from "react";
import { motion, useInView } from "motion/react";
import { DURATION, EASE_OUT_MOTION, TEXT_REVEAL_STAGGER } from "@/lib/motion";

type TextRevealElement = "h2" | "h3" | "p" | "span";

interface TextRevealProps {
  children: string;
  as?: TextRevealElement;
  className?: string;
}

const motionElements = {
  h2: motion.create("h2"),
  h3: motion.create("h3"),
  p: motion.create("p"),
  span: motion.create("span"),
} as const;

export function TextReveal({
  children,
  as: Tag = "p",
  className = "",
}: TextRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const words = children.trim().split(/\s+/).filter(Boolean);

  const MotionTag = motionElements[Tag];

  return (
    <MotionTag ref={ref as React.Ref<never>} className={className}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : undefined}
          transition={{
            duration: DURATION.transition,
            ease: EASE_OUT_MOTION,
            delay: i * TEXT_REVEAL_STAGGER,
          }}
          style={{ display: "inline-block" }}
        >
          {word}
          {i < words.length - 1 && "\u00A0"}
        </motion.span>
      ))}
    </MotionTag>
  );
}
