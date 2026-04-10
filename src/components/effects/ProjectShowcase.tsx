"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  motion,
  useScroll,
  useMotionValueEvent,
  AnimatePresence,
  useReducedMotion,
} from "motion/react";
import { DURATION, EASE_OUT_MOTION } from "@/lib/motion";
import { StatusBadge, TagChip, ProjectCard } from "@/components/ui";
import { ScrollGridAnimation } from "@/components/effects";
import { TransitionLink } from "@/transitions";
import dynamic from "next/dynamic";
import type { Project } from "@/data/projects";

const DeviceScene = dynamic(
  () => import("@/components/3d/DeviceScene").then((m) => m.DeviceScene),
  { ssr: false }
);

/** Lazy-mounts DeviceScene only when visible — prevents multiple WebGL contexts fighting */
function LazyDeviceScene(props: React.ComponentProps<typeof DeviceScene>) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="h-full w-full">
      {visible && <DeviceScene {...props} />}
    </div>
  );
}

/** Split text into lines on sentence boundaries for masked reveal */
function splitIntoLines(text: string): string[] {
  if (text.includes("\n")) {
    return text.split("\n").filter((line) => line.trim().length > 0);
  }
  const sentences = text
    .split(/\.\s+/)
    .map((s, i, arr) => (i < arr.length - 1 ? s + "." : s))
    .filter(Boolean);
  if (sentences.length > 1) return sentences;
  return [text];
}

interface ProjectShowcaseProps {
  projects: Project[];
  className?: string;
  id?: string;
}

