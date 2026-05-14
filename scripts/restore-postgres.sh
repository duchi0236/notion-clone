#!/usr/bin/env bash
set -euo pipefail

FILE=${1:-}

if [ -z "$FILE" ]; then
  echo "Usage: ./scripts/restore-postgres.sh <backup.sql.gz>"
  exit 1
fi

POSTGRES_DB=${POSTGRES_DB:-clawnote}
POSTGRES_USER=${POSTGRES_USER:-claw}
POSTGRES_HOST=${POSTGRES_HOST:-localhost}
POSTGRES_PORT=${POSTGRES_PORT:-5432}

echo "[restore] restoring => $FILE"

gunzip -c "$FILE" | PGPASSWORD="$POSTGRES_PASSWORD" psql \
  --host "$POSTGRES_HOST" \
  --port "$POSTGRES_PORT" \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB"

echo "[restore] done"
