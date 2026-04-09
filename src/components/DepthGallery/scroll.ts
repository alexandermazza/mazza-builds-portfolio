import * as THREE from "three"
import type { Gallery } from "./gallery"
import type { ScrollState } from "./types"
import {
  SCROLL_SMOOTHING,
  VELOCITY_DAMPING,
  VELOCITY_MAX,
  VELOCITY_STOP_THRESHOLD,
  SNAP_VELOCITY_THRESHOLD,
  SNAP_IDLE_DELAY_MS,
  SNAP_SMOOTHING,
  FIRST_PLANE_VIEW_OFFSET,
} from "./types"

/**
 * Native-scroll-driven camera controller.
 *
 * Instead of hijacking wheel/touch events, the gallery section is made tall
 * enough to scroll through (100vh per project). A sticky canvas stays in view
 * while the user scrolls normally. This class reads the section's scroll
 * progress each frame and maps it to camera Z.
 */
export class Scroll {
  private camera: THREE.PerspectiveCamera
  private gallery: Gallery
  private reducedMotion: boolean
  private section: HTMLElement | null = null
  private sectionTop = 0
  private sectionHeight = 0
  private viewportHeight = 0

  // Camera range (set during init from gallery depth range)
  private cameraStartZ = 0
  private cameraEndZ = 0

  // Smoothed scroll progress (0..1)
  private targetProgress = 0
  private currentProgress = 0
  private previousProgress = 0

  // Velocity
  private rawVelocity = 0
  private velocity = 0
  private velocityMax = VELOCITY_MAX

  // Snap
  private lastScrollTime = 0
  private isSnapping = false
  private snapTimeoutId: ReturnType<typeof setTimeout> | null = null

  constructor(camera: THREE.PerspectiveCamera, gallery: Gallery, reducedMotion: boolean) {
    this.camera = camera
    this.gallery = gallery
    this.reducedMotion = reducedMotion
  }

  init() {
    const depthRange = this.gallery.getDepthRange()
    this.cameraStartZ = depthRange.nearestZ + FIRST_PLANE_VIEW_OFFSET
    this.cameraEndZ = depthRange.deepestZ + FIRST_PLANE_VIEW_OFFSET
    this.camera.position.z = this.cameraStartZ

    if (this.cameraEndZ > this.cameraStartZ) {
      this.cameraEndZ = this.cameraStartZ
    }
  }

  bindEvents(section: HTMLElement) {
    this.section = section
    this.cacheLayout()
  }

  /** Cache expensive layout reads — call on bind and on resize */
  cacheLayout() {
    if (!this.section) return
    const rect = this.section.getBoundingClientRect()
    this.sectionTop = rect.top + window.scrollY
    this.sectionHeight = this.section.offsetHeight
    this.viewportHeight = window.innerHeight
  }

  /** Read native scroll position and convert to 0..1 progress using cached layout */
  private readScrollProgress(): number {
    if (!this.section) return 0

    const scrolled = window.scrollY - this.sectionTop
    const scrollableDistance = this.sectionHeight - this.viewportHeight

    if (scrollableDistance <= 0) return 0
    return THREE.MathUtils.clamp(scrolled / scrollableDistance, 0, 1)
  }

  /** Map progress (0..1) to camera Z */
  private cameraZFromProgress(progress: number): number {
    return THREE.MathUtils.lerp(this.cameraStartZ, this.cameraEndZ, progress)
  }

  /** Map a plane index to a scroll progress value */
  private progressForPlane(index: number): number {
    const planeCount = this.gallery.getPlaneCount()
    if (planeCount <= 1) return 0
    return index / (planeCount - 1)
  }

  /** Snap to nearest project by scrolling the page */
  private trySnap() {
    if (this.isSnapping || !this.section) return

    // Don't snap when user is scrolling out of the section
    if (this.currentProgress <= 0.01 || this.currentProgress >= 0.99) return

    const planeCount = this.gallery.getPlaneCount()
    if (planeCount === 0) return

    // Find nearest plane to current progress
    let nearestIndex = 0
    let nearestDistance = Infinity

    for (let i = 0; i < planeCount; i++) {
      const planeProgress = this.progressForPlane(i)
      const distance = Math.abs(this.currentProgress - planeProgress)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = i
      }
    }

    // Already close enough
    if (nearestDistance < 0.02) return

    // Calculate the page scroll position for this plane
    const targetProgress = this.progressForPlane(nearestIndex)
    const scrollableDistance = this.sectionHeight - this.viewportHeight

    const targetScrollTop = this.sectionTop + targetProgress * scrollableDistance

    this.isSnapping = true
    window.scrollTo({ top: targetScrollTop, behavior: "smooth" })

    // Clear snapping flag after animation settles
    setTimeout(() => {
      this.isSnapping = false
    }, 500)
  }

  private scheduleSnap() {
    if (this.snapTimeoutId !== null) {
      clearTimeout(this.snapTimeoutId)
    }
    this.snapTimeoutId = setTimeout(() => {
      this.snapTimeoutId = null
      if (Math.abs(this.velocity) < SNAP_VELOCITY_THRESHOLD) {
        this.trySnap()
      }
    }, SNAP_IDLE_DELAY_MS)
  }

  getScrollState(): ScrollState {
    return {
      velocity: this.velocity,
      velocityMax: this.velocityMax,
      scrollCurrent: this.currentProgress,
    }
  }

  update() {
    this.targetProgress = this.readScrollProgress()

    if (this.reducedMotion) {
      this.currentProgress = this.targetProgress
    } else {
      const smoothing = this.isSnapping ? SNAP_SMOOTHING : SCROLL_SMOOTHING
      this.currentProgress = THREE.MathUtils.lerp(
        this.currentProgress,
        this.targetProgress,
        smoothing
      )
    }

    // Velocity
    this.rawVelocity = this.currentProgress - this.previousProgress
    this.velocity = THREE.MathUtils.lerp(this.velocity, this.rawVelocity, VELOCITY_DAMPING)
    this.velocity = THREE.MathUtils.clamp(this.velocity, -this.velocityMax, this.velocityMax)
    if (Math.abs(this.velocity) < VELOCITY_STOP_THRESHOLD) {
      this.velocity = 0
    }
    this.previousProgress = this.currentProgress

    // Apply to camera
    this.camera.position.z = this.cameraZFromProgress(this.currentProgress)

    // Schedule snap when velocity is settling
    if (Math.abs(this.rawVelocity) > 0.0001) {
      this.lastScrollTime = performance.now()
    }
    const timeSinceScroll = performance.now() - this.lastScrollTime
    if (timeSinceScroll > SNAP_IDLE_DELAY_MS && Math.abs(this.velocity) < SNAP_VELOCITY_THRESHOLD && !this.isSnapping) {
      this.scheduleSnap()
    }
  }

  dispose() {
    if (this.snapTimeoutId !== null) {
      clearTimeout(this.snapTimeoutId)
    }
    this.section = null
  }
}
