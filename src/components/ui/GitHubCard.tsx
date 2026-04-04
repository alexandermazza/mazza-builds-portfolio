"use client";

import { type ComponentProps } from "react";
import { GitHubHeatmap } from "./GitHubHeatmap";

type GitHubCardProps = Omit<ComponentProps<"section">, "children">;

export function GitHubCard({ className = "", ...props }: GitHubCardProps) {
  const year = new Date().getFullYear();

  return (
    <section
      className={`border border-[var(--border)] bg-[var(--surface)] p-[var(--space-lg)] ${className}`}
      style={{ borderRadius: "var(--radius-card)" }}
      {...props}
    >
      <span className="font-mono text-[11px] uppercase leading-[1.2] tracking-[0.08em] text-[var(--text-disabled)]">
        GITHUB ACTIVITY
      </span>

      <p className="mt-[var(--space-xs)] mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--text-secondary)]">
        JAN {year} &rarr; NOW
      </p>

      <GitHubHeatmap />
    </section>
  );
}
