/**
 * Rate Limiter
 * Контроль частоты запросов к API
 */

export interface RateLimiterConfig {
  maxRequests: number; // Максимальное количество запросов
  interval: number; // Интервал в миллисекундах
  enabled?: boolean;
}

export class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly interval: number;
  private readonly enabled: boolean;

  constructor(config: RateLimiterConfig) {
    this.maxRequests = config.maxRequests;
    this.interval = config.interval;
    this.enabled = config.enabled ?? true;
  }

  /**
   * Ожидание возможности выполнить запрос
   */
  async waitForSlot(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const now = Date.now();

    // Удаляем старые запросы вне интервала
    this.requests = this.requests.filter((timestamp) => now - timestamp < this.interval);

    if (this.requests.length >= this.maxRequests) {
      // Вычисляем время ожидания
      const oldestRequest = this.requests[0];
      if (!oldestRequest) return;
      const waitTime = this.interval - (now - oldestRequest);

      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return this.waitForSlot();
      }
    }

    // Добавляем текущий запрос
    this.requests.push(now);
  }

  /**
   * Получить оставшиеся доступные запросы
   */
  getRemainingRequests(): number {
    if (!this.enabled) {
      return Infinity;
    }

    const now = Date.now();
    this.requests = this.requests.filter((timestamp) => now - timestamp < this.interval);
    return Math.max(0, this.maxRequests - this.requests.length);
  }

  /**
   * Сброс лимитов
   */
  reset(): void {
    this.requests = [];
  }

  /**
   * Получить статистику
   */
  getStats() {
    return {
      maxRequests: this.maxRequests,
      interval: this.interval,
      currentRequests: this.requests.length,
      remainingRequests: this.getRemainingRequests(),
      enabled: this.enabled,
    };
  }
}
