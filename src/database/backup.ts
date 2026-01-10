/**
 * Database backup utility
 */

import { execSync } from 'child_process';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

interface BackupConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  outputDir?: string;
}

/**
 * Get backup configuration from environment
 */
function getBackupConfig(): BackupConfig {
  return {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'btc_trading_bot',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '',
    outputDir: process.env.BACKUP_DIR || './backups',
  };
}

/**
 * Create a database backup using pg_dump
 */
function createBackup(): string {
  const config = getBackupConfig();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `backup_${config.database}_${timestamp}.sql`;

  // Ensure backup directory exists
  if (!existsSync(config.outputDir!)) {
    mkdirSync(config.outputDir!, { recursive: true });
  }

  const backupPath = join(config.outputDir!, backupFileName);

  console.log(`Creating backup: ${backupFileName}`);
  console.log(`Output: ${backupPath}\n`);

  try {
    // Set PGPASSWORD environment variable for pg_dump
    const env = {
      ...process.env,
      PGPASSWORD: config.password,
    };

    // Execute pg_dump
    const command = `pg_dump -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database} -F p -f ${backupPath}`;

    execSync(command, { env, stdio: 'inherit' });

    console.log(`\n✓ Backup created successfully: ${backupPath}`);

    // Create metadata file
    const metadataPath = join(config.outputDir!, `${backupFileName}.meta.json`);
    const metadata = {
      database: config.database,
      host: config.host,
      port: config.port,
      timestamp: new Date().toISOString(),
      filename: backupFileName,
    };

    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    return backupPath;
  } catch (error) {
    console.error('✗ Backup failed:', error);
    throw error;
  }
}

/**
 * Restore a database from backup
 */
function restoreBackup(backupPath: string): void {
  const config = getBackupConfig();

  if (!existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }

  console.log(`Restoring backup from: ${backupPath}`);
  console.log(`Target database: ${config.database} on ${config.host}:${config.port}\n`);

  try {
    // Set PGPASSWORD environment variable for psql
    const env = {
      ...process.env,
      PGPASSWORD: config.password,
    };

    // Execute psql to restore
    const command = `psql -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database} -f ${backupPath}`;

    execSync(command, { env, stdio: 'inherit' });

    console.log('\n✓ Backup restored successfully');
  } catch (error) {
    console.error('✗ Restore failed:', error);
    throw error;
  }
}

/**
 * Create a backup of Redis data
 */
function createRedisBackup(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `redis_backup_${timestamp}.rdb`;
  const backupDir = process.env.BACKUP_DIR || './backups';

  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }

  const backupPath = join(backupDir, backupFileName);

  console.log(`Creating Redis backup: ${backupFileName}`);

  try {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = process.env.REDIS_PORT || '6379';

    // Trigger Redis BGSAVE command
    const command = `redis-cli -h ${redisHost} -p ${redisPort} BGSAVE`;
    execSync(command, { stdio: 'inherit' });

    console.log('\n✓ Redis backup initiated');
    console.log('Note: Redis will save the RDB file to its configured directory');
    console.log('You may need to manually copy the dump.rdb file from Redis data directory');

    return backupPath;
  } catch (error) {
    console.error('✗ Redis backup failed:', error);
    throw error;
  }
}

/**
 * Main backup function
 */
function backup(): void {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'create':
        createBackup();
        break;

      case 'restore':
        if (!args[1]) {
          console.error('Error: Please provide backup file path');
          console.log('Usage: npm run db:backup restore <backup-file-path>');
          process.exit(1);
        }
        restoreBackup(args[1]);
        break;

      case 'redis':
        createRedisBackup();
        break;

      default:
        console.log('Database Backup Utility\n');
        console.log('Usage:');
        console.log('  npm run db:backup create          - Create PostgreSQL backup');
        console.log('  npm run db:backup restore <file>  - Restore from backup file');
        console.log('  npm run db:backup redis           - Create Redis backup');
        console.log('\nEnvironment variables:');
        console.log('  POSTGRES_HOST     - Database host (default: localhost)');
        console.log('  POSTGRES_PORT     - Database port (default: 5432)');
        console.log('  POSTGRES_DB       - Database name');
        console.log('  POSTGRES_USER     - Database user');
        console.log('  POSTGRES_PASSWORD - Database password');
        console.log('  BACKUP_DIR        - Backup directory (default: ./backups)');
        process.exit(0);
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run backup if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  backup();
}

export { createBackup, restoreBackup, createRedisBackup };
