"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Home.module.css";

/** The fixed particle stage behind the homepage, plus the scroll reveals. The page's copy is the children. */
export function HomeStage({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current!;
    el.setAttribute("data-js", "");
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add(styles.in);
          io.unobserve(e.target);
        }
      }),
      { threshold: 0.2 },
    );
    el.querySelectorAll(`.${styles.reveal}`).forEach((r) => io.observe(r));
    return () => io.disconnect();
  }, []);

  // A fresh canvas per mount, on body: outside the transition container, so the transition's idle snapshots never
  // read back a full-screen WebGL frame, and never one whose context an earlier mount already released. First in body,
  // so the page paints above it with no z-index of its own (one would stop the films blending with it).
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.className = styles.stage;
    canvas.setAttribute("aria-hidden", "true");
    document.body.prepend(canvas);
    let dispose: (() => void) | undefined;
    let gone = false;
    import("./stage")
      .then(({ mountHomeStage }) => {
        if (!gone) dispose = mountHomeStage(canvas, root.current!);
      })
      .catch(() => {});
    return () => {
      gone = true;
      dispose?.();
      canvas.remove();
    };
  }, []);

  return (
    <main ref={root} className={styles.root}>
      {children}
    </main>
  );
}
