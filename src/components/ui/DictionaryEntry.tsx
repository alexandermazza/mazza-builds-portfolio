"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { DURATION, EASE_OUT_MOTION } from "@/lib/motion";

const SEGMENT_STAGGER = 0.12;

const segments = [
  { text: "mazza", className: "text-[var(--text-primary)] font-medium" },
  { text: " " },
  { text: "/ˈmah.zuh/", className: "italic" },
  { text: " · " },
  {
    text: "noun",
    className:
      "font-mono text-[11px] uppercase tracking-[0.06em]",
  },
  { text: " · " },
  { text: "Italian", className: "italic" },
  { text: " — a construction worker\u2019s sledgehammer" },
];

interface DictionaryEntryProps {
  className?: string;
}

export function DictionaryEntry({ className = "" }: DictionaryEntryProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -50px 0px" });

  return (
    <p
      ref={ref}
      className={`font-sans text-[var(--body-sm)] leading-[1.6] text-[var(--text-disabled)] ${className}`}
    >
      {segments.map((seg, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, filter: "blur(4px)" }}
          animate={
            isInView
              ? { opacity: 1, filter: "blur(0px)" }
              : undefined
          }
          transition={{
            duration: DURATION.transition,
            ease: EASE_OUT_MOTION,
            delay: i * SEGMENT_STAGGER,
          }}
          className={seg.className}
        >
          {seg.text}
        </motion.span>
      ))}
    </p>
  );
}
