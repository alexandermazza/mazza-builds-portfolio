@AGENTS.md

# Mazza Builds — Portfolio

## Project Overview
Personal portfolio for Alex Mazza, brand name "Mazza Builds." Solo indie developer.
Projects: Daily Roman (iOS app), a Shopify app, AI/automation systems (Claude API, HeyGen, ElevenLabs).
Audience: recruiters, indie devs, general public.

## Stack
- **Framework:** Next.js (App Router, `src/` directory)
- **Styling:** Tailwind CSS v4 (CSS-based config via `@theme inline` in `globals.css`) + CSS custom properties
- **Animation:** Framer Motion (`motion/react`) — all animation configs in `src/lib/motion.ts`
- **Language:** TypeScript throughout
- **No:** shadcn, Radix, Inter, system-ui for display text

## Design Language: Nothing OS + One Accent

This project uses the **Nothing design system** as its foundation.
Skill files are installed at `~/.claude/skills/nothing-design/`.

### Key files in the skill
- `SKILL.md` — Philosophy, craft rules, anti-patterns, workflow
- `references/tokens.md` — Fonts, type scale, color system, spacing, motion
- `references/components.md` — Cards, buttons, inputs, lists, tags, etc.
- `references/platform-mapping.md` — HTML/CSS, SwiftUI, React/Tailwind output

### One deliberate departure from stock Nothing
**Accent color: `#FF6B35` (orange)** replaces Nothing's `#D71921` (red).
Used on **ONE element per section maximum** — a CTA, a hover state, an active tag.
Everything else is strictly monochrome per the skill's rules.

### Font Stack (loaded via `next/font/google` in `layout.tsx`)
| Role | Font | Usage |
|------|------|-------|
| Display | Doto | Hero moments, 36px+ only (not yet loaded — add when needed) |
| Body / UI | Space Grotesk | Headings, body text, 300/400/500/700 weights |
| Data / Labels | Space Mono | Issue numbers, labels, tags, buttons — ALL CAPS, 0.06-0.08em tracking |

### Nothing Design Anti-Patterns (never do these)
- No gradients, no shadows, no blur — flat surfaces only
- No skeleton loaders — use `[LOADING...]` text
- No toast popups — use inline status text
- No spring/bounce easing — subtle ease-out only
- No border-radius > 16px on cards (buttons can be pill 999px or technical 4-8px)
- No filled/multi-color icons — monoline 1.5px stroke only
- No parallax or scroll-jacking

## Design Tokens

All CSS custom properties are in `src/styles/tokens.css`, imported into `globals.css`.
Tailwind theme extensions are in `globals.css` via `@theme inline`.

### Color Tokens
| Token | Value |
|-------|-------|
| `--black` | `#000000` |
| `--surface` | `#111111` |
| `--surface-raised` | `#1A1A1A` |
| `--border` | `#222222` |
| `--border-visible` | `#333333` |
| `--text-disabled` | `#666666` |
| `--text-secondary` | `#999999` |
| `--text-primary` | `#E8E8E8` |
| `--text-display` | `#FFFFFF` |
| `--accent` | `#FF6B35` |
| `--success` | `#4A9E5C` |
| `--warning` | `#D4A843` |
| `--error` | `#D71921` |

Note: the about page also applies a `.blueprint` class that overrides these tokens with a navy variant. See `src/styles/tokens.css`.

### Spacing Scale (8px base)
`--space-2xs` (2px), `--space-xs` (4px), `--space-sm` (8px), `--space-md` (16px),
`--space-lg` (24px), `--space-xl` (32px), `--space-2xl` (48px), `--space-3xl` (64px), `--space-4xl` (96px)

### Radii
`--radius-technical` (4px), `--radius-compact` (8px), `--radius-card` (12px),
`--radius-card-lg` (16px), `--radius-pill` (999px)

## Motion Constants (`src/lib/motion.ts`)

| Name | Config |
|------|--------|
| `SPRING_SNAPPY` | `{ type: "spring", stiffness: 400, damping: 30 }` |
| `SPRING_FLUID` | `{ type: "spring", stiffness: 180, damping: 24 }` |
| `SPRING_BOUNCY` | `{ type: "spring", stiffness: 550, damping: 22 }` |
| `SCROLL_VELOCITY_MULTIPLIER` | `0.3` |
| `TEXT_REVEAL_STAGGER` | `0.035` |
| `LINE_REVEAL_STAGGER` | `0.08` |
| `TICKER_SPEED` | `60` |
| `EASE_OUT` | `[0.25, 0.1, 0.25, 1]` |
| `DURATION.micro` | `0.15` |
| `DURATION.transition` | `0.3` |

## Component APIs (`src/components/ui/`)

### `<Button variant="primary" | "ghost" />`
- Primary: orange accent fill, pill radius, white text
- Ghost: transparent, no border, secondary text, hover brightens
- All buttons: Space Mono, 13px, ALL CAPS, 0.06em tracking, min-height 44px

### `<ProjectCard issueNumber={1} name="..." description="..." tags={[...]} status="LIVE" />`
- Nothing-styled card with `--surface` bg, `--border` border, `--radius-card`
- Issue number: `ISSUE 01` in Space Mono, `--text-disabled`
- Name: Space Grotesk at `--heading` size, `--text-display`
- Description: `--body-sm`, `--text-secondary`
- Tags rendered as `<TagChip>` components
- Status rendered as `<StatusBadge>`

### `<StatusBadge status="LIVE" | "IN PROGRESS" | "ARCHIVED" />`
- Technical radius (4px), bordered, Space Mono ALL CAPS 11px
- LIVE: green border + text, IN PROGRESS: warning yellow, ARCHIVED: disabled gray

### `<TagChip>Label</TagChip>`
- Pill radius, `--border-visible` border, Space Mono ALL CAPS 11px, `--text-secondary`

### All components accept `className` for overrides

## Planned Motion Animations (not yet built)

These will be implemented in future sessions using Framer Motion:

| Animation | Placement |
|-----------|-----------|
| `react-magnetic-filings` | Hero section background |
| `react-scroll-velocity-linked-offset` | Project section scroll feel |
| `react-split-text-scatter` | Hero headline entrance |
| `react-text-reveal` | Section headers on scroll enter |
| `react-ticker-text-hover-effect` | Tech stack ticker |
| `react-scroll-text-lines` | Body copy reveals |
| `react-scroll-horizontal` | Projects scroll section |
| `react-notifications-stack` | "Currently building" widget |
| `react-cursor-floating-target` | Global cursor effect |
| `react-radial-menu` | Mobile nav |

## File Structure
```
src/
├── app/
│   ├── globals.css          # Tailwind v4 config + token imports + reduced-motion
│   ├── layout.tsx           # Root layout, font loading (Space Grotesk + Space Mono)
│   └── page.tsx             # Design system preview (temporary)
├── components/
│   └── ui/
│       ├── Button.tsx
│       ├── ProjectCard.tsx
│       ├── StatusBadge.tsx
│       ├── TagChip.tsx
│       └── index.ts         # Barrel export
├── lib/
│   └── motion.ts            # Framer Motion constants
└── styles/
    └── tokens.css           # CSS custom properties (dark + blueprint)
```

## Conventions
- `prefers-reduced-motion` is respected globally in `globals.css`
- Dark mode only; the `.blueprint` class provides a navy variant scoped to the about page
- All components are client components (`"use client"`)
- Barrel export from `@/components/ui`
- TypeScript strict mode enabled
