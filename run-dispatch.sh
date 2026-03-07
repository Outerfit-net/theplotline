#!/bin/bash
# run-dispatch.sh — daily dispatch wrapper for cron
# Called by: 30 12 * * * /opt/plotlines/run-dispatch.sh >> /opt/plotlines/logs/dispatch.log 2>&1

set -euo pipefail

cd /home/administrator/openclaw/skills/garden-conversation

# Load environment
source /opt/plotlines/.env 2>/dev/null || true

exec python3 garden-dispatch.py
