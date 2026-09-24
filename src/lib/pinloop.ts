import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export const TITLE_QUERY =
  "((GTM OR go-to-market) AND (engineer OR engineering)) OR " +
  "((AI OR automation OR agentic) AND (GTM OR go-to-market OR revenue OR marketing) " +
  "AND (engineer OR engineering OR architect OR developer))";

export const COUNTRY = "United States";
export const SOURCE = "career sites";

/** How long one Pinloop call may take. npx resolves the package on the first run. */
const TIMEOUT_MS = 120_000;

export interface PinloopRow {
  id: string;
  title: string;
  company: string;
  locations: string[];
  posted_at: string;
  url: string;
  workplace_type: string | null;
  employment_type: string | string[] | null;
  already_had?: boolean;
}

export interface PullResult {
  rows: PinloopRow[];
  pulled: number;
  matching: number;
  creditsLeft: number | null;
  refused: string | null;
  retryLimit: number | null;
  error: string | null;
  nextPostedAfter: string | null;
}

export interface FetchRecord {
  id: string;
  compensation: { min: number | null; max: number | null; currency: string | null } | null;
  experience_level: string | null;
  workplace_type: string | null;
  employment_type: string | string[] | null;
}

function asJson(stdout: string): Record<string, unknown> {
  try {
    return JSON.parse(stdout) as Record<string, unknown>;
  } catch {
    throw new Error(`Pinloop output is not valid JSON: ${stdout.slice(0, 200)}`);
  }
}

function companyName(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "name" in value) {
    const name = (value as { name?: unknown }).name;
    if (typeof name === "string") return name;
  }
  return "";
}

function toRow(raw: Record<string, unknown>): PinloopRow {
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? ""),
    company: companyName(raw.company),
    locations: Array.isArray(raw.locations) ? raw.locations.map(String) : [],
    posted_at: String(raw.posted_at ?? ""),
    url: String(raw.url ?? raw.posting_url ?? ""),
    workplace_type: raw.workplace_type == null ? null : String(raw.workplace_type),
    employment_type: (raw.employment_type as string | string[] | null) ?? null,
    already_had: raw.already_had === true,
  };
}

export function retryLimitFromRefusal(message: string): number | null {
  const match = /has (\d+) left/i.exec(message);
  if (!match) return null;
  const left = Number(match[1]);
  return Number.isFinite(left) && left > 0 ? left : null;
}

export function parsePull(stdout: string): PullResult {
  const data = asJson(stdout);
  const empty: PullResult = {
    rows: [],
    pulled: 0,
    matching: 0,
    creditsLeft: null,
    refused: null,
    retryLimit: null,
    error: null,
    nextPostedAfter: null,
  };

  if (typeof data.error === "string") {
    return { ...empty, error: data.error };
  }

  if (typeof data.refused === "string") {
    return { ...empty, refused: data.refused, retryLimit: retryLimitFromRefusal(data.refused) };
  }

  const postings = (data.postings ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(data.rows)
    ? data.rows.map((r) => toRow(r as Record<string, unknown>))
    : [];

  return {
    rows,
    pulled: Number(postings.pulled ?? rows.length),
    matching: Number(postings.matching ?? rows.length),
    creditsLeft: postings.left == null ? null : Number(postings.left),
    refused: null,
    retryLimit: null,
    error: null,
    nextPostedAfter:
      typeof postings.next_posted_after === "string" ? postings.next_posted_after : null,
  };
}

export function parseFetch(stdout: string): FetchRecord[] {
  const data = asJson(stdout);
  const rows = Array.isArray(data.rows) ? data.rows : [];
  return rows.map((entry) => {
    const raw = entry as Record<string, unknown>;
    const comp = raw.compensation as Record<string, unknown> | null | undefined;
    return {
      id: String(raw.id ?? ""),
      compensation: comp
        ? {
            min: comp.min == null ? null : Number(comp.min),
            max: comp.max == null ? null : Number(comp.max),
            currency: comp.currency == null ? null : String(comp.currency),
          }
        : null,
      experience_level: raw.experience_level == null ? null : String(raw.experience_level),
      workplace_type: raw.workplace_type == null ? null : String(raw.workplace_type),
      employment_type: (raw.employment_type as string | string[] | null) ?? null,
    };
  });
}

async function cli(args: string[], configDir: string): Promise<string> {
  const { stdout } = await run("npx", ["--yes", "pinloop@latest", ...args], {
    timeout: TIMEOUT_MS,
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env, PINLOOP_CONFIG_DIR: configDir, NO_COLOR: "1" },
  });
  return stdout;
}

export async function pull(opts: {
  postedAfter: string;
  limit: number;
  configDir: string;
}): Promise<PullResult> {
  const stdout = await cli(
    [
      "pull",
      "--in",
      "title",
      TITLE_QUERY,
      "--country",
      COUNTRY,
      "--from",
      SOURCE,
      "--posted-after",
      opts.postedAfter,
      "--limit",
      String(opts.limit),
      "--json",
    ],
    opts.configDir,
  );
  return parsePull(stdout);
}

export async function fetchRecords(
  ids: string[],
  opts: { configDir: string },
): Promise<FetchRecord[]> {
  if (ids.length === 0) return [];
  const stdout = await cli(["fetch", ids.join(","), "--json"], opts.configDir);
  return parseFetch(stdout);
}
