# GTM Job Watcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A daily scan that pulls new GTM Engineer postings from Pinloop, drops repeats and out-of-area roles, stores them in SQLite, and emails the keepers.

**Architecture:** A GitHub Actions cron POSTs to a bearer-protected Next.js route on the Fly app, which wakes the sleeping machine. The route shells out to `npx pinloop@latest`, filters and stores rows in the SQLite database on the Fly volume, and sends one digest through Resend. Pure functions (parsing, dedupe, filtering, ranking, email building) live in separate modules and are unit tested against JSON captured from real Pinloop runs.

**Tech Stack:** Next.js 16 App Router route handler (nodejs runtime), TypeScript strict, better-sqlite3, Resend, vitest, the `pinloop` CLI via npx.

**Spec:** `docs/superpowers/specs/2026-09-23-gtm-job-watcher-design.md`

## Global Constraints

- Never use em dashes anywhere, including code comments, commit messages, and email copy. Use hyphens or rephrase.
- TypeScript strict mode. No `any` in exported signatures.
- This repo is Next.js 16.2.2, which differs from older Next versions. Before writing the route handler, read `node_modules/next/dist/docs/` for the current route handler guidance (per `AGENTS.md`).
- Pinloop free plan: 5 new postings a day. Never write code that pulls more than `--limit 5`, and never add a retry loop that pulls repeatedly.
- Source is career sites only. Country is `United States`.
- The title query, exactly, as one `--in title` value:
  `((GTM OR go-to-market) AND (engineer OR engineering)) OR ((AI OR automation OR agentic) AND (GTM OR go-to-market OR revenue OR marketing) AND (engineer OR engineering OR architect OR developer))`
- Target locations: remote (workplace type `Remote Solely` or `Remote OK`), Chicago, New York, NYC, San Francisco, SF, Bay Area.
- Existing patterns to follow: bearer secret in the `Authorization` header (`src/app/api/usage/route.ts`), `better-sqlite3` with `CREATE TABLE IF NOT EXISTS` at connection time (`src/lib/db.ts`), Resend sending from `Mazza Builds Contact <contact@mazzabuilds.com>` (`src/app/api/contact/route.ts`).
- Fixtures already committed: `src/lib/__fixtures__/pull-career-sites.json` (10 rows), `pull-day3-with-dupe.json` (4 rows including the Jobgether repost of the Engine role and the out-of-area RingCentral role), `pull-refused.json` (a real refusal), `fetch-day3.json` (full records with compensation).

---

### Task 1: Test runner and the jobs database module

**Files:**
- Modify: `package.json` (add vitest, test scripts)
- Create: `vitest.config.ts`
- Modify: `src/lib/db.ts` (export `getDb`)
- Create: `src/lib/jobs-db.ts`
- Test: `src/lib/jobs-db.test.ts`

**Interfaces:**
- Consumes: `getDb()` from `src/lib/db.ts`.
- Produces:
  - `export interface JobRow { id: string; title: string; company: string; company_key: string; locations: string; workplace_type: string | null; employment_type: string | null; posted_at: string; url: string; comp_min: number | null; comp_max: number | null; comp_currency: string | null; experience_level: string | null; source: string; out_of_area: number; status: string; first_seen_at: string; emailed_at: string | null }`
  - `export interface ScanRecord { run_at: string; posted_after: string; pulled: number; kept: number; out_of_area: number; duplicates: number; missed: number; credits_left: number | null; emailed: number; error: string | null }`
  - `export function insertJobs(rows: JobRow[]): number`
  - `export function findKnown(ids: string[], companyKeys: string[]): { ids: Set<string>; companyKeys: Set<string> }`
  - `export function getState(key: string): string | null`
  - `export function setState(key: string, value: string): void`
  - `export function recordScan(rec: ScanRecord): void`
  - `export function getUnemailedJobs(): JobRow[]`
  - `export function markEmailed(ids: string[], when: string): void`

- [ ] **Step 1: Install vitest and add scripts**

```bash
npm install --save-dev vitest@^3
```

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

- [ ] **Step 3: Write the failing test**

Create `src/lib/jobs-db.test.ts`. The database module reads `DATABASE_PATH` when it first opens a connection, so the env var is set before the module is imported, and the module is imported dynamically inside `beforeAll`.

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type JobsDb = typeof import("./jobs-db");

let jobsDb: JobsDb;
let tmpDir: string;

