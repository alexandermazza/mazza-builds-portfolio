const DAY_MS = 86_400_000;

// UTC throughout so a daylight-saving change never shifts a day; dates are calendar days, not instants
export function toYearSeries(points: { date: string; value: number }[], year: number, today: Date): number[] {
  const start = Date.UTC(year, 0, 1);
  const end = Math.min(Date.UTC(year, 11, 31), Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const series: number[] = new Array(Math.max(0, (end - start) / DAY_MS + 1)).fill(0);
  for (const { date, value } of points) {
    const m = /^(\d{4})-?(\d{2})-?(\d{2})$/.exec(date);
    if (!m) continue;
    const i = (Date.UTC(+m[1], +m[2] - 1, +m[3]) - start) / DAY_MS;
    if (i >= 0 && i < series.length) series[i] += value;
  }
  return series;
}

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export function formatCompact(n: number): string {
  return n < 10_000 ? n.toLocaleString("en-US") : compact.format(n);
}
