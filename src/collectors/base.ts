import { SocialPost } from '../types/social.js';

/**
 * Базовый интерфейс для всех коллекторов данных
 */
export interface BaseCollector {
  /**
   * Имя коллектора
   */
  readonly name: string;

  /**
   * Запуск коллектора
   */
  start(): Promise<void>;

  /**
   * Остановка коллектора
   */
  stop(): Promise<void>;

  /**
   * Проверка статуса коллектора
   */
  isRunning(): boolean;
}

/**
 * Интерфейс для коллекторов социальных сетей
 */
export interface SocialCollector extends BaseCollector {
  /**
   * Получение последних постов
   * @param limit - максимальное количество постов
   */
  fetchPosts(limit?: number): Promise<SocialPost[]>;

  /**
   * Подписка на новые посты в реальном времени
   * @param callback - функция обработки нового поста
   */
  subscribe(callback: (post: SocialPost) => void): void;

  /**
   * Отписка от получения новых постов
   */
  unsubscribe(): void;
}

/**
 * Абстрактный класс базового коллектора
 */
export abstract class AbstractCollector implements BaseCollector {
  protected running = false;

  constructor(public readonly name: string) {}

  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;

  isRunning(): boolean {
    return this.running;
  }

  protected setRunning(value: boolean): void {
    this.running = value;
  }
}

/**
 * Опции для retry логики
 */
export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Функция для выполнения операции с повторными попытками
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
  operationName = 'operation',
): Promise<T> {
  const { maxRetries, initialDelayMs, maxDelayMs, backoffMultiplier } = options;

  let lastError: Error | undefined;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        break;
      }

      console.warn(
        `${operationName} failed (attempt ${attempt}/${maxRetries}): ${lastError.message}`,
      );
      console.info(`Retrying in ${delay}ms...`);

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw new Error(`${operationName} failed after ${maxRetries} attempts: ${lastError?.message}`);
}
