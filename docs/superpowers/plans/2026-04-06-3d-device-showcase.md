# 3D Device Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add interactive 3D device models (iPhone, MacBook) to the ProjectShowcase right panel, with scroll-driven rotation revealing project screenshots on each device's screen.

**Architecture:** R3F Canvas embedded in the existing ProjectShowcase right panel. Two device components (PhoneModel, LaptopModel) loaded via useGLTF, with screen mesh textures swapped per project. Scroll progress drives Y-axis rotation; hover adds parallax tilt. DeviceScene wraps the Canvas with camera, lighting, and Suspense.

**Tech Stack:** React Three Fiber, Drei, Three.js (already installed), Next.js dynamic import (SSR disabled)

---

## File Structure

```
src/components/3d/
├── DeviceScene.tsx      — Canvas wrapper: camera, lights, Suspense, hover parallax
├── PhoneModel.tsx       — iPhone GLTF loader, screen texture replacement, rotation
├── LaptopModel.tsx      — MacBook GLTF loader, screen texture replacement, rotation

public/models/
├── iphone.glb           — Compressed iPhone 17 Pro Max model
├── macbook.glb          — Compressed MacBook Pro M3 model

public/projects/
├── daily-roman/screen.png    — Screenshot for phone screen
├── shopify-app/screen.png    — Screenshot for laptop screen
├── ai-automation/screen.png  — Screenshot for laptop screen
```

**Modified files:**
- `src/data/projects.ts` — Add `deviceType` and `screenTexture` fields
- `src/components/effects/ProjectShowcase.tsx` — Insert DeviceScene into right panel
- `package.json` — Add @react-three/fiber and @react-three/drei

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install R3F and Drei**

```bash
npm install @react-three/fiber @react-three/drei
```

`three` is already in package.json at `^0.183.2`. R3F and Drei are the only new deps.

- [ ] **Step 2: Verify the build still works**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds with no new errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @react-three/fiber and @react-three/drei"
```

---

### Task 2: Convert GLTF Models to GLB and Move to public/models/

**Files:**
- Create: `public/models/iphone.glb`
- Create: `public/models/macbook.glb`

The raw GLTF models are at the repo root: `iphone_17_pro_max/` and `macbook_pro_m3_16_inch_2024/`. Each has `scene.gltf`, `scene.bin`, and `textures/`. We need single compressed GLB files.

- [ ] **Step 1: Install gltf-pipeline as a dev dependency**

```bash
npm install --save-dev gltf-pipeline
```

- [ ] **Step 2: Create output directory**

```bash
mkdir -p public/models
```

- [ ] **Step 3: Convert iPhone GLTF to GLB**

```bash
npx gltf-pipeline -i iphone_17_pro_max/scene.gltf -o public/models/iphone.glb --draco.compressionLevel 7
```

If Draco fails (some models have issues), fall back to:
```bash
npx gltf-pipeline -i iphone_17_pro_max/scene.gltf -o public/models/iphone.glb
```

- [ ] **Step 4: Convert MacBook GLTF to GLB**

```bash
npx gltf-pipeline -i macbook_pro_m3_16_inch_2024/scene.gltf -o public/models/macbook.glb --draco.compressionLevel 7
```

Same Draco fallback as above if needed.

- [ ] **Step 5: Verify GLB files exist and check sizes**

```bash
ls -lh public/models/
```

Expected: `iphone.glb` (~1-3MB), `macbook.glb` (~5-9MB). If the MacBook is >8MB, consider running without Draco compression on a second pass or optimizing textures separately.

- [ ] **Step 6: Commit**

```bash
git add public/models/iphone.glb public/models/macbook.glb
git commit -m "chore: add compressed GLB device models"
```

**Note:** The original GLTF folders (`iphone_17_pro_max/`, `macbook_pro_m3_16_inch_2024/`) can be kept for reference or removed. Add them to `.gitignore` if keeping locally:

```
iphone_17_pro_max/
macbook_pro_m3_16_inch_2024/
```

---

### Task 3: Update Project Data Model

**Files:**
- Modify: `src/data/projects.ts:1-14` (interface) and `src/data/projects.ts:16-80` (data)

- [ ] **Step 1: Add new fields to the Project interface**

In `src/data/projects.ts`, add `deviceType` and `screenTexture` after the `links` field:

```ts
export type ProjectStatus = "LIVE" | "IN PROGRESS" | "ARCHIVED";
export type DeviceType = "phone" | "laptop";

