# Depth Gallery Projects Section — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Codrops depth gallery (MIT) into the portfolio as a Three.js depth-scrolling projects section with magnetic snap and Nothing design theming.

**Architecture:** Vanilla Three.js wrapped in a React client component via `useRef` + `useEffect`. Three modules (engine, scroll, gallery) manage the WebGL scene. A React DOM overlay renders project info using existing UI components. The component is lazy-loaded with `next/dynamic` + `ssr: false` since Three.js requires `window`.

**Tech Stack:** Next.js 16 (App Router), Three.js, TypeScript, Tailwind CSS v4, existing UI components (StatusBadge, TagChip)

**Reference source:** Codrops depth gallery cloned at `/tmp/codrops-depth-gallery/src/Experience/`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/DepthGallery/types.ts` | Create | `GalleryProject` interface, scroll/gallery config constants |
| `src/components/DepthGallery/gallery.ts` | Create | Plane creation, Z-stacking, parallax, breath, visibility blending |
| `src/components/DepthGallery/scroll.ts` | Create | Scroll input (wheel+touch), velocity tracking, magnetic snap, bounds |
| `src/components/DepthGallery/engine.ts` | Create | Render loop, camera, resize, texture preloading, lifecycle |
| `src/components/DepthGallery/DepthGallery.tsx` | Create | React client component: canvas + DOM overlay |
| `src/data/projects.ts` | Create | `GalleryProject[]` array with placeholder data |
| `src/app/page.tsx` | Modify | Replace design system preview with DepthGallery |
| `package.json` | Modify | Add `three` + `@types/three` |

---

### Task 1: Install Three.js and create types

**Files:**
- Modify: `package.json`
- Create: `src/components/DepthGallery/types.ts`

- [ ] **Step 1: Install three and types**

```bash
npm install three && npm install -D @types/three
```

- [ ] **Step 2: Create types and constants**

Create `src/components/DepthGallery/types.ts`:

```ts
import type * as THREE from "three"

export interface GalleryProject {
  issueNumber: number
  name: string
  description: string
  tags: string[]
  status: "LIVE" | "IN PROGRESS" | "ARCHIVED"
  screenshot: string
  position: { x: number }
}

export interface ScrollState {
  velocity: number
  velocityMax: number
  scrollCurrent: number
}

export interface PlaneBlendData {
  currentPlaneIndex: number
  nextPlaneIndex: number
  blend: number
}

// Scroll tuning
export const SCROLL_SMOOTHING = 0.08
export const SCROLL_TO_WORLD_FACTOR = 0.01
export const PLANE_GAP = 5
export const VELOCITY_DAMPING = 0.12
export const VELOCITY_MAX = 1.5
export const VELOCITY_STOP_THRESHOLD = 0.0001
export const SNAP_VELOCITY_THRESHOLD = 0.001
export const SNAP_IDLE_DELAY_MS = 150
export const SNAP_DEADZONE = 0.3
export const FIRST_PLANE_VIEW_OFFSET = 5
export const LAST_PLANE_VIEW_OFFSET = 5

// Gallery tuning
export const PLANE_FADE_SMOOTHING = 0.14
export const PARALLAX_AMOUNT_X = 0.16
export const PARALLAX_AMOUNT_Y = 0.08
export const PARALLAX_SMOOTHING = 0.08
export const BREATH_TILT_AMOUNT = 0.045
export const BREATH_SCALE_AMOUNT = 0.03
export const BREATH_SMOOTHING = 0.14
export const BREATH_GAIN = 1.1

// Camera
export const CAMERA_FOV = 45
export const CAMERA_NEAR = 0.1
export const CAMERA_FAR = 200
export const CAMERA_START_Z = 6
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json src/components/DepthGallery/types.ts
git commit -m "feat: install three.js and add depth gallery types/constants"
```

---

### Task 2: Create gallery module (plane management)

**Files:**
- Create: `src/components/DepthGallery/gallery.ts`

Ported from `/tmp/codrops-depth-gallery/src/Experience/Gallery.js`. Stripped: mood colors, texture toggle, debug bindings, mobile breakpoint logic. Added: TypeScript, reduced-motion support.

- [ ] **Step 1: Create gallery.ts**

Create `src/components/DepthGallery/gallery.ts`:

```ts
import * as THREE from "three"
import type { GalleryProject, PlaneBlendData, ScrollState } from "./types"
import {
  PLANE_GAP,
  PLANE_FADE_SMOOTHING,
  PARALLAX_AMOUNT_X,
  PARALLAX_AMOUNT_Y,
  PARALLAX_SMOOTHING,
  BREATH_TILT_AMOUNT,
  BREATH_SCALE_AMOUNT,
  BREATH_SMOOTHING,
  BREATH_GAIN,
} from "./types"

