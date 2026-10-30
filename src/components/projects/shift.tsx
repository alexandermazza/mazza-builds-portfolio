import type { ReactNode } from "react";
import type { Half } from "@/data/projects";

export const HALF: Record<Half, { label: string; intro: ReactNode }> = {
  day: {
    label: "9 to 5",
    intro: (
      <>
        Built at my day job, for the people who sell, market and run the company. <b>11 projects.</b>
      </>
    ),
  },
  night: {
    label: "5 to 9",
    intro: (
      <>
        Built after hours, because I couldn&apos;t stop thinking about them. Some are live for anyone, some are just for
        me. <b>7 projects.</b>
      </>
    ),
  },
};

/** The page colours of each shift, set on :root. */
export const SHIFT_VARS: Record<Half, Record<string, string>> = {
  day: { "--bg": "#0b1d33", "--tile": "#10284a", "--line": "rgba(255, 255, 255, 0.18)" },
  night: { "--bg": "#000000", "--tile": "#0c0d10", "--line": "rgba(255, 255, 255, 0.14)" },
};

// data-part names the pieces the switch animates
export function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <circle data-part="core" cx="12" cy="12" r="4.5" />
      <path
        data-part="rays"
        d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"
      />
    </svg>
  );
}

export function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
      <path data-part="crescent" d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </svg>
  );
}