export interface Project {
  slug: string;
  issueNumber: number;
  name: string;
  description: string;
  longDescription: string;
  tags: string[];
  status: ProjectStatus;
  screenshot: string;
  images: string[];
  links: { label: string; url: string }[];
  deviceType: DeviceType;
  screenTexture: string;
}
```

- [ ] **Step 2: Add deviceType and screenTexture to each project**

Daily Roman:
```ts
deviceType: "phone",
screenTexture: "/projects/daily-roman/screen.png",
```

Shopify App:
```ts
deviceType: "laptop",
screenTexture: "/projects/shopify-app/screen.png",
```

AI Automation Systems:
```ts
deviceType: "laptop",
screenTexture: "/projects/ai-automation/screen.png",
```

- [ ] **Step 3: Create placeholder screenshot directories**

```bash
mkdir -p public/projects/daily-roman public/projects/shopify-app public/projects/ai-automation
```

For now, create simple placeholder images so the texture loader doesn't error. The user will replace these with real screenshots.

Generate 1x1 placeholder PNGs:
```bash
python3 -c "
import struct, zlib
def make_png(path, r, g, b):
    raw = b'\x00' + bytes([r, g, b])
    compressed = zlib.compress(raw)
    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', ihdr))
        f.write(chunk(b'IDAT', compressed))
        f.write(chunk(b'IEND', b''))
make_png('public/projects/daily-roman/screen.png', 26, 26, 26)
make_png('public/projects/shopify-app/screen.png', 26, 26, 26)
make_png('public/projects/ai-automation/screen.png', 26, 26, 26)
"
```

- [ ] **Step 4: Verify build passes with updated types**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds. TypeScript catches any missing fields.

- [ ] **Step 5: Commit**

```bash
git add src/data/projects.ts public/projects/
git commit -m "feat: add deviceType and screenTexture to project data model"
```

---

### Task 4: Create PhoneModel Component

**Files:**
- Create: `src/components/3d/PhoneModel.tsx`

This component loads the iPhone GLB, finds the screen mesh (`Cube.010_screen.001_0`), replaces its material's base color map with the project's screenshot texture, and exposes rotation via props.

**Key mesh info from GLTF analysis:**
- Screen mesh node name: `Cube.010_screen.001_0`
- Screen material name: `screen.001`
- Material uses `baseColorTexture` (standard PBR map)

- [ ] **Step 1: Create the PhoneModel component**

```tsx
// src/components/3d/PhoneModel.tsx
"use client";

import { useRef, useEffect } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";

interface PhoneModelProps {
  screenTexture: string;
  rotationY: number;
  tiltX: number;
  tiltY: number;
}

