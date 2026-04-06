"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import {
  sampleTextPoints,
  flatLinePoints,
  sineWavePoints,
  type Point,
} from "@/lib/text-sampler";

interface OscilloscopeHeroProps {
  text?: string;
  className?: string;
}

const POINT_COUNT_DESKTOP = 900;
const POINT_COUNT_MOBILE = 400;
const STATUS_LABELS = [
  { at: 0, text: "[SIGNAL IDLE]" },
  { at: 0.15, text: "[SIGNAL DETECTED]" },
  { at: 0.3, text: "[DECODING...]" },
  { at: 0.45, text: "[SIGNAL LOCKED]" },
  { at: 0.75, text: "[MAZZA_BUILDS.INIT()]" },
];

function getStatusLabel(progress: number): string {
  let label = STATUS_LABELS[0].text;
  for (const s of STATUS_LABELS) {
    if (progress >= s.at) label = s.text;
  }
  return label;
}

function lerpColor(
  from: [number, number, number],
  to: [number, number, number],
  t: number
): string {
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);
  return `rgb(${r},${g},${b})`;
}

// --text-disabled: #666 = [102,102,102]
// --text-primary: #E8E8E8 = [232,232,232]
// --text-display: #FFF = [255,255,255]
const COLOR_DISABLED: [number, number, number] = [102, 102, 102];
const COLOR_PRIMARY: [number, number, number] = [232, 232, 232];
const COLOR_DISPLAY: [number, number, number] = [255, 255, 255];

