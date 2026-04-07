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
    <main className="mx-auto max-w-[960px] px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-2xl)] md:py-[var(--space-4xl)]">
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

      {/* Screenshots */}
      {project.images.length > 0 && (
        <section className="mb-[var(--space-3xl)]">
          <p className="mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
            SCREENSHOTS
          </p>
          <ScrollGridAnimation
            variant="fade-up"
            className="grid grid-cols-1 gap-[var(--space-md)] sm:grid-cols-2"
          >
            {project.images.map((src, i) => (
              <div
                key={i}
                className="relative aspect-[16/10] overflow-hidden border border-[var(--border)] bg-[var(--surface-raised)]"
                style={{ borderRadius: "var(--radius-card)" }}
              >
                <Image
                  src={src}
                  alt={`${project.name} screenshot ${i + 1}`}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover"
                  {...(i === 0 ? { priority: true } : {})}
                />
                {/* Placeholder overlay — remove when real images are added */}
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface-raised)]">
                  <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
                    [SCREENSHOT {String(i + 1).padStart(2, "0")}]
                  </span>
                </div>
              </div>
            ))}
          </ScrollGridAnimation>
        </section>
      )}

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
