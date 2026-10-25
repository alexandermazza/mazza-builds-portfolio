"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { useTransitionContext } from "@/transitions";
import type { TransitLine, TransitStop } from "@/lib/constellation";
import styles from "./TransitMap.module.css";

const SUN = "M12 7.5a4.5 4.5 0 1 1 0 9a4.5 4.5 0 1 1 0-9M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8";
const MOON = "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z";
// the server has no width to measure, so it lays out the phone map; it is fully drawn until the client takes over
const SERVER_WIDTH = 358;

type Run = { id: string; a: number; b: number; t: number };

/** Positions for every track, stop and label: down the page on phones and tablets, across it on wide screens. */
function layout(W: number, all: TransitLine[], stops: TransitStop[]) {
  const vertical = W < 900;
  const lines = vertical ? all.filter((l) => l.phone) : all;
  const night = stops.findIndex((s) => s.half === "night");
  const nightAt = night < 0 ? stops.length : night;
  const zoneGap = vertical ? 56 : 54;
  let trackPos: (i: number) => number, stopPos: (k: number) => number, H: number, label: number, angle = 40;
  if (vertical) {
    const gap = 17, x0 = 14, row = 66, top = 70;
    trackPos = (i) => x0 + i * gap;
    stopPos = (k) => top + k * row + (k >= nightAt ? zoneGap : 0) + 24;
    H = stopPos(stops.length - 1) + 56;
    label = x0 + (lines.length - 1) * gap + 30;
  } else {
    const gap = 30, top = 52, left = 150, right = W - 170;
    const step = (right - left - zoneGap) / Math.max(1, stops.length - 1);
    trackPos = (i) => top + i * gap;
    stopPos = (k) => left + k * step + (k >= nightAt ? zoneGap : 0);
    // steeper labels when the stops are close, so neighbouring names never touch
    angle = Math.min(65, Math.max(38, (Math.asin(Math.min(1, 46 / step)) * 180) / Math.PI));
    H = trackPos(lines.length - 1) + 50 + Math.round(270 * Math.sin((angle * Math.PI) / 180));
    label = trackPos(lines.length - 1) + 26;
  }
  const runs: Run[] = lines.map((l, i) => {
    const on = stops.map((s, k) => (s.on.includes(l.id) ? k : -1)).filter((k) => k >= 0);
    return { id: l.id, a: stopPos(on[0]) - 18, b: stopPos(on[on.length - 1]) + 18, t: trackPos(i) };
  });
  return { vertical, lines, nightAt, H, label, angle, trackPos, stopPos, runs };
}

