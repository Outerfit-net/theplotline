#!/bin/bash
# run-dispatch.sh — Plot Lines daily dispatch
#
# PRODUCTION: Runs the full pipeline with local models.
# Invoked by system cron at 12:30 UTC (5:30 AM MDT) daily.
#   30 12 * * * /opt/plotlines/run-dispatch.sh >> /opt/plotlines/logs/dispatch.log 2>&1
#
# FRESH (pass --fresh):
#   Busts ALL caches then runs full pipeline.
#   /opt/plotlines/run-dispatch.sh --fresh

set -euo pipefail

cd /home/administrator/openclaw/skills/garden-conversation

# Load environment
source /opt/plotlines/.env 2>/dev/null || true

# Notify start
openclaw system event --text "🌱 Plot Lines dispatch starting ($(date '+%Y-%m-%d %H:%M %Z'))" --mode now 2>/dev/null || true

# Run dispatch
EXIT_CODE=0
python3 garden-dispatch.py --dialogue-agent-mode local "$@" || EXIT_CODE=$?

# Notify completion
if [ $EXIT_CODE -eq 0 ]; then
    openclaw system event --text "✅ Plot Lines dispatch completed ($(date '+%H:%M %Z'))" --mode now 2>/dev/null || true
else
    openclaw system event --text "❌ Plot Lines dispatch FAILED (exit $EXIT_CODE) at $(date '+%H:%M %Z')" --mode now 2>/dev/null || true
fi

exit $EXIT_CODE
