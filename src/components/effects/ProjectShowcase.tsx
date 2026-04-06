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
import type { Project } from "@/data/projects";

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
  const [isMobile, setIsMobile] = useState(false);
  const prefersReduced = useReducedMotion();

  const displayIndex = hoverIndex ?? activeIndex;
  const activeProject = projects[displayIndex];

  // Detect mobile
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
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
  });

  const handleRowHover = useCallback((index: number) => {
    setHoverIndex(index);
  }, []);

  const handleRowLeave = useCallback(() => {
    setHoverIndex(null);
  }, []);

  // Mobile fallback
  if (isMobile) {
    return (
      <section className={`px-[var(--space-lg)] mb-[var(--space-4xl)] ${className}`}>
        <div className="mx-auto max-w-[960px]">
          <ScrollLetterAnimation
            as="h2"
            className="mb-[var(--space-2xl)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]"
          >
            FEATURED PROJECTS
          </ScrollLetterAnimation>
          <ScrollGridAnimation className="grid gap-[var(--space-md)]">
            {projects.map((project) => (
              <LinkHover
                key={project.slug}
                href={`/projects/${project.slug}`}
                className="block no-underline"
              >
                <ProjectCard
                  issueNumber={project.issueNumber}
                  name={project.name}
                  description={project.description}
                  tags={project.tags}
                  status={project.status}
                />
              </LinkHover>
            ))}
          </ScrollGridAnimation>
        </div>
      </section>
    );
  }

  // Desktop: split-screen scroll lock
  return (
    <section className={className}>
      {/* Section header — constrained width */}
      <div className="mx-auto max-w-[960px] px-[var(--space-lg)]">
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
          <div className="flex w-[60%] items-center pl-[var(--space-3xl)] pr-[var(--space-4xl)]">
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
