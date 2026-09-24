import { type NextRequest } from "next/server";
import { sendDigest } from "@/lib/job-email";
import { runScan } from "@/lib/job-scan";
import { fetchRecords, pull } from "@/lib/pinloop";

export const runtime = "nodejs";

const CONFIG_DIR = process.env.PINLOOP_CONFIG_DIR ?? "/data/.pinloop";

export async function POST(request: NextRequest) {
  const secret = process.env.JOB_SCAN_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runScan(
    { pull, fetchRecords, sendDigest, configDir: CONFIG_DIR },
    new Date(),
  );

  return Response.json(summary, { status: summary.ok ? 200 : 502 });
}