export class Gallery {
  private planes: THREE.Mesh[] = []
  private texturesBySource = new Map<string, THREE.Texture>()
  private pointerTarget = new THREE.Vector2(0, 0)
  private pointerCurrent = new THREE.Vector2(0, 0)
  private breathIntensity = 0
  private targetBreathIntensity = 0
  private driftCurrent = 0
  private driftTarget = 0
  private reducedMotion: boolean

  private onPointerMove = (event: PointerEvent) => {
    const x = (event.clientX / window.innerWidth) * 2 - 1
    const y = (event.clientY / window.innerHeight) * 2 - 1
    this.pointerTarget.set(x, -y)
  }

  private onPointerLeave = () => {
    this.pointerTarget.set(0, 0)
  }

  constructor(reducedMotion: boolean) {
    this.reducedMotion = reducedMotion
  }

  init(scene: THREE.Scene, projects: GalleryProject[]) {
    const planeGeometry = new THREE.PlaneGeometry(3, 2) // 3:2 aspect

    projects.forEach((project, index) => {
      const texture = this.texturesBySource.get(project.screenshot) || null
      const material = new THREE.MeshBasicMaterial({
        color: "#222222",
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        opacity: index === 0 ? 1 : 0,
      })

      const mesh = new THREE.Mesh(planeGeometry, material)
      mesh.position.set(project.position.x, 0, -index * PLANE_GAP)
      mesh.userData.baseX = project.position.x
      mesh.userData.index = index
      scene.add(mesh)
      this.planes.push(mesh)
    })

    window.addEventListener("pointermove", this.onPointerMove, { passive: true })
    window.addEventListener("pointerleave", this.onPointerLeave, { passive: true })
  }

  getTextureSources(projects: GalleryProject[]): string[] {
    return [...new Set(projects.map((p) => p.screenshot).filter(Boolean))]
  }

  setPreloadedTextures(textures: Map<string, THREE.Texture>) {
    this.texturesBySource = textures
  }

  applyTextures() {
    this.planes.forEach((plane) => {
      const material = plane.material as THREE.MeshBasicMaterial
      // Screenshot path is stored implicitly by plane order
      // Textures were set during init, but we can update them post-preload
      const texture = this.texturesBySource.get(
        Array.from(this.texturesBySource.keys())[plane.userData.index]
      )
      if (texture) {
        material.map = texture
        material.color.set("#ffffff")
        material.needsUpdate = true
      }
    })
  }

  getDepthRange(): { nearestZ: number; deepestZ: number } {
    if (!this.planes.length) return { nearestZ: 0, deepestZ: 0 }
    const zPositions = this.planes.map((p) => p.position.z)
    return {
      nearestZ: Math.max(...zPositions),
      deepestZ: Math.min(...zPositions),
    }
  }

  getPlaneBlendData(cameraZ: number): PlaneBlendData | null {
    if (!this.planes.length) return null

    const planeGap = Math.max(PLANE_GAP, 0.0001)
    const firstPlaneZ = this.planes[0].position.z
    const lastPlaneIndex = this.planes.length - 1
    const normalizedDepth = THREE.MathUtils.clamp(
      (firstPlaneZ - cameraZ) / planeGap,
      0,
      lastPlaneIndex
    )
    const currentPlaneIndex = Math.floor(normalizedDepth)
    const nextPlaneIndex = Math.min(currentPlaneIndex + 1, lastPlaneIndex)
    const blend = normalizedDepth - currentPlaneIndex

    return { currentPlaneIndex, nextPlaneIndex, blend }
  }

