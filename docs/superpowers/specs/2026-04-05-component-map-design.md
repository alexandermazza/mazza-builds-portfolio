# Component Map & Site Architecture Design

**Date:** 2026-04-05
**Status:** Approved
**Scope:** Full component inventory, new effect layer, page structure, and global elements for the Mazza Builds portfolio.

---

## Site Structure

Multi-page portfolio connected by GSAP page transitions. Four main routes plus project detail sub-pages.

| Route | Status | Purpose |
|-------|--------|---------|
| `/` | Rebuild | Curated highlight reel — hero, projects preview, activity stats, CTA |
| `/projects` | New | Projects index with interactive grid |
| `/projects/[slug]` | New | Project detail — description, screenshots, tech stack, links |
| `/about` | Rebuild | Bio, skills, social links |
| `/contact` | New | Contact form + direct links |

---

## Architecture: Effect Layer + Content Layer

Two tiers of components:

1. **Effect components** (`src/components/effects/`) — Reusable animation primitives. They know nothing about portfolio content; they animate whatever children they receive.
2. **Page compositions** (`src/app/`) — Each page imports effect components + UI primitives and composes them together.

Existing animation components (`SplitTextScatter`, `TickerText`, `ScrollTextLines`, `TextReveal`, `MagneticFilings`) stay in `ui/`. New effect primitives go in `effects/`. No migration.

### Directory Structure

```
src/components/
├── ui/                    # Atomic UI primitives (existing + new form inputs)
│   ├── Button.tsx
│   ├── ProjectCard.tsx
│   ├── StatusBadge.tsx
│   ├── TagChip.tsx
│   ├── SplitTextScatter.tsx
│   ├── TickerText.tsx
│   ├── ScrollTextLines.tsx
│   ├── TextReveal.tsx
│   ├── MagneticFilings.tsx
│   ├── UsageCard.tsx
│   ├── UsageHeatmap.tsx
│   ├── GitHubCard.tsx
│   ├── GitHubHeatmap.tsx
│   ├── Input.tsx              # NEW
│   ├── Textarea.tsx           # NEW
│   ├── FormStatus.tsx         # NEW
│   └── index.ts
│
├── effects/               # Animation/interaction primitives (NEW)
│   ├── ScrollLetterAnimation.tsx
│   ├── ScrollGridAnimation.tsx
│   ├── ScrollVelocityOffset.tsx
│   ├── MagneticWrapper.tsx
│   ├── ConnectedGrid.tsx
│   ├── CrosshairCursor.tsx
│   ├── LinkHover.tsx
│   ├── ExpandingMenu.tsx
│   └── index.ts
│
├── DepthGallery/          # Existing, kept but not used for now
│
src/app/
├── layout.tsx             # + CrosshairCursor, ExpandingMenu
├── template.tsx           # Existing TransitionContainer
├── page.tsx               # Home — rebuild
├── about/page.tsx         # Rebuild
├── contact/page.tsx       # NEW
├── projects/
│   ├── page.tsx           # NEW — projects index
│   └── [slug]/page.tsx    # NEW — project detail
```

---

## Effect Components (New — `src/components/effects/`)

All use Framer Motion (`motion/react`). All respect `prefers-reduced-motion`.

### `<ScrollLetterAnimation>`

Individual characters animate (translate Y + opacity) as the element enters the viewport. For section headers across all pages.

- **Props:** `children: string`, `as?: "h1" | "h2" | "h3" | "p"`, `stagger?: number`, `className?`
- **Trigger:** Scroll into view via `useInView`
- **Difference from TextReveal:** Per-character with vertical movement vs. word-by-word opacity.

### `<ScrollGridAnimation>`

Wraps a grid of children. Each child staggers in with animation on scroll enter.

- **Props:** `children: ReactNode`, `stagger?: number`, `variant?: "fade-up" | "scale" | "slide-in"`, `className?`
- **Trigger:** Scroll into view. Each child gets staggered delay based on index.

### `<ScrollVelocityOffset>`

Children shift position based on scroll velocity. Creates a "dragging through space" feel.

- **Props:** `children: ReactNode`, `multiplier?: number`, `axis?: "x" | "y"`, `className?`
- **Trigger:** Continuous scroll velocity tracking via `useScroll` + `useVelocity`

### `<MagneticWrapper>`

Child element pulls toward cursor when hovering nearby. Snaps back on leave.

- **Props:** `children: ReactNode`, `strength?: number`, `radius?: number`, `className?`
- **Trigger:** Pointer position relative to element center. Desktop only — no-op on touch.

