import {
  Button,
  GitHubCard,
  ScrollTextLines,
  TickerText,
  UsageCard,
} from "@/components/ui";
import {
  ScrollGridAnimation,
  MagneticWrapper,
  ProjectShowcase,
  TerminalHero,
} from "@/components/effects";
import { TransitionLink } from "@/transitions";
import { projects } from "@/data/projects";

export default function Home() {
  return (
    <main>
      {/* Hero — terminal boot sequence */}
      <TerminalHero />

      {/* Intro — constrained */}
      <div className="mx-auto max-w-[960px] px-[var(--space-md)] md:px-[var(--space-lg)]">
        <section className="mb-[var(--space-3xl)]">
          <p className="mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
            SPEC: IDENTITY
          </p>
          <ScrollTextLines className="mb-[var(--space-2xl)] max-w-[640px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
            I&apos;m Alex Mazza, a developer based in Chicago. I build
            AI-powered apps, automation systems, and tools end-to-end — iOS,
            web, trading bots, the works. Day job: AI operations at a healthcare
            SaaS company. Side projects: whatever I can&apos;t stop thinking
            about.
          </ScrollTextLines>
          <ScrollGridAnimation
            className="grid grid-cols-1 gap-[var(--space-md)] md:grid-cols-2"
            stagger={0.15}
          >
            <UsageCard compact />
            <GitHubCard compact />
          </ScrollGridAnimation>
        </section>
      </div>

      {/* Ticker — full bleed */}
      <section className="mb-[var(--space-3xl)]">
        <div className="mx-auto max-w-[960px] px-[var(--space-md)] md:px-[var(--space-lg)] mb-[var(--space-lg)]">
          <p className="mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
            SPEC: CAPABILITIES
          </p>
          <h2 className="font-sans text-[clamp(28px,5vw,48px)] leading-[1.1] tracking-[-0.02em] text-[var(--text-display)]">
            Building things like...
          </h2>
        </div>
        <TickerText
          items={[
            "IOS APPS",
            "SHOPIFY TOOLS",
            "AI AGENTS",
            "TRADING BOTS",
            "MCP SERVERS",
            "WEB APPS",
          ]}
          scrollTarget="projects"
        />
      </section>

      {/* Projects — full bleed */}
      <ProjectShowcase id="projects" projects={projects} className="mb-[var(--space-4xl)]" />

      {/* CTA — constrained */}
      <div className="mx-auto max-w-[960px] px-[var(--space-md)] md:px-[var(--space-lg)] pb-[var(--space-2xl)] md:pb-[var(--space-4xl)]">
        <section className="flex justify-center">
          <MagneticWrapper>
            <TransitionLink href="/contact" className="no-underline">
              <Button>Get in touch</Button>
            </TransitionLink>
          </MagneticWrapper>
        </section>
      </div>

    </main>
  );
}
