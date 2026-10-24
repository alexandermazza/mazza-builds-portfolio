"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import type { Half } from "@/data/projects";
import { BentoTile, type TileProject } from "./BentoTile";
import { ShiftBackdrop } from "./ShiftBackdrop";
import { ShiftSky } from "./ShiftSky";
import { HALF, MoonIcon, SunIcon } from "./shift";
import styles from "./ProjectsBoard.module.css";

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const spot = (btn: HTMLElement) => ({ left: `${btn.offsetLeft}px`, width: `${btn.offsetWidth}px` });

// the icon of the shift being switched on: the sun's rays spin out, the moon rocks into place
function popIcon(btn: HTMLElement) {
  const ease = { duration: 700, easing: "cubic-bezier(0.22, 1, 0.36, 1)" };
  const part = (name: string) => btn.querySelector(`[data-part="${name}"]`);
  part("rays")?.animate([{ transform: "rotate(-90deg) scale(0.4)", opacity: 0 }, { transform: "none", opacity: 1 }], ease);
  part("core")?.animate([{ transform: "scale(0.4)" }, { transform: "none" }], ease);
  part("crescent")?.animate(
    [{ transform: "rotate(-50deg) scale(0.6)", opacity: 0 }, { transform: "rotate(12deg)", opacity: 1, offset: 0.6 }, { transform: "none" }],
    ease,
  );
}

/** The projects head and bento grid. The switch keeps the shift in the URL, so reload and Back keep it. */
export function ProjectsBoard({ initial, projects }: { initial: Half; projects: TileProject[] }) {
  const router = useRouter();
  const [half, setHalf] = useState(initial);
  // the set on screen trails `half` while the old tiles drop away
  const [shown, setShown] = useState(initial);
  const flip = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  const buttons = useRef<Record<Half, HTMLButtonElement | null>>({ day: null, night: null });
  const halfNow = useRef(initial);
  const swap = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const place = () => {
      const btn = buttons.current[halfNow.current];
      if (!btn || !thumb.current) return;
      Object.assign(thumb.current.style, spot(btn));
      flip.current?.setAttribute("data-ready", "");
    };
    place();
    addEventListener("resize", place);
    document.fonts?.ready.then(place);
    return () => {
      removeEventListener("resize", place);
      clearTimeout(swap.current);
    };
  }, []);

  function pick(to: Half, e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault(); // without JavaScript the buttons submit ?shift= instead
    if (to === half) return;
    const from = buttons.current[half], btn = e.currentTarget, pill = thumb.current, reduce = reduced();
    if (from && pill) {
      // the pill stretches across both halves on its way over, then settles on the new one
      const a = spot(from), b = spot(btn);
      const l = Math.min(from.offsetLeft, btn.offsetLeft), r = Math.max(from.offsetLeft + from.offsetWidth, btn.offsetLeft + btn.offsetWidth);
      Object.assign(pill.style, b);
      if (!reduce) pill.animate([a, { left: `${l}px`, width: `${r - l}px`, offset: 0.45 }, b], { duration: 560, easing: "cubic-bezier(0.65, 0, 0.35, 1)" });
    }
    if (!reduce) popIcon(btn);

    halfNow.current = to;
    setHalf(to);
    router.replace(to === "night" ? "/projects?shift=night" : "/projects", { scroll: false });
    clearTimeout(swap.current);
    if (reduce || shown === to) setShown(to);
    else swap.current = setTimeout(() => setShown(to), projects.filter((p) => p.half === shown).length * 26 + 280);
  }

  return (
    <main className={styles.main}>
      <ShiftBackdrop half={half} />
      <section className={`${styles.head} ${styles.wrap}`}>
        <ShiftSky half={half} className={styles.sky3d} />
        <h1>Projects</h1>
        <form action="/projects" className={styles.form}>
          <div ref={flip} className={styles.flip} role="group" aria-label="Show work projects or side projects">
            <span ref={thumb} className={styles.thumb} aria-hidden="true" />
            {(["day", "night"] as const).map((h) => (
              <button
                key={h}
                ref={(el) => {
                  buttons.current[h] = el;
                }}
                type="submit"
                name="shift"
                value={h}
                aria-pressed={half === h}
                onClick={(e) => pick(h, e)}
              >
                {h === "day" ? <SunIcon /> : <MoonIcon />}
                {HALF[h].label}
              </button>
            ))}
          </div>
        </form>
        <p className={styles.intro}>{HALF[half].intro}</p>
      </section>
      <section id="list" className={`${styles.list} ${styles.wrap}`} aria-live="polite">
        <div className={styles.bento}>
          {projects
            .filter((p) => p.half === shown)
            .map((p, k) => (
              <BentoTile key={p.slug} project={p} k={k} out={shown !== half} />
            ))}
        </div>
      </section>
    </main>
  );
}
