import { classifyRows, companyKey, toJobRows } from "./job-filter";
import {
  acquireScanLock,
  findKnown,
  getState,
  getUnemailedJobs,
  insertJobs,
  markEmailed,
  recordScan,
  releaseScanLock,
  setState,
  type JobRow,
} from "./jobs-db";
import { matchedFromRefusal, type FetchRecord, type PullResult } from "./pinloop";

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
  skipped: boolean;
  pulled: number;
  kept: number;
  outOfArea: number;
  duplicates: number;
  missed: number;
  creditsLeft: number | null;
  emailed: boolean;
  postedAfter: string;
  refused: string | null;
  error: string | null;
}

export function yesterdayUtc(now: Date): string {
  const stepped = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return stepped.toISOString().slice(0, 10);
}

function blank(postedAfter: string): ScanSummary {
  return {
    ok: true,
    skipped: false,
    pulled: 0,
    kept: 0,
    outOfArea: 0,
    duplicates: 0,
    missed: 0,
    creditsLeft: null,
    emailed: false,
    postedAfter,
    refused: null,
    error: null,
  };
}

export async function runScan(deps: ScanDeps, now: Date): Promise<ScanSummary> {
  const postedAfter = getState(STATE_KEY) ?? yesterdayUtc(now);
  const runAt = now.toISOString();

  // A second run while one is in flight would spend the day's credits twice and
  // send the digest twice, so it waits for the next scheduled scan instead.
  if (!acquireScanLock(now)) {
    return { ...blank(postedAfter), skipped: true };
  }

  const finish = (summary: ScanSummary): ScanSummary => {
    recordScan({
      run_at: runAt,
      posted_after: postedAfter,
      pulled: summary.pulled,
      kept: summary.kept,
      out_of_area: summary.outOfArea,
      duplicates: summary.duplicates,
      missed: summary.missed,
      credits_left: summary.creditsLeft,
      emailed: summary.emailed ? 1 : 0,
      error: summary.error ?? summary.refused,
    });
    return summary;
  };

  try {
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
      return finish({
        ...blank(postedAfter),
        ok: false,
        error: err instanceof Error ? err.message : "Pinloop call failed",
      });
    }

    if (result.error) {
      return finish({
        ...blank(postedAfter),
        ok: false,
        creditsLeft: result.creditsLeft,
        error: result.error,
      });
    }

    // Running out of credits is an ordinary busy day, not a failure. What matters is
    // the record of how many postings the day could not reach. Anything already
    // waiting to be emailed still goes out below.
    if (result.refused) {
      return deliver(
        {
          ...blank(postedAfter),
          creditsLeft: result.creditsLeft,
          missed: matchedFromRefusal(result.refused),
          refused: result.refused,
        },
        deps,
        now,
        runAt,
        finish,
      );
    }

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

    // The credits are spent and the rows are stored, so the window moves on now.
    // Anything that fails after this costs nothing beyond one delayed email.
    if (result.nextPostedAfter) setState(STATE_KEY, result.nextPostedAfter);

    const outOfArea = jobs.filter((job) => job.out_of_area === 1).length;
    const summary: ScanSummary = {
      ...blank(postedAfter),
      pulled: result.pulled,
      kept: jobs.length - outOfArea,
      outOfArea,
      duplicates: duplicates.length,
      missed: Math.max(0, result.matching - result.pulled),
      creditsLeft: result.creditsLeft,
    };

    return deliver(summary, deps, now, runAt, finish);
  } finally {
    releaseScanLock();
  }
}

/**
 * Emails whatever is waiting, including roles an earlier run stored but could not
 * send. Rows keep `emailed_at` null until a send succeeds, so nothing is lost when
 * Resend is down, and nothing is sent twice when it is not.
 */
async function deliver(
  summary: ScanSummary,
  deps: ScanDeps,
  now: Date,
  runAt: string,
  finish: (summary: ScanSummary) => ScanSummary,
): Promise<ScanSummary> {
  const pending = getUnemailedJobs();
  if (pending.length === 0) return finish(summary);

  try {
    const delivery = await deps.sendDigest(pending, summary.missed, now);
    if (delivery.sent) {
      markEmailed(
        pending.map((job) => job.id),
        runAt,
      );
    }
    return finish({ ...summary, emailed: delivery.sent, error: delivery.error });
  } catch (err) {
    // Resend throws on a network failure rather than returning an error.
    return finish({
      ...summary,
      error: err instanceof Error ? err.message : "Sending the digest failed",
    });
  }
}

