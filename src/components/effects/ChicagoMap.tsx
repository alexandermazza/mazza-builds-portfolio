"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

interface ChicagoMapProps {
  className?: string;
  style?: React.CSSProperties;
}

const PIN_X = 38;
const PIN_Y = 58;

// Parallax shift per layer in SVG units (≈1.5x in screen px)
const DEPTHS = [2, 6, 12]; // bg, mid, fg
const OPACITIES = [0.3, 0.55, 0.85];
const LERP = 0.07;
const CONVERGE = 0.01;
const LAYER_IDS = ["#lines-bg", "#lines-mid", "#lines-fg"];

export function ChicagoMap({ className = "", style }: ChicagoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<SVGGElement[]>([]);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const rafRef = useRef(0);
  const pos = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useEffect(() => {
    setPrefersReduced(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    fetch("/chicago-map-parallax.svg")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(setSvgContent)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!svgContent || !wrapperRef.current) return;
    const wrapper = wrapperRef.current;

    const doc = new DOMParser().parseFromString(svgContent, "image/svg+xml");
    const parsedSvg = doc.querySelector("svg");
    if (!parsedSvg) return;
    wrapper.appendChild(document.importNode(parsedSvg, true));

    const svg = wrapper.querySelector("svg");
    if (!svg) return;

    svg.setAttribute("viewBox", isMobile ? "350 250 650 550" : "200 300 900 500");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", isMobile ? "xMinYMid slice" : "xMidYMid slice");
    svg.style.display = "block";

    const bg = svg.querySelector("#background");
    if (bg) bg.setAttribute("fill", "none");

    // Grab layer refs and set base opacities
    const layers: SVGGElement[] = [];
    LAYER_IDS.forEach((id, i) => {
      const g = svg.querySelector(id) as SVGGElement | null;
      if (g) {
        g.style.opacity = String(OPACITIES[i]);
        layers.push(g);
      }
    });
    layersRef.current = layers;

    return () => {
      wrapper.innerHTML = "";
      layersRef.current = [];
    };
  }, [svgContent, isMobile]);

  const animate = useCallback(() => {
    const p = pos.current;
    p.x += (p.tx - p.x) * LERP;
    p.y += (p.ty - p.y) * LERP;

    layersRef.current.forEach((layer, i) => {
      const d = DEPTHS[i];
      layer.setAttribute("transform", `translate(${-p.x * d}, ${-p.y * d})`);
    });

    const delta = Math.abs(p.tx - p.x) + Math.abs(p.ty - p.y);
    if (delta > CONVERGE) {
      rafRef.current = requestAnimationFrame(animate);
    } else {
      rafRef.current = 0;
    }
  }, []);

  const startLoop = useCallback(() => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(animate);
  }, [animate]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (prefersReduced) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // -1 … +1 from center
      pos.current.tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      pos.current.ty = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      startLoop();
    },
    [prefersReduced, startLoop]
  );

  const handleMouseLeave = useCallback(() => {
    pos.current.tx = 0;
    pos.current.ty = 0;
    startLoop();
  }, [startLoop]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={style}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={wrapperRef} className="chicago-svg-wrapper h-full w-full" />

      {/* CHICAGO label in the lake negative space */}
      <span
        className="pointer-events-none absolute font-mono text-[48px] font-bold uppercase leading-none tracking-[0.08em]"
        style={{
          color: "var(--border-visible)",
          right: isMobile ? undefined : "18%",
          left: isMobile ? "30%" : undefined,
          top: isMobile ? "40%" : "20%",
        }}
      >
        CHICAGO
      </span>

      {/* Location heart */}
      <span
        className="pointer-events-none absolute text-[20px] leading-none"
        style={{
          color: "var(--error)",
          left: isMobile ? "30%" : `${PIN_X}%`,
          top: isMobile ? "62%" : `${PIN_Y}%`,
          transform: "translate(-50%, -50%)",
        }}
      >
        &#9829;
      </span>
    </div>
  );
}
