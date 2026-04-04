#!/bin/bash
# Sets up the cron job for syncing Claude usage data.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SYNC_SCRIPT="$SCRIPT_DIR/sync-usage.sh"

echo "=== Claude Usage Sync Setup ==="
echo ""

# Make sync script executable
chmod +x "$SYNC_SCRIPT"
echo "[OK] Made sync-usage.sh executable"

# Check for USAGE_SYNC_SECRET
if [ -n "$USAGE_SYNC_SECRET" ]; then
  echo "[OK] USAGE_SYNC_SECRET is set in current environment"
elif grep -q "USAGE_SYNC_SECRET" ~/.zshrc 2>/dev/null; then
  echo "[OK] USAGE_SYNC_SECRET found in ~/.zshrc"
  echo "     Note: sync-usage.sh sources ~/.zshrc for cron compatibility"
else
  echo "[!!] USAGE_SYNC_SECRET not found"
  echo "     Add this line to ~/.zshrc:"
  echo "     export USAGE_SYNC_SECRET=\"$(openssl rand -hex 32)\""
  echo ""
fi

# Print crontab line
CRON_LINE="0 2 * * * /bin/bash $SYNC_SCRIPT >> ~/.claude-sync.log 2>&1"
echo ""
echo "Add this to your crontab (run: crontab -e):"
echo ""
echo "  $CRON_LINE"
echo ""
echo "To test manually:"
echo "  bash $SYNC_SCRIPT"
echo ""
echo "To check logs:"
echo "  tail -20 ~/.claude-sync.log"
