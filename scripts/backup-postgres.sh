#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=${BACKUP_DIR:-./backups}
POSTGRES_DB=${POSTGRES_DB:-clawnote}
POSTGRES_USER=${POSTGRES_USER:-claw}
POSTGRES_HOST=${POSTGRES_HOST:-localhost}
POSTGRES_PORT=${POSTGRES_PORT:-5432}

mkdir -p "$BACKUP_DIR"

FILE="$BACKUP_DIR/clawnote_${TIMESTAMP}.sql.gz"

echo "[backup] dumping postgres database..."
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  --host "$POSTGRES_HOST" \
  --port "$POSTGRES_PORT" \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --clean \
  --if-exists \
  | gzip > "$FILE"

echo "[backup] saved => $FILE"

find "$BACKUP_DIR" -type f -mtime +14 -name '*.sql.gz' -delete

echo "[backup] old backups cleaned"
