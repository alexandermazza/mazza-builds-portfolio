"use client";

import { useEffect, useRef, useState } from "react";
import { PlatformIcon } from "@/components/site/PlatformIcon";
import styles from "./About.module.css";

const EMAIL = "hello@mazzabuilds.com";
const LINKS = [
  { name: "github", label: "GitHub", handle: "alexandermazza", href: "https://github.com/alexandermazza" },
  { name: "linkedin", label: "LinkedIn", handle: "in/alexander-mazza", href: "https://www.linkedin.com/in/alexander-mazza/" },
  { name: "x", label: "X", handle: "@mazza_builds", href: "https://twitter.com/mazza_builds" },
] as const;

export function Connections() {
  const [copy, setCopy] = useState("Copy");
  const address = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopy("Copied");
    } catch {
      // no clipboard access: select the address so it can be copied by hand
      const range = document.createRange();
      if (address.current) range.selectNodeContents(address.current);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
      setCopy("Selected");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopy("Copy"), 1800);
  };

  return (
    <ul className={styles.links}>
      {LINKS.map((link) => (
        <li key={link.name}>
          <a href={link.href} target="_blank" rel="noopener">
            <PlatformIcon name={link.name} className={styles.plat} />
            <b>{link.label}</b>
            <span className={styles.handle}>{link.handle}</span>
            <span className={styles.arr} aria-hidden="true">
              ↗
            </span>
          </a>
        </li>
      ))}
      <li>
        <div className={styles.row}>
          <PlatformIcon name="email" className={styles.plat} />
          <b>Email</b>
          <span ref={address} className={styles.addr}>
            {EMAIL}
          </span>
          <button type="button" className={styles.copy} onClick={onCopy}>
            {copy}
          </button>
        </div>
      </li>
    </ul>
  );
}
