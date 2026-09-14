"use client";

import { useEffect } from "react";

/**
 * Tells the inline watchdog in layout.tsx that client JS is alive.
 *
 * The watchdog reveals the page after 6s if it never hears from us, which is
 * what saves visitors whose bundle was blocked by a proxy or whose browser is
 * older than Next's baseline (Chrome/Edge/Firefox 111+, Safari 16.4+). Once
 * this mounts, hydration has demonstrably worked, so the animations can be
 * trusted to do the revealing and the watchdog stands down.
 *
 * Animation code that fails *after* this point is responsible for calling
 * window.__siteFailsafe() itself - see TerminalHero.
 */
export function HydrationBeacon() {
  useEffect(() => {
    window.__siteReady?.();
  }, []);

  return null;
}
