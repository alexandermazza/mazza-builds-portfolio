"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface SectionMark {
  y: number;
  height: number;
}

interface DimensionOverlayProps {
  /** Refs or query selector for the sections to mark */
  sectionSelector?: string;
  className?: string;
}

export function DimensionOverlay({
  sectionSelector = "[data-spec-section]",
  className = "",
}: DimensionOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [marks, setMarks] = useState<SectionMark[]>([]);
  const [totalHeight, setTotalHeight] = useState(0);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    setPrefersReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const computeMarks = useCallback(() => {
    const sections = document.querySelectorAll<HTMLElement>(sectionSelector);
    const parent = svgRef.current?.parentElement;
    if (!parent || sections.length === 0) return;

    const parentRect = parent.getBoundingClientRect();
    const newMarks: SectionMark[] = [];

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      newMarks.push({
        y: rect.top - parentRect.top,
        height: rect.height,
      });
    });

    setMarks(newMarks);
    setTotalHeight(parent.scrollHeight);
  }, [sectionSelector]);

  useEffect(() => {
    // Wait for layout to settle
    const timer = setTimeout(computeMarks, 100);
    const ro = new ResizeObserver(computeMarks);
    if (svgRef.current?.parentElement) {
      ro.observe(svgRef.current.parentElement);
    }
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [computeMarks]);

  // Animate the vertical line drawing
  useEffect(() => {
    if (prefersReduced || !totalHeight || !svgRef.current) return;

    const mainLine = svgRef.current.querySelector<SVGLineElement>("[data-main-line]");
    if (!mainLine) return;

    gsap.set(mainLine, { attr: { y2: 0 } });

    const trigger = ScrollTrigger.create({
      trigger: svgRef.current.parentElement,
      start: "top 80%",
      end: "bottom 20%",
      scrub: true,
      onUpdate: (self) => {
        gsap.set(mainLine, { attr: { y2: totalHeight * self.progress } });
      },
    });

    return () => {
      trigger.kill();
    };
  }, [totalHeight, prefersReduced]);

  return (
    <svg
      ref={svgRef}
      className={`pointer-events-none absolute left-[16px] top-0 hidden h-full w-[32px] md:block ${className}`}
      style={{ overflow: "visible" }}
    >
      {/* Main vertical line */}
      <line
        data-main-line
        x1={16}
        y1={0}
        x2={16}
        y2={prefersReduced ? totalHeight : 0}
        stroke="var(--border-visible)"
        strokeWidth={1}
      />

      {/* Tick marks and annotations at each section */}
      {marks.map((mark, i) => (
        <g key={i}>
          {/* Top tick */}
          <line
            x1={8}
            y1={mark.y}
            x2={24}
            y2={mark.y}
            stroke="var(--border-visible)"
            strokeWidth={1}
          />
          {/* Height annotation */}
          {i < marks.length - 1 && (
            <text
              x={28}
              y={mark.y + mark.height / 2}
              fill="var(--text-disabled)"
              fontSize={9}
              fontFamily="var(--font-space-mono), monospace"
              dominantBaseline="middle"
            >
              {Math.round(mark.height)}px
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