### `<ConnectedGrid>`

Renders children in a grid with thin SVG lines connecting adjacent items. Lines draw on scroll enter.

- **Props:** `children: ReactNode`, `columns?: number`, `lineColor?: string`, `className?`
- **Behavior:** Measures child positions via refs, draws SVG path overlay. Lines animate with stroke-dashoffset on scroll.

### `<CrosshairCursor>`

Global component. Replaces default cursor with a monoline crosshair. Hidden on mobile/touch.

- **Props:** `size?: number`, `color?: string`, `strokeWidth?: number`
- **Placement:** Once in root layout. Uses `useMotionValue` for smooth pointer tracking.
- **Integration:** Scales up or adds circle when hovering `<MagneticWrapper>` children.

### `<LinkHover>`

Wraps an anchor/TransitionLink. Adds animated underline that slides in from left on hover, out right on leave.

- **Props:** `children: ReactNode`, `href: string`, `className?`
- **Behavior:** CSS-only pseudo-element transition. No JS animation needed.

### `<ExpandingMenu>`

Floating trigger that expands into full-screen overlay on click. Menu items animate in with stagger.

- **Props:** `items: { label: string, href: string }[]`, `className?`
- **Trigger:** Fixed bottom-right, 44px circle. Space Mono label or dot.
- **Open state:** Circle expands via clip-path to cover viewport. `--surface` background at 95% opacity. Four menu items center-stacked, staggered entrance.
- **Close:** Click link (triggers page transition after close), click X, or press Escape.
- **Z-index:** Above everything including page transition overlays.
- **Reduced motion:** Instant show/hide, no clip-path animation.
- **Animation:** Framer Motion `AnimatePresence` for mount/unmount.

---

## UI Primitives (New — `src/components/ui/`)

### `<Input />`

Nothing-styled text input for the contact form.

- Flat `--border` bottom border, no background fill
- Space Grotesk, `--text-primary`
- Focus state: border becomes `--text-display`
- Label in Space Mono, 11px, ALL CAPS, `--text-secondary`

### `<Textarea />`

Same treatment as Input. Resizable vertically only.

### `<FormStatus />`

Inline text showing form submission state. Replaces toast notifications per Nothing design rules.

- States: `[SENDING...]`, `[SENT]`, `[ERROR: ...]`
- Space Mono, uppercase, 11px
- Color: `--text-secondary` for sending, `--success` for sent, `--error` for error

---

## Page Compositions

### `/` — Home (Rebuild)

Transform from design system preview into curated portfolio landing page.

- `<SplitTextScatter>` — "MAZZA BUILDS" hero title (existing)
- `<ScrollLetterAnimation as="h2">` — Tagline or subtitle
- `<TickerText>` — Skills ticker (existing)
- `<ScrollTextLines>` — Brief intro paragraph (existing)
- 3x `<ProjectCard>` in `<ScrollGridAnimation>` — Featured projects, each a `<TransitionLink>` to detail page
- `<UsageCard>` + `<GitHubCard>` — Activity proof (existing)
- `<MagneticWrapper>` around CTA `<Button>` — "Get in touch" linking to `/contact`

### `/projects` — Projects Index (New)

- `<ScrollLetterAnimation as="h1">` — "PROJECTS"
- `<ConnectedGrid>` wrapping `<ProjectCard>` items — Grid with connecting lines, stagger on scroll
- `<ScrollVelocityOffset>` — Velocity-linked shift on the grid during scroll
- Each card is a `<TransitionLink>` to its detail page

### `/projects/[slug]` — Project Detail (New)

- `<ScrollLetterAnimation as="h1">` — Project name
- `<StatusBadge>` + `<TagChip>` row
- Description in `<ScrollTextLines>`
- Screenshots via `<ScrollGridAnimation variant="fade-up">`
- `<LinkHover>` links — Live site, repo, App Store
- Back link via `<TransitionLink>`

### `/about` — About (Rebuild)

- `<ScrollLetterAnimation as="h1">` — "ABOUT"
- Bio in `<ScrollTextLines>` — Multi-paragraph
- `<MagneticFilings>` as background element (finally placing the unused component)
- Skills section — `<TagChip>` clusters grouped by category
- `<LinkHover>` social links

### `/contact` — Contact (New)

- `<ScrollLetterAnimation as="h1">` — "CONTACT"
- Contact form: `<Input>` (name, email) + `<Textarea>` (message) + `<MagneticWrapper>` on submit `<Button>`
- `<FormStatus>` for inline submission feedback
- Direct links: Email, GitHub, Twitter/X as `<LinkHover>` components

