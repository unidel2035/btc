import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

/**
 * PostgreSQL connection pool
 */
export class PostgresClient {
  private pool: pg.Pool | null = null;
  private static instance: PostgresClient | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): PostgresClient {
    if (!PostgresClient.instance) {
      PostgresClient.instance = new PostgresClient();
    }
    return PostgresClient.instance;
  }

  /**
   * Initialize connection pool
   */
  async connect(): Promise<void> {
    if (this.pool) {
      console.log('PostgreSQL: Already connected');
      return;
    }

    try {
      this.pool = new Pool({
        host: config.postgres.host,
        port: config.postgres.port,
        database: config.postgres.database,
        user: config.postgres.user,
        password: config.postgres.password,
        max: config.postgres.maxConnections,
        idleTimeoutMillis: config.postgres.idleTimeout,
        connectionTimeoutMillis: config.postgres.connectionTimeout,
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      console.log('PostgreSQL: Connected successfully');

      // Handle pool errors
      this.pool.on('error', (err) => {
        console.error('PostgreSQL pool error:', err);
      });
    } catch (error) {
      console.error('PostgreSQL: Connection failed', error);
      throw error;
    }
  }

  /**
   * Get connection pool
   */
  getPool(): pg.Pool {
    if (!this.pool) {
      throw new Error('PostgreSQL: Not connected. Call connect() first.');
    }
    return this.pool;
  }

  /**
   * Execute a query
   */
  async query<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
    const pool = this.getPool();
    return pool.query<T>(text, params);
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const pool = this.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if database is connected
   */
  isConnected(): boolean {
    return this.pool !== null;
  }

  /**
   * Close connection pool
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('PostgreSQL: Disconnected');
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    total: number;
    idle: number;
    waiting: number;
  } {
    if (!this.pool) {
      return { total: 0, idle: 0, waiting: 0 };
    }

    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }
}

// Export singleton instance
export const postgres = PostgresClient.getInstance();
