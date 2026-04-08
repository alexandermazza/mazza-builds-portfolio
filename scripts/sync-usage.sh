#!/bin/bash
# Fetches daily token usage via ccusage and POSTs to the portfolio API.
# Runs every 12 hours via launchd (see com.mazzabuilds.sync-usage.plist).

set -e

# Ensure PATH includes Homebrew and common Node locations (launchd has minimal PATH)
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# Source shell profile for env vars
if [ -f "$HOME/.zshrc" ]; then
  source "$HOME/.zshrc" 2>/dev/null || true
fi

ENDPOINT="${USAGE_SYNC_ENDPOINT:-https://mazzabuilds.com/api/usage}"
SECRET="${USAGE_SYNC_SECRET}"

if [ -z "$SECRET" ]; then
  echo "[$(date)] ERROR: USAGE_SYNC_SECRET not set" && exit 1
fi

echo "[$(date)] Fetching ccusage data..."
RAW=$(npx ccusage@latest daily --json 2>/dev/null) || true

if [ -z "$RAW" ]; then
  echo "[$(date)] ERROR: ccusage returned empty data" && exit 1
fi

# Transform ccusage format to API format:
# ccusage: { daily: [{ date: "YYYY-MM-DD", inputTokens, outputTokens, ... }] }
# API:     [{ date: "YYYYMMDD", total_tokens, input_tokens, output_tokens, ... }]
PAYLOAD=$(echo "$RAW" | python3 -c "
import json, sys
data = json.load(sys.stdin)
result = []
for d in data.get('daily', []):
    result.append({
        'date': d['date'].replace('-', ''),
        'total_tokens': d.get('totalTokens', 0),
        'input_tokens': d.get('inputTokens', 0),
        'output_tokens': d.get('outputTokens', 0),
        'cache_creation_tokens': d.get('cacheCreationTokens', 0),
        'cache_read_tokens': d.get('cacheReadTokens', 0),
        'cost_usd': round(d.get('totalCost', 0), 4),
    })
print(json.dumps(result))
")

if [ "$PAYLOAD" = "[]" ]; then
  echo "[$(date)] No usage data to sync"
  exit 0
fi

echo "[$(date)] Pushing to $ENDPOINT..."
RESPONSE=$(echo "$PAYLOAD" | curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SECRET" \
  -d @-)

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "[$(date)] SUCCESS: $BODY"
else
  echo "[$(date)] ERROR: HTTP $HTTP_CODE — $BODY" && exit 1
fi
