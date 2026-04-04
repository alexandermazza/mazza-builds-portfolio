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
    this.pointerCurrent.lerp(this.pointerTarget, PARALLAX_SMOOTHING)

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
