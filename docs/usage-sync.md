# Claude Token Usage Heatmap — Sync Setup

## What this does

A nightly cron job on your Mac runs `ccusage` (which reads `~/.claude/projects/` JSONL files),
formats the data as JSON, and POSTs it to your portfolio's `/api/usage` endpoint. The portfolio
stores this in a SQLite database and renders it as a GitHub-style contribution heatmap.

## Generate a sync secret

```bash
openssl rand -hex 32
```

## Set the secret in your shell

Add to `~/.zshrc`:

```bash
export USAGE_SYNC_SECRET="<your-secret-here>"
```

Then reload: `source ~/.zshrc`

## Set up the cron job

```bash
bash scripts/setup-cron.sh
```

This will:
1. Make `sync-usage.sh` executable
2. Print the crontab line to add
3. Check if `USAGE_SYNC_SECRET` is in your shell config

Then run `crontab -e` and paste the printed line.

## Manually trigger a sync

```bash
bash scripts/sync-usage.sh
```

## Check sync logs

```bash
tail -20 ~/.claude-sync.log
```

## Local development

1. Add `USAGE_SYNC_SECRET=test-secret-123` to `.env.local`
2. Run `npm run dev`
3. Seed fake data: `bash scripts/seed-usage.sh`
4. Visit `http://localhost:3000` to see the heatmap

## Fly.io deployment notes

- The database lives at `/data/usage.db`
- You need a persistent volume mounted at `/data`
- Set `USAGE_SYNC_SECRET` as a Fly.io secret: `fly secrets set USAGE_SYNC_SECRET=<value>`
- Set `DATABASE_PATH=/data/usage.db` as a Fly.io secret
