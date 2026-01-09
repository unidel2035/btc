/**
 * Retry Logic с экспоненциальной задержкой
 */

export interface RetryConfig {
  maxAttempts?: number; // Максимальное количество попыток (по умолчанию 3)
  initialDelay?: number; // Начальная задержка в мс (по умолчанию 1000)
  maxDelay?: number; // Максимальная задержка в мс (по умолчанию 30000)
  backoffMultiplier?: number; // Множитель для экспоненциальной задержки (по умолчанию 2)
}

export class RetryError extends Error {
  constructor(
    message: string,
    public attempts: number,
    public lastError: Error,
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

/**
 * Проверка, является ли ошибка временной (transient)
 */
export function isTransientError(error: Error): boolean {
  const transientMessages = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'timeout',
    'rate limit',
    'too many requests',
    '429',
    '500',
    '502',
    '503',
    '504',
  ];

  const errorMessage = error.message.toLowerCase();
  return transientMessages.some((msg) => errorMessage.includes(msg.toLowerCase()));
}

/**
 * Выполнение функции с повторными попытками при ошибках
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {},
): Promise<T> {
  const maxAttempts = config.maxAttempts || 3;
  const initialDelay = config.initialDelay || 1000;
  const maxDelay = config.maxDelay || 30000;
  const backoffMultiplier = config.backoffMultiplier || 2;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Если это последняя попытка или ошибка не временная, пробрасываем
      if (attempt === maxAttempts || !isTransientError(lastError)) {
        throw lastError;
      }

      // Вычисляем задержку с экспоненциальным backoff
      const delay = Math.min(initialDelay * Math.pow(backoffMultiplier, attempt - 1), maxDelay);

      console.warn(
        `[Retry] Attempt ${attempt}/${maxAttempts} failed: ${lastError.message}. ` +
          `Retrying in ${delay}ms...`,
      );

      // Ждем перед следующей попыткой
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Этот код не должен выполниться, но для TypeScript
  throw new RetryError(
    `Failed after ${maxAttempts} attempts`,
    maxAttempts,
    lastError || new Error('Unknown error'),
  );
}
