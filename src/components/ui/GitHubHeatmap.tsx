"use client";

import { type ComponentProps, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { DURATION, EASE_OUT_MOTION, LINE_REVEAL_STAGGER } from "@/lib/motion";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GitHubResponse {
  data: Array<{ date: string; count: number }>;
  meta: {
    totalContributions: number;
    activeDays: number;
    year: number;
  };
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  date: Date | null;
  count: number;
}

type Cell = { date: Date; inFuture: boolean };
type MonthLabel = { weekIndex: number; label: string };

export interface GitHubHeatmapProps extends Omit<ComponentProps<"div">, "children"> {
  compact?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = 7;

function getGridConfig(compact: boolean, isMobile: boolean) {
  if (isMobile) {
    // Smaller cells on mobile so full year fits without scrolling
    return { cellSize: 5, gap: 1, cellStep: 6, monthLabelHeight: 14, dayLabelWidth: 0 };
  }
  const cellSize = compact ? 6 : 10;
  const gap = compact ? 1 : 2;
  return {
    cellSize,
    gap,
    cellStep: cellSize + gap,
    monthLabelHeight: compact ? 14 : 16,
    dayLabelWidth: compact ? 0 : 28,
  };
}

const DAY_LABEL_ROWS: { index: number; label: string }[] = [
  { index: 1, label: "MON" },
  { index: 3, label: "WED" },
  { index: 5, label: "FRI" },
];

const MONTH_ABBREVS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function formatDateLabel(d: Date): string {
  return `${MONTH_ABBREVS[d.getMonth()]} ${d.getDate()}`;
}

function cellColor(count: number): string {
  if (count <= 0) return "rgba(255,255,255,0.06)";
  if (count <= 3) return "#0e4429";
  if (count <= 9) return "#006d32";
  if (count <= 19) return "#26a641";
  return "#39d353";
}

function toSunday(d: Date): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function buildGrid(today: Date): { start: Date; weeks: number } {
  const jan1 = new Date(today.getFullYear(), 0, 1);
  const dec31 = new Date(today.getFullYear(), 11, 31);
  const start = toSunday(jan1);
  const diffMs = dec31.getTime() - start.getTime();
  const weeks = Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  return { start, weeks };
}

function buildMobileGrid(today: Date): { start: Date; weeks: number } {
  const MOBILE_WEEKS = 20;
  const thisSunday = toSunday(today);
  const start = new Date(thisSunday);
  start.setDate(thisSunday.getDate() - (MOBILE_WEEKS - 1) * 7);
  return { start, weeks: MOBILE_WEEKS };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GitHubHeatmap({ className = "", compact = false, ...props }: GitHubHeatmapProps) {
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [countMap, setCountMap] = useState<Map<string, number>>(new Map());
  const [totalContributions, setTotalContributions] = useState(0);
  const [activeDays, setActiveDays] = useState(0);

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    date: null,
    count: 0,
  });

  const gridRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const gridInView = useInView(wrapperRef, { once: true, margin: "0px 0px -40px 0px" });

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const cfg = getGridConfig(compact, isMobile);

  // ── Fetch ────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/github");
        if (!res.ok) throw new Error("Non-OK response");
        const json: GitHubResponse = await res.json();
        if (cancelled) return;

        const map = new Map<string, number>();
        for (const entry of json.data) {
          map.set(entry.date, entry.count);
        }

        setCountMap(map);
        setTotalContributions(json.meta.totalContributions);
        setActiveDays(json.meta.activeDays);
        setStatus("done");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Grid geometry (memoized) ─────────────────────────────────────────────

  const { weeks, monthLabels, gridWidth, gridHeight } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { start: startDate, weeks: totalWeeks } = buildGrid(today);

    const w: Cell[][] = [];
    for (let wi = 0; wi < totalWeeks; wi++) {
      const week: Cell[] = [];
      for (let d = 0; d < DAYS; d++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + wi * 7 + d);
        week.push({ date, inFuture: date > today });
      }
      w.push(week);
    }

    const labels: MonthLabel[] = [];
    let lastMonth = -1;
    for (let wi = 0; wi < totalWeeks; wi++) {
      const firstDayOfWeek = w[wi][0].date;
      const month = firstDayOfWeek.getMonth();
      if (month !== lastMonth) {
        if (wi > 0 || firstDayOfWeek.getDate() <= 7) {
          labels.push({ weekIndex: wi, label: MONTH_ABBREVS[month] });
        }
        lastMonth = month;
      }
    }

    return {
      weeks: w,
      monthLabels: labels,
      gridWidth: totalWeeks * cfg.cellStep - cfg.gap,
      gridHeight: DAYS * cfg.cellStep - cfg.gap,
    };
  }, [cfg.cellStep, cfg.gap]);

  // ── Tooltip handlers ──────────────────────────────────────────────────────

  function handleCellMouseEnter(e: React.MouseEvent, cell: Cell, count: number) {
    if (cell.inFuture) return;
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      date: cell.date,
      count,
    });
  }

  function handleCellMouseMove(e: React.MouseEvent) {
    setTooltip((prev) => {
      if (!prev.visible) return prev;
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return prev;
      return { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top };
    });
  }

  function handleCellMouseLeave() {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }

  // ── Loading / Error states ────────────────────────────────────────────────

  const monoLabel =
    "font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--text-disabled)]";

  // ── Render (wrapper always mounted so useInView can observe) ─────────────

  return (
    <div ref={wrapperRef} className={className} {...props}>
      {status === "loading" && <span className={monoLabel}>[LOADING...]</span>}
      {status === "error" && <span className={monoLabel}>[GITHUB DATA UNAVAILABLE]</span>}
      {status !== "done" ? null : (<>
      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <div className={`flex gap-[var(--space-2xl)] ${compact || isMobile ? "mb-[var(--space-md)]" : "mb-[var(--space-2xl)]"}`}>
        <div>
          <div className={`font-sans leading-[1] tracking-[-0.02em] text-[var(--text-display)] ${compact || isMobile ? "text-[1.5rem]" : "text-[2.5rem]"}`}>
            {totalContributions}
          </div>
          <div className="mt-[var(--space-xs)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            CONTRIBUTIONS
          </div>
        </div>
        <div>
          <div className={`font-sans leading-[1] tracking-[-0.02em] text-[var(--text-display)] ${compact || isMobile ? "text-[1.5rem]" : "text-[2.5rem]"}`}>
            {activeDays}
          </div>
          <div className="mt-[var(--space-xs)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            DAYS ACTIVE
          </div>
        </div>
      </div>

      {/* ── Grid wrapper ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "row" }}>
        {/* Day labels column (hidden in compact mode and on mobile) */}
        {!compact && !isMobile && (
          <div
            style={{
              width: cfg.dayLabelWidth,
              marginTop: cfg.monthLabelHeight,
              flexShrink: 0,
              position: "relative",
              height: gridHeight,
            }}
          >
            {DAY_LABEL_ROWS.map(({ index, label }) => (
              <div
                key={label}
                className="font-mono text-[10px] uppercase text-[var(--text-secondary)]"
                style={{
                  position: "absolute",
                  top: index * cfg.cellStep,
                  right: 4,
                  lineHeight: `${cfg.cellSize}px`,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        )}

        {/* Grid + month labels */}
        <div style={{ position: "relative" }}>
          {/* Month labels */}
          <div
            style={{
              position: "relative",
              height: cfg.monthLabelHeight,
              width: gridWidth,
            }}
          >
            {monthLabels.map(({ weekIndex, label }) => (
              <div
                key={`${label}-${weekIndex}`}
                className={`font-mono uppercase text-[var(--text-secondary)] ${compact ? "text-[8px]" : "text-[10px]"}`}
                style={{
                  position: "absolute",
                  left: weekIndex * cfg.cellStep,
                  bottom: 2,
                  lineHeight: "1",
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Cell grid */}
          <div
            ref={gridRef}
            role="grid"
            aria-label="GitHub contributions heatmap for the current year"
            style={{
              position: "relative",
              width: gridWidth,
              height: gridHeight,
            }}
            onMouseMove={handleCellMouseMove}
            onMouseLeave={handleCellMouseLeave}
          >
            {weeks.map((week, wIdx) => (
              <motion.div
                key={wIdx}
                initial={{ opacity: 0 }}
                animate={gridInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{
                  duration: DURATION.transition,
                  delay: wIdx * LINE_REVEAL_STAGGER,
                  ease: EASE_OUT_MOTION,
                }}
                style={{
                  position: "absolute",
                  left: wIdx * cfg.cellStep,
                  top: 0,
                  width: cfg.cellSize,
                  height: gridHeight,
                }}
              >
                {week.map((cell, dIdx) => {
                  const key = toDateKey(cell.date);
                  const count = countMap.get(key) ?? 0;
                  const color = cell.inFuture ? "rgba(255,255,255,0.06)" : cellColor(count);

                  return (
                    <div
                      key={dIdx}
                      role="gridcell"
                      aria-label={
                        cell.inFuture
                          ? undefined
                          : `${formatDateLabel(cell.date)}: ${count > 0 ? `${count} contribution${count !== 1 ? "s" : ""}` : "no contributions"}`
                      }
                      style={{
                        position: "absolute",
                        left: 0,
                        top: dIdx * cfg.cellStep,
                        width: cfg.cellSize,
                        height: cfg.cellSize,
                        backgroundColor: color,
                        borderRadius: compact ? 1 : 2,
                        cursor: cell.inFuture ? "default" : "crosshair",
                      }}
                      onMouseEnter={(e) => handleCellMouseEnter(e, cell, count)}
                    />
                  );
                })}
              </motion.div>
            ))}

            {/* ── Tooltip ───────────────────────────────────────────────── */}
            <AnimatePresence>
              {tooltip.visible && tooltip.date && (
                <motion.div
                  key="tooltip"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{
                    duration: DURATION.micro,
                    ease: EASE_OUT_MOTION,
                  }}
                  style={{
                    position: "absolute",
                    left: Math.min(tooltip.x + 12, (gridRef.current?.offsetWidth ?? 999) - 160),
                    top: Math.max(tooltip.y - 36, 0),
                    pointerEvents: "none",
                    zIndex: 10,
                    border: "1px solid var(--border-visible)",
                    background: "var(--surface)",
                    paddingTop: "var(--space-xs)",
                    paddingBottom: "var(--space-xs)",
                    paddingLeft: "var(--space-sm)",
                    paddingRight: "var(--space-sm)",
                    borderRadius: "var(--radius-technical)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <div className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--text-display)]">
                    {formatDateLabel(tooltip.date)}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--text-secondary)]">
                    {tooltip.count > 0
                      ? `${tooltip.count} CONTRIBUTION${tooltip.count !== 1 ? "S" : ""}`
                      : "NO CONTRIBUTIONS"}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      </>)}
    </div>
  );
}
