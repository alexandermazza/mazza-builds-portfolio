import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  childEnv,
  matchedFromRefusal,
  parseFetch,
  parsePull,
  retryLimitFromRefusal,
  TITLE_QUERY,
} from "./pinloop";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => fs.readFileSync(path.join(here, "__fixtures__", name), "utf8");

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

describe("matchedFromRefusal", () => {
  it("reads how many the refused call would have handed over", () => {
    expect(
      matchedFromRefusal("this pull would take 5 postings and this account has 0 left today."),
    ).toBe(5);
    expect(
      matchedFromRefusal(
        "this search could take up to 4 new postings and this account has 0 left today.",
      ),
    ).toBe(4);
  });

  it("returns zero when the message names no number", () => {
    expect(matchedFromRefusal("narrow it")).toBe(0);
  });
});

describe("childEnv", () => {
  const source = {
    PATH: "/usr/bin",
    HOME: "/home/nextjs",
    npm_config_cache: "/data/.npm",
    RESEND_API_KEY: "re_secret",
    JOB_SCAN_SECRET: "scan_secret",
    GITHUB_TOKEN: "gh_secret",
    DATABASE_PATH: "/data/usage.db",
  };

  it("keeps only what the CLI needs to run", () => {
    const env = childEnv("/data/.pinloop", source);
    expect(env.PATH).toBe("/usr/bin");
    expect(env.HOME).toBe("/home/nextjs");
    expect(env.npm_config_cache).toBe("/data/.npm");
    expect(env.PINLOOP_CONFIG_DIR).toBe("/data/.pinloop");
    expect(env.NO_COLOR).toBe("1");
  });

  it("withholds every other secret from a package resolved at runtime", () => {
    const env = childEnv("/data/.pinloop", source);
    expect(env.RESEND_API_KEY).toBeUndefined();
    expect(env.JOB_SCAN_SECRET).toBeUndefined();
    expect(env.GITHUB_TOKEN).toBeUndefined();
    expect(env.DATABASE_PATH).toBeUndefined();
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
