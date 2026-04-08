"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TICKER_SPEED } from "@/lib/motion";

interface TickerTextProps {
  items: string[];
  speed?: number;
  className?: string;
  scrollTarget?: string;
}

function TickerRow({
  label,
  speed,
  scrollTarget,
}: {
  label: string;
  speed: number;
  scrollTarget?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [scrollActive, setScrollActive] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Scroll-based activation on mobile at 55% viewport
  useEffect(() => {
    if (!isMobile || !rowRef.current) return;
    const io = new IntersectionObserver(
      ([entry]) => setScrollActive(entry.isIntersecting),
      { rootMargin: "-55% 0px -45% 0px" }
    );
    io.observe(rowRef.current);
    return () => io.disconnect();
  }, [isMobile]);

  const active = isMobile ? scrollActive : hovered;

  const measure = useCallback(() => {
    if (!trackRef.current) return;
    const half = trackRef.current.scrollWidth / 2;
    if (half > 0) setDuration(half / speed);
  }, [speed]);

  useEffect(() => {
    if (active) {
      const raf = requestAnimationFrame(measure);
      return () => cancelAnimationFrame(raf);
    }
  }, [active, measure]);

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
      ref={rowRef}
      className={`group relative border-b border-[var(--border)] overflow-hidden ${scrollTarget ? "cursor-pointer" : "cursor-default"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        if (!scrollTarget) return;
        const el = document.getElementById(scrollTarget);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }}
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
          clipPath: active
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
              active && duration > 0
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
  scrollTarget,
}: TickerTextProps) {
  return (
    <div className={`border-t border-[var(--border)] ${className}`}>
      {items.map((item) => (
        <TickerRow key={item} label={item} speed={speed} scrollTarget={scrollTarget} />
      ))}
    </div>
  );
}
