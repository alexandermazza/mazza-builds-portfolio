import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFetch, parsePull } from "./pinloop";
import type { JobRow } from "./jobs-db";
import type { ScanDeps } from "./job-scan";

type ScanModule = typeof import("./job-scan");
type JobsDbModule = typeof import("./jobs-db");

let scan: ScanModule;
let jobsDb: JobsDbModule;
let tmpDir: string;

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => fs.readFileSync(path.join(here, "__fixtures__", name), "utf8");

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-scan-test-"));
  process.env.DATABASE_PATH = path.join(tmpDir, "scan.db");
  scan = await import("./job-scan");
  jobsDb = await import("./jobs-db");
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function deps(pullOutput: string, sent: { jobs: number }[] = []): ScanDeps {
  return {
    configDir: "/tmp/pinloop",
    pull: async () => parsePull(pullOutput),
    fetchRecords: async () => parseFetch(fixture("fetch-day3.json")),
    sendDigest: async (jobs: JobRow[]) => {
      sent.push({ jobs: jobs.length });
      return { sent: jobs.length > 0, error: null };
    },
  };
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

  it("retries once with the smaller limit a refusal names", async () => {
    const asked: number[] = [];
    const base = deps(fixture("pull-day3-with-dupe.json"));
    const refusal = JSON.parse(fixture("pull-refused.json")) as { refused: string };
    const summary = await scan.runScan(
      {
        ...base,
        pull: async ({ limit }) => {
          asked.push(limit);
          return asked.length === 1
            ? parsePull(
                JSON.stringify({
                  rows: [],
                  refused: "this pull would take 5 postings and this account has 2 left today.",
                }),
              )
            : parsePull(fixture("pull-day3-with-dupe.json"));
        },
      },
      now,
    );
    expect(asked).toEqual([5, 2]);
    expect(summary.ok).toBe(true);
    expect(refusal.refused).toContain("0 left today");
  });
});
