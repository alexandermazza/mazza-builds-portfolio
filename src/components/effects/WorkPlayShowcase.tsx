import { ProjectCard } from "@/components/ui";
import { ConnectedGrid } from "./ConnectedGrid";
import { LinkHover } from "./LinkHover";
import type { Project } from "@/data/projects";

interface WorkPlayShowcaseProps {
  work: Project[];
  play: Project[];
}

/**
 * Two-column Work/Play showcase.
 *
 * Desktop: side-by-side columns with centered static headers.
 * Mobile:  stacked columns. Each section's <h2> is `position: sticky top-0`
 *          so it freezes at the top of the viewport while its projects scroll
 *          past. When the user scrolls past the end of a section, its header
 *          naturally releases and the next section's sticky header takes over.
 *
 * No JS / no refs / no scroll listeners — pure CSS sticky is the most
 * reliable way to guarantee the "freeze" behavior.
 */
export function WorkPlayShowcase({ work, play }: WorkPlayShowcaseProps) {
  return (
    <>
      {/*
        Mobile-only opaque backdrop behind the fixed MENU button.
        Occludes project cards scrolling past the top 80px so they don't
        bleed through between the button and the sticky column header.
      */}
      <div
        aria-hidden="true"
        className="md:hidden fixed inset-x-0 top-0 h-[64px] z-10 bg-[var(--black)] pointer-events-none"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 md:gap-[var(--space-2xl)]">
        <Column title="Work" items={work} variant="work" isFirst />
        <Column title="Play" items={play} variant="play" />
      </div>
    </>
  );
}

function Column({
  title,
  items,
  variant,
  isFirst = false,
}: {
  title: string;
  items: Project[];
  variant: "work" | "play";
  isFirst?: boolean;
}) {
  const typeClass =
    variant === "work"
      ? "font-mono uppercase tracking-[0.08em] text-[clamp(28px,3.4vw,40px)]"
      : "font-script italic text-[clamp(34px,4.2vw,50px)]";

  // On mobile only, add bottom padding to the first section so the sticky
  // header stays stuck through the inter-section space and hands off cleanly
  // to the next section's sticky header.
  const sectionPadding = isFirst ? "pb-[var(--space-2xl)] md:pb-0" : "";

  return (
    <section className={sectionPadding}>
      <h2
        className={`sticky top-[64px] md:static md:top-auto z-20 flex items-end justify-center h-[56px] md:h-[72px] leading-none text-[var(--text-display)] bg-[var(--black)] border-b border-[var(--border-visible)] mb-[var(--space-lg)] pb-[var(--space-sm)] ${typeClass}`}
      >
        {title}
      </h2>
      <ConnectedGrid columns={1} lineColor="var(--text-disabled)">
        {items.map((project) => (
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
      </ConnectedGrid>
    </section>
  );
}
