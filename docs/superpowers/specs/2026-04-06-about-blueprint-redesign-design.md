# About Page Blueprint Redesign — Design Spec

**Date:** 2026-04-06
**Status:** Draft
**Scope:** Redesign the About page color scheme, replace skill bars with meaningful sections, clean up annotation lines

---

## Overview

The About page uses a "blueprint/spec sheet" metaphor. This redesign commits fully to that metaphor with a dedicated blue color palette, replaces the generic skill-bar section with three new sections (architecture diagram, process flow, experience timeline), and cleans up the overlapping annotation lines that currently clutter the page.

---

## 1. Blueprint Color System

Scoped to the About page via CSS custom properties under `.blueprint` or the About page layout. These do **not** replace global tokens — they layer on top.

| Token | Value | Usage |
|-------|-------|-------|
| `--bp-bg` | `#0d1b2a` | Page background |
| `--bp-grid` | `#1b3a5c` | Background grid lines |
| `--bp-line` | `#4a7fb5` | Dimension lines, tick marks, connectors, annotations |
| `--bp-text-display` | `#e8f0f5` | Heading text (ABOUT) |
| `--bp-text-primary` | `#c8dce8` | Body text, role titles |
| `--bp-text-secondary` | `#6a8fad` | Descriptions, supporting copy |
| `--bp-text-label` | `#3d6d94` | Spec labels, section headers (SPEC: IDENTITY, etc.) |
| `--bp-accent` | `#FF6B35` | Orange accent — one element per section max |

### Background treatment

```css
.blueprint {
  background-color: var(--bp-bg);
  background-image:
    linear-gradient(var(--bp-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--bp-grid) 1px, transparent 1px);
  background-size: var(--space-lg) var(--space-lg);
}
```

### Migration of existing components

All existing blueprint components (`SpecBlock`, `AnimatedRule`, `ConnectionLine`, `ScrollLetterAnimation`) switch from global tokens to `--bp-*` tokens when rendered inside the About page. Implementation options:

- **Preferred:** Components check for `.blueprint` ancestor and use blueprint tokens via CSS (e.g., `var(--bp-line, var(--border-visible))` fallback pattern)
- **Alternative:** Pass a `variant="blueprint"` prop

---

## 2. Annotation Line Cleanup

### Problem

Two systems draw overlapping lines on the left side of the page:
- `DimensionOverlay` — a full-page SVG spine with tick marks at every `[data-spec-section]` and pixel-height labels
- `SpecBlock` — each instance draws its own vertical line with ticks and a pixel-height counting animation

Both compete for the same visual space and show pixel measurements that mean nothing to visitors.

### Solution

- **Remove `DimensionOverlay`** from the About page entirely (component can stay in codebase for potential use elsewhere)
- **Simplify `SpecBlock`** — keep the vertical bracket line and tick marks as a visual frame, but remove the pixel-height counting animation and the rotated measurement label. The section label (e.g., "SPEC: IDENTITY") is the annotation, not "1227px"
- **New line-work comes from content** — the architecture diagram connectors, process flow arrows, and timeline spine provide meaningful lines that communicate real information

### Guiding principle

Every line on the page should either frame content or connect things. No decorative noise.

---

## 3. Page Structure (top to bottom)

### 3a. Header (existing, restyled)

- "ABOUT" heading via `ScrollLetterAnimation` — update to `--bp-text-display`
- `AnimatedRule` with "REV 01 — 2026" label — update to `--bp-line` / `--bp-text-label`

### 3b. SPEC: IDENTITY (existing, restyled)

- `SpecBlock` wrapping the bio copy
- Same two paragraphs, updated to `--bp-text-primary` / `--bp-text-secondary`
- Simplified bracket line in `--bp-line`

### 3c. SPEC: SYSTEMS (new — replaces CAPABILITIES)

**Purpose:** Show what you build and how projects connect, replacing abstract skill percentages.

**Layout:** A node-and-line diagram rendered as an SVG or absolutely-positioned elements.

**Nodes (3-4):**
| Node | Label | Sublabel |
|------|-------|----------|
| Daily Roman | DAILY ROMAN | iOS / SwiftUI |
| Shopify App | SHOPIFY APP | Commerce / Remix |
| AI Systems | AI SYSTEMS | Claude API / Automation |

- Each node: rectangular box with `--bp-line` border (1px), label in Space Mono uppercase, sublabel in `--bp-text-secondary`
- Center anchor: "MAZZA BUILDS" label or a simple hub node connecting to all three

**Connectors:**
- Lines between nodes that share technology or integration points
- Styled as `--bp-line` with 1px stroke
- Small annotation labels on connector lines (e.g., "CLAUDE API", "TYPESCRIPT") in `--bp-text-label` at 9px

