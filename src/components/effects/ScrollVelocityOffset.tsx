"use client";

import { useEffect, useState } from "react";
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
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 767px)").matches
      : false
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const clampedVelocity = useTransform(scrollVelocity, [-3000, 0, 3000], [-1, 0, 1]);
  const offset = useTransform(clampedVelocity, (v) => (prefersReduced || isMobile) ? 0 : v * multiplier * 40);
  const smoothOffset = useSpring(offset, SPRING_FLUID);
  const style = axis === "y" ? { y: smoothOffset } : { x: smoothOffset };

  if (isMobile) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} style={style}>
      {children}
    </motion.div>
  );
}
