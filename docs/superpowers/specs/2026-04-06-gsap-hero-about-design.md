# GSAP Hero & About Page Design

## Overview

Two GSAP-powered page redesigns that establish a cohesive "oscilloscope / technical instrument" visual language:

1. **Hero — "Oscilloscope"**: A scroll-pinned sequence where a flat SVG line oscillates into a waveform, morphs into the letterforms of "MAZZA BUILDS", then pulses and locks into solid display text.
2. **About — "Technical Spec Sheet"**: The about page redesigned as a product specification document with scroll-triggered dimension lines, skill bar meters, and annotation labels.

Both use GSAP ScrollTrigger with `scrub` for scroll-linked animation. No paid GSAP plugins required.

---

## Part 1: Oscilloscope Hero

### Approach

Canvas + point sampling. Render "MAZZA BUILDS" in Space Grotesk 700 to an offscreen canvas, sample ~800-1000 points along the text outline via edge detection. Use the same fixed point count for all animation states (flat line, sine wave, text shape). GSAP tweens each point's x,y between states. A single visible `<canvas>` renders the polyline at 60fps. At the lock moment, the canvas is hidden and replaced with real DOM text.

### Scroll Sequence

The hero section is `100vh`. Pinned scroll distance: `300vh` (desktop), `200vh` (mobile).

#### Phase 1 — Flat Line (0%-15% scroll)

