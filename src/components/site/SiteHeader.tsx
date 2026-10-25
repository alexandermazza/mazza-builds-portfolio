"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { TransitionLink } from "@/transitions";
import { lockOverflow, unlockOverflow } from "@/lib/overflow-lock";
import styles from "./SiteHeader.module.css";

const NAV = [
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];
const MENU = [{ href: "/", label: "Home" }, ...NAV];

function current(pathname: string, href: string) {
  const on = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  return on ? "page" : undefined;
}

export function SiteHeader() {
  const pathname = usePathname();
  const home = pathname === "/";
  const bar = useRef<HTMLElement>(null);
  // remembering which page the menu opened on closes it on any route change, Back included
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const menuButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);

  const close = () => {
    setOpenOn(null);
    menuButton.current?.focus();
  };

  useEffect(() => {
    const panel = dialog.current;
    if (!open || !panel) return;
    lockOverflow();
    const focusable = () => [...panel.querySelectorAll<HTMLElement>("a, button")];
    focusable()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenOn(null);
        menuButton.current?.focus();
      } else if (e.key === "Tab") {
        const items = focusable();
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      unlockOverflow();
    };
  }, [open]);

  // the hero already shows the logo, so on the home page the bar's waits for the point where the stage swaps the
  // hero logo for the intro's hammer (onScroll in home/stage/index.ts); an attribute, so scrolling never re-renders
  useEffect(() => {
    if (!home) return;
    const onScroll = () => {
      const intro = document.getElementById("intro");
      const hero = !!intro && intro.getBoundingClientRect().top >= innerHeight * (innerWidth < 820 ? 0.85 : 0.5);
      bar.current?.toggleAttribute("data-hero", hero);
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
    };
  }, [home]);

  return (
    <>
      {/* the home page's scene runs under a fixed bar, as in its mockup; other pages scroll it away */}
      <header ref={bar} className={home ? `${styles.bar} ${styles.over}` : styles.bar} data-hero={home ? "" : undefined}>
        <TransitionLink href="/" className={styles.mark}>
          <Image src="/logo-mark.png" alt="Mazza Builds" width={36} height={36} />
        </TransitionLink>
        <nav className={styles.nav} aria-label="Main">
          {NAV.map((item) => (
            <TransitionLink
              key={item.href}
              href={item.href}
              className={styles.link}
              aria-current={current(pathname, item.href)}
            >
              {item.label}
            </TransitionLink>
          ))}
        </nav>
        <button
          ref={menuButton}
          type="button"
          className={`${styles.button} ${styles.menuButton}`}
          aria-expanded={open}
          onClick={() => setOpenOn(pathname)}
        >
          Menu
        </button>
      </header>

      {open && (
        <div ref={dialog} className={styles.menu} role="dialog" aria-modal="true" aria-label="Menu">
          <div className={styles.menuTop}>
            <span className={styles.mark} aria-hidden="true">
              <Image src="/logo-mark.png" alt="" width={36} height={36} />
            </span>
            <button type="button" className={styles.button} onClick={close}>
              Close
            </button>
          </div>
          <ul className={styles.menuList}>
            {MENU.map((item, i) => (
              <li key={item.href} style={{ "--i": i } as CSSProperties}>
                <TransitionLink
                  href={item.href}
                  aria-current={current(pathname, item.href)}
                  onClick={() => setOpenOn(null)}
                >
                  {item.label}
                </TransitionLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
