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
  private disposed = false
  private onActivePlaneChange: (index: number) => void
  private lastActivePlaneIndex = -1

  private container: HTMLElement

  constructor(
    canvas: HTMLCanvasElement,
    container: HTMLElement,
    projects: GalleryProject[],
    onActivePlaneChange: (index: number) => void,
    reducedMotion: boolean
  ) {
    this.canvas = canvas
    this.container = container
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

    if (this.disposed) return

    this.gallery.setPreloadedTextures(loadedTextures)
    this.gallery.init(this.scene, projects)
    this.gallery.applyTextures()
    this.scroll.init()
    this.resize()

    // Give scroll the section ref so it can read scroll progress from getBoundingClientRect
    this.scroll.bindEvents(this.container)
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
    this.disposed = true
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
