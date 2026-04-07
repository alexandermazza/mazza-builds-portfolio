"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TICKER_SPEED } from "@/lib/motion";

interface TickerTextProps {
  items: string[];
  speed?: number;
  className?: string;
}

function TickerRow({
  label,
  speed,
}: {
  label: string;
  speed: number;
}) {
  const [hovered, setHovered] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);

  const measure = useCallback(() => {
    if (!trackRef.current) return;
    const half = trackRef.current.scrollWidth / 2;
    if (half > 0) setDuration(half / speed);
  }, [speed]);

  useEffect(() => {
    if (hovered) {
      const raf = requestAnimationFrame(measure);
      return () => cancelAnimationFrame(raf);
    }
  }, [hovered, measure]);

  const separator = (
    <span className="mx-[0.4em] select-none" aria-hidden="true">
      *
    </span>
  );

  const tickerContent = Array.from({ length: 8 }, (_, i) => (
    <span key={i} className="inline-flex items-center">
      {separator}
      <span>{label}</span>
    </span>
  ));

  return (
    <div
      className="group relative border-b border-[var(--border)] overflow-hidden cursor-default"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Static centered label — bold, upright */}
      <div className="flex items-center justify-center py-[var(--space-md)] md:py-[var(--space-lg)]">
        <span className="font-sans text-[clamp(2rem,5vw,4rem)] font-700 uppercase tracking-[0.02em] text-[var(--text-display)]">
          {label}
        </span>
      </div>

      {/* Hover overlay — clips open horizontally from center */}
      <div
        className="absolute inset-0 flex items-center"
        style={{
          clipPath: hovered
            ? "inset(0 0% 0 0%)"
            : "inset(0 50% 0 50%)",
          transition: "clip-path 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)",
          backgroundColor: "var(--text-display)",
          color: "var(--surface)",
        }}
      >
        <div
          ref={trackRef}
          className="inline-flex whitespace-nowrap font-sans text-[clamp(2rem,5vw,4rem)] font-700 italic uppercase tracking-[0.02em]"
          style={{
            animation:
              hovered && duration > 0
                ? `ticker ${duration}s linear infinite`
                : undefined,
          }}
        >
          <div className="inline-flex">{tickerContent}</div>
          <div className="inline-flex" aria-hidden="true">
            {tickerContent}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TickerText({
  items,
  speed = TICKER_SPEED,
  className = "",
}: TickerTextProps) {
  return (
    <div className={`border-t border-[var(--border)] ${className}`}>
      {items.map((item) => (
        <TickerRow key={item} label={item} speed={speed} />
      ))}
    </div>
  );
}
