import type { CSSProperties, ReactNode } from "react";
import type { Mark } from "@/data/projects";
import styles from "./ProjectMark.module.css";

type IconName = Extract<Mark, { type: "icon" }>["name"];

// drawn icons for the projects without a logo of their own, as bold line art in the same single tone
const ICONS: Record<IconName, ReactNode> = {
  "web-tracker-scanner": (
    <>
      <rect x="8" y="14" width="64" height="50" rx="5" />
      <path d="M8 26h64M18 38h26M18 48h18" />
      <circle cx="64" cy="62" r="19" />
      <path d="M78 76l12 12" />
      <g fill="currentColor" stroke="none">
        <circle cx="58" cy="57" r="4" />
        <circle cx="70" cy="62" r="4" />
        <circle cx="61" cy="70" r="4" />
      </g>
    </>
  ),
  "kalshi-trader": (
    <>
      <path d="M30 50a13 13 0 0 1 1-26 18 18 0 0 1 34-3 13.5 13.5 0 0 1 4 29Z" />
      <path d="M14 88l20-16 13 8 28-24" />
      <path d="M62 56h13v13" />
    </>
  ),
  "kalshi-mcp": (
    <>
      <path d="M38 8v18M62 8v18" />
      <rect x="26" y="26" width="48" height="28" rx="9" />
      <path d="M50 54v10c0 14 24 8 24 22" />
      <circle cx="74" cy="91" r="5" fill="currentColor" stroke="none" />
    </>
  ),
  shakedown: (
    <>
      <ellipse cx="50" cy="60" rx="20" ry="26" />
      <circle cx="50" cy="28" r="10" />
      <path d="M50 36v50M30 52H14M30 66H12M33 80l-13 10M70 52h16M70 66h18M67 80l13 10M44 20l-8-10M56 20l8-10" />
    </>
  ),
  "roi-calculator": (
    <>
      <rect x="10" y="12" width="80" height="58" rx="6" />
      <path d="M50 70v12M34 92l16-10 16 10" />
      <path d="M28 56v-8M42 56V40M56 56V32" />
      <path d="M66 44l12-14M68 30h10v10" />
    </>
  ),
};

/** The project's mark in its tile ink (`--mk`), inside a decorative wrapper the caller styles. */
export function ProjectMark({ mark, scale = 1, className }: { mark: Mark; scale?: number; className?: string }) {
  return (
    <span className={className} aria-hidden="true">
      {mark.type === "vector" ? (
        <svg className={styles.ico} viewBox={mark.viewBox} fill="currentColor">
          {mark.paths.map((d) => (
            <path key={d} d={d} />
          ))}
        </svg>
      ) : mark.type === "icon" ? (
        <svg
          className={styles.ico}
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {ICONS[mark.name]}
        </svg>
      ) : (
        <span className={styles.mk} style={{ "--m": `url(${mark.src})`, "--s": scale } as CSSProperties} />
      )}
    </span>
  );
}