/** "How it all connects": each shared tool is a line, each project a stop. The lines draw in as the section scrolls by. */
export function TransitMap({ lines, stops }: { lines: TransitLine[]; stops: TransitStop[] }) {
  const { navigate } = useTransitionContext();
  const box = useRef<HTMLDivElement>(null);
  const clip = useRef<SVGRectElement>(null);
  const stopRefs = useRef<(Element | null)[]>([]);
  const trainRefs = useRef<Record<string, SVGGElement | null>>({});
  const revealAll = useRef(false);
  const [W, setW] = useState(SERVER_WIDTH);
  const [live, setLive] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const ids = useId();
  const L = useMemo(() => layout(W, lines, stops), [W, lines, stops]);
  const span = L.vertical ? L.H : W;

  useEffect(() => {
    const el = box.current!;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    setLive(true);
    return () => ro.disconnect();
  }, []);

  // the drawing and the trains are updated in place, so scrolling never re-renders the map
  useEffect(() => {
    if (!live) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let edge = span, onScreen = true, raf = 0;
    const onScroll = () => {
      const r = box.current!.getBoundingClientRect(), vh = innerHeight;
      // phones: fully drawn as the map's end comes up past 78% of the screen; wide screens: from its top at 85% to its
      // end at 90%, so a screen tall enough for the whole section finishes the drawing with the heading still in view
      const p = L.vertical
        ? (vh * 0.78 - r.top) / Math.max(1, r.height)
        : (vh * 0.85 - r.top) / Math.max(vh * 0.25, r.height - vh * 0.05);
      edge = (reduce || revealAll.current ? 1 : Math.min(1, Math.max(0, p))) * span;
      const c = clip.current;
      if (c) {
        if (L.vertical) { c.setAttribute("width", String(W + 40)); c.setAttribute("height", String(edge + 20)); }
        else { c.setAttribute("width", String(edge + 200)); c.setAttribute("height", String(L.H + 40)); }
      }
      // an attribute, not a class: React rewrites className whenever a line is followed
      stopRefs.current.forEach((s, k) => s?.toggleAttribute("data-wait", L.stopPos(k) > edge + 4));
    };
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }, { rootMargin: "100px" });
    io.observe(box.current!);
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!onScreen || document.hidden) return;
      L.runs.forEach((run, i) => {
        const g = trainRefs.current[run.id];
        if (!g) return;
        const len = run.b - run.a, u = ((now / 1000) / (2.4 + len / 140) + i * 0.37) % 1, s = run.a + u * len;
        g.setAttribute("transform", L.vertical ? `translate(${run.t} ${s})` : `translate(${s} ${run.t})`);
        g.style.visibility = s <= edge ? "visible" : "hidden";
      });
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    if (!reduce) raf = requestAnimationFrame(frame);
    return () => {
      removeEventListener("scroll", onScroll);
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [live, W, L, span]);

  // a stop the drawing hasn't reached must still show when it takes keyboard focus, so focus draws the whole map
  const revealNow = () => {
    revealAll.current = true;
    clip.current?.setAttribute("width", String(W + 400));
    clip.current?.setAttribute("height", String(L.H + 400));
    stopRefs.current.forEach((n) => n?.removeAttribute("data-wait"));
  };

  const open = (e: MouseEvent<Element>, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(href);
  };

  const followed = focus ? lines.find((l) => l.id === focus) : undefined;
  const followedStops = focus ? stops.filter((s) => s.on.includes(focus)) : [];
  const zone = (k: number, text: string, glyph: string) => {
    const p = k === 0 ? L.stopPos(0) - (L.vertical ? 62 : 36) : (L.stopPos(k - 1) + L.stopPos(k)) / 2 - (L.vertical ? 8 : 0);
    return (
      <g key={text}>
        {k > 0 && (L.vertical ? <line className={styles.zone} x1={0} y1={p} x2={W} y2={p} /> : <line className={styles.zone} x1={p} y1={10} x2={p} y2={L.H - 10} />)}
        <g transform={L.vertical ? `translate(${L.label} ${p + 10})` : `translate(${k ? p + 14 : L.stopPos(0) - 14} 4)`}>
          <path className={styles.zoneGlyph} d={glyph} transform={L.vertical ? "translate(0 -1) scale(0.75)" : "scale(0.7)"} />
          <text className={styles.zoneLabel} x={L.vertical ? 24 : 22} y={L.vertical ? 14 : 13}>{text}</text>
        </g>
      </g>
    );
  };

  return (
    <section className={styles.transit} id="graph" aria-labelledby="graph-title">
      <div className={styles.head}>
        <h2 id="graph-title">How it all connects</h2>
        <p>
          From sales systems to an iPhone app to a trading bot: {stops.length} projects, joined by the tools they share.
          Each line is a tool, each stop a project built with it.
        </p>
        <p className={styles.how}>Tap a line to follow it. Tap a stop to open the project.</p>
      </div>

      <ul className={`${styles.chips} ${focus ? styles.chipsFocus : ""}`}>
        {lines.map((l) => (
          <li key={l.id} className={l.phone ? undefined : styles.minor}>
            <button type="button" aria-pressed={focus === l.id} style={{ "--c": l.color } as CSSProperties} onClick={() => setFocus(focus === l.id ? null : l.id)}>
              <i aria-hidden="true" />
              {l.label} <b>{l.count}</b>
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.note} aria-live="polite">
        {followed && (
          <>
            <b>{followed.label}</b> runs through {followedStops.length} projects, from {followedStops[0].name} to {followedStops[followedStops.length - 1].name}.
          </>
        )}
      </p>

      <div className={styles.box} ref={box}>
        <svg className={`${styles.map} ${L.vertical ? styles.vertical : ""} ${focus ? styles.focus : ""}`} viewBox={`0 0 ${W} ${L.H}`} height={L.H} role="group" aria-label="Projects and the tools they share" onFocus={revealNow}>
          <defs>
            <filter id={`${ids}soft`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
            <clipPath id={`${ids}reveal`}>
              <rect ref={clip} x={L.vertical ? -20 : -200} y={-20} width={L.vertical ? W + 40 : W + 200} height={L.H + 40} />
            </clipPath>
          </defs>

          {zone(0, "9 to 5", SUN)}
          {L.nightAt < stops.length && zone(L.nightAt, "5 to 9", MOON)}

          <g clipPath={`url(#${ids}reveal)`}>
            {L.lines.map((l, i) => {
              const run = L.runs[i], d = L.vertical ? `M${run.t} ${run.a} V${run.b}` : `M${run.a} ${run.t} H${run.b}`;
              return (
                <g key={l.id} className={`${styles.line} ${focus === l.id ? styles.on : ""}`} style={{ "--c": l.color } as CSSProperties}>
                  {!L.vertical && (
                    <>
                      <line className={styles.bed} x1={112} y1={run.t} x2={run.a} y2={run.t} />
                      <text className={styles.lineName} x={104} y={run.t + 4} textAnchor="end">{l.label}</text>
                    </>
                  )}
                  <path className={styles.glow} d={d} filter={`url(#${ids}soft)`} />
                  <path className={styles.track} d={d} />
                  <circle className={styles.terminus} r={4.5} cx={L.vertical ? run.t : run.a} cy={L.vertical ? run.a : run.t} />
                  <g ref={(n) => { trainRefs.current[l.id] = n; }} className={styles.train} style={{ visibility: "hidden" }}>
                    <circle className={styles.trainGlow} r={6} filter={`url(#${ids}soft)`} />
                    <circle className={styles.trainCore} r={2.2} />
                  </g>
                </g>
              );
            })}
          </g>

          {stops.map((s, k) => {
            const p = L.stopPos(k), mine = L.lines.map((l, i) => (s.on.includes(l.id) ? i : -1)).filter((i) => i >= 0);
            const href = `/projects/${s.slug}`, on = focus ? s.on.includes(focus) : false;
            return (
              <a key={s.slug} ref={(n) => { stopRefs.current[k] = n; }} href={href} className={`${styles.stop} ${on ? styles.on : ""}`} aria-label={`${s.name}, ${s.kind}`} onClick={(e) => open(e, href)}>
                {L.vertical ? (
                  <>
                    <rect className={styles.hit} x={0} y={p - 26} width={W} height={52} />
                    {mine.length > 1 && <line className={styles.link} x1={L.trackPos(mine[0])} y1={p} x2={L.trackPos(mine[mine.length - 1])} y2={p} />}
                    {mine.map((i) => <circle key={i} className={styles.dot} cx={L.trackPos(i)} cy={p} r={5.5} />)}
                    <text className={styles.name} x={L.label} y={p + 1}>{s.name}</text>
                    <text className={styles.kind} x={L.label} y={p + 19}>{s.kind}</text>
                  </>
                ) : (
                  <>
                    <rect className={styles.hit} x={p - 22} y={0} width={44} height={L.H} />
                    {mine.length > 1 && <line className={styles.link} x1={p} y1={L.trackPos(mine[0])} x2={p} y2={L.trackPos(mine[mine.length - 1])} />}
                    {mine.map((i) => <circle key={i} className={styles.dot} cx={p} cy={L.trackPos(i)} r={5.5} />)}
                    <g transform={`translate(${p - 4} ${L.label}) rotate(${L.angle})`}>
                      <text className={styles.name} x={0} y={0}>{s.name}</text>
                      <text className={styles.kind} x={0} y={17}>{s.kind}</text>
                    </g>
                  </>
                )}
              </a>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
