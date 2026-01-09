import Redis, { type RedisOptions } from 'ioredis';
import { config } from './config.js';

/**
 * Redis client wrapper
 */
export class RedisClient {
  private client: Redis | null = null;
  private static instance: RedisClient | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    if (this.client) {
      console.log('Redis: Already connected');
      return;
    }

    try {
      const options: RedisOptions = {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password || undefined,
        db: config.redis.db,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      };

      this.client = new Redis(options);

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        if (!this.client) {
          reject(new Error('Redis client not initialized'));
          return;
        }

        this.client.on('connect', () => {
          console.log('Redis: Connected successfully');
          resolve();
        });

        this.client.on('error', (err) => {
          console.error('Redis connection error:', err);
          reject(err);
        });

        this.client.on('ready', () => {
          console.log('Redis: Ready');
        });

        this.client.on('close', () => {
          console.log('Redis: Connection closed');
        });

        this.client.on('reconnecting', () => {
          console.log('Redis: Reconnecting...');
        });
      });
    } catch (error) {
      console.error('Redis: Connection failed', error);
      throw error;
    }
  }

  /**
   * Get Redis client
   */
  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis: Not connected. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Check if Redis is connected
   */
  isConnected(): boolean {
    return this.client !== null && this.client.status === 'ready';
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      console.log('Redis: Disconnected');
    }
  }

  /**
   * Cache operations
   */

  /**
   * Set a value with optional TTL
   */
  async set(key: string, value: string | number | object, ttl?: number): Promise<void> {
    const client = this.getClient();
    const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);

    if (ttl) {
      await client.setex(key, ttl, serialized);
    } else {
      await client.set(key, serialized);
    }
  }

  /**
   * Get a value
   */
  async get<T = string>(key: string): Promise<T | null> {
    const client = this.getClient();
    const value = await client.get(key);

    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  /**
   * Delete a key
   */
  async delete(key: string): Promise<void> {
    const client = this.getClient();
    await client.del(key);
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    const client = this.getClient();
    const keys = await client.keys(pattern);

    if (keys.length === 0) return 0;

    return await client.del(...keys);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const client = this.getClient();
    const result = await client.exists(key);
    return result === 1;
  }

  /**
   * Set expiration on a key
   */
  async expire(key: string, seconds: number): Promise<void> {
    const client = this.getClient();
    await client.expire(key, seconds);
  }

  /**
   * Get time to live for a key
   */
  async ttl(key: string): Promise<number> {
    const client = this.getClient();
    return await client.ttl(key);
  }

  /**
   * Increment a counter
   */
  async increment(key: string, by: number = 1): Promise<number> {
    const client = this.getClient();
    return await client.incrby(key, by);
  }

  /**
   * Decrement a counter
   */
  async decrement(key: string, by: number = 1): Promise<number> {
    const client = this.getClient();
    return await client.decrby(key, by);
  }

  /**
   * Hash operations
   */

  /**
   * Set hash field
   */
  async hset(key: string, field: string, value: string | number | object): Promise<void> {
    const client = this.getClient();
    const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
    await client.hset(key, field, serialized);
  }

  /**
   * Get hash field
   */
  async hget<T = string>(key: string, field: string): Promise<T | null> {
    const client = this.getClient();
    const value = await client.hget(key, field);

    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  /**
   * Get all hash fields
   */
  async hgetall<T = Record<string, string>>(key: string): Promise<T | null> {
    const client = this.getClient();
    const data = await client.hgetall(key);

    if (!data || Object.keys(data).length === 0) return null;

    return data as T;
  }

  /**
   * Delete hash field
   */
  async hdel(key: string, field: string): Promise<void> {
    const client = this.getClient();
    await client.hdel(key, field);
  }

  /**
   * List operations
   */

  /**
   * Push to list (right side)
   */
  async lpush(key: string, ...values: string[]): Promise<void> {
    const client = this.getClient();
    await client.lpush(key, ...values);
  }

  /**
   * Pop from list (right side)
   */
  async lpop(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.lpop(key);
  }

  /**
   * Get list range
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const client = this.getClient();
    return await client.lrange(key, start, stop);
  }

  /**
   * Get list length
   */
  async llen(key: string): Promise<number> {
    const client = this.getClient();
    return await client.llen(key);
  }

  /**
   * Pub/Sub operations
   */

  /**
   * Publish message to channel
   */
  async publish(channel: string, message: string | object): Promise<void> {
    const client = this.getClient();
    const serialized = typeof message === 'object' ? JSON.stringify(message) : message;
    await client.publish(channel, serialized);
  }

  /**
   * Subscribe to channel
   */
  subscribe(channel: string, callback: (message: string) => void): void {
    const client = this.getClient();
    client.subscribe(channel);
    client.on('message', (ch, message) => {
      if (ch === channel) {
        callback(message);
      }
    });
  }

  /**
   * Get database info
   */
  async info(): Promise<string> {
    const client = this.getClient();
    return await client.info();
  }

  /**
   * Flush all data (use with caution)
   */
  async flushall(): Promise<void> {
    const client = this.getClient();
    await client.flushall();
  }
}

// Export singleton instance
export const redis = RedisClient.getInstance();
