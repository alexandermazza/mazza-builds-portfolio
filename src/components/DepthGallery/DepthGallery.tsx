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
