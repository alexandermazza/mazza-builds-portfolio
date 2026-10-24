"use client";

import { Fragment, useEffect, useRef } from "react";
import styles from "./Home.module.css";

/**
 * The "Building things like..." marquee from home.html. It drifts left on its own, runs faster while the page
 * scrolls, and can be grabbed and dragged either way; a flick coasts, then settles back to the drift. On touch,
 * sideways swipes drag it and vertical swipes still scroll the page (touch-action: pan-y).
 */
export function Ticker({ words }: { words: string[] }) {
  const strip = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = strip.current!, tr = track.current!;
    const AUTO = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : -45;
    let tx = 0, tv = AUTO, half = 0, boost = 0, lastY = scrollY, lastTick = performance.now(), raf = 0;
    let held: { x: number; t: number; id: number } | null = null;
    const measure = () => { half = tr.scrollWidth / 2; };
    const down = (e: PointerEvent) => {
      held = { x: e.clientX, t: performance.now(), id: e.pointerId };
      tv = 0;
      s.setPointerCapture(e.pointerId);
      s.classList.add(styles.dragging);
    };
    const move = (e: PointerEvent) => {
      if (!held || e.pointerId !== held.id) return;
      // smoothed and capped so a quick flick coasts a little, not across the whole list
      const t = performance.now(), dx = e.clientX - held.x, inst = dx / Math.max(0.016, (t - held.t) / 1000);
      tx += dx;
      tv = tv * 0.6 + Math.max(-1800, Math.min(1800, inst)) * 0.4;
      held.x = e.clientX;
      held.t = t;
    };
    const letGo = (e: PointerEvent) => {
      if (held && e.pointerId === held.id) { held = null; s.classList.remove(styles.dragging); }
    };
    const onScroll = () => { boost = Math.min(5, boost + Math.abs(scrollY - lastY) * 0.02); lastY = scrollY; };
    const tick = (ms: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (ms - lastTick) / 1000);
      lastTick = ms;
      boost *= 0.92;
      if (!held) { tv += (AUTO * (1 + boost) - tv) * Math.min(1, dt * 3.5); tx += tv * dt; }
      if (half > 0) tx = ((tx % half) - half) % half; // stay within one unit so it loops forever in both directions
      tr.style.transform = `translate3d(${tx.toFixed(1)}px, 0, 0)`;
    };
    measure();
    document.fonts?.ready.then(measure);
    s.addEventListener("pointerdown", down);
    s.addEventListener("pointermove", move);
    s.addEventListener("pointerup", letGo);
    s.addEventListener("pointercancel", letGo);
    addEventListener("resize", measure);
    addEventListener("scroll", onScroll, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      s.removeEventListener("pointerdown", down);
      s.removeEventListener("pointermove", move);
      s.removeEventListener("pointerup", letGo);
      s.removeEventListener("pointercancel", letGo);
      removeEventListener("resize", measure);
      removeEventListener("scroll", onScroll);
    };
  }, []);

  // one loop unit is the list twice, so solid and outlined words keep alternating for an odd count too; the track holds two units
  const unit = [...words, ...words];
  return (
    <div ref={strip} className={styles.marquee} aria-hidden="true">
      <div ref={track} className={styles.track}>
        {[...unit, ...unit].map((w, i) => (
          <Fragment key={i}>
            <span className={i % 2 ? `${styles.word} ${styles.ghost}` : styles.word}>{w}</span>
            <span className={styles.sep}>/</span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
