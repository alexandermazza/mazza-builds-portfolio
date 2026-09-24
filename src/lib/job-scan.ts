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
  pull: (opts: { postedAfter: string; limit: number; configDir: string }) => Promise<PullResult>;
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
    return {
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
      // The full records only add pay and experience. A pull worth storing is not
      // thrown away because the follow-up call failed.
      records = [];
    }
  }

  const jobs = toJobRows(fresh, records, runAt);
  insertJobs(jobs);

  const outOfArea = jobs.filter((job) => job.out_of_area === 1).length;
  const kept = jobs.length - outOfArea;
  const missed = Math.max(0, result.matching - result.pulled);

  const pending = getUnemailedJobs();
  const delivery =
    pending.length > 0
      ? await deps.sendDigest(pending, missed, now)
      : { sent: false, error: null };
  if (delivery.sent) {
    markEmailed(
      pending.map((job) => job.id),
      runAt,
    );
  }

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
