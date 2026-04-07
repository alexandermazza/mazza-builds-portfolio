# 3D Device Showcase — Design Spec

## Overview

Add interactive 3D device models (iPhone, MacBook) to the ProjectShowcase right panel. Each project displays its screenshot on the appropriate device, which rotates into view as the user scrolls. Consistent animation treatment; the content (screenshot/logo) differentiates each project.

## Assets

| Model | Source | Author | License |
|-------|--------|--------|---------|
| iPhone 17 Pro Max | [Sketchfab](https://sketchfab.com/3d-models/iphone-17-pro-max-87fc1df741384124a8ce0226d2b2058d) | MajdyModels | CC-BY-4.0 |
| MacBook Pro M3 16" | [Sketchfab](https://sketchfab.com/3d-models/macbook-pro-m3-16-inch-2024-8e34fc2b303144f78490007d91ff57c4) | jackbaeten | CC-BY-4.0 |

Both models are currently GLTF (scene.gltf + scene.bin + textures/). They will be converted to single compressed `.glb` files during implementation.

**Attribution required:** CC-BY-4.0 means both authors must be credited with links. Add a credits line in the site footer.

## Device ↔ Project Mapping

| Project | deviceType | screenTexture |
|---------|-----------|---------------|
| Daily Roman | `phone` | iOS app screenshot |
| Shopify App | `laptop` | Web app screenshot |
| AI Automation Systems | `laptop` | Dashboard/terminal screenshot |

## Data Model Changes

Add two fields to the `Project` interface in `src/data/projects.ts`:

```ts
deviceType: "phone" | "laptop"   // which 3D model to render
screenTexture: string             // path to screenshot for the device screen
                                  // e.g. "/projects/daily-roman/screen.png"
```

Existing `screenshot` and `images` fields are unchanged (reserved for future detail pages).

## Layout

### Desktop (>767px)

Right panel of the existing 40/60 split-screen scroll-lock:

- **Top ~60%:** R3F `<Canvas>` with the 3D device, transparent background
- **Bottom ~40%:** Existing text stack (StatusBadge, description, tags, link) — unchanged

Device sizing within the canvas:
- Phone: ~60-65% of panel height
- Laptop: ~50-55% of panel height (wider aspect ratio needs horizontal room)
- Camera centered with breathing room around the device

### Mobile (<768px)

- 3D canvas renders above each ProjectCard in the stacked layout
- Canvas height: ~200-250px
- Device faces forward by default (no scroll-driven rotation)
- Screen texture swaps when scrolling between projects

## Animation

### Entrance (scroll-driven)

- Device starts rotated ~45° on Y-axis (showing side/back)
- As the project scrolls into active position, rotates to face forward, revealing the screen
- Rotation driven by scroll progress — smooth and continuous, not a snap
- Tied to the existing `scrollYProgress` from `useScroll` in ProjectShowcase

### Active State

- Device rests at ~5-10° off center (keeps the 3D feel, not perfectly flat)
- Subtle idle float: gentle Y-axis oscillation (~2-3px drift)

### Project Switch

- **Same device type:** Screen texture crossfades. Model stays, no reload.
- **Different device type:** Current model fades out, new model fades in.

### Hover Parallax

- Mouse movement slightly tilts the device toward cursor (±5°)
- Subtle — just enough to feel interactive

### Reduced Motion

- Device appears facing forward instantly (no rotation entrance)
- No idle float
- Texture swaps are instant, no crossfade

## Component Architecture

### `src/components/3d/DeviceScene.tsx`
- R3F `<Canvas>` wrapper
- Props: `deviceType`, `screenTexture`, `scrollProgress` (MotionValue), `isActive`
- Transparent background, `frameloop="demand"`
- Sets up camera, lighting (minimal/flat to match Nothing aesthetic), Suspense boundary
- Handles hover-parallax tilt via pointer events

### `src/components/3d/PhoneModel.tsx`
- Loads iPhone GLB via `useGLTF`
- Finds screen mesh node, replaces material map with `screenTexture`
- Rotation controlled by scroll progress prop

### `src/components/3d/LaptopModel.tsx`
- Same pattern as PhoneModel for MacBook
- Different geometry — screen is the lid interior mesh

### Integration
- `ProjectShowcase.tsx` right panel: insert `<DeviceScene>` above the existing text stack
- `DeviceScene` receives `scrollYProgress` from the existing `useScroll` hook already in ProjectShowcase

## Dependencies

```
@react-three/fiber   — React renderer for Three.js
@react-three/drei    — Helpers (useGLTF, useTexture, etc.)
three                — Three.js core (peer dep)
```

Optional for model prep:
```
gltfjsx              — Auto-generate typed R3F components from GLTF
gltf-pipeline        — Convert GLTF → compressed GLB
```

## Model Prep (one-time during implementation)

1. Convert both GLTF folders → single `.glb` files (gltf-pipeline or gltfjsx)
2. Move to `public/models/iphone.glb` and `public/models/macbook.glb`
3. Run `gltfjsx` to generate typed component code with exact mesh node names
4. Identify the screen mesh node in each model for texture replacement

## Performance

- Models loaded via `useGLTF` with `<Suspense>` — text-only panel shows while loading
- `frameloop="demand"` — canvas only re-renders when animation is active
- Single GLB files reduce HTTP requests vs GLTF + separate bin + textures
- MacBook model is ~8MB total — may need texture optimization or mesh decimation
- `useGLTF.preload()` to start loading models before they scroll into view

## File Structure (new files)

```
src/components/3d/
├── DeviceScene.tsx
├── PhoneModel.tsx
└── LaptopModel.tsx

public/models/
├── iphone.glb
└── macbook.glb

public/projects/
├── daily-roman/screen.png
├── shopify-app/screen.png
└── ai-automation/screen.png
```
