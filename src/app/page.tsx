import { Button, ProjectCard, StatusBadge, TagChip, UsageCard } from "@/components/ui";

export default function Home() {
  return (
    <main className="mx-auto max-w-[960px] px-[var(--space-lg)] py-[var(--space-4xl)]">
      {/* Design system preview — replace with actual pages later */}
      <p className="mb-[var(--space-2xl)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
        DESIGN SYSTEM PREVIEW
      </p>

      {/* Buttons */}
      <section className="mb-[var(--space-3xl)]">
        <p className="mb-[var(--space-md)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
          BUTTONS
        </p>
        <div className="flex items-center gap-[var(--space-lg)]">
          <Button>Get in touch</Button>
          <Button variant="ghost">View source</Button>
        </div>
      </section>

      {/* Status badges */}
      <section className="mb-[var(--space-3xl)]">
        <p className="mb-[var(--space-md)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
          STATUS BADGES
        </p>
        <div className="flex items-center gap-[var(--space-md)]">
          <StatusBadge status="LIVE" />
          <StatusBadge status="IN PROGRESS" />
          <StatusBadge status="ARCHIVED" />
        </div>
      </section>

      {/* Tag chips */}
      <section className="mb-[var(--space-3xl)]">
        <p className="mb-[var(--space-md)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
          TAG CHIPS
        </p>
        <div className="flex flex-wrap gap-[var(--space-sm)]">
          <TagChip>Next.js</TagChip>
          <TagChip>Swift</TagChip>
          <TagChip>Claude API</TagChip>
          <TagChip>Tailwind</TagChip>
        </div>
      </section>

      {/* Project cards */}
      <section className="mb-[var(--space-3xl)]">
        <p className="mb-[var(--space-md)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
          PROJECT CARDS
        </p>
        <div className="grid gap-[var(--space-md)]">
          <ProjectCard
            issueNumber={1}
            name="Daily Roman"
            description="Duolingo-style iOS app for ancient Roman history. Spaced repetition, streak tracking, and bite-sized lessons."
            tags={["Swift", "SwiftUI", "Core Data"]}
            status="IN PROGRESS"
          />
          <ProjectCard
            issueNumber={2}
            name="Shopify App"
            description="Merchant toolkit for automated product tagging and inventory workflows."
            tags={["Next.js", "Shopify API", "Prisma"]}
            status="LIVE"
          />
          <ProjectCard
            issueNumber={3}
            name="AI Automation Systems"
            description="Content pipeline using Claude API, HeyGen, and ElevenLabs for automated video production."
            tags={["Claude API", "HeyGen", "ElevenLabs"]}
            status="ARCHIVED"
          />
        </div>
      </section>

      {/* Usage heatmap */}
      <section>
        <p className="mb-[var(--space-md)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
          USAGE HEATMAP
        </p>
        <UsageCard />
      </section>
    </main>
  );
}
