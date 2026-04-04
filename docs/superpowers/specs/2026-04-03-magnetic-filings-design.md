# MagneticFilings Component — Design Spec

## Overview

A full-viewport hero background component. A sparse grid of short line segments that rotate to point toward a focal point — the cursor on desktop, a scroll-driven virtual point on mobile.

## Visual Design

- **Grid density:** ~20 columns × 14 rows, responsive to viewport (computed from container size / cell spacing)
- **Cell spacing:** ~48px between filing centers (adjustable via constant)
- **Filing appearance:** 20px long, 1.5px stroke, `--text-disabled` (#666666) color
- **Rendering:** HTML `<div>` elements with CSS `width`, `height`, `border-radius` to form line segments, positioned via CSS grid or absolute positioning
- **Background:** transparent (inherits `--black` from body)
- **Z-index:** sits behind hero content — component is meant to be layered under text

## Interaction — Desktop (pointer devices)

- Detect via `@media (pointer: fine)` or `matchMedia` in JS
- Track mouse position over the container via `mousemove`
- Each filing rotates to point toward the cursor: `Math.atan2(cursorY - filingY, cursorX - filingX)`
- Rotation via inline `transform: rotate(Xrad)` set directly on element refs
- Smooth transition via CSS: `transition: transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)`
- When cursor leaves the container, filings ease back to a resting angle (0deg — horizontal)

## Interaction — Mobile (coarse pointer / no pointer)

- A virtual focal point starts at center-top of the grid
- As the user scrolls, the focal point moves downward through the grid
- Scroll progress mapped from the hero section's intersection with the viewport
- Use Framer Motion `useScroll` with `target` ref on the container to get `scrollYProgress` (0→1)
- Focal point Y = `scrollYProgress * containerHeight`, X = `containerWidth / 2`
- Same `atan2` rotation math as desktop, same CSS transition
- No permission prompts, works on all devices

## Performance

- **No per-element Framer Motion.** With ~280 elements, Framer Motion instances would be expensive. Instead:
  - Store refs to all filing elements in a flat array (`useRef<(HTMLDivElement | null)[]>`)
  - On mouse move or scroll update, loop through refs and set `style.transform` directly
- **`mousemove` throttled** via `requestAnimationFrame` flag (one update per frame max)
- **Scroll updates** via Framer Motion `useScroll` + `useMotionValueEvent` (already RAF-optimized)
- **CSS transitions** handle the smoothing — no JS animation loop needed
- **GPU-accelerated:** `transform: rotate()` is composited, no layout or paint

## Reduced Motion

- `prefers-reduced-motion: reduce` → all filings render at resting angle (0deg, horizontal)
- CSS transition duration set to 0ms
- No scroll-based or cursor-based rotation applied

## Component API

```tsx
interface MagneticFilingsProps extends ComponentProps<"div"> {}

<MagneticFilings className="h-screen" />
```

- Full-width by default, height controlled by parent
- Accepts `className` for sizing overrides
- No children — this is a background layer, not a container

## File

`src/components/ui/MagneticFilings.tsx`

## Constants

All tunable values as module-level constants:

| Name | Value | Description |
|------|-------|-------------|
| `CELL_SPACING` | 48 | px between filing centers |
| `FILING_LENGTH` | 20 | px length of each line segment |
| `FILING_THICKNESS` | 1.5 | px stroke width |
| `FILING_COLOR` | `var(--text-disabled)` | color token |
| `TRANSITION_DURATION` | `0.3s` | CSS transition speed |
| `REST_ANGLE` | 0 | radians, horizontal resting position |

## Nothing Design Compliance

- No gradients, shadows, blur
- No spring/bounce easing — uses `cubic-bezier(0.25, 0.1, 0.25, 1)` (EASE_OUT)
- Flat surface, monochrome palette
- Respects `prefers-reduced-motion`
- Filing color uses design token, not hardcoded
