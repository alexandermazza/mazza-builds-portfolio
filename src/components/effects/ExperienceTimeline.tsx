"use client";

import { useRef, useEffect, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface ExperienceEntry {
  title: string;
  company: string;
  dateRange: string;
  description: string;
}

interface ExperienceTimelineProps {
  entries: ExperienceEntry[];
  className?: string;
}

export function ExperienceTimeline({
  entries,
  className = "",
}: ExperienceTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spineRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const connectorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    setPrefersReduced(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  useEffect(() => {
    if (prefersReduced) return;
    const container = containerRef.current;
    const spine = spineRef.current;
    if (!container || !spine) return;

    const nodeEls = nodeRefs.current.filter(Boolean) as HTMLDivElement[];
    const connectorEls = connectorRefs.current.filter(
      Boolean,
    ) as HTMLDivElement[];
    const cardEls = cardRefs.current.filter(Boolean) as HTMLDivElement[];

    gsap.set(spine, { scaleY: 0, transformOrigin: "top" });
    gsap.set(nodeEls, { scale: 0 });
    gsap.set(connectorEls, { scaleX: 0, transformOrigin: "left" });
    gsap.set(cardEls, { opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top 80%",
        toggleActions: "play none none none",
      },
    });

    // Spine draws down first
    tl.to(spine, { scaleY: 1, duration: 0.3, ease: "none" });

    // Each entry: node pops, connector extends, card fades in
    nodeEls.forEach((_, i) => {
      tl.to(nodeEls[i], { scale: 1, duration: 0.05 })
        .to(connectorEls[i], { scaleX: 1, duration: 0.08 }, ">")
        .to(cardEls[i], { opacity: 1, duration: 0.08 }, ">");
    });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [prefersReduced, entries.length]);

  return (
    <div ref={containerRef} className={`relative pl-12 ${className}`}>
      {/* Vertical spine */}
      <div
        ref={spineRef}
        className="absolute left-[4px] top-0 h-full w-px bg-[var(--border-visible)]"
        style={{
          transform: prefersReduced ? "none" : "scaleY(0)",
          transformOrigin: "top",
        }}
      />

      {entries.map((entry, i) => (
        <div
          key={`${entry.company}-${entry.dateRange}`}
          className={i > 0 ? "mt-[var(--space-2xl)]" : ""}
        >
          <div className="relative">
            {/* Node circle — centered on spine */}
            <div
              ref={(el) => {
                nodeRefs.current[i] = el;
              }}
              className="absolute -left-12 top-4 h-[10px] w-[10px] rounded-full border border-[var(--border-visible)] bg-[var(--surface)]"
              style={{ transform: prefersReduced ? "none" : "scale(0)" }}
            />

            {/* Horizontal connector — from node to card */}
            <div
              ref={(el) => {
                connectorRefs.current[i] = el;
              }}
              className="absolute -left-[37px] top-[18px] h-px w-[37px] bg-[var(--border-visible)]"
              style={{
                transform: prefersReduced ? "none" : "scaleX(0)",
                transformOrigin: "left",
              }}
            />

            {/* Card */}
            <div
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className="border border-[var(--border-visible)] p-[var(--space-md)]"
              style={{
                opacity: prefersReduced ? 1 : 0,
                borderRadius: "var(--radius-card)",
              }}
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
                {entry.dateRange}
              </p>
              <h3 className="mt-[var(--space-xs)] font-sans text-[16px] font-medium text-[var(--text-primary)]">
                {entry.title}
              </h3>
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                {entry.company}
              </p>
              <p className="mt-[var(--space-sm)] font-sans text-[var(--body-sm)] leading-[1.5] text-[var(--text-secondary)]">
                {entry.description}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
