import "server-only";
import { getUsageLast365 } from "./db";

export interface UsageResponse {
  data: Array<{ date: string; total_tokens: number }>;
  meta: {
    totalTokens: number;
    totalCostUsd: number;
    firstDate: string | null;
    lastDate: string | null;
  };
}

export function loadUsageData(): UsageResponse {
  const data = getUsageLast365();
  const totalTokens = data.reduce((sum, d) => sum + d.total_tokens, 0);
  const totalCostUsd = data.reduce((sum, d) => sum + d.cost_usd, 0);

  return {
    data,
    meta: {
      totalTokens,
      totalCostUsd: Math.round(totalCostUsd * 100) / 100,
      firstDate: data[0]?.date ?? null,
      lastDate: data[data.length - 1]?.date ?? null,
    },
  };
}
