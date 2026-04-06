"use client";

import { type ComponentProps } from "react";
import { UsageHeatmap } from "./UsageHeatmap";

type UsageCardProps = Omit<ComponentProps<"section">, "children">;

export function UsageCard({ className = "", ...props }: UsageCardProps) {
  const now = new Date();
  const yearAgo = new Date(now);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);

  const startLabel = yearAgo
    .toLocaleDateString("en-US", { month: "short", year: "numeric" })
    .toUpperCase();

  return (
    <section
      className={`overflow-x-auto border border-[var(--border)] bg-[var(--surface)] p-[var(--space-lg)] ${className}`}
      style={{ borderRadius: "var(--radius-card)" }}
      {...props}
    >
      {/* Header label */}
      <span className="font-mono text-[11px] uppercase leading-[1.2] tracking-[0.08em] text-[var(--text-disabled)]">
        BUILT WITH CLAUDE
      </span>

      {/* Date range */}
      <p className="mt-[var(--space-xs)] mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--text-secondary)]">
        {startLabel} &rarr; NOW
      </p>

      <UsageHeatmap />
    </section>
  );
}
