"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

// ─── Types ────────────────────────────────────────────

interface BezierLine {
  p0x: number; p0y: number;
  p1x: number; p1y: number;
  p2x: number; p2y: number;
  p3x: number; p3y: number;
}

interface Pulse {
  lineIndex: number;
  t: number;
  speed: number; // progress per second (0→1)
  reverse: boolean;
}

// ─── Constants ────────────────────────────────────────

const PULSE_COUNT = 14;
const LINE_ALPHA = 0.14;
const PULSE_TRAIL = 0.04;
const PULSE_TRAIL_STEPS = 8;
const PULSE_TRAIL_STEPS_MOBILE = 4;
const PULSE_DOT_SIZE = 4;
const TWO_PI = Math.PI * 2;

// ─── Pre-computed color tables ────────────────────────
// Avoids allocating rgba() strings every frame — major GC win on mobile

function buildColorTable(steps: number, alpha: number): string[] {
  const table: string[] = [];
  for (let s = steps; s >= 0; s--) {
    const fade = 1 - s / steps;
    table.push(`rgba(255,255,255,${(fade * alpha).toFixed(3)})`);
  }
  return table;
}

// Desktop halo + core, mobile core-only (built lazily in init)
let desktopHaloColors: string[] = [];
let desktopCoreColors: string[] = [];
let mobileCoreColors: string[] = [];

// ─── Helpers ──────────────────────────────────────────

function cubic(
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number,
): number {
  const mt = 1 - t;
  return (
    mt * mt * mt * p0 +
    3 * mt * mt * t * p1 +
    3 * mt * t * t * p2 +
    t * t * t * p3
  );
}

function generateLines(w: number, h: number, mobile: boolean): BezierLine[] {
  const cx = w / 2;
  const cy = h / 2;
  const lines: BezierLine[] = [];

  // ── Horizontal flow lines with jittered control points ──
  const hLineCount = mobile ? 10 : 18;
  for (let i = 0; i < hLineCount; i++) {
    const t = (i + 0.5) / hLineCount;
    const baseY = t * h;
    const dist = baseY - cy;
    const norm = dist / (h / 2);
    const pushMag = Math.exp(-norm * norm * 3.5) * h * 0.18;
    const push = (dist >= 0 ? 1 : -1) * pushMag;
    const jx = (Math.random() - 0.5) * w * 0.08;
    const jy = (Math.random() - 0.5) * 30;

    lines.push({
      p0x: -40, p0y: baseY + jy,
      p1x: w * 0.28 + jx, p1y: baseY + push + jy * 0.5,
      p2x: w * 0.72 - jx, p2y: baseY + push - jy * 0.5,
      p3x: w + 40, p3y: baseY - jy,
    });
  }

  // ── S-curve lines — control points push opposite directions ──
  const sCurveCount = mobile ? 3 : 6;
  for (let i = 0; i < sCurveCount; i++) {
    const baseY = h * (0.15 + Math.random() * 0.7);
    const dist = baseY - cy;
    const norm = dist / (h / 2);
    const pushMag = Math.exp(-norm * norm * 2) * h * 0.2;
    const dir = dist >= 0 ? 1 : -1;

    lines.push({
      p0x: -40, p0y: baseY + (Math.random() - 0.5) * 20,
      p1x: w * (0.2 + Math.random() * 0.1), p1y: baseY + dir * pushMag,
      p2x: w * (0.7 + Math.random() * 0.1), p2y: baseY - dir * pushMag * 0.3,
      p3x: w + 40, p3y: baseY + (Math.random() - 0.5) * 40,
    });
  }

  // ── Arc lines from top/bottom edges — curve near center then exit ──
  const arcCount = mobile ? 4 : 8;
  for (let i = 0; i < arcCount; i++) {
    const fromTop = i < arcCount / 2;
    const edgeY = fromTop ? -40 : h + 40;
    const peakY = cy + (fromTop ? -1 : 1) * h * (0.12 + Math.random() * 0.18);
    const baseX = w * (0.15 + Math.random() * 0.7);
    const spread = w * (0.12 + Math.random() * 0.12);

    lines.push({
      p0x: baseX - spread, p0y: edgeY,
      p1x: baseX - spread * 0.3, p1y: peakY,
      p2x: baseX + spread * 0.3, p2y: peakY,
      p3x: baseX + spread, p3y: edgeY,
    });
  }

  // ── Wide sweeping diagonals ──
  const diagCount = mobile ? 2 : 4;
  for (let i = 0; i < diagCount; i++) {
    const startY = Math.random() * h;
    const endY = h - startY + (Math.random() - 0.5) * h * 0.3;
    const midDist = ((startY + endY) / 2 - cy) / (h / 2);
    const pushMag = Math.exp(-midDist * midDist * 3) * h * 0.15;
    const dir = midDist >= 0 ? 1 : -1;

    lines.push({
      p0x: -40, p0y: startY,
      p1x: w * 0.35, p1y: (startY + endY) / 2 + dir * pushMag,
      p2x: w * 0.65, p2y: (startY + endY) / 2 + dir * pushMag * 0.6,
      p3x: w + 40, p3y: endY,
    });
  }

  return lines;
}

// ─── Component ────────────────────────────────────────