export function OscilloscopeHero({
  text = "MAZZA BUILDS",
  className = "",
}: OscilloscopeHeroProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const pointsRef = useRef<Point[]>([]);
  const statesRef = useRef<{
    flat: Point[];
    wave: Point[];
    text: Point[];
  } | null>(null);
  const animFrameRef = useRef<number>(0);
  const [ready, setReady] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);

  // Check reduced motion
  useEffect(() => {
    setPrefersReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const pointCount = isMobile ? POINT_COUNT_MOBILE : POINT_COUNT_DESKTOP;

  // Initialize points and states after font loads
  useEffect(() => {
    if (prefersReduced) return;

    async function init() {
      await document.fonts.ready;

      const flat = flatLinePoints(pointCount);
      const wave = sineWavePoints(pointCount, 8, 0.15);
      const textPts = sampleTextPoints(text, "Space Grotesk", pointCount);

      statesRef.current = { flat, wave, text: textPts };
      // Start at flat line
      pointsRef.current = flat.map((p) => ({ ...p }));
      setReady(true);
    }

    init();
  }, [text, pointCount, prefersReduced]);

  // Canvas draw loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const progress = progressRef.current;
    const points = pointsRef.current;

    ctx.clearRect(0, 0, w, h);

    // Determine line color based on progress
    let color: string;
    if (progress < 0.15) {
      color = lerpColor(COLOR_DISABLED, COLOR_DISABLED, 0);
    } else if (progress < 0.45) {
      const t = (progress - 0.15) / 0.3;
      color = lerpColor(COLOR_DISABLED, COLOR_PRIMARY, t);
    } else if (progress < 0.75) {
      const t = (progress - 0.45) / 0.3;
      color = lerpColor(COLOR_PRIMARY, COLOR_DISPLAY, t);
    } else {
      color = lerpColor(COLOR_DISPLAY, COLOR_DISPLAY, 0);
    }

    // Draw polyline
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();

    // Map normalized points to canvas coordinates
    const margin = w * 0.05;
    const drawW = w - margin * 2;
    const drawH = h * 0.6;
    const offsetY = h * 0.2;

    for (let i = 0; i < points.length; i++) {
      const px = margin + points[i].x * drawW;
      const py = offsetY + points[i].y * drawH;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Phase 4: brightness pulse sweep (75%-85%)
    if (progress >= 0.75 && progress < 0.85) {
      const sweepT = (progress - 0.75) / 0.1; // 0..1
      const sweepX = margin + sweepT * drawW;
      const bandWidth = 40;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(255,255,255,0.6)`;
      ctx.lineWidth = 3;
      ctx.beginPath();

      for (let i = 0; i < points.length; i++) {
        const px = margin + points[i].x * drawW;
        const py = offsetY + points[i].y * drawH;
        const dist = Math.abs(px - sweepX);
        if (dist < bandWidth) {
          if (i === 0 || Math.abs(margin + points[i - 1].x * drawW - sweepX) >= bandWidth) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    // Update status label
    if (statusRef.current) {
      statusRef.current.textContent = getStatusLabel(progress);
    }
  }, []);

  // Set up ScrollTrigger and animation
  useEffect(() => {
    if (!ready || prefersReduced) return;
    const section = sectionRef.current;
    if (!section) return;

    const states = statesRef.current!;
    const points = pointsRef.current;

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: isMobile ? "+=200%" : "+=300%",
      pin: true,
      scrub: 1,
      onUpdate: (self) => {
        progressRef.current = self.progress;

        const p = self.progress;

        // Interpolate points between states
        for (let i = 0; i < points.length; i++) {
          if (p < 0.15) {
            // Phase 1: flat line
            points[i].x = states.flat[i].x;
            points[i].y = states.flat[i].y;
          } else if (p < 0.45) {
            // Phase 2: flat -> wave
            const t = (p - 0.15) / 0.3;
            points[i].x = states.flat[i].x + (states.wave[i].x - states.flat[i].x) * t;
            points[i].y = states.flat[i].y + (states.wave[i].y - states.flat[i].y) * t;
          } else if (p < 0.75) {
            // Phase 3: wave -> text
            const t = (p - 0.45) / 0.3;
            points[i].x = states.wave[i].x + (states.text[i].x - states.wave[i].x) * t;
            points[i].y = states.wave[i].y + (states.text[i].y - states.wave[i].y) * t;
          } else {
            // Phase 4: hold at text
            points[i].x = states.text[i].x;
            points[i].y = states.text[i].y;
          }
        }

        // Show/hide h1 and canvas at lock point
        if (h1Ref.current && canvasRef.current && dividerRef.current) {
          if (p >= 0.85) {
            canvasRef.current.style.opacity = "0";
            h1Ref.current.style.opacity = "1";
            dividerRef.current.style.opacity = "1";
          } else {
            canvasRef.current.style.opacity = "1";
            h1Ref.current.style.opacity = "0";
            dividerRef.current.style.opacity = "0";
          }
        }
      },
    });

    // Render loop
    function loop() {
      draw();
      animFrameRef.current = requestAnimationFrame(loop);
    }
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      trigger.kill();
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [ready, prefersReduced, draw, isMobile]);

  // Reduced motion: just show the text
  if (prefersReduced) {
    return (
      <section className={className}>
        <h1 className="font-sans text-[clamp(48px,12vw,96px)] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]">
          {text}
        </h1>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className={`relative h-screen ${className}`}>
      {/* Canvas for waveform animation */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ transition: "opacity 0.15s ease-out" }}
      />

      {/* Real h1 — hidden until lock, always in DOM for a11y */}
      <h1
        ref={h1Ref}
        className="absolute inset-0 flex items-center justify-center font-sans text-[clamp(48px,12vw,96px)] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]"
        style={{ opacity: 0, transition: "opacity 0.15s ease-out" }}
      >
        {text}
      </h1>

      {/* Divider line — appears at lock */}
      <div
        ref={dividerRef}
        className="absolute bottom-[20%] left-[5%] right-[5%] h-px bg-[var(--text-disabled)]"
        style={{ opacity: 0, transition: "opacity 0.15s ease-out" }}
      />

      {/* Status label */}
      <span
        ref={statusRef}
        aria-hidden="true"
        className="absolute bottom-[var(--space-lg)] left-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)] hidden sm:block"
      >
        [SIGNAL IDLE]
      </span>
    </section>
  );
}
