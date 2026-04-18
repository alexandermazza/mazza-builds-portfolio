"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap, ENTER_EASE } from "@/lib/gsap";
import { MagneticField } from "./MagneticField";
import { SplitFlapText } from "./SplitFlapText";
import { lockOverflow, unlockOverflow } from "@/lib/overflow-lock";

// ─── Types ────────────────────────────────────────────

type BootLine =
  | { type: "text"; text: string }
  | {
      type: "bar";
      prefix: string;
      barWidth: number;
      suffix: string;
      pauseAt?: number;
      suffixAccent?: boolean;
    }
  | {
      type: "dots";
      prefix: string;
      dotCount: number;
      suffix: string;
      suffixAccent?: boolean;
      pauseMs?: number;
    };

// ─── Boot sequence content ────────────────────────────

const BOOT_LINES: BootLine[] = [
  { type: "text", text: "> claude-code v4.6 initialized" },
  { type: "text", text: "> loading workspace: mazza-builds-portfolio" },
  {
    type: "bar",
    prefix: "> scanning project structure ",
    barWidth: 10,
    suffix: " 47 files found",
  },
  { type: "text", text: "> compiling next.js app router" },
  { type: "text", text: "> registering fonts: Space Grotesk, Space Mono" },
  {
    type: "bar",
    prefix: "> applying design tokens ",
    barWidth: 16,
    suffix: " nothing-os-theme",
    suffixAccent: true,
  },
  {
    type: "bar",
    prefix: "> mounting components ",
    barWidth: 16,
    suffix: " 12/12",
  },
  {
    type: "bar",
    prefix: "> fetching projects ",
    barWidth: 10,
    suffix: " 10 loaded",
    pauseAt: 0.6,
  },
  {
    type: "bar",
    prefix: "> initializing gsap scroll engine ",
    barWidth: 16,
    suffix: " OK",
    suffixAccent: true,
  },
  { type: "text", text: "> three.js renderer: WebGL 2.0" },
  {
    type: "dots",
    prefix: "> until you're part of the turbo team",
    dotCount: 15,
    suffix: " walk-slowly.",
    suffixAccent: false,
    pauseMs: 400,
  },
  {
    type: "bar",
    prefix: "> bundling assets ",
    barWidth: 16,
    suffix: " 247kb gzipped",
  },
  {
    type: "bar",
    prefix: "> deploying to production ",
    barWidth: 10,
    suffix: "",
  },
  {
    type: "bar",
    prefix: "> deploy complete ",
    barWidth: 16,
    suffix: " launching.",
    suffixAccent: true,
  },
];

// ─── Timing constants ─────────────────────────────────

const SCRAMBLE_CHARS = "01!<>{}[]/=_";
const FIRST_LINE_DURATION = 0.28;
const LAST_LINE_DURATION = 0.056;
const BAR_FILL_DURATION = 0.21;
const HOLD_DURATION = 0.28;
const REVEAL_SCALE_DURATION = 0.21;
function getLineDuration(index: number, total: number): number {
  const t = index / (total - 1);
  return FIRST_LINE_DURATION - (FIRST_LINE_DURATION - LAST_LINE_DURATION) * t;
}

// ─── Component ────────────────────────────────────────

const HERO_TEXT = "MAZZA BUILDS";
const HERO_CHARS = HERO_TEXT.split("");

const SESSION_KEY = "mazza-boot-v1";

