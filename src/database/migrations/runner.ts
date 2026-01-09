import { postgres } from '../postgres.js';
import type { PoolClient } from 'pg';
import * as migration001 from './001_initial_schema.js';

/**
 * Migration interface
 */
interface Migration {
  id: string;
  name: string;
  up: (client: PoolClient) => Promise<void>;
  down: (client: PoolClient) => Promise<void>;
}

/**
 * Available migrations
 */
const migrations: Migration[] = [
  {
    id: '001',
    name: 'initial_schema',
    up: migration001.up,
    down: migration001.down,
  },
];

/**
 * Migration tracker table
 */
const createMigrationsTable = async (client: PoolClient): Promise<void> => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id VARCHAR(10) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
};

/**
 * Get executed migrations
 */
const getExecutedMigrations = async (client: PoolClient): Promise<Set<string>> => {
  const result = await client.query<{ id: string }>('SELECT id FROM migrations ORDER BY id');
  return new Set(result.rows.map((row) => row.id));
};

/**
 * Record migration execution
 */
const recordMigration = async (
  client: PoolClient,
  id: string,
  name: string,
): Promise<void> => {
  await client.query('INSERT INTO migrations (id, name) VALUES ($1, $2)', [id, name]);
};

/**
 * Remove migration record
 */
const removeMigration = async (client: PoolClient, id: string): Promise<void> => {
  await client.query('DELETE FROM migrations WHERE id = $1', [id]);
};

/**
 * Run pending migrations
 */
export const runMigrations = async (): Promise<void> => {
  console.log('Starting database migrations...');

  try {
    // Connect to database
    if (!postgres.isConnected()) {
      await postgres.connect();
    }

    await postgres.transaction(async (client) => {
      // Create migrations table
      await createMigrationsTable(client);

      // Get executed migrations
      const executed = await getExecutedMigrations(client);

      // Run pending migrations
      let executedCount = 0;
      for (const migration of migrations) {
        if (!executed.has(migration.id)) {
          console.log(`Running migration ${migration.id}: ${migration.name}...`);
          await migration.up(client);
          await recordMigration(client, migration.id, migration.name);
          executedCount++;
          console.log(`Migration ${migration.id} completed successfully`);
        }
      }

      if (executedCount === 0) {
        console.log('No pending migrations');
      } else {
        console.log(`Executed ${executedCount} migration(s) successfully`);
      }
    });
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

/**
 * Rollback last migration
 */
export const rollbackMigration = async (): Promise<void> => {
  console.log('Rolling back last migration...');

  try {
    // Connect to database
    if (!postgres.isConnected()) {
      await postgres.connect();
    }

    await postgres.transaction(async (client) => {
      // Create migrations table if it doesn't exist
      await createMigrationsTable(client);

      // Get executed migrations
      const result = await client.query<{ id: string; name: string }>(
        'SELECT id, name FROM migrations ORDER BY id DESC LIMIT 1',
      );

      if (result.rows.length === 0) {
        console.log('No migrations to rollback');
        return;
      }

      const lastMigration = result.rows[0];
      const migration = migrations.find((m) => m.id === lastMigration.id);

      if (!migration) {
        throw new Error(`Migration ${lastMigration.id} not found in migration files`);
      }

      console.log(`Rolling back migration ${migration.id}: ${migration.name}...`);
      await migration.down(client);
      await removeMigration(client, migration.id);
      console.log(`Migration ${migration.id} rolled back successfully`);
    });
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
};

/**
 * Show migration status
 */
export const showMigrationStatus = async (): Promise<void> => {
  console.log('Migration status:');

  try {
    // Connect to database
    if (!postgres.isConnected()) {
      await postgres.connect();
    }

    const client = postgres.getPool();

    // Create migrations table if it doesn't exist
    await createMigrationsTable(await client.connect());

    // Get executed migrations
    const executed = await getExecutedMigrations(await client.connect());

    console.log('\nAvailable migrations:');
    for (const migration of migrations) {
      const status = executed.has(migration.id) ? '✓ Executed' : '○ Pending';
      console.log(`  ${status} - ${migration.id}: ${migration.name}`);
    }
  } catch (error) {
    console.error('Failed to get migration status:', error);
    throw error;
  }
};
