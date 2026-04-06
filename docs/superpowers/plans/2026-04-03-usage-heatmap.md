# Claude Token Usage Heatmap — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a token usage heatmap feature that receives daily ccusage data via API, stores it in SQLite, and renders a GitHub-style contribution grid on the portfolio.

**Architecture:** Next.js API route (POST for sync, GET for reads) backed by better-sqlite3. A local cron script on Alex's Mac runs ccusage and POSTs daily data. The frontend fetches GET on mount and renders a 53x7 heatmap grid with Framer Motion staggered animations.

**Tech Stack:** Next.js 16 App Router, better-sqlite3 (raw SQL), Framer Motion (motion/react), Tailwind CSS v4, Space Mono + Space Grotesk fonts.

**Design corrections from spec:** The spec references "Geist Mono" — this project uses **Space Mono** (`font-mono`). The spec references `--text-muted` / `--bg-surface` / `--border-default` / `--border-strong` — actual tokens are `--text-secondary` / `--surface` / `--border` / `--border-visible`. The spec references "IssueLabel" component — use the existing label pattern (Space Mono, 11px, ALL CAPS, tracking 0.08em, `--text-disabled`).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/db.ts` | SQLite database initialization + query helpers |
| Create | `src/app/api/usage/route.ts` | POST (upsert usage data) + GET (read last 365 days) |
| Create | `src/components/ui/UsageHeatmap.tsx` | Heatmap grid, tooltip, stats, animation |
| Create | `src/components/ui/UsageCard.tsx` | Bento card wrapper with header + date range |
| Modify | `src/components/ui/index.ts` | Add UsageHeatmap + UsageCard exports |
| Create | `scripts/sync-usage.sh` | Cron script: runs ccusage, POSTs to API |
| Create | `scripts/setup-cron.sh` | Helper: prints crontab line, checks env |
| Create | `.env.example` | USAGE_SYNC_SECRET template |
| Create | `docs/usage-sync.md` | Setup and usage documentation |

---

### Task 1: Install better-sqlite3 + create database module

**Files:**
- Modify: `package.json` (add dependency)
- Create: `src/lib/db.ts`

- [ ] **Step 1: Install better-sqlite3**

Run: `npm install better-sqlite3 && npm install -D @types/better-sqlite3`

- [ ] **Step 2: Create src/lib/db.ts**

```ts
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "usage.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.exec(`
      CREATE TABLE IF NOT EXISTS daily_usage (
        date TEXT PRIMARY KEY,
        input_tokens INTEGER,
        output_tokens INTEGER,
        cache_creation_tokens INTEGER,
        cache_read_tokens INTEGER,
        total_tokens INTEGER,
        cost_usd REAL,
        updated_at TEXT
      )
    `);
  }
  return _db;
}

export interface DailyUsage {
  date: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  total_tokens: number;
  cost_usd: number;
  updated_at?: string;
}

export function upsertUsage(records: DailyUsage[]): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO daily_usage (date, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens, total_tokens, cost_usd, updated_at)
    VALUES (@date, @input_tokens, @output_tokens, @cache_creation_tokens, @cache_read_tokens, @total_tokens, @cost_usd, @updated_at)
    ON CONFLICT(date) DO UPDATE SET
      input_tokens = excluded.input_tokens,
      output_tokens = excluded.output_tokens,
      cache_creation_tokens = excluded.cache_creation_tokens,
      cache_read_tokens = excluded.cache_read_tokens,
      total_tokens = excluded.total_tokens,
      cost_usd = excluded.cost_usd,
      updated_at = excluded.updated_at
  `);

  const now = new Date().toISOString();
  const upsertMany = db.transaction((rows: DailyUsage[]) => {
    let count = 0;
    for (const row of rows) {
      stmt.run({ ...row, updated_at: row.updated_at || now });
      count++;
    }
    return count;
  });

  return upsertMany(records);
}

