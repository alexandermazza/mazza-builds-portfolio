"use client"

import dynamic from "next/dynamic"
import { projects } from "@/data/projects"
import { ScrollTextLines, SplitTextScatter } from "@/components/ui"

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
    </main>
  )
}
