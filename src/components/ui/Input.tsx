"use client";

import { type ComponentProps } from "react";

interface InputProps extends ComponentProps<"input"> {
  label: string;
}

export function Input({ label, className = "", id, ...props }: InputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className="mb-[var(--space-xs)] block font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]"
      >
        {label}
      </label>
      <input
        id={inputId}
        className="w-full border-b border-[var(--border)] bg-transparent py-[var(--space-sm)] font-sans text-[var(--body)] text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--text-display)]"
        style={{
          transitionDuration: "var(--duration-micro)",
          transitionTimingFunction: "var(--ease-out)",
        }}
        {...props}
      />
    </div>
  );
}