export function PhoneModel({
  screenTexture,
  rotationY,
  tiltX,
  tiltY,
}: PhoneModelProps) {
  const { scene } = useGLTF("/models/iphone.glb");
  const texture = useTexture(screenTexture);
  const groupRef = useRef<THREE.Group>(null);

  // Apply screenshot texture to the screen mesh
  useEffect(() => {
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;

    scene.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.name === "Cube010_screen001_0"
      ) {
        const mat = child.material as THREE.MeshStandardMaterial;
        mat.map = texture;
        mat.needsUpdate = true;
      }
    });
  }, [scene, texture]);

  return (
    <group ref={groupRef} rotation={[tiltX, rotationY, 0]}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload("/models/iphone.glb");
```

**Important:** The mesh name in the GLTF is `Cube.010_screen.001_0` but Three.js sanitizes names — dots become empty and special chars get stripped. The actual runtime name may differ. If `Cube010_screen001_0` doesn't match, use `scene.traverse` to log all mesh names and find the correct one:

```ts
scene.traverse((child) => {
  if (child instanceof THREE.Mesh) console.log(child.name);
});
```

Alternatively, match by material name instead:
```ts
if (
  child instanceof THREE.Mesh &&
  (child.material as THREE.MeshStandardMaterial).name === "screen.001"
) {
```

- [ ] **Step 2: Verify the component compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds. The component won't render yet (not integrated), but TypeScript should be clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/3d/PhoneModel.tsx
git commit -m "feat: add PhoneModel component with screen texture replacement"
```

---

### Task 5: Create LaptopModel Component

**Files:**
- Create: `src/components/3d/LaptopModel.tsx`

Same pattern as PhoneModel but for the MacBook. 

**Key mesh info from GLTF analysis:**
- Screen material name: `sfCQkHOWyrsLmor` (material index 36)
- Screen mesh: `Object_56` (node: `Object_123`)
- Material uses `emissiveTexture` — the screen glows. We replace the emissive map AND set emissive color to white so the texture shows at full brightness.

- [ ] **Step 1: Create the LaptopModel component**

```tsx
// src/components/3d/LaptopModel.tsx
"use client";

import { useRef, useEffect } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";

interface LaptopModelProps {
  screenTexture: string;
  rotationY: number;
  tiltX: number;
  tiltY: number;
}

export function LaptopModel({
  screenTexture,
  rotationY,
  tiltX,
  tiltY,
}: LaptopModelProps) {
  const { scene } = useGLTF("/models/macbook.glb");
  const texture = useTexture(screenTexture);
  const groupRef = useRef<THREE.Group>(null);

  // Apply screenshot texture to the screen mesh
  useEffect(() => {
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat.name === "sfCQkHOWyrsLmor") {
          mat.emissiveMap = texture;
          mat.emissive = new THREE.Color(1, 1, 1);
          mat.emissiveIntensity = 1;
          mat.needsUpdate = true;
        }
      }
    });
  }, [scene, texture]);

  return (
    <group ref={groupRef} rotation={[tiltX, rotationY, 0]}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload("/models/macbook.glb");
```

- [ ] **Step 2: Verify the component compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/3d/LaptopModel.tsx
git commit -m "feat: add LaptopModel component with screen texture replacement"
```

---

### Task 6: Create DeviceScene Wrapper

**Files:**
- Create: `src/components/3d/DeviceScene.tsx`

This is the Canvas wrapper that sets up the R3F environment. It:
- Renders a transparent `<Canvas>` with demand-based frame loop
- Sets up camera and minimal lighting (flat/matte for Nothing aesthetic)
- Wraps models in Suspense (fallback is invisible — text panel shows beneath)
- Calculates rotation from scroll progress
- Handles hover parallax tilt
- Switches between PhoneModel and LaptopModel based on deviceType
- Respects prefers-reduced-motion

- [ ] **Step 1: Create the DeviceScene component**

```tsx
// src/components/3d/DeviceScene.tsx
"use client";

import { Suspense, useRef, useState, useCallback, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import type { DeviceType } from "@/data/projects";
import { PhoneModel } from "./PhoneModel";
import { LaptopModel } from "./LaptopModel";

interface DeviceSceneProps {
  deviceType: DeviceType;
  screenTexture: string;
  scrollProgress: number; // 0-1 within this project's scroll slot
  isActive: boolean;
}

/** Inner component that drives animation via useFrame */
function AnimatedDevice({
  deviceType,
  screenTexture,
  scrollProgress,
  isActive,
  tiltX,
  tiltY,
}: DeviceSceneProps & { tiltX: number; tiltY: number }) {
  const prefersReduced = useReducedMotion();
  const rotationRef = useRef(0);
  const floatRef = useRef(0);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (prefersReduced) {
      rotationRef.current = 0;
      return;
    }

    // Scroll-driven rotation: 45° → ~5° as scrollProgress goes 0 → 1
    const targetRotation = isActive
      ? 0.09 // ~5 degrees resting angle
      : 0.785; // ~45 degrees (π/4)
    rotationRef.current += (targetRotation - rotationRef.current) * Math.min(delta * 4, 1);

    // Subtle idle float when active
    if (isActive) {
      floatRef.current += delta * 0.8;
    }

    if (groupRef.current) {
      groupRef.current.position.y = isActive
        ? Math.sin(floatRef.current) * 0.02
        : 0;
    }
  });

  const prefReduced = useReducedMotion();
  const finalRotationY = prefReduced ? 0 : rotationRef.current;
  const finalTiltX = prefReduced ? 0 : tiltX * 0.05;
  const finalTiltY = prefReduced ? 0 : tiltY * 0.05;

  // invalidate on every frame when animating
  const { invalidate } = useThree();
  useFrame(() => {
    if (isActive || rotationRef.current > 0.1) {
      invalidate();
    }
  });

  const ModelComponent = deviceType === "phone" ? PhoneModel : LaptopModel;

  return (
    <group ref={groupRef}>
      <ModelComponent
        screenTexture={screenTexture}
        rotationY={rotationRef.current}
        tiltX={finalTiltX}
        tiltY={finalTiltY}
      />
    </group>
  );
}

export function DeviceScene({
  deviceType,
  screenTexture,
  scrollProgress,
  isActive,
}: DeviceSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientY - rect.top) / rect.height - 0.5) * 2; // -1 to 1
      const y = ((e.clientX - rect.left) / rect.width - 0.5) * 2; // -1 to 1
      setTilt({ x, y });
    },
    []
  );

  const handlePointerLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  // Camera distance — phone is taller/narrower, laptop is wider
  const cameraZ = deviceType === "phone" ? 2.5 : 4;
  const cameraFov = deviceType === "phone" ? 35 : 30;

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <Canvas
        frameloop="demand"
        camera={{ position: [0, 0, cameraZ], fov: cameraFov }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
      >
        {/* Minimal flat lighting — matches Nothing aesthetic */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 3, 5]} intensity={0.8} />

        <Suspense fallback={null}>
          <AnimatedDevice
            deviceType={deviceType}
            screenTexture={screenTexture}
            scrollProgress={scrollProgress}
            isActive={isActive}
            tiltX={tilt.x}
            tiltY={tilt.y}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