  getActivePlaneIndex(cameraZ: number): number {
    const blendData = this.getPlaneBlendData(cameraZ)
    if (!blendData) return 0
    return blendData.blend >= 0.5 ? blendData.nextPlaneIndex : blendData.currentPlaneIndex
  }

  getPlaneCount(): number {
    return this.planes.length
  }

  getPlaneZ(index: number): number {
    if (index < 0 || index >= this.planes.length) return 0
    return this.planes[index].position.z
  }

  update(cameraZ: number, scroll: ScrollState | null) {
    this.updatePlaneVisibility(cameraZ)
    if (!this.reducedMotion) {
      this.updatePlaneMotion(scroll)
    }
  }

  private updatePlaneVisibility(cameraZ: number) {
    const blendData = this.getPlaneBlendData(cameraZ)
    if (!blendData) return

    const { currentPlaneIndex, nextPlaneIndex, blend } = blendData

    this.planes.forEach((plane, index) => {
      const material = plane.material as THREE.MeshBasicMaterial
      let targetOpacity = 0

      if (index === currentPlaneIndex) targetOpacity = 1 - blend
      if (index === nextPlaneIndex) targetOpacity = Math.max(targetOpacity, blend)

      if (this.reducedMotion) {
        material.opacity = targetOpacity > 0.5 ? 1 : 0
      } else {
        const currentOpacity = Number.isFinite(material.opacity) ? material.opacity : 0
        material.opacity = THREE.MathUtils.lerp(currentOpacity, targetOpacity, PLANE_FADE_SMOOTHING)
      }
      material.needsUpdate = true
    })
  }

  private updatePlaneMotion(scroll: ScrollState | null) {
    // Smooth pointer
    this.pointerCurrent.lerp(this.pointerTarget, PARALLAX_SMOOTHING)

    // Velocity -> breath + drift
    const velocityMax = Math.max(scroll?.velocityMax || 1, 0.0001)
    const velocityNormalized = THREE.MathUtils.clamp(
      Math.abs(scroll?.velocity || 0) / velocityMax,
      0,
      1
    )
    const scrollDrift = THREE.MathUtils.clamp((scroll?.velocity || 0) / velocityMax, -1, 1)

    this.targetBreathIntensity = THREE.MathUtils.clamp(velocityNormalized * BREATH_GAIN, 0, 1)
    this.breathIntensity = THREE.MathUtils.lerp(
      this.breathIntensity,
      this.targetBreathIntensity,
      BREATH_SMOOTHING
    )
    this.driftTarget = scrollDrift
    this.driftCurrent = THREE.MathUtils.lerp(this.driftCurrent, this.driftTarget, 0.05)

    // Per-plane motion
    this.planes.forEach((plane, index) => {
      const baseX = (plane.userData.baseX as number) || 0
      const zPosition = -index * PLANE_GAP
      const material = plane.material as THREE.MeshBasicMaterial
      const opacity = Number.isFinite(material.opacity) ? material.opacity : 0
      const depthInfluence = 1 + index * 0.05
      const parallaxInfluence = opacity * depthInfluence

      const parallaxOffsetX = this.pointerCurrent.x * PARALLAX_AMOUNT_X * parallaxInfluence
      const parallaxOffsetY = this.pointerCurrent.y * PARALLAX_AMOUNT_Y * parallaxInfluence
      const gestureOffsetY = this.driftCurrent * 0.05

      plane.position.x = baseX + parallaxOffsetX
      plane.position.y = parallaxOffsetY + gestureOffsetY
      plane.position.z = zPosition

      // Breath: tilt + scale
      const breathInfluence = this.breathIntensity * opacity
      plane.rotation.x = -this.pointerCurrent.y * BREATH_TILT_AMOUNT * breathInfluence
      plane.rotation.y = this.pointerCurrent.x * BREATH_TILT_AMOUNT * breathInfluence
      plane.rotation.z = 0

      const scalePulse = 1 + BREATH_SCALE_AMOUNT * breathInfluence
      const aspectRatio = 1.5 // 3:2
      plane.scale.set(aspectRatio * scalePulse, scalePulse, 1)
    })
  }

