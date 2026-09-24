# GTM Job Watcher

## What it does

Once a day a GitHub Actions cron calls `/api/jobs/scan` on the Fly app, which wakes the machine.
The route asks Pinloop for GTM Engineer and applied-AI-GTM postings from company career sites
published since the last run, drops repeats and roles outside remote, Chicago, New York, and SF,
stores the rest in SQLite on the Fly volume, and emails the keepers through Resend.

It runs on Pinloop's free plan, which hands over 5 new postings a day. The search matches about
6 to 8 a day, so on busy days the scan takes the newest 5 and records the rest as `missed`.

## One-time setup

### 1. The shared secret

```bash
openssl rand -hex 32
```

Set the same value in both places:

```bash
fly secrets set JOB_SCAN_SECRET="<value>" --app mazzabuilds
```

and as a GitHub Actions repository secret named `JOB_SCAN_SECRET`
(Settings, Secrets and variables, Actions, New repository secret).

### 2. The Pinloop login

Pinloop keeps `{access_token, refresh_token}` in a file it rewrites about once an hour as the
token refreshes, so the file has to live on the Fly volume rather than in the image. Log in on
your Mac first if you have not already:

```bash
npm install -g pinloop
pinloop login          # prints a URL; open it, sign in
pinloop login --code XXXX-XXXX
```

Then copy the file up:

```bash
fly ssh console --app mazzabuilds -C "mkdir -p /data/.pinloop"
fly ssh sftp shell --app mazzabuilds
# at the sftp prompt:
put /Users/alexmazza/.pinloop/credentials.json /data/.pinloop/credentials.json
# then quit, and fix the permissions (pinloop refuses a file others can read):
fly ssh console --app mazzabuilds -C "chmod 600 /data/.pinloop/credentials.json"
```

After this, run Pinloop on Fly only. A refreshed token can invalidate the copy on your Mac, and
two machines taking turns refreshing the same login can sign each other out.

## Running it by hand

Either press Run workflow on the "Job Scan" workflow in the Actions tab, or:

```bash
curl -X POST -H "Authorization: Bearer $JOB_SCAN_SECRET" https://mazzabuilds.com/api/jobs/scan
```

## Reading the response

```json
{
  "ok": true,
  "pulled": 4,
  "kept": 2,
  "outOfArea": 1,
  "duplicates": 1,
  "missed": 3,
  "creditsLeft": 1,
  "emailed": true,
  "postedAfter": "2026-09-23",
  "error": null
}
```

- `pulled` is how many postings Pinloop handed over, and every one of them spends a credit.
- `kept` is how many were new, in area, and went into the email.
- `outOfArea` roles are stored but not emailed, so the database still shows what the search finds.
- `duplicates` covers repeats by id, by company plus title, and aggregator reposts.
- `missed` is how many matched that the day's credits could not reach. A `missed` count that stays
  above zero is the signal that the free plan is too small and Pinloop Pro at $20 a month would pay.
- `creditsLeft` is what remains today. The count resets at midnight UTC, which is 7pm Chicago time.

A failed scan returns HTTP 502 with `ok: false` and the reason in `error`. It does not advance
`postedAfter`, so the next run covers the same window again and nothing is skipped.

## When the login expires

Pinloop's server also rejects CLI versions it considers old, which the scan avoids by running
`npx pinloop@latest` every time. If the login itself expires, redo step 2: log in on the Mac,
then copy `credentials.json` up again.

## Reading the history

```bash
fly ssh console --app mazzabuilds -C "sqlite3 /data/usage.db \
  'SELECT run_at, pulled, kept, missed, error FROM job_scans ORDER BY id DESC LIMIT 10;'"
```

Every posting it has ever seen, including the out-of-area ones:

```bash
fly ssh console --app mazzabuilds -C "sqlite3 /data/usage.db \
  'SELECT posted_at, company, title, locations, out_of_area, status FROM jobs ORDER BY posted_at DESC LIMIT 20;'"
```

The `status` column holds `new`, and is there for a future triage page that marks roles applied or
skipped.

## Tuning the search

The title query lives in `src/lib/pinloop.ts` as `TITLE_QUERY`. Pinloop matches title words with
`OR` and `AND`, and every `AND` group needs its own brackets. Before changing it, measure the new
query with counts, which cost nothing:

```bash
pinloop count --in title "<query>" --country "United States" --posted-after 2026-09-23
```

The design notes, including why category, experience, and workplace filters are deliberately unused,
are in `docs/superpowers/specs/2026-09-23-gtm-job-watcher-design.md`.
