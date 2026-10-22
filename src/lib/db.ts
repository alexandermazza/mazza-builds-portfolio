import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "usage.db");

export interface DailyUsage {
  date: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  total_tokens: number;
  cost_usd: number;
  updated_at: string;
}

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");

  _db.exec(`
    CREATE TABLE IF NOT EXISTS daily_usage (
      date TEXT PRIMARY KEY,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
      cache_read_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    )
  `);

  return _db;
}

const DATE_RE = /^\d{8}$/;

export function upsertUsage(records: DailyUsage[]): number {
  if (records.length === 0) return 0;

  for (const r of records) {
    if (!DATE_RE.test(r.date)) {
      throw new Error(`Invalid date format: "${r.date}" (expected YYYYMMDD)`);
    }
  }

  const db = getDb();

  const stmt = db.prepare(`
    INSERT INTO daily_usage (
      date,
      input_tokens,
      output_tokens,
      cache_creation_tokens,
      cache_read_tokens,
      total_tokens,
      cost_usd,
      updated_at
    ) VALUES (
      @date,
      @input_tokens,
      @output_tokens,
      @cache_creation_tokens,
      @cache_read_tokens,
      @total_tokens,
      @cost_usd,
      @updated_at
    )
    ON CONFLICT(date) DO UPDATE SET
      input_tokens = excluded.input_tokens,
      output_tokens = excluded.output_tokens,
      cache_creation_tokens = excluded.cache_creation_tokens,
      cache_read_tokens = excluded.cache_read_tokens,
      total_tokens = excluded.total_tokens,
      cost_usd = excluded.cost_usd,
      updated_at = excluded.updated_at
  `);

  const runMany = db.transaction((rows: DailyUsage[]) => {
    for (const row of rows) {
      stmt.run(row);
    }
    return rows.length;
  });

  return runMany(records) as number;
}

// Hardcoded to Jan 1 2026 — the date usage tracking began.
// Update this if the tracking start date changes.
const USAGE_START_DATE = "20260101";

export function getUsageLast365(): DailyUsage[] {
  const db = getDb();

  return db
    .prepare(
      `SELECT * FROM daily_usage WHERE date >= ? ORDER BY date ASC`
    )
    .all(USAGE_START_DATE) as DailyUsage[];
}
