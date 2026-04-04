"use client";

import { type ComponentProps, useCallback, useEffect, useRef, useState } from "react";
import { useScroll, useMotionValueEvent } from "motion/react";

// ─── Constants ────────────────────────────────────────────────────────────────

const CELL_SPACING = 48;
const FILING_LENGTH = 20;
const FILING_THICKNESS = 1.5;
const REST_ANGLE = 0; // radians — horizontal at rest

// ─── Component ───────────────────────────────────────────────────────────────

export type MagneticFilingsProps = ComponentProps<"div">;

export function MagneticFilings({ className = "", ...props }: MagneticFilingsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const filingsRef = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);
  const focalRef = useRef({ x: 0, y: 0 });
  const isPointerFine = useRef(false);
  const reducedMotion = useRef(false);

  const [grid, setGrid] = useState<{ cols: number; rows: number }>({ cols: 0, rows: 0 });

  // ── Scroll tracking (mobile) ──────────────────────────────────────────────

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (isPointerFine.current || reducedMotion.current) return;
    const el = containerRef.current;
    if (!el) return;
    focalRef.current = { x: el.offsetWidth / 2, y: v * el.offsetHeight };
    updateFilings();
  });

  // ── Compute grid on mount + resize ────────────────────────────────────────

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    isPointerFine.current = window.matchMedia("(pointer: fine)").matches;

    function computeGrid() {
      const el = containerRef.current;
      if (!el) return;
      const cols = Math.floor(el.offsetWidth / CELL_SPACING);
      const rows = Math.floor(el.offsetHeight / CELL_SPACING);
      setGrid((prev) => (prev.cols === cols && prev.rows === rows ? prev : { cols, rows }));
    }

    computeGrid();
    const ro = new ResizeObserver(computeGrid);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Update filing rotations ───────────────────────────────────────────────

  const updateFilings = useCallback(() => {
    const el = containerRef.current;
    if (!el || reducedMotion.current) return;

    const { x: fx, y: fy } = focalRef.current;
    const cols = grid.cols || Math.floor(el.offsetWidth / CELL_SPACING);
    const rows = grid.rows || Math.floor(el.offsetHeight / CELL_SPACING);

    // Offsets to center the grid within the container
    const offsetX = (el.offsetWidth - (cols - 1) * CELL_SPACING) / 2;
    const offsetY = (el.offsetHeight - (rows - 1) * CELL_SPACING) / 2;

    for (let i = 0; i < filingsRef.current.length; i++) {
      const filing = filingsRef.current[i];
      if (!filing) continue;

      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = offsetX + col * CELL_SPACING;
      const cy = offsetY + row * CELL_SPACING;

      const angle = Math.atan2(fy - cy, fx - cx);
      filing.style.transform = `rotate(${angle}rad)`;
    }
  }, [grid]);

  // ── Mouse tracking (desktop) ──────────────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function handleMouseMove(e: MouseEvent) {
      if (!isPointerFine.current || reducedMotion.current) return;
      const rect = el!.getBoundingClientRect();
      focalRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          updateFilings();
          rafRef.current = null;
        });
      }
    }

    function handleMouseLeave() {
      if (!isPointerFine.current) return;
      // Reset to rest angle
      for (const filing of filingsRef.current) {
        if (filing) filing.style.transform = `rotate(${REST_ANGLE}rad)`;
      }
    }

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [updateFilings]);

  // ── Render ────────────────────────────────────────────────────────────────

  const totalFilings = grid.cols * grid.rows;

  // Pre-size the refs array
  if (filingsRef.current.length !== totalFilings) {
    filingsRef.current = new Array(totalFilings).fill(null);
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      {totalFilings > 0 && (
        <div
          className="absolute inset-0"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${grid.cols}, ${CELL_SPACING}px)`,
            gridTemplateRows: `repeat(${grid.rows}, ${CELL_SPACING}px)`,
            justifyContent: "center",
            alignContent: "center",
          }}
        >
          {Array.from({ length: totalFilings }, (_, i) => (
            <div
              key={i}
              ref={(el) => { filingsRef.current[i] = el; }}
              style={{
                width: FILING_LENGTH,
                height: FILING_THICKNESS,
                backgroundColor: "var(--text-disabled)",
                borderRadius: FILING_THICKNESS,
                justifySelf: "center",
                alignSelf: "center",
                transform: `rotate(${REST_ANGLE}rad)`,
                transition: "transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
                willChange: "transform",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
