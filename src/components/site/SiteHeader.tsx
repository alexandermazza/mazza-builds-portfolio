"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
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

  return (
    <>
      {/* the home page's scene runs under a fixed bar, as in its mockup; other pages scroll it away */}
      <header className={pathname === "/" ? `${styles.bar} ${styles.over}` : styles.bar}>
        <TransitionLink href="/" className={styles.mark}>
          Mazza Builds
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
              Mazza Builds
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
