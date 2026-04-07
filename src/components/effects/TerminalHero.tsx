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
    // Animation will be added in Task 2
    return () => {
      tlRef.current?.kill();
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
