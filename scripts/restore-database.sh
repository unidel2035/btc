#!/bin/bash

# Database restore script for PostgreSQL
# This script restores PostgreSQL database from a backup file

set -e

# Check if backup file is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  echo "Example: $0 ./backups/btc_trading_bot_20240115_120000.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Configuration
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-btc_trading_bot}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

echo "WARNING: This will restore the database from backup!"
echo "Database: $POSTGRES_DB"
echo "Host: $POSTGRES_HOST:$POSTGRES_PORT"
echo "Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
  echo "Restore cancelled"
  exit 0
fi

# Create temporary directory for decompression
TEMP_DIR=$(mktemp -d)
TEMP_FILE="$TEMP_DIR/restore.sql"

echo "Decompressing backup..."
gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"

echo "Dropping existing database..."
PGPASSWORD="$POSTGRES_PASSWORD" dropdb \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  --if-exists \
  "$POSTGRES_DB"

echo "Creating new database..."
PGPASSWORD="$POSTGRES_PASSWORD" createdb \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  "$POSTGRES_DB"

echo "Restoring data..."
PGPASSWORD="$POSTGRES_PASSWORD" psql \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -f "$TEMP_FILE"

# Clean up temporary files
rm -rf "$TEMP_DIR"

echo "Restore completed successfully!"

exit 0
