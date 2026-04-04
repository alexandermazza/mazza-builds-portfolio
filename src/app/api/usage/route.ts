import { type NextRequest } from "next/server";
import { upsertUsage, getUsageLast365, type DailyUsage } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const data = getUsageLast365();

  const totalTokens = data.reduce((sum, d) => sum + d.total_tokens, 0);
  const totalCostUsd = data.reduce((sum, d) => sum + d.cost_usd, 0);

  return Response.json({
    data,
    meta: {
      totalTokens,
      totalCostUsd: Math.round(totalCostUsd * 100) / 100,
      firstDate: data[0]?.date ?? null,
      lastDate: data[data.length - 1]?.date ?? null,
    },
  });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.USAGE_SYNC_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body)) {
    return Response.json(
      { error: "Body must be an array of daily usage objects" },
      { status: 400 }
    );
  }

  for (let i = 0; i < body.length; i++) {
    const item = body[i];
    if (
      typeof item.date !== "string" ||
      typeof item.total_tokens !== "number"
    ) {
      return Response.json(
        { error: `Item at index ${i} must have at least date (string) and total_tokens (number)` },
        { status: 400 }
      );
    }
  }

  const now = new Date().toISOString();
  const records: DailyUsage[] = body.map((item: Record<string, unknown>) => ({
    date: item.date as string,
    input_tokens: (item.input_tokens as number) ?? 0,
    output_tokens: (item.output_tokens as number) ?? 0,
    cache_creation_tokens: (item.cache_creation_tokens as number) ?? 0,
    cache_read_tokens: (item.cache_read_tokens as number) ?? 0,
    total_tokens: item.total_tokens as number,
    cost_usd: (item.cost_usd as number) ?? 0,
    updated_at: now,
  }));

  try {
    const upserted = upsertUsage(records);
    return Response.json({ ok: true, upserted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const isValidation = message.includes("Invalid date format");
    return Response.json({ error: message }, { status: isValidation ? 400 : 500 });
  }
}