  dispose() {
    window.removeEventListener("pointermove", this.onPointerMove)
    window.removeEventListener("pointerleave", this.onPointerLeave)

    this.planes.forEach((plane) => {
      const material = plane.material as THREE.MeshBasicMaterial
      material.dispose()
    })
    if (this.planes.length > 0) {
      ;(this.planes[0].geometry as THREE.BufferGeometry).dispose()
    }
    this.texturesBySource.forEach((texture) => texture.dispose())
    this.texturesBySource.clear()
    this.planes = []
  }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio"
npx tsc --noEmit src/components/DepthGallery/gallery.ts 2>&1 | head -20
```

Expected: No errors (or only errors about missing sibling modules that don't exist yet — `types.ts` must exist from Task 1).

- [ ] **Step 3: Commit**

```bash
git add src/components/DepthGallery/gallery.ts
git commit -m "feat: add gallery module — plane management, parallax, breath"
```

---

### Task 3: Create scroll module (input, velocity, magnetic snap)

**Files:**
- Create: `src/components/DepthGallery/scroll.ts`

Ported from `/tmp/codrops-depth-gallery/src/Experience/Scroll.js`. Stripped: velocity visualizer, debug bindings. Added: magnetic snap, touchend snap, reduced-motion instant snap.

- [ ] **Step 1: Create scroll.ts**

Create `src/components/DepthGallery/scroll.ts`:

```ts
import * as THREE from "three"
import type { Gallery } from "./gallery"
import type { ScrollState } from "./types"
import {
  SCROLL_SMOOTHING,
  SCROLL_TO_WORLD_FACTOR,
  VELOCITY_DAMPING,
  VELOCITY_MAX,
  VELOCITY_STOP_THRESHOLD,
  SNAP_VELOCITY_THRESHOLD,
  SNAP_IDLE_DELAY_MS,
  SNAP_DEADZONE,
  FIRST_PLANE_VIEW_OFFSET,
  LAST_PLANE_VIEW_OFFSET,
} from "./types"

export class Scroll {
  private camera: THREE.PerspectiveCamera
  private gallery: Gallery
  private reducedMotion: boolean

  // Scroll state
  private scrollTarget = 0
  private scrollCurrent = 0
  private previousScrollCurrent = 0
  private cameraStartZ: number

  // Velocity
  private rawVelocity = 0
  velocity = 0
  velocityMax = VELOCITY_MAX

  // Bounds
  private minCameraZ = -Infinity
  private maxCameraZ = Infinity

  // Snap
  private lastInputTime = 0
  private isSnapping = false

  // Touch
  private touchY = 0

  // Event handlers (bound for removal)
  private onWheel: (event: WheelEvent) => void
  private onTouchStart: (event: TouchEvent) => void
  private onTouchMove: (event: TouchEvent) => void
  private onTouchEnd: () => void

  constructor(camera: THREE.PerspectiveCamera, gallery: Gallery, reducedMotion: boolean) {
    this.camera = camera
    this.gallery = gallery
    this.reducedMotion = reducedMotion
    this.cameraStartZ = camera.position.z

    this.onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const delta = this.normalizeWheelDelta(event)
      this.addScrollInput(delta)
    }

    this.onTouchStart = (event: TouchEvent) => {
      this.touchY = event.touches[0]?.clientY ?? 0
    }

    this.onTouchMove = (event: TouchEvent) => {
      event.preventDefault()
      const currentTouchY = event.touches[0]?.clientY ?? this.touchY
      const deltaY = this.touchY - currentTouchY
      this.addScrollInput(deltaY * 1.8)
      this.touchY = currentTouchY
    }

    this.onTouchEnd = () => {
      this.trySnap()
    }
  }

  init() {
    this.updateCameraBounds()
    this.cameraStartZ = this.maxCameraZ
    this.camera.position.z = this.cameraStartZ
    this.scrollTarget = 0
    this.scrollCurrent = 0
    this.previousScrollCurrent = 0
    this.rawVelocity = 0
    this.velocity = 0
  }

  bindEvents() {
    window.addEventListener("wheel", this.onWheel, { passive: false })
    window.addEventListener("touchstart", this.onTouchStart, { passive: true })
    window.addEventListener("touchmove", this.onTouchMove, { passive: false })
    window.addEventListener("touchend", this.onTouchEnd, { passive: true })
  }

