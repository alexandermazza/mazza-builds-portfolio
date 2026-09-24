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
  ...overrides,
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

  it("escapes employer text and the apply link so the email cannot be broken", () => {
    const digest = buildDigest(
      [
        job({
          title: "GTM Engineer <AI & Growth>",
          company: '"Acme" <script>alert(1)</script>',
          url: 'https://example.com/job?a="b',
        }),
      ],
      0,
      now,
    );
    expect(digest.html).not.toContain("<script>");
    expect(digest.html).toContain("&lt;script&gt;");
    expect(digest.html).toContain("GTM Engineer &lt;AI &amp; Growth&gt;");
    expect(digest.html).toContain('href="https://example.com/job?a=&quot;b"');
    // The plain text part is not markup, so it keeps the original characters.
    expect(digest.text).toContain("GTM Engineer <AI & Growth>");
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
