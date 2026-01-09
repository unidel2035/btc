/**
 * Конфигурация retry logic
 */
export interface RetryConfig {
  /** Максимальное количество попыток */
  maxAttempts: number;

  /** Базовая задержка в миллисекундах */
  baseDelay: number;

  /** Максимальная задержка в миллисекундах */
  maxDelay: number;

  /** Использовать экспоненциальную задержку */
  exponentialBackoff: boolean;

  /** Коэффициент для экспоненциальной задержки */
  backoffFactor: number;
}

/**
 * Ошибка с информацией о попытках
 */
export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

/**
 * Retry logic с экспоненциальной задержкой
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    exponentialBackoff = true,
    backoffFactor = 2,
  } = config;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) {
        throw new RetryError(
          `Failed after ${maxAttempts} attempts`,
          attempt,
          lastError
        );
      }

      const delay = exponentialBackoff
        ? Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay)
        : baseDelay;

      console.warn(
        `Attempt ${attempt}/${maxAttempts} failed: ${lastError.message}. Retrying in ${delay}ms...`
      );

      await sleep(delay);
    }
  }

  throw new RetryError(
    `Failed after ${maxAttempts} attempts`,
    maxAttempts,
    lastError!
  );
}

/**
 * Проверка, является ли ошибка временной (transient)
 */
export function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const transientPatterns = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'rate limit',
    '429',
    '503',
    '502',
    '504',
    'timeout',
    'network',
  ];

  const errorMessage = error.message.toLowerCase();
  return transientPatterns.some(pattern =>
    errorMessage.includes(pattern.toLowerCase())
  );
}

/**
 * Retry с проверкой на временные ошибки
 */
export async function retryOnTransientError<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  return retryWithBackoff(async () => {
    try {
      return await fn();
    } catch (error) {
      if (!isTransientError(error)) {
        throw error;
      }
      throw error;
    }
  }, config);
}

/**
 * Утилита для задержки выполнения
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry декоратор для методов класса
 */
export function Retry(config: Partial<RetryConfig> = {}) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      return retryWithBackoff(() => originalMethod.apply(this, args), config);
    };

    return descriptor;
  };
}
