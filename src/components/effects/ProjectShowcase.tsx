"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  motion,
  useScroll,
  useMotionValueEvent,
  AnimatePresence,
  useReducedMotion,
  useAnimation,
} from "motion/react";
import { DURATION, EASE_OUT_MOTION, SPRING_SNAPPY } from "@/lib/motion";
import { StatusBadge, TagChip, ProjectCard } from "@/components/ui";
import {
  ScrollLetterAnimation,
  ScrollGridAnimation,
  LinkHover,
} from "@/components/effects";
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
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [projectScrollProgress, setProjectScrollProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const prefersReduced = useReducedMotion();

  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayIndex = hoverIndex ?? activeIndex;
  const activeProject = projects[displayIndex];

  // Preload all project screen textures so they're cached before hover/scroll
  useEffect(() => {
    const links: HTMLLinkElement[] = [];
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

    // Scroll is authoritative — clear any hover override so the display
    // tracks the scroll position.  pointermove will re-set hover if the
    // user is actively moving the mouse.
    if (hoverIndex !== null) {
      setHoverIndex(null);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    }

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

  // pointermove (not mouseenter) — only fires on real mouse movement,
  // never from elements scrolling under a stationary cursor
  const handleRowPointerMove = useCallback((index: number) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoverIndex((prev) => (prev === index ? prev : index));
  }, []);

  const handleRowPointerLeave = useCallback(() => {
    // Small debounce prevents flicker when moving between rows
    hoverTimeoutRef.current = setTimeout(() => {
      setHoverIndex(null);
    }, 80);
  }, []);

  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // Mobile carousel navigation
  const [mobileIndex, setMobileIndex] = useState(0);
  const mobileProject = projects[mobileIndex];

  const goToProject = useCallback(
    (index: number) => {
      setMobileIndex(
        ((index % projects.length) + projects.length) % projects.length
      );
    },
    [projects.length]
  );

  const [swipeDirection, setSwipeDirection] = useState<1 | -1>(1);
  const carouselControls = useAnimation();
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
    const offset = e.clientX - pointerStartX.current;
    currentDragX.current = offset;
    carouselControls.set({ x: offset * 0.25 });
  }

  async function handlePointerUp() {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const offset = currentDragX.current;
    const THRESHOLD = 50;

    if (Math.abs(offset) < THRESHOLD) {
      carouselControls.start({ x: 0, transition: SPRING_SNAPPY });
      return;
    }

    isSwipeAnimatingRef.current = true;
    const goingLeft = offset < 0;
    const exitX = goingLeft ? -400 : 400;
    const enterFromX = goingLeft ? 400 : -400;
    const direction: 1 | -1 = goingLeft ? 1 : -1;

    setSwipeDirection(direction);

    await carouselControls.start({
      x: exitX,
      transition: { duration: 0.2, ease: EASE_OUT_MOTION },
    });

    if (!isMountedRef.current) return;

    goToProject(mobileIndex + (goingLeft ? 1 : -1));
    carouselControls.set({ x: enterFromX });

    await carouselControls.start({
      x: 0,
      transition: { duration: 0.25, ease: EASE_OUT_MOTION },
    });

    if (!isMountedRef.current) return;

    isSwipeAnimatingRef.current = false;
  }

  function handlePointerCancel() {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    carouselControls.start({ x: 0, transition: SPRING_SNAPPY });
  }

  // Mobile / tablet — full-screen single-device carousel
  if (isMobile) {
    return (
      <section id={id} className={`${className}`}>
        <div className="flex h-dvh flex-col bg-[var(--surface)]">
          {/* 3D Device — fills upper portion, swipeable */}
          <motion.div
            className="relative min-h-0 flex-1 overflow-hidden touch-none"
            animate={carouselControls}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            <DeviceScene
              deviceType={mobileProject.deviceType}
              screenTexture={mobileProject.screenTexture}
              scrollProgress={0}
              isActive={true}
              projectSlug={mobileProject.slug}
              modelScale={0.85}
            />
          </motion.div>

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

          {/* Project info — compact, pinned to bottom */}
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
              className="shrink-0 px-[var(--space-md)] pb-[var(--space-lg)] pt-[var(--space-xs)]"
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
      </section>
    );
  }

  // Desktop: split-screen scroll lock
  return (
    <section id={id} className={className}>
      {/* Section header — constrained width */}
      <div className="mx-auto max-w-[960px] px-[var(--space-md)] md:px-[var(--space-lg)]">
        <ScrollLetterAnimation
          as="h2"
          className="mb-[var(--space-2xl)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]"
        >
          FEATURED PROJECTS
        </ScrollLetterAnimation>
      </div>

      {/* Scroll region */}
      <div
        ref={outerRef}
        style={{ height: `calc(100vh * ${projects.length})` }}
      >
        {/* Sticky frame */}
        <div className="sticky top-0 flex h-screen w-full items-stretch bg-[var(--surface)]">
          {/* Left column — Project index */}
          <div className="flex w-[40%] flex-col items-start justify-center pl-[var(--space-4xl)]">
            {projects.map((project, i) => {
              const isActive = displayIndex === i;
              return (
                <TransitionLink
                  key={project.slug}
                  href={`/projects/${project.slug}`}
                  className="group relative block py-[12px] no-underline"
                  onPointerMove={() => handleRowPointerMove(i)}
                  onPointerLeave={handleRowPointerLeave}
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

          {/* Right column — Detail panel */}
          <div className="flex w-[60%] flex-col justify-center pl-[var(--space-3xl)] pr-[var(--space-4xl)]">
            {/* 3D Device — persistent canvas, cross-fades between device types */}
            <div className="relative h-[55%] w-full">
              <DeviceScene
                deviceType={activeProject.deviceType}
                screenTexture={activeProject.screenTexture}
                scrollProgress={projectScrollProgress}
                isActive={true}
                projectSlug={activeProject.slug}
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
                  <LinkHover
                    href={`/projects/${activeProject.slug}`}
                    className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)]"
                  >
                    View project →
                  </LinkHover>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
