"use client";

import { useState, useEffect } from "react";

const QUERY = "(max-width: 767px)";

/**
 * Shared mobile breakpoint hook — avoids duplicate MediaQueryList listeners.
 * Returns `false` during SSR, hydrates to actual value on mount.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    setIsMobile(mq.matches);
    function onChange(e: MediaQueryListEvent) {
      setIsMobile(e.matches);
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
