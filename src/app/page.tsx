import {
  Button,
  GitHubCard,
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
  ProjectShowcase,
} from "@/components/effects";
import { projects } from "@/data/projects";

export default function Home() {
  return (
    <main>
      {/* Hero — scroll-pinned oscilloscope */}
      <OscilloscopeHero text="MAZZA BUILDS" />

      {/* Subtitle — constrained */}
      <div className="mx-auto max-w-[960px] px-[var(--space-lg)] pt-[var(--space-4xl)]">
        <section className="mb-[var(--space-2xl)]">
          <ScrollLetterAnimation
            as="h2"
            className="font-sans text-[clamp(18px,3vw,24px)] leading-[1.3] tracking-[-0.01em] text-[var(--text-secondary)]"
          >
            Solo indie developer
          </ScrollLetterAnimation>
        </section>
      </div>

      {/* Ticker — full bleed */}
      <section className="mb-[var(--space-3xl)]">
        <TickerText
          items={["IOS APPS", "SHOPIFY TOOLS", "AI PIPELINES", "VIDEO AUTOMATION", "WEB APPS", "CONTENT SYSTEMS"]}
        />
      </section>

      {/* Intro — constrained */}
      <div className="mx-auto max-w-[960px] px-[var(--space-lg)]">
        <section className="mb-[var(--space-4xl)]">
          <ScrollTextLines className="max-w-[480px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
            I&apos;m Alex Mazza, a solo indie developer who builds things from concept to production. I care about clean interfaces, thoughtful systems, and shipping work that holds up.
          </ScrollTextLines>
        </section>
      </div>

      {/* Projects — full bleed */}
      <ProjectShowcase projects={projects} className="mb-[var(--space-4xl)]" />

      {/* Activity + CTA — constrained */}
      <div className="mx-auto max-w-[960px] px-[var(--space-lg)] pb-[var(--space-4xl)]">
        <section className="mb-[var(--space-4xl)]">
          <ScrollGridAnimation className="grid grid-cols-1 gap-[var(--space-md)] md:grid-cols-2" stagger={0.15}>
            <UsageCard compact />
            <GitHubCard compact />
          </ScrollGridAnimation>
        </section>

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
