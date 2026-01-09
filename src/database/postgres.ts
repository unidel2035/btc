/**
 * PostgreSQL database client
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { DatabaseConfig } from './types.js';

class PostgresClient {
  private static instance: PostgresClient;
  private pool: Pool | null = null;

  private constructor() {}

  static getInstance(): PostgresClient {
    if (!PostgresClient.instance) {
      PostgresClient.instance = new PostgresClient();
    }
    return PostgresClient.instance;
  }

  /**
   * Initialize the database connection pool
   */
  async connect(config?: DatabaseConfig): Promise<void> {
    if (this.pool) {
      console.log('Database already connected');
      return;
    }

    const dbConfig: DatabaseConfig = config || {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'btc_trading_bot',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || '',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    this.pool = new Pool(dbConfig);

    // Test connection
    try {
      const client = await this.pool.connect();
      console.log('PostgreSQL connected successfully');
      client.release();
    } catch (error) {
      console.error('Failed to connect to PostgreSQL:', error);
      throw error;
    }

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  /**
   * Get the connection pool
   */
  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pool;
  }

  /**
   * Execute a query
   */
  async query<T extends Record<string, any> = any>(
    text: string,
    params?: any[],
  ): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }

    try {
      const result = await this.pool.query<T>(text, params);
      return result;
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }

  /**
   * Get a client from the pool for transactions
   */
  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return await this.pool.connect();
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();

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
   * Close all database connections
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('PostgreSQL disconnected');
    }
  }

  /**
   * Check if database is connected
   */
  isConnected(): boolean {
    return this.pool !== null;
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW()');
      return result.rows.length > 0;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
}

export default PostgresClient.getInstance();
