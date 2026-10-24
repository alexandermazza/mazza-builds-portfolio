"use client";

import { useEffect, useRef } from "react";
import styles from "./About.module.css";

export function StreetMap() {
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let dispose: (() => void) | undefined;
    let gone = false;
    // the street data is 1.2MB, so it loads only once the map is within a viewport of the screen
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        Promise.all([fetch("/about/city.json").then((r) => r.json()), import("./map")])
          .then(([data, { mountStreetMap }]) => {
            if (!gone) dispose = mountStreetMap(el, data);
          })
          .catch(() => {
            el.hidden = true;
          });
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => {
      gone = true;
      io.disconnect();
      dispose?.();
    };
  }, []);

  return (
    <div ref={wrap} className={styles.map} id="map-wrap">
      <p className={styles.mapHint} data-hint="">
        Move across the map and the streets rise to meet you.
      </p>
    </div>
  );
}
