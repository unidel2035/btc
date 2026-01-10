/**
 * RateLimiter
 * Handles rate limiting for webhook endpoints
 */

import type { Request, Response, NextFunction } from 'express';
import type { RateLimitState } from './types.js';

export interface RateLimiterOptions {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response) => void;
}

/**
 * Simple in-memory rate limiter
 */
export class RateLimiter {
  private limits: Map<string, RateLimitState> = new Map();
  private options: Required<RateLimiterOptions>;

  constructor(options: RateLimiterOptions) {
    this.options = {
      maxRequests: options.maxRequests,
      windowMs: options.windowMs,
      keyGenerator: options.keyGenerator || this.defaultKeyGenerator,
      handler: options.handler || this.defaultHandler,
    };

    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Default key generator (uses IP address)
   */
  private defaultKeyGenerator(req: Request): string {
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  /**
   * Default handler for rate limit exceeded
   */
  private defaultHandler(req: Request, res: Response): void {
    res.status(429).json({
      error: 'Too many requests',
      message: `Rate limit exceeded. Maximum ${this.options.maxRequests} requests per ${this.options.windowMs / 1000} seconds.`,
      retryAfter: this.getRetryAfter(this.options.keyGenerator(req)),
    });
  }

  /**
   * Get rate limit middleware
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const key = this.options.keyGenerator(req);
      const now = new Date();

      // Get or create limit state
      let state = this.limits.get(key);

      if (!state) {
        // First request from this key
        state = {
          key,
          count: 1,
          resetAt: new Date(now.getTime() + this.options.windowMs),
        };
        this.limits.set(key, state);
        this.setHeaders(res, state);
        next();
        return;
      }

      // Check if window has expired
      if (now >= state.resetAt) {
        // Reset the window
        state.count = 1;
        state.resetAt = new Date(now.getTime() + this.options.windowMs);
        this.limits.set(key, state);
        this.setHeaders(res, state);
        next();
        return;
      }

      // Check if limit exceeded
      if (state.count >= this.options.maxRequests) {
        this.setHeaders(res, state);
        this.options.handler(req, res);
        return;
      }

      // Increment counter
      state.count++;
      this.limits.set(key, state);
      this.setHeaders(res, state);
      next();
    };
  }

  /**
   * Set rate limit headers
   */
  private setHeaders(res: Response, state: RateLimitState): void {
    const remaining = Math.max(0, this.options.maxRequests - state.count);
    const resetTime = Math.ceil(state.resetAt.getTime() / 1000);

    res.setHeader('X-RateLimit-Limit', this.options.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetTime.toString());

    if (remaining === 0) {
      const retryAfter = Math.ceil((state.resetAt.getTime() - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
    }
  }

  /**
   * Get retry after seconds for a key
   */
  private getRetryAfter(key: string): number {
    const state = this.limits.get(key);
    if (!state) {
      return 0;
    }

    return Math.ceil((state.resetAt.getTime() - Date.now()) / 1000);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = new Date();
    for (const [key, state] of this.limits.entries()) {
      if (now >= state.resetAt) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    this.limits.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clearAll(): void {
    this.limits.clear();
  }

  /**
   * Get current limit state for a key
   */
  getState(key: string): RateLimitState | undefined {
    return this.limits.get(key);
  }
}

/**
 * Create a rate limiter middleware
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const limiter = new RateLimiter(options);
  return limiter.middleware();
}
