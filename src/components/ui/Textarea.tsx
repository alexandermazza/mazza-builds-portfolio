"use client";

import { type ComponentProps } from "react";

interface TextareaProps extends ComponentProps<"textarea"> {
  label: string;
}

export function Textarea({ label, className = "", id, ...props }: TextareaProps) {
  const textareaId = id || label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={className}>
      <label
        htmlFor={textareaId}
        className="mb-[var(--space-xs)] block font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]"
      >
        {label}
      </label>
      <textarea
        id={textareaId}
        className="w-full resize-y border-b border-[var(--border)] bg-transparent py-[var(--space-sm)] font-sans text-[var(--body)] text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--text-display)]"
        style={{
          transitionDuration: "var(--duration-micro)",
          transitionTimingFunction: "var(--ease-out)",
          minHeight: "120px",
        }}
        {...props}
      />
    </div>
  );
}
