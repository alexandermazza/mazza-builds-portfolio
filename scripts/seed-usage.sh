#!/bin/bash
# Seeds fake usage data for local development.
# Usage: bash scripts/seed-usage.sh

set -e

ENDPOINT="${USAGE_SYNC_ENDPOINT:-http://localhost:3000/api/usage}"
SECRET="${USAGE_SYNC_SECRET:-test-secret-123}"

echo "Generating fake usage data for last 90 days..."

# Generate JSON array of daily usage
DATA="["
for i in $(seq 90 -1 0); do
  DATE=$(date -v-${i}d "+%Y%m%d" 2>/dev/null || date -d "$i days ago" "+%Y%m%d")
  # Random tokens between 0 and 800000 (with ~30% chance of 0)
  RAND=$((RANDOM % 100))
  if [ "$RAND" -lt 30 ]; then
    TOKENS=0
  else
    TOKENS=$(( (RANDOM * RANDOM) % 800000 ))
  fi
  INPUT=$((TOKENS * 60 / 100))
  OUTPUT=$((TOKENS * 30 / 100))
  CACHE_CREATE=$((TOKENS * 5 / 100))
  CACHE_READ=$((TOKENS * 5 / 100))
  COST=$(echo "scale=2; $TOKENS * 0.000003" | bc)

  if [ "$i" -gt 0 ]; then
    SEP=","
  else
    SEP=""
  fi

  DATA+="{\"date\":\"$DATE\",\"input_tokens\":$INPUT,\"output_tokens\":$OUTPUT,\"cache_creation_tokens\":$CACHE_CREATE,\"cache_read_tokens\":$CACHE_READ,\"total_tokens\":$TOKENS,\"cost_usd\":$COST}$SEP"
done
DATA+="]"

echo "Posting to $ENDPOINT..."
RESPONSE=$(echo "$DATA" | curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
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
