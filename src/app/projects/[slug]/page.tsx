import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { StatusBadge, TagChip, ScrollTextLines } from "@/components/ui";
import {
  ScrollLetterAnimation,
  ScrollGridAnimation,
  LinkHover,
} from "@/components/effects";
import { projects, getProjectBySlug } from "@/data/projects";

interface ProjectDetailProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: ProjectDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) return {};

  return {
    title: project.name,
    description: project.description,
  };
}

export default async function ProjectDetailPage({ params }: ProjectDetailProps) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) notFound();

  return (
    <main className="mx-auto max-w-[960px] px-[var(--space-md)] md:px-[var(--space-lg)] pt-[80px] pb-[var(--space-2xl)] md:py-[var(--space-4xl)]">
      {/* Header */}
      <section className="mb-[var(--space-2xl)]">
        <p className="mb-[var(--space-md)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          ISSUE {String(project.issueNumber).padStart(2, "0")}
        </p>
        <ScrollLetterAnimation
          as="h1"
          className="mb-[var(--space-lg)] font-sans text-[clamp(36px,8vw,72px)] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]"
        >
          {project.name}
        </ScrollLetterAnimation>
        <div className="flex flex-wrap items-center gap-[var(--space-md)]">
          <StatusBadge status={project.status} />
          {project.tags.map((tag) => (
            <TagChip key={tag}>{tag}</TagChip>
          ))}
        </div>
      </section>

      {/* Description */}
      <section className="mb-[var(--space-3xl)]">
        <ScrollTextLines className="max-w-[640px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
          {project.longDescription}
        </ScrollTextLines>
      </section>

      {/* Links */}
      {project.links.length > 0 && (
        <section className="mb-[var(--space-3xl)]">
          <p className="mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
            LINKS
          </p>
          <div className="flex flex-wrap gap-[var(--space-lg)]">
            {project.links.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-block font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                style={{
                  transitionDuration: "var(--duration-micro)",
                  transitionTimingFunction: "var(--ease-out)",
                }}
              >
                {link.label} ↗
                <span
                  className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-[var(--text-primary)] transition-transform group-hover:scale-x-100"
                  style={{
                    transitionDuration: "var(--duration-transition)",
                    transitionTimingFunction: "var(--ease-out)",
                  }}
                />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Video + Screenshots */}
      {(project.video || project.images.length > 0) && (
        <section className="mb-[var(--space-3xl)]">
          <p className="mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
            SCREENSHOTS
          </p>

          {/* Hero video */}
          {project.video && (
            <div
              className={`mx-auto mb-[var(--space-md)] overflow-hidden border border-[var(--border)] bg-[var(--surface-raised)] ${project.deviceType === "phone" ? "max-w-[50%]" : ""}`}
              style={{ borderRadius: "var(--radius-card)" }}
            >
              <video
                src={project.video}
                autoPlay
                loop
                muted
                playsInline
                className="block w-full"
              />
            </div>
          )}
          <ScrollGridAnimation
            variant="fade-up"
            className={`mx-auto grid grid-cols-1 gap-[var(--space-md)] ${project.images.length % 2 === 0 && project.images.length >= 2 && project.deviceType !== "phone" ? "sm:grid-cols-2" : ""} ${project.deviceType === "phone" ? "max-w-[50%]" : ""}`}
          >
            {project.images.map((src, i) => (
              <div
                key={i}
                className="overflow-hidden border border-[var(--border)] bg-[var(--surface-raised)]"
                style={{ borderRadius: "var(--radius-card)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`${project.name} screenshot ${i + 1}`}
                  className="block w-full"
                />
              </div>
            ))}
          </ScrollGridAnimation>
        </section>
      )}

      {/* Back */}
      <LinkHover
        href="/projects"
        className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)]"
      >
        ← All projects
      </LinkHover>
    </main>
  );
}
