#!/bin/bash
# Fetches daily token usage via ccusage and POSTs to the portfolio API.
# Add to crontab: 0 2 * * * /bin/bash /path/to/scripts/sync-usage.sh >> ~/.claude-sync.log 2>&1

set -e

ENDPOINT="${USAGE_SYNC_ENDPOINT:-https://mazza-builds.fly.dev/api/usage}"
SECRET="${USAGE_SYNC_SECRET}"

if [ -z "$SECRET" ]; then
  echo "[$(date)] ERROR: USAGE_SYNC_SECRET not set" && exit 1
fi

echo "[$(date)] Fetching ccusage data..."
DATA=$(npx ccusage@latest daily --json 2>/dev/null)

if [ -z "$DATA" ]; then
  echo "[$(date)] ERROR: ccusage returned empty data" && exit 1
fi

echo "[$(date)] Pushing to $ENDPOINT..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SECRET" \
  -d "$DATA")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "[$(date)] SUCCESS: $BODY"
else
  echo "[$(date)] ERROR: HTTP $HTTP_CODE — $BODY" && exit 1
fi
