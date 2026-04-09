"use client";

import { type ComponentProps } from "react";
import { TransitionLink } from "@/transitions";

interface LinkHoverProps extends Omit<ComponentProps<typeof TransitionLink>, "ref"> {
  children: React.ReactNode;
}

export function LinkHover({ children, className = "", ...props }: LinkHoverProps) {
  return (
    <TransitionLink
      className={`group relative inline-block ${className}`}
      {...props}
    >
      {children}
      <span
        className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-[var(--text-primary)] transition-transform group-hover:scale-x-100"
        style={{
          transitionDuration: "var(--duration-transition)",
          transitionTimingFunction: "var(--ease-out)",
        }}
      />
    </TransitionLink>
  );
}
