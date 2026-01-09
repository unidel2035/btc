#!/bin/bash

# Database backup script for PostgreSQL
# This script creates backups of the PostgreSQL database

set -e

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-btc_trading_bot}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/btc_trading_bot_$TIMESTAMP.sql"
COMPRESSED_FILE="$BACKUP_FILE.gz"

echo "Starting database backup..."
echo "Database: $POSTGRES_DB"
echo "Host: $POSTGRES_HOST:$POSTGRES_PORT"
echo "Backup file: $COMPRESSED_FILE"

# Create backup
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -F p \
  -f "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

# Calculate backup size
BACKUP_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
echo "Backup completed successfully!"
echo "Backup size: $BACKUP_SIZE"

# Clean up old backups (older than RETENTION_DAYS)
echo "Cleaning up old backups (retention: $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "btc_trading_bot_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
echo "Cleanup completed"

# List recent backups
echo ""
echo "Recent backups:"
ls -lh "$BACKUP_DIR" | tail -n 5

exit 0
