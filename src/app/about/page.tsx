import { TagChip, MagneticFilings, ScrollTextLines } from "@/components/ui";
import { ScrollLetterAnimation, LinkHover } from "@/components/effects";

const skillGroups = [
  {
    label: "LANGUAGES",
    skills: ["Swift", "TypeScript", "Python", "SQL"],
  },
  {
    label: "FRAMEWORKS",
    skills: ["Next.js", "SwiftUI", "React", "Tailwind CSS"],
  },
  {
    label: "TOOLS & APIS",
    skills: ["Claude API", "Shopify API", "HeyGen", "ElevenLabs", "Prisma"],
  },
];

const socials = [
  { label: "GitHub", href: "https://github.com/alexandermazza" },
  { label: "Twitter", href: "https://twitter.com/maboroshi_alex" },
  { label: "Email", href: "mailto:hello@mazzabuilds.com" },
];

export default function AboutPage() {
  return (
    <main className="relative mx-auto max-w-[960px] px-[var(--space-lg)] py-[var(--space-4xl)]">
      {/* MagneticFilings background */}
      <MagneticFilings className="pointer-events-auto absolute inset-0 -z-10 h-full w-full opacity-20" />

      {/* Heading */}
      <section className="mb-[var(--space-3xl)]">
        <ScrollLetterAnimation
          as="h1"
          className="font-sans text-[clamp(36px,8vw,72px)] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]"
        >
          ABOUT
        </ScrollLetterAnimation>
      </section>

      {/* Bio */}
      <section className="mb-[var(--space-4xl)]">
        <ScrollTextLines className="max-w-[640px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
          I&apos;m Alex Mazza, a solo indie developer based out of the Midwest. I build things from concept to production — iOS apps, Shopify tools, AI-powered automation systems, and the web experiences that tie them together.
        </ScrollTextLines>
        <div className="mt-[var(--space-2xl)]">
          <ScrollTextLines className="max-w-[640px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
            I care about clean interfaces, thoughtful systems, and shipping work that holds up. Every project here was designed, built, and shipped by me — no agencies, no templates.
          </ScrollTextLines>
        </div>
      </section>

      {/* Skills */}
      <section className="mb-[var(--space-4xl)]">
        <p className="mb-[var(--space-2xl)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          TOOLKIT
        </p>
        <div className="grid gap-[var(--space-2xl)]">
          {skillGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-[var(--space-md)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-[var(--space-sm)]">
                {group.skills.map((skill) => (
                  <TagChip key={skill}>{skill}</TagChip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Social links */}
      <section>
        <p className="mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          ELSEWHERE
        </p>
        <div className="flex flex-wrap gap-[var(--space-lg)]">
          {socials.map((social) => (
            <LinkHover key={social.label} href={social.href}>
              <span className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)]">
                {social.label}
              </span>
            </LinkHover>
          ))}
        </div>
      </section>
    </main>
  );
}
