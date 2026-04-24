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

      {/* Context / Build / Result */}
      <section className="mb-[var(--space-3xl)]">
        <p className="mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          CONTEXT
        </p>
        <ScrollTextLines className="max-w-[640px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
          {project.context}
        </ScrollTextLines>
      </section>

      <section className="mb-[var(--space-3xl)]">
        <p className="mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          BUILD
        </p>
        <ScrollTextLines className="max-w-[640px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
          {project.build}
        </ScrollTextLines>
      </section>

      <section className="mb-[var(--space-3xl)]">
        <p className="mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          RESULT
        </p>
        <ScrollTextLines className="max-w-[640px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
          {project.result}
        </ScrollTextLines>
      </section>

      {/* Links */}
      {project.links.length > 0 && (
        <section className="mb-[var(--space-3xl)]">
          <p className="mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
            LINKS
          </p>
          <div className="flex flex-wrap gap-[var(--space-md)]">
            {project.links.map((link) => {
              const isGithub = link.url.includes("github.com");
              const isAppStore = link.label.toLowerCase().includes("app store");
              let domain: string;
              try {
                domain = new URL(link.url).hostname.replace("www.", "");
              } catch {
                domain = link.url;
              }

              return (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-[var(--space-md)] border border-[var(--border)] bg-[var(--surface-raised)] px-[var(--space-lg)] py-[var(--space-md)] transition-[border-color] hover:border-[var(--border-visible)]"
                  style={{
                    borderRadius: "var(--radius-compact)",
                    transitionDuration: "var(--duration-transition)",
                    transitionTimingFunction: "var(--ease-out)",
                  }}
                >
                  {/* Icon */}
                  <span className="text-[var(--text-disabled)] transition-colors group-hover:text-[var(--text-secondary)]">
                    {isGithub ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                        <path d="M9 18c-4.51 2-5-2-7-2" />
                      </svg>
                    ) : isAppStore ? (
                      <Image
                        src="/icons/apple-logo.png"
                        alt="Apple"
                        width={20}
                        height={20}
                        className="invert opacity-40 transition-opacity group-hover:opacity-60"
                      />
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        <path d="M2 12h20" />
                      </svg>
                    )}
                  </span>

                  {/* Label + domain */}
                  <div className="flex flex-col gap-[var(--space-2xs)]">
                    <span className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-primary)] transition-colors group-hover:text-[var(--text-display)]">
                      {link.label}
                    </span>
                    <span className="font-mono text-[11px] tracking-[0.04em] text-[var(--text-disabled)]">
                      {domain}
                    </span>
                  </div>

                  {/* Arrow */}
                  <span
                    className="ml-[var(--space-md)] font-mono text-[13px] text-[var(--text-disabled)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--text-secondary)]"
                    style={{
                      transitionDuration: "var(--duration-transition)",
                      transitionTimingFunction: "var(--ease-out)",
                    }}
                  >
                    ↗
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* Video + Screenshots */}
      {(project.video || (project.videos && project.videos.length > 0) || project.images.length > 0) && (
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

          {/* Video gallery */}
          {project.videos && project.videos.length > 0 && (
            <ScrollGridAnimation
              variant="fade-up"
              className={`mx-auto grid grid-cols-1 gap-[var(--space-md)] ${project.images.length > 0 ? "mb-[var(--space-md)]" : ""} ${project.deviceType === "phone" ? "max-w-[50%]" : ""}`}
            >
              {project.videos.map((src, i) => (
                <div
                  key={src}
                  className="overflow-hidden border border-[var(--border)] bg-[var(--surface-raised)]"
                  style={{ borderRadius: "var(--radius-card)" }}
                >
                  <video
                    src={src}
                    autoPlay
                    loop
                    muted
                    playsInline
                    aria-label={`${project.name} screen recording ${i + 1}`}
                    className="block w-full"
                  />
                </div>
              ))}
            </ScrollGridAnimation>
          )}

          {project.images.length > 0 && (
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
          )}
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
