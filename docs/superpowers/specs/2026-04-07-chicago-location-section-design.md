# SPEC: LOCATION — Chicago Map Section

## Overview

Add a new `SPEC: LOCATION` section to the about page featuring a two-column layout with bio text on the left and an interactive SVG map of Chicago on the right. The map uses the existing city-roads export (`Chicago.svg`) with an SVG displacement filter that warps the street grid as the cursor moves over it.

## Placement

Between `SPEC: IDENTITY` and `SPEC: SYSTEMS` in `src/app/about/page.tsx`.

## Layout

- Two-column CSS grid: `40% / 60%` split
- Container: same `max-w-[960px]` as the rest of the about page
- Mobile: stacks vertically — text on top, map below
- Breakpoint: `md` (768px) switches from stacked to side-by-side

## Left Column — Text

- **Section label:** `SPEC: LOCATION` — Space Mono, 11px, all caps, 0.08em tracking, `--text-disabled` (`#3D6D94`)
- **Coordinates:** `41.8781° N, 87.6298° W` — Space Mono, `--text-secondary` (`#6A8FAD`)
- **Body copy:** 1-2 sentences in Space Grotesk, `--text-secondary`, about being based in Chicago
- Wrapped in a `<SpecBlock>` to match the animated measurement line pattern used in SPEC: IDENTITY

## Right Column — Map

### SVG Source

- File: `Chicago.svg` (8MB, exported from anvaka/city-roads)
- Original viewBox: `0 0 1535 1264`
- Cropped viewBox: shift right to emphasize the east side / lakefront and cut the far west side. Exact values to be tuned visually — start around `400 0 1135 1264` and adjust.

### Styling

- Stroke color: `--border` (`#1B3A5C`) — blends with the blueprint grid
- Background: transparent (inherits page `--surface` `#0D1B2A`)
- Override the inline `fill="#4a7fb5"` on the background `<rect>` — either remove it or set to transparent so the page background shows through

### Accent Pin

- Single circle element positioned at approximate Chicago coordinates (general area, not exact address)
- Fill: `--accent` (`#FF6B35`)
- Size: ~8-10px radius
- This is the ONE accent element for the section per the Nothing design rules

### "CHICAGO" Label

- Positioned in the lake's negative space (right/upper-right area of the cropped map)
- Font: Space Mono, all caps, bold
- Color: `--border-visible` (`#4A7FB5`)
- Size: large — acts as a blueprint region annotation, not body text. ~48-64px, tuned visually.
- Straight orientation (not rotated) — cleaner for the blueprint feel

### Displacement Filter (Hover Interaction)

- SVG `<filter>` definition containing:
  - `<feImage>` with a radial gradient (white center fading to black) — this is the displacement map
  - `<feDisplacementMap>` applied to the street grid paths, using the radial as the map
- On mouse move: update the radial gradient's `cx`/`cy` to follow the cursor position (converted to SVG coordinate space)
- Displacement scale: ~10-15px — subtle outward bulge, not extreme
- Smooth feel: use `requestAnimationFrame` for the position updates, optionally lerp the position for lag
- Contained within the SVG bounds — no effect leaking outside the map container

### Reduced Motion / Mobile

- `prefers-reduced-motion: reduce` — disable the displacement filter entirely, show static map
- Mobile (below `md`): disable displacement (no hover on touch), map is static with pin + CHICAGO label
- Map container has `overflow: hidden` to clip any displacement artifacts at edges

## Component Structure

```
src/components/effects/ChicagoMap.tsx   — "use client", handles SVG loading, filter, mouse tracking
```

The component:
1. Loads the Chicago SVG (either inline or as an `<img>` — inline needed for filter manipulation)
2. Defines the displacement filter in an SVG `<defs>` block
3. Applies the filter to the street grid `<g>` element
4. Tracks mouse position and updates the radial gradient origin
5. Renders the accent pin and CHICAGO label as overlaid SVG elements

Given the 8MB SVG size, consider:
- Moving the file to `public/` and loading it, or
- Inlining it as a React component (large but avoids async loading)
- Best approach: place in `public/chicago-map.svg`, fetch and inject into DOM at runtime so the filter can reference internal elements

## About Page Changes

In `src/app/about/page.tsx`:
- Import `ChicagoMap` component
- Add new section between IDENTITY and SYSTEMS:

```tsx
<section className="mb-[var(--space-4xl)]">
  <div className="grid grid-cols-1 gap-[var(--space-2xl)] md:grid-cols-[2fr_3fr]">
    <SpecBlock label="SPEC: LOCATION">
      <p className="mb-[var(--space-md)] font-mono text-[13px] tracking-[0.06em] text-[var(--text-secondary)]">
        41.8781° N, 87.6298° W
      </p>
      <ScrollTextLines className="max-w-[400px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
        Based in Chicago — a city built on a grid, which felt appropriate.
      </ScrollTextLines>
    </SpecBlock>
    <ChicagoMap />
  </div>
</section>
```

## Design Tokens Used

| Token | Value | Usage |
|-------|-------|-------|
| `--border` | `#1B3A5C` | Map street strokes |
| `--border-visible` | `#4A7FB5` | "CHICAGO" label |
| `--text-disabled` | `#3D6D94` | Section label |
| `--text-secondary` | `#6A8FAD` | Coordinates, body copy |
| `--accent` | `#FF6B35` | Location pin |
| `--surface` | `#0D1B2A` | Map background (transparent, inherits) |

## Nothing Design Compliance

- One accent element per section (the pin)
- No gradients visible to user (displacement map gradient is internal to SVG filter, not rendered)
- No shadows, no blur on visible elements
- No border-radius > 16px on cards
- Space Mono for labels/data, Space Grotesk for body
- `prefers-reduced-motion` respected
- Flat surfaces only
