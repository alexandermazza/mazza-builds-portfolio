"use client";

import { useEffect, useRef } from "react";
import { gsap, ENTER_EASE } from "@/lib/gsap";

// ─── Types ────────────────────────────────────────────

type BootLine =
  | { type: "text"; text: string }
  | {
      type: "bar";
      prefix: string;
      barWidth: number;
      suffix: string;
      pauseAt?: number;
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
    suffix: " 4 loaded",
    pauseAt: 0.6,
  },
  {
    type: "bar",
    prefix: "> initializing gsap scroll engine ",
    barWidth: 16,
    suffix: " OK",
  },
  { type: "text", text: "> three.js renderer: WebGL 2.0" },
  {
    type: "dots",
    prefix: "> running vibe check",
    dotCount: 15,
    suffix: " PASSED",
    suffixAccent: true,
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
  },
];

// ─── Timing constants ─────────────────────────────────

const SCRAMBLE_CHARS = "01!<>{}[]/=_";
const FIRST_LINE_DURATION = 0.4;
const LAST_LINE_DURATION = 0.08;
const BAR_FILL_DURATION = 0.3;
const HOLD_DURATION = 0.4;
const REVEAL_SCALE_DURATION = 0.3;
const REPEAT_SPEED = 2.5;

function getLineDuration(index: number, total: number): number {
  const t = index / (total - 1);
  return FIRST_LINE_DURATION - (FIRST_LINE_DURATION - LAST_LINE_DURATION) * t;
}

// ─── Component ────────────────────────────────────────

