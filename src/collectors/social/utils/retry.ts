/**
 * Опции для retry logic
 */
export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Проверка, является ли ошибка временной (transient)
 */
export function isTransientError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Network errors
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnreset')
  ) {
    return true;
  }

  // Rate limiting
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return true;
  }

  // Server errors (5xx)
  if (
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504')
  ) {
    return true;
  }

  return false;
}

/**
 * Выполнение функции с автоматическими повторными попытками
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  },
): Promise<T> {
  let lastError: Error | undefined;
  let delay = options.initialDelayMs;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Если это не временная ошибка или последняя попытка, выбрасываем
      if (!isTransientError(lastError) || attempt === options.maxAttempts) {
        throw lastError;
      }

      // Логирование повторной попытки
      console.warn(
        `Attempt ${attempt}/${options.maxAttempts} failed: ${lastError.message}. Retrying in ${delay}ms...`,
      );

      // Ожидание перед следующей попыткой
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Экспоненциальное увеличение задержки
      delay = Math.min(delay * options.backoffMultiplier, options.maxDelayMs);
    }
  }

  // Этот код не должен выполняться, но TypeScript требует return
  throw lastError || new Error('Retry failed');
}
