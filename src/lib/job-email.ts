import { Resend } from "resend";
import type { JobRow } from "./jobs-db";
import { rankJobs } from "./job-filter";

const FROM = "Mazza Builds Jobs <contact@mazzabuilds.com>";
const TO = "alexmazza96@gmail.com";

/** Titles, company names and links come from employers, so nothing goes into the HTML raw. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function thousands(value: number): string {
  return `$${Math.round(value / 1000)}k`;
}

export function formatPay(min: number | null, max: number | null): string {
  if (min != null && max != null) return `${thousands(min)}-${thousands(max)}`;
  if (max != null) return `up to ${thousands(max)}`;
  if (min != null) return `from ${thousands(min)}`;
  return "pay not listed";
}

function hoursOld(postedAt: string, now: Date): string {
  const posted = new Date(postedAt).getTime();
  if (Number.isNaN(posted)) return "";
  const hours = Math.max(0, Math.round((now.getTime() - posted) / 3_600_000));
  return hours < 48 ? `${hours}h old` : `${Math.round(hours / 24)}d old`;
}

function missedLine(missed: number): string {
  return missed > 0
    ? `${missed} more matched today but the free plan's credits ran out. Pinloop Pro is $20 a month.`
    : "";
}

export function buildDigest(
  jobs: JobRow[],
  missed: number,
  now: Date,
): { subject: string; text: string; html: string } {
  const ranked = rankJobs(jobs);
  const day = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Chicago",
  });
  const subject = `${ranked.length} new GTM role${ranked.length === 1 ? "" : "s"} - ${day}`;

  const lines = ranked.map((job) => {
    const where = job.workplace_type ? `${job.locations} (${job.workplace_type})` : job.locations;
    return [
      `${job.title} at ${job.company}`,
      `  ${where}`,
      `  ${formatPay(job.comp_min, job.comp_max)} | ${hoursOld(job.posted_at, now)}`,
      `  ${job.url}`,
    ].join("\n");
  });

  const tail = missedLine(missed);
  const text = [...lines, tail].filter(Boolean).join("\n\n");

  const rows = ranked
    .map((job) => {
      const where = job.workplace_type
        ? `${job.locations} (${job.workplace_type})`
        : job.locations;
      return `<tr>
        <td style="padding:8px 12px 8px 0"><a href="${escapeHtml(job.url)}">${escapeHtml(job.title)}</a></td>
        <td style="padding:8px 12px 8px 0">${escapeHtml(job.company)}</td>
        <td style="padding:8px 12px 8px 0">${escapeHtml(where)}</td>
        <td style="padding:8px 12px 8px 0">${formatPay(job.comp_min, job.comp_max)}</td>
        <td style="padding:8px 0">${hoursOld(job.posted_at, now)}</td>
      </tr>`;
    })
    .join("");

  const html = `<div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:14px">
    <table cellspacing="0" cellpadding="0">${rows}</table>
    ${tail ? `<p style="color:#666">${tail}</p>` : ""}
  </div>`;

  return { subject, text, html };
}

export async function sendDigest(
  jobs: JobRow[],
  missed: number,
  now: Date,
): Promise<{ sent: boolean; error: string | null }> {
  if (jobs.length === 0) return { sent: false, error: null };

  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, error: "RESEND_API_KEY is not set" };

  const digest = buildDigest(jobs, missed, now);
  const { error } = await new Resend(key).emails.send({
    from: FROM,
    to: TO,
    subject: digest.subject,
    text: digest.text,
    html: digest.html,
  });

  if (error) return { sent: false, error: error.message ?? "Resend rejected the message" };
  return { sent: true, error: null };
}