  private normalizeWheelDelta(event: WheelEvent): number {
    if (event.deltaMode === 1) return event.deltaY * 16
    if (event.deltaMode === 2) return event.deltaY * window.innerHeight
    return event.deltaY
  }

  private addScrollInput(deltaY: number) {
    this.scrollTarget += deltaY
    this.lastInputTime = performance.now()
    this.isSnapping = false
  }

  private updateCameraBounds() {
    const depthRange = this.gallery.getDepthRange()
    this.maxCameraZ = depthRange.nearestZ + FIRST_PLANE_VIEW_OFFSET
    this.minCameraZ = depthRange.deepestZ + LAST_PLANE_VIEW_OFFSET

    if (this.minCameraZ > this.maxCameraZ) {
      this.minCameraZ = this.maxCameraZ
    }
  }

  private cameraZFromScroll(scrollAmount: number): number {
    return this.cameraStartZ - scrollAmount * SCROLL_TO_WORLD_FACTOR
  }

  private scrollFromCameraZ(cameraZ: number): number {
    if (SCROLL_TO_WORLD_FACTOR === 0) return 0
    return (this.cameraStartZ - cameraZ) / SCROLL_TO_WORLD_FACTOR
  }

  private updateVelocity() {
    this.rawVelocity = this.scrollCurrent - this.previousScrollCurrent
    this.velocity = THREE.MathUtils.lerp(this.velocity, this.rawVelocity, VELOCITY_DAMPING)
    this.velocity = THREE.MathUtils.clamp(this.velocity, -this.velocityMax, this.velocityMax)

    if (Math.abs(this.velocity) < VELOCITY_STOP_THRESHOLD) {
      this.velocity = 0
    }

    this.previousScrollCurrent = this.scrollCurrent
  }

  private trySnap() {
    if (this.isSnapping) return

    const planeCount = this.gallery.getPlaneCount()
    if (planeCount === 0) return

    const currentCameraZ = this.camera.position.z

    // Find nearest plane
    let nearestIndex = 0
    let nearestDistance = Infinity

    for (let i = 0; i < planeCount; i++) {
      const planeZ = this.gallery.getPlaneZ(i)
      const distance = Math.abs(currentCameraZ - planeZ)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = i
      }
    }

    // Skip if already within deadzone
    if (nearestDistance < SNAP_DEADZONE) return

    const targetZ = this.gallery.getPlaneZ(nearestIndex)
    this.scrollTarget = this.scrollFromCameraZ(targetZ)
    this.isSnapping = true
  }

  private checkAutoSnap() {
    if (this.isSnapping) return
    if (Math.abs(this.velocity) > SNAP_VELOCITY_THRESHOLD) return

    const timeSinceInput = performance.now() - this.lastInputTime
    if (timeSinceInput < SNAP_IDLE_DELAY_MS) return

    this.trySnap()
  }

  getScrollState(): ScrollState {
    return {
      velocity: this.velocity,
      velocityMax: this.velocityMax,
      scrollCurrent: this.scrollCurrent,
    }
  }

  update() {
    this.updateCameraBounds()

    if (this.reducedMotion) {
      // Instant snap: scrollCurrent = scrollTarget
      this.scrollCurrent = this.scrollTarget
    } else {
      this.scrollCurrent = THREE.MathUtils.lerp(
        this.scrollCurrent,
        this.scrollTarget,
        SCROLL_SMOOTHING
      )
    }

    // Clamp to bounds
    const minimumScroll = this.scrollFromCameraZ(this.maxCameraZ)
    const maximumScroll = this.scrollFromCameraZ(this.minCameraZ)
    this.scrollTarget = THREE.MathUtils.clamp(this.scrollTarget, minimumScroll, maximumScroll)
    this.scrollCurrent = THREE.MathUtils.clamp(this.scrollCurrent, minimumScroll, maximumScroll)

    this.updateVelocity()

    // Apply to camera
    const nextCameraZ = this.cameraZFromScroll(this.scrollCurrent)
    this.camera.position.z = THREE.MathUtils.clamp(nextCameraZ, this.minCameraZ, this.maxCameraZ)

    // Auto-snap check
    this.checkAutoSnap()
  }

  dispose() {
    window.removeEventListener("wheel", this.onWheel)
    window.removeEventListener("touchstart", this.onTouchStart)
    window.removeEventListener("touchmove", this.onTouchMove)
    window.removeEventListener("touchend", this.onTouchEnd)
  }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio"
