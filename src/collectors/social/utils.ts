import { RateLimiterMemory } from 'rate-limiter-flexible';

/**
 * Утилиты для работы с rate limiting и retry logic
 */

/**
 * Настройки для retry логики
 */
export interface RetryOptions {
  /** Максимальное количество попыток */
  maxRetries: number;
  /** Базовая задержка между попытками (мс) */
  baseDelay: number;
  /** Множитель для экспоненциального backoff */
  backoffMultiplier: number;
  /** Максимальная задержка между попытками (мс) */
  maxDelay: number;
}

/**
 * Дефолтные настройки для retry
 */
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 30000,
};

/**
 * Выполняет функцию с retry логикой и экспоненциальным backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Если это последняя попытка, выбрасываем ошибку
      if (attempt === opts.maxRetries) {
        break;
      }

      // Вычисляем задержку с экспоненциальным backoff
      const delay = Math.min(
        opts.baseDelay * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelay,
      );

      console.warn(
        `Attempt ${attempt + 1}/${opts.maxRetries + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`,
      );

      // Ждем перед следующей попыткой
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Спит указанное количество миллисекунд
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Rate limiter для различных платформ
 */
export class SocialRateLimiter {
  private limiters: Map<string, RateLimiterMemory>;

  constructor() {
    this.limiters = new Map();
  }

  /**
   * Создает rate limiter для Twitter
   * Twitter API v2: 300 запросов в 15 минут (по умолчанию)
   */
  createTwitterLimiter(requestsPerWindow = 300, windowMs = 15 * 60 * 1000): RateLimiterMemory {
    const limiter = new RateLimiterMemory({
      points: requestsPerWindow,
      duration: Math.floor(windowMs / 1000),
    });
    this.limiters.set('twitter', limiter);
    return limiter;
  }

  /**
   * Создает rate limiter для Reddit
   * Reddit API: 60 запросов в минуту
   */
  createRedditLimiter(requestsPerMinute = 60): RateLimiterMemory {
    const limiter = new RateLimiterMemory({
      points: requestsPerMinute,
      duration: 60,
    });
    this.limiters.set('reddit', limiter);
    return limiter;
  }

  /**
   * Создает rate limiter для Telegram
   * Telegram Bot API: 30 сообщений в секунду
   */
  createTelegramLimiter(requestsPerSecond = 30): RateLimiterMemory {
    const limiter = new RateLimiterMemory({
      points: requestsPerSecond,
      duration: 1,
    });
    this.limiters.set('telegram', limiter);
    return limiter;
  }

  /**
   * Создает кастомный rate limiter
   */
  createCustomLimiter(name: string, points: number, durationSeconds: number): RateLimiterMemory {
    const limiter = new RateLimiterMemory({
      points,
      duration: durationSeconds,
    });
    this.limiters.set(name, limiter);
    return limiter;
  }

  /**
   * Получает limiter по имени
   */
  getLimiter(name: string): RateLimiterMemory | undefined {
    return this.limiters.get(name);
  }

  /**
   * Выполняет функцию с учетом rate limiting
   */
  async execute<T>(limiterName: string, fn: () => Promise<T>): Promise<T> {
    const limiter = this.getLimiter(limiterName);
    if (!limiter) {
      throw new Error(`Rate limiter "${limiterName}" not found`);
    }

    try {
      await limiter.consume(limiterName, 1);
      return await fn();
    } catch (error) {
      if (error instanceof Error && 'msBeforeNext' in error) {
        const rateLimitError = error as Error & { msBeforeNext: number };
        console.warn(
          `Rate limit exceeded for ${limiterName}. Retry after ${rateLimitError.msBeforeNext}ms`,
        );
        await sleep(rateLimitError.msBeforeNext);
        return await this.execute(limiterName, fn);
      }
      throw error;
    }
  }
}

/**
 * Извлекает хештеги из текста
 */
export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#(\w+)/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map((tag) => tag.slice(1).toLowerCase()) : [];
}

/**
 * Извлекает упоминания из текста
 */
export function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const matches = text.match(mentionRegex);
  return matches ? matches.map((mention) => mention.slice(1)) : [];
}

/**
 * Проверяет, содержит ли текст криптовалютные ключевые слова
 */
export function isCryptoRelated(text: string): boolean {
  const cryptoKeywords = [
    'bitcoin',
    'btc',
    'crypto',
    'cryptocurrency',
    'blockchain',
    'ethereum',
    'eth',
    'altcoin',
    'defi',
    'nft',
    'web3',
    'satoshi',
    'hodl',
    'trading',
    'bull',
    'bear',
    'pump',
    'dump',
  ];

  const lowerText = text.toLowerCase();
  return cryptoKeywords.some((keyword) => lowerText.includes(keyword));
}

/**
 * Валидирует URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Генерирует уникальный ID для поста
 */
export function generatePostId(platform: string, originalId: string): string {
  return `${platform}_${originalId}_${Date.now()}`;
}