export function getUsageLast365(): DailyUsage[] {
  const db = getDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 365);
  const cutoffStr = cutoff.toISOString().slice(0, 10).replace(/-/g, "");

  return db
    .prepare("SELECT * FROM daily_usage WHERE date >= ? ORDER BY date ASC")
    .all(cutoffStr) as DailyUsage[];
}
```

- [ ] **Step 3: Add `data/` to .gitignore**

Append to `.gitignore`:
```
# SQLite database
data/
```

- [ ] **Step 4: Verify the module compiles**

Run: `npx tsc --noEmit src/lib/db.ts` (or just `npm run build` — it'll catch type errors)

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.ts package.json package-lock.json .gitignore
git commit -m "feat: add better-sqlite3 database module for usage tracking"
```

---

### Task 2: API route — POST /api/usage

**Files:**
- Create: `src/app/api/usage/route.ts`

- [ ] **Step 1: Create the route handler file with POST**

```ts
import { type NextRequest } from "next/server";
import { upsertUsage, type DailyUsage } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.USAGE_SYNC_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body)) {
    return Response.json(
      { error: "Body must be an array of daily usage objects" },
      { status: 400 }
    );
  }

  for (const item of body) {
    if (
      typeof item.date !== "string" ||
      typeof item.total_tokens !== "number"
    ) {
      return Response.json(
        { error: "Each item must have at least date (string) and total_tokens (number)" },
        { status: 400 }
      );
    }
  }

  const records: DailyUsage[] = body.map((item: Record<string, unknown>) => ({
    date: item.date as string,
    input_tokens: (item.input_tokens as number) || 0,
    output_tokens: (item.output_tokens as number) || 0,
    cache_creation_tokens: (item.cache_creation_tokens as number) || 0,
    cache_read_tokens: (item.cache_read_tokens as number) || 0,
    total_tokens: item.total_tokens as number,
    cost_usd: (item.cost_usd as number) || 0,
  }));

  const upserted = upsertUsage(records);
  return Response.json({ ok: true, upserted });
}
```

- [ ] **Step 2: Test POST manually with curl**

First add a test secret to `.env.local`:
```
USAGE_SYNC_SECRET=test-secret-123
```

Run dev server: `npm run dev`

Test auth failure:
```bash
curl -s -X POST http://localhost:3000/api/usage \
  -H "Content-Type: application/json" \
  -d '[{"date":"20260401","total_tokens":100000}]'
```
Expected: `{"error":"Unauthorized"}` with 401

Test success:
```bash
curl -s -X POST http://localhost:3000/api/usage \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-secret-123" \
  -d '[{"date":"20260401","input_tokens":50000,"output_tokens":30000,"cache_creation_tokens":5000,"cache_read_tokens":10000,"total_tokens":95000,"cost_usd":0.42}]'
```
Expected: `{"ok":true,"upserted":1}`

Test bad shape:
```bash
curl -s -X POST http://localhost:3000/api/usage \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-secret-123" \
  -d '{"not":"an array"}'
```
Expected: `{"error":"Body must be an array of daily usage objects"}` with 400

- [ ] **Step 3: Commit**

```bash
git add src/app/api/usage/route.ts .env.local
git commit -m "feat: add POST /api/usage endpoint with auth + validation"
```

**Note:** Don't commit `.env.local` — it should already be in `.gitignore` by default with Next.js. Just create it locally.

---

### Task 3: API route — GET /api/usage

**Files:**
- Modify: `src/app/api/usage/route.ts`

- [ ] **Step 1: Add GET handler to the same route file**

Add this export to `src/app/api/usage/route.ts`:

```ts
import { upsertUsage, getUsageLast365, type DailyUsage } from "@/lib/db";

// ... existing POST handler above ...

export async function GET() {
  const data = getUsageLast365();

  const totalTokens = data.reduce((sum, d) => sum + d.total_tokens, 0);
  const totalCostUsd = data.reduce((sum, d) => sum + d.cost_usd, 0);

  return Response.json({
    data,
    meta: {
      totalTokens,
      totalCostUsd: Math.round(totalCostUsd * 100) / 100,
      firstDate: data[0]?.date || null,
      lastDate: data[data.length - 1]?.date || null,
    },
  });
}
```

- [ ] **Step 2: Test GET manually**

(Requires POST from Task 2 to have seeded data)

```bash
curl -s http://localhost:3000/api/usage | jq .
```

