"use client";

import { useRef, useEffect, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface SkillBarProps {
  name: string;
  /** Fill percentage 0-100 (aesthetic, not meaningful) */
  fill: number;
  /** Delay offset in seconds for staggered entrance */
  delay?: number;
  className?: string;
}

export function SkillBar({
  name,
  fill,
  delay = 0,
  className = "",
}: SkillBarProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const capRef = useRef<HTMLDivElement>(null);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    setPrefersReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (prefersReduced) return;
    const row = rowRef.current;
    const bar = barRef.current;
    const cap = capRef.current;
    if (!row || !bar || !cap) return;

    // Set initial state
    gsap.set(bar, { width: "0%" });
    gsap.set(cap, { opacity: 0 });
    gsap.set(row, { opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: row,
        start: "top 85%",
        end: "top 40%",
        scrub: true,
      },
    });

    tl.to(row, { opacity: 1, duration: 0.1, delay })
      .to(bar, { width: `${fill}%`, duration: 0.8, ease: "power2.out" }, `<+0.05`)
      .to(cap, { opacity: 1, duration: 0.1 }, ">-0.1");

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [fill, delay, prefersReduced]);

  return (
    <div
      ref={rowRef}
      className={`flex items-center gap-[var(--space-lg)] ${className}`}
      style={{ opacity: prefersReduced ? 1 : 0 }}
    >
      {/* Skill name */}
      <span className="w-[120px] shrink-0 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
        {name}
      </span>

      {/* Bar track */}
      <div className="relative h-[6px] flex-1 bg-[var(--border)]">
        {/* Bar fill */}
        <div
          ref={barRef}
          className="absolute inset-y-0 left-0 bg-[var(--text-primary)]"
          style={{ width: prefersReduced ? `${fill}%` : "0%" }}
        />
        {/* End cap */}
        <div
          ref={capRef}
          className="absolute top-[-3px] h-[12px] w-px bg-[var(--text-primary)]"
          style={{
            left: `${fill}%`,
            opacity: prefersReduced ? 1 : 0,
          }}
        />
      </div>
    </div>
  );
}
