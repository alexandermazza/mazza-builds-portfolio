"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { gsap } from "@/lib/gsap";
import { DURATION, EASE_OUT_MOTION } from "@/lib/motion";
import { SplitFlapText } from "@/components/effects/SplitFlapText";
import { Button } from "@/components/ui";
import Image from "next/image";
import { projects } from "@/data/projects";

// ─── Constants ────────────────────────────────────────

/** Desktop spotlight radius as fraction of viewport width */
const IRIS_RADIUS_VW_DESKTOP = 0.4;
/** Mobile spotlight radius as fraction of viewport width */
const IRIS_RADIUS_VW_MOBILE = 0.45;
/** Iris open duration in seconds */
const IRIS_DURATION = 1.2;

/** Wobble frequencies (Hz) — intentionally incommensurate so pattern never repeats */
const WOBBLE_FREQ_X = 0.3;
const WOBBLE_FREQ_Y = 0.17;
/** Wobble amplitude in px */
const WOBBLE_AMP_DESKTOP = 10;
const WOBBLE_AMP_MOBILE = 5;

// ─── Component ────────────────────────────────────────

export function SpotlightSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const irisProgress = useRef({ value: 0 });
  const startTime = useRef(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const prefersReduced = useReducedMotion();

  // Daily Roman data
  const dailyRoman = projects.find((p) => p.slug === "daily-roman")!;
  const appStoreUrl = dailyRoman.links.find((l) => l.label === "App Store")?.url ?? "#";

  // Detect mobile
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    function onChange(e: MediaQueryListEvent) {
      setIsMobile(e.matches);
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Canvas setup + animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = canvas!.offsetWidth * dpr;
      canvas!.height = canvas!.offsetHeight * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      const progress = irisProgress.current.value;
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      const radiusFraction = mobile ? IRIS_RADIUS_VW_MOBILE : IRIS_RADIUS_VW_DESKTOP;
      const wobbleAmp = mobile ? WOBBLE_AMP_MOBILE : WOBBLE_AMP_DESKTOP;

      // Full iris radius in px
      const maxRadius = w * radiusFraction;
      const currentRadius = maxRadius * progress;

      // Wobble offset — only after iris starts
      let wobbleX = 0;
      let wobbleY = 0;
      if (progress > 0 && !reducedMotion) {
        const elapsed = (Date.now() - startTime.current) / 1000;
        wobbleX = Math.sin(elapsed * WOBBLE_FREQ_X * Math.PI * 2) * wobbleAmp;
        wobbleY = Math.sin(elapsed * WOBBLE_FREQ_Y * Math.PI * 2) * wobbleAmp;
      }

      const cx = w / 2 + wobbleX;
      const cy = h / 2 + wobbleY;

      // 1. Fill black
      ctx!.globalCompositeOperation = "source-over";
      ctx!.fillStyle = "#000000";
      ctx!.fillRect(0, 0, w, h);

      if (currentRadius > 0) {
        // 2. Punch out the spotlight with destination-out
        ctx!.globalCompositeOperation = "destination-out";
        const gradient = ctx!.createRadialGradient(cx, cy, 0, cx, cy, currentRadius);
        gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
        gradient.addColorStop(0.7, "rgba(0, 0, 0, 0.8)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx!.fillStyle = gradient;
        ctx!.fillRect(0, 0, w, h);
        ctx!.globalCompositeOperation = "source-over";
      }
    }

    resize();
    gsap.ticker.add(draw);
    window.addEventListener("resize", resize);

    return () => {
      gsap.ticker.remove(draw);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Trigger iris animation when in view
  useEffect(() => {
    if (!isInView) return;
    if (prefersReduced) {
      irisProgress.current.value = 1;
      setIsRevealed(true);
      return;
    }

    startTime.current = Date.now();
    gsap.to(irisProgress.current, {
      value: 1,
      duration: IRIS_DURATION,
      ease: "power2.out",
      onStart: () => setIsRevealed(true),
    });
  }, [isInView, prefersReduced]);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-black md:h-dvh"
      style={{ padding: isMobile ? "var(--space-4xl) var(--space-md)" : undefined }}
    >
      {/* Canvas overlay */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ zIndex: 1 }}
      />

      {/* Content */}
      <div className="relative flex flex-col items-center text-center" style={{ zIndex: 2 }}>
        {/* App icon */}
        <motion.div
          initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
          animate={isRevealed ? { opacity: 1, y: 0 } : undefined}
          transition={{
            duration: prefersReduced ? 0 : DURATION.transition,
            ease: EASE_OUT_MOTION,
            delay: 0,
          }}
          className="mb-[var(--space-lg)]"
        >
          <Image
            src="/projects/daily-roman/appicon.png"
            alt="Daily Roman app icon"
            width={96}
            height={96}
            className="md:h-[96px] md:w-[96px] h-[80px] w-[80px]"
            style={{ borderRadius: "22%" }}
          />
        </motion.div>

        {/* App name — SplitFlapText */}
        <motion.div
          initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
          animate={isRevealed ? { opacity: 1, y: 0 } : undefined}
          transition={{
            duration: prefersReduced ? 0 : DURATION.transition,
            ease: EASE_OUT_MOTION,
            delay: prefersReduced ? 0 : 0.1,
          }}
          className="mb-[var(--space-sm)]"
        >
          <SplitFlapText
            isActive={isRevealed}
            staggerMs={40}
            className="font-sans text-[clamp(40px,6vw,72px)] leading-[1.1] tracking-[-0.02em] text-[var(--text-display)]"
          >
            Daily Roman
          </SplitFlapText>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
          animate={isRevealed ? { opacity: 1, y: 0 } : undefined}
          transition={{
            duration: prefersReduced ? 0 : DURATION.transition,
            ease: EASE_OUT_MOTION,
            delay: prefersReduced ? 0 : 0.3,
          }}
          className="mb-[var(--space-xl)] max-w-[280px] font-mono text-[13px] uppercase leading-[1.5] tracking-[0.06em] text-[var(--text-secondary)]"
        >
          The Duolingo for Ancient Rome
        </motion.p>

        {/* App Store button */}
        <motion.div
          initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
          animate={isRevealed ? { opacity: 1, y: 0 } : undefined}
          transition={{
            duration: prefersReduced ? 0 : DURATION.transition,
            ease: EASE_OUT_MOTION,
            delay: prefersReduced ? 0 : 0.5,
          }}
        >
          <a href={appStoreUrl} target="_blank" rel="noopener noreferrer">
            <Button>Download on the App Store</Button>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
