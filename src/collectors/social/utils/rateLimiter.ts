/**
 * Rate Limiter для контроля частоты запросов к API
 */

export interface RateLimiterConfig {
  maxRequests: number; // Максимальное количество запросов
  timeWindow: number; // Временное окно в миллисекундах
  minDelay?: number; // Минимальная задержка между запросами в миллисекундах
}

export class RateLimiter {
  private maxRequests: number;
  private timeWindow: number;
  private minDelay: number;
  private requests: number[] = []; // Timestamps запросов
  private lastRequestTime: number = 0;

  constructor(config: RateLimiterConfig) {
    this.maxRequests = config.maxRequests;
    this.timeWindow = config.timeWindow;
    this.minDelay = config.minDelay || 0;
  }

  /**
   * Ожидание перед следующим запросом
   */
  async throttle(): Promise<void> {
    const now = Date.now();

    // Удаляем старые запросы за пределами временного окна
    this.requests = this.requests.filter((timestamp) => now - timestamp < this.timeWindow);

    // Проверяем минимальную задержку
    if (this.minDelay > 0) {
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minDelay) {
        await this.sleep(this.minDelay - timeSinceLastRequest);
      }
    }

    // Если достигнут лимит запросов, ждем
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      if (oldestRequest !== undefined) {
        const waitTime = this.timeWindow - (now - oldestRequest) + 100; // +100ms буфер
        if (waitTime > 0) {
          await this.sleep(waitTime);
        }
      }
    }

    // Регистрируем новый запрос
    this.lastRequestTime = Date.now();
    this.requests.push(this.lastRequestTime);
  }

  /**
   * Сброс лимитера
   */
  reset(): void {
    this.requests = [];
    this.lastRequestTime = 0;
  }

  /**
   * Получение текущей статистики
   */
  getStats(): { currentRequests: number; maxRequests: number } {
    const now = Date.now();
    this.requests = this.requests.filter((timestamp) => now - timestamp < this.timeWindow);
    return {
      currentRequests: this.requests.length,
      maxRequests: this.maxRequests,
    };
  }

  /**
   * Утилита для задержки
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