Expected: JSON with `data` array and `meta` object containing totals.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/usage/route.ts
git commit -m "feat: add GET /api/usage endpoint returning last 365 days"
```

---

### Task 4: Local cron scripts

**Files:**
- Create: `scripts/sync-usage.sh`
- Create: `scripts/setup-cron.sh`

- [ ] **Step 1: Create scripts/sync-usage.sh**

```bash
#!/bin/bash
# Fetches daily token usage via ccusage and POSTs to the portfolio API.
# Add to crontab: 0 2 * * * /bin/bash /path/to/scripts/sync-usage.sh >> ~/.claude-sync.log 2>&1

set -e

ENDPOINT="${USAGE_SYNC_ENDPOINT:-https://mazza-builds.fly.dev/api/usage}"
SECRET="${USAGE_SYNC_SECRET}"

if [ -z "$SECRET" ]; then
  echo "[$(date)] ERROR: USAGE_SYNC_SECRET not set" && exit 1
fi

echo "[$(date)] Fetching ccusage data..."
DATA=$(npx ccusage@latest daily --json 2>/dev/null)

if [ -z "$DATA" ]; then
  echo "[$(date)] ERROR: ccusage returned empty data" && exit 1
fi

echo "[$(date)] Pushing to $ENDPOINT..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SECRET" \
  -d "$DATA")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "[$(date)] SUCCESS: $BODY"
else
  echo "[$(date)] ERROR: HTTP $HTTP_CODE — $BODY" && exit 1
fi
```

- [ ] **Step 2: Create scripts/setup-cron.sh**

```bash
#!/bin/bash
# Sets up the cron job for syncing Claude usage data.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SYNC_SCRIPT="$SCRIPT_DIR/sync-usage.sh"

echo "=== Claude Usage Sync Setup ==="
echo ""

# Make sync script executable
chmod +x "$SYNC_SCRIPT"
echo "[OK] Made sync-usage.sh executable"

# Check for USAGE_SYNC_SECRET
if grep -q "USAGE_SYNC_SECRET" ~/.zshrc 2>/dev/null; then
  echo "[OK] USAGE_SYNC_SECRET found in ~/.zshrc"
else
  echo "[!!] USAGE_SYNC_SECRET not found in ~/.zshrc"
  echo "     Add this line to ~/.zshrc:"
  echo "     export USAGE_SYNC_SECRET=\"$(openssl rand -hex 32)\""
  echo ""
fi

# Print crontab line
CRON_LINE="0 2 * * * /bin/bash $SYNC_SCRIPT >> ~/.claude-sync.log 2>&1"
echo ""
echo "Add this to your crontab (run: crontab -e):"
echo ""
echo "  $CRON_LINE"
echo ""
echo "To test manually:"
echo "  bash $SYNC_SCRIPT"
echo ""
echo "To check logs:"
echo "  tail -20 ~/.claude-sync.log"
```

- [ ] **Step 3: Make scripts executable and commit**

```bash
chmod +x scripts/sync-usage.sh scripts/setup-cron.sh
git add scripts/
git commit -m "feat: add cron scripts for syncing ccusage data to API"
```

---

### Task 5: UsageHeatmap component — grid + stats

**Files:**
- Create: `src/components/ui/UsageHeatmap.tsx`

This is the largest task. The component has these parts:
1. Data fetching from GET /api/usage
2. Stats bar (total tokens, active days)
3. 53x7 heatmap grid with color scale
4. Hover tooltip
5. Staggered column animation

- [ ] **Step 1: Create the full UsageHeatmap component**

```tsx
"use client";

import { useEffect, useState, useRef, type ComponentProps } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LINE_REVEAL_STAGGER, SPRING_SNAPPY, DURATION } from "@/lib/motion";

interface UsageDay {
  date: string;
  total_tokens: number;
}

interface UsageMeta {
  totalTokens: number;
  totalCostUsd: number;
  firstDate: string | null;
  lastDate: string | null;
}

interface UsageResponse {
  data: UsageDay[];
  meta: UsageMeta;
}

interface TooltipData {
  label: string;
  tokens: string;
  x: number;
  y: number;
}

type HeatmapCell = {
  date: Date;
  dateStr: string;
  tokens: number;
  level: 0 | 1 | 2 | 3 | 4;
  weekIndex: number;
  dayIndex: number;
};

