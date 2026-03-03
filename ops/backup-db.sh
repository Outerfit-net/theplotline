#!/bin/bash
# Backup PostgreSQL databases to R2

DATE=$(date +%Y%m%d_%H%M%S)

# Backup plotlines
pg_dump -U plotlines -h localhost plotlines | gzip > /tmp/plotlines_${DATE}.sql.gz
rclone copy /tmp/plotlines_${DATE}.sql.gz outerfit-backups:outerfit-llc/plotlines/

# Backup thread
pg_dump -U plotlines -h localhost thread | gzip > /tmp/thread_${DATE}.sql.gz
rclone copy /tmp/thread_${DATE}.sql.gz outerfit-backups:outerfit-llc/thread/

# Keep only last 7 days locally
find /tmp -name "*_${DATE}.sql.gz" -mtime +7 -delete 2>/dev/null

echo "Backup complete: ${DATE}"
