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
  progress: { t: number };
  reverse: boolean;
}

// ─── Constants ────────────────────────────────────────

const PULSE_COUNT = 14;
const LINE_ALPHA = 0.06;
const PULSE_ALPHA = 0.6;
const PULSE_TRAIL = 0.1;
const PULSE_TRAIL_STEPS = 16;
const PULSE_DOT_SIZE = 2.5;
const GLOW_RADIUS = 15;
const GLOW_ALPHA = 0.35;

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

function generateLines(w: number, h: number): BezierLine[] {
  const cx = w / 2;
  const cy = h / 2;
  const lines: BezierLine[] = [];

  // ── Horizontal flow lines with jittered control points ──
  for (let i = 0; i < 18; i++) {
    const t = (i + 0.5) / 18;
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
  for (let i = 0; i < 6; i++) {
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
  for (let i = 0; i < 8; i++) {
    const fromTop = i < 4;
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
  for (let i = 0; i < 4; i++) {
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    function init() {
      pulsesRef.current.forEach((p) => gsap.killTweensOf(p.progress));

      const dpr = window.devicePixelRatio || 1;
      canvas!.width = canvas!.offsetWidth * dpr;
      canvas!.height = canvas!.offsetHeight * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;

      linesRef.current = generateLines(w, h);

      if (reducedMotion) return;

      // Create pulses — some travel left→right, others right→left
      const lineCount = linesRef.current.length;
      pulsesRef.current = [];
      for (let i = 0; i < PULSE_COUNT; i++) {
        const reverse = Math.random() > 0.5;
        const pulse: Pulse = {
          lineIndex: Math.floor(Math.random() * lineCount),
          progress: { t: reverse ? 1 : 0 },
          reverse,
        };
        pulsesRef.current.push(pulse);

        gsap.to(pulse.progress, {
          t: reverse ? 0 : 1,
          duration: 2 + Math.random() * 2.5,
          ease: "none",
          repeat: -1,
          delay: (i / PULSE_COUNT) * 3,
          onRepeat() {
            pulse.lineIndex = Math.floor(Math.random() * lineCount);
          },
        });
      }
    }

    function draw() {
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      ctx!.clearRect(0, 0, w, h);

      const lines = linesRef.current;
      if (!lines.length) return;

      // Draw field lines
      ctx!.strokeStyle = `rgba(255, 255, 255, ${LINE_ALPHA})`;
      ctx!.lineWidth = 1;
      for (const line of lines) {
        ctx!.beginPath();
        ctx!.moveTo(line.p0x, line.p0y);
        ctx!.bezierCurveTo(
          line.p1x,
          line.p1y,
          line.p2x,
          line.p2y,
          line.p3x,
          line.p3y,
        );
        ctx!.stroke();
      }

      // Draw pulses with comet trails and glow
      ctx!.shadowColor = `rgba(255, 255, 255, ${GLOW_ALPHA})`;
      for (const pulse of pulsesRef.current) {
        const line = lines[pulse.lineIndex];
        if (!line) continue;

        const dir = pulse.reverse ? -1 : 1;

        for (let s = PULSE_TRAIL_STEPS; s >= 0; s--) {
          const t = pulse.progress.t - dir * (s / PULSE_TRAIL_STEPS) * PULSE_TRAIL;
          if (t < 0 || t > 1) continue;

          const x = cubic(t, line.p0x, line.p1x, line.p2x, line.p3x);
          const y = cubic(t, line.p0y, line.p1y, line.p2y, line.p3y);
          const fade = 1 - s / PULSE_TRAIL_STEPS;
          const alpha = fade * PULSE_ALPHA;
          const size = PULSE_DOT_SIZE * (0.4 + fade * 0.6);

          // Glow strongest on the leading dot, fades along trail
          ctx!.shadowBlur = fade * GLOW_RADIUS;
          ctx!.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx!.beginPath();
          ctx!.arc(x, y, size, 0, Math.PI * 2);
          ctx!.fill();
        }
      }
      ctx!.shadowBlur = 0;
    }

    init();
    gsap.ticker.add(draw);
    window.addEventListener("resize", init);

    return () => {
      gsap.ticker.remove(draw);
      window.removeEventListener("resize", init);
      pulsesRef.current.forEach((p) => gsap.killTweensOf(p.progress));
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
    />
  );
}
