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
    // Only a stored in-area row makes a company key "seen". A role first logged in a
    // city Alex cannot take must not mask the same role when it appears in one he can.
    const rows = handle
      .prepare(
        `SELECT company_key FROM jobs WHERE company_key IN (${placeholders}) AND out_of_area = 0`,
      )
      .all(...companyKeys) as { company_key: string }[];
    for (const row of rows) found.companyKeys.add(row.company_key);
  }

  return found;
}

/** How long one scan may hold the lock before a later run treats it as dead. */
const LOCK_TTL_MS = 15 * 60 * 1000;
const LOCK_KEY = "scan_lock";

/**
 * Stops two scans running at once, which would spend the day's credits twice and
 * send the digest twice. better-sqlite3 is synchronous, so the read and the write
 * inside one transaction cannot interleave with another caller in this process.
 */
export function acquireScanLock(now: Date, ttlMs: number = LOCK_TTL_MS): boolean {
  const handle = db();
  const attempt = handle.transaction(() => {
    const row = handle.prepare(`SELECT value FROM job_state WHERE key = ?`).get(LOCK_KEY) as
      | { value: string }
      | undefined;
    if (row) {
      const held = Date.parse(row.value);
      if (Number.isFinite(held) && now.getTime() - held < ttlMs) return false;
    }
    handle
      .prepare(
        `INSERT INTO job_state (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run(LOCK_KEY, now.toISOString());
    return true;
  });
  return attempt() as boolean;
}

export function releaseScanLock(): void {
  db().prepare(`DELETE FROM job_state WHERE key = ?`).run(LOCK_KEY);
}

export function getLastScan(): ScanRecord | null {
  const row = db().prepare(`SELECT * FROM job_scans ORDER BY id DESC LIMIT 1`).get() as
    | ScanRecord
    | undefined;
  return row ?? null;
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