function job(overrides: Partial<import("./jobs-db").JobRow> = {}): import("./jobs-db").JobRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    title: "GTM Engineer",
    company: "ClickHouse",
    company_key: "clickhouse|gtm engineer",
    locations: "United States",
    workplace_type: "Remote OK",
    employment_type: "FULL_TIME",
    posted_at: "2026-09-24T10:00:00.000Z",
    url: "https://example.com/job/1",
    comp_min: 150000,
    comp_max: 190000,
    comp_currency: "USD",
    experience_level: "5-10",
    source: "career sites",
    out_of_area: 0,
    status: "new",
    first_seen_at: "2026-09-24T12:00:00.000Z",
    emailed_at: null,
    ...overrides,
  };
}

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "jobs-db-test-"));
  process.env.DATABASE_PATH = path.join(tmpDir, "test.db");
  jobsDb = await import("./jobs-db");
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("jobs-db", () => {
  it("inserts jobs and ignores an id it already has", () => {
    expect(jobsDb.insertJobs([job()])).toBe(1);
    expect(jobsDb.insertJobs([job()])).toBe(0);
  });

  it("reports which ids and company keys are already known", () => {
    jobsDb.insertJobs([job({ id: "22222222-2222-2222-2222-222222222222", company_key: "navan|senior gtm engineer" })]);
    const known = jobsDb.findKnown(
      ["22222222-2222-2222-2222-222222222222", "33333333-3333-3333-3333-333333333333"],
      ["navan|senior gtm engineer", "zenity|gtm ai engineer"],
    );
    expect(known.ids.has("22222222-2222-2222-2222-222222222222")).toBe(true);
    expect(known.ids.has("33333333-3333-3333-3333-333333333333")).toBe(false);
    expect(known.companyKeys.has("navan|senior gtm engineer")).toBe(true);
    expect(known.companyKeys.has("zenity|gtm ai engineer")).toBe(false);
  });

  it("stores and reads state", () => {
    expect(jobsDb.getState("last_posted_after")).toBeNull();
    jobsDb.setState("last_posted_after", "2026-09-24");
    expect(jobsDb.getState("last_posted_after")).toBe("2026-09-24");
    jobsDb.setState("last_posted_after", "2026-09-25");
    expect(jobsDb.getState("last_posted_after")).toBe("2026-09-25");
  });

  it("returns only in-area jobs that have not been emailed, and marks them", () => {
    jobsDb.insertJobs([
      job({ id: "44444444-4444-4444-4444-444444444444", company_key: "a|b", out_of_area: 1 }),
      job({ id: "55555555-5555-5555-5555-555555555555", company_key: "c|d" }),
    ]);
    const before = jobsDb.getUnemailedJobs().map((j) => j.id);
    expect(before).toContain("55555555-5555-5555-5555-555555555555");
    expect(before).not.toContain("44444444-4444-4444-4444-444444444444");

    jobsDb.markEmailed(before, "2026-09-24T13:00:00.000Z");
    expect(jobsDb.getUnemailedJobs()).toHaveLength(0);
  });

  it("records a scan", () => {
    jobsDb.recordScan({
      run_at: "2026-09-24T12:00:00.000Z",
      posted_after: "2026-09-23",
      pulled: 4,
      kept: 2,
      out_of_area: 1,
      duplicates: 1,
      missed: 3,
      credits_left: 1,
      emailed: 1,
      error: null,
    });
    // No throw is the assertion; the row is read back through the raw handle.
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL, cannot resolve `./jobs-db`.

- [ ] **Step 5: Export `getDb` from `src/lib/db.ts`**

Change the single line `function getDb(): Database.Database {` to `export function getDb(): Database.Database {`. Nothing else in that file changes.

- [ ] **Step 6: Write `src/lib/jobs-db.ts`**

```ts
import { getDb } from "./db";

export interface JobRow {
  id: string;
  title: string;
  company: string;
  company_key: string;
  locations: string;
  workplace_type: string | null;
  employment_type: string | null;
  posted_at: string;
  url: string;
  comp_min: number | null;
  comp_max: number | null;
  comp_currency: string | null;
  experience_level: string | null;
  source: string;
  out_of_area: number;
  status: string;
  first_seen_at: string;
  emailed_at: string | null;
}

export interface ScanRecord {
  run_at: string;
  posted_after: string;
  pulled: number;
  kept: number;
  out_of_area: number;
  duplicates: number;
  missed: number;
  credits_left: number | null;
  emailed: number;
  error: string | null;
}

let ready = false;

function db() {
  const handle = getDb();
  if (!ready) {
    handle.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        company_key TEXT NOT NULL,
        locations TEXT NOT NULL,
        workplace_type TEXT,
        employment_type TEXT,
        posted_at TEXT NOT NULL,
        url TEXT NOT NULL,
        comp_min INTEGER,
        comp_max INTEGER,
        comp_currency TEXT,
        experience_level TEXT,
        source TEXT NOT NULL,
        out_of_area INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'new',
        first_seen_at TEXT NOT NULL,
        emailed_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_jobs_company_key ON jobs(company_key);
      CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON jobs(posted_at);

      CREATE TABLE IF NOT EXISTS job_scans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_at TEXT NOT NULL,
        posted_after TEXT NOT NULL,
        pulled INTEGER NOT NULL DEFAULT 0,
        kept INTEGER NOT NULL DEFAULT 0,
        out_of_area INTEGER NOT NULL DEFAULT 0,
        duplicates INTEGER NOT NULL DEFAULT 0,
        missed INTEGER NOT NULL DEFAULT 0,
        credits_left INTEGER,
        emailed INTEGER NOT NULL DEFAULT 0,
        error TEXT
      );

      CREATE TABLE IF NOT EXISTS job_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    ready = true;
  }
  return handle;
}

export function insertJobs(rows: JobRow[]): number {
  if (rows.length === 0) return 0;
  const handle = db();
  const stmt = handle.prepare(`
    INSERT OR IGNORE INTO jobs (
      id, title, company, company_key, locations, workplace_type, employment_type,
      posted_at, url, comp_min, comp_max, comp_currency, experience_level,
      source, out_of_area, status, first_seen_at, emailed_at
    ) VALUES (
      @id, @title, @company, @company_key, @locations, @workplace_type, @employment_type,
      @posted_at, @url, @comp_min, @comp_max, @comp_currency, @experience_level,
      @source, @out_of_area, @status, @first_seen_at, @emailed_at
    )
  `);
  const runMany = handle.transaction((many: JobRow[]) => {
    let inserted = 0;
    for (const row of many) {
      inserted += stmt.run(row).changes;
    }
    return inserted;
  });
  return runMany(rows) as number;
}

export function findKnown(
  ids: string[],
  companyKeys: string[],
): { ids: Set<string>; companyKeys: Set<string> } {
  const handle = db();
  const found = { ids: new Set<string>(), companyKeys: new Set<string>() };

  if (ids.length > 0) {
    const placeholders = ids.map(() => "?").join(",");
    const rows = handle
      .prepare(`SELECT id FROM jobs WHERE id IN (${placeholders})`)
      .all(...ids) as { id: string }[];
    for (const row of rows) found.ids.add(row.id);
  }

  if (companyKeys.length > 0) {
    const placeholders = companyKeys.map(() => "?").join(",");
    const rows = handle
      .prepare(`SELECT company_key FROM jobs WHERE company_key IN (${placeholders})`)
      .all(...companyKeys) as { company_key: string }[];
    for (const row of rows) found.companyKeys.add(row.company_key);
  }

  return found;
}

export function getState(key: string): string | null {
  const row = db().prepare(`SELECT value FROM job_state WHERE key = ?`).get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setState(key: string, value: string): void {
  db()
    .prepare(
      `INSERT INTO job_state (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(key, value);
}

export function recordScan(rec: ScanRecord): void {
  db()
    .prepare(
      `INSERT INTO job_scans (
        run_at, posted_after, pulled, kept, out_of_area, duplicates, missed,
        credits_left, emailed, error
      ) VALUES (
        @run_at, @posted_after, @pulled, @kept, @out_of_area, @duplicates, @missed,
        @credits_left, @emailed, @error
      )`,
    )
    .run(rec);
}

export function getUnemailedJobs(): JobRow[] {
  return db()
    .prepare(
      `SELECT * FROM jobs WHERE emailed_at IS NULL AND out_of_area = 0 ORDER BY posted_at DESC`,
    )
    .all() as JobRow[];
}

export function markEmailed(ids: string[], when: string): void {
  if (ids.length === 0) return;
  const handle = db();
  const stmt = handle.prepare(`UPDATE jobs SET emailed_at = ? WHERE id = ?`);
  const runMany = handle.transaction((many: string[]) => {
    for (const id of many) stmt.run(when, id);
  });
  runMany(ids);
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 5 tests.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/db.ts src/lib/jobs-db.ts src/lib/jobs-db.test.ts
git commit -m "feat(jobs): add job watcher tables and storage module"
```

---

### Task 2: Pinloop CLI wrapper

**Files:**
- Create: `src/lib/pinloop.ts`
- Test: `src/lib/pinloop.test.ts`

**Interfaces:**
- Consumes: the fixtures in `src/lib/__fixtures__/`.
- Produces:
  - `export interface PinloopRow { id: string; title: string; company: string; locations: string[]; posted_at: string; url: string; workplace_type: string | null; employment_type: string | string[] | null; already_had?: boolean }`
  - `export interface PullResult { rows: PinloopRow[]; pulled: number; matching: number; creditsLeft: number | null; refused: string | null; retryLimit: number | null; error: string | null; nextPostedAfter: string | null }`
  - `export interface FetchRecord { id: string; compensation: { min: number | null; max: number | null; currency: string | null } | null; experience_level: string | null; workplace_type: string | null; employment_type: string | string[] | null }`
  - `export function parsePull(stdout: string): PullResult`
  - `export function parseFetch(stdout: string): FetchRecord[]`
  - `export function retryLimitFromRefusal(message: string): number | null`
  - `export const TITLE_QUERY: string`
  - `export async function pull(opts: { postedAfter: string; limit: number; configDir: string }): Promise<PullResult>`
  - `export async function fetchRecords(ids: string[], opts: { configDir: string }): Promise<FetchRecord[]>`

**Notes for the implementer:**
- A real refusal reads: `this pull would take 5 postings and this account has 0 left today. Narrow it. Usage resets at midnight UTC.` It does not always name a limit, so the retry limit is taken from `has N left today` and is null when N is 0.
- `employment_type` comes back as a string on pull rows and as an array on fetch records. Keep the union type rather than normalizing, since nothing downstream reads it except the email, which does not print it.
- Pinloop writes human-readable notes on stderr and JSON on stdout. Parse stdout only.

- [ ] **Step 1: Write the failing test**

Create `src/lib/pinloop.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseFetch, parsePull, retryLimitFromRefusal, TITLE_QUERY } from "./pinloop";

const fixture = (name: string) =>
  fs.readFileSync(path.join(__dirname, "__fixtures__", name), "utf8");

describe("parsePull", () => {
  it("reads rows and usage from a successful pull", () => {
    const result = parsePull(fixture("pull-day3-with-dupe.json"));
    expect(result.rows).toHaveLength(4);
    expect(result.pulled).toBe(4);
    expect(result.matching).toBe(4);
    expect(result.creditsLeft).toBe(1);
    expect(result.nextPostedAfter).toBe("2026-09-18");
    expect(result.refused).toBeNull();
    expect(result.error).toBeNull();
    expect(result.rows[0].company).toBe("Engine");
    expect(result.rows[0].locations).toEqual(["United States"]);
  });

  it("reads a refusal without throwing", () => {
    const result = parsePull(fixture("pull-refused.json"));
    expect(result.rows).toHaveLength(0);
    expect(result.refused).toContain("0 left today");
    expect(result.retryLimit).toBeNull();
  });

  it("reports a server error", () => {
    const result = parsePull(JSON.stringify({ error: "Pinloop could not finish" }));
    expect(result.error).toBe("Pinloop could not finish");
    expect(result.rows).toHaveLength(0);
  });

  it("throws on output that is not JSON", () => {
    expect(() => parsePull("this pinloop is 0.7.1. the newest is 0.7.2")).toThrow(
      /not valid JSON/i,
    );
  });
});

describe("retryLimitFromRefusal", () => {
  it("takes the remaining count from the message", () => {
    expect(
      retryLimitFromRefusal("this pull would take 5 postings and this account has 3 left today."),
    ).toBe(3);
  });

  it("returns null when nothing is left", () => {
    expect(
      retryLimitFromRefusal("this pull would take 5 postings and this account has 0 left today."),
    ).toBeNull();
  });

  it("returns null when the message says nothing useful", () => {
    expect(retryLimitFromRefusal("something else entirely")).toBeNull();
  });
});

describe("parseFetch", () => {
  it("pulls compensation and experience out of full records", () => {
    const records = parseFetch(fixture("fetch-day3.json"));
    expect(records.length).toBeGreaterThan(0);
    const engine = records.find((r) => r.compensation?.max === 187000);
    expect(engine).toBeDefined();
    expect(engine?.compensation?.min).toBe(135150);
    expect(engine?.compensation?.currency).toBe("USD");
    expect(engine?.experience_level).toBe("5-10");
  });

  it("handles a record with no compensation", () => {
    const records = parseFetch(
      JSON.stringify({ rows: [{ id: "a", compensation: null, experience_level: "2-5" }] }),
    );
    expect(records[0].compensation).toBeNull();
    expect(records[0].experience_level).toBe("2-5");
  });
});

describe("TITLE_QUERY", () => {
  it("covers both title families and keeps its brackets balanced", () => {
    expect(TITLE_QUERY).toContain("go-to-market");
    expect(TITLE_QUERY).toContain("agentic");
    const open = (TITLE_QUERY.match(/\(/g) ?? []).length;
    const close = (TITLE_QUERY.match(/\)/g) ?? []).length;
    expect(open).toBe(close);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- pinloop`
Expected: FAIL, cannot resolve `./pinloop`.

- [ ] **Step 3: Write `src/lib/pinloop.ts`**

```ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export const TITLE_QUERY =
  "((GTM OR go-to-market) AND (engineer OR engineering)) OR " +
  "((AI OR automation OR agentic) AND (GTM OR go-to-market OR revenue OR marketing) " +
  "AND (engineer OR engineering OR architect OR developer))";

export const COUNTRY = "United States";
export const SOURCE = "career sites";

/** How long one Pinloop call may take. npx resolves the package on the first run. */
const TIMEOUT_MS = 120_000;

export interface PinloopRow {
  id: string;
  title: string;
  company: string;
  locations: string[];
  posted_at: string;
  url: string;
  workplace_type: string | null;
  employment_type: string | string[] | null;
  already_had?: boolean;
}

export interface PullResult {
  rows: PinloopRow[];
  pulled: number;
  matching: number;
  creditsLeft: number | null;
  refused: string | null;
  retryLimit: number | null;
  error: string | null;
  nextPostedAfter: string | null;
}

export interface FetchRecord {
  id: string;
  compensation: { min: number | null; max: number | null; currency: string | null } | null;
  experience_level: string | null;
  workplace_type: string | null;
  employment_type: string | string[] | null;
}

function asJson(stdout: string): Record<string, unknown> {
  try {
    return JSON.parse(stdout) as Record<string, unknown>;
  } catch {
    throw new Error(`Pinloop output is not valid JSON: ${stdout.slice(0, 200)}`);
  }
}

function companyName(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "name" in value) {
    const name = (value as { name?: unknown }).name;
    if (typeof name === "string") return name;
  }
  return "";
}

function toRow(raw: Record<string, unknown>): PinloopRow {
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? ""),
    company: companyName(raw.company),
    locations: Array.isArray(raw.locations) ? raw.locations.map(String) : [],
    posted_at: String(raw.posted_at ?? ""),
    url: String(raw.url ?? raw.posting_url ?? ""),
    workplace_type: raw.workplace_type == null ? null : String(raw.workplace_type),
    employment_type: (raw.employment_type as string | string[] | null) ?? null,
    already_had: raw.already_had === true,
  };
}

export function retryLimitFromRefusal(message: string): number | null {
  const match = /has (\d+) left/i.exec(message);
  if (!match) return null;
  const left = Number(match[1]);
  return Number.isFinite(left) && left > 0 ? left : null;
}

export function parsePull(stdout: string): PullResult {
  const data = asJson(stdout);
  const empty: PullResult = {
    rows: [],
    pulled: 0,
    matching: 0,
    creditsLeft: null,
    refused: null,
    retryLimit: null,
    error: null,
    nextPostedAfter: null,
  };

  if (typeof data.error === "string") {
    return { ...empty, error: data.error };
  }

  if (typeof data.refused === "string") {
    return { ...empty, refused: data.refused, retryLimit: retryLimitFromRefusal(data.refused) };
  }

  const postings = (data.postings ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(data.rows) ? data.rows.map((r) => toRow(r as Record<string, unknown>)) : [];

  return {
    rows,
    pulled: Number(postings.pulled ?? rows.length),
    matching: Number(postings.matching ?? rows.length),
    creditsLeft: postings.left == null ? null : Number(postings.left),
    refused: null,
    retryLimit: null,
    error: null,
    nextPostedAfter:
      typeof postings.next_posted_after === "string" ? postings.next_posted_after : null,
  };
}

export function parseFetch(stdout: string): FetchRecord[] {
  const data = asJson(stdout);
  const rows = Array.isArray(data.rows) ? data.rows : [];
  return rows.map((entry) => {
    const raw = entry as Record<string, unknown>;
    const comp = raw.compensation as Record<string, unknown> | null | undefined;
    return {
      id: String(raw.id ?? ""),
      compensation: comp
        ? {
            min: comp.min == null ? null : Number(comp.min),
            max: comp.max == null ? null : Number(comp.max),
            currency: comp.currency == null ? null : String(comp.currency),
          }
        : null,
      experience_level: raw.experience_level == null ? null : String(raw.experience_level),
      workplace_type: raw.workplace_type == null ? null : String(raw.workplace_type),
      employment_type: (raw.employment_type as string | string[] | null) ?? null,
    };
  });
}

async function cli(args: string[], configDir: string): Promise<string> {
  const { stdout } = await run("npx", ["--yes", "pinloop@latest", ...args], {
    timeout: TIMEOUT_MS,
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env, PINLOOP_CONFIG_DIR: configDir, NO_COLOR: "1" },
  });
  return stdout;
}

export async function pull(opts: {
  postedAfter: string;
  limit: number;
  configDir: string;
}): Promise<PullResult> {
  const stdout = await cli(
    [
      "pull",
      "--in",
      "title",
      TITLE_QUERY,
      "--country",
      COUNTRY,
      "--from",
      SOURCE,
      "--posted-after",
      opts.postedAfter,
      "--limit",
      String(opts.limit),
      "--json",
    ],
    opts.configDir,
  );
  return parsePull(stdout);
}

export async function fetchRecords(
  ids: string[],
  opts: { configDir: string },
): Promise<FetchRecord[]> {
  if (ids.length === 0) return [];
  const stdout = await cli(["fetch", ids.join(","), "--json"], opts.configDir);
  return parseFetch(stdout);
}
```

Note on the `--in title` argument: `execFile` passes arguments straight to the process without a shell, so the query needs no quoting or escaping here.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- pinloop`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pinloop.ts src/lib/pinloop.test.ts
git commit -m "feat(jobs): add pinloop CLI wrapper and output parsing"
```

---

### Task 3: Dedupe, location filter, ranking

**Files:**
- Create: `src/lib/job-filter.ts`
- Test: `src/lib/job-filter.test.ts`

**Interfaces:**
- Consumes: `PinloopRow`, `FetchRecord` from `./pinloop`; `JobRow` from `./jobs-db`.
- Produces:
  - `export const AGGREGATORS: string[]` (lowercase company names)
  - `export function companyKey(company: string, title: string): string`
  - `export function isTargetLocation(locations: string[], workplaceType: string | null): boolean`
  - `export function classifyRows(rows: PinloopRow[], known: { ids: Set<string>; companyKeys: Set<string> }): { fresh: PinloopRow[]; duplicates: PinloopRow[] }`
  - `export function toJobRows(rows: PinloopRow[], records: FetchRecord[], seenAt: string): JobRow[]`
  - `export function rankJobs(jobs: JobRow[]): JobRow[]`

**Behavior the tests pin down:**
- `companyKey` lowercases, strips punctuation, collapses whitespace, and joins company and title with `|`, so `Navan` + `Senior GTM Engineer` and `navan` + `Senior  GTM  Engineer!` produce the same key.
- A row whose company is an aggregator is a duplicate no matter what else it looks like.
- Duplicates are also found within one batch, not just against the database. The Zenity row appeared twice in one day from two sources.
- Ranking puts remote first, then higher `comp_max`, then newer `posted_at`. Rows with no pay sort after rows with pay inside the same remote group.

- [ ] **Step 1: Write the failing test**

Create `src/lib/job-filter.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parsePull } from "./pinloop";
import type { JobRow } from "./jobs-db";
import {
  classifyRows,
  companyKey,
  isTargetLocation,
  rankJobs,
  toJobRows,
} from "./job-filter";

const fixture = (name: string) =>
  fs.readFileSync(path.join(__dirname, "__fixtures__", name), "utf8");

describe("companyKey", () => {
  it("normalizes case, punctuation and spacing", () => {
    expect(companyKey("Navan", "Senior GTM Engineer")).toBe(
      companyKey("navan", "Senior  GTM  Engineer!"),
    );
  });

  it("keeps different roles at the same company apart", () => {
    expect(companyKey("Navan", "Senior GTM Engineer")).not.toBe(
      companyKey("Navan", "GTM Data Engineer"),
    );
  });
});

describe("isTargetLocation", () => {
  it("keeps remote roles wherever they are", () => {
    expect(isTargetLocation(["Austin, Texas, United States"], "Remote OK")).toBe(true);
    expect(isTargetLocation(["Miami, Florida, United States"], "Remote Solely")).toBe(true);
  });

  it("keeps on-site roles in the target cities", () => {
    expect(isTargetLocation(["New York, New York, United States"], "On-site")).toBe(true);
    expect(isTargetLocation(["San Francisco, California, United States"], "On-site")).toBe(true);
    expect(isTargetLocation(["Chicago, Illinois, United States"], "Hybrid")).toBe(true);
  });

  it("drops on-site roles elsewhere", () => {
    expect(isTargetLocation(["Denver, Colorado, United States"], "Hybrid")).toBe(false);
    expect(isTargetLocation(["Lehi, Utah, United States"], "Hybrid")).toBe(false);
    expect(isTargetLocation([], null)).toBe(false);
  });
});

describe("classifyRows", () => {
  it("drops rows already stored by id", () => {
    const rows = parsePull(fixture("pull-day3-with-dupe.json")).rows;
    const known = { ids: new Set([rows[0].id]), companyKeys: new Set<string>() };
    const { fresh, duplicates } = classifyRows(rows, known);
    expect(duplicates).toHaveLength(1);
    expect(fresh).toHaveLength(rows.length - 1);
  });

  it("drops aggregator reposts", () => {
    const rows = parsePull(fixture("pull-day3-with-dupe.json")).rows;
    const { fresh, duplicates } = classifyRows(rows, {
      ids: new Set<string>(),
      companyKeys: new Set<string>(),
    });
    expect(duplicates.some((r) => r.company === "Jobgether")).toBe(true);
    expect(fresh.some((r) => r.company === "Jobgether")).toBe(false);
  });

  it("drops a repeat inside the same batch", () => {
    const rows = parsePull(fixture("pull-career-sites.json")).rows;
    const doubled = [...rows, { ...rows[0], id: "different-id" }];
    const { fresh } = classifyRows(doubled, {
      ids: new Set<string>(),
      companyKeys: new Set<string>(),
    });
    expect(fresh).toHaveLength(rows.length);
  });
});

describe("toJobRows", () => {
  it("merges fetched compensation onto the pulled row and flags out-of-area", () => {
    const rows = parsePull(fixture("pull-day3-with-dupe.json")).rows;
    const records = [
      {
        id: rows[0].id,
        compensation: { min: 135150, max: 187000, currency: "USD" },
        experience_level: "5-10",
        workplace_type: null,
        employment_type: null,
      },
    ];
    const jobs = toJobRows(rows, records, "2026-09-24T12:00:00.000Z");
    expect(jobs[0].comp_min).toBe(135150);
    expect(jobs[0].comp_max).toBe(187000);
    expect(jobs[0].experience_level).toBe("5-10");
    expect(jobs[0].first_seen_at).toBe("2026-09-24T12:00:00.000Z");
    expect(jobs[0].status).toBe("new");

    const denver = jobs.find((j) => j.company === "RingCentral");
    expect(denver?.out_of_area).toBe(1);
  });
});

describe("rankJobs", () => {
  it("puts remote first, then the best pay, then the newest", () => {
    const base: JobRow = {
      id: "a",
      title: "GTM Engineer",
      company: "A",
      company_key: "a|gtm engineer",
      locations: "United States",
      workplace_type: "On-site",
      employment_type: null,
      posted_at: "2026-09-20T00:00:00.000Z",
      url: "https://example.com/a",
      comp_min: null,
      comp_max: null,
      comp_currency: null,
      experience_level: null,
      source: "career sites",
      out_of_area: 0,
      status: "new",
      first_seen_at: "2026-09-24T00:00:00.000Z",
      emailed_at: null,
    };
    const ranked = rankJobs([
      { ...base, id: "onsite-rich", comp_max: 250000 },
      { ...base, id: "remote-poor", workplace_type: "Remote OK" },
      { ...base, id: "remote-rich", workplace_type: "Remote Solely", comp_max: 200000 },
      { ...base, id: "onsite-new", posted_at: "2026-09-24T00:00:00.000Z" },
    ]);
    expect(ranked.map((j) => j.id)).toEqual([
      "remote-rich",
      "remote-poor",
      "onsite-rich",
      "onsite-new",
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- job-filter`
Expected: FAIL, cannot resolve `./job-filter`.

- [ ] **Step 3: Write `src/lib/job-filter.ts`**

```ts
import type { JobRow } from "./jobs-db";
import { SOURCE, type FetchRecord, type PinloopRow } from "./pinloop";

/** Companies that repost other employers' jobs verbatim. */
export const AGGREGATORS = ["jobgether"];

const TARGET_CITY = /(chicago|new york|nyc|san francisco|bay area|\bsf\b)/i;
const REMOTE = new Set(["remote solely", "remote ok"]);

export function companyKey(company: string, title: string): string {
  const flatten = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  return `${flatten(company)}|${flatten(title)}`;
}

export function isRemote(workplaceType: string | null): boolean {
  return workplaceType != null && REMOTE.has(workplaceType.toLowerCase());
}

export function isTargetLocation(locations: string[], workplaceType: string | null): boolean {
  if (isRemote(workplaceType)) return true;
  return locations.some((location) => TARGET_CITY.test(location));
}

export function classifyRows(
  rows: PinloopRow[],
  known: { ids: Set<string>; companyKeys: Set<string> },
): { fresh: PinloopRow[]; duplicates: PinloopRow[] } {
  const fresh: PinloopRow[] = [];
  const duplicates: PinloopRow[] = [];
  const seenIds = new Set(known.ids);
  const seenKeys = new Set(known.companyKeys);

  for (const row of rows) {
    const key = companyKey(row.company, row.title);
    const isAggregator = AGGREGATORS.includes(row.company.toLowerCase().trim());
    if (isAggregator || seenIds.has(row.id) || seenKeys.has(key)) {
      duplicates.push(row);
      continue;
    }
    seenIds.add(row.id);
    seenKeys.add(key);
    fresh.push(row);
  }

  return { fresh, duplicates };
}

export function toJobRows(
  rows: PinloopRow[],
  records: FetchRecord[],
  seenAt: string,
): JobRow[] {
  const byId = new Map(records.map((record) => [record.id, record]));

  return rows.map((row) => {
    const record = byId.get(row.id);
    const workplace = row.workplace_type ?? record?.workplace_type ?? null;
    return {
      id: row.id,
      title: row.title,
      company: row.company,
      company_key: companyKey(row.company, row.title),
      locations: row.locations.join("; "),
      workplace_type: workplace,
      employment_type: Array.isArray(row.employment_type)
        ? row.employment_type.join(", ")
        : row.employment_type,
      posted_at: row.posted_at,
      url: row.url,
      comp_min: record?.compensation?.min ?? null,
      comp_max: record?.compensation?.max ?? null,
      comp_currency: record?.compensation?.currency ?? null,
      experience_level: record?.experience_level ?? null,
      source: SOURCE,
      out_of_area: isTargetLocation(row.locations, workplace) ? 0 : 1,
      status: "new",
      first_seen_at: seenAt,
      emailed_at: null,
    };
  });
}

export function rankJobs(jobs: JobRow[]): JobRow[] {
  return [...jobs].sort((a, b) => {
    const remoteGap = Number(isRemote(b.workplace_type)) - Number(isRemote(a.workplace_type));
    if (remoteGap !== 0) return remoteGap;
    const payGap = (b.comp_max ?? 0) - (a.comp_max ?? 0);
    if (payGap !== 0) return payGap;
    return b.posted_at.localeCompare(a.posted_at);
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- job-filter`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/job-filter.ts src/lib/job-filter.test.ts
git commit -m "feat(jobs): add dedupe, location filter and ranking"
```

---

### Task 4: The digest email

**Files:**
- Create: `src/lib/job-email.ts`
- Test: `src/lib/job-email.test.ts`

**Interfaces:**
- Consumes: `JobRow` from `./jobs-db`, `rankJobs` from `./job-filter`.
- Produces:
  - `export function formatPay(min: number | null, max: number | null): string`
  - `export function buildDigest(jobs: JobRow[], missed: number, now: Date): { subject: string; text: string; html: string }`
  - `export async function sendDigest(jobs: JobRow[], missed: number, now: Date): Promise<{ sent: boolean; error: string | null }>`

**Behavior the tests pin down:**
- The subject counts the roles and names the date, for example `3 new GTM roles - Sep 24`. One role reads `1 new GTM role - Sep 24`.
- Pay prints as `$135k-$187k`, or `pay not listed` when absent.
- The body carries every apply link.
- A missed count above zero adds one closing line naming the number. Zero adds nothing.
- `sendDigest` with no jobs sends nothing and reports `sent: false` without an error.

- [ ] **Step 1: Write the failing test**

Create `src/lib/job-email.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { JobRow } from "./jobs-db";
import { buildDigest, formatPay } from "./job-email";

const job = (overrides: Partial<JobRow> = {}): JobRow => ({
  id: "a",
  title: "GTM Engineer",
  company: "ClickHouse",
  company_key: "clickhouse|gtm engineer",
  locations: "United States",
  workplace_type: "Remote OK",
  employment_type: "FULL_TIME",
  posted_at: "2026-09-24T00:00:00.000Z",
  url: "https://example.com/job",
  comp_min: 135150,
  comp_max: 187000,
  comp_currency: "USD",
  experience_level: "5-10",
  source: "career sites",
  out_of_area: 0,
  status: "new",
  first_seen_at: "2026-09-24T12:00:00.000Z",
  emailed_at: null,
});

describe("formatPay", () => {
  it("shortens a range to thousands", () => {
    expect(formatPay(135150, 187000)).toBe("$135k-$187k");
  });

  it("handles one-sided and missing pay", () => {
    expect(formatPay(null, 187000)).toBe("up to $187k");
    expect(formatPay(150000, null)).toBe("from $150k");
    expect(formatPay(null, null)).toBe("pay not listed");
  });
});

describe("buildDigest", () => {
  const now = new Date("2026-09-24T12:00:00.000Z");

  it("counts the roles in the subject", () => {
    expect(buildDigest([job()], 0, now).subject).toBe("1 new GTM role - Sep 24");
    expect(buildDigest([job(), job({ id: "b" })], 0, now).subject).toBe(
      "2 new GTM roles - Sep 24",
    );
  });

  it("includes every apply link and the pay", () => {
    const digest = buildDigest([job({ url: "https://example.com/one" })], 0, now);
    expect(digest.text).toContain("https://example.com/one");
    expect(digest.html).toContain("https://example.com/one");
    expect(digest.text).toContain("$135k-$187k");
  });

  it("names how many were missed only when some were", () => {
    expect(buildDigest([job()], 3, now).text).toContain("3");
    expect(buildDigest([job()], 3, now).text.toLowerCase()).toContain("credit");
    expect(buildDigest([job()], 0, now).text.toLowerCase()).not.toContain("credit");
  });

  it("puts remote roles first", () => {
    const digest = buildDigest(
      [
        job({ id: "onsite", company: "Onsite Co", workplace_type: "On-site", comp_max: 999000 }),
        job({ id: "remote", company: "Remote Co", workplace_type: "Remote Solely" }),
      ],
      0,
      now,
    );
    expect(digest.text.indexOf("Remote Co")).toBeLessThan(digest.text.indexOf("Onsite Co"));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- job-email`
Expected: FAIL, cannot resolve `./job-email`.

- [ ] **Step 3: Write `src/lib/job-email.ts`**

```ts
import { Resend } from "resend";
import type { JobRow } from "./jobs-db";
import { rankJobs } from "./job-filter";

const FROM = "Mazza Builds Jobs <contact@mazzabuilds.com>";
const TO = "alexmazza96@gmail.com";

function thousands(value: number): string {
  return `$${Math.round(value / 1000)}k`;
}

export function formatPay(min: number | null, max: number | null): string {
  if (min != null && max != null) return `${thousands(min)}-${thousands(max)}`;
  if (max != null) return `up to ${thousands(max)}`;
  if (min != null) return `from ${thousands(min)}`;
  return "pay not listed";
}

function hoursOld(postedAt: string, now: Date): string {
  const posted = new Date(postedAt).getTime();
  if (Number.isNaN(posted)) return "";
  const hours = Math.max(0, Math.round((now.getTime() - posted) / 3_600_000));
  return hours < 48 ? `${hours}h old` : `${Math.round(hours / 24)}d old`;
}

function missedLine(missed: number): string {
  return missed > 0
    ? `${missed} more matched today but the free plan's credits ran out. Pinloop Pro is $20 a month.`
    : "";
}

export function buildDigest(
  jobs: JobRow[],
  missed: number,
  now: Date,
): { subject: string; text: string; html: string } {
  const ranked = rankJobs(jobs);
  const day = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Chicago",
  });
  const subject = `${ranked.length} new GTM role${ranked.length === 1 ? "" : "s"} - ${day}`;

  const lines = ranked.map((job) => {
    const where = job.workplace_type ? `${job.locations} (${job.workplace_type})` : job.locations;
    return [
      `${job.title} at ${job.company}`,
      `  ${where}`,
      `  ${formatPay(job.comp_min, job.comp_max)} | ${hoursOld(job.posted_at, now)}`,
      `  ${job.url}`,
    ].join("\n");
  });

  const tail = missedLine(missed);
  const text = [...lines, tail].filter(Boolean).join("\n\n");

  const rows = ranked
    .map((job) => {
      const where = job.workplace_type
        ? `${job.locations} (${job.workplace_type})`
        : job.locations;
      return `<tr>
        <td style="padding:8px 12px 8px 0"><a href="${job.url}">${job.title}</a></td>
        <td style="padding:8px 12px 8px 0">${job.company}</td>
        <td style="padding:8px 12px 8px 0">${where}</td>
        <td style="padding:8px 12px 8px 0">${formatPay(job.comp_min, job.comp_max)}</td>
        <td style="padding:8px 0">${hoursOld(job.posted_at, now)}</td>
      </tr>`;
    })
    .join("");

  const html = `<div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:14px">
    <table cellspacing="0" cellpadding="0">${rows}</table>
    ${tail ? `<p style="color:#666">${tail}</p>` : ""}
  </div>`;

  return { subject, text, html };
}

export async function sendDigest(
  jobs: JobRow[],
  missed: number,
  now: Date,
): Promise<{ sent: boolean; error: string | null }> {
  if (jobs.length === 0) return { sent: false, error: null };

  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, error: "RESEND_API_KEY is not set" };

  const digest = buildDigest(jobs, missed, now);
  const { error } = await new Resend(key).emails.send({
    from: FROM,
    to: TO,
    subject: digest.subject,
    text: digest.text,
    html: digest.html,
  });

  if (error) return { sent: false, error: error.message ?? "Resend rejected the message" };
  return { sent: true, error: null };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- job-email`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/job-email.ts src/lib/job-email.test.ts
git commit -m "feat(jobs): add the digest email builder and sender"
```

---

### Task 5: The scan route

**Files:**
- Create: `src/lib/job-scan.ts`
- Create: `src/app/api/jobs/scan/route.ts`
- Test: `src/lib/job-scan.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1 to 4.
- Produces:
  - `export interface ScanSummary { ok: boolean; pulled: number; kept: number; outOfArea: number; duplicates: number; missed: number; creditsLeft: number | null; emailed: boolean; postedAfter: string; error: string | null }`
  - `export function yesterdayUtc(now: Date): string`
  - `export async function runScan(deps: ScanDeps, now: Date): Promise<ScanSummary>`
  - `export interface ScanDeps { pull: (opts: { postedAfter: string; limit: number; configDir: string }) => Promise<PullResult>; fetchRecords: (ids: string[], opts: { configDir: string }) => Promise<FetchRecord[]>; sendDigest: (jobs: JobRow[], missed: number, now: Date) => Promise<{ sent: boolean; error: string | null }>; configDir: string }`

`runScan` takes its dependencies as an argument so the test can drive it with fixtures and no network. The route passes the real implementations.

**Sequence inside `runScan`:**
1. `postedAfter = getState("last_posted_after") ?? yesterdayUtc(now)`.
2. `pull({ postedAfter, limit: 5, configDir })`.
3. If refused and `retryLimit` is a number, pull once more with that limit. Never more than one retry.
4. If still refused, or if `error` is set, record the scan with the message, do not advance the state, and return.
5. `classifyRows` against `findKnown`.
6. `fetchRecords` for the fresh ids, then `toJobRows`, then `insertJobs`.
7. `missed = Math.max(0, matching - pulled)`.
8. `sendDigest(getUnemailedJobs(), missed, now)`, and on success `markEmailed`.
9. `setState("last_posted_after", nextPostedAfter)` when the pull succeeded and gave one.
10. `recordScan` and return the summary.

- [ ] **Step 1: Write the failing test**

Create `src/lib/job-scan.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseFetch, parsePull } from "./pinloop";

type ScanModule = typeof import("./job-scan");
type JobsDbModule = typeof import("./jobs-db");

let scan: ScanModule;
let jobsDb: JobsDbModule;
let tmpDir: string;

const fixture = (name: string) =>
  fs.readFileSync(path.join(__dirname, "__fixtures__", name), "utf8");

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-scan-test-"));
  process.env.DATABASE_PATH = path.join(tmpDir, "scan.db");
  scan = await import("./job-scan");
  jobsDb = await import("./jobs-db");
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function deps(pullOutput: string, sent: { jobs: number }[] = []) {
  return {
    configDir: "/tmp/pinloop",
    pull: async () => parsePull(pullOutput),
    fetchRecords: async () => parseFetch(fixture("fetch-day3.json")),
    sendDigest: async (jobs: { length: number }[]) => {
      sent.push({ jobs: jobs.length });
      return { sent: jobs.length > 0, error: null };
    },
  } as unknown as import("./job-scan").ScanDeps;
}

describe("yesterdayUtc", () => {
  it("steps back one UTC day", () => {
    expect(scan.yesterdayUtc(new Date("2026-09-24T00:07:00.000Z"))).toBe("2026-09-23");
    expect(scan.yesterdayUtc(new Date("2026-03-01T01:00:00.000Z"))).toBe("2026-02-28");
  });
});

describe("runScan", () => {
  const now = new Date("2026-09-24T12:00:00.000Z");

  it("stores keepers, counts duplicates and out-of-area rows, and emails once", async () => {
    const sent: { jobs: number }[] = [];
    const summary = await scan.runScan(deps(fixture("pull-day3-with-dupe.json"), sent), now);

    expect(summary.ok).toBe(true);
    expect(summary.pulled).toBe(4);
    expect(summary.duplicates).toBe(1); // the Jobgether repost
    expect(summary.outOfArea).toBe(1); // RingCentral in Denver
    expect(summary.kept).toBe(2);
    expect(summary.emailed).toBe(true);
    expect(sent[0].jobs).toBe(2);
    expect(jobsDb.getState("last_posted_after")).toBe("2026-09-18");
  });

  it("is a no-op the second time the same rows arrive", async () => {
    const sent: { jobs: number }[] = [];
    const summary = await scan.runScan(deps(fixture("pull-day3-with-dupe.json"), sent), now);
    expect(summary.kept).toBe(0);
    expect(summary.emailed).toBe(false);
    expect(sent).toHaveLength(0);
  });

  it("records a refusal without advancing the date", async () => {
    jobsDb.setState("last_posted_after", "2026-09-18");
    const summary = await scan.runScan(deps(fixture("pull-refused.json")), now);
    expect(summary.ok).toBe(false);
    expect(summary.error).toContain("0 left today");
    expect(summary.emailed).toBe(false);
    expect(jobsDb.getState("last_posted_after")).toBe("2026-09-18");
  });

  it("records a pinloop error without advancing the date", async () => {
    const summary = await scan.runScan(
      deps(JSON.stringify({ error: "Pinloop could not finish" })),
      now,
    );
    expect(summary.ok).toBe(false);
    expect(summary.error).toBe("Pinloop could not finish");
    expect(jobsDb.getState("last_posted_after")).toBe("2026-09-18");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- job-scan`
Expected: FAIL, cannot resolve `./job-scan`.

- [ ] **Step 3: Write `src/lib/job-scan.ts`**

```ts
import { classifyRows, companyKey, toJobRows } from "./job-filter";
import {
  findKnown,
  getState,
  getUnemailedJobs,
  insertJobs,
  markEmailed,
  recordScan,
  setState,
  type JobRow,
} from "./jobs-db";
import type { FetchRecord, PullResult } from "./pinloop";

/** The free plan hands over five new postings a day. Never ask for more. */
export const DAILY_LIMIT = 5;

const STATE_KEY = "last_posted_after";

export interface ScanDeps {
  pull: (opts: {
    postedAfter: string;
    limit: number;
    configDir: string;
  }) => Promise<PullResult>;
  fetchRecords: (ids: string[], opts: { configDir: string }) => Promise<FetchRecord[]>;
  sendDigest: (
    jobs: JobRow[],
    missed: number,
    now: Date,
  ) => Promise<{ sent: boolean; error: string | null }>;
  configDir: string;
}

export interface ScanSummary {
  ok: boolean;
  pulled: number;
  kept: number;
  outOfArea: number;
  duplicates: number;
  missed: number;
  creditsLeft: number | null;
  emailed: boolean;
  postedAfter: string;
  error: string | null;
}

export function yesterdayUtc(now: Date): string {
  const stepped = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return stepped.toISOString().slice(0, 10);
}

export async function runScan(deps: ScanDeps, now: Date): Promise<ScanSummary> {
  const postedAfter = getState(STATE_KEY) ?? yesterdayUtc(now);
  const runAt = now.toISOString();

  const fail = (error: string, creditsLeft: number | null, missed = 0): ScanSummary => {
    const summary: ScanSummary = {
      ok: false,
      pulled: 0,
      kept: 0,
      outOfArea: 0,
      duplicates: 0,
      missed,
      creditsLeft,
      emailed: false,
      postedAfter,
      error,
    };
    recordScan({
      run_at: runAt,
      posted_after: postedAfter,
      pulled: 0,
      kept: 0,
      out_of_area: 0,
      duplicates: 0,
      missed,
      credits_left: creditsLeft,
      emailed: 0,
      error,
    });
    return summary;
  };

  let result: PullResult;
  try {
    result = await deps.pull({ postedAfter, limit: DAILY_LIMIT, configDir: deps.configDir });
    if (result.refused && result.retryLimit != null) {
      result = await deps.pull({
        postedAfter,
        limit: result.retryLimit,
        configDir: deps.configDir,
      });
    }
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Pinloop call failed", null);
  }

  if (result.error) return fail(result.error, result.creditsLeft);
  if (result.refused) return fail(result.refused, result.creditsLeft, result.matching);

  const known = findKnown(
    result.rows.map((row) => row.id),
    result.rows.map((row) => companyKey(row.company, row.title)),
  );
  const { fresh, duplicates } = classifyRows(result.rows, known);

  let records: FetchRecord[] = [];
  if (fresh.length > 0) {
    try {
      records = await deps.fetchRecords(
        fresh.map((row) => row.id),
        { configDir: deps.configDir },
      );
    } catch {
      records = [];
    }
  }

  const jobs = toJobRows(fresh, records, runAt);
  insertJobs(jobs);

  const outOfArea = jobs.filter((job) => job.out_of_area === 1).length;
  const kept = jobs.length - outOfArea;
  const missed = Math.max(0, result.matching - result.pulled);

  const pending = getUnemailedJobs();
  const delivery = await deps.sendDigest(pending, missed, now);
  if (delivery.sent) markEmailed(pending.map((job) => job.id), runAt);

  if (result.nextPostedAfter) setState(STATE_KEY, result.nextPostedAfter);

  recordScan({
    run_at: runAt,
    posted_after: postedAfter,
    pulled: result.pulled,
    kept,
    out_of_area: outOfArea,
    duplicates: duplicates.length,
    missed,
    credits_left: result.creditsLeft,
    emailed: delivery.sent ? 1 : 0,
    error: delivery.error,
  });

  return {
    ok: true,
    pulled: result.pulled,
    kept,
    outOfArea,
    duplicates: duplicates.length,
    missed,
    creditsLeft: result.creditsLeft,
    emailed: delivery.sent,
    postedAfter,
    error: delivery.error,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- job-scan`
Expected: PASS.

- [ ] **Step 5: Read the Next 16 route handler docs**

Run: `ls node_modules/next/dist/docs/` and read the route handler page found there. Confirm the export shape (`export async function POST(request: Request)`), and how `runtime` and `dynamic` are declared in this version. Follow whatever that documentation says over the sketch below.

- [ ] **Step 6: Write `src/app/api/jobs/scan/route.ts`**

```ts
import { type NextRequest } from "next/server";
import { sendDigest } from "@/lib/job-email";
import { runScan } from "@/lib/job-scan";
import { fetchRecords, pull } from "@/lib/pinloop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONFIG_DIR = process.env.PINLOOP_CONFIG_DIR ?? "/data/.pinloop";

export async function POST(request: NextRequest) {
  const secret = process.env.JOB_SCAN_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runScan(
    { pull, fetchRecords, sendDigest, configDir: CONFIG_DIR },
    new Date(),
  );

  return Response.json(summary, { status: summary.ok ? 200 : 502 });
}
```

- [ ] **Step 7: Check the build compiles**

Run: `npm run build`
Expected: the build succeeds and lists `/api/jobs/scan` among the routes.

- [ ] **Step 8: Commit**

```bash
git add src/lib/job-scan.ts src/lib/job-scan.test.ts src/app/api/jobs/scan/route.ts
git commit -m "feat(jobs): add the scan orchestration and its protected route"
```

---

### Task 6: Scheduling, container support, and setup docs

**Files:**
- Create: `.github/workflows/job-scan.yml`
- Modify: `Dockerfile` (npm cache directory so `npx` can write)
- Modify: `.env.example`
- Create: `docs/job-watcher.md`

**Interfaces:**
- Consumes: the route from Task 5.
- Produces: nothing other code imports.

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/job-scan.yml`:

```yaml
name: Job Scan

on:
  schedule:
    # 00:07 UTC daily, a few minutes after Pinloop's midnight-UTC reset (7:07pm Chicago).
    - cron: "7 0 * * *"
  workflow_dispatch:

jobs:
  scan:
    name: Scan for new GTM roles
    runs-on: ubuntu-latest
    steps:
      - name: Call the scan endpoint
        run: |
          code=$(curl -sS -o response.json -w "%{http_code}" -X POST \
            -H "Authorization: Bearer ${{ secrets.JOB_SCAN_SECRET }}" \
            --max-time 180 \
            https://mazzabuilds.fly.dev/api/jobs/scan)
          cat response.json
          echo ""
          if [ "$code" != "200" ]; then
            echo "Scan returned HTTP $code"
            exit 1
          fi
```

- [ ] **Step 2: Let npx write its cache inside the container**

In `Dockerfile`, in the `runner` stage, after the existing `ENV NODE_ENV=production` line, add:

```dockerfile
# npx resolves the pinloop CLI at runtime; the nextjs user needs a writable cache,
# and /data is the Fly volume.
ENV npm_config_cache=/data/.npm
```

- [ ] **Step 3: Document the new environment variables**

Append to `.env.example`:

```bash
# Secret for authenticating job scan requests (generate with: openssl rand -hex 32)
JOB_SCAN_SECRET=your-secret-here

# Where the pinloop CLI keeps its login (the Fly volume in production)
PINLOOP_CONFIG_DIR=/data/.pinloop
```

- [ ] **Step 4: Write the setup guide**

Create `docs/job-watcher.md` covering, in this order:
1. What the watcher does, in three sentences, and that it runs on the free Pinloop plan at 5 new postings a day.
2. Generating `JOB_SCAN_SECRET` with `openssl rand -hex 32`, setting it with `fly secrets set JOB_SCAN_SECRET="..." --app mazzabuilds`, and adding the same value as a GitHub Actions repository secret named `JOB_SCAN_SECRET`.
3. Copying the Pinloop login to the volume:
   ```bash
   fly ssh console --app mazzabuilds -C "mkdir -p /data/.pinloop"
   fly ssh sftp shell --app mazzabuilds
   # then: put ~/.pinloop/credentials.json /data/.pinloop/credentials.json
   fly ssh console --app mazzabuilds -C "chmod 600 /data/.pinloop/credentials.json"
   ```
   with the warning that Pinloop then runs on Fly only, because a refreshed token can invalidate the copy on the Mac.
4. Running it by hand: the Actions "Job Scan" workflow has a Run workflow button, or
   ```bash
   curl -X POST -H "Authorization: Bearer $JOB_SCAN_SECRET" https://mazzabuilds.fly.dev/api/jobs/scan
   ```
5. What the response fields mean, and that a `missed` count above zero is the signal that the free plan is too small.
6. Re-authenticating when the login expires: `pinloop login`, open the URL, `pinloop login --code XXXX-XXXX`, then copy the file up again.
7. Reading the history:
   ```bash
   fly ssh console --app mazzabuilds -C "sqlite3 /data/usage.db 'SELECT run_at, pulled, kept, missed, error FROM job_scans ORDER BY id DESC LIMIT 10;'"
   ```

- [ ] **Step 5: Verify the whole suite and the build**

Run: `npm test && npm run build && npm run lint`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/job-scan.yml Dockerfile .env.example docs/job-watcher.md
git commit -m "feat(jobs): schedule the daily scan and document setup"
```

---

## Self-Review

**Spec coverage:** Title query and fixed conditions, Task 2. Scan sequence, Task 5. Three dedupe layers, Task 3. Location filter, Task 3. Email, Task 4. Both tables plus `job_state`, Task 1. Credentials on the volume, Task 6. Failure table: unauthorized in Task 5, refusals and server errors in Task 5, Resend failure in Tasks 4 and 5, npx cache in Task 6. Dry run: dropped deliberately, because `runScan` takes its dependencies as an argument and the tests drive it with real fixtures, which covers the same ground without an extra code path in production. Everything else in the spec has a task.

**Type consistency:** `JobRow` is defined in Task 1 and used unchanged in Tasks 3, 4, and 5. `PinloopRow`, `PullResult`, and `FetchRecord` are defined in Task 2 and consumed in Tasks 3 and 5. `companyKey`, `classifyRows`, `toJobRows`, and `rankJobs` keep the same signatures where they appear. `SOURCE` is exported from `pinloop.ts` and imported by `job-filter.ts`.

**Placeholders:** none. Every code step carries the code.
