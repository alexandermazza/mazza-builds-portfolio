"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

interface Point {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
}

const SPACING = 70;
const DRIFT = 25;

export function MorphingGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Point[]>([]);
  const colsRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // White lines with low alpha — visible on black without being harsh
    const lineColor = "rgba(255, 255, 255, 0.12)";

    function initGrid() {
      // Kill existing tweens
      if (pointsRef.current.length) {
        pointsRef.current.forEach((p) => gsap.killTweensOf(p));
      }

      const dpr = window.devicePixelRatio || 1;
      canvas!.width = canvas!.offsetWidth * dpr;
      canvas!.height = canvas!.offsetHeight * dpr;
      ctx!.scale(dpr, dpr);

      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
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
          pointsRef.current.push({ baseX, baseY, x: baseX, y: baseY });
        }
      }

      if (!reducedMotion) {
        pointsRef.current.forEach((point) => {
          gsap.to(point, {
            x: point.baseX + (Math.random() - 0.5) * DRIFT * 2,
            y: point.baseY + (Math.random() - 0.5) * DRIFT * 2,
            duration: 2 + Math.random() * 3,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
          });
        });
      }
    }

    function draw() {
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
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

    // Use GSAP ticker for draw loop (syncs with GSAP's update cycle)
    gsap.ticker.add(draw);

    const onResize = () => {
      initGrid();
    };
    window.addEventListener("resize", onResize);

    return () => {
      gsap.ticker.remove(draw);
      window.removeEventListener("resize", onResize);
      pointsRef.current.forEach((p) => gsap.killTweensOf(p));
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
