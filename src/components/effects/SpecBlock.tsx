"use client";

import { useRef, useEffect, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface SpecBlockProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function SpecBlock({
  label,
  children,
  className = "",
}: SpecBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const topTickRef = useRef<SVGLineElement>(null);
  const bottomTickRef = useRef<SVGLineElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    setPrefersReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Measure content height
  useEffect(() => {
    if (!contentRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setHeight(Math.round(entry.contentRect.height));
    });
    ro.observe(contentRef.current);
    return () => ro.disconnect();
  }, []);

  // Animate dimension lines
  useEffect(() => {
    if (prefersReduced || !height) return;
    const container = containerRef.current;
    if (!container) return;

    const line = lineRef.current;
    const topTick = topTickRef.current;
    const bottomTick = bottomTickRef.current;
    const measure = measureRef.current;

    if (!line || !topTick || !bottomTick || !measure) return;

    // Set initial states
    gsap.set(line, { attr: { y2: 0 } });
    gsap.set([topTick, bottomTick], { attr: { x1: 0, x2: 0 } });
    gsap.set(measure, { opacity: 0 });

    const proxy = { val: 0 };

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top 80%",
        end: "top 30%",
        scrub: true,
      },
    });

    // Draw vertical line
    tl.to(line, { attr: { y2: height }, duration: 0.5, ease: "none" })
      // Extend tick marks
      .to([topTick, bottomTick], { attr: { x1: -12, x2: 0 }, duration: 0.2 }, ">-0.2")
      // Count up measurement
      .to(proxy, {
        val: height,
        duration: 0.3,
        snap: { val: 1 },
        onUpdate: () => {
          measure.textContent = `\u2195 ${Math.round(proxy.val)}px`;
        },
      }, ">-0.1")
      // Fade in measurement label
      .to(measure, { opacity: 1, duration: 0.1 }, "<");

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [height, prefersReduced]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Section label */}
      <p className="mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
        {label}
      </p>

      {/* Content with dimension lines */}
      <div className="relative pl-[var(--space-2xl)]">
        {/* SVG dimension lines — desktop only */}
        <svg
          className="absolute left-0 top-0 hidden h-full w-[var(--space-2xl)] overflow-visible md:block"
          style={{ pointerEvents: "none" }}
        >
          {/* Vertical dimension line */}
          <line
            ref={lineRef}
            x1={16}
            y1={0}
            x2={16}
            y2={prefersReduced ? height : 0}
            stroke="var(--border-visible)"
            strokeWidth={1}
          />
          {/* Top tick mark */}
          <line
            ref={topTickRef}
            x1={prefersReduced ? -12 : 0}
            y1={0}
            x2={0}
            y2={0}
            stroke="var(--border-visible)"
            strokeWidth={1}
            transform="translate(16, 0)"
          />
          {/* Bottom tick mark */}
          <line
            ref={bottomTickRef}
            x1={prefersReduced ? -12 : 0}
            y1={0}
            x2={0}
            y2={0}
            stroke="var(--border-visible)"
            strokeWidth={1}
            transform={`translate(16, ${height})`}
          />
        </svg>

        {/* Measurement annotation — desktop only */}
        <span
          ref={measureRef}
          className="absolute left-[-60px] top-1/2 hidden -translate-y-1/2 -rotate-90 font-mono text-[11px] tracking-[0.08em] text-[var(--text-disabled)] md:block"
          style={{ opacity: prefersReduced ? 1 : 0 }}
        >
          {prefersReduced ? `\u2195 ${height}px` : "\u2195 0px"}
        </span>

        {/* Actual content */}
        <div ref={contentRef}>
          {children}
        </div>
      </div>
    </div>
  );
}
