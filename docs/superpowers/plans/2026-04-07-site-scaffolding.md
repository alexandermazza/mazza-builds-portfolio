# Site Scaffolding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resequence the homepage for a stronger narrative arc, upgrade the intro section with usage cards, and sync the About page's SystemDiagram to reflect all 10 projects.

**Architecture:** Three files changed — `page.tsx` (homepage reorder + intro upgrade), `SystemDiagram.tsx` (4 domain groups with sub-project lists), `about/page.tsx` (new SPEC: ACTIVITY section). No new components or files created.

**Tech Stack:** Next.js App Router, Tailwind CSS, GSAP (SystemDiagram animation), existing UI components (UsageCard, GitHubCard, SpecBlock, ScrollGridAnimation, ScrollTextLines)

---

### Task 1: Resequence homepage and upgrade intro section

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Rewrite `page.tsx` with new section order and upgraded intro**

Replace the entire body of the `Home` component. The new order is:

1. TerminalHero (unchanged)
2. Intro section — constrained 960px, with `SPEC: IDENTITY` label, body-sized copy, and UsageCard/GitHubCard in a 2-col grid
3. TickerText (unchanged)
4. ProjectShowcase (unchanged)
5. CTA (unchanged, but now in its own constrained wrapper without the usage cards)
6. Footer (unchanged)

```tsx
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

      {/* Attribution */}
      <footer className="mx-auto max-w-[960px] px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-xl)]">
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          3D models:{" "}
          <a
            href="https://sketchfab.com/3d-models/iphone-17-pro-max-87fc1df741384124a8ce0226d2b2058d"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            iPhone 17 Pro Max
          </a>{" "}
          by MajdyModels,{" "}
          <a
            href="https://sketchfab.com/3d-models/macbook-pro-m3-16-inch-2024-8e34fc2b303144f78490007d91ff57c4"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            MacBook Pro M3
          </a>{" "}
          by jackbaeten — CC-BY-4.0
        </p>
      </footer>
    </main>
  );
}
```

- [ ] **Step 2: Verify the dev server compiles without errors**

Run: `npm run dev` (check terminal for compilation errors)
Expected: No build errors. The homepage should show: hero → intro with SPEC: IDENTITY label + usage cards → ticker → projects → CTA → footer.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: resequence homepage — intro above ticker, usage cards in intro section"
```

---

### Task 2: Expand SystemDiagram to 4 domain groups with sub-project lists

**Files:**
- Modify: `src/components/effects/SystemDiagram.tsx`

- [ ] **Step 1: Update the `SystemNode` interface and `nodes` data**

The interface needs a `projects` array. Replace the existing interface and data:

```tsx
interface SystemNode {
  name: string;
  sublabel: string;
  projects: string[];
}

const nodes: SystemNode[] = [
  {
    name: "MOBILE",
    sublabel: "iOS / SwiftUI",
    projects: ["Daily Roman", "F1 Globe"],
  },
  {
    name: "COMMERCE / WEB",
    sublabel: "Next.js / Shopify",
    projects: ["Shopify App", "Trailmix", "Semrush Enricher"],
  },
  {
    name: "AI / AUTOMATION",
    sublabel: "Claude API / MCP",
    projects: ["AI Automation", "Shakedown", "Web Tracker Scanner"],
  },
  {
    name: "TRADING / DATA",
    sublabel: "Python / Markets",
    projects: ["Kalshi Trader", "Kalshi MCP"],
  },
];
```

- [ ] **Step 2: Update the grid to 4 columns and render project lists inside each card**

Change the grid class from `md:grid-cols-3` to `md:grid-cols-4` on the node cards container (line 109).

Then update the node card markup to render the `projects` array below the sublabel. Replace the existing node card `<div>` (the one with `text-center` class) with:

```tsx
<div
  ref={(el) => {
    nodeRefs.current[i] = el;
  }}
  className="w-full border border-[var(--border-visible)] px-[var(--space-md)] py-[var(--space-md)] text-center"
  style={{ opacity: prefersReduced ? 1 : 0 }}
>
  <p className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-primary)]">
    {node.name}
  </p>
  <p className="mt-[var(--space-xs)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
    {node.sublabel}
  </p>
  <div className="mt-[var(--space-sm)] border-t border-[var(--border)] pt-[var(--space-sm)]">
    {node.projects.map((project) => (
      <p
        key={project}
        className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--text-disabled)]"
      >
        {project}
      </p>
    ))}
  </div>
</div>
```

Note: padding changed from `px-[var(--space-lg)]` to `px-[var(--space-md)]` since 4 columns are tighter.

- [ ] **Step 3: Verify the About page renders correctly**

Run: `npm run dev` and navigate to `/about`
Expected: The SPEC: SYSTEMS section shows 4 domain group cards in a row on desktop, each listing its projects below a divider line. The GSAP scroll animation still works (hub → vertical line → horizontal line → drop lines → cards fade in).

- [ ] **Step 4: Commit**

```bash
git add src/components/effects/SystemDiagram.tsx
git commit -m "feat: expand SystemDiagram to 4 domain groups with all 10 projects"
```

---

### Task 3: Add SPEC: ACTIVITY section to About page

**Files:**
- Modify: `src/app/about/page.tsx`

- [ ] **Step 1: Add imports for UsageCard, GitHubCard, and ScrollGridAnimation**

Add to the existing imports at the top of the file:

```tsx
import { ScrollTextLines, UsageCard, GitHubCard } from "@/components/ui";
```

(Replace the existing `import { ScrollTextLines } from "@/components/ui";` line to include the two new imports.)

Add `ScrollGridAnimation` to the effects import:

```tsx
import {
  ScrollLetterAnimation,
  SpecBlock,
  ConnectionLine,
  AnimatedRule,
  SystemDiagram,
  ProcessFlow,
  ExperienceTimeline,
  ScrollGridAnimation,
} from "@/components/effects";
```

- [ ] **Step 2: Add the SPEC: ACTIVITY section between SYSTEMS and PROCESS**

Insert this JSX block after the `{/* Systems Spec */}` section's closing `</section>` tag and before the `{/* Process Spec */}` comment:

```tsx
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
```

Note: No `compact` prop — the About page uses full-size cards.

- [ ] **Step 3: Verify the About page renders the new section**

Run: `npm run dev` and navigate to `/about`
Expected: Between SPEC: SYSTEMS and SPEC: PROCESS, a new SPEC: ACTIVITY section appears with the SpecBlock bracket decoration and two activity cards side by side. The SpecBlock scroll animation draws the bracket as the section enters view.

- [ ] **Step 4: Commit**

```bash
git add src/app/about/page.tsx
git commit -m "feat: add SPEC: ACTIVITY section with usage cards to About page"
```