export function TerminalHero() {
  const bootRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const [mounted, setMounted] = useState(false);
  const [heroActive, setHeroActive] = useState(false);
  const [showField, setShowField] = useState(false);
  const mobileH1Ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const isRepeatVisit = sessionStorage.getItem(SESSION_KEY) === "1";
    const isMobile = window.matchMedia("(max-width: 767px)").matches;

    lockOverflow();

    // ── Reduced motion path ───────────────────────
    if (reducedMotion) {
      BOOT_LINES.forEach((line, i) => {
        const el = lineRefs.current[i];
        if (!el) return;
        el.style.opacity = "1";

        if (line.type === "text") {
          const textEl = el.querySelector<HTMLElement>("[data-text]");
          if (textEl) textEl.textContent = line.text;
        }

        if (line.type === "bar" || line.type === "dots") {
          const prefixEl = el.querySelector<HTMLElement>("[data-prefix]");
          if (prefixEl) prefixEl.textContent = line.prefix;
        }

        if (line.type === "bar") {
          const filledEl = el.querySelector<HTMLElement>("[data-bar-filled]");
          const emptyEl = el.querySelector<HTMLElement>("[data-bar-empty]");
          if (filledEl) filledEl.textContent = "█".repeat(line.barWidth);
          if (emptyEl) emptyEl.textContent = "";
        }

        if (line.type === "dots") {
          const dotsEl = el.querySelector<HTMLElement>("[data-dots]");
          if (dotsEl) {
            dotsEl.textContent = ".".repeat(line.dotCount);
          }
        }

        const suffixEl = el.querySelector<HTMLElement>("[data-suffix]");
        if (suffixEl) suffixEl.style.opacity = "1";
      });

      const timeout = setTimeout(() => {
        unlockOverflow();
        if (bootRef.current) {
          bootRef.current.style.opacity = "0";
          bootRef.current.style.display = "none";
        }
        if (revealRef.current) {
          revealRef.current.style.opacity = "1";
        }
        setShowField(true);
        // Show logo, letters and tagline instantly
        if (logoRef.current) {
          logoRef.current.style.opacity = "1";
        }
        charRefs.current.forEach((el) => {
          if (el) el.style.opacity = "1";
        });
        if (mobileH1Ref.current) {
          mobileH1Ref.current.style.opacity = "1";
        }
        setHeroActive(true);
        if (taglineRef.current) {
          taglineRef.current.style.opacity = "1";
        }
        if (arrowRef.current) {
          arrowRef.current.style.opacity = "1";
        }
      }, 1000);

      return () => {
        clearTimeout(timeout);
        unlockOverflow();
      };
    }

    // Mark as seen so re-entries skip the full boot (placed after
    // reduced-motion early-return so that path never sets this flag)
    sessionStorage.setItem(SESSION_KEY, "1");

    // ── Repeat-visit fast path: skip boot, quick hero reveal ──
    if (isRepeatVisit) {
      if (bootRef.current) {
        bootRef.current.style.opacity = "0";
        bootRef.current.style.display = "none";
      }
      if (revealRef.current) {
        revealRef.current.style.opacity = "1";
      }
      setShowField(true);

      const tl = gsap.timeline();
      tlRef.current = tl;

      // Logo drops in with a slight rotation
      if (logoRef.current) {
        tl.fromTo(
          logoRef.current,
          { y: -40, opacity: 0, rotation: -15, scale: 0.8 },
          {
            y: 0,
            opacity: 1,
            rotation: 0,
            scale: 1,
            duration: 0.5,
            ease: ENTER_EASE,
          }
        );
      }

      if (isMobile) {
        if (mobileH1Ref.current) {
          tl.set(mobileH1Ref.current, { opacity: 1 }, "-=0.3");
          tl.call(() => { setHeroActive(true); });
        }
      } else {
        const validChars = charRefs.current.filter(Boolean) as HTMLSpanElement[];
        tl.fromTo(
          validChars,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.4,
            stagger: 0.03,
            ease: ENTER_EASE,
          },
          "-=0.3"
        );
      }

      if (taglineRef.current) {
        tl.to(taglineRef.current, {
          opacity: 1,
          duration: 0.4,
          ease: ENTER_EASE,
        }, "-=0.15");
      }

      if (arrowRef.current) {
        tl.to(arrowRef.current, {
          opacity: 1,
          duration: 0.5,
          ease: ENTER_EASE,
        }, "-=0.1");
      }

      tl.call(() => { unlockOverflow(); });

      return () => {
        tl.kill();
        unlockOverflow();
      };
    }

    // ── Animated path ─────────────────────────────
    const tl = gsap.timeline();
    tlRef.current = tl;

    BOOT_LINES.forEach((line, i) => {
      const el = lineRefs.current[i];
      if (!el) return;

      const dur = getLineDuration(i, BOOT_LINES.length);

      // Make line visible
      tl.set(el, { opacity: 1 });

      if (line.type === "text") {
        const textEl = el.querySelector("[data-text]");
        if (textEl) {
          if (isMobile) {
            tl.call(() => { (textEl as HTMLElement).textContent = line.text; });
            tl.to({}, { duration: dur * 0.5 });
          } else {
            tl.to(textEl, {
              duration: dur,
              scrambleText: {
                text: line.text,
                chars: SCRAMBLE_CHARS,
                speed: 0.4,
              },
            });
          }
        }
      } else if (line.type === "bar") {
        const prefixEl = el.querySelector<HTMLElement>("[data-prefix]");
        const filledEl = el.querySelector<HTMLElement>("[data-bar-filled]");
        const emptyEl = el.querySelector<HTMLElement>("[data-bar-empty]");
        const suffixEl = el.querySelector<HTMLElement>("[data-suffix]");
        const width = line.barWidth;
        const fillDur = BAR_FILL_DURATION;

        // Prefix
        if (prefixEl) {
          if (isMobile) {
            tl.call(() => { prefixEl.textContent = line.prefix; });
          } else {
            tl.to(prefixEl, {
              duration: dur * 0.4,
              scrambleText: {
                text: line.prefix,
                chars: SCRAMBLE_CHARS,
                speed: 0.4,
              },
            });
          }
        }

        // Fill bar (with optional mid-fill pause)
        if (filledEl && emptyEl) {
          if (line.pauseAt) {
            const target = { p: 0 };
            tl.to(target, {
              p: line.pauseAt,
              duration: fillDur * line.pauseAt,
              ease: "none",
              onUpdate() {
                const filled = Math.floor(target.p * width);
                filledEl.textContent = "█".repeat(filled);
                emptyEl.textContent = "░".repeat(width - filled);
              },
            });
            tl.to({}, { duration: 0.21 });
            tl.to(target, {
              p: 1,
              duration: fillDur * (1 - line.pauseAt),
              ease: "none",
              onUpdate() {
                const filled = Math.floor(target.p * width);
                filledEl.textContent = "█".repeat(filled);
                emptyEl.textContent = "░".repeat(width - filled);
              },
            });
          } else {
            const target = { p: 0 };
            tl.to(target, {
              p: 1,
              duration: fillDur,
              ease: "none",
              onUpdate() {
                const filled = Math.floor(target.p * width);
                filledEl.textContent = "█".repeat(filled);
                emptyEl.textContent = "░".repeat(width - filled);
              },
            });
          }
        }

        // Show suffix
        if (suffixEl && line.suffix) {
          tl.to(suffixEl, { opacity: 1, duration: 0.1 });
        }
      } else if (line.type === "dots") {
        const prefixEl = el.querySelector<HTMLElement>("[data-prefix]");
        const dotsEl = el.querySelector<HTMLElement>("[data-dots]");
        const suffixEl = el.querySelector<HTMLElement>("[data-suffix]");

        // Prefix
        if (prefixEl) {
          if (isMobile) {
            tl.call(() => { prefixEl.textContent = line.prefix; });
          } else {
            tl.to(prefixEl, {
              duration: dur * 0.4,
              scrambleText: {
                text: line.prefix,
                chars: SCRAMBLE_CHARS,
                speed: 0.4,
              },
            });
          }
        }

        // Extend dots one by one
        if (dotsEl) {
          const dotTarget = { count: 0 };
          tl.to(dotTarget, {
            count: line.dotCount,
            duration: 0.35,
            ease: "none",
            onUpdate() {
              dotsEl.textContent = ".".repeat(Math.floor(dotTarget.count));
            },
          });
        }

        // Pause before suffix
        if (line.pauseMs) {
          tl.to({}, { duration: (line.pauseMs / 1000) * 0.7 });
        }

        // Show suffix
        if (suffixEl) {
          tl.to(suffixEl, { opacity: 1, duration: 0.1 });
        }
      }
    });

    // Hold on "launching." then hard cut to reveal
    tl.to({}, { duration: HOLD_DURATION });

    // Reveal: instant cut
    tl.set(bootRef.current, { opacity: 0, display: "none" });
    tl.set(revealRef.current, { opacity: 1 });
    tl.call(() => { setShowField(true); });

    // Logo slams in with rotation and scale
    if (logoRef.current) {
      tl.fromTo(
        logoRef.current,
        { y: -60, opacity: 0, rotation: -20, scale: 0.6 },
        {
          y: 0,
          opacity: 1,
          rotation: 0,
          scale: 1,
          duration: 0.6,
          ease: ENTER_EASE,
        }
      );
    }

    if (isMobile) {
      // Mobile: trigger SplitFlapText on enter
      if (mobileH1Ref.current) {
        tl.set(mobileH1Ref.current, { opacity: 1 }, "-=0.3");
        tl.call(() => { setHeroActive(true); });
      }
    } else {
      // Letter stagger from below + scramble per character
      const validChars = charRefs.current.filter(Boolean) as HTMLSpanElement[];
      tl.fromTo(
        validChars,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.04,
          ease: ENTER_EASE,
        },
        "-=0.3"
      );

      // ScrambleText each letter (overlaps with the stagger)
      validChars.forEach((charEl, i) => {
        const finalChar = HERO_CHARS[i];
        if (finalChar === " ") return; // skip spaces
        tl.to(
          charEl,
          {
            duration: 0.3,
            scrambleText: {
              text: finalChar,
              chars: SCRAMBLE_CHARS,
              speed: 0.6,
            },
          },
          `-=${0.4 + (validChars.length - 1 - i) * 0.04}` // overlap with stagger
        );
      });
    }

    // Tagline fades in after headline settles
    if (taglineRef.current) {
      tl.to(taglineRef.current, {
        opacity: 1,
        duration: 0.4,
        ease: ENTER_EASE,
      });
    }

    // Scroll arrow fades in last
    if (arrowRef.current) {
      tl.to(arrowRef.current, {
        opacity: 1,
        duration: 0.5,
        ease: ENTER_EASE,
      });
    }

    tl.call(() => { unlockOverflow(); });

    return () => {
      tl.kill();
      unlockOverflow();
    };
  }, []);

  return (
    <section className="relative h-screen w-full">
      {/* Boot overlay — fixed, covers everything including nav */}
      <div
        ref={bootRef}
        className="fixed inset-0 z-[9999] flex items-center bg-[var(--black)]"
      >
        <div className="mx-auto w-full max-w-[640px] px-4 sm:px-[var(--space-lg)]">
          {BOOT_LINES.map((line, i) => (
            <div
              key={i}
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              className="font-mono text-[clamp(10px,2.5vw,13px)] leading-[1.8] text-[var(--text-secondary)]"
              style={{ opacity: 0 }}
            >
              {line.type === "text" && <span data-text>&nbsp;</span>}
              {line.type === "bar" && (
                <>
                  <span data-prefix>&nbsp;</span>
                  <span data-bar data-bar-width={line.barWidth}>
                    [<span data-bar-filled className="text-[var(--accent)]"></span><span data-bar-empty>{"░".repeat(line.barWidth)}</span>]
                  </span>
                  <span
                    data-suffix
                    className={
                      line.suffixAccent ? "text-[var(--accent)]" : ""
                    }
                    style={{ opacity: 0 }}
                  >
                    {line.suffix}
                  </span>
                </>
              )}
              {line.type === "dots" && (
                <>
                  <span data-prefix>&nbsp;</span>
                  <span data-dots data-dot-count={line.dotCount} />
                  <span
                    data-suffix
                    className={
                      line.suffixAccent ? "text-[var(--accent)]" : ""
                    }
                    style={{ opacity: 0 }}
                  >
                    {line.suffix}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Hero text — revealed after boot completes */}
      <div
        ref={revealRef}
        className="relative flex h-full items-center justify-center text-center"
        style={{ opacity: 0 }}
      >
        {/* Stable wrapper prevents hydration mismatch during HMR */}
        <div className="absolute inset-0 h-full w-full">
          {showField && <MagneticField />}
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <div
            ref={logoRef}
            className="mb-[var(--space-lg)]"
            style={{ opacity: 0 }}
          >
            <Image
              src="/logo.png"
              alt="Mazza Builds logo"
              width={120}
              height={116}
              priority
              className="h-[clamp(80px,15vw,120px)] w-auto"
            />
          </div>
          {/* Desktop H1 — GSAP scramble text */}
          <h1 className="hidden md:block font-sans text-[clamp(48px,12vw,96px)] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]">
            {HERO_CHARS.map((char, i) => (
              <span
                key={i}
                ref={(el) => {
                  charRefs.current[i] = el;
                }}
                className="inline-block"
                style={{ opacity: 0 }}
              >
                {char === " " ? "\u00A0" : char}
              </span>
            ))}
          </h1>
          {/* Mobile H1 — SplitFlapText on enter */}
          <h1
            ref={mobileH1Ref}
            className="md:hidden font-sans text-[clamp(48px,12vw,96px)] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]"
            style={{ opacity: 0 }}
          >
            <SplitFlapText isActive={heroActive} staggerMs={35}>
              {HERO_TEXT}
            </SplitFlapText>
          </h1>
          <p
            ref={taglineRef}
            className="mt-[var(--space-md)] font-sans text-[clamp(16px,2.5vw,24px)] text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            building things that work
          </p>
        </div>

        {/* Scroll arrow — client-only to avoid Turbopack hydration mismatch */}
        {mounted && (
          <div
            ref={arrowRef}
            className="absolute bottom-[var(--space-xl)] left-1/2 -translate-x-1/2 animate-[bounce-subtle_2s_ease-in-out_infinite] cursor-pointer"
            style={{ opacity: 0 }}
            onClick={() => {
              window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-display)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        )}
      </div>
    </section>
  );
}
