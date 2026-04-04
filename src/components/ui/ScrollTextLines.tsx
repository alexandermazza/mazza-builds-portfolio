"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { DURATION, EASE_OUT_MOTION, LINE_REVEAL_STAGGER } from "@/lib/motion";

interface ScrollTextLinesProps {
  children: string;
  className?: string;
}

function splitIntoLines(text: string): string[] {
  // Split on explicit newlines first
  if (text.includes("\n")) {
    return text.split("\n").filter((line) => line.trim().length > 0);
  }
  // Otherwise split on period-space boundaries only (keeps period with preceding sentence)
  const sentences = text.split(/(?<=\.)\s+/);
  if (sentences.length > 1) {
    return sentences.map((s) => s.trim()).filter(Boolean);
  }
  // Single sentence — return as-is
  return [text];
}

export function ScrollTextLines({
  children,
  className = "",
}: ScrollTextLinesProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  const lines = splitIntoLines(children);

  return (
    <div ref={ref} className={className}>
      {lines.map((line, i) => (
        <motion.span
          key={`${line.slice(0, 10)}-${i}`}
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : undefined}
          transition={{
            duration: DURATION.transition,
            ease: EASE_OUT_MOTION,
            delay: i * LINE_REVEAL_STAGGER,
          }}
          style={{ display: "block" }}
        >
          {line}
        </motion.span>
      ))}
    </div>
  );
}
