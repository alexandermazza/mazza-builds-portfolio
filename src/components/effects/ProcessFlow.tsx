"use client";

import { Fragment, useRef, useEffect, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface ProcessStep {
  label: string;
  annotation: string;
}

const steps: ProcessStep[] = [
  { label: "CONCEPT", annotation: "Research, scope" },
  { label: "DESIGN", annotation: "UI/UX, architecture" },
  { label: "BUILD", annotation: "Swift, TS, Next.js" },
  { label: "TEST", annotation: "QA, iteration" },
  { label: "SHIP", annotation: "Deploy, monitor" },
];

export function ProcessFlow({ className = "" }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    setPrefersReduced(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  useEffect(() => {
    if (prefersReduced) return;
    const container = containerRef.current;
    if (!container) return;

    const stepEls = stepRefs.current.filter(Boolean) as HTMLDivElement[];
    const lineEls = lineRefs.current.filter(Boolean) as HTMLDivElement[];

    // Interleave steps and lines for sequential animation
    const allEls: HTMLDivElement[] = [];
    stepEls.forEach((step, i) => {
      allEls.push(step);
      if (lineEls[i]) allEls.push(lineEls[i]);
    });

    gsap.set(allEls, { opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top 80%",
        end: "top 30%",
        scrub: true,
      },
    });

    tl.to(allEls, { opacity: 1, duration: 0.08, stagger: 0.08 });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [prefersReduced]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col items-stretch gap-0 md:flex-row md:items-center ${className}`}
    >
      {steps.map((step, i) => (
        <Fragment key={step.label}>
          {/* Step box */}
          <div
            ref={(el) => {
              stepRefs.current[i] = el;
            }}
            className="shrink-0 border border-[var(--border-visible)] px-[var(--space-md)] py-[var(--space-sm)] text-center"
            style={{ opacity: prefersReduced ? 1 : 0 }}
          >
            <p className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-primary)]">
              {step.label}
            </p>
            <p className="mt-[var(--space-2xs)] font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
              {step.annotation}
            </p>
          </div>

          {/* Connector line */}
          {i < steps.length - 1 && (
            <div
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              className="mx-auto h-[var(--space-md)] w-px bg-[var(--border-visible)] md:mx-0 md:h-px md:w-auto md:flex-1"
              style={{ opacity: prefersReduced ? 1 : 0 }}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}
