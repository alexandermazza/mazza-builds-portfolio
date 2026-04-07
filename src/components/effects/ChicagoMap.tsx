"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface ChicagoMapProps {
  className?: string;
}

const LERP_IN = 0.06;
const LERP_OUT = 0.04;
const CONVERGE_THRESHOLD = 0.01;
const MAX_DISPLACEMENT = 35;

export function ChicagoMap({ className = "" }: ChicagoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const displacementRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const turbulenceRef = useRef<SVGFETurbulenceElement | null>(null);
  const rafRef = useRef<number>(0);
  const targetScale = useRef(0);
  const currentScale = useRef(0);
  const lerpRef = useRef(LERP_IN);
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

    const svg = wrapper.querySelector("svg");
    if (!svg) return;

    // Tight crop — Chicago fills the frame, lake as negative space on right
    svg.setAttribute("viewBox", "400 300 650 500");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    svg.style.display = "block";
    svg.removeAttribute("version");

    // Remove background
    const bg = svg.querySelector("#background");
    if (bg) bg.setAttribute("fill", "none");

    // Skip filter setup if reduced motion or mobile
    if (prefersReduced || isMobile) return;

    const linesGroup = svg.querySelector("#lines");
    if (!linesGroup) return;

    // Create feTurbulence + feDisplacementMap filter
    const ns = "http://www.w3.org/2000/svg";
    const defs = document.createElementNS(ns, "defs");

    const filter = document.createElementNS(ns, "filter");
    filter.id = "warp";
    filter.setAttribute("x", "-5%");
    filter.setAttribute("y", "-5%");
    filter.setAttribute("width", "110%");
    filter.setAttribute("height", "110%");

    // Turbulence generates organic noise pattern
    const turbulence = document.createElementNS(ns, "feTurbulence");
    turbulence.setAttribute("type", "fractalNoise");
    turbulence.setAttribute("baseFrequency", "0.015");
    turbulence.setAttribute("numOctaves", "3");
    turbulence.setAttribute("seed", "2");
    turbulence.setAttribute("result", "noise");

    // Displacement uses turbulence to warp the street lines
    const displacement = document.createElementNS(ns, "feDisplacementMap");
    displacement.setAttribute("in", "SourceGraphic");
    displacement.setAttribute("in2", "noise");
    displacement.setAttribute("scale", "0");
    displacement.setAttribute("xChannelSelector", "R");
    displacement.setAttribute("yChannelSelector", "G");

    filter.appendChild(turbulence);
    filter.appendChild(displacement);
    defs.appendChild(filter);
    svg.insertBefore(defs, svg.firstChild);

    linesGroup.setAttribute("filter", "url(#warp)");

    displacementRef.current = displacement;
    turbulenceRef.current = turbulence;

    return () => {
      wrapper.innerHTML = "";
      displacementRef.current = null;
      turbulenceRef.current = null;
    };
  }, [svgContent, prefersReduced, isMobile]);

  const startAnimation = useCallback(() => {
    if (rafRef.current) return;

    const animate = () => {
      const lerp = lerpRef.current;
      currentScale.current +=
        (targetScale.current - currentScale.current) * lerp;

      if (displacementRef.current) {
        displacementRef.current.setAttribute(
          "scale",
          String(currentScale.current)
        );
      }

      const delta = Math.abs(targetScale.current - currentScale.current);

      if (delta > CONVERGE_THRESHOLD) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        rafRef.current = 0;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (prefersReduced || isMobile) return;
    targetScale.current = MAX_DISPLACEMENT;
    lerpRef.current = LERP_IN;
    startAnimation();
  }, [prefersReduced, isMobile, startAnimation]);

  const handleMouseLeave = useCallback(() => {
    targetScale.current = 0;
    lerpRef.current = LERP_OUT;
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
      onMouseEnter={handleMouseEnter}
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
