/**
 * Rate Limiting Middleware for Telegram Bot
 */

import type { TelegramBotContext, TelegramBotConfig, RateLimitEntry } from '../types.js';
import type { MiddlewareFn } from 'telegraf';

/**
 * Rate limit storage (in-memory)
 * In production, this should be moved to Redis
 */
const rateLimitStore = new Map<number, RateLimitEntry>();

/**
 * Rate limit middleware - prevent command spam
 */
export function createRateLimitMiddleware(
  config: TelegramBotConfig,
): MiddlewareFn<TelegramBotContext> {
  return async (ctx, next) => {
    const userId = ctx.from?.id;

    if (!userId) {
      await next();
      return;
    }

    const now = new Date();
    const entry = rateLimitStore.get(userId);

    if (!entry) {
      // First command from this user
      rateLimitStore.set(userId, {
        userId,
        commands: 1,
        windowStart: now,
      });
      await next();
      return;
    }

    // Check if window has expired
    const windowElapsed = now.getTime() - entry.windowStart.getTime();
    if (windowElapsed > config.rateLimit.windowMs) {
      // Reset window
      entry.commands = 1;
      entry.windowStart = now;
      rateLimitStore.set(userId, entry);
      await next();
      return;
    }

    // Check if limit exceeded
    if (entry.commands >= config.rateLimit.maxCommands) {
      const remainingTime = Math.ceil((config.rateLimit.windowMs - windowElapsed) / 1000);
      await ctx.reply(
        `⚠️ Rate limit exceeded. Please wait ${remainingTime} seconds before sending more commands.`,
      );
      return;
    }

    // Increment counter
    entry.commands++;
    rateLimitStore.set(userId, entry);
    await next();
  };
}

/**
 * Clean up expired rate limit entries (should be called periodically)
 */
export function cleanupRateLimitStore(windowMs: number): void {
  const now = new Date();
  const expiredKeys: number[] = [];

  for (const [userId, entry] of rateLimitStore.entries()) {
    const elapsed = now.getTime() - entry.windowStart.getTime();
    if (elapsed > windowMs * 2) {
      expiredKeys.push(userId);
    }
  }

  for (const key of expiredKeys) {
    rateLimitStore.delete(key);
  }

  if (expiredKeys.length > 0) {
    console.log(`[RateLimit] Cleaned up ${expiredKeys.length} expired entries`);
  }
}
