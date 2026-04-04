"use client";

import { useEffect, useRef, useState } from "react";
import { TICKER_SPEED } from "@/lib/motion";

interface TickerTextProps {
  items: string[];
  speed?: number;
  className?: string;
}

export function TickerText({
  items,
  speed = TICKER_SPEED,
  className = "",
}: TickerTextProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState<number>(0);

  useEffect(() => {
    if (!trackRef.current) return;
    // Measure the width of one set of items (first half of children)
    const firstHalf = trackRef.current.scrollWidth / 2;
    setDuration(firstHalf / speed);
  }, [items, speed]);

  const itemElements = items.map((item, i) => (
    <span key={`${item}-${i}`} className="inline-flex items-center">
      <span
        className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)] transition-colors hover:text-[var(--text-primary)]"
        style={{ transitionDuration: "var(--duration-micro)" }}
      >
        {item}
      </span>
      <span
        className="mx-[var(--space-md)] text-[11px] text-[var(--text-disabled)] select-none"
        aria-hidden="true"
      >
        ·
      </span>
    </span>
  ));

  return (
    <div className={`overflow-hidden ${className}`}>
      <div
        ref={trackRef}
        className="inline-flex whitespace-nowrap"
        style={{
          animation:
            duration > 0
              ? `ticker ${duration}s linear infinite`
              : undefined,
        }}
      >
        {/* Two copies for seamless loop */}
        <div className="inline-flex">{itemElements}</div>
        <div className="inline-flex" aria-hidden="true">
          {itemElements}
        </div>
      </div>
    </div>
  );
}
