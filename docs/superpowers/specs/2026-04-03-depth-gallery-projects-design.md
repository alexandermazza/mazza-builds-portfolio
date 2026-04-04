# Depth Gallery Projects Section

## Overview

A Three.js depth-scrolling gallery that serves as the projects section of the Mazza Builds portfolio. Each project is a textured 3D plane stacked along the Z-axis. Scrolling moves the camera through the depth stack. Magnetic snap-to-nearest ensures the user always lands on a project.

Adapted from the [Codrops Depth Gallery](https://github.com/houmahani/codrops-depth-gallery/) (MIT licensed). Rethemed to comply with the Nothing design system.

## Design Decisions

- **Pure black background** — No GLSL shaders, no gradient blobs. Flat `--black` (#000) renderer clear color.
- **No particles** — Trail system removed entirely. Nothing is about restraint.
- **DOM overlay for project info** — Typography rendered via React DOM (not WebGL text) using the existing font stack and UI components.
- **Magnetic snap** — Camera lerps to nearest plane on scroll stop. Users always land cleanly on a project.
- **Vanilla Three.js in React** — Wrapped via `useRef` + `useEffect`. No `@react-three/fiber` to keep bundle smaller and stay closer to the Codrops architecture.

## Dependencies

- `three` (new) — WebGL renderer, camera, textures, planes

No other new dependencies. The component is a React client component that manages Three.js internally.

## Data Shape

```ts
interface GalleryProject {
  issueNumber: number
  name: string
  description: string
  tags: string[]
  status: "LIVE" | "IN PROGRESS" | "ARCHIVED"
  screenshot: string        // path to image in /public
  position: { x: number }   // horizontal offset for staggered layout (-1 to 1 range)
}
```

All planes sit at `y: 0`. Horizontal offset creates left/right stagger (e.g. -0.8, 0.7, -0.6, 0.9).

### Scroll tuning constants

```ts
const SCROLL_SMOOTHING = 0.08
const SCROLL_TO_WORLD_FACTOR = 0.01
const PLANE_GAP = 5              // Z-distance between planes
const VELOCITY_DAMPING = 0.12
const VELOCITY_MAX = 1.5
const SNAP_VELOCITY_THRESHOLD = 0.001
const SNAP_IDLE_DELAY_MS = 150   // ms of no input before snap triggers
const SNAP_DEADZONE = 0.3        // world units from plane center
```

Project data lives in `src/data/projects.ts` as a simple array. Screenshots go in `public/projects/`.

## Architecture

### Kept from Codrops (adapted to TypeScript)

| Module | Role | Adaptations |
|--------|------|-------------|
| `engine.ts` | Render loop, camera setup, resize, texture preloading | Remove debug/stats, remove background render pass, set clear color to `--black` |
| `scroll.ts` | Lerp-smoothed scroll, velocity tracking, wheel + touch input, bounds clamping | Add magnetic snap logic, remove velocity visualizer debug UI |
| `gallery.ts` | Plane creation, Z-stacking, parallax, breath animation, plane visibility blending | Remove mood colors/accent colors, remove texture toggle, simplify to project data |

### Removed from Codrops

| Module | Reason |
|--------|--------|
| `Background/` (shader, GLSL) | No gradients per Nothing rules |
| `Trail.js`, `TrailController.js`, `TrailHeadParticles.js` | No particles — restraint |
| `Label.js` | Replaced by React DOM overlay |
| `Debug.js` | Dev-only tweakpane not needed |
| `galleryData.js` | Replaced by `src/data/projects.ts` |

### New

| Module | Role |
|--------|------|
| `DepthGallery.tsx` | React client component. Creates canvas, initializes Engine, renders DOM overlay for active project. Cleans up on unmount. |
| `types.ts` | `GalleryProject` interface and engine-related types |
| `src/data/projects.ts` | Project data array |

## Scroll & Snap Behavior

### Smooth scroll
- Wheel and touch input feed into `scrollTarget`
- `scrollCurrent` lerps toward `scrollTarget` each frame (`smoothing: 0.08`)
- Camera Z is derived: `cameraStartZ - scrollCurrent * scrollToWorldFactor`

### Velocity tracking
- `rawVelocity = scrollCurrent - previousScrollCurrent`
- `velocity = lerp(velocity, rawVelocity, velocityDamping)`
- Clamped to `[-velocityMax, velocityMax]`

### Magnetic snap
- When `|velocity|` drops below `snapThreshold` (e.g. 0.001) AND no new scroll input for ~150ms:
  - Find nearest plane Z to current camera Z
  - Set `scrollTarget` to the scroll value that maps to that plane's Z
  - The existing lerp naturally animates the camera to the snap point
- Deadzone: if camera is already within `snapDeadzone` of a plane center, don't re-snap (prevents micro-jitter)
- On `touchend`: trigger snap check immediately (don't wait for velocity to decay)

### Bounds
- Camera Z is clamped between first plane + offset and last plane + offset
- `scrollTarget` and `scrollCurrent` are both clamped to prevent overscroll

## Plane Layout

- Planes are stacked along Z-axis with `planeGap` spacing (default: 5 units)
- Each plane has a horizontal offset (`position.x`) for staggered left/right placement
- Aspect ratio: 3:2 (matches typical project screenshots)
- Planes fade in/out based on camera proximity using the Codrops blend formula
- Only the active (nearest) plane is fully opaque; adjacent planes are ghosted

## Parallax & Motion

- **Pointer parallax**: planes shift slightly on mouse move, scaled by depth and opacity
  - X amount: 0.16, Y amount: 0.08
  - Smoothed via lerp (0.08)
- **Breath**: velocity-driven subtle tilt and scale pulse on active plane
  - Tilt amount: 0.045 rad max
  - Scale amount: 3% max
  - Driven by normalized scroll velocity

### Reduced motion
When `prefers-reduced-motion: reduce` is active:
- Parallax disabled
- Breath disabled
- Smooth scroll disabled — camera snaps instantly between planes (no lerp)
- Plane opacity transitions are instant (no fade)

## DOM Overlay

A React-rendered overlay positioned absolutely over the canvas. Shows project info for the active (snapped) plane:

```
ISSUE 01                          [LIVE]
Daily Roman
Cross-platform habit tracker
[iOS]  [SWIFT]  [CORE DATA]
```

- Issue number: Space Mono, 11px, ALL CAPS, `--text-disabled`
- Project name: Space Grotesk, heading size, `--text-display`
- Description: Space Grotesk, body-sm, `--text-secondary`
- Tags: `<TagChip>` components
- Status: `<StatusBadge>` component
- Overlay fades in/out when active plane changes (opacity transition, 300ms ease-out)

The overlay is only interactive (clickable) when snapped to a plane. Click navigates to project detail (future route).

## File Structure

```
src/
  components/
    DepthGallery/
      DepthGallery.tsx        # React wrapper, canvas + DOM overlay
      engine.ts               # Render loop, camera, resize, texture preload
      scroll.ts               # Scroll input, velocity, magnetic snap
      gallery.ts              # Plane management, parallax, breath, visibility
      types.ts                # TypeScript interfaces
  data/
    projects.ts               # GalleryProject[] array
```

## Nothing Design Compliance Checklist

- [x] No gradients, shadows, or blur — flat black background
- [x] No particles or decorative effects
- [x] Typography via DOM, not WebGL — correct fonts and scale
- [x] Monochrome palette — only accent on one element (status badge or tag hover)
- [x] No spring/bounce easing — lerp with ease-out feel
- [x] No border-radius > 16px on card-like elements
- [x] `prefers-reduced-motion` respected
- [x] Monoline aesthetic — planes are flat, no 3D lighting or materials
