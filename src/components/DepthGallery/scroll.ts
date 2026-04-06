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
  SNAP_SMOOTHING,
  FIRST_PLANE_VIEW_OFFSET,
  LAST_PLANE_VIEW_OFFSET,
} from "./types"

export class Scroll {
  private camera: THREE.PerspectiveCamera
  private gallery: Gallery
  private reducedMotion: boolean
  private container: HTMLElement | null = null

  // Scroll state
  private scrollTarget = 0
  private scrollCurrent = 0
  private previousScrollCurrent = 0
  private cameraStartZ: number

  // Velocity
  private rawVelocity = 0
  private velocity = 0
  private velocityMax = VELOCITY_MAX

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
      const delta = this.normalizeWheelDelta(event)

      // Release to native scroll when at boundaries
      const atTop = this.isAtTop() && delta < 0
      const atBottom = this.isAtBottom() && delta > 0
      if (atTop || atBottom) return

      event.preventDefault()
      this.addScrollInput(delta)
    }

    this.onTouchStart = (event: TouchEvent) => {
      this.touchY = event.touches[0]?.clientY ?? 0
    }

    this.onTouchMove = (event: TouchEvent) => {
      const currentTouchY = event.touches[0]?.clientY ?? this.touchY
      const deltaY = this.touchY - currentTouchY

      // Release to native scroll when at boundaries
      const atTop = this.isAtTop() && deltaY < 0
      const atBottom = this.isAtBottom() && deltaY > 0
      if (atTop || atBottom) {
        this.touchY = currentTouchY
        return
      }

      event.preventDefault()
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

  bindEvents(container: HTMLElement) {
    this.container = container
    container.addEventListener("wheel", this.onWheel, { passive: false })
    container.addEventListener("touchstart", this.onTouchStart, { passive: true })
    container.addEventListener("touchmove", this.onTouchMove, { passive: false })
    container.addEventListener("touchend", this.onTouchEnd, { passive: true })
  }

  private isAtTop(): boolean {
    // At the first project (nearest Z) and scroll is settled
    const threshold = 0.5
    return this.camera.position.z >= this.maxCameraZ - threshold &&
      Math.abs(this.velocity) < SNAP_VELOCITY_THRESHOLD
  }

  private isAtBottom(): boolean {
    // At the last project (deepest Z) and scroll is settled
    const threshold = 0.5
    return this.camera.position.z <= this.minCameraZ + threshold &&
      Math.abs(this.velocity) < SNAP_VELOCITY_THRESHOLD
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
    if ((SCROLL_TO_WORLD_FACTOR as number) === 0) return 0
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

    // Snap to viewing position (plane Z + offset), not the plane itself
    const targetZ = this.gallery.getPlaneZ(nearestIndex)
    const viewingOffset = nearestIndex === 0 ? FIRST_PLANE_VIEW_OFFSET : LAST_PLANE_VIEW_OFFSET
    const snapCameraZ = targetZ + viewingOffset
    this.scrollTarget = this.scrollFromCameraZ(
      THREE.MathUtils.clamp(snapCameraZ, this.minCameraZ, this.maxCameraZ)
    )
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
      this.scrollCurrent = this.scrollTarget
    } else {
      const smoothing = this.isSnapping ? SNAP_SMOOTHING : SCROLL_SMOOTHING
      this.scrollCurrent = THREE.MathUtils.lerp(
        this.scrollCurrent,
        this.scrollTarget,
        smoothing
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
    if (this.container) {
      this.container.removeEventListener("wheel", this.onWheel)
      this.container.removeEventListener("touchstart", this.onTouchStart)
      this.container.removeEventListener("touchmove", this.onTouchMove)
      this.container.removeEventListener("touchend", this.onTouchEnd)
      this.container = null
    }
  }
}
