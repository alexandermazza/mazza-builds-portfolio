import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export const TITLE_QUERY =
  "((GTM OR go-to-market) AND (engineer OR engineering)) OR " +
  "((AI OR automation OR agentic) AND (GTM OR go-to-market OR revenue OR marketing) " +
  "AND (engineer OR engineering OR architect OR developer))";

export const COUNTRY = "United States";
export const SOURCE = "career sites";

/**
 * How long each Pinloop call may take. npx resolves the package on the first run.
 * The two together stay under the 240s the GitHub Actions caller waits, so a slow
 * scan reports a result rather than timing out on the client and looking broken.
 */
const PULL_TIMEOUT_MS = 90_000;
const FETCH_TIMEOUT_MS = 45_000;

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

/**
 * How many postings the refused call would have handed over. It is a floor rather
 * than the full count of what matched, and it is the only number a refusal carries,
 * so it is what the record of missed postings is built from.
 */
export function matchedFromRefusal(message: string): number {
  const match = /would take (\d+)|could take up to (\d+)/i.exec(message);
  if (!match) return 0;
  const found = Number(match[1] ?? match[2]);
  return Number.isFinite(found) ? found : 0;
}

/**
 * What the CLI is allowed to see. `pinloop@latest` is resolved from the registry at
 * run time on the machine holding the database, so it is handed the variables it
 * needs and none of this app's secrets.
 */
export function childEnv(
  configDir: string,
  source: Record<string, string | undefined> = process.env,
): Record<string, string | undefined> {
  const passed: Record<string, string | undefined> = {
    PINLOOP_CONFIG_DIR: configDir,
    NO_COLOR: "1",
  };
  for (const name of [
    "PATH",
    "HOME",
    "NODE_ENV",
    "npm_config_cache",
    "TMPDIR",
    "NODE_EXTRA_CA_CERTS",
  ]) {
    const value = source[name];
    if (value !== undefined) passed[name] = value;
  }
  return passed;
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

async function cli(args: string[], configDir: string, timeoutMs: number): Promise<string> {
  try {
    const { stdout } = await run("npx", ["--yes", "pinloop@latest", ...args], {
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
      env: childEnv(configDir) as NodeJS.ProcessEnv,
    });
    return stdout;
  } catch (err) {
    // A non-zero exit still carries whatever the CLI printed. A refusal or a server
    // error arrives as JSON on stdout, and throwing that away would lose both the
    // reason and the smaller limit a refusal names.
    const printed = (err as { stdout?: unknown }).stdout;
    if (typeof printed === "string" && printed.trim().startsWith("{")) return printed;
    throw err;
  }
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
    PULL_TIMEOUT_MS,
  );
  return parsePull(stdout);
}

export async function fetchRecords(
  ids: string[],
  opts: { configDir: string },
): Promise<FetchRecord[]> {
  if (ids.length === 0) return [];
  const stdout = await cli(["fetch", ids.join(","), "--json"], opts.configDir, FETCH_TIMEOUT_MS);
  return parseFetch(stdout);
}
