import {
  Button,
  GitHubCard,
  ProjectCard,
  ScrollTextLines,
  SplitTextScatter,
  TickerText,
  UsageCard,
} from "@/components/ui";
import {
  ScrollLetterAnimation,
  ScrollGridAnimation,
  MagneticWrapper,
  LinkHover,
} from "@/components/effects";
import { projects } from "@/data/projects";

export default function Home() {
  const featured = projects.slice(0, 3);

  return (
    <main className="mx-auto max-w-[960px] px-[var(--space-lg)] py-[var(--space-4xl)]">
      {/* Hero */}
      <section className="mb-[var(--space-3xl)]">
        <SplitTextScatter
          text="MAZZA BUILDS"
          className="font-sans text-[clamp(48px,12vw,96px)] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]"
        />
      </section>

      {/* Subtitle */}
      <section className="mb-[var(--space-2xl)]">
        <ScrollLetterAnimation
          as="h2"
          className="font-sans text-[clamp(18px,3vw,24px)] leading-[1.3] tracking-[-0.01em] text-[var(--text-secondary)]"
        >
          Solo indie developer
        </ScrollLetterAnimation>
      </section>

      {/* Ticker */}
      <section className="-mx-[var(--space-lg)] mb-[var(--space-3xl)]">
        <TickerText
          items={["IOS APPS", "SHOPIFY TOOLS", "AI PIPELINES", "VIDEO AUTOMATION", "WEB APPS", "CONTENT SYSTEMS"]}
        />
      </section>

      {/* Intro */}
      <section className="mb-[var(--space-4xl)]">
        <ScrollTextLines className="max-w-[480px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
          I&apos;m Alex Mazza, a solo indie developer who builds things from concept to production. I care about clean interfaces, thoughtful systems, and shipping work that holds up.
        </ScrollTextLines>
      </section>

      {/* Featured Projects */}
      <section className="mb-[var(--space-4xl)]">
        <ScrollLetterAnimation
          as="h2"
          className="mb-[var(--space-2xl)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]"
        >
          FEATURED PROJECTS
        </ScrollLetterAnimation>
        <ScrollGridAnimation className="grid gap-[var(--space-md)]">
          {featured.map((project) => (
            <LinkHover key={project.slug} href={`/projects/${project.slug}`} className="block no-underline">
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
      </section>

      {/* Activity */}
      <section className="mb-[var(--space-4xl)]">
        <ScrollGridAnimation className="grid gap-[var(--space-lg)]" stagger={0.15}>
          <UsageCard />
          <GitHubCard />
        </ScrollGridAnimation>
      </section>

      {/* CTA */}
      <section className="flex justify-center">
        <MagneticWrapper>
          <LinkHover href="/contact" className="no-underline">
            <Button>Get in touch</Button>
          </LinkHover>
        </MagneticWrapper>
      </section>
    </main>
  );
}
