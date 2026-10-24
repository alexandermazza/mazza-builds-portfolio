"use client";

import { useEffect, useRef } from "react";
import styles from "./About.module.css";

const STEPS: [name: string, text: string][] = [
  ["Listen", "Sit with the people who'll use it and find the part of their week that hurts."],
  ["Define done", "Write down what finished looks like, and how we'll know it worked."],
  ["Build with AI", "Build the smallest version that works, with AI doing the boring 80%."],
  ["Ship", "Put it in front of real people quickly, even if it's rough."],
  ["Watch", "See how it actually gets used, then go back and listen again."],
];
const R = 160;
// monoline icons on a 24-unit grid: ear, checklist, sparkles, paper plane, eye
const ICONS = [
  '<path d="M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0"/><path d="M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 1 0 4"/>',
  '<path d="m3 7 2 2 4-4"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
  '<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M19 14v6"/><path d="M16 17h6"/>',
  '<path d="M22 2 15 22l-4-9-9-4z"/><path d="M22 2 11 13"/>',
  '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
];
const CYCLE = '<path d="M3 12a9 9 0 0 1 15.3-6.4L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.3 6.4L3 16"/><path d="M8 16H3v5"/>';

// rounded so the server and every browser print the same coordinates
const round = (v: number) => Math.round(v * 100) / 100;
const at = (k: number, r = R) => {
  const a = -Math.PI / 2 + (k / STEPS.length) * Math.PI * 2;
  return [round(r * Math.cos(a)), round(r * Math.sin(a))];
};

function Icon({ d, x, y, s }: { d: string; x: number; y: number; s: number }) {
  return <svg className={styles.ico} x={x - s / 2} y={y - s / 2} width={s} height={s} viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: d }} />;
}

// five stops on a ring, a runner goes round
export function ProcessLoop() {
  const ringRef = useRef<SVGSVGElement>(null);
  const stepsRef = useRef<HTMLOListElement>(null);
  const runnerRef = useRef<SVGCircleElement>(null);
  const spinRef = useRef<SVGGElement>(null);
  const lapRef = useRef<SVGTextElement>(null);

  useEffect(() => {
    const ring = ringRef.current, list = stepsRef.current, runner = runnerRef.current, spin = spinRef.current, lapEl = lapRef.current;
    if (!ring || !list || !runner || !spin || !lapEl) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stops = [...ring.querySelectorAll(`.${styles.stop}`)], stepEls = [...list.children];
    let held = -1, lap = 1, lastK = -1;
    const setStep = (k: number) => {
      stops.forEach((s, i) => s.classList.toggle(styles.on, i === k));
      stepEls.forEach((s, i) => s.classList.toggle(styles.on, i === k));
    };
    const holds = stepEls.map((_, k) => () => { held = k; setStep(k); });
    const release = () => { held = -1; };
    stepEls.forEach((li, k) => { li.addEventListener("pointerenter", holds[k]); li.addEventListener("pointerleave", release); });

    let ringOn = true;
    const io = new IntersectionObserver(([e]) => { ringOn = e.isIntersecting; });
    io.observe(ring);
    let raf = 0;
    function orbit(now: number) {
      raf = requestAnimationFrame(orbit);
      if (!ringOn || document.hidden) return;
      const u = reduce ? 0 : (now / 12000) % 1, [x, y] = at(u * STEPS.length);
      runner!.setAttribute("cx", String(x));
      runner!.setAttribute("cy", String(y));
      spin!.setAttribute("transform", `rotate(${u * 360} 0 -18)`); // the center arrows turn once per lap
      const k = Math.floor(u * STEPS.length + 0.15) % STEPS.length; // a stop lights just as the runner reaches it
      if (k === 0 && lastK === STEPS.length - 1) lapEl!.textContent = `Lap ${++lap}`;
      lastK = k;
      if (held < 0) setStep(k);
    }
    raf = requestAnimationFrame(orbit);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      stepEls.forEach((li, k) => { li.removeEventListener("pointerenter", holds[k]); li.removeEventListener("pointerleave", release); });
    };
  }, []);

  const [rx, ry] = at(0);
  return (
    <div className={styles.loop}>
      <svg ref={ringRef} className={styles.ring} viewBox="-320 -235 640 470" aria-hidden="true">
        <circle className={styles.track} r={R} />
        <circle ref={runnerRef} className={styles.runner} r="6" cx={rx} cy={ry} />
        {/* a chevron halfway between each pair of stops, pointing clockwise */}
        {STEPS.map(([name], k) => {
          const [x, y] = at(k + 0.5);
          return <path key={name} className={styles.dir} d="M-4 -6 L4 0 L-4 6" transform={`translate(${x} ${y}) rotate(${((k + 0.5) / STEPS.length) * 360})`} />;
        })}
        {STEPS.map(([name], k) => {
          const [x, y] = at(k), [lx, ly] = at(k, R + 50);
          return (
            <g key={name} className={styles.stop}>
              <g className={styles.badge}>
                <circle cx={x} cy={y} r="26" />
                <Icon d={ICONS[k]} x={x} y={y} s={28} />
              </g>
              <text x={lx} y={ly + 8} textAnchor={Math.abs(lx) < 20 ? "middle" : lx > 0 ? "start" : "end"}>
                {name}
              </text>
            </g>
          );
        })}
        <g ref={spinRef}>
          <Icon d={CYCLE} x={0} y={-18} s={40} />
        </g>
        <text ref={lapRef} className={styles.count} y="34">
          Lap 1
        </text>
      </svg>
      <ol ref={stepsRef} className={styles.steps}>
        {STEPS.map(([name, text], k) => (
          <li key={name}>
            <span className={styles.chip} aria-hidden="true">
              <svg className={styles.ico} viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: ICONS[k] }} />
            </span>
            <b>{name}</b>
            <p>{text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
