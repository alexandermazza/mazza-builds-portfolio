import { ScrollTextLines } from "@/components/ui";
import {
  ScrollLetterAnimation,
  SpecBlock,
  SkillBar,
  ConnectionLine,
  DimensionOverlay,
  AnimatedRule,
} from "@/components/effects";

const skillGroups = [
  {
    label: "LANGUAGES",
    skills: [
      { name: "Swift", fill: 85 },
      { name: "TypeScript", fill: 90 },
      { name: "Python", fill: 72 },
      { name: "SQL", fill: 65 },
    ],
  },
  {
    label: "FRAMEWORKS",
    skills: [
      { name: "Next.js", fill: 88 },
      { name: "SwiftUI", fill: 82 },
      { name: "React", fill: 85 },
      { name: "Tailwind CSS", fill: 90 },
    ],
  },
  {
    label: "TOOLS & APIS",
    skills: [
      { name: "Claude API", fill: 78 },
      { name: "Shopify API", fill: 75 },
      { name: "HeyGen", fill: 60 },
      { name: "ElevenLabs", fill: 62 },
      { name: "Prisma", fill: 70 },
    ],
  },
];

const connections = [
  { label: "GitHub", href: "https://github.com/alexandermazza" },
  { label: "Twitter", href: "https://twitter.com/maboroshi_alex" },
  { label: "Email", href: "mailto:hello@mazzabuilds.com" },
];

export default function AboutPage() {
  let barIndex = 0;

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
      {/* Full-page dimension overlay */}
      <DimensionOverlay />

      {/* Heading */}
      <section data-spec-section className="mb-[var(--space-lg)]">
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
      <section data-spec-section className="mb-[var(--space-4xl)]">
        <SpecBlock label="SPEC: IDENTITY">
          <ScrollTextLines className="max-w-[640px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
            I&apos;m Alex Mazza, a solo indie developer based out of the Midwest. I build things from concept to production — iOS apps, Shopify tools, AI-powered automation systems, and the web experiences that tie them together.
          </ScrollTextLines>
          <div className="mt-[var(--space-2xl)]">
            <ScrollTextLines className="max-w-[640px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
              I care about clean interfaces, thoughtful systems, and shipping work that holds up. Every project here was designed, built, and shipped by me — no agencies, no templates.
            </ScrollTextLines>
          </div>
        </SpecBlock>
      </section>

      {/* Capabilities Spec */}
      <section data-spec-section className="mb-[var(--space-4xl)]">
        <p className="mb-[var(--space-2xl)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          SPEC: CAPABILITIES
        </p>
        <div className="grid gap-[var(--space-2xl)]">
          {skillGroups.map((group) => (
            <div key={group.label}>
              {/* Group header with extending line */}
              <div className="mb-[var(--space-md)] flex items-center gap-[var(--space-md)]">
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                  {group.label}
                </span>
                <div className="h-px flex-1 bg-[var(--border)]" />
              </div>
              {/* Skill bars */}
              <div className="grid gap-[var(--space-md)]">
                {group.skills.map((skill) => {
                  const index = barIndex++;
                  return (
                    <SkillBar
                      key={skill.name}
                      name={skill.name}
                      fill={skill.fill}
                      delay={index * 0.05}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Connections Spec */}
      <section data-spec-section className="mb-[var(--space-4xl)]">
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
      <section data-spec-section className="flex flex-col items-center gap-[var(--space-md)]">
        <div className="h-px w-full bg-[var(--border-visible)]" />
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          END OF SPEC
        </span>
      </section>
      </div>
    </main>
  );
}
