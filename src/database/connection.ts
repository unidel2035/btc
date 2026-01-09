import { Pool, PoolClient, QueryResult } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Database connection pool manager
 */
export class Database {
  private static instance: Database;
  private pool: Pool | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * Initialize database connection
   */
  async connect(config?: {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
  }): Promise<void> {
    if (this.pool) {
      return;
    }

    const dbConfig = {
      host: config?.host || process.env.POSTGRES_HOST || 'localhost',
      port: config?.port || parseInt(process.env.POSTGRES_PORT || '5432'),
      database: config?.database || process.env.POSTGRES_DB || 'btc_trading_bot',
      user: config?.user || process.env.POSTGRES_USER || 'postgres',
      password: config?.password || process.env.POSTGRES_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    this.pool = new Pool(dbConfig);

    // Test connection
    try {
      const client = await this.pool.connect();
      console.log('Database connected successfully');
      client.release();
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Run database migrations
   */
  async migrate(): Promise<void> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    try {
      await this.pool.query(schemaSql);
      console.log('Database migrations completed successfully');
    } catch (error) {
      console.error('Database migration failed:', error);
      throw error;
    }
  }

  /**
   * Execute a query
   */
  async query<T = unknown>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }
    return this.pool.query<T>(text, params);
  }

  /**
   * Get a client from the pool
   */
  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }
    return this.pool.connect();
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('Database connection closed');
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.pool !== null;
  }
}

/**
 * Singleton database instance
 */
export const db = Database.getInstance();