```

**Note:** Camera position and FOV values (cameraZ, cameraFov) are initial estimates. These will need visual tuning once the models are rendering — adjust until the device fills roughly 60% of the canvas height for phone, 50% for laptop. This is expected trial-and-error, not a bug.

**Note:** The `useFrame` hook with `rotationRef` creates a smooth interpolation toward the target rotation. The `invalidate()` call ensures the demand-based frameloop re-renders during animation. When the device is resting and not hovered, rendering stops.

- [ ] **Step 2: Verify the component compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/3d/DeviceScene.tsx
git commit -m "feat: add DeviceScene canvas wrapper with scroll rotation and hover parallax"
```

---

### Task 7: Integrate DeviceScene into ProjectShowcase

**Files:**
- Modify: `src/components/effects/ProjectShowcase.tsx:1-297`

This is the integration task. We add a dynamically imported DeviceScene to the right panel of the desktop layout, positioned above the existing text content.

**Key changes:**
1. Dynamic import of DeviceScene (Next.js `ssr: false` — Three.js requires browser APIs)
2. Calculate per-project scroll progress from the existing `scrollYProgress`
3. Add DeviceScene div above the existing AnimatePresence text block
4. Wrap in AnimatePresence for device-type crossfade

- [ ] **Step 1: Add dynamic import and scroll progress calculation**

At the top of `ProjectShowcase.tsx`, add the dynamic import:

```tsx
import dynamic from "next/dynamic";

const DeviceScene = dynamic(
  () => import("@/components/3d/DeviceScene").then((m) => m.DeviceScene),
  { ssr: false }
);
```

- [ ] **Step 2: Add scroll progress state**

Inside the `ProjectShowcase` component, add a state for per-project scroll progress. After the existing `useMotionValueEvent` block (line ~73), add:

```tsx
const [projectScrollProgress, setProjectScrollProgress] = useState(0);

useMotionValueEvent(scrollYProgress, "change", (progress) => {
  if (isMobile) return;
  const index = Math.min(
    Math.floor(progress * projects.length),
    projects.length - 1
  );
  setActiveIndex(index);

  // Per-project progress within its scroll slot
  const slotSize = 1 / projects.length;
  const slotProgress = (progress - index * slotSize) / slotSize;
  setProjectScrollProgress(Math.max(0, Math.min(1, slotProgress)));
});
```

This replaces the existing `useMotionValueEvent` callback (lines 66-73) — combine the logic.

- [ ] **Step 3: Modify the right column layout**

Replace the right column div (currently lines 198-292) to include the DeviceScene above the text content. The right column becomes a flex column with the 3D scene on top and text below:

```tsx
{/* Right column — Detail panel */}
<div className="flex w-[60%] flex-col justify-center pl-[var(--space-3xl)] pr-[var(--space-4xl)]">
  {/* 3D Device */}
  <div className="relative h-[55%] w-full">
    <AnimatePresence mode="wait">
      <motion.div
        key={`device-${activeProject.deviceType}-${activeProject.slug}`}
        className="absolute inset-0"
        initial={prefersReduced ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={prefersReduced ? { opacity: 1 } : { opacity: 0 }}
        transition={{
          duration: prefersReduced ? 0 : DURATION.transition,
          ease: EASE_OUT_MOTION,
        }}
      >
        <DeviceScene
          deviceType={activeProject.deviceType}
          screenTexture={activeProject.screenTexture}
          scrollProgress={projectScrollProgress}
          isActive={true}
        />
      </motion.div>
    </AnimatePresence>
  </div>

  {/* Text content — same as before */}
  <AnimatePresence mode="wait">
    <motion.div
      key={activeProject.slug}
      initial={prefersReduced ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={prefersReduced ? { opacity: 1 } : { opacity: 0 }}
      transition={{
        duration: prefersReduced ? 0 : DURATION.micro,
        ease: EASE_OUT_MOTION,
      }}
      className="max-w-[480px]"
    >
      {/* StatusBadge, description, tags, link — unchanged from current code */}
      {/* ... keep all existing content from lines 212-289 ... */}
    </motion.div>
  </AnimatePresence>
</div>
```

