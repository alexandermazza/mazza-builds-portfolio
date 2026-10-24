"use client";

import { useEffect, useRef } from "react";
import type { Half } from "@/data/projects";
import type { ShiftSkyHandle } from "./sky";

/** The particle sun and moon behind the page head. Decoration only; three.js loads after the page. */
export function ShiftSky({ half, className }: { half: Half; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const sky = useRef<ShiftSkyHandle | null>(null);
  const current = useRef(half);

  useEffect(() => {
    let gone = false;
    import("./sky")
      .then(({ mountShiftSky }) => {
        const el = canvas.current;
        if (gone || !el?.parentElement) return;
        sky.current = mountShiftSky(el, el.parentElement, current.current);
      })
      .catch(() => {}); // a failed chunk load just means no sky
    return () => {
      gone = true;
      sky.current?.dispose();
      sky.current = null;
    };
  }, []);

  useEffect(() => {
    if (current.current === half) return;
    current.current = half;
    sky.current?.setHalf(half, true);
  }, [half]);

  return <canvas ref={canvas} className={className} aria-hidden="true" />;
}