export function MagneticField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const linesRef = useRef<BezierLine[]>([]);
  const pulsesRef = useRef<Pulse[]>([]);
  const staticRef = useRef<HTMLCanvasElement | null>(null);
  const lastWidthRef = useRef<number>(0);
  const isMobileRef = useRef(false);
  const frameRef = useRef(0);
  // Cached dimensions — avoid offsetWidth/offsetHeight reads in the draw loop
  const sizeRef = useRef({ w: 0, h: 0 });
  const visibleRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    function init() {
      // Skip re-init when only the height changed (mobile address bar hide/show)
      const currentWidth = canvas!.offsetWidth;
      if (lastWidthRef.current && currentWidth === lastWidthRef.current) return;
      lastWidthRef.current = currentWidth;
      isMobileRef.current = window.matchMedia("(max-width: 767px)").matches;

      const mobile = isMobileRef.current;
      // Cap DPR at 1 on mobile — the lines are thin/subtle, retina resolution
      // isn't noticeable but costs 4-9x more pixels to push every frame
      const dpr = mobile ? 1 : (window.devicePixelRatio || 1);
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };

      linesRef.current = generateLines(w, h, mobile);

      // Build color lookup tables (once per init, zero per-frame allocation)
      const mobileSteps = PULSE_TRAIL_STEPS_MOBILE;
      const desktopSteps = PULSE_TRAIL_STEPS;
      desktopHaloColors = buildColorTable(desktopSteps, 0.12);
      desktopCoreColors = buildColorTable(desktopSteps, 0.8);
      mobileCoreColors = buildColorTable(mobileSteps, 0.8);

      // Pre-render static field lines to an offscreen canvas
      const offscreen = document.createElement("canvas");
      offscreen.width = canvas!.width;
      offscreen.height = canvas!.height;
      const offCtx = offscreen.getContext("2d")!;
      offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      offCtx.strokeStyle = `rgba(255, 255, 255, ${LINE_ALPHA})`;
      offCtx.lineWidth = 1;
      for (const line of linesRef.current) {
        offCtx.beginPath();
        offCtx.moveTo(line.p0x, line.p0y);
        offCtx.bezierCurveTo(
          line.p1x, line.p1y,
          line.p2x, line.p2y,
          line.p3x, line.p3y,
        );
        offCtx.stroke();
      }
      staticRef.current = offscreen;

      if (reducedMotion) return;

      // Create pulses — no GSAP tweens, positions advanced manually in draw()
      const lineCount = linesRef.current.length;
      pulsesRef.current = [];
      for (let i = 0; i < PULSE_COUNT; i++) {
        const reverse = Math.random() > 0.5;
        pulsesRef.current.push({
          lineIndex: Math.floor(Math.random() * lineCount),
          t: reverse ? 1 : Math.random(), // stagger start positions
          speed: 1 / (2 + Math.random() * 2.5), // matches old 2–4.5s duration
          reverse,
        });
      }
    }

    // Accumulate GSAP deltaTime (ms) across skipped frames so movement
    // stays correct when we throttle to 30fps on mobile
    let pendingMs = 0;

    function draw(_time: number, deltaTime: number) {
      if (!visibleRef.current) return;
      const mobile = isMobileRef.current;

      pendingMs += deltaTime;

      // Throttle to ~30fps on mobile — skip every other frame
      if (mobile) {
        frameRef.current++;
        if (frameRef.current & 1) return;
      }

      const dt = pendingMs / 1000; // ms → seconds
      pendingMs = 0;

      const { w, h } = sizeRef.current;
      ctx!.clearRect(0, 0, w, h);

      // Blit pre-rendered static lines
      if (staticRef.current) {
        ctx!.drawImage(staticRef.current, 0, 0, w, h);
      }

      const lines = linesRef.current;
      const lineCount = lines.length;
      if (!lineCount) return;

      const trailSteps = mobile ? PULSE_TRAIL_STEPS_MOBILE : PULSE_TRAIL_STEPS;
      const coreColors = mobile ? mobileCoreColors : desktopCoreColors;

      // Advance + draw pulses — no GSAP tweens, pure manual update
      for (const pulse of pulsesRef.current) {
        const line = lines[pulse.lineIndex];
        if (!line) continue;

        // Advance position
        if (pulse.reverse) {
          pulse.t -= dt * pulse.speed;
          if (pulse.t < 0) {
            pulse.t = 1;
            pulse.lineIndex = Math.floor(Math.random() * lineCount);
          }
        } else {
          pulse.t += dt * pulse.speed;
          if (pulse.t > 1) {
            pulse.t = 0;
            pulse.lineIndex = Math.floor(Math.random() * lineCount);
          }
        }

        const dir = pulse.reverse ? -1 : 1;

        for (let s = trailSteps; s >= 0; s--) {
          const t = pulse.t - dir * (s / trailSteps) * PULSE_TRAIL;
          if (t < 0 || t > 1) continue;

          const x = cubic(t, line.p0x, line.p1x, line.p2x, line.p3x);
          const y = cubic(t, line.p0y, line.p1y, line.p2y, line.p3y);
          const idx = trailSteps - s; // 0 = dimmest, trailSteps = brightest
          const fade = 1 - s / trailSteps;

          // Outer soft halo — skip on mobile
          if (!mobile) {
            ctx!.fillStyle = desktopHaloColors[idx];
            ctx!.beginPath();
            ctx!.arc(x, y, PULSE_DOT_SIZE + fade * 6, 0, TWO_PI);
            ctx!.fill();
          }

          // Inner bright core
          const coreSize = mobile
            ? PULSE_DOT_SIZE * (0.6 + fade * 0.6)
            : PULSE_DOT_SIZE * (0.4 + fade * 0.6);
          ctx!.fillStyle = coreColors[idx];
          ctx!.beginPath();
          ctx!.arc(x, y, coreSize, 0, TWO_PI);
          ctx!.fill();
        }
      }
    }

    init();
    gsap.ticker.add(draw);
    window.addEventListener("resize", init);

    // Pause draw loop when canvas is off-screen
    const io = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting; },
      { rootMargin: "100px" }
    );
    io.observe(canvas);

    return () => {
      gsap.ticker.remove(draw);
      window.removeEventListener("resize", init);
      io.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
    />
  );
}
