import Bottleneck from 'bottleneck';

/**
 * Конфигурация rate limiter
 */
export interface RateLimiterConfig {
  /** Минимальное время между запросами в миллисекундах */
  minTime?: number;

  /** Максимальное количество одновременных запросов */
  maxConcurrent?: number;

  /** Размер резервуара (количество запросов) */
  reservoir?: number;

  /** Время пополнения резервуара в миллисекундах */
  reservoirRefreshInterval?: number;

  /** Количество запросов для пополнения */
  reservoirRefreshAmount?: number;
}

/**
 * Rate Limiter для контроля частоты запросов к API
 */
export class RateLimiter {
  private limiter: Bottleneck;
  private name: string;

  constructor(name: string, config: RateLimiterConfig = {}) {
    this.name = name;
    this.limiter = new Bottleneck({
      minTime: config.minTime || 1000, // По умолчанию 1 запрос в секунду
      maxConcurrent: config.maxConcurrent || 1,
      reservoir: config.reservoir,
      reservoirRefreshInterval: config.reservoirRefreshInterval,
      reservoirRefreshAmount: config.reservoirRefreshAmount,
    });

    this.setupEventListeners();
  }

  /**
   * Настройка слушателей событий для отладки
   */
  private setupEventListeners(): void {
    this.limiter.on('failed', async (error, jobInfo) => {
      const id = jobInfo.options.id;
      console.warn(`[${this.name}] Job ${id} failed:`, error);

      if (jobInfo.retryCount < 3) {
        console.log(`[${this.name}] Retrying job ${id} in ${jobInfo.retryCount * 1000}ms...`);
        return jobInfo.retryCount * 1000;
      }
    });

    this.limiter.on('retry', (error, jobInfo) => {
      console.log(`[${this.name}] Retrying job ${jobInfo.options.id}. Retry count: ${jobInfo.retryCount}`);
    });
  }

  /**
   * Выполнить функцию с ограничением скорости
   */
  async schedule<T>(fn: () => Promise<T>, priority?: number): Promise<T> {
    return this.limiter.schedule({ priority }, fn);
  }

  /**
   * Получить текущие метрики
   */
  getMetrics() {
    return {
      running: this.limiter.running(),
      queued: this.limiter.queued(),
      done: this.limiter.done(),
    };
  }

  /**
   * Остановить rate limiter
   */
  async stop(): Promise<void> {
    await this.limiter.stop();
  }
}

/**
 * Создать rate limiter для Twitter API
 */
export function createTwitterRateLimiter(): RateLimiter {
  return new RateLimiter('Twitter', {
    minTime: 2000, // 2 секунды между запросами
    maxConcurrent: 1,
    reservoir: 15, // 15 запросов
    reservoirRefreshInterval: 15 * 60 * 1000, // Обновление каждые 15 минут
    reservoirRefreshAmount: 15,
  });
}

/**
 * Создать rate limiter для Reddit API
 */
export function createRedditRateLimiter(): RateLimiter {
  return new RateLimiter('Reddit', {
    minTime: 2000, // 2 секунды между запросами (60 запросов в минуту)
    maxConcurrent: 1,
  });
}

/**
 * Создать rate limiter для Telegram API
 */
export function createTelegramRateLimiter(): RateLimiter {
  return new RateLimiter('Telegram', {
    minTime: 1000, // 1 секунда между запросами
    maxConcurrent: 1,
    reservoir: 20, // 20 запросов
    reservoirRefreshInterval: 60 * 1000, // Обновление каждую минуту
    reservoirRefreshAmount: 20,
  });
}