The key change: `items-center` becomes `flex-col justify-center`, and a 55% height device container is added above the text.

- [ ] **Step 4: Verify the build**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds.

- [ ] **Step 5: Visual verification in dev mode**

```bash
npm run dev
```

Open `http://localhost:3000` in a browser. Scroll to the Featured Projects section. You should see:
- The 3D device rendering in the right panel above the text
- The device rotating as you scroll
- The screen showing the placeholder texture
- Crossfade when switching between projects with different device types (phone → laptop)

**Likely tuning needed at this stage:**
- Camera position/FOV if the model is too large or small
- Model scale if it doesn't fit the panel well
- Lighting intensity if the model looks too dark or washed out
- Float animation speed/amplitude

This is expected — adjust the values in DeviceScene.tsx until it looks right.

- [ ] **Step 6: Commit**

```bash
git add src/components/effects/ProjectShowcase.tsx
git commit -m "feat: integrate 3D device models into ProjectShowcase right panel"
```

---

### Task 8: Add CC-BY Attribution

**Files:**
- Modify: `src/app/page.tsx:56-71` (bottom of page, before closing `</main>`)

Both 3D models are CC-BY-4.0 licensed. Add a small attribution footer at the bottom of the home page.

- [ ] **Step 1: Add attribution section**

Before the closing `</main>` tag in `src/app/page.tsx`, add:

```tsx
{/* Attribution */}
<footer className="mx-auto max-w-[960px] px-[var(--space-lg)] py-[var(--space-xl)]">
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add CC-BY attribution for 3D device models"
```

---

### Task 9: Visual Polish and Tuning

**Files:**
- Modify: `src/components/3d/DeviceScene.tsx` (camera, lighting values)
- Modify: `src/components/3d/PhoneModel.tsx` (scale, position offset)
- Modify: `src/components/3d/LaptopModel.tsx` (scale, position offset)

This task is visual tuning. Run the dev server and adjust values iteratively.

- [ ] **Step 1: Run dev server and open browser**

```bash
npm run dev
```

- [ ] **Step 2: Tune phone model**

Check the iPhone model at `http://localhost:3000`. Things to adjust in PhoneModel.tsx and DeviceScene.tsx:

- If the model is too big/small: add a `scale` prop to the `<primitive>` element, e.g. `<primitive object={scene} scale={0.8} />`
- If the screen texture doesn't show: check the console for the actual mesh names (`scene.traverse` debug log). The sanitized name may differ from the GLTF name. Try matching by material name (`screen.001`) instead.
- If the model is offset: add `position={[x, y, z]}` to the `<group>` wrapper

- [ ] **Step 3: Tune laptop model**

Same process for the MacBook:
- Scale, position, and camera adjustments
- Verify the screen texture appears on the emissive material
- The MacBook model is much larger polygon-wise — check for frame rate issues

- [ ] **Step 4: Tune rotation animation**

Scroll through the projects and verify:
- Rotation from 45° → 5° feels smooth
- The idle float is subtle (not distracting)
- Hover parallax tilt responds correctly
- Crossfade between phone ↔ laptop is clean

- [ ] **Step 5: Test reduced motion**

Enable reduced motion in system preferences (macOS: System Settings → Accessibility → Display → Reduce motion). Verify:
- Device appears facing forward instantly
- No float animation
- No rotation animation
- Texture swaps are instant

- [ ] **Step 6: Commit final tuning**

```bash
git add src/components/3d/
git commit -m "fix: tune 3D device model positioning, scale, and animation values"
```

---

### Task 10: Build Verification

- [ ] **Step 1: Full production build**

```bash
npm run build 2>&1 | tail -30
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Run production server and test**

```bash
npm run start &
sleep 2
curl -s http://localhost:3000 | head -50
```

Open in browser and verify the full scroll experience works in production mode.

- [ ] **Step 3: Check bundle size impact**

Look at the build output for page sizes. The Three.js bundle is significant (~150-200KB gzip). Verify it's loaded as a dynamic chunk (not in the main bundle) thanks to the `dynamic()` import.

- [ ] **Step 4: Final commit if any remaining changes**

```bash
git status
```

If clean, this task is done. If there are uncommitted changes:

```bash
git add -A
git commit -m "chore: final build verification cleanup"
```
