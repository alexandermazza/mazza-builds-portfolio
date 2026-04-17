import { type ComponentProps } from "react";
import { loadUsageData } from "@/lib/usage-data";
import { UsageHeatmap } from "./UsageHeatmap";

interface UsageCardProps extends Omit<ComponentProps<"section">, "children"> {
  compact?: boolean;
}

export function UsageCard({ className = "", compact = false, ...props }: UsageCardProps) {
  const initialData = loadUsageData();
  const startLabel = "JAN 2026";

  return (
    <section
      className={`min-w-0 overflow-x-auto border border-[var(--border)] bg-[var(--surface)] p-[var(--space-lg)] ${className}`}
      style={{ borderRadius: "var(--radius-card)" }}
      {...props}
    >
      <span className="font-mono text-[11px] uppercase leading-[1.2] tracking-[0.08em] text-[var(--text-disabled)]">
        BUILT WITH CLAUDE
      </span>

      <p className="mt-[var(--space-xs)] mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--text-secondary)]">
        {startLabel} &rarr; NOW
      </p>

      <UsageHeatmap compact={compact} initialData={initialData} />
    </section>
  );
}
