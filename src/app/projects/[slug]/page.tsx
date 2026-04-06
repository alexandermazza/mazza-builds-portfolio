import { notFound } from "next/navigation";
import { projects, getProjectBySlug } from "@/data/projects";
import { TransitionLink } from "@/transitions";
import { StatusBadge, TagChip } from "@/components/ui";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  const formattedNumber = String(project.issueNumber).padStart(2, "0");

  return (
    <main className="mx-auto max-w-[960px] px-[var(--space-lg)] py-[var(--space-4xl)]">
      {/* Back link */}
      <TransitionLink
        href="/"
        className="mb-[var(--space-2xl)] inline-block font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        ← Back
      </TransitionLink>

      {/* Header */}
      <div className="mb-[var(--space-3xl)]" data-enter="">
        <div className="mb-[var(--space-md)] flex items-center gap-[var(--space-md)]">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
            ISSUE {formattedNumber}
          </span>
          <StatusBadge status={project.status} />
        </div>
        <h1 className="mb-[var(--space-md)] font-sans text-[var(--display-lg)] font-bold leading-[1.1] text-[var(--text-display)]">
          {project.name}
        </h1>
        <div className="flex flex-wrap gap-[var(--space-sm)]">
          {project.tags.map((tag) => (
            <TagChip key={tag}>{tag}</TagChip>
          ))}
        </div>
      </div>

      {/* Hero image placeholder */}
      <div
        className="mb-[var(--space-3xl)] flex items-center justify-center border border-[var(--border)] bg-[var(--surface)]"
        style={{ borderRadius: "var(--radius-card)", aspectRatio: "16/9" }}
        data-enter=""
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          [{project.screenshot}]
        </span>
      </div>

      {/* Description */}
      <div className="mb-[var(--space-3xl)] max-w-[640px]" data-enter="">
        <p className="font-sans text-[var(--body)] leading-[1.7] text-[var(--text-secondary)]">
          {project.longDescription}
        </p>
      </div>

      {/* Image gallery placeholders */}
      <div className="mb-[var(--space-3xl)]" data-enter="">
        <p className="mb-[var(--space-md)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
          SCREENS
        </p>
        <div className="grid grid-cols-3 gap-[var(--space-md)]">
          {project.images.map((img) => (
            <div
              key={img}
              className="flex items-center justify-center border border-[var(--border)] bg-[var(--surface)]"
              style={{
                borderRadius: "var(--radius-compact)",
                aspectRatio: "9/16",
              }}
            >
              <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
                [{img.split("/").pop()}]
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Links */}
      <div data-enter="">
        <p className="mb-[var(--space-md)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
          LINKS
        </p>
        <div className="flex gap-[var(--space-lg)]">
          {project.links.map((link) => (
            <a
              key={link.label}
              href={link.url}
              className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--accent)] hover:brightness-110"
            >
              {link.label} →
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
