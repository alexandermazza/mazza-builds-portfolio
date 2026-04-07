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
}

export function ProjectShowcase({
  projects,
  className = "",
}: ProjectShowcaseProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [projectScrollProgress, setProjectScrollProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const prefersReduced = useReducedMotion();

  const displayIndex = hoverIndex ?? activeIndex;
  const activeProject = projects[displayIndex];

  // Preload all project screen textures so they're cached before hover/scroll
  useEffect(() => {
    projects.forEach((p) => {
      const img = new Image();
      img.src = p.screenTexture;
    });
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

  // Scroll-driven active index
  const { scrollYProgress } = useScroll({ target: outerRef });

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    if (isMobile) return;
    const index = Math.min(
      Math.floor(progress * projects.length),
      projects.length - 1
    );
    setActiveIndex(index);

    // Per-project progress within its scroll slot
    const slotSize = 1 / projects.length;
    const slotProgress = (progress - index * slotSize) / slotSize;
    setProjectScrollProgress(Math.max(0, Math.min(1, slotProgress)));
  });

  const handleRowHover = useCallback((index: number) => {
    setHoverIndex(index);
  }, []);

  const handleRowLeave = useCallback(() => {
    setHoverIndex(null);
  }, []);

  // Mobile / tablet — stacked project panels with 3D devices
  if (isMobile) {
    return (
      <section className={`px-[var(--space-md)] md:px-[var(--space-lg)] mb-[var(--space-2xl)] md:mb-[var(--space-4xl)] ${className}`}>
        <div className="mx-auto max-w-[960px]">
          <ScrollLetterAnimation
            as="h2"
            className="mb-[var(--space-lg)] md:mb-[var(--space-2xl)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]"
          >
            FEATURED PROJECTS
          </ScrollLetterAnimation>
          <div className="flex flex-col gap-[var(--space-2xl)]">
            {projects.map((project) => (
              <TransitionLink
                key={project.slug}
                href={`/projects/${project.slug}`}
                className="block no-underline"
              >
                <div
                  className="border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--border-visible)]"
                  style={{
                    borderRadius: "var(--radius-card)",
                    transitionDuration: "var(--duration-micro)",
                    transitionTimingFunction: "var(--ease-out)",
                  }}
                >
                  {/* 3D Device — lazy-mounted to avoid WebGL context limits */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden" style={{ borderRadius: "var(--radius-card) var(--radius-card) 0 0" }}>
                    <LazyDeviceScene
                      deviceType={project.deviceType}
                      screenTexture={project.screenTexture}
                      scrollProgress={0}
                      isActive={true}
                      projectSlug={project.slug}
                    />
                  </div>

                  {/* Project info */}
                  <div className="p-[var(--space-md)] md:p-[var(--space-lg)]">
                    {/* Issue number + status */}
                    <div className="mb-[var(--space-sm)] flex items-center justify-between">
                      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
                        ISSUE {String(project.issueNumber).padStart(2, "0")}
                      </span>
                      <StatusBadge status={project.status} />
                    </div>

                    {/* Name */}
                    <h3 className="mb-[var(--space-sm)] font-sans text-[var(--heading)] leading-[1.2] tracking-[-0.01em] text-[var(--text-display)]">
                      {project.name}
                    </h3>

                    {/* Description */}
                    <p className="mb-[var(--space-md)] font-sans text-[var(--body-sm)] leading-[1.5] text-[var(--text-secondary)]">
                      {project.description}
                    </p>

                    {/* Tags */}
                    <div className="mb-[var(--space-md)] flex flex-wrap gap-[var(--space-sm)]">
                      {project.tags.map((tag) => (
                        <TagChip key={tag}>{tag}</TagChip>
                      ))}
                    </div>

                    {/* View link */}
                    <span className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)]">
                      View project →
                    </span>
                  </div>
                </div>
              </TransitionLink>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Desktop: split-screen scroll lock
  return (
    <section className={className}>
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
                  onMouseEnter={() => handleRowHover(i)}
                  onMouseLeave={handleRowLeave}
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
            {/* 3D Device — persistent canvas, no AnimatePresence remount */}
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
