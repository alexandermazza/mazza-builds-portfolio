"use client";

import { useRef, useEffect, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface AnimatedRuleProps {
  label?: string;
  className?: string;
}

export function AnimatedRule({
  label = "REV 01 - 2026",
  className = "",
}: AnimatedRuleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    setPrefersReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (prefersReduced) return;
    const container = containerRef.current;
    const line = lineRef.current;
    const labelEl = labelRef.current;
    if (!container || !line || !labelEl) return;

    const width = container.getBoundingClientRect().width;
    gsap.set(line, { attr: { x2: 0 } });
    gsap.set(labelEl, { opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top 85%",
        end: "top 50%",
        scrub: true,
      },
    });

    tl.to(line, { attr: { x2: width }, duration: 0.6, ease: "power2.out" })
      .to(labelEl, { opacity: 1, duration: 0.2 }, ">-0.1");

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [prefersReduced]);

  return (
    <div ref={containerRef} className={`flex items-center gap-[var(--space-md)] ${className}`}>
      <svg className="h-px flex-1" style={{ overflow: "visible" }}>
        <line
          ref={lineRef}
          x1={0}
          y1={0}
          x2={prefersReduced ? "100%" : 0}
          y2={0}
          stroke="var(--border-visible)"
          strokeWidth={1}
        />
      </svg>
      <span
        ref={labelRef}
        className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]"
        style={{ opacity: prefersReduced ? 1 : 0 }}
      >
        {label}
      </span>
    </div>
  );
}
