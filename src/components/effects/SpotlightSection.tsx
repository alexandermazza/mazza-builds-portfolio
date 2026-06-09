"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { gsap } from "@/lib/gsap";
import { DURATION, EASE_OUT_MOTION } from "@/lib/motion";
import { useIsMobile } from "@/lib/use-is-mobile";
import { SplitFlapText } from "@/components/effects/SplitFlapText";
import { projects } from "@/data/projects";

const DeviceScene = dynamic(
  () => import("@/components/3d/DeviceScene").then((m) => m.DeviceScene),
  { ssr: false }
);

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
  const sizeRef = useRef({ w: 0, h: 0 });
  const visibleRef = useRef(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const isMobile = useIsMobile();
  const isMobileRef = useRef(false);
  useEffect(() => { isMobileRef.current = isMobile; }, [isMobile]);

  const isInView = useInView(sectionRef, { once: true, margin: "-40% 0px -40% 0px" });
  const prefersReduced = useReducedMotion();

  // SecondRound data
  const secondRound = projects.find((p) => p.slug === "secondround")!;
  const liveUrl = secondRound.links.find((l) => l.label === "Live")?.url ?? "https://secondround.app";

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
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };
    }

    function draw() {
      if (!visibleRef.current) return;

      const { w, h } = sizeRef.current;
      if (w === 0 || h === 0) return;

      const progress = irisProgress.current.value;
      const mobile = isMobileRef.current;
      const radiusFraction = mobile ? IRIS_RADIUS_VW_MOBILE : IRIS_RADIUS_VW_DESKTOP;
      const wobbleAmp = mobile ? WOBBLE_AMP_MOBILE : WOBBLE_AMP_DESKTOP;

      const maxRadius = w * radiusFraction;
      const currentRadius = maxRadius * progress;

      let wobbleX = 0;
      let wobbleY = 0;
      if (progress > 0 && !reducedMotion) {
        const elapsed = (Date.now() - startTime.current) / 1000;
        wobbleX = Math.sin(elapsed * WOBBLE_FREQ_X * Math.PI * 2) * wobbleAmp;
        wobbleY = Math.sin(elapsed * WOBBLE_FREQ_Y * Math.PI * 2) * wobbleAmp;
      }

      const cx = w / 2 + wobbleX;
      const cy = h / 2 + wobbleY;

      ctx!.globalCompositeOperation = "source-over";
      ctx!.fillStyle = "#000000";
      ctx!.fillRect(0, 0, w, h);

      if (currentRadius > 0) {
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

    // Pause draw loop when section is off-screen
    const io = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting; },
      { rootMargin: "100px" }
    );
    if (sectionRef.current) io.observe(sectionRef.current);

    gsap.ticker.add(draw);
    window.addEventListener("resize", resize);

    return () => {
      gsap.ticker.remove(draw);
      window.removeEventListener("resize", resize);
      io.disconnect();
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
    const tween = gsap.to(irisProgress.current, {
      value: 1,
      duration: IRIS_DURATION,
      ease: "power2.out",
      onStart: () => setIsRevealed(true),
    });
    return () => { tween.kill(); };
  }, [isInView, prefersReduced]);

  return (
    <section
      id="spotlight"
      ref={sectionRef}
      className="relative flex items-center justify-center overflow-hidden bg-black py-[var(--space-3xl)] px-[var(--space-md)] md:h-[70vh] md:min-h-[500px] md:py-0 md:px-0"
    >
      {/* Warm glow — the "light" the spotlight reveals */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 0,
          background: "radial-gradient(circle, rgba(255,225,180,0.45) 0%, rgba(255,200,150,0.2) 20%, rgba(255,180,120,0.05) 40%, transparent 55%)",
        }}
      />

      {/* Canvas overlay — black with transparent spotlight hole */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ zIndex: 2 }}
      />

      {/* Section label — above canvas */}
      <p
        className="absolute left-[var(--space-md)] top-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)] md:left-[var(--space-lg)]"
        style={{ zIndex: 3 }}
      >
        SPEC: SPOTLIGHT
      </p>

      {/* Content */}
      <div className="relative flex flex-col items-center text-center" style={{ zIndex: 1 }}>
        {/* MacBook — 3D device with white screen showing the SecondRound logo */}
        <motion.div
          initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
          animate={isRevealed ? { opacity: 1, y: 0 } : undefined}
          transition={{
            duration: prefersReduced ? 0 : DURATION.transition,
            ease: EASE_OUT_MOTION,
            delay: 0,
          }}
          className="mb-[var(--space-md)] h-[210px] w-[320px] md:h-[320px] md:w-[500px]"
        >
          {isInView && (
            <DeviceScene
              deviceType="laptop"
              screenTexture={secondRound.screenTexture}
              scrollProgress={0}
              isActive={isRevealed}
              projectSlug={secondRound.slug}
              screenBgColor={secondRound.screenBgColor}
              screenTextureScale={secondRound.screenTextureScale}
            />
          )}
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
            SecondRound
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
          className="mb-[var(--space-xl)] max-w-[340px] font-mono text-[13px] uppercase leading-[1.5] tracking-[0.06em] text-[var(--text-secondary)]"
        >
          Tailored resumes that pass the AI screener
        </motion.p>

        {/* Visit link */}
        <motion.div
          initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
          animate={isRevealed ? { opacity: 1, y: 0 } : undefined}
          transition={{
            duration: prefersReduced ? 0 : DURATION.transition,
            ease: EASE_OUT_MOTION,
            delay: prefersReduced ? 0 : 0.5,
          }}
        >
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-[8px] rounded-[var(--radius-pill)] border border-[var(--border-visible)] px-[20px] py-[10px] font-mono text-[13px] uppercase tracking-[0.06em] text-white transition-colors hover:border-[var(--accent)]"
            style={{ transitionDuration: "var(--duration-micro)" }}
          >
            <span>Visit secondround.app</span>
            <span className="transition-colors group-hover:text-[var(--accent)]">→</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