---

## Global Elements (Layout-Level)

Added to `layout.tsx` alongside existing `<TransitionProvider>`:

### `<CrosshairCursor />`
- Rendered once, tracks pointer globally
- Hidden on touch devices via `pointer: coarse` media query
- Scales/morphs when hovering magnetic or interactive elements

### `<ExpandingMenu />`
- Fixed position trigger, always accessible
- Items: Home, Projects, About, Contact
- Z-index above page transitions
- Closes on navigation, Escape key, or X button

### Link Treatment
All text links use `<LinkHover>` wrapping `<TransitionLink>` for consistent animated underlines site-wide.

---

## Existing Components — Disposition

| Component | Decision |
|-----------|----------|
| `Button` | Keep, unchanged |
| `ProjectCard` | Keep, unchanged |
| `StatusBadge` | Keep, unchanged |
| `TagChip` | Keep, unchanged |
| `SplitTextScatter` | Keep, Home hero |
| `TickerText` | Keep, Home |
| `ScrollTextLines` | Keep, multiple pages |
| `TextReveal` | Keep available, may be superseded by ScrollLetterAnimation |
| `MagneticFilings` | Keep, placed on About page |
| `UsageCard` / `UsageHeatmap` | Keep, Home |
| `GitHubCard` / `GitHubHeatmap` | Keep, Home |
| `DepthGallery` | Keep in codebase, not routed. Potential future "Lab" page. |
| `TransitionProvider` / `TransitionContainer` / `TransitionLink` | Keep, unchanged |

### Dropped from Plan
| Item | Reason |
|------|--------|
| `react-notifications-stack` | Not needed |
| `react-radial-menu` | Replaced by ExpandingMenu |

---

## Component Count

| Category | Existing | New | Total |
|----------|----------|-----|-------|
| UI Primitives | 13 | 3 | 16 |
| Effect Components | 0 | 8 | 8 |
| Pages | 2 | 3 (+2 rebuilds) | 5 |
| Global | 2 | 2 | 4 |
| **Total** | **17** | **16** | **33** |

---

## Data Model: Projects

The existing `src/data/projects.ts` needs to be extended for project detail pages. Each project entry should include:

```ts
interface Project {
  slug: string                  // URL slug: "daily-roman"
  issueNumber: number           // Display: "ISSUE 01"
  name: string                  // "Daily Roman"
  description: string           // Short — for ProjectCard
  longDescription: string       // Multi-paragraph — for detail page
  tags: string[]                // Tech stack
  status: "LIVE" | "IN PROGRESS" | "ARCHIVED"
  screenshots: string[]         // Paths to static images in /public
  links: {
    live?: string               // App Store, live URL
    repo?: string               // GitHub repo
    website?: string            // Marketing site
  }
}
```

Screenshots live in `public/projects/<slug>/` as static assets.

---

## API Route: Contact Form

New route at `src/app/api/contact/route.ts`:

- **Method:** POST
- **Body:** `{ name: string, email: string, message: string }`
- **Behavior:** Validates input, sends email (via Resend, Mailgun, or similar — decide at implementation time). Returns `{ success: boolean, error?: string }`.
- **No database storage** — just forward to email.

---

## CrosshairCursor + MagneticWrapper Communication

These two components need to coordinate so the cursor reacts to magnetic elements. Implementation approach:

- `MagneticWrapper` adds a `data-magnetic` attribute to its wrapper element.
- `CrosshairCursor` listens for `pointerenter`/`pointerleave` on `[data-magnetic]` elements via event delegation on `document`.
- When over a magnetic element, CrosshairCursor transitions to an expanded state (circle instead of crosshair, or larger crosshair).
- No React context needed — DOM attribute + event delegation keeps them decoupled.

---

## Codrops Inspiration Sources

Effects drawn from [tympanus.net/codrops/hub/author/crnacura](https://tympanus.net/codrops/hub/author/crnacura/):

| Effect Component | Codrops Reference |
|-----------------|-------------------|
| ScrollLetterAnimation | "On-Scroll Letter Animations" |
| ScrollGridAnimation | "Scroll Animations for Image Grids" |
| ScrollVelocityOffset | (Framer Motion `useVelocity` pattern) |
| MagneticWrapper | "Magnetic Buttons" |
| ConnectedGrid | "Connected Grid Layout Animation" |
| CrosshairCursor | "Crosshair Mouse Cursor" (sans distortion) |
| LinkHover | "Simple CSS Line Hover Animations for Links" |
| ExpandingMenu | "Expanding Rounded Menu Animation" |
