import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePull } from "./pinloop";
import type { JobRow } from "./jobs-db";
import { classifyRows, companyKey, isTargetLocation, rankJobs, toJobRows } from "./job-filter";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => fs.readFileSync(path.join(here, "__fixtures__", name), "utf8");

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

  it("keeps a role that names no city, because the city cannot be ruled out", () => {
    // Engine listed a hybrid Senior GTM Engineer role as "United States" and nothing more.
    expect(isTargetLocation(["United States"], "Hybrid")).toBe(true);
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
    expect(duplicates.some((r) => r.id === rows[0].id)).toBe(true);
    expect(fresh.some((r) => r.id === rows[0].id)).toBe(false);
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
    const keys = new Set(fresh.map((r) => companyKey(r.company, r.title)));
    expect(fresh).toHaveLength(keys.size);
    expect(fresh.some((r) => r.id === "different-id")).toBe(false);
  });

  it("keeps the in-area copy when one role is listed in several cities", () => {
    // Navan listed one Senior GTM Engineer role in Austin, Palo Alto/SF and New York,
    // Austin first. Keeping the first would throw away the copy Alex could take.
    const rows = parsePull(fixture("pull-career-sites.json")).rows;
    const { fresh } = classifyRows(rows, {
      ids: new Set<string>(),
      companyKeys: new Set<string>(),
    });
    const navan = fresh.filter((r) => r.company === "Navan");
    expect(navan).toHaveLength(1);
    expect(navan[0].locations.join("; ")).toMatch(/New York|San Francisco/);
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
