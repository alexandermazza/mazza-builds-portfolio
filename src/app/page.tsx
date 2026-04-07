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
  LinkHover,
  ProjectShowcase,
  TerminalHero,
} from "@/components/effects";
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
            I&apos;m Alex Mazza, a solo indie developer who builds things from
            concept to production. I care about clean interfaces, thoughtful
            systems, and shipping work that holds up.
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
        <TickerText
          items={[
            "IOS APPS",
            "SHOPIFY TOOLS",
            "AI AGENTS",
            "TRADING BOTS",
            "MCP SERVERS",
            "WEB APPS",
          ]}
        />
      </section>

      {/* Projects — full bleed */}
      <ProjectShowcase projects={projects} className="mb-[var(--space-4xl)]" />

      {/* CTA — constrained */}
      <div className="mx-auto max-w-[960px] px-[var(--space-md)] md:px-[var(--space-lg)] pb-[var(--space-2xl)] md:pb-[var(--space-4xl)]">
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
