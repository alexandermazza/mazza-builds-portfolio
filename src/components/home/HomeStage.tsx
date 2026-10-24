"use client";

import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { useTransitionContext } from "@/transitions";
import type { buildConstellation } from "@/lib/constellation";
import type { StageItem } from "./stage";
import styles from "./Home.module.css";

interface HomeStageProps {
  items: StageItem[];
  links: ReturnType<typeof buildConstellation>;
  children: ReactNode;
}

/** The fixed particle stage behind the homepage, plus the scroll reveals. The page's copy is the children. */
export function HomeStage({ items, links, children }: HomeStageProps) {
  const root = useRef<HTMLElement>(null);
  const { navigate } = useTransitionContext();

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
  // read back a full-screen WebGL frame, and never one whose context an earlier mount already released.
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.className = styles.stage;
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    let dispose: (() => void) | undefined;
    let gone = false;
    import("./stage")
      .then(({ mountHomeStage }) => {
        if (!gone) dispose = mountHomeStage(canvas, root.current!, items, links);
      })
      .catch(() => {});
    return () => {
      gone = true;
      dispose?.();
      canvas.remove();
    };
  }, [items, links]);

  // the graph card's link is set by the stage, so it is a plain anchor; send it through the page transition
  const onClick = (e: MouseEvent) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>("#graph-card a");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(a.getAttribute("href")!);
  };

  return (
    <main ref={root} className={styles.root} onClick={onClick}>
      {children}
    </main>
  );
}
