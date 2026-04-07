"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface ChicagoMapProps {
  className?: string;
}

const LERP_MOVE = 0.1;
const LERP_RETURN = 0.06;
const CONVERGE_THRESHOLD = 0.001;
const HOVER_SCALE = 1.06;
const TILT_DEGREES = 4;

export function ChicagoMap({ className = "" }: ChicagoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const rafRef = useRef<number>(0);
  const lerpRef = useRef(LERP_MOVE);
  const targetRef = useRef({ x: 0.5, y: 0.5, scale: 1 });
  const currentRef = useRef({ x: 0.5, y: 0.5, scale: 1 });
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setPrefersReduced(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
    setIsMobile(window.matchMedia("(max-width: 767px)").matches);
  }, []);

  useEffect(() => {
    fetch("/chicago-map.svg")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => setSvgContent(text))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!svgContent || !containerRef.current) return;

    const container = containerRef.current;
    const wrapper = container.querySelector<HTMLDivElement>(".chicago-svg-wrapper");
    if (!wrapper) return;

    // Inject raw SVG (first-party asset from public/)
    wrapper.innerHTML = svgContent;
    wrapperRef.current = wrapper;

    const svg = wrapper.querySelector("svg");
    if (!svg) return;

    // Crop viewBox — zoomed into central Chicago, shorter aspect ratio
    svg.setAttribute("viewBox", "350 300 900 550");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    svg.style.display = "block";
    svg.removeAttribute("version");

    // Remove background
    const bg = svg.querySelector("#background");
    if (bg) bg.setAttribute("fill", "none");

    // Set transition for smooth interaction
    if (!prefersReduced && !isMobile) {
      wrapper.style.willChange = "transform";
    }

    return () => {
      wrapper.innerHTML = "";
      wrapperRef.current = null;
    };
  }, [svgContent, prefersReduced, isMobile]);

  const applyTransform = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const { x, y, scale } = currentRef.current;
    const originX = x * 100;
    const originY = y * 100;

    // Subtle tilt based on cursor offset from center
    const rotateY = (x - 0.5) * TILT_DEGREES;
    const rotateX = -(y - 0.5) * TILT_DEGREES;

    wrapper.style.transformOrigin = `${originX}% ${originY}%`;
    wrapper.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`;
  }, []);

  const startAnimation = useCallback(() => {
    if (rafRef.current) return;

    const animate = () => {
      const lerp = lerpRef.current;
      currentRef.current.x +=
        (targetRef.current.x - currentRef.current.x) * lerp;
      currentRef.current.y +=
        (targetRef.current.y - currentRef.current.y) * lerp;
      currentRef.current.scale +=
        (targetRef.current.scale - currentRef.current.scale) * lerp;

      applyTransform();

      const dx = targetRef.current.x - currentRef.current.x;
      const dy = targetRef.current.y - currentRef.current.y;
      const ds = targetRef.current.scale - currentRef.current.scale;

      if (
        Math.abs(dx) > CONVERGE_THRESHOLD ||
        Math.abs(dy) > CONVERGE_THRESHOLD ||
        Math.abs(ds) > CONVERGE_THRESHOLD
      ) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        rafRef.current = 0;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [applyTransform]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (prefersReduced || isMobile || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      targetRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
        scale: HOVER_SCALE,
      };
      lerpRef.current = LERP_MOVE;
      startAnimation();
    },
    [prefersReduced, isMobile, startAnimation]
  );

  const handleMouseLeave = useCallback(() => {
    targetRef.current = { x: 0.5, y: 0.5, scale: 1 };
    lerpRef.current = LERP_RETURN;
    startAnimation();
  }, [startAnimation]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="chicago-svg-wrapper h-full w-full" />

      {/* CHICAGO label in the lake negative space */}
      <span
        className="pointer-events-none absolute font-mono text-[48px] font-bold uppercase leading-none tracking-[0.08em]"
        style={{
          color: "var(--border-visible)",
          right: "5%",
          top: "20%",
        }}
      >
        CHICAGO
      </span>

      {/* Location heart */}
      <span
        className="pointer-events-none absolute text-[20px] leading-none"
        style={{
          color: "var(--error)",
          left: "35%",
          top: "45%",
          transform: "translate(-50%, -50%)",
        }}
      >
        &#9829;
      </span>
    </div>
  );
}
