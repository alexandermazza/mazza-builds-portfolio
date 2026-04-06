"use client";

import { useRef, useEffect, useState, Children, useCallback } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { DURATION, EASE_OUT_MOTION, GRID_ITEM_STAGGER } from "@/lib/motion";

interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface ConnectedGridProps {
  children: React.ReactNode;
  columns?: number;
  lineColor?: string;
  className?: string;
}

export function ConnectedGrid({
  children,
  columns = 2,
  lineColor = "var(--border-visible)",
  className = "",
}: ConnectedGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const isInView = useInView(containerRef, { once: true, margin: "-60px" });
  const prefersReduced = useReducedMotion();

  const childArray = Children.toArray(children);

  if (itemRefs.current.length !== childArray.length) {
    itemRefs.current = new Array(childArray.length).fill(null);
  }

  const computeLines = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const computed: Line[] = [];
    const rects = itemRefs.current.map((el) =>
      el ? el.getBoundingClientRect() : null
    );
    const containerRect = container.getBoundingClientRect();

    for (let i = 0; i < rects.length; i++) {
      const a = rects[i];
      if (!a) continue;

      // Connect to right neighbor
      if ((i + 1) % columns !== 0 && i + 1 < rects.length) {
        const b = rects[i + 1];
        if (b) {
          computed.push({
            x1: a.right - containerRect.left,
            y1: a.top + a.height / 2 - containerRect.top,
            x2: b.left - containerRect.left,
            y2: b.top + b.height / 2 - containerRect.top,
          });
        }
      }

      // Connect to bottom neighbor
      if (i + columns < rects.length) {
        const b = rects[i + columns];
        if (b) {
          computed.push({
            x1: a.left + a.width / 2 - containerRect.left,
            y1: a.bottom - containerRect.top,
            x2: b.left + b.width / 2 - containerRect.left,
            y2: b.top - containerRect.top,
          });
        }
      }
    }

    setLines(computed);
  }, [columns]);

  useEffect(() => {
    computeLines();
    const ro = new ResizeObserver(computeLines);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [computeLines, childArray.length]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ overflow: "visible" }}>
        {lines.map((line, i) => {
          const length = Math.sqrt(
            (line.x2 - line.x1) ** 2 + (line.y2 - line.y1) ** 2
          );
          return (
            <motion.line
              key={`${line.x1}-${line.y1}-${line.x2}-${line.y2}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={lineColor}
              strokeWidth={1}
              strokeDasharray={length}
              initial={prefersReduced ? { strokeDashoffset: 0 } : { strokeDashoffset: length }}
              animate={isInView ? { strokeDashoffset: 0 } : { strokeDashoffset: length }}
              transition={prefersReduced ? { duration: 0 } : {
                duration: DURATION.transition * 2,
                ease: EASE_OUT_MOTION,
                delay: i * 0.1,
              }}
            />
          );
        })}
      </svg>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: "var(--space-2xl)",
        }}
      >
        {childArray.map((child, i) => (
          <motion.div
            key={i}
            ref={(el) => { itemRefs.current[i] = el; }}
            initial={prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={prefersReduced ? { duration: 0 } : {
              duration: DURATION.transition,
              ease: EASE_OUT_MOTION,
              delay: i * GRID_ITEM_STAGGER,
            }}
          >
            {child}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
