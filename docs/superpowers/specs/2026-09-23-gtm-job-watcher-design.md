# GTM Job Watcher

## Overview

A daily job watcher that lives inside the portfolio app. Once a day it asks Pinloop for GTM Engineer and applied-AI-GTM postings published since the last run, drops repeats and out-of-area roles, stores what is left in the SQLite database already on the Fly volume, and emails the keepers to Alex through Resend.

Pinloop is a job board CLI (`npm i -g pinloop`) that aggregates postings from company career sites (Greenhouse, Lever, Ashby, Workday, BambooHR, Comeet) and job boards. It has no notification channel of its own, so this watcher supplies that part.

Calibration numbers from the 2026-09-16 and 2026-09-17 test runs are in `~/.claude/projects/.../memory/project_job_watch.md`.

## Design Decisions

- **Free Pinloop plan, narrow scope.** The free plan hands over 5 new postings a day. The agreed scope is GTM Engineer titles plus applied-AI-GTM titles, US only, career sites only, which runs about 6 to 8 a day. On busy days the watcher takes the newest 5 and records how many it could not take, which is the evidence for whether Pro at $20 a month is worth buying later.
- **`pull`, not `search`.** `search` only reads postings some pull already collected and charges nothing for postings the account already holds, but a 2026-09-18 test found 0 of that day's 9 GTM Engineer postings in it. Fresh roles only arrive through `pull`, which charges for every row it returns.
- **`--posted-after` is the dedupe budget saver.** Every pull prints `next_posted_after`. Passing it back means the next pull returns only newer postings. A 2026-09-18 run returned 4 rows with 0 already held.
- **Career sites only.** Job boards roughly double the volume and mostly repeat what career sites already carry (Zenity appeared from both and cost two credits). Career site rows also link to the employer's own application page.
- **`npx pinloop@latest`, not a pinned install.** Pinloop's server answers HTTP 426 to CLI versions it considers old, which broke a run on 2026-09-17 until the CLI was updated. Resolving the latest version per run removes that failure mode. The cost is a few seconds of npm resolution per run, once a day.
- **Runs on Fly, woken from outside.** `fly.toml` sets `auto_stop_machines = 'stop'` and `min_machines_running = 0`, so the machine sleeps and an in-process timer would not fire. A GitHub Actions cron calling a protected endpoint both wakes the machine and triggers the scan, and reuses the secret-in-a-bearer-header pattern `/api/usage` already uses.
- **No AI scoring in v1.** About 4 roles a day is readable as is. Skipping it avoids putting an Anthropic API key on the server and avoids spending Pinloop judging credits. Ranking is remote first, then by pay.
- **Resume stays off Pinloop.** Pinloop's own judging requires uploading the resume to their servers. v1 does not judge, so nothing is uploaded.

## Scope

In scope:
- One scheduled scan a day, plus a manual trigger.
- Pull, dedupe, location filter, store, email.
- A record of what was missed when volume exceeded the daily credits.

Out of scope for v1 (noted so the schema does not need changing later):
- A `/jobs` triage page. The `status` column exists from the start so the page can be added without a migration.
- AI scoring of each posting.
- The weekly catch-up pull for late-indexed postings. Pinloop's guide recommends it, but on the free plan it would spend credits re-collecting postings already held.
- Job boards as a second source.

## Title Query

One `--in title` value. Pinloop matches title words with `OR` and `AND`, where every `AND` group needs its own brackets. Nested groups joined by `OR` work (verified 2026-09-16).

```
((GTM OR go-to-market) AND (engineer OR engineering)) OR ((AI OR automation OR agentic) AND (GTM OR go-to-market OR revenue OR marketing) AND (engineer OR engineering OR architect OR developer))
```

The second group requires an engineering word next to "revenue" so that healthcare Revenue Cycle roles, about 345 a month, stay out.

Fixed conditions: `--country "United States"`, `--from "career sites"`. Deliberately not used:
- `--category`, because Pinloop labels the same kind of role Technology, Software, Marketing, or Data.
- `--experience`, because real GTM Engineer roles are labelled anywhere from 2-5 to 5-10.
- `--workplace`, because on-site roles in New York, SF, and Chicago all count for Alex, and the workplace label disagrees between sources for the same job.
- City filters, which Pinloop does not have. Location is filtered on our side after pulling.

## Architecture

```
GitHub Actions cron (00:05 UTC daily)
  |  POST, Authorization: Bearer JOB_SCAN_SECRET
  v
/api/jobs/scan  (Next.js route, nodejs runtime, on Fly)
  |
  |-- src/lib/pinloop.ts   run the CLI, parse JSON, classify refusals
  |-- src/lib/jobs-db.ts   dedupe and store (SQLite on /data)
  |-- src/lib/job-filter.ts  location rules, aggregator block list, ranking
  |-- src/lib/job-email.ts   build and send the digest through Resend
  v
Email to alexmazza96@gmail.com
```

`src/lib/db.ts` gains an exported `getDb()` so `jobs-db.ts` shares one connection to the same database file rather than opening a second one. No other change to existing code.

### Scan sequence

1. Check the bearer secret. Wrong or missing secret returns 401.
2. Read `last_posted_after` from the `job_state` table. If absent, default to yesterday in UTC.
3. Run the pull:
   `npx --yes pinloop@latest pull --in title "<query>" --country "United States" --from "career sites" --posted-after <date> --limit 5 --json`
   with `PINLOOP_CONFIG_DIR=/data/.pinloop`.
