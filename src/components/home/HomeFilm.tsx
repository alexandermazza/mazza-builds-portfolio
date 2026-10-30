"use client";

import { useEffect, useRef } from "react";
import styles from "./Home.module.css";

// iPhone Safari can't put an element fullscreen, only a video, through a method of its own
type IOSVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

/** A project's film under its copy: it plays while it's on screen, and a click opens it fullscreen. */
export function HomeFilm({ src, poster, name }: { src: string; poster?: string; name: string }) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = video.current!;
    const offFull = () => { if (!document.fullscreenElement) v.controls = false; };
    document.addEventListener("fullscreenchange", offFull);
    // it plays on its own only without reduced motion; otherwise the poster stays
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return () => document.removeEventListener("fullscreenchange", offFull);
    v.muted = true;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && e.intersectionRatio >= 0.35) v.play().catch(() => {}); else v.pause(); },
      { threshold: [0, 0.35] },
    );
    io.observe(v);
    return () => {
      io.disconnect();
      document.removeEventListener("fullscreenchange", offFull);
    };
  }, []);

  function open() {
    const v: IOSVideo = video.current!;
    if (v.requestFullscreen) {
      v.controls = true;
      v.requestFullscreen().catch(() => { v.controls = false; });
    } else v.webkitEnterFullscreen?.();
  }

  return (
    <button type="button" className={styles.film} onClick={open} aria-label={`Watch the ${name} film`}>
      <video ref={video} src={src} poster={poster} muted loop playsInline preload="metadata" />
    </button>
  );
}
