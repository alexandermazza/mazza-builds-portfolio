"use client";

import { type ComponentProps } from "react";
import { GitHubHeatmap } from "./GitHubHeatmap";

interface GitHubCardProps extends Omit<ComponentProps<"section">, "children"> {
  compact?: boolean;
}

export function GitHubCard({ className = "", compact = false, ...props }: GitHubCardProps) {
  const year = new Date().getFullYear();

  return (
    <section
      className={`min-w-0 overflow-x-auto border border-[var(--border)] bg-[var(--surface)] p-[var(--space-lg)] ${className}`}
      style={{ borderRadius: "var(--radius-card)" }}
      {...props}
    >
      <span className="font-mono text-[11px] uppercase leading-[1.2] tracking-[0.08em] text-[var(--text-disabled)]">
        GITHUB ACTIVITY
      </span>

      <p className="mt-[var(--space-xs)] mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--text-secondary)]">
        JAN {year} &rarr; NOW
      </p>

      <GitHubHeatmap compact={compact} />
    </section>
  );
}
