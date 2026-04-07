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

const LINE_COUNT = 28;
const PULSE_COUNT = 12;
const LINE_ALPHA = 0.07;
const PULSE_ALPHA = 0.5;
const PULSE_TRAIL = 0.08;
const PULSE_TRAIL_STEPS = 14;
const PULSE_DOT_SIZE = 2.5;

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
  const centerY = h / 2;
  const exclusionH = h * 0.12;
  const lines: BezierLine[] = [];

  for (let i = 0; i < LINE_COUNT; i++) {
    const t = (i + 0.5) / LINE_COUNT;
    const baseY = t * h;
    const distFromCenter = baseY - centerY;
    const normalized = distFromCenter / (h / 2);

    // Gaussian push — strongest near center, decays outward
    const pushMag = Math.exp(-normalized * normalized * 4) * exclusionH * 3;
    const push = (distFromCenter >= 0 ? 1 : -1) * pushMag;

    lines.push({
      p0x: -40,
      p0y: baseY,
      p1x: w * 0.3,
      p1y: baseY + push,
      p2x: w * 0.7,
      p2y: baseY + push,
      p3x: w + 40,
      p3y: baseY,
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
      pulsesRef.current = [];
      for (let i = 0; i < PULSE_COUNT; i++) {
        const reverse = Math.random() > 0.5;
        const pulse: Pulse = {
          lineIndex: Math.floor(Math.random() * LINE_COUNT),
          progress: { t: reverse ? 1 : 0 },
          reverse,
        };
        pulsesRef.current.push(pulse);

        gsap.to(pulse.progress, {
          t: reverse ? 0 : 1,
          duration: 2 + Math.random() * 2.5,
          ease: "none",
          repeat: -1,
          delay: (i / PULSE_COUNT) * 3, // spread initial start times
          onRepeat() {
            pulse.lineIndex = Math.floor(Math.random() * LINE_COUNT);
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

      // Draw pulses with comet trails
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

          ctx!.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx!.beginPath();
          ctx!.arc(x, y, size, 0, Math.PI * 2);
          ctx!.fill();
        }
      }
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
