"use client";

import { type ComponentProps, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DURATION, EASE_OUT_MOTION, LINE_REVEAL_STAGGER, SPRING_SNAPPY } from "@/lib/motion";

// ─── Types ───────────────────────────────────────────────────────────────────

interface UsageDay {
  date: string; // YYYYMMDD
  total_tokens: number;
}

interface UsageResponse {
  data: Array<UsageDay>;
  meta: {
    totalTokens: number;
    totalCostUsd: number;
    firstDate: string | null;
    lastDate: string | null;
  };
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  date: Date | null;
  tokens: number;
}

type Cell = { date: Date; inFuture: boolean };
type MonthLabel = { weekIndex: number; label: string };

export interface UsageHeatmapProps extends Omit<ComponentProps<"div">, "children"> {
  compact?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = 7;

function getGridConfig(compact: boolean) {
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

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function formatDateLabel(d: Date): string {
  return `${MONTH_ABBREVS[d.getMonth()]} ${d.getDate()}`;
}

function cellColor(tokens: number): string {
  if (tokens <= 0) return "rgba(255,255,255,0.06)";
  if (tokens <= 50_000) return "rgba(255,107,53,0.20)";
  if (tokens <= 200_000) return "rgba(255,107,53,0.45)";
  if (tokens <= 500_000) return "rgba(255,107,53,0.70)";
  return "#FF6B35";
}

function toSunday(d: Date): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function buildGrid(today: Date): { start: Date; end: Date; weeks: number } {
  const jan1 = new Date(today.getFullYear(), 0, 1);
  const dec31 = new Date(today.getFullYear(), 11, 31);
  const start = toSunday(jan1);
  const diffMs = dec31.getTime() - start.getTime();
  const weeks = Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  return { start, end: dec31, weeks };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function UsageHeatmap({ className = "", compact = false, ...props }: UsageHeatmapProps) {
  const cfg = getGridConfig(compact);
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [tokenMap, setTokenMap] = useState<Map<string, number>>(new Map());
  const [totalTokens, setTotalTokens] = useState(0);
  const [activeDays, setActiveDays] = useState(0);

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    date: null,
    tokens: 0,
  });

  const gridRef = useRef<HTMLDivElement>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/usage");
        if (!res.ok) throw new Error("Non-OK response");
        const json: UsageResponse = await res.json();
        if (cancelled) return;

        const map = new Map<string, number>();
        let days = 0;
        for (const entry of json.data) {
          map.set(entry.date, entry.total_tokens);
          if (entry.total_tokens > 0) days++;
        }

        setTokenMap(map);
        setTotalTokens(json.meta.totalTokens);
        setActiveDays(days);
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

  function handleCellMouseEnter(e: React.MouseEvent, cell: Cell, tokens: number) {
    if (cell.inFuture) return;
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      date: cell.date,
      tokens,
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

  if (status === "loading") {
    return (
      <div className={className} {...props}>
        <span className={monoLabel}>[LOADING...]</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={className} {...props}>
        <span className={monoLabel}>[USAGE DATA UNAVAILABLE]</span>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={className} {...props}>
      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <div className={`flex gap-[var(--space-2xl)] ${compact ? "mb-[var(--space-md)]" : "mb-[var(--space-2xl)]"}`}>
        <div>
          <div className={`font-sans leading-[1] tracking-[-0.02em] text-[var(--text-display)] ${compact ? "text-[1.5rem]" : "text-[2.5rem]"}`}>
            {formatTokens(totalTokens)}
          </div>
          <div className="mt-[var(--space-xs)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            TOKENS SHIPPED
          </div>
        </div>
        <div>
          <div className={`font-sans leading-[1] tracking-[-0.02em] text-[var(--text-display)] ${compact ? "text-[1.5rem]" : "text-[2.5rem]"}`}>
            {activeDays}
          </div>
          <div className="mt-[var(--space-xs)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            DAYS ACTIVE
          </div>
        </div>
      </div>

      {/* ── Grid wrapper ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "row" }}>
        {/* Day labels column (hidden in compact mode) */}
        {!compact && (
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
            aria-label="Claude token usage heatmap for the past year"
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
                animate={{ opacity: 1 }}
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
                  const tokens = tokenMap.get(key) ?? 0;
                  const color = cell.inFuture ? "rgba(255,255,255,0.06)" : cellColor(tokens);

                  return (
                    <div
                      key={dIdx}
                      role="gridcell"
                      aria-label={
                        cell.inFuture
                          ? undefined
                          : `${formatDateLabel(cell.date)}: ${tokens > 0 ? `${formatTokens(tokens)} tokens` : "no activity"}`
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
                      onMouseEnter={(e) => handleCellMouseEnter(e, cell, tokens)}
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
                  transition={SPRING_SNAPPY}
                  style={{
                    position: "absolute",
                    left: tooltip.x + 12,
                    top: tooltip.y - 36,
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
                    {tooltip.tokens > 0
                      ? `${formatTokens(tooltip.tokens)} TOKENS`
                      : "NO ACTIVITY"}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
