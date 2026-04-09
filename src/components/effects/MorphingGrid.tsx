"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

interface Point {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  // Per-point phase offsets for sine-wave drift (replaces individual GSAP tweens)
  phaseX: number;
  phaseY: number;
  speedX: number;
  speedY: number;
}

const SPACING = 70;
const DRIFT = 25;

export function MorphingGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Point[]>([]);
  const colsRef = useRef(0);
  const visibleRef = useRef(false);
  const sizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const lineColor = "rgba(255, 255, 255, 0.12)";
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    function initGrid() {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };

      const cols = Math.ceil(w / SPACING) + 2;
      const rows = Math.ceil(h / SPACING) + 2;
      const offsetX = (w - (cols - 1) * SPACING) / 2;
      const offsetY = (h - (rows - 1) * SPACING) / 2;

      colsRef.current = cols;
      pointsRef.current = [];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const baseX = offsetX + c * SPACING;
          const baseY = offsetY + r * SPACING;
          pointsRef.current.push({
            baseX,
            baseY,
            x: baseX,
            y: baseY,
            phaseX: Math.random() * Math.PI * 2,
            phaseY: Math.random() * Math.PI * 2,
            speedX: 0.3 + Math.random() * 0.4,
            speedY: 0.3 + Math.random() * 0.4,
          });
        }
      }
    }

    function draw(_time: number, deltaTime: number) {
      if (!visibleRef.current) return;

      const { w, h } = sizeRef.current;
      if (w === 0 || h === 0) return;

      const dt = deltaTime / 1000;

      // Advance point positions via sine waves (replaces 400 GSAP tweens)
      if (!reducedMotion) {
        for (const p of pointsRef.current) {
          p.phaseX += dt * p.speedX;
          p.phaseY += dt * p.speedY;
          p.x = p.baseX + Math.sin(p.phaseX) * DRIFT;
          p.y = p.baseY + Math.sin(p.phaseY) * DRIFT;
        }
      }

      ctx!.clearRect(0, 0, w, h);

      const points = pointsRef.current;
      const cols = colsRef.current;
      if (!points.length || !cols) return;

      ctx!.strokeStyle = lineColor;
      ctx!.lineWidth = 1;

      // Draw horizontal lines
      ctx!.beginPath();
      for (let i = 0; i < points.length; i++) {
        if (i % cols < cols - 1) {
          const p1 = points[i];
          const p2 = points[i + 1];
          ctx!.moveTo(p1.x, p1.y);
          ctx!.lineTo(p2.x, p2.y);
        }
      }
      ctx!.stroke();

      // Draw vertical lines
      ctx!.beginPath();
      for (let i = 0; i < points.length - cols; i++) {
        const p1 = points[i];
        const p2 = points[i + cols];
        ctx!.moveTo(p1.x, p1.y);
        ctx!.lineTo(p2.x, p2.y);
      }
      ctx!.stroke();
    }

    initGrid();

    gsap.ticker.add(draw);

    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(initGrid, 150);
    };
    window.addEventListener("resize", onResize);

    // Pause draw loop when canvas is off-screen
    const io = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting; },
      { rootMargin: "100px" }
    );
    io.observe(canvas);

    return () => {
      gsap.ticker.remove(draw);
      window.removeEventListener("resize", onResize);
      if (resizeTimer) clearTimeout(resizeTimer);
      io.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ opacity: 1 }}
    />
  );
}
