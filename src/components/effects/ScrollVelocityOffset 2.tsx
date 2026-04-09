"use client";

import { motion, useScroll, useVelocity, useTransform, useSpring, useReducedMotion } from "motion/react";
import { SCROLL_VELOCITY_MULTIPLIER, SPRING_FLUID } from "@/lib/motion";

interface ScrollVelocityOffsetProps {
  children: React.ReactNode;
  multiplier?: number;
  axis?: "x" | "y";
  className?: string;
}

export function ScrollVelocityOffset({
  children,
  multiplier = SCROLL_VELOCITY_MULTIPLIER,
  axis = "y",
  className = "",
}: ScrollVelocityOffsetProps) {
  const prefersReduced = useReducedMotion();
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);

  const clampedVelocity = useTransform(scrollVelocity, [-3000, 0, 3000], [-1, 0, 1]);
  const offset = useTransform(clampedVelocity, (v) => prefersReduced ? 0 : v * multiplier * 40);
  const smoothOffset = useSpring(offset, SPRING_FLUID);

  const style = axis === "y" ? { y: smoothOffset } : { x: smoothOffset };

  return (
    <motion.div className={className} style={style}>
      {children}
    </motion.div>
  );
}
