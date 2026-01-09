import { redis } from '../redis.js';
import { REDIS_KEYS, CACHE_TTL } from '../config.js';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifier: string;
  action: string;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  current: number;
}

/**
 * Rate limiter using Redis
 */
export class RateLimiter {
  /**
   * Check if action is allowed and increment counter
   */
  static async checkLimit(config: RateLimitConfig): Promise<RateLimitResult> {
    const key = REDIS_KEYS.RATE_LIMIT(config.identifier, config.action);
    const windowSeconds = Math.floor(config.windowMs / 1000);

    try {
      // Get current count
      const currentStr = await redis.get<string>(key);
      const current = currentStr ? parseInt(currentStr, 10) : 0;

      // Check if limit exceeded
      if (current >= config.maxRequests) {
        const ttl = await redis.ttl(key);
        const resetAt = new Date(Date.now() + ttl * 1000);

        return {
          allowed: false,
          remaining: 0,
          resetAt,
          current,
        };
      }

      // Increment counter
      const newCount = await redis.increment(key);

      // Set expiration on first request
      if (newCount === 1) {
        await redis.expire(key, windowSeconds);
      }

      const ttl = await redis.ttl(key);
      const resetAt = new Date(Date.now() + ttl * 1000);

      return {
        allowed: true,
        remaining: Math.max(0, config.maxRequests - newCount),
        resetAt,
        current: newCount,
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // On error, allow the request
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: new Date(Date.now() + config.windowMs),
        current: 0,
      };
    }
  }

  /**
   * Reset rate limit for identifier and action
   */
  static async resetLimit(identifier: string, action: string): Promise<void> {
    const key = REDIS_KEYS.RATE_LIMIT(identifier, action);
    await redis.delete(key);
  }

  /**
   * Get current rate limit status without incrementing
   */
  static async getStatus(identifier: string, action: string): Promise<RateLimitResult> {
    const key = REDIS_KEYS.RATE_LIMIT(identifier, action);

    try {
      const currentStr = await redis.get<string>(key);
      const current = currentStr ? parseInt(currentStr, 10) : 0;
      const ttl = await redis.ttl(key);
      const resetAt = new Date(Date.now() + (ttl > 0 ? ttl * 1000 : 0));

      return {
        allowed: true,
        remaining: 0, // Unknown without config
        resetAt,
        current,
      };
    } catch (error) {
      console.error('Failed to get rate limit status:', error);
      return {
        allowed: true,
        remaining: 0,
        resetAt: new Date(),
        current: 0,
      };
    }
  }

  /**
   * Clear all rate limits
   */
  static async clearAll(): Promise<void> {
    await redis.deletePattern(REDIS_KEYS.RATE_LIMITS);
  }
}

/**
 * Common rate limit presets
 */
export const RATE_LIMIT_PRESETS = {
  /**
   * API calls per minute
   */
  API_PER_MINUTE: (identifier: string, maxRequests: number = 60) => ({
    identifier,
    action: 'api',
    maxRequests,
    windowMs: CACHE_TTL.RATE_LIMIT_MINUTE * 1000,
  }),

  /**
   * API calls per hour
   */
  API_PER_HOUR: (identifier: string, maxRequests: number = 1000) => ({
    identifier,
    action: 'api',
    maxRequests,
    windowMs: CACHE_TTL.RATE_LIMIT_HOUR * 1000,
  }),

  /**
   * Exchange API calls per minute
   */
  EXCHANGE_PER_MINUTE: (identifier: string, maxRequests: number = 100) => ({
    identifier,
    action: 'exchange',
    maxRequests,
    windowMs: CACHE_TTL.RATE_LIMIT_MINUTE * 1000,
  }),

  /**
   * News collection per minute
   */
  NEWS_COLLECTION_PER_MINUTE: (identifier: string, maxRequests: number = 10) => ({
    identifier,
    action: 'news_collection',
    maxRequests,
    windowMs: CACHE_TTL.RATE_LIMIT_MINUTE * 1000,
  }),

  /**
   * Sentiment analysis per minute
   */
  SENTIMENT_ANALYSIS_PER_MINUTE: (identifier: string, maxRequests: number = 20) => ({
    identifier,
    action: 'sentiment_analysis',
    maxRequests,
    windowMs: CACHE_TTL.RATE_LIMIT_MINUTE * 1000,
  }),

  /**
   * Trading signals per minute
   */
  TRADING_SIGNALS_PER_MINUTE: (identifier: string, maxRequests: number = 5) => ({
    identifier,
    action: 'trading_signals',
    maxRequests,
    windowMs: CACHE_TTL.RATE_LIMIT_MINUTE * 1000,
  }),

  /**
   * Trade execution per minute
   */
  TRADE_EXECUTION_PER_MINUTE: (identifier: string, maxRequests: number = 10) => ({
    identifier,
    action: 'trade_execution',
    maxRequests,
    windowMs: CACHE_TTL.RATE_LIMIT_MINUTE * 1000,
  }),
};
