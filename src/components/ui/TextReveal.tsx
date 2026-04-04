"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { DURATION, EASE_OUT_MOTION, TEXT_REVEAL_STAGGER } from "@/lib/motion";

type TextRevealElement = "h2" | "h3" | "p" | "span";

interface TextRevealProps {
  children: string;
  as?: TextRevealElement;
  className?: string;
}

export function TextReveal({
  children,
  as: Tag = "p",
  className = "",
}: TextRevealProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const words = children.split(" ");

  // motion.h2, motion.h3, etc.
  const MotionTag = motion.create(Tag);

  return (
    <MotionTag ref={ref} className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
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
