import { test } from "node:test";
import assert from "node:assert/strict";
import { toYearSeries, formatCompact } from "./activity.ts";

const noon = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d, 12));

test("toYearSeries fills Jan 1 to today with zeros for missing days", () => {
  const series = toYearSeries([{ date: "2026-01-03", value: 5 }], 2026, noon(2026, 1, 10));
  assert.deepEqual(series, [0, 0, 5, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(toYearSeries([], 2025, noon(2026, 3, 1)).length, 365, "a past year runs to Dec 31");
  assert.equal(toYearSeries([], 2026, noon(2026, 12, 31)).length, 365);
});

test("accepts both date formats", () => {
  const series = toYearSeries(
    [{ date: "20260102", value: 2 }, { date: "2026-01-02", value: 3 }, { date: "2026-01-01", value: 1 }],
    2026,
    noon(2026, 1, 2),
  );
  assert.deepEqual(series, [1, 5], "duplicate days are summed");
});

test("ignores other years", () => {
  const series = toYearSeries(
    [{ date: "2025-12-31", value: 9 }, { date: "20270101", value: 9 }, { date: "2026-01-02", value: 4 }, { date: "2026-01-05", value: 9 }],
    2026,
    noon(2026, 1, 3),
  );
  assert.deepEqual(series, [0, 4, 0], "days after today are left out too");
});

test('formatCompact(40_200_000_000) is "40.2B"', () => {
  assert.equal(formatCompact(40_200_000_000), "40.2B");
  assert.equal(formatCompact(980_000_000), "980M");
  assert.equal(formatCompact(12_500), "12.5K");
});

test('formatCompact(6282) is "6,282"', () => {
  assert.equal(formatCompact(6282), "6,282");
  assert.equal(formatCompact(0), "0");
});
