#!/bin/bash
# run-dispatch.sh — Plot Lines daily dispatch
#
# TWO PRODUCTION MODES:
#
#   CRON (this script, no args):
#     Runs the full pipeline. Auto-skips any stage already cached for today.
#     Invoked by cron at 12:30 UTC daily.
#       30 12 * * * /opt/plotlines/run-dispatch.sh >> /opt/plotlines/logs/dispatch.log 2>&1
#
#   FRESH (pass --fresh):
#     Busts ALL caches (run dir, prose, mastheads, art) then runs full pipeline.
#     Use when you want a clean slate — new prompts, new art, new everything.
#       /opt/plotlines/run-dispatch.sh --fresh
#
# For testing/dev use dispatch-step.py, not this script.

set -euo pipefail

cd /home/administrator/openclaw/skills/garden-conversation

# Load environment
source /opt/plotlines/.env 2>/dev/null || true

exec python3 garden-dispatch.py "$@"
