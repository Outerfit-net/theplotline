#!/bin/bash
set -euo pipefail
# Backup PostgreSQL databases to R2

DATE=$(date +%Y%m%d_%H%M%S)

# Backup plotlines
PGPASSWORD="${PGPASSWORD:?PGPASSWORD must be set}" pg_dump -U plotlines -h localhost plotlines | gzip > /tmp/plotlines_${DATE}.sql.gz
rclone copy /tmp/plotlines_${DATE}.sql.gz outerfit-backups:outerfit-llc/plotlines/

# Backup thread
PGPASSWORD="${PGPASSWORD}" pg_dump -U plotlines -h localhost thread | gzip > /tmp/thread_${DATE}.sql.gz
rclone copy /tmp/thread_${DATE}.sql.gz outerfit-backups:outerfit-llc/thread/

# Keep only last 7 days locally
find /tmp -name 'plotlines_*.sql.gz' -mtime +7 -delete 2>/dev/null
find /tmp -name 'thread_*.sql.gz' -mtime +7 -delete 2>/dev/null

echo "Backup complete: ${DATE}"
