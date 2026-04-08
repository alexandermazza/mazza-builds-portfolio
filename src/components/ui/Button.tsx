"use client";

import { type ComponentProps } from "react";

type ButtonVariant = "primary" | "ghost";

interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
}

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-mono text-[13px] uppercase leading-[1.2] tracking-[0.06em] transition-colors min-h-[44px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-[var(--accent)] text-white px-[24px] py-[12px] hover:bg-[#E55A2B]",
    ghost:
      "bg-transparent text-[var(--text-secondary)] px-[24px] py-[12px] hover:text-[var(--text-primary)]",
  };

  const radius = variant === "primary" ? "var(--radius-pill)" : "0";

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      style={{
        borderRadius: radius,
        transitionDuration: "var(--duration-micro)",
        transitionTimingFunction: "var(--ease-out)",
      }}
      {...props}
    >
      {children}
    </button>
  );
}
