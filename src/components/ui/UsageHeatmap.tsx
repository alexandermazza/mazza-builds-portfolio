"use client";

import { type ComponentProps, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DURATION, LINE_REVEAL_STAGGER, SPRING_SNAPPY } from "@/lib/motion";

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

export interface UsageHeatmapProps
  extends Omit<ComponentProps<"div">, "children"> {}

// ─── Constants ────────────────────────────────────────────────────────────────

const CELL_SIZE = 10;
const GAP = 2;
const CELL_STEP = CELL_SIZE + GAP;
const WEEKS = 53;
const DAYS = 7;

const MONTH_ABBREVS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(s: string): Date {
  const y = parseInt(s.slice(0, 4));
  const m = parseInt(s.slice(4, 6)) - 1;
  const d = parseInt(s.slice(6, 8));
  return new Date(y, m, d);
}

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
  if (tokens <= 50_000) return "rgba(255,255,255,0.20)";
  if (tokens <= 200_000) return "rgba(255,255,255,0.50)";
  if (tokens <= 500_000) return "rgba(255,255,255,0.80)";
  return "var(--accent)";
}

/** Returns the Sunday on or before the given date */
function toSunday(d: Date): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

/** Build the grid start date: the Sunday ~52 weeks ago */
function buildStartDate(today: Date): Date {
  const d = new Date(today);
  d.setDate(d.getDate() - 52 * 7);
  return toSunday(d);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function UsageHeatmap({ className = "", ...props }: UsageHeatmapProps) {
  const [status, setStatus] = useState<"loading" | "error" | "done">(
    "loading",
  );
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

  // ── Grid geometry ─────────────────────────────────────────────────────────

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = buildStartDate(today);

  // Build weeks: array of 53 arrays of 7 cells
  type Cell = { date: Date; inFuture: boolean };
  const weeks: Cell[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const week: Cell[] = [];
    for (let d = 0; d < DAYS; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      week.push({ date, inFuture: date > today });
    }
    weeks.push(week);
  }

  // Month labels: find first week where a new month appears
  type MonthLabel = { weekIndex: number; label: string };
  const monthLabels: MonthLabel[] = [];
  let lastMonth = -1;
  for (let w = 0; w < WEEKS; w++) {
    const firstDayOfWeek = weeks[w][0].date;
    const month = firstDayOfWeek.getMonth();
    if (month !== lastMonth) {
      // Only add if it's not cut off at the very start (week 0 can be partial)
      if (w > 0 || firstDayOfWeek.getDate() === 1) {
        monthLabels.push({
          weekIndex: w,
          label: MONTH_ABBREVS[month],
        });
      }
      lastMonth = month;
    }
  }

  // ── Grid dimensions ───────────────────────────────────────────────────────

  const gridWidth = WEEKS * CELL_STEP - GAP;
  const gridHeight = DAYS * CELL_STEP - GAP;

  // ── Tooltip handlers ──────────────────────────────────────────────────────

  function handleCellMouseEnter(
    e: React.MouseEvent,
    cell: Cell,
    tokens: number,
  ) {
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
    if (!tooltip.visible) return;
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip((prev) => ({
      ...prev,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }));
  }

  function handleCellMouseLeave() {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }

  // ── Loading / Error states ────────────────────────────────────────────────

  const monoLabel =
    "font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--text-disabled)]";

  if (status === "loading") {
    return (
      <div className={`${className}`} {...props}>
        <span className={monoLabel}>[LOADING...]</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={`${className}`} {...props}>
        <span className={monoLabel}>[USAGE DATA UNAVAILABLE]</span>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const MONTH_LABEL_HEIGHT = 16; // px reserved above the grid for month labels
  const DAY_LABEL_WIDTH = 28; // px reserved left of the grid for day labels

  // Day labels: only MON (index 1), WED (index 3), FRI (index 5)
  const DAY_LABEL_ROWS: { index: number; label: string }[] = [
    { index: 1, label: "MON" },
    { index: 3, label: "WED" },
    { index: 5, label: "FRI" },
  ];

  return (
    <div className={`${className}`} {...props}>
      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <div className="mb-[var(--space-2xl)] flex gap-[var(--space-2xl)]">
        <div>
          <div className="font-sans text-[2.5rem] leading-[1] tracking-[-0.02em] text-[var(--text-display)]">
            {formatTokens(totalTokens)}
          </div>
          <div className="mt-[var(--space-xs)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            TOKENS SHIPPED
          </div>
        </div>
        <div>
          <div className="font-sans text-[2.5rem] leading-[1] tracking-[-0.02em] text-[var(--text-display)]">
            {activeDays}
          </div>
          <div className="mt-[var(--space-xs)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            DAYS ACTIVE
          </div>
        </div>
      </div>

      {/* ── Grid wrapper ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 0,
        }}
      >
        {/* Day labels column */}
        <div
          style={{
            width: DAY_LABEL_WIDTH,
            marginTop: MONTH_LABEL_HEIGHT,
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
                top: index * CELL_STEP,
                right: 4,
                lineHeight: `${CELL_SIZE}px`,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grid + month labels */}
        <div style={{ position: "relative" }}>
          {/* Month labels */}
          <div
            style={{
              position: "relative",
              height: MONTH_LABEL_HEIGHT,
              width: gridWidth,
            }}
          >
            {monthLabels.map(({ weekIndex, label }) => (
              <div
                key={`${label}-${weekIndex}`}
                className="font-mono text-[10px] uppercase text-[var(--text-secondary)]"
                style={{
                  position: "absolute",
                  left: weekIndex * CELL_STEP,
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
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                style={{
                  position: "absolute",
                  left: wIdx * CELL_STEP,
                  top: 0,
                  width: CELL_SIZE,
                  height: gridHeight,
                }}
              >
                {week.map((cell, dIdx) => {
                  const key = toDateKey(cell.date);
                  const tokens = tokenMap.get(key) ?? 0;
                  const color = cell.inFuture
                    ? "transparent"
                    : cellColor(tokens);

                  return (
                    <div
                      key={dIdx}
                      style={{
                        position: "absolute",
                        left: 0,
                        top: dIdx * CELL_STEP,
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        backgroundColor: color,
                        borderRadius: 2,
                        cursor: cell.inFuture ? "default" : "crosshair",
                      }}
                      onMouseEnter={(e) =>
                        handleCellMouseEnter(e, cell, tokens)
                      }
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
