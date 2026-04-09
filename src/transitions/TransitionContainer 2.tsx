"use client";

import { useRef, useEffect } from "react";
import { useTransitionContext } from "./TransitionProvider";

export function TransitionContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { registerContainer } = useTransitionContext();

  // Register once on mount. The container lives in layout.tsx
  // and persists across navigations — no unmount/remount cycles.
  useEffect(() => {
    registerContainer(ref.current);
    return () => registerContainer(null);
  }, [registerContainer]);

  return (
    <div ref={ref} data-transition-container="">
      {children}
    </div>
  );
}