**Animation:**
- Scroll-triggered: nodes draw in (border traces), then connector lines extend between them
- Staggered: hub first, then nodes, then connectors

**Responsive:**
- Desktop: horizontal arrangement, nodes spaced across the width
- Mobile: vertical stack with connectors running top-to-bottom

**Component:** `SystemDiagram` — new component in `src/components/effects/`

### 3d. SPEC: PROCESS (new)

**Purpose:** Show how you work, fitting the blueprint metaphor (blueprints are process documents).

**Layout:** Horizontal flowchart with 4-5 sequential steps connected by directional lines.

**Steps:**
| Step | Annotation |
|------|-----------|
| CONCEPT | Research, scope |
| DESIGN | UI/UX, architecture |
| BUILD | Swift, TS, Next.js |
| TEST | QA, iteration |
| SHIP | Deploy, monitor |

- Each step: rectangular box with `--bp-line` border, step label in Space Mono uppercase `--bp-text-primary`, annotation underneath in `--bp-text-secondary` at 11px
- Connector lines between boxes with small arrow markers, styled in `--bp-line`

**Animation:**
- Scroll-triggered: boxes and lines draw left-to-right sequentially
- Each box border traces in, then the connector to the next box extends

**Responsive:**
- Desktop: horizontal row
- Mobile: vertical stack, connectors run top-to-bottom

**Component:** `ProcessFlow` — new component in `src/components/effects/`

### 3e. SPEC: HISTORY (new)

**Purpose:** Work experience presented as an exploded-view timeline.

**Layout:** Vertical central spine with nodes branching to role cards on alternating sides.

**Data structure per entry:**
```ts
interface ExperienceEntry {
  title: string;      // e.g., "Software Developer"
  company: string;    // e.g., "Acme Corp"
  dateRange: string;  // e.g., "2023 — PRESENT"
  description: string; // One line
}
```

**Visual:**
- Central vertical line in `--bp-line`, drawn downward on scroll
- At each role: a small node circle on the spine, with a horizontal connector line branching to a card
- Cards: `--bp-line` border (1px), 12px radius. Contains title in `--bp-text-primary` (Space Grotesk 16px), company in `--bp-text-label` (Space Mono 11px uppercase), date range in `--bp-text-label`, description in `--bp-text-secondary`
- Desktop: cards alternate left/right of the spine
- Mobile: cards all on the right, spine on the left edge

**Animation:**
- Scroll-triggered: spine draws down, then at each entry point the node appears, connector extends, and card fades/slides in
- Staggered per entry

**Component:** `ExperienceTimeline` — new component in `src/components/effects/`

### 3f. SPEC: CONNECTIONS (existing, restyled)

- Keep existing `ConnectionLine` components
- Update colors to `--bp-line` / `--bp-text-primary` / `--bp-text-secondary`

### 3g. Footer (existing, restyled)

- "END OF SPEC" rule — update to `--bp-line` / `--bp-text-label`

---

## 4. What Gets Removed

- `DimensionOverlay` usage from About page (component file stays)
- `SkillBar` component usage and `skillGroups` data from About page
- Entire SPEC: CAPABILITIES section
- Pixel-height measurement animation from `SpecBlock`

## 5. What Gets Added

- Blueprint color tokens (CSS custom properties, scoped)
- `SystemDiagram` component
- `ProcessFlow` component
- `ExperienceTimeline` component

## 6. What Gets Modified

- `SpecBlock` — remove measurement label and counting animation, keep bracket line
- `AnimatedRule` — pick up blueprint tokens
- `ConnectionLine` — pick up blueprint tokens
- `ScrollLetterAnimation` — pick up blueprint tokens
- About page (`src/app/about/page.tsx`) — new layout with new sections

---

## 7. Animation Approach

All animations use GSAP + ScrollTrigger (already in use on the page). Pattern:

- `scrub: true` for line-drawing effects (tied to scroll position)
- Staggered timelines for sequential reveals
- `prefers-reduced-motion` respected: all animated elements render in their final state immediately

No spring/bounce easing per Nothing design rules — use `ease: "none"` for line drawing and `ease: "power2.out"` for fade/slide.

---

## 8. Accessibility

- All diagram content has semantic HTML underneath (headings, lists) — SVG/visual treatment is progressive enhancement
- Connection links remain keyboard-navigable
- Reduced motion: all elements visible immediately, no animation
- Sufficient color contrast: `--bp-text-primary` (#c8dce8) on `--bp-bg` (#0d1b2a) = ~10:1 ratio
