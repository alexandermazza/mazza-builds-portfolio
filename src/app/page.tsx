import {
  Button,
  GitHubCard,
  ProjectCard,
  ScrollTextLines,
  TickerText,
  UsageCard,
} from "@/components/ui";
import {
  OscilloscopeHero,
  ScrollLetterAnimation,
  ScrollGridAnimation,
  MagneticWrapper,
  LinkHover,
} from "@/components/effects";
import { projects } from "@/data/projects";

export default function Home() {
  const featured = projects.slice(0, 3);

  return (
    <main>
      {/* Hero — scroll-pinned oscilloscope */}
      <OscilloscopeHero text="MAZZA BUILDS" />

      {/* Content after pin releases */}
      <div className="mx-auto max-w-[960px] px-[var(--space-lg)] py-[var(--space-4xl)]">
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
          <ScrollGridAnimation className="grid grid-cols-1 gap-[var(--space-md)] md:grid-cols-2" stagger={0.15}>
            <UsageCard compact />
            <GitHubCard compact />
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
      </div>
    </main>
  );
}
