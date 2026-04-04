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
