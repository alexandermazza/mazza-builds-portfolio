"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import type { PlaneSky as Plane } from "./plane";
import styles from "./ContactNote.module.css";

// The particle paper plane beside the note. charge is the share of fields filled in (0 to 1); sent launches it into the check.
export function PlaneSky({ charge, sent }: { charge: number; sent: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const plane = useRef<Plane | null>(null);
  const latest = useRef({ charge, sent });

  useEffect(() => {
    latest.current = { charge, sent };
  });

  useEffect(() => {
    let gone = false;
    // three.js loads after the page, so it never runs on the server or holds up the note
    import("./plane").then(({ mountPlane }) => {
      if (gone || !canvas.current || !box.current) return;
      plane.current = mountPlane(canvas.current, box.current);
      plane.current.setCharge(latest.current.charge);
      if (latest.current.sent) plane.current.launch();
    });
    return () => {
      gone = true;
      plane.current?.dispose();
      plane.current = null;
    };
  }, []);

  useEffect(() => plane.current?.setCharge(charge), [charge]);
  useEffect(() => (sent ? plane.current?.launch() : plane.current?.reset()), [sent]);

  const ready = charge === 1;
  return (
    <div ref={box} className={`${styles.sky} ${styles.rise}`} style={{ "--d": 2 } as CSSProperties} aria-hidden="true">
      <canvas ref={canvas} id="sky" />
      <p className={ready ? `${styles.skyCap} ${styles.ready}` : styles.skyCap} id="sky-cap">
        {sent ? "Sent" : ready ? "Ready to fly" : "Fill it in to launch"}
      </p>
    </div>
  );
}
