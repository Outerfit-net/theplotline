#!/bin/bash
set -euo pipefail
# Backup PostgreSQL databases to R2 with GPG encryption
# GPG key: backup@theplotline.net (private key in Bitwarden: "PlotLines Backup GPG Key")
# Restore: gpg --decrypt plotlines_DATE.sql.gz.gpg | gunzip | psql ...

DATE=$(date +%Y%m%d_%H%M%S)
GPG_RECIPIENT="backup@theplotline.net"

backup_db() {
  local DB=$1
  local DEST=$2
  local TMP_GZ="/tmp/${DB}_${DATE}.sql.gz"
  local TMP_ENC="${TMP_GZ}.gpg"

  PGPASSWORD="${PGPASSWORD:?PGPASSWORD must be set}" pg_dump -U plotlines -h localhost "$DB" | gzip > "$TMP_GZ"
  gpg --batch --yes --trust-model always -r "$GPG_RECIPIENT" --encrypt "$TMP_GZ"
  rclone copy "$TMP_ENC" "outerfit-backups:outerfit-llc/${DEST}/"
  rm -f "$TMP_GZ" "$TMP_ENC"
  echo "[backup] $DB → R2/$DEST OK"
}

backup_db plotlines plotlines
backup_db thread thread

echo "Backup complete: ${DATE}"
