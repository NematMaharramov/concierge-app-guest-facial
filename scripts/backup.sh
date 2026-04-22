#!/bin/bash
# Backup PostgreSQL database
set -e
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="$BACKUP_DIR/concierge_backup_$TIMESTAMP.sql"

echo "→ Creating database backup: $FILENAME"
source .env
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$FILENAME"
gzip "$FILENAME"
echo "✅ Backup saved: ${FILENAME}.gz"

# Keep only last 30 backups
ls -t "$BACKUP_DIR"/*.gz 2>/dev/null | tail -n +31 | xargs rm -f 2>/dev/null || true
echo "→ Old backups cleaned up (kept last 30)"
