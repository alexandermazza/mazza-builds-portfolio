import type { JobRow } from "./jobs-db";
import { SOURCE, type FetchRecord, type PinloopRow } from "./pinloop";

/** Companies that repost other employers' jobs verbatim. */
export const AGGREGATORS = ["jobgether"];

const TARGET_CITY = /(chicago|new york|nyc|san francisco|bay area|\bsf\b)/i;
const REMOTE = new Set(["remote solely", "remote ok"]);
/** A location that names a country and no city, so the office could be anywhere. */
const NO_CITY = /^(united states|usa|us|remote|anywhere)$/i;

export function companyKey(company: string, title: string): string {
  const flatten = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  return `${flatten(company)}|${flatten(title)}`;
}

export function isRemote(workplaceType: string | null): boolean {
  return workplaceType != null && REMOTE.has(workplaceType.toLowerCase());
}

export function isTargetLocation(locations: string[], workplaceType: string | null): boolean {
  if (isRemote(workplaceType)) return true;
  if (locations.length === 0) return false;
  if (locations.some((location) => TARGET_CITY.test(location))) return true;
  // A posting that names a country and no city cannot be ruled out, and the day's
  // list is short enough that a maybe is cheaper than a missed role.
  return locations.every((location) => NO_CITY.test(location.trim()));
}

export function classifyRows(
  rows: PinloopRow[],
  known: { ids: Set<string>; companyKeys: Set<string> },
): { fresh: PinloopRow[]; duplicates: PinloopRow[] } {
  const fresh: PinloopRow[] = [];
  const duplicates: PinloopRow[] = [];
  const seenIds = new Set(known.ids);
  const seenKeys = new Set(known.companyKeys);

  // One role is often listed once per city, so the copies share a company key and
  // only the first survives. Weigh the in-area copies first, or a role Alex could
  // take gets thrown away as a repeat of one in a city he cannot.
  const ordered = rows
    .map((row, index) => ({ row, index }))
    .sort(
      (a, b) =>
        Number(isTargetLocation(b.row.locations, b.row.workplace_type)) -
          Number(isTargetLocation(a.row.locations, a.row.workplace_type)) || a.index - b.index,
    )
    .map((entry) => entry.row);

  for (const row of ordered) {
    const key = companyKey(row.company, row.title);
    const isAggregator = AGGREGATORS.includes(row.company.toLowerCase().trim());
    if (isAggregator || seenIds.has(row.id) || seenKeys.has(key)) {
      duplicates.push(row);
      continue;
    }
    seenIds.add(row.id);
    seenKeys.add(key);
    fresh.push(row);
  }

  return { fresh, duplicates };
}

export function toJobRows(rows: PinloopRow[], records: FetchRecord[], seenAt: string): JobRow[] {
  const byId = new Map(records.map((record) => [record.id, record]));

  return rows.map((row) => {
    const record = byId.get(row.id);
    const workplace = row.workplace_type ?? record?.workplace_type ?? null;
    return {
      id: row.id,
      title: row.title,
      company: row.company,
      company_key: companyKey(row.company, row.title),
      locations: row.locations.join("; "),
      workplace_type: workplace,
      employment_type: Array.isArray(row.employment_type)
        ? row.employment_type.join(", ")
        : row.employment_type,
      posted_at: row.posted_at,
      url: row.url,
      comp_min: record?.compensation?.min ?? null,
      comp_max: record?.compensation?.max ?? null,
      comp_currency: record?.compensation?.currency ?? null,
      experience_level: record?.experience_level ?? null,
      source: SOURCE,
      out_of_area: isTargetLocation(row.locations, workplace) ? 0 : 1,
      status: "new",
      first_seen_at: seenAt,
      emailed_at: null,
    };
  });
}

export function rankJobs(jobs: JobRow[]): JobRow[] {
  return [...jobs].sort((a, b) => {
    const remoteGap = Number(isRemote(b.workplace_type)) - Number(isRemote(a.workplace_type));
    if (remoteGap !== 0) return remoteGap;
    const payGap = (b.comp_max ?? 0) - (a.comp_max ?? 0);
    if (payGap !== 0) return payGap;
    return b.posted_at.localeCompare(a.posted_at);
  });
}
