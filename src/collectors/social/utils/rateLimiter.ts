/**
 * Rate Limiter для контроля частоты запросов к API
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // токенов в миллисекунду

  constructor(maxRequests: number, timeWindowMs: number) {
    this.maxTokens = maxRequests;
    this.tokens = maxRequests;
    this.refillRate = maxRequests / timeWindowMs;
    this.lastRefill = Date.now();
  }

  /**
   * Пополнение токенов
   */
  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Выполнение функции с учетом rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    return fn();
  }

  /**
   * Ожидание доступности токена
   */
  private async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Ожидание в очереди
    const waitTime = Math.ceil((1 - this.tokens) / this.refillRate);
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        this.tokens -= 1;
        resolve();
      }, waitTime);
    });
  }

  /**
   * Получение текущей статистики
   */
  getStats(): { availableTokens: number; maxTokens: number } {
    this.refill();
    return {
      availableTokens: Math.floor(this.tokens),
      maxTokens: this.maxTokens,
    };
  }
}