- Single horizontal polyline spanning viewport width at vertical center
- All points share the same Y coordinate — perfectly flat
- Line color: `--text-disabled` (#666)
- Corner label: `[SIGNAL IDLE]` in Space Mono 11px, `--text-disabled`
- Line stroke width: 1.5px

#### Phase 2 — Oscillation (15%-45% scroll)

- Points animate to sine wave positions
- Frequency and amplitude increase as scroll progresses
- Starts gentle (low amplitude, low frequency), builds intensity
- Status label transitions: `[SIGNAL DETECTED]` at 15%, `[DECODING...]` at 30%
- Line color transitions from `--text-disabled` to `--text-primary`

#### Phase 3 — Text Resolve (45%-75% scroll)

- Individual points migrate from wave positions to text outline positions
- The waveform deforms and the letterforms of "MAZZA BUILDS" emerge
- By 75%, the polyline clearly reads as the text in stroke form (no fill, continuous line)
- Status label: `[SIGNAL LOCKED]`
- Line color: `--text-display` (white in dark mode)

#### Phase 4 — Pulse & Lock (75%-90% scroll)

- Stroke outline holds for a beat (~5% scroll distance)
- Horizontal brightness pulse sweeps left-to-right across the text
  - Implemented as a clipped white-intensity sweep (no color, no gradient fill — stays within Nothing rules)
  - Achieved via a narrow vertical band of increased opacity/brightness moving across the canvas
- On pulse completion: canvas hides, real `<h1>` element appears in its place (solid filled text)
- A flat horizontal line reappears beneath the text as a divider (callback to the original flat line)
- Status label: `[MAZZA_BUILDS.INIT()]`
- Pin releases at ~90%

#### Post-Pin (90%-100%)

- Subtitle, ticker, and intro paragraph fade up with staggered timing
- Reuse existing ScrollLetterAnimation and ScrollTextLines components
- These animate via their own scroll triggers, not the pinned timeline

### Technical Implementation

- **Component:** `src/components/effects/OscilloscopeHero.tsx` — client component
- **Point sampling utility:** `src/lib/text-sampler.ts` — offscreen canvas text-to-points extraction
- **Rendering:** Single `<canvas>` element, redrawn each frame via `requestAnimationFrame` during scrub
- **GSAP config:** ScrollTrigger with `pin: true`, `scrub: 1`, `start: "top top"`, `end: "+=300%"`
- **Point count:** 800-1000 desktop, ~400 mobile
- **Font dependency:** Must wait for Space Grotesk to load before sampling. Use `document.fonts.ready`
- **States array:** Each animation state is an array of `{x, y}` points. GSAP tweens a single proxy object whose properties map to all point positions.

### Accessibility & Reduced Motion

- `prefers-reduced-motion`: Skip pin entirely. Render solid `<h1>` text immediately, no animation.
- The `<h1>` element is always in the DOM (hidden behind canvas during animation) for screen readers.
- Status labels are `aria-hidden="true"` (decorative).

### Mobile

- Pin distance reduced to `200vh`
- Point count reduced to ~400
- Text size follows existing `clamp(48px, 12vw, 96px)`
- Status labels hidden below `sm` breakpoint (not enough room)

---

## Part 2: Technical Spec Sheet About Page

### Overview

The about page is redesigned as a product specification document. Content is the same (bio, skills, social links) but the presentation uses dimension lines, measurement annotations, skill bar meters, and technical labeling. All scroll-triggered with GSAP ScrollTrigger.

### Section 1 — Header

- `ABOUT` heading retains ScrollLetterAnimation
- Below it: thin horizontal rule draws left-to-right (stroke-dashoffset animation)
- Right-aligned annotation at end of rule: `REV 01 - 2026` in Space Mono 11px, `--text-disabled`

### Section 2 — Identity Spec (Bio)

- Section label: `SPEC: IDENTITY` in Space Mono 11px, `--text-disabled`
- Two bio paragraphs wrapped in a spec-block:
  - Thin `--border-visible` vertical line on the left edge (dimension line)
  - Small horizontal tick marks at top and bottom, extending left
  - Measurement annotation at tick marks: `[up-down arrow] 142px` (actual computed height of text block) in Space Mono 11px, `--text-disabled`
- **Scroll animation sequence:**
  1. Dimension lines draw themselves (stroke-dashoffset)
  2. Tick marks extend horizontally
  3. Measurement value counts up from 0 to final number (GSAP snap)
  4. Bio text fades in via ScrollTextLines

### Section 3 — Capabilities Spec (Skills)

Replaces current TagChip grid with horizontal bar meters.

- Section label: `SPEC: CAPABILITIES`
- Group headers (`LANGUAGES`, `FRAMEWORKS`, `TOOLS & APIS`) rendered as annotation labels with thin horizontal line extending right
- Each skill is a row:
  - Skill name: Space Mono 11px, ALL CAPS, `--text-secondary`, left-aligned
  - Bar: 6px height, `--border` background, fills with `--text-primary` from left to a varied target width
  - Thin vertical end-cap line (1px, `--text-primary`) at the fill endpoint
- **Fill targets (aesthetic, not meaningful):**
  - Swift: 85%, TypeScript: 90%, Python: 72%, SQL: 65%
  - Next.js: 88%, SwiftUI: 82%, React: 85%, Tailwind CSS: 90%
  - Claude API: 78%, Shopify API: 75%, HeyGen: 60%, ElevenLabs: 62%, Prisma: 70%
- **Scroll animation:** `scrub: true`, bars fill as you scroll through the section, staggered top-to-bottom (0.05s per bar). Skill name fades in just before its bar starts filling.

### Section 4 — Connections Spec (Social Links)

- Section label: `SPEC: CONNECTIONS`
- Top-right annotation: `3 ENDPOINTS ACTIVE` in Space Mono 11px, `--text-disabled`
- Each link (GitHub, Twitter, Email) is a row:
  - Small circle node `○` on the left (stroke only, `--border-visible`)
  - Horizontal line draws left-to-right from node to label
  - Label at right end: Space Mono 13px, ALL CAPS, `--text-secondary`
  - On line completion: node fills `○` → `●` (stroke to filled, `--text-primary`)
  - Links remain clickable — the line/node are decorative, the label is an `<a>` tag
- **Scroll animation:** Lines draw sequentially, staggered 0.1s

### Section 5 — Footer

- Thin horizontal rule draws left-to-right
- Centered label beneath: `END OF SPEC` in Space Mono 11px, `--text-disabled`

### Dimension Lines (Global Motif)

- SVG overlay, absolute positioned over the full page height
- Thin vertical line running along the left margin (~32px from edge)
- Small horizontal tick marks at each section boundary
- Pixel-distance annotations between ticks (computed from actual section heights)
- **Scroll animation:** Lines draw progressively as you scroll down
- **Desktop only:** Hidden below `md` breakpoint

### Technical Implementation

- **Component:** `src/components/effects/SpecSheet.tsx` — wrapper component for the spec-sheet layout
- **Sub-components:**
  - `SpecBlock` — dimension-line-wrapped content block
  - `SkillBar` — individual skill bar meter
  - `ConnectionLine` — node + line + label row
  - `DimensionOverlay` — the full-page SVG dimension line system
- **All placed in:** `src/components/effects/`
- **GSAP config:** Individual ScrollTrigger per section, all with `scrub: true`
- **Measurement values:** Computed at runtime via `getBoundingClientRect()` after layout, displayed as pixel values

### Accessibility & Reduced Motion

- `prefers-reduced-motion`: All dimension lines, bars, and connection lines appear at final state immediately
- Skill bars show filled state, connection nodes show filled state
- Measurement annotations show final values
- All decorative elements are `aria-hidden="true"`

### Mobile Adaptations

- Dimension lines overlay: hidden below `md`
- Measurement annotations: hidden below `md`
- Skill bars: full width, still animate
- Connection lines: still animate, shorter line length
- Section labels and group headers: still visible

---

## Removed Elements

- **MagneticFilings background** on about page — replaced by the spec sheet aesthetic
- **SplitTextScatter** on home hero — replaced by oscilloscope component
- **TagChip skill grid** on about page — replaced by skill bars

Note: These components are NOT deleted from the codebase. They remain available for use elsewhere. They are simply no longer used on these specific pages.

---

## File Changes Summary

### New Files
- `src/components/effects/OscilloscopeHero.tsx`
- `src/lib/text-sampler.ts`
- `src/components/effects/SpecSheet.tsx` (wrapper)
- `src/components/effects/SpecBlock.tsx`
- `src/components/effects/SkillBar.tsx`
- `src/components/effects/ConnectionLine.tsx`
- `src/components/effects/DimensionOverlay.tsx`

### Modified Files
- `src/app/page.tsx` — replace SplitTextScatter hero with OscilloscopeHero
- `src/app/about/page.tsx` — replace current layout with SpecSheet components
- `src/components/effects/index.ts` — add new exports

### Unchanged
- All existing animation components (SplitTextScatter, MagneticFilings, TagChip, etc.) remain in codebase
- Page transitions system unchanged
- Other pages (projects, contact) unchanged
