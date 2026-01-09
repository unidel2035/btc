/**
 * Database migration runner
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from './postgres.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface MigrationFile {
  id: string;
  name: string;
  path: string;
}

/**
 * Get all migration files sorted by ID
 */
function getMigrationFiles(): MigrationFile[] {
  const migrationsDir = join(__dirname, 'migrations');
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));

  return files
    .map((file) => {
      const match = file.match(/^(\d+)_(.+)\.sql$/);
      if (!match) {
        console.warn(`Skipping invalid migration file: ${file}`);
        return null;
      }

      return {
        id: match[1],
        name: match[2],
        path: join(migrationsDir, file),
      };
    })
    .filter((m): m is MigrationFile => m !== null)
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Get executed migrations from database
 */
async function getExecutedMigrations(): Promise<Set<string>> {
  try {
    const result = await postgres.query<{ id: string }>(
      'SELECT id FROM migrations ORDER BY executed_at',
    );
    return new Set(result.rows.map((row) => row.id));
  } catch (error) {
    // Migrations table might not exist yet
    console.log('Migrations table not found, will create it');
    return new Set();
  }
}

/**
 * Execute a single migration
 */
async function executeMigration(migration: MigrationFile): Promise<void> {
  console.log(`Executing migration ${migration.id}_${migration.name}...`);

  const sql = readFileSync(migration.path, 'utf-8');

  try {
    await postgres.query(sql);
    console.log(`✓ Migration ${migration.id} completed successfully`);
  } catch (error) {
    console.error(`✗ Migration ${migration.id} failed:`, error);
    throw error;
  }
}

/**
 * Run all pending migrations
 */
async function runMigrations(): Promise<void> {
  console.log('Starting database migrations...\n');

  try {
    // Connect to database
    await postgres.connect();

    // Get all migration files
    const migrationFiles = getMigrationFiles();
    console.log(`Found ${migrationFiles.length} migration file(s)\n`);

    if (migrationFiles.length === 0) {
      console.log('No migrations to run');
      return;
    }

    // Get executed migrations
    const executedMigrations = await getExecutedMigrations();
    console.log(`${executedMigrations.size} migration(s) already executed\n`);

    // Find pending migrations
    const pendingMigrations = migrationFiles.filter((m) => !executedMigrations.has(m.id));

    if (pendingMigrations.length === 0) {
      console.log('All migrations are up to date');
      return;
    }

    console.log(`Running ${pendingMigrations.length} pending migration(s):\n`);

    // Execute pending migrations
    for (const migration of pendingMigrations) {
      await executeMigration(migration);
    }

    console.log('\n✓ All migrations completed successfully');
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await postgres.disconnect();
  }
}

// Run migrations if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runMigrations, getMigrationFiles, getExecutedMigrations };
