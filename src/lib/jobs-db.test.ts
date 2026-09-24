import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type JobsDb = typeof import("./jobs-db");
type JobRow = import("./jobs-db").JobRow;

let jobsDb: JobsDb;
let tmpDir: string;

function job(overrides: Partial<JobRow> = {}): JobRow {
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
    jobsDb.insertJobs([
      job({
        id: "22222222-2222-2222-2222-222222222222",
        company_key: "navan|senior gtm engineer",
      }),
    ]);
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

  it("records a scan and reads it back", () => {
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
    const last = jobsDb.getLastScan();
    expect(last?.pulled).toBe(4);
    expect(last?.missed).toBe(3);
    expect(last?.posted_after).toBe("2026-09-23");
  });

  it("does not let a stored out-of-area role mask a later in-area one", () => {
    // Navan/Austin arrives first and is stored out of area. When the same role turns
    // up in New York days later, its company key must not read as already seen.
    jobsDb.insertJobs([
      job({
        id: "66666666-6666-6666-6666-666666666666",
        company: "Navan",
        company_key: "navan|staff gtm engineer",
        locations: "Austin, Texas, United States",
        workplace_type: "On-site",
        out_of_area: 1,
      }),
    ]);
    const known = jobsDb.findKnown([], ["navan|staff gtm engineer"]);
    expect(known.companyKeys.has("navan|staff gtm engineer")).toBe(false);
  });

  describe("the scan lock", () => {
    const start = new Date("2026-09-24T12:00:00.000Z");

    it("is held by the first caller and refused to the second", () => {
      expect(jobsDb.acquireScanLock(start)).toBe(true);
      expect(jobsDb.acquireScanLock(new Date(start.getTime() + 1000))).toBe(false);
      jobsDb.releaseScanLock();
      expect(jobsDb.acquireScanLock(start)).toBe(true);
      jobsDb.releaseScanLock();
    });

    it("expires so a crashed run cannot block every later one", () => {
      expect(jobsDb.acquireScanLock(start)).toBe(true);
      const later = new Date(start.getTime() + 16 * 60 * 1000);
      expect(jobsDb.acquireScanLock(later)).toBe(true);
      jobsDb.releaseScanLock();
    });
  });
});
