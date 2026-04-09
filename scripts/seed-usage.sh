#!/bin/bash
# Seeds local usage DB with real data from ccusage.
# Usage: bash scripts/seed-usage.sh
#
# Pulls daily token data directly from ccusage (reads ~/.claude/projects/)
# and POSTs it to the local dev API. Requires the dev server to be running.

set -e

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

ENDPOINT="${USAGE_SYNC_ENDPOINT:-http://localhost:3000/api/usage}"
SECRET="${USAGE_SYNC_SECRET:-test-secret-123}"

echo "[$(date)] Fetching real usage data from ccusage..."
RAW=$(npx ccusage@latest daily --json 2>/dev/null) || true

if [ -z "$RAW" ]; then
  echo "ERROR: ccusage returned empty data. Make sure ccusage is installed and ~/.claude/projects/ exists."
  exit 1
fi

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
total = sum(r['total_tokens'] for r in result)
print(json.dumps(result))
import sys as _s
print(f'{len(result)} days, {total:,} total tokens', file=_s.stderr)
")

if [ "$PAYLOAD" = "[]" ]; then
  echo "No usage data found in ccusage."
  exit 0
fi

echo "[$(date)] Posting to $ENDPOINT..."
RESPONSE=$(echo "$PAYLOAD" | curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SECRET" \
  -d @-)

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "SUCCESS: $BODY"
else
  echo "ERROR: HTTP $HTTP_CODE — $BODY" && exit 1
fi
