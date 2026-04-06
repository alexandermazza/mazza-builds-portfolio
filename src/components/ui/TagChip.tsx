"use client";

import { type ComponentProps } from "react";

interface TagChipProps extends ComponentProps<"span"> {
  children: React.ReactNode;
}

export function TagChip({ children, className = "", ...props }: TagChipProps) {
  return (
    <span
      className={`inline-block border border-[var(--border-visible)] px-[12px] py-[4px] font-mono text-[11px] uppercase leading-[1.2] tracking-[0.08em] text-[var(--text-secondary)] ${className}`}
      style={{ borderRadius: "var(--radius-pill)" }}
      {...props}
    >
      {children}
    </span>
  );
}
