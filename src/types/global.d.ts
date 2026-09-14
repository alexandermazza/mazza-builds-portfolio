/**
 * Hooks into the inline failsafe watchdog defined in src/app/layout.tsx.
 * Both are defined by that inline script before any bundle runs, but they are
 * optional here because the script is deliberately wrapped in try/catch.
 */
declare global {
  interface Window {
    /** Client JS is alive - cancel the watchdog. */
    __siteReady?: () => void;
    /** Reveal-animation failed after hydration - force content visible now. */
    __siteFailsafe?: () => void;
  }
}

export {};