export function ProjectShowcase({
  projects,
  className = "",
  id,
}: ProjectShowcaseProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [projectScrollProgress, setProjectScrollProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const prefersReduced = useReducedMotion();

  const displayIndex = activeIndex;
  const activeProject = projects[displayIndex];

  // Buffered device index — lags behind displayIndex so the device swaps
  // only after the fade-out completes (avoids double-flash)
  const [deviceIndex, setDeviceIndex] = useState(displayIndex);
  const [deviceOpacity, setDeviceOpacity] = useState(1);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevDisplayIndexRef = useRef(displayIndex);

  useEffect(() => {
    if (prevDisplayIndexRef.current !== displayIndex) {
      prevDisplayIndexRef.current = displayIndex;
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);

      if (prefersReduced) {
        setDeviceIndex(displayIndex);
        return;
      }

      // 1) Fade out
      setDeviceOpacity(0);
      // 2) After fade-out completes, swap device + fade in
      fadeTimeoutRef.current = setTimeout(() => {
        setDeviceIndex(displayIndex);
        setDeviceOpacity(1);
      }, 150);
    }
    return () => {
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    };
  }, [displayIndex, prefersReduced]);

  const deviceProject = projects[deviceIndex];

  // Preload 3D models + screen textures so they're cached before visible
  useEffect(() => {
    const links: HTMLLinkElement[] = [];
    // Start downloading .glb geometry while the JS bundle loads
    ["/models/iphone.glb", "/models/macbook.glb"].forEach((href) => {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "fetch";
      link.href = href;
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);
      links.push(link);
    });
    projects.forEach((p) => {
      const src = p.screenTexture;
      if (src.endsWith(".mp4") || src.endsWith(".webm")) {
        // Preload video — fetch enough to start playing quickly
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "video";
        link.href = src;
        document.head.appendChild(link);
        links.push(link);
      } else {
        const img = new Image();
        img.src = src;
      }
    });
    return () => { links.forEach((l) => l.remove()); };
  }, [projects]);

  // Detect mobile/tablet — split-screen needs 1024px+ to breathe
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsMobile(mq.matches);
    function handleChange(e: MediaQueryListEvent) {
      setIsMobile(e.matches);
    }
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  // Scroll-driven active index — offset pins tracking to the sticky phase
  // so every project gets equal scroll distance
  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    if (isMobile) return;

    const count = projects.length;
    if (count === 0) return;
    const index = Math.max(
      0,
      Math.min(Math.floor(progress * count), count - 1)
    );
    setActiveIndex(index);

    // Per-project progress within its scroll slot
    const slotSize = 1 / count;
    const slotProgress = (progress - index * slotSize) / slotSize;
    setProjectScrollProgress(Math.max(0, Math.min(1, slotProgress)));
  });

  // Mobile carousel navigation
  const [mobileIndex, setMobileIndex] = useState(0);
  const mobileProject = projects[mobileIndex];

  // Mobile device fade — mirrors desktop buffer so 3D transitions are smooth
  const prevMobileIndexRef = useRef(mobileIndex);
  useEffect(() => {
    if (!isMobile) return;
    if (prevMobileIndexRef.current === mobileIndex) return;
    prevMobileIndexRef.current = mobileIndex;
    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    if (prefersReduced) {
      setDeviceIndex(mobileIndex);
      return;
    }
    setDeviceOpacity(0);
    fadeTimeoutRef.current = setTimeout(() => {
      setDeviceIndex(mobileIndex);
      setDeviceOpacity(1);
    }, 300);
  }, [isMobile, mobileIndex, prefersReduced]);

  const goToProject = useCallback(
    (index: number) => {
      setMobileIndex(
        ((index % projects.length) + projects.length) % projects.length
      );
    },
    [projects.length]
  );

  const [swipeDirection, setSwipeDirection] = useState<1 | -1>(1);
  const pointerStartX = useRef(0);
  const isDraggingRef = useRef(false);
  const currentDragX = useRef(0);
  const isSwipeAnimatingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  function handlePointerDown(e: React.PointerEvent) {
    if (isSwipeAnimatingRef.current) return;
    pointerStartX.current = e.clientX;
    currentDragX.current = 0;
    isDraggingRef.current = true;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDraggingRef.current) return;
    currentDragX.current = e.clientX - pointerStartX.current;
  }

  function handlePointerUp() {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const offset = currentDragX.current;
    const THRESHOLD = 50;

    if (Math.abs(offset) < THRESHOLD) return;

    isSwipeAnimatingRef.current = true;
    const goingLeft = offset < 0;
    const direction: 1 | -1 = goingLeft ? 1 : -1;

    setSwipeDirection(direction);
    goToProject(mobileIndex + (goingLeft ? 1 : -1));

    // Allow next swipe after transition settles
    setTimeout(() => {
      if (isMountedRef.current) {
        isSwipeAnimatingRef.current = false;
      }
    }, 300);
  }

  function handlePointerCancel() {
    isDraggingRef.current = false;
  }

  // Mobile / tablet — full-screen single-device carousel
  if (isMobile) {
    return (
      <section id={id} className={`${className}`}>
        <div className="flex h-dvh flex-col bg-[var(--surface)]">
          {/* 3D Device — fills upper portion, swipeable */}
          <div
            className="relative min-h-0 flex-1 overflow-hidden touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            <div
              className="h-full w-full"
              style={{
                opacity: deviceOpacity,
                transition: "opacity 300ms var(--ease-out)",
              }}
            >
              <DeviceScene
                deviceType={deviceProject.deviceType}
                screenTexture={deviceProject.screenTexture}
                scrollProgress={0}
                isActive={true}
                projectSlug={deviceProject.slug}
                modelScale={0.85}
                screenBgColor={deviceProject.screenBgColor}
                screenTextureScale={deviceProject.screenTextureScale}
              />
            </div>
          </div>

          {/* Dot indicators */}
          <div className="flex shrink-0 items-center justify-center gap-[var(--space-sm)] py-[var(--space-sm)]">
            {projects.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  if (isSwipeAnimatingRef.current) return;
                  goToProject(i);
                }}
                aria-label={`Go to project ${i + 1}`}
                className="block rounded-full transition-all"
                style={{
                  width: mobileIndex === i ? 20 : 6,
                  height: 6,
                  backgroundColor:
                    mobileIndex === i
                      ? "var(--accent)"
                      : "var(--border-visible)",
                  borderRadius: "var(--radius-pill)",
                  transitionDuration: "var(--duration-transition)",
                  transitionTimingFunction: "var(--ease-out)",
                }}
              />
            ))}
          </div>

          {/* Project info — grid stacking sizes to tallest project, preventing layout shift */}
          <div className="shrink-0 grid overflow-hidden">
            {/* Invisible spacers — all projects in same grid cell establish max height */}
            {projects.map((p) => (
              <div
                key={`spacer-${p.slug}`}
                className="invisible pointer-events-none [grid-area:1/1] px-[var(--space-md)] pb-[var(--space-lg)] pt-[var(--space-xs)]"
                aria-hidden="true"
              >
                <div className="mb-[var(--space-xs)] flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.08em]">&nbsp;</span>
                  <StatusBadge status={p.status} />
                </div>
                <h3 className="mb-[var(--space-xs)] font-sans text-[var(--heading)] leading-[1.2] tracking-[-0.01em]">{p.name}</h3>
                <p className="mb-[var(--space-sm)] font-sans text-[var(--body-sm)] leading-[1.5]">{p.description}</p>
                <div className="mb-[var(--space-sm)] flex flex-wrap gap-[var(--space-xs)]">
                  {p.tags.map((tag) => (
                    <TagChip key={tag}>{tag}</TagChip>
                  ))}
                </div>
                <span className="font-mono text-[13px] uppercase tracking-[0.06em]">&nbsp;</span>
              </div>
            ))}

            {/* Visible animated content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={mobileProject.slug}
                initial={prefersReduced ? { opacity: 1 } : { opacity: 0, x: swipeDirection * 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReduced ? { opacity: 1 } : { opacity: 0, x: swipeDirection * -20 }}
                transition={{
                  duration: prefersReduced ? 0 : DURATION.transition,
                  ease: EASE_OUT_MOTION,
                }}
                className="[grid-area:1/1] px-[var(--space-md)] pb-[var(--space-lg)] pt-[var(--space-xs)]"
              >
                {/* Issue number + status */}
                <div className="mb-[var(--space-xs)] flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
                    ISSUE {String(mobileProject.issueNumber).padStart(2, "0")}
                  </span>
                  <StatusBadge status={mobileProject.status} />
                </div>

                {/* Name */}
                <h3 className="mb-[var(--space-xs)] font-sans text-[var(--heading)] leading-[1.2] tracking-[-0.01em] text-[var(--text-display)]">
                  {mobileProject.name}
                </h3>

                {/* Description */}
                <p className="mb-[var(--space-sm)] font-sans text-[var(--body-sm)] leading-[1.5] text-[var(--text-secondary)]">
                  {mobileProject.description}
                </p>

                {/* Tags */}
                <div className="mb-[var(--space-sm)] flex flex-wrap gap-[var(--space-xs)]">
                  {mobileProject.tags.map((tag) => (
                    <TagChip key={tag}>{tag}</TagChip>
                  ))}
                </div>

                {/* View link */}
                <TransitionLink
                  href={`/projects/${mobileProject.slug}`}
                  className="no-underline"
                >
                  <span className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)]">
                    View project →
                  </span>
                </TransitionLink>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>
    );
  }

  // Desktop: split-screen scroll lock
  return (
    <section id={id} className={className}>
      {/* Scroll region */}
      <div
        ref={outerRef}
        style={{ height: `calc(100vh * ${projects.length})` }}
      >
        {/* Sticky frame */}
        <div className="sticky top-0 flex h-screen w-full items-stretch bg-[var(--surface)]">
          {/* Left column — Project index */}
          <div className="flex w-[40%] flex-col items-start justify-center pl-[var(--space-4xl)]">
            <h2 className="mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
              FEATURED PROJECTS
            </h2>
            {projects.map((project, i) => {
              const isActive = displayIndex === i;
              return (
                <TransitionLink
                  key={project.slug}
                  href={`/projects/${project.slug}`}
                  className="group relative block py-[12px] no-underline"
                >
                  {/* Accent bar */}
                  <div
                    className="absolute left-[-16px] top-[12px] bottom-[12px] w-[2px]"
                    style={{
                      backgroundColor: "var(--accent)",
                      opacity: isActive ? 1 : 0,
                      transition: prefersReduced
                        ? "none"
                        : `opacity ${DURATION.transition}s var(--ease-out)`,
                    }}
                  />
                  {/* Issue number + name */}
                  <div className="flex items-baseline gap-[var(--space-md)]">
                    <span
                      className="font-mono text-[11px] uppercase tracking-[0.08em]"
                      style={{
                        color: "var(--text-disabled)",
                        transition: prefersReduced
                          ? "none"
                          : `color ${DURATION.transition}s var(--ease-out)`,
                      }}
                    >
                      {String(project.issueNumber).padStart(2, "0")}
                    </span>
                    <span
                      className="font-sans text-[28px] leading-tight"
                      style={{
                        color: isActive
                          ? "var(--text-display)"
                          : "var(--text-disabled)",
                        transition: prefersReduced
                          ? "none"
                          : `color ${DURATION.transition}s var(--ease-out)`,
                      }}
                    >
                      {project.name}
                    </span>
                  </div>
                </TransitionLink>
              );
            })}
          </div>

          {/* Divider */}
          <div
            className="w-px self-stretch"
            style={{ backgroundColor: "var(--border)" }}
          />

          {/* Right column — Detail panel (entire panel is a click target) */}
          <TransitionLink
            href={`/projects/${activeProject.slug}`}
            className="flex w-[60%] flex-col justify-center pl-[var(--space-3xl)] pr-[var(--space-4xl)] no-underline"
          >
            {/* 3D Device — CSS opacity fade masks instant swap */}
            <div
              className="relative h-[55%] w-full"
              style={{
                opacity: deviceOpacity,
                transition: `opacity 150ms var(--ease-out)`,
              }}
            >
              <DeviceScene
                deviceType={deviceProject.deviceType}
                screenTexture={deviceProject.screenTexture}
                scrollProgress={projectScrollProgress}
                isActive={true}
                projectSlug={deviceProject.slug}
                screenBgColor={deviceProject.screenBgColor}
                screenTextureScale={deviceProject.screenTextureScale}
              />
            </div>

            {/* Text content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeProject.slug}
                initial={prefersReduced ? { opacity: 1 } : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={prefersReduced ? { opacity: 1 } : { opacity: 0 }}
                transition={{
                  duration: prefersReduced ? 0 : DURATION.micro,
                  ease: EASE_OUT_MOTION,
                }}
                className="max-w-[480px]"
              >
                {/* Status badge — fade up */}
                <motion.div
                  className="mb-[var(--space-lg)]"
                  initial={prefersReduced ? {} : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: prefersReduced ? 0 : DURATION.transition,
                    ease: EASE_OUT_MOTION,
                    delay: prefersReduced ? 0 : 0.05,
                  }}
                >
                  <StatusBadge status={activeProject.status} />
                </motion.div>

                {/* Description — masked line split reveal */}
                <div className="mb-[var(--space-lg)] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
                  {splitIntoLines(activeProject.description).map((line, i) => (
                    <span
                      key={`${activeProject.slug}-line-${i}`}
                      style={{ display: "block", overflow: "hidden" }}
                    >
                      <motion.span
                        style={{ display: "block" }}
                        initial={prefersReduced ? {} : { y: "120%" }}
                        animate={{ y: 0 }}
                        transition={{
                          duration: prefersReduced ? 0 : 0.5,
                          ease: EASE_OUT_MOTION,
                          delay: prefersReduced ? 0 : 0.1 + i * 0.1,
                        }}
                      >
                        {line}
                      </motion.span>
                    </span>
                  ))}
                </div>

                {/* Tags — staggered fade up */}
                <div className="mb-[var(--space-2xl)] flex flex-wrap gap-[var(--space-sm)]">
                  {activeProject.tags.map((tag, i) => (
                    <motion.div
                      key={tag}
                      initial={prefersReduced ? {} : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: prefersReduced ? 0 : DURATION.transition,
                        ease: EASE_OUT_MOTION,
                        delay: prefersReduced
                          ? 0
                          : 0.1 + splitIntoLines(activeProject.description).length * 0.1 + i * 0.05,
                      }}
                    >
                      <TagChip>{tag}</TagChip>
                    </motion.div>
                  ))}
                </div>

                {/* View link — fade up after tags */}
                <motion.div
                  initial={prefersReduced ? {} : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: prefersReduced ? 0 : DURATION.transition,
                    ease: EASE_OUT_MOTION,
                    delay: prefersReduced
                      ? 0
                      : 0.1
                        + splitIntoLines(activeProject.description).length * 0.1
                        + activeProject.tags.length * 0.05
                        + 0.05,
                  }}
                >
                  <span className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)]">
                    View project →
                  </span>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </TransitionLink>
        </div>
      </div>
    </section>
  );
}