npx tsc --noEmit src/components/DepthGallery/scroll.ts 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/DepthGallery/scroll.ts
git commit -m "feat: add scroll module — velocity tracking, magnetic snap, touch support"
```

---

### Task 4: Create engine module (render loop, camera, textures)

**Files:**
- Create: `src/components/DepthGallery/engine.ts`

Ported from `/tmp/codrops-depth-gallery/src/Experience/Engine.js`. Stripped: debug/stats, background render pass, keyboard debug toggle. Added: TypeScript, black clear color, reduced-motion, active plane index callback.

- [ ] **Step 1: Create engine.ts**

Create `src/components/DepthGallery/engine.ts`:

```ts
import * as THREE from "three"
import { Gallery } from "./gallery"
import { Scroll } from "./scroll"
import type { GalleryProject } from "./types"
import { CAMERA_FOV, CAMERA_NEAR, CAMERA_FAR, CAMERA_START_Z } from "./types"

export class Engine {
  private canvas: HTMLCanvasElement
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private gallery: Gallery
  private scroll: Scroll
  private animationFrameId: number | null = null
  private isRunning = false
  private onActivePlaneChange: (index: number) => void
  private lastActivePlaneIndex = -1

  constructor(
    canvas: HTMLCanvasElement,
    projects: GalleryProject[],
    onActivePlaneChange: (index: number) => void,
    reducedMotion: boolean
  ) {
    this.canvas = canvas
    this.onActivePlaneChange = onActivePlaneChange
    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, CAMERA_NEAR, CAMERA_FAR)
    this.camera.position.set(0, 0, CAMERA_START_Z)

