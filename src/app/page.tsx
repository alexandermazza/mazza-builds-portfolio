"use client"

import dynamic from "next/dynamic"
import { projects } from "@/data/projects"
import { Button, MagneticFilings, ProjectCard, ScrollTextLines, SplitTextScatter, StatusBadge, TagChip, TickerText, UsageCard } from "@/components/ui"

const DepthGallery = dynamic(
  () =>
    import("@/components/DepthGallery/DepthGallery").then((mod) => ({
      default: mod.DepthGallery,
    })),
  { ssr: false }
)

export default function Home() {
  return (
    <main>
      {/* Magnetic filings */}
      <section className="relative">
        <MagneticFilings className="h-[80vh]" />
      </section>

      <DepthGallery projects={projects} />

      {/* Split text scatter */}
      <section className="mb-[var(--space-3xl)]">
        <p className="mb-[var(--space-md)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
          SPLIT TEXT SCATTER
        </p>
        <SplitTextScatter
          text="MAZZA BUILDS"
          className="font-sans text-[clamp(48px,12vw,96px)] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]"
        />
      </section>

      {/* Scroll text lines */}
      <section className="mb-[var(--space-3xl)]">
        <p className="mb-[var(--space-md)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
          SCROLL TEXT LINES
        </p>
        <ScrollTextLines className="max-w-[480px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
          I&apos;m Alex Mazza, a solo indie developer who builds things from concept to production. I care about clean interfaces, thoughtful systems, and shipping work that holds up.
        </ScrollTextLines>
      </section>

      {/* Ticker text */}
      <section className="mb-[var(--space-3xl)]">
        <p className="mb-[var(--space-md)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
          TICKER TEXT
        </p>
        <TickerText
          items={["IOS APPS", "SHOPIFY TOOLS", "AI PIPELINES", "VIDEO AUTOMATION", "WEB APPS", "CONTENT SYSTEMS"]}
        />
      </section>

      {/* Component showcase */}
      <div className="mx-auto max-w-[960px] px-[var(--space-lg)] py-[var(--space-4xl)]">
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
      </div>
    </main>
  )
}