const CELL_SIZE = 10;
const CELL_GAP = 2;
const TOTAL_STEP = CELL_SIZE + CELL_GAP;
const WEEKS = 53;
const DAYS = 7;

const LEVELS: Record<number, string> = {
  0: "rgba(255,255,255,0.06)",
  1: "rgba(255,255,255,0.20)",
  2: "rgba(255,255,255,0.50)",
  3: "rgba(255,255,255,0.80)",
  4: "var(--accent)",
};

function getLevel(tokens: number): 0 | 1 | 2 | 3 | 4 {
  if (tokens === 0) return 0;
  if (tokens <= 50_000) return 1;
  if (tokens <= 200_000) return 2;
  if (tokens <= 500_000) return 3;
  return 4;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function parseDateStr(s: string): Date {
  // YYYYMMDD → Date
  const y = parseInt(s.slice(0, 4));
  const m = parseInt(s.slice(4, 6)) - 1;
  const d = parseInt(s.slice(6, 8));
  return new Date(y, m, d);
}

function buildGrid(data: UsageDay[]): HeatmapCell[] {
  const tokenMap = new Map<string, number>();
  for (const d of data) {
    tokenMap.set(d.date, d.total_tokens);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find the start: go back ~52 weeks to the nearest Sunday
  const start = new Date(today);
  start.setDate(start.getDate() - (WEEKS - 1) * 7 - start.getDay());

  const cells: HeatmapCell[] = [];
  const cursor = new Date(start);

  for (let week = 0; week < WEEKS; week++) {
    for (let day = 0; day < DAYS; day++) {
      if (cursor > today) {
        cursor.setDate(cursor.getDate() + 1);
        continue;
      }
      const dateStr =
        String(cursor.getFullYear()) +
        String(cursor.getMonth() + 1).padStart(2, "0") +
        String(cursor.getDate()).padStart(2, "0");
      const tokens = tokenMap.get(dateStr) || 0;

      cells.push({
        date: new Date(cursor),
        dateStr,
        tokens,
        level: getLevel(tokens),
        weekIndex: week,
        dayIndex: day,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return cells;
}

function getMonthLabels(cells: HeatmapCell[]): { label: string; weekIndex: number }[] {
  const labels: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;

  for (const cell of cells) {
    if (cell.dayIndex === 0) {
      const month = cell.date.getMonth();
      if (month !== lastMonth) {
        labels.push({
          label: cell.date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
          weekIndex: cell.weekIndex,
        });
        lastMonth = month;
      }
    }
  }

  return labels;
}

interface UsageHeatmapProps extends Omit<ComponentProps<"div">, "children"> {}

export function UsageHeatmap({ className = "", ...props }: UsageHeatmapProps) {
  const [response, setResponse] = useState<UsageResponse | null>(null);
  const [error, setError] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/usage")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json();
      })
      .then(setResponse)
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className={`font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)] ${className}`} {...props}>
        [USAGE DATA UNAVAILABLE]
      </div>
    );
  }

  if (!response) {
    return (
      <div className={`${className}`} {...props}>
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          [LOADING...]
        </div>
      </div>
    );
  }

  const cells = buildGrid(response.data);
  const monthLabels = getMonthLabels(cells);
  const activeDays = response.data.filter((d) => d.total_tokens > 0).length;

  const dayLabels = ["MON", "", "WED", "", "FRI", "", ""];
  const labelWidth = 28;
  const gridWidth = WEEKS * TOTAL_STEP;
  const gridHeight = DAYS * TOTAL_STEP;

  function handleCellHover(cell: HeatmapCell, e: React.MouseEvent) {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    setTooltip({
      label: formatDate(cell.date),
      tokens: cell.tokens > 0 ? `${formatTokens(cell.tokens)} tokens` : "No activity",
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 40,
    });
  }

  // Group cells by week for column-staggered animation
  const weeks = new Map<number, HeatmapCell[]>();
  for (const cell of cells) {
    const arr = weeks.get(cell.weekIndex) || [];
    arr.push(cell);
    weeks.set(cell.weekIndex, arr);
  }

  return (
    <div className={`${className}`} {...props}>
      {/* Stats */}
      <div className="mb-[var(--space-lg)] flex gap-[var(--space-2xl)]">
        <div>
          <p className="font-sans text-[2.5rem] leading-[1] tracking-[-0.02em] text-[var(--text-display)]">
            {formatTokens(response.meta.totalTokens)}
          </p>
          <p className="mt-[var(--space-xs)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            TOKENS SHIPPED
          </p>
        </div>
        <div>
          <p className="font-sans text-[2.5rem] leading-[1] tracking-[-0.02em] text-[var(--text-display)]">
            {activeDays}
          </p>
          <p className="mt-[var(--space-xs)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            DAYS ACTIVE
          </p>
        </div>
      </div>

      {/* Month labels */}
      <div className="flex" style={{ paddingLeft: labelWidth }}>
        {monthLabels.map((m) => (
          <span
            key={`${m.label}-${m.weekIndex}`}
            className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--text-secondary)]"
            style={{
              position: "absolute",
              left: labelWidth + m.weekIndex * TOTAL_STEP,
            }}
          >
            {m.label}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="relative mt-[var(--space-md)]" ref={gridRef}>
        <div className="flex">
          {/* Day labels */}
          <div
            className="flex flex-col shrink-0"
            style={{ width: labelWidth, height: gridHeight }}
          >
            {dayLabels.map((label, i) => (
              <span
                key={i}
                className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--text-secondary)]"
                style={{
                  height: TOTAL_STEP,
                  lineHeight: `${TOTAL_STEP}px`,
                }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Heatmap cells */}
          <div
            className="relative"
            style={{ width: gridWidth, height: gridHeight }}
            onMouseLeave={() => setTooltip(null)}
          >
            {Array.from(weeks.entries()).map(([weekIdx, weekCells]) => (
              <motion.div
                key={weekIdx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  delay: weekIdx * LINE_REVEAL_STAGGER,
                  duration: DURATION.transition,
                }}
              >
                {weekCells.map((cell) => (
                  <rect
                    key={cell.dateStr}
                    as="div"
                    style={{
                      position: "absolute",
                      left: cell.weekIndex * TOTAL_STEP,
                      top: cell.dayIndex * TOTAL_STEP,
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      borderRadius: "var(--radius-technical)",
                      background: LEVELS[cell.level],
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e: React.MouseEvent) => handleCellHover(cell, e)}
                    onMouseMove={(e: React.MouseEvent) => handleCellHover(cell, e)}
                  />
                ))}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Tooltip */}
        <AnimatePresence>
          {tooltip && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={SPRING_SNAPPY}
              className="pointer-events-none absolute z-10 border border-[var(--border-visible)] bg-[var(--surface)] px-[var(--space-sm)] py-[var(--space-xs)]"
              style={{
                left: tooltip.x,
                top: tooltip.y,
                borderRadius: "var(--radius-technical)",
              }}
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--text-display)]">
                {tooltip.label}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--text-secondary)]">
                {tooltip.tokens}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
```

**Important note on the grid:** The cells use `<div>` elements (not SVG `<rect>` — the code above has a naming artifact). See Step 2 for the corrected version that uses plain divs.

- [ ] **Step 2: Fix the cell rendering — use div, not rect**

Replace the cell rendering inside the weeks map with:

```tsx
{weekCells.map((cell) => (
  <div
    key={cell.dateStr}
    style={{
      position: "absolute",
      left: cell.weekIndex * TOTAL_STEP,
      top: cell.dayIndex * TOTAL_STEP,
      width: CELL_SIZE,
      height: CELL_SIZE,
      borderRadius: "var(--radius-technical)",
      background: LEVELS[cell.level],
      cursor: "pointer",
    }}
    onMouseEnter={(e) => handleCellHover(cell, e)}
    onMouseMove={(e) => handleCellHover(cell, e)}
  />
))}
```

- [ ] **Step 3: Verify component renders in dev**

Run: `npm run dev`, navigate to a test page that renders `<UsageHeatmap />`.
Expected: Loading state → either data grid (if seeded) or error state.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/UsageHeatmap.tsx
git commit -m "feat: add UsageHeatmap component with grid, stats, tooltip, animation"
```

---

### Task 6: UsageCard bento wrapper

**Files:**
- Create: `src/components/ui/UsageCard.tsx`
- Modify: `src/components/ui/index.ts`

- [ ] **Step 1: Create UsageCard.tsx**

```tsx
"use client";

import { type ComponentProps } from "react";
import { UsageHeatmap } from "./UsageHeatmap";

interface UsageCardProps extends Omit<ComponentProps<"section">, "children"> {}

export function UsageCard({ className = "", ...props }: UsageCardProps) {
  const now = new Date();
  const yearAgo = new Date(now);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);

  const startLabel = yearAgo
    .toLocaleDateString("en-US", { month: "short", year: "numeric" })
    .toUpperCase();

  return (
    <section
      className={`border border-[var(--border)] bg-[var(--surface)] p-[var(--space-lg)] ${className}`}
      style={{ borderRadius: "var(--radius-card)" }}
      {...props}
    >
      {/* Header label */}
      <span className="font-mono text-[11px] uppercase leading-[1.2] tracking-[0.08em] text-[var(--text-disabled)]">
        BUILT WITH CLAUDE
      </span>

      {/* Date range */}
      <p className="mt-[var(--space-xs)] mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--text-secondary)]">
        {startLabel} &rarr; NOW
      </p>

      <UsageHeatmap />
    </section>
  );
}
```

- [ ] **Step 2: Update barrel exports**

Add to `src/components/ui/index.ts`:

```ts
export { UsageHeatmap } from "./UsageHeatmap";
export { UsageCard } from "./UsageCard";
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/UsageCard.tsx src/components/ui/index.ts
git commit -m "feat: add UsageCard bento wrapper with header and date range"
```

---

### Task 7: Wire UsageCard into the page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add UsageCard to the design system preview page**

Add import and a new section at the bottom of `page.tsx`:

```tsx
import { Button, ProjectCard, StatusBadge, TagChip, UsageCard } from "@/components/ui";

// ... existing sections ...

{/* Usage heatmap */}
<section className="mt-[var(--space-3xl)]">
  <p className="mb-[var(--space-md)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
    USAGE HEATMAP
  </p>
  <UsageCard />
</section>
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`, navigate to `/`.
Expected: UsageCard renders at bottom of page with loading state, then either data or error state.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add UsageCard to page layout"
```

---

### Task 8: Seed script for local development

**Files:**
- Create: `scripts/seed-usage.sh`

This is a helper to seed fake data so the heatmap is visible during development.

- [ ] **Step 1: Create scripts/seed-usage.sh**

```bash
#!/bin/bash
# Seeds fake usage data for local development.
# Usage: bash scripts/seed-usage.sh

set -e

ENDPOINT="${USAGE_SYNC_ENDPOINT:-http://localhost:3000/api/usage}"
SECRET="${USAGE_SYNC_SECRET:-test-secret-123}"

echo "Generating fake usage data for last 90 days..."

# Generate JSON array of daily usage
DATA="["
for i in $(seq 90 -1 0); do
  DATE=$(date -v-${i}d "+%Y%m%d" 2>/dev/null || date -d "$i days ago" "+%Y%m%d")
  # Random tokens between 0 and 800000 (with ~30% chance of 0)
  RAND=$((RANDOM % 100))
  if [ "$RAND" -lt 30 ]; then
    TOKENS=0
  else
    TOKENS=$(( (RANDOM * RANDOM) % 800000 ))
  fi
  INPUT=$((TOKENS * 60 / 100))
  OUTPUT=$((TOKENS * 30 / 100))
  CACHE_CREATE=$((TOKENS * 5 / 100))
  CACHE_READ=$((TOKENS * 5 / 100))
  COST=$(echo "scale=2; $TOKENS * 0.000003" | bc)

  if [ "$i" -gt 0 ]; then
    SEP=","
  else
    SEP=""
  fi

  DATA+="$(cat <<EOF
{"date":"$DATE","input_tokens":$INPUT,"output_tokens":$OUTPUT,"cache_creation_tokens":$CACHE_CREATE,"cache_read_tokens":$CACHE_READ,"total_tokens":$TOKENS,"cost_usd":$COST}$SEP
EOF
)"
done
DATA+="]"

echo "Posting to $ENDPOINT..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SECRET" \
  -d "$DATA")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "SUCCESS: $BODY"
else
  echo "ERROR: HTTP $HTTP_CODE — $BODY" && exit 1
fi
```

- [ ] **Step 2: Test the seed script**

Ensure dev server is running with `USAGE_SYNC_SECRET=test-secret-123` in `.env.local`.

```bash
chmod +x scripts/seed-usage.sh
bash scripts/seed-usage.sh
```

Then reload the page — the heatmap should show colored cells.

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-usage.sh
git commit -m "feat: add seed script for local heatmap development"
```

---

### Task 9: Environment + documentation

**Files:**
- Create: `.env.example`
- Create: `docs/usage-sync.md`

- [ ] **Step 1: Create .env.example**

```
# Secret for authenticating usage sync requests (generate with: openssl rand -hex 32)
USAGE_SYNC_SECRET=your-secret-here

# Optional: override database path (default: ./data/usage.db)
# DATABASE_PATH=/data/usage.db

# Optional: override sync endpoint (used by scripts/sync-usage.sh)
# USAGE_SYNC_ENDPOINT=https://mazza-builds.fly.dev/api/usage
```

- [ ] **Step 2: Create docs/usage-sync.md**

```markdown
# Claude Token Usage Heatmap — Sync Setup

## What this does

A nightly cron job on your Mac runs `ccusage` (which reads `~/.claude/projects/` JSONL files),
formats the data as JSON, and POSTs it to your portfolio's `/api/usage` endpoint. The portfolio
stores this in a SQLite database and renders it as a GitHub-style contribution heatmap.

## Generate a sync secret

```bash
openssl rand -hex 32
```

## Set the secret in your shell

Add to `~/.zshrc`:

```bash
export USAGE_SYNC_SECRET="<your-secret-here>"
```

Then reload: `source ~/.zshrc`

## Set up the cron job

```bash
bash scripts/setup-cron.sh
```

This will:
1. Make `sync-usage.sh` executable
2. Print the crontab line to add
3. Check if `USAGE_SYNC_SECRET` is in your shell config

Then run `crontab -e` and paste the printed line.

## Manually trigger a sync

```bash
bash scripts/sync-usage.sh
```

## Check sync logs

```bash
tail -20 ~/.claude-sync.log
```

## Local development

1. Add `USAGE_SYNC_SECRET=test-secret-123` to `.env.local`
2. Run `npm run dev`
3. Seed fake data: `bash scripts/seed-usage.sh`
4. Visit `http://localhost:3000` to see the heatmap

## Fly.io deployment notes

- The database lives at `/data/usage.db`
- You need a persistent volume mounted at `/data`
- Set `USAGE_SYNC_SECRET` as a Fly.io secret: `fly secrets set USAGE_SYNC_SECRET=<value>`
- Set `DATABASE_PATH=/data/usage.db` as a Fly.io secret
```

- [ ] **Step 3: Commit**

```bash
git add .env.example docs/usage-sync.md
git commit -m "docs: add usage sync setup documentation and env example"
```

---

## Spec Coverage Check

| Spec Section | Task(s) |
|-------------|---------|
| Part 1: POST /api/usage with auth, validation, upsert | Tasks 1, 2 |
| Part 1: GET /api/usage with 365-day window + meta | Tasks 1, 3 |
| Part 2: sync-usage.sh cron script | Task 4 |
| Part 2: setup-cron.sh helper | Task 4 |
| Part 3: UsageHeatmap data fetching + loading/error states | Task 5 |
| Part 3: 53x7 grid with 5-level color scale | Task 5 |
| Part 3: Month + day labels in Space Mono | Task 5 |
| Part 3: Hover tooltip with SPRING_SNAPPY | Task 5 |
| Part 3: Stats (total tokens, days active) | Task 5 |
| Part 3: Column-staggered LINE_REVEAL_STAGGER animation | Task 5 |
| Part 4: UsageCard bento wrapper with header + date range | Task 6 |
| Part 5: .env.example | Task 9 |
| Part 5: docs/usage-sync.md | Task 9 |
| Bonus: Seed script for local dev | Task 8 |
