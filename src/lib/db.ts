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
      input_tokens INTEGER,
      output_tokens INTEGER,
      cache_creation_tokens INTEGER,
      cache_read_tokens INTEGER,
      total_tokens INTEGER,
      cost_usd REAL,
      updated_at TEXT
    )
  `);

  return _db;
}

export function upsertUsage(records: DailyUsage[]): number {
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

export function getUsageLast365(): DailyUsage[] {
  const db = getDb();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 365);
  const cutoffStr = cutoff.toISOString().slice(0, 10).replace(/-/g, "");

  return db
    .prepare(
      `SELECT * FROM daily_usage WHERE date >= ? ORDER BY date ASC`
    )
    .all(cutoffStr) as DailyUsage[];
}
