"use client";

import { useRef, useEffect, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface SystemNode {
  name: string;
  sublabel: string;
}

const nodes: SystemNode[] = [
  { name: "DAILY ROMAN", sublabel: "iOS / SwiftUI" },
  { name: "SHOPIFY APP", sublabel: "Commerce / Remix" },
  { name: "AI SYSTEMS", sublabel: "Claude API / Automation" },
];

export function SystemDiagram({ className = "" }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const vertLineRef = useRef<HTMLDivElement>(null);
  const horizLineRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dropRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    setPrefersReduced(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  useEffect(() => {
    if (prefersReduced) return;
    const container = containerRef.current;
    const hub = hubRef.current;
    const vertLine = vertLineRef.current;
    const horizLine = horizLineRef.current;
    if (!container || !hub || !vertLine || !horizLine) return;

    const nodeEls = nodeRefs.current.filter(Boolean) as HTMLDivElement[];
    const dropEls = dropRefs.current.filter(Boolean) as HTMLDivElement[];

    gsap.set(hub, { opacity: 0 });
    gsap.set(vertLine, { scaleY: 0, transformOrigin: "top" });
    gsap.set(horizLine, { scaleX: 0 });
    gsap.set(dropEls, { scaleY: 0, transformOrigin: "top" });
    gsap.set(nodeEls, { opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top 80%",
        end: "top 30%",
        scrub: true,
      },
    });

    tl.to(hub, { opacity: 1, duration: 0.15 })
      .to(vertLine, { scaleY: 1, duration: 0.15, ease: "none" })
      .to(horizLine, { scaleX: 1, duration: 0.2, ease: "none" })
      .to(dropEls, {
        scaleY: 1,
        duration: 0.15,
        ease: "none",
        stagger: 0.05,
      })
      .to(nodeEls, { opacity: 1, duration: 0.15, stagger: 0.05 });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [prefersReduced]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col items-center ${className}`}
    >
      {/* Hub node */}
      <div
        ref={hubRef}
        className="border border-[var(--border-visible)] px-[var(--space-lg)] py-[var(--space-sm)]"
        style={{ opacity: prefersReduced ? 1 : 0 }}
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-primary)]">
          MAZZA BUILDS
        </span>
      </div>

      {/* Vertical line from hub — desktop only */}
      <div
        ref={vertLineRef}
        className="hidden h-[var(--space-2xl)] w-px bg-[var(--border-visible)] md:block"
        style={{
          transform: prefersReduced ? "none" : "scaleY(0)",
          transformOrigin: "top",
        }}
      />

      {/* Horizontal connector — desktop only */}
      <div
        ref={horizLineRef}
        className="hidden h-px w-full bg-[var(--border-visible)] md:block"
        style={{ transform: prefersReduced ? "none" : "scaleX(0)" }}
      />

      {/* Node cards */}
      <div role="list" className="mt-[var(--space-lg)] grid w-full grid-cols-1 gap-[var(--space-lg)] md:mt-0 md:grid-cols-3">
        {nodes.map((node, i) => (
          <div key={node.name} role="listitem" className="flex flex-col items-center">
            {/* Vertical drop line — desktop only */}
            <div
              ref={(el) => {
                dropRefs.current[i] = el;
              }}
              className="hidden h-[var(--space-xl)] w-px bg-[var(--border-visible)] md:block"
              style={{
                transform: prefersReduced ? "none" : "scaleY(0)",
                transformOrigin: "top",
              }}
            />
            {/* Node card */}
            <div
              ref={(el) => {
                nodeRefs.current[i] = el;
              }}
              className="w-full border border-[var(--border-visible)] px-[var(--space-lg)] py-[var(--space-md)] text-center"
              style={{ opacity: prefersReduced ? 1 : 0 }}
            >
              <p className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-primary)]">
                {node.name}
              </p>
              <p className="mt-[var(--space-xs)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                {node.sublabel}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
