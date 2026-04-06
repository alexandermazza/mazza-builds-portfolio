"use client";

import { useRef, useEffect, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface ConnectionLineProps {
  label: string;
  href: string;
  /** Delay offset in seconds for staggered entrance */
  delay?: number;
  className?: string;
}

export function ConnectionLine({
  label,
  href,
  delay = 0,
  className = "",
}: ConnectionLineProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const nodeRef = useRef<SVGCircleElement>(null);
  const labelRef = useRef<HTMLAnchorElement>(null);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    setPrefersReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (prefersReduced) return;
    const row = rowRef.current;
    const line = lineRef.current;
    const node = nodeRef.current;
    const labelEl = labelRef.current;
    if (!row || !line || !node || !labelEl) return;

    gsap.set(line, { attr: { x2: 16 } }); // start collapsed
    gsap.set(node, { attr: { fill: "transparent" } });
    gsap.set(labelEl, { opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: row,
        start: "top 85%",
        end: "top 50%",
        scrub: true,
      },
    });

    tl.to(line, { attr: { x2: 200 }, duration: 0.6, ease: "power2.out", delay })
      .to(labelEl, { opacity: 1, duration: 0.2 }, ">-0.2")
      .to(node, { attr: { fill: "var(--text-primary)" }, duration: 0.2 }, ">-0.1");

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [delay, prefersReduced]);

  return (
    <div ref={rowRef} className={`flex items-center gap-[var(--space-md)] ${className}`}>
      <svg width="220" height="20" className="shrink-0" style={{ overflow: "visible" }}>
        {/* Node circle */}
        <circle
          ref={nodeRef}
          cx={8}
          cy={10}
          r={4}
          stroke="var(--border-visible)"
          strokeWidth={1}
          fill={prefersReduced ? "var(--text-primary)" : "transparent"}
        />
        {/* Horizontal line */}
        <line
          ref={lineRef}
          x1={16}
          y1={10}
          x2={prefersReduced ? 200 : 16}
          y2={10}
          stroke="var(--border-visible)"
          strokeWidth={1}
        />
      </svg>

      <a
        ref={labelRef}
        href={href}
        target={href.startsWith("mailto:") ? undefined : "_blank"}
        rel={href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
        className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        style={{
          opacity: prefersReduced ? 1 : 0,
          transitionDuration: "var(--duration-micro)",
        }}
      >
        {label}
      </a>
    </div>
  );
}
