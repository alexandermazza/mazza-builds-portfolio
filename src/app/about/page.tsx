import type { Metadata } from "next";
import Image from "next/image";
import { ScrollTextLines, UsageCard, GitHubCard } from "@/components/ui";
import {
  ScrollLetterAnimation,
  SpecBlock,
  ConnectionLine,
  AnimatedRule,
  SystemDiagram,
  ProcessFlow,
  ExperienceTimeline,
  ScrollGridAnimation,
  ChicagoMap,
} from "@/components/effects";

export const metadata: Metadata = {
  title: "About",
  description:
    "Solo indie developer based in the Midwest. I build things from concept to production.",
};

const connections = [
  { label: "GitHub", href: "https://github.com/alexandermazza" },
  { label: "Twitter", href: "https://twitter.com/mazza_builds" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/alexander-mazza/" },
  { label: "Email", href: "mailto:hello@mazzabuilds.com" },
];

const experience = [
  {
    title: "GTM AI Operations Manager",
    company: "Freshpaint",
    dateRange: "FEB 2025 — PRESENT",
    description: "AI and automation for go-to-market operations.",
  },
  {
    title: "Revenue Operations Manager",
    company: "Freshpaint",
    dateRange: "AUG 2024 — FEB 2025",
    description: "Managed revenue operations and streamlined GTM processes.",
  },
  {
    title: "Operations Manager, Sales and Marketing",
    company: "Rattle",
    dateRange: "MAY 2023 — AUG 2024",
    description: "Owned revenue management and cross-functional sales and marketing operations.",
  },
  {
    title: "Marketing Operations Manager",
    company: "metadata.io",
    dateRange: "OCT 2021 — MAY 2023",
    description: "System admin for go-to-market team. Automation builder.",
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
            <div className="flex flex-col gap-[var(--space-2xl)] md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <ScrollTextLines className="max-w-[640px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
                  I&apos;m Alex Mazza. Spent years in GTM ops. Now I build the
                  tools I used to have to pay for — AI-powered apps, automation
                  systems, and tools end-to-end — iOS, web, trading bots, the
                  works.
                </ScrollTextLines>
                <div className="mt-[var(--space-2xl)]">
                  <ScrollTextLines className="max-w-[640px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
                    Day job: AI operations at a healthcare SaaS company. Side
                    projects: whatever I can&apos;t stop thinking about.
                  </ScrollTextLines>
                </div>
              </div>
              <div className="flex-shrink-0 md:ml-[var(--space-2xl)]">
                <Image
                  src="/about/sketch.png"
                  alt="Sketch of Alex Mazza"
                  width={280}
                  height={332}
                  className="rounded-[var(--radius-card)] border border-[var(--border-visible)] opacity-80"
                />
              </div>
            </div>
          </SpecBlock>
        </section>

        {/* Location Spec */}
        <section className="mb-[var(--space-2xl)]">
          <SpecBlock label="SPEC: LOCATION">
            <p className="mb-[var(--space-md)] font-mono text-[13px] tracking-[0.06em] text-[var(--text-secondary)]">
              41.8781° N, 87.6298° W
            </p>
            <ScrollTextLines className="mb-[var(--space-2xl)] max-w-[400px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
              Based in Chicago — a city built on a grid, which felt
              appropriate.
            </ScrollTextLines>
          </SpecBlock>
        </section>
      </div>

      {/* Full-bleed ChicagoMap — outside max-w container, cancels main's px padding */}
      <ChicagoMap className="-mx-[var(--space-lg)] mb-[var(--space-4xl)] h-[400px] md:h-[550px]" />

      <div className="relative mx-auto max-w-[960px]">
        {/* Systems Spec */}
        <section className="mb-[var(--space-4xl)]">
          <p className="mb-[var(--space-2xl)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
            SPEC: SYSTEMS
          </p>
          <SystemDiagram />
        </section>

        {/* Activity Spec */}
        <section className="mb-[var(--space-4xl)]">
          <SpecBlock label="SPEC: ACTIVITY">
            <ScrollGridAnimation
              className="grid grid-cols-1 gap-[var(--space-md)] md:grid-cols-2"
              stagger={0.15}
            >
              <UsageCard />
              <GitHubCard />
            </ScrollGridAnimation>
          </SpecBlock>
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
