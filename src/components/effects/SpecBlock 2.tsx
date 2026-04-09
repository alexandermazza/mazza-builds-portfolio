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
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    setPrefersReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (!contentRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setHeight(Math.round(entry.contentRect.height));
    });
    ro.observe(contentRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (prefersReduced || !height) return;
    const container = containerRef.current;
    const line = lineRef.current;
    const topTick = topTickRef.current;
    const bottomTick = bottomTickRef.current;
    if (!container || !line || !topTick || !bottomTick) return;

    gsap.set(line, { attr: { y2: 0 } });
    gsap.set([topTick, bottomTick], { attr: { x1: 0, x2: 0 } });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top 80%",
        end: "top 30%",
        scrub: true,
      },
    });

    tl.to(line, { attr: { y2: height }, duration: 0.5, ease: "none" })
      .to([topTick, bottomTick], { attr: { x1: -12, x2: 0 }, duration: 0.2 }, ">-0.2");

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [height, prefersReduced]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <p className="mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
        {label}
      </p>

      <div className="relative pl-[var(--space-2xl)]">
        <svg
          className="absolute left-0 top-0 hidden h-full w-[var(--space-2xl)] overflow-visible md:block"
          style={{ pointerEvents: "none" }}
        >
          <line
            ref={lineRef}
            x1={16}
            y1={0}
            x2={16}
            y2={prefersReduced ? height : 0}
            stroke="var(--border-visible)"
            strokeWidth={1}
          />
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

        <div ref={contentRef}>
          {children}
        </div>
      </div>
    </div>
  );
}
