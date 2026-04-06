"use client";

import { type ComponentProps } from "react";

type Status = "LIVE" | "IN PROGRESS" | "ARCHIVED";

interface StatusBadgeProps extends Omit<ComponentProps<"span">, "children"> {
  status: Status;
}

const statusStyles: Record<Status, string> = {
  LIVE: "border-[var(--success)] text-[var(--success)]",
  "IN PROGRESS": "border-[var(--warning)] text-[var(--warning)]",
  ARCHIVED: "border-[var(--border-visible)] text-[var(--text-disabled)]",
};

export function StatusBadge({ status, className = "", ...props }: StatusBadgeProps) {
  return (
    <span
      className={`inline-block border px-[12px] py-[4px] font-mono text-[11px] uppercase leading-[1.2] tracking-[0.08em] ${statusStyles[status]} ${className}`}
      style={{ borderRadius: "var(--radius-technical)" }}
      {...props}
    >
      {status}
    </span>
  );
}
