"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  DURATION,
  EASE_OUT_MOTION,
  LINE_REVEAL_STAGGER,
  SPRING_FLUID,
} from "@/lib/motion";

interface SplitTextScatterProps {
  text: string;
  className?: string;
}

// Deterministic pseudo-random based on index (no Math.random)
function seededOffset(index: number, range: number): number {
  const x = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  const normalized = x - Math.floor(x); // 0..1
  return (normalized - 0.5) * 2 * range; // -range..+range
}

const CHAR_STAGGER = 0.02;

export function SplitTextScatter({
  text,
  className = "",
}: SplitTextScatterProps) {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    setIsDesktop(window.matchMedia("(min-width: 768px)").matches);
  }, []);

  // SSR / first render: show nothing until we know the mode
  if (isDesktop === null) {
    return (
      <h1 className={className} style={{ visibility: "hidden" }}>
        {text}
      </h1>
    );
  }

  const words = text.split(" ");

  // ─── Mobile: line-by-line fade + slide ─────────────────────────────
  if (!isDesktop) {
    return (
      <h1 className={className}>
        {words.map((word, wi) => (
          <motion.span
            key={`${word}-${wi}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: DURATION.transition,
              ease: EASE_OUT_MOTION,
              delay: wi * LINE_REVEAL_STAGGER,
            }}
            style={{ display: "inline-block" }}
          >
            {word}
            {wi < words.length - 1 && "\u00A0"}
          </motion.span>
        ))}
      </h1>
    );
  }

  // ─── Desktop: character scatter ────────────────────────────────────
  let charIndex = 0;

  return (
    <h1 className={className}>
      {words.map((word, wi) => (
        <span key={`word-${wi}`} style={{ display: "inline-block", whiteSpace: "pre" }}>
          {word.split("").map((char) => {
            const ci = charIndex++;
            const offsetX = seededOffset(ci, 50);
            const offsetY = seededOffset(ci + 100, 50);
            const rotation = seededOffset(ci + 200, 15);

            return (
              <motion.span
                key={`char-${ci}`}
                initial={{
                  opacity: 0,
                  x: offsetX,
                  y: offsetY,
                  rotate: rotation,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                  y: 0,
                  rotate: 0,
                }}
                transition={{
                  ...SPRING_FLUID,
                  delay: ci * CHAR_STAGGER,
                }}
                style={{ display: "inline-block" }}
              >
                {char}
              </motion.span>
            );
          })}
          {wi < words.length - 1 && (
            <span style={{ display: "inline-block" }}>{"\u00A0"}</span>
          )}
        </span>
      ))}
    </h1>
  );
}
