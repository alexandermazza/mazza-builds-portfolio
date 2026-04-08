#!/bin/bash
# Sets up a launchd job to sync Claude usage data every 12 hours.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SYNC_SCRIPT="$SCRIPT_DIR/sync-usage.sh"
PLIST_NAME="com.mazzabuilds.sync-usage"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"
LOG_FILE="$HOME/.claude-sync.log"

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
else
  echo "[!!] USAGE_SYNC_SECRET not found"
  echo "     Add this line to ~/.zshrc:"
  echo "     export USAGE_SYNC_SECRET=\"your-secret-here\""
  echo ""
  echo "     Then set the same value on Fly.io:"
  echo "     fly secrets set USAGE_SYNC_SECRET=\"your-secret-here\" --app mazzabuilds"
  echo ""
fi

# Unload existing plist if present
if launchctl list "$PLIST_NAME" &>/dev/null; then
  launchctl unload "$PLIST_PATH" 2>/dev/null || true
  echo "[OK] Unloaded existing launchd job"
fi

# Write the launchd plist (runs every 12 hours)
cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$PLIST_NAME</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$SYNC_SCRIPT</string>
  </array>
  <key>StartInterval</key>
  <integer>43200</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$LOG_FILE</string>
  <key>StandardErrorPath</key>
  <string>$LOG_FILE</string>
</dict>
</plist>
EOF

echo "[OK] Wrote launchd plist to $PLIST_PATH"

# Load the plist
launchctl load "$PLIST_PATH"
echo "[OK] Loaded launchd job (runs every 12 hours + on login)"

echo ""
echo "To test manually:  bash $SYNC_SCRIPT"
echo "To check logs:     tail -20 $LOG_FILE"
echo "To stop:           launchctl unload $PLIST_PATH"