export function TerminalHero() {
  const bootRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const isRepeatVisit = sessionStorage.getItem("hero-seen") === "true";
    const speed = isRepeatVisit ? REPEAT_SPEED : 1;

    // ── Reduced motion path ───────────────────────
    if (reducedMotion) {
      lineRefs.current.forEach((el) => {
        if (!el) return;
        el.style.opacity = "1";
        // Show final text for text lines
        const textEl = el.querySelector<HTMLElement>("[data-text]");
        if (textEl) {
          const lineData = BOOT_LINES[lineRefs.current.indexOf(el)];
          if (lineData?.type === "text") textEl.textContent = lineData.text;
        }
        // Show final prefix for bar/dots lines
        const prefixEl = el.querySelector<HTMLElement>("[data-prefix]");
        if (prefixEl) {
          const lineData = BOOT_LINES[lineRefs.current.indexOf(el)];
          if (lineData && "prefix" in lineData) prefixEl.textContent = lineData.prefix;
        }
        // Fill bars
        const barEl = el.querySelector<HTMLElement>("[data-bar]");
        if (barEl) {
          const width = Number(barEl.dataset.barWidth);
          barEl.textContent = "[" + "█".repeat(width) + "]";
        }
        // Show dots
        const dotsEl = el.querySelector<HTMLElement>("[data-dots]");
        if (dotsEl) {
          dotsEl.textContent = ".".repeat(Number(dotsEl.dataset.dotCount));
        }
        // Show suffixes
        const suffixEl = el.querySelector<HTMLElement>("[data-suffix]");
        if (suffixEl) suffixEl.style.opacity = "1";
      });

      const timeout = setTimeout(() => {
        if (bootRef.current) {
          bootRef.current.style.opacity = "0";
          bootRef.current.style.display = "none";
        }
        if (revealRef.current) {
          revealRef.current.style.opacity = "1";
        }
        sessionStorage.setItem("hero-seen", "true");
      }, 1000);

      return () => clearTimeout(timeout);
    }

    // ── Animated path ─────────────────────────────
    const tl = gsap.timeline();
    tlRef.current = tl;

    BOOT_LINES.forEach((line, i) => {
      const el = lineRefs.current[i];
      if (!el) return;

      const dur = getLineDuration(i, BOOT_LINES.length) / speed;

      // Make line visible
      tl.set(el, { opacity: 1 });

      if (line.type === "text") {
        const textEl = el.querySelector("[data-text]");
        if (textEl) {
          tl.to(textEl, {
            duration: dur,
            scrambleText: {
              text: line.text,
              chars: SCRAMBLE_CHARS,
              speed: 0.4,
            },
          });
        }
      } else if (line.type === "bar") {
        const prefixEl = el.querySelector<HTMLElement>("[data-prefix]");
        const barEl = el.querySelector<HTMLElement>("[data-bar]");
        const suffixEl = el.querySelector<HTMLElement>("[data-suffix]");
        const width = line.barWidth;
        const fillDur = BAR_FILL_DURATION / speed;

        // Scramble prefix
        if (prefixEl) {
          tl.to(prefixEl, {
            duration: dur * 0.4,
            scrambleText: {
              text: line.prefix,
              chars: SCRAMBLE_CHARS,
              speed: 0.4,
            },
          });
        }

        // Fill bar (with optional mid-fill pause)
        if (barEl) {
          if (line.pauseAt) {
            const target = { p: 0 };
            tl.to(target, {
              p: line.pauseAt,
              duration: fillDur * line.pauseAt,
              ease: "none",
              onUpdate() {
                const filled = Math.floor(target.p * width);
                barEl.textContent =
                  "[" + "█".repeat(filled) + "░".repeat(width - filled) + "]";
              },
            });
            tl.to({}, { duration: 0.3 / speed });
            tl.to(target, {
              p: 1,
              duration: fillDur * (1 - line.pauseAt),
              ease: "none",
              onUpdate() {
                const filled = Math.floor(target.p * width);
                barEl.textContent =
                  "[" + "█".repeat(filled) + "░".repeat(width - filled) + "]";
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
                barEl.textContent =
                  "[" + "█".repeat(filled) + "░".repeat(width - filled) + "]";
              },
            });
          }
        }

        // Show suffix
        if (suffixEl && line.suffix) {
          tl.to(suffixEl, { opacity: 1, duration: 0.1 / speed });
        }
      } else if (line.type === "dots") {
        const prefixEl = el.querySelector<HTMLElement>("[data-prefix]");
        const dotsEl = el.querySelector<HTMLElement>("[data-dots]");
        const suffixEl = el.querySelector<HTMLElement>("[data-suffix]");

        // Scramble prefix
        if (prefixEl) {
          tl.to(prefixEl, {
            duration: dur * 0.4,
            scrambleText: {
              text: line.prefix,
              chars: SCRAMBLE_CHARS,
              speed: 0.4,
            },
          });
        }

        // Extend dots one by one
        if (dotsEl) {
          const dotTarget = { count: 0 };
          tl.to(dotTarget, {
            count: line.dotCount,
            duration: 0.5 / speed,
            ease: "none",
            onUpdate() {
              dotsEl.textContent = ".".repeat(Math.floor(dotTarget.count));
            },
          });
        }

        // Pause before suffix
        if (line.pauseMs) {
          tl.to({}, { duration: line.pauseMs / 1000 / speed });
        }

        // Show suffix
        if (suffixEl) {
          tl.to(suffixEl, { opacity: 1, duration: 0.1 / speed });
        }
      }
    });

    // Hold on "launching." then hard cut to reveal
    tl.to({}, { duration: HOLD_DURATION / speed });

    // Reveal: instant cut
    tl.set(bootRef.current, { opacity: 0, display: "none" });
    tl.set(revealRef.current, { opacity: 1, scale: 1.02 });
    tl.to(revealRef.current, {
      scale: 1,
      duration: REVEAL_SCALE_DURATION,
      ease: ENTER_EASE,
    });

    // Mark as seen
    tl.call(() => sessionStorage.setItem("hero-seen", "true"));

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <section className="relative h-screen w-full">
      {/* Boot overlay — fixed, covers everything including nav */}
      <div
        ref={bootRef}
        className="fixed inset-0 z-[9999] flex items-center bg-[var(--black)]"
      >
        <div className="mx-auto w-full max-w-[640px] px-[var(--space-lg)]">
          {BOOT_LINES.map((line, i) => (
            <div
              key={i}
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              className="font-mono text-[13px] leading-[1.8] text-[var(--text-secondary)] whitespace-nowrap"
              style={{ opacity: 0 }}
            >
              {line.type === "text" && <span data-text>&nbsp;</span>}
              {line.type === "bar" && (
                <>
                  <span data-prefix>&nbsp;</span>
                  <span data-bar data-bar-width={line.barWidth}>
                    {"[" + "░".repeat(line.barWidth) + "]"}
                  </span>
                  <span data-suffix style={{ opacity: 0 }}>
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
        className="flex h-full items-center justify-center text-center"
        style={{ opacity: 0 }}
      >
        <div>
          <h1 className="font-sans text-[clamp(48px,12vw,96px)] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]">
            MAZZA BUILDS
          </h1>
          <p className="mt-[var(--space-md)] font-sans text-[clamp(16px,2.5vw,24px)] text-[var(--text-secondary)]">
            building things that work
          </p>
        </div>
      </div>
    </section>
  );
}