4. If the result carries `refused` and the message names a smaller limit, run once more with that limit. A refusal because the day's credits are gone is recorded, not an error.
5. For rows that are new to us, fetch full records (free): `npx --yes pinloop@latest fetch <ids> --json`, which adds compensation, experience level, and the description.
6. Filter and store.
7. Email the keepers. Send nothing when there are none.
8. Save `next_posted_after` from the pull into `job_state`, and write a `job_scans` row.
9. Return a JSON summary: pulled, kept, out of area, duplicates, missed, whether an email was sent.

### Dedupe

Three layers, because the same job reaches Pinloop more than once:
1. Pinloop posting id, the primary key.
2. Normalized company plus title. Lowercased, punctuation stripped, collapsed whitespace. This catches the same role from a career site and a job board.
3. An aggregator block list, starting with Jobgether, which reposts other companies' jobs verbatim, including the pay range.

### Location filter

A row is a keeper when either:
- `workplace_type` is `Remote Solely` or `Remote OK`, or
- any location string matches Chicago, New York, NYC, San Francisco, SF, or Bay Area.

Everything else is stored with `out_of_area = 1` and left out of the email, so the database still shows what the search is turning up.

### Email

Subject: `N new GTM roles - Sep 23`. Plain text plus a simple HTML table, sent from the address the contact form already uses. Per role: title, company, location, workplace type, pay range when present, hours since posting, and the apply link. Remote first, then by pay, highest first. A closing line states how many the credits could not reach, when that number is above zero.

## Data

Two new tables in the existing database, created with `CREATE TABLE IF NOT EXISTS` the same way `daily_usage` is.

```sql
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,              -- Pinloop posting uuid
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  company_key TEXT NOT NULL,        -- normalized company + title, for dedupe
  locations TEXT NOT NULL,          -- joined with "; "
  workplace_type TEXT,
  employment_type TEXT,
  posted_at TEXT NOT NULL,
  url TEXT NOT NULL,
  comp_min INTEGER,
  comp_max INTEGER,
  comp_currency TEXT,
  experience_level TEXT,
  source TEXT NOT NULL,             -- "career sites"
  out_of_area INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',   -- new | applied | skipped, for the later triage page
  first_seen_at TEXT NOT NULL,
  emailed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_jobs_company_key ON jobs(company_key);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON jobs(posted_at);

CREATE TABLE IF NOT EXISTS job_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_at TEXT NOT NULL,
  posted_after TEXT NOT NULL,
  pulled INTEGER NOT NULL DEFAULT 0,
  kept INTEGER NOT NULL DEFAULT 0,
  out_of_area INTEGER NOT NULL DEFAULT 0,
  duplicates INTEGER NOT NULL DEFAULT 0,
  missed INTEGER NOT NULL DEFAULT 0,     -- matched today but beyond the credits
  credits_left INTEGER,
  emailed INTEGER NOT NULL DEFAULT 0,
  error TEXT
);

CREATE TABLE IF NOT EXISTS job_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

## Credentials

Pinloop stores `{access_token, refresh_token}` in `credentials.json`, mode 0600, and rewrites the file about every hour as the access token refreshes. The CLI refuses the file when group or other permission bits are set. `PINLOOP_CONFIG_DIR` says where the file lives.

So the file goes on the Fly volume at `/data/.pinloop/credentials.json`, which survives deploys. Alex copies it there once from his Mac. Because a rotated refresh token may invalidate the other copy, Pinloop then runs on Fly only, and the Mac copy is left alone. If the login ever breaks, `pinloop login` prints a URL, and `pinloop login --code XXXX-XXXX` finishes it; the resulting file is copied up again.

New secrets:
- `JOB_SCAN_SECRET`: a random hex string, set as a Fly secret and as a GitHub Actions secret. Generated with `openssl rand -hex 32`, matching how `USAGE_SYNC_SECRET` is handled.

Existing and reused: `RESEND_API_KEY`.

## Failure Handling

| Failure | Behavior |
|---|---|
| Wrong or missing bearer secret | 401, nothing runs |
| Pinloop out of credits | Recorded in `job_scans.missed`, no email, 200 with a summary saying so |
| Pinloop refuses for a too-large page | Retry once with the limit the refusal names |
| Pinloop server error, in the `error` field of the JSON | Logged to `job_scans.error`, 200 with a summary. The next day's run covers the same window because `last_posted_after` is only advanced on success |
| CLI missing or npx fails | Same as above, recorded and reported |
| Resend fails | Postings stay stored with `emailed_at` null, and the next run includes them |
| Machine asleep | The request itself wakes it. GitHub Actions allows up to a few minutes, which is well past Fly's cold start |
| GitHub Actions cron delayed | Harmless. The window is driven by `posted_after`, not by the clock |

## Testing

- Unit tests over fixtures captured from the real runs (`pull-day1.json`, `pull-day3.json`, and the refusal JSON): dedupe by id, by company plus title, the aggregator block list, the location filter, ranking, and the parsing of a refusal into the smaller limit.
- A dry-run mode, `POST /api/jobs/scan?dry=1`, which uses a stored fixture instead of calling Pinloop and sends no email, so the whole path can be exercised without spending credits.
- One real manual run through the GitHub Actions "run now" button, checked against the row count in `job_scans`.
- No Playwright. Alex checks the email himself.
