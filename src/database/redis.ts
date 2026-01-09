/**
 * Redis client for caching and queues
 */

import Redis, { RedisOptions } from 'ioredis';
import { RedisConfig } from './types.js';

class RedisClient {
  private static instance: RedisClient;
  private client: Redis | null = null;

  private constructor() {}

  static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  /**
   * Initialize Redis connection
   */
  async connect(config?: RedisConfig): Promise<void> {
    if (this.client) {
      console.log('Redis already connected');
      return;
    }

    const redisConfig: RedisOptions = {
      host: config?.host || process.env.REDIS_HOST || 'localhost',
      port: config?.port || parseInt(process.env.REDIS_PORT || '6379'),
      password: config?.password || process.env.REDIS_PASSWORD || undefined,
      db: config?.db || 0,
      keyPrefix: config?.keyPrefix || 'btc:',
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    };

    this.client = new Redis(redisConfig);

    // Handle connection events
    this.client.on('connect', () => {
      console.log('Redis connected successfully');
    });

    this.client.on('error', (err) => {
      console.error('Redis error:', err);
    });

    this.client.on('close', () => {
      console.log('Redis connection closed');
    });

    // Test connection
    try {
      await this.client.ping();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Get the Redis client
   */
  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis not connected. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Set a key-value pair with optional expiration (in seconds)
   */
  async set(
    key: string,
    value: string | number | Buffer,
    expirationSeconds?: number,
  ): Promise<void> {
    if (!this.client) {
      throw new Error('Redis not connected. Call connect() first.');
    }

    if (expirationSeconds) {
      await this.client.setex(key, expirationSeconds, value.toString());
    } else {
      await this.client.set(key, value.toString());
    }
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | null> {
    if (!this.client) {
      throw new Error('Redis not connected. Call connect() first.');
    }
    return await this.client.get(key);
  }

  /**
   * Set a JSON object
   */
  async setJSON(
    key: string,
    value: Record<string, any>,
    expirationSeconds?: number,
  ): Promise<void> {
    await this.set(key, JSON.stringify(value), expirationSeconds);
  }

  /**
   * Get a JSON object
   */
  async getJSON<T = any>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Failed to parse JSON from Redis:', error);
      return null;
    }
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<number> {
    if (!this.client) {
      throw new Error('Redis not connected. Call connect() first.');
    }
    return await this.client.del(key);
  }

  /**
   * Delete multiple keys
   */
  async delMany(keys: string[]): Promise<number> {
    if (!this.client) {
      throw new Error('Redis not connected. Call connect() first.');
    }
    if (keys.length === 0) return 0;
    return await this.client.del(...keys);
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Redis not connected. Call connect() first.');
    }
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Set expiration on a key (in seconds)
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.client) {
      throw new Error('Redis not connected. Call connect() first.');
    }
    const result = await this.client.expire(key, seconds);
    return result === 1;
  }

  /**
   * Get remaining TTL for a key (in seconds)
   */
  async ttl(key: string): Promise<number> {
    if (!this.client) {
      throw new Error('Redis not connected. Call connect() first.');
    }
    return await this.client.ttl(key);
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    if (!this.client) {
      throw new Error('Redis not connected. Call connect() first.');
    }
    return await this.client.incr(key);
  }

  /**
   * Decrement a counter
   */
  async decr(key: string): Promise<number> {
    if (!this.client) {
      throw new Error('Redis not connected. Call connect() first.');
    }
    return await this.client.decr(key);
  }

  /**
   * Get keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    if (!this.client) {
      throw new Error('Redis not connected. Call connect() first.');
    }
    return await this.client.keys(pattern);
  }

  /**
   * Flush all keys in the current database
   */
  async flushdb(): Promise<void> {
    if (!this.client) {
      throw new Error('Redis not connected. Call connect() first.');
    }
    await this.client.flushdb();
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      console.log('Redis disconnected');
    }
  }

  /**
   * Check if Redis is connected
   */
  isConnected(): boolean {
    return this.client !== null && this.client.status === 'ready';
  }

  /**
   * Test Redis connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.client) return false;
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis connection test failed:', error);
      return false;
    }
  }

  /**
   * Rate limiting: Check if action is allowed
   * Returns true if allowed, false if rate limit exceeded
   */
  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    if (!this.client) {
      throw new Error('Redis not connected. Call connect() first.');
    }

    const current = await this.incr(`ratelimit:${key}`);

    if (current === 1) {
      await this.expire(`ratelimit:${key}`, windowSeconds);
    }

    return current <= limit;
  }

  /**
   * Publish a message to a channel
   */
  async publish(channel: string, message: string): Promise<number> {
    if (!this.client) {
      throw new Error('Redis not connected. Call connect() first.');
    }
    return await this.client.publish(channel, message);
  }

  /**
   * Subscribe to a channel
   */
  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    if (!this.client) {
      throw new Error('Redis not connected. Call connect() first.');
    }

    const subscriber = this.client.duplicate();
    await subscriber.subscribe(channel);

    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        callback(message);
      }
    });
  }
}

export default RedisClient.getInstance();
