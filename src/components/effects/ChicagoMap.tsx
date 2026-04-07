"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface ChicagoMapProps {
  className?: string;
}

const LERP_MOVE = 0.12;
const LERP_RETURN = 0.08;
const CONVERGE_THRESHOLD = 0.001;

export function ChicagoMap({ className = "" }: ChicagoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const gradientRef = useRef<SVGRadialGradientElement | null>(null);
  const rafRef = useRef<number>(0);
  const lerpRef = useRef(LERP_MOVE);
  const targetRef = useRef({ x: 0.5, y: 0.5 });
  const currentRef = useRef({ x: 0.5, y: 0.5 });
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
      .then((res) => res.text())
      .then((text) => setSvgContent(text))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!svgContent || !containerRef.current) return;

    const container = containerRef.current;
    const wrapper = container.querySelector(".chicago-svg-wrapper");
    if (!wrapper) return;

    wrapper.innerHTML = svgContent;

    const svg = wrapper.querySelector("svg");
    if (!svg) return;

    // Crop viewBox to emphasize east side / lakefront
    svg.setAttribute("viewBox", "400 0 1135 1264");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.display = "block";
    svg.removeAttribute("version");

    // Remove background
    const bg = svg.querySelector("#background");
    if (bg) bg.setAttribute("fill", "none");

    // Skip filter setup if reduced motion or mobile
    if (prefersReduced || isMobile) return;

    const linesGroup = svg.querySelector("#lines");
    if (!linesGroup) return;

    // Create filter with displacement map
    const ns = "http://www.w3.org/2000/svg";
    const defs = document.createElementNS(ns, "defs");

    // Radial gradient for displacement
    const gradient = document.createElementNS(ns, "radialGradient");
    gradient.id = "displace-gradient";
    gradient.setAttribute("cx", "0.5");
    gradient.setAttribute("cy", "0.5");
    gradient.setAttribute("r", "0.15");

    const stop1 = document.createElementNS(ns, "stop");
    stop1.setAttribute("offset", "0%");
    stop1.setAttribute("stop-color", "white");

    const stop2 = document.createElementNS(ns, "stop");
    stop2.setAttribute("offset", "100%");
    stop2.setAttribute("stop-color", "black");

    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);

    // Displacement map rect (used as feImage source)
    const displaceRect = document.createElementNS(ns, "rect");
    displaceRect.id = "displace-source";
    displaceRect.setAttribute("width", "100%");
    displaceRect.setAttribute("height", "100%");
    displaceRect.setAttribute("fill", "url(#displace-gradient)");

    // Filter definition
    const filter = document.createElementNS(ns, "filter");
    filter.id = "warp";
    filter.setAttribute("x", "-10%");
    filter.setAttribute("y", "-10%");
    filter.setAttribute("width", "120%");
    filter.setAttribute("height", "120%");
    filter.setAttribute("color-interpolation-filters", "sRGB");

    const feImage = document.createElementNS(ns, "feImage");
    feImage.setAttribute("href", "#displace-source");
    feImage.setAttribute("result", "displacementMap");

    const feDisplacement = document.createElementNS(ns, "feDisplacementMap");
    feDisplacement.setAttribute("in", "SourceGraphic");
    feDisplacement.setAttribute("in2", "displacementMap");
    feDisplacement.setAttribute("scale", "12");
    feDisplacement.setAttribute("xChannelSelector", "R");
    feDisplacement.setAttribute("yChannelSelector", "G");

    filter.appendChild(feImage);
    filter.appendChild(feDisplacement);
    defs.appendChild(filter);

    svg.insertBefore(defs, svg.firstChild);
    svg.insertBefore(displaceRect, defs.nextSibling);

    // Hide the displacement source rect visually
    displaceRect.style.opacity = "0";

    // Apply filter to street lines
    linesGroup.setAttribute("filter", "url(#warp)");

    // Store gradient ref for mouse tracking
    gradientRef.current = gradient;

    return () => {
      if (wrapper) wrapper.innerHTML = "";
      gradientRef.current = null;
    };
  }, [svgContent, prefersReduced, isMobile]);

  const startAnimation = useCallback(() => {
    if (rafRef.current) return;

    const animate = () => {
      const lerp = lerpRef.current;
      currentRef.current.x +=
        (targetRef.current.x - currentRef.current.x) * lerp;
      currentRef.current.y +=
        (targetRef.current.y - currentRef.current.y) * lerp;

      if (gradientRef.current) {
        gradientRef.current.setAttribute("cx", String(currentRef.current.x));
        gradientRef.current.setAttribute("cy", String(currentRef.current.y));
      }

      const dx = targetRef.current.x - currentRef.current.x;
      const dy = targetRef.current.y - currentRef.current.y;

      if (
        Math.abs(dx) > CONVERGE_THRESHOLD ||
        Math.abs(dy) > CONVERGE_THRESHOLD
      ) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        rafRef.current = 0;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (prefersReduced || isMobile || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      targetRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      };
      lerpRef.current = LERP_MOVE;
      startAnimation();
    },
    [prefersReduced, isMobile, startAnimation]
  );

  const handleMouseLeave = useCallback(() => {
    targetRef.current = { x: 0.5, y: 0.5 };
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

      {/* Accent pin */}
      <div
        className="pointer-events-none absolute h-5 w-5 rounded-full border-2 border-[var(--accent)]"
        style={{
          backgroundColor: "var(--accent)",
          left: "35%",
          top: "45%",
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );
}
