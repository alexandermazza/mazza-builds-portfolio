import { ScrollTextLines } from "@/components/ui";
import {
  ScrollLetterAnimation,
  SpecBlock,
  ConnectionLine,
  AnimatedRule,
  SystemDiagram,
  ProcessFlow,
  ExperienceTimeline,
} from "@/components/effects";

const connections = [
  { label: "GitHub", href: "https://github.com/alexandermazza" },
  { label: "Twitter", href: "https://twitter.com/maboroshi_alex" },
  { label: "Email", href: "mailto:hello@mazzabuilds.com" },
];

const experience = [
  {
    title: "Software Developer",
    company: "Company Name",
    dateRange: "2024 — PRESENT",
    description: "Building web applications and internal tools.",
  },
  {
    title: "Freelance Developer",
    company: "Self-Employed",
    dateRange: "2022 — 2024",
    description: "iOS apps, Shopify integrations, and AI automation systems.",
  },
];

export default function AboutPage() {
  return (
    <main
      className="blueprint relative min-h-screen px-[var(--space-lg)] py-[var(--space-4xl)]"
      style={{
        backgroundColor: "var(--surface)",
        backgroundImage:
          "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
        backgroundSize: "var(--space-lg) var(--space-lg)",
      }}
    >
      <div className="relative mx-auto max-w-[960px]">
        {/* Heading */}
        <section className="mb-[var(--space-lg)]">
          <ScrollLetterAnimation
            as="h1"
            className="font-sans text-[clamp(36px,8vw,72px)] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]"
          >
            ABOUT
          </ScrollLetterAnimation>
        </section>

        {/* Header rule with revision */}
        <section className="mb-[var(--space-3xl)]">
          <AnimatedRule />
        </section>

        {/* Bio / Identity Spec */}
        <section className="mb-[var(--space-4xl)]">
          <SpecBlock label="SPEC: IDENTITY">
            <ScrollTextLines className="max-w-[640px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
              I&apos;m Alex Mazza, a developer based in Chicago.
              My day job is GTM AI Operations Manager at Freshpaint, where I build automation systems for go-to-market teams. Before that, I spent four years in RevOps and marketing operations — learning how businesses actually run and where the real leverage is.
            </ScrollTextLines>
            <div className="mt-[var(--space-2xl)]">
              <ScrollTextLines className="max-w-[640px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
                The independent work started from genuine curiosity. Daily Roman came from a long obsession with ancient Rome. The Kalshi bots came from wanting to understand prediction markets from the inside. The Shopify tools came from a problem worth solving. That's usually how it starts.
              </ScrollTextLines>
              <ScrollTextLines className="max-w-[640px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
                Every project here was designed, architected, and shipped by me — no agencies, no contractors, no templates. I work mostly in TypeScript, React Native, Python, and Next.js, with the Claude API woven through most of what I build.
                I care about clean interfaces, systems that hold up under load, and work that doesn't require babysitting to run.
              </ScrollTextLines>
            </div>
          </SpecBlock>
        </section>

        {/* Systems Spec */}
        <section className="mb-[var(--space-4xl)]">
          <p className="mb-[var(--space-2xl)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
            SPEC: SYSTEMS
          </p>
          <SystemDiagram />
        </section>

        {/* Process Spec */}
        <section className="mb-[var(--space-4xl)]">
          <p className="mb-[var(--space-2xl)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
            SPEC: PROCESS
          </p>
          <ProcessFlow />
        </section>

        {/* History Spec */}
        <section className="mb-[var(--space-4xl)]">
          <p className="mb-[var(--space-2xl)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
            SPEC: HISTORY
          </p>
          <ExperienceTimeline entries={experience} />
        </section>

        {/* Connections Spec */}
        <section className="mb-[var(--space-4xl)]">
          <div className="mb-[var(--space-2xl)] flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
              SPEC: CONNECTIONS
            </p>
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
              {connections.length} ENDPOINTS ACTIVE
            </span>
          </div>
          <div className="grid gap-[var(--space-lg)]">
            {connections.map((conn, i) => (
              <ConnectionLine
                key={conn.label}
                label={conn.label}
                href={conn.href}
                delay={i * 0.1}
              />
            ))}
          </div>
        </section>

        {/* Footer */}
        <section className="flex flex-col items-center gap-[var(--space-md)]">
          <div className="h-px w-full bg-[var(--border-visible)]" />
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
            END OF SPEC
          </span>
        </section>
      </div>
    </main>
  );
}
