import type { Metadata } from "next";
import {
  ScrollLetterAnimation,
  WorkPlayShowcase,
} from "@/components/effects";
import { projects } from "@/data/projects";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Things I've built — from iOS apps to trading bots to AI automation systems",
};

const WORK_SLUGS = new Set([
  "trailmix",
  "vendor-fingerprint",
  "web-tracker-scanner",
  "semrush-enricher",
]);

const workProjects = projects.filter((p) => WORK_SLUGS.has(p.slug));
const playProjects = projects.filter((p) => !WORK_SLUGS.has(p.slug));

export default function ProjectsPage() {
  return (
    <main className="mx-auto max-w-[960px] px-[var(--space-md)] md:px-[var(--space-lg)] pt-[80px] pb-[var(--space-2xl)] md:py-[var(--space-4xl)]">
      <section className="mb-[var(--space-3xl)]">
        <ScrollLetterAnimation
          as="h1"
          className="font-sans text-[clamp(36px,8vw,72px)] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]"
        >
          PROJECTS
        </ScrollLetterAnimation>
      </section>

      <div className="mb-[var(--space-2xl)] md:mb-[var(--space-4xl)]">
        <WorkPlayShowcase work={workProjects} play={playProjects} />
      </div>
    </main>
  );
}
