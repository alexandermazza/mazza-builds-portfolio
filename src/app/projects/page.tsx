import { ProjectCard } from "@/components/ui";
import {
  ScrollLetterAnimation,
  ConnectedGrid,
  ScrollVelocityOffset,
  LinkHover,
} from "@/components/effects";
import { projects } from "@/data/projects";

export default function ProjectsPage() {
  return (
    <main className="mx-auto max-w-[960px] px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-2xl)] md:py-[var(--space-4xl)]">
      <section className="mb-[var(--space-3xl)]">
        <ScrollLetterAnimation
          as="h1"
          className="font-sans text-[clamp(36px,8vw,72px)] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]"
        >
          PROJECTS
        </ScrollLetterAnimation>
      </section>

      <ScrollVelocityOffset multiplier={0.15}>
        <ConnectedGrid columns={2} lineColor="var(--text-disabled)" className="mb-[var(--space-2xl)] md:mb-[var(--space-4xl)]">
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
        </ConnectedGrid>
      </ScrollVelocityOffset>
    </main>
  );
}
