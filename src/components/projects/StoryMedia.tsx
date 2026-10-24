"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Image from "next/image";
import type { Project } from "@/data/projects";
import { ProjectMark } from "./ProjectMark";
import styles from "./StoryPage.module.css";

export type MediaProject = Pick<
  Project,
  "name" | "video" | "poster" | "image" | "fill" | "markColor" | "textColor" | "mark" | "markScale"
>;

/** The story's media: the clip, else a screenshot, else the project's mark on its own colour. */
export function StoryMedia({ project: p }: { project: MediaProject }) {
  const video = useRef<HTMLVideoElement>(null);

  // the clip plays on its own only without reduced motion; otherwise the poster stays
  useEffect(() => {
    const el = video.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.muted = true;
    el.play().catch(() => {});
  }, []);

  if (p.video) {
    return (
      <div className={styles.media}>
        <video
          ref={video}
          src={p.video}
          poster={p.poster}
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={`${p.name} in use`}
        />
      </div>
    );
  }
  if (p.image) {
    return (
      <div className={styles.media}>
        <Image src={p.image} alt={`${p.name} screenshot`} fill sizes="100vw" loading="eager" />
      </div>
    );
  }
  const colours = { "--fill": p.fill, "--mk": p.markColor, "--txt": p.textColor } as CSSProperties;
  return (
    <div className={`${styles.media} ${styles.artField}`} style={colours}>
      <ProjectMark mark={p.mark} scale={p.markScale} className={styles.art} />
    </div>
  );
}