    this.gallery = new Gallery(reducedMotion)
    this.scroll = new Scroll(this.camera, this.gallery, reducedMotion)

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setClearColor(0x000000, 1)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.initGallery(projects)
  }

  private async initGallery(projects: GalleryProject[]) {
    // Preload textures
    const textureSources = this.gallery.getTextureSources(projects)
    const textureLoader = new THREE.TextureLoader()
    const loadedTextures = new Map<string, THREE.Texture>()

    await Promise.all(
      textureSources.map(async (src) => {
        try {
          const texture = await textureLoader.loadAsync(src)
          texture.colorSpace = THREE.SRGBColorSpace
          loadedTextures.set(src, texture)
        } catch (error) {
          console.warn(`Failed to load texture: ${src}`, error)
        }
      })
    )

    this.gallery.setPreloadedTextures(loadedTextures)
    this.gallery.init(this.scene, projects)
    this.gallery.applyTextures()
    this.scroll.init()
    this.resize()

    // Bind events
    this.scroll.bindEvents()
    window.addEventListener("resize", this.onResize)

    // Notify initial active plane
    const activePlane = this.gallery.getActivePlaneIndex(this.camera.position.z)
    this.lastActivePlaneIndex = activePlane
    this.onActivePlaneChange(activePlane)

    this.start()
  }

  private onResize = () => {
    this.resize()
  }

  private resize() {
    const width = this.canvas.clientWidth || window.innerWidth || 1
    const height = this.canvas.clientHeight || window.innerHeight || 1
    if (width <= 0 || height <= 0) return

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  private start() {
    if (this.isRunning) return
    this.isRunning = true
    this.update()
  }

  private update = () => {
    if (!this.isRunning) return
    this.animationFrameId = requestAnimationFrame(this.update)

    this.scroll.update()

    const scrollState = this.scroll.getScrollState()
    this.gallery.update(this.camera.position.z, scrollState)

    // Check active plane change
    const activePlane = this.gallery.getActivePlaneIndex(this.camera.position.z)
    if (activePlane !== this.lastActivePlaneIndex) {
      this.lastActivePlaneIndex = activePlane
      this.onActivePlaneChange(activePlane)
    }

    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.isRunning = false

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    window.removeEventListener("resize", this.onResize)
    this.scroll.dispose()
    this.gallery.dispose()
    this.renderer.dispose()
  }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio"
npx tsc --noEmit src/components/DepthGallery/engine.ts 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/DepthGallery/engine.ts
git commit -m "feat: add engine module — render loop, camera, texture preloading"
```

---

### Task 5: Create project data

**Files:**
- Create: `src/data/projects.ts`
- Create: placeholder screenshots in `public/projects/`

- [ ] **Step 1: Create placeholder screenshot directory**

```bash
mkdir -p "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio/public/projects"
```

- [ ] **Step 2: Generate placeholder images**

Create simple placeholder images (600x400 gray PNGs) for now. These will be replaced with real screenshots later.

```bash
cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio"
# Create minimal 1x1 placeholder PNGs (will be stretched by Three.js)
# Real screenshots should be added later at 1200x800 or similar
for i in 1 2 3; do
  convert -size 600x400 xc:'#1A1A1A' "public/projects/project-0${i}.png" 2>/dev/null || \
  python3 -c "
from PIL import Image
img = Image.new('RGB', (600, 400), (26, 26, 26))
img.save('public/projects/project-0${i}.png')
" 2>/dev/null || \
  echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==" | base64 -d > "public/projects/project-0${i}.png"
done
```

If none of those image generation commands are available, create a simple `.gitkeep` file instead — the gallery will show the fallback gray plane color:

```bash
touch "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio/public/projects/.gitkeep"
```

- [ ] **Step 3: Create projects data**

Create `src/data/projects.ts`:

```ts
import type { GalleryProject } from "@/components/DepthGallery/types"

export const projects: GalleryProject[] = [
  {
    issueNumber: 1,
    name: "Daily Roman",
    description:
      "Duolingo-style iOS app for ancient Roman history. Spaced repetition, streak tracking, and bite-sized lessons.",
    tags: ["Swift", "SwiftUI", "Core Data"],
    status: "IN PROGRESS",
    screenshot: "/projects/project-01.png",
    position: { x: -0.8 },
  },
  {
    issueNumber: 2,
    name: "Shopify App",
    description:
      "Merchant toolkit for automated product tagging and inventory workflows.",
    tags: ["Next.js", "Shopify API", "Prisma"],
    status: "LIVE",
    screenshot: "/projects/project-02.png",
    position: { x: 0.7 },
  },
  {
    issueNumber: 3,
    name: "AI Automation Systems",
    description:
      "Content pipeline using Claude API, HeyGen, and ElevenLabs for automated video production.",
    tags: ["Claude API", "HeyGen", "ElevenLabs"],
    status: "ARCHIVED",
    screenshot: "/projects/project-03.png",
    position: { x: -0.6 },
  },
]
```

- [ ] **Step 4: Commit**

```bash
git add src/data/projects.ts public/projects/
git commit -m "feat: add project data and placeholder screenshots"
```

---

### Task 6: Create React wrapper component (DepthGallery.tsx)

**Files:**
- Create: `src/components/DepthGallery/DepthGallery.tsx`

This is the React client component that mounts the Three.js engine, renders the canvas, and shows the DOM overlay for the active project.

- [ ] **Step 1: Create DepthGallery.tsx**

Create `src/components/DepthGallery/DepthGallery.tsx`:

```tsx
"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Engine } from "./engine"
import type { GalleryProject } from "./types"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { TagChip } from "@/components/ui/TagChip"

interface DepthGalleryProps {
  projects: GalleryProject[]
}

export function DepthGallery({ projects }: DepthGalleryProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<Engine | null>(null)
  const [activePlaneIndex, setActivePlaneIndex] = useState(0)
  const [overlayVisible, setOverlayVisible] = useState(true)

  const onActivePlaneChange = useCallback((index: number) => {
    setOverlayVisible(false)

    // Brief fade out, then update and fade in
    setTimeout(() => {
      setActivePlaneIndex(index)
      setOverlayVisible(true)
    }, 150)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const engine = new Engine(canvas, projects, onActivePlaneChange, reducedMotion)
    engineRef.current = engine

    return () => {
      engine.dispose()
      engineRef.current = null
    }
  }, [projects, onActivePlaneChange])

  const activeProject = projects[activePlaneIndex]

  return (
    <section className="relative h-screen w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ background: "var(--black)" }}
      />

      {/* DOM overlay for active project info */}
      {activeProject && (
        <div
          className="pointer-events-none absolute inset-0 flex items-end justify-start p-[var(--space-2xl)]"
          style={{
            opacity: overlayVisible ? 1 : 0,
            transition: "opacity 300ms var(--ease-out)",
          }}
        >
          <div className="pointer-events-auto max-w-[480px]">
            {/* Issue number + status row */}
            <div className="mb-[var(--space-md)] flex items-center gap-[var(--space-md)]">
              <span className="font-mono text-[11px] uppercase leading-[1.2] tracking-[0.08em] text-[var(--text-disabled)]">
                ISSUE {String(activeProject.issueNumber).padStart(2, "0")}
              </span>
              <StatusBadge status={activeProject.status} />
            </div>

            {/* Project name */}
            <h2
              className="mb-[var(--space-sm)] font-sans leading-[1.2] tracking-[-0.01em] text-[var(--text-display)]"
              style={{ fontSize: "var(--heading)" }}
            >
              {activeProject.name}
            </h2>

            {/* Description */}
            <p
              className="mb-[var(--space-lg)] font-sans leading-[1.5] tracking-[0.01em] text-[var(--text-secondary)]"
              style={{ fontSize: "var(--body-sm)" }}
            >
              {activeProject.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-[var(--space-sm)]">
              {activeProject.tags.map((tag) => (
                <TagChip key={tag}>{tag}</TagChip>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Scroll hint */}
      <div className="pointer-events-none absolute bottom-[var(--space-lg)] left-1/2 -translate-x-1/2">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          SCROLL TO EXPLORE
        </span>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio"
npx tsc --noEmit src/components/DepthGallery/DepthGallery.tsx 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/DepthGallery/DepthGallery.tsx
git commit -m "feat: add DepthGallery React component with DOM overlay"
```

---

### Task 7: Integrate into page.tsx

**Files:**
- Modify: `src/app/page.tsx`

Replace the design system preview page with the DepthGallery. Use `next/dynamic` with `ssr: false` since Three.js requires `window`.

- [ ] **Step 1: Update page.tsx**

Replace the contents of `src/app/page.tsx` with:

```tsx
import dynamic from "next/dynamic"
import { projects } from "@/data/projects"

const DepthGallery = dynamic(
  () =>
    import("@/components/DepthGallery/DepthGallery").then((mod) => ({
      default: mod.DepthGallery,
    })),
  { ssr: false }
)

export default function Home() {
  return (
    <main>
      <DepthGallery projects={projects} />
    </main>
  )
}
```

- [ ] **Step 2: Run the dev server and verify**

```bash
cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio"
npm run dev
```

Open `http://localhost:3000` in a browser. Expected:
- Black background with a Three.js canvas filling the viewport
- Gray placeholder planes stacked in depth (staggered left/right)
- Scrolling moves the camera through the planes
- DOM overlay shows project info in the bottom-left
- Overlay updates when scrolling to a new project
- Camera snaps to nearest plane when scrolling stops

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: integrate DepthGallery as projects section on home page"
```

---

### Task 8: Verify and fix

This task is for catching any TypeScript errors, runtime issues, or visual bugs from the integration.

- [ ] **Step 1: Run full type check**

```bash
cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio"
npx tsc --noEmit
```

Fix any errors found.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Fix any build errors. Common issues to watch for:
- Three.js SSR imports (should be handled by `ssr: false`)
- Missing type exports
- Unused imports

- [ ] **Step 3: Visual verification in browser**

Run `npm run dev` and verify:
- Planes render and fade based on camera distance
- Scroll is smooth with lerp
- Magnetic snap works (scroll partway, release — camera settles on nearest plane)
- Touch scroll works (test via browser devtools mobile emulation)
- DOM overlay updates with correct project info
- No console errors

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve integration issues from depth gallery build"
```

Only run this step if fixes were needed. Skip if everything passed cleanly.
