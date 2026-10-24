"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import type { Half } from "@/data/projects";
import { SHIFT_VARS } from "./shift";
import styles from "./ShiftBackdrop.module.css";

// seeded, so the server and the browser place the same 70 stars
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r = seeded(7);
const round = (n: number) => Math.round(n * 100) / 100;
const STARS = Array.from({ length: 70 }, () => ({
  left: `${round(r() * 100)}%`,
  top: `${round(r() * 100)}%`,
  opacity: round(0.25 + r() * 0.6),
  animationDelay: `${round(-r() * 4)}s`,
  animationDuration: `${round(3 + r() * 4)}s`,
  big: r() < 0.15,
}));

const noSubscribe = () => () => {};
const vars = (half: Half) =>
  Object.entries(SHIFT_VARS[half])
    .map(([k, v]) => `${k}:${v}`)
    .join(";");

/**
 * The shift's page colours and night stars. Colours go on :root inline, so the bar, footer and
 * body follow; the <style> only covers the first paint before hydration and runs without JS.
 * It is dropped once hydrated, so the page transition's clone of this page can't keep it alive.
 */
export function ShiftBackdrop({ half }: { half: Half }) {
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);

  useLayoutEffect(() => {
    const root = document.documentElement.style;
    const set = SHIFT_VARS[half];
    for (const [k, v] of Object.entries(set)) root.setProperty(k, v);
    return () => {
      for (const k of Object.keys(set)) root.removeProperty(k);
    };
  }, [half]);

  return (
    <>
      {!hydrated && <style>{`:root{${vars(half)}}`}</style>}
      <style>{"body{transition:background-color 900ms ease}"}</style>
      <div className={half === "day" ? `${styles.stars} ${styles.day}` : styles.stars} aria-hidden="true">
        {STARS.map(({ big, ...style }, i) => (
          <i key={i} className={big ? styles.big : undefined} style={style} />
        ))}
      </div>
    </>
  );
}
