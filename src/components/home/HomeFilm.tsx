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
    v.muted = true;
    // it plays on its own only without reduced motion; otherwise the poster stays
    const io = matchMedia("(prefers-reduced-motion: reduce)").matches
      ? null
      : new IntersectionObserver(
          ([e]) => { if (e.isIntersecting && e.intersectionRatio >= 0.35) v.play().catch(() => {}); else v.pause(); },
          { threshold: [0, 0.35] },
        );
    io?.observe(v);
    // back from fullscreen, decide afresh: re-observing re-runs the on-screen check, and reduced motion means paused
    const back = () => {
      if (document.fullscreenElement === v) return;
      v.controls = false;
      if (io) { io.unobserve(v); io.observe(v); } else v.pause();
    };
    document.addEventListener("fullscreenchange", back);
    v.addEventListener("webkitendfullscreen", back); // iPhone's own player
    return () => {
      io?.disconnect();
      document.removeEventListener("fullscreenchange", back);
      v.removeEventListener("webkitendfullscreen", back);
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
