import {
  SentimentResult,
  AnalyzeRequest,
  AnalyzeResponse,
  SentimentAnalyzerConfig,
  BatchAnalysisResult,
  SentimentLabel,
  ImpactLevel,
  EntityInfo,
} from './types.js';

/**
 * Клиент для взаимодействия с Python микросервисом анализа настроений
 */
export class SentimentAnalyzerClient {
  private config: Required<SentimentAnalyzerConfig>;

  constructor(config: SentimentAnalyzerConfig) {
    this.config = {
      apiUrl: config.apiUrl,
      timeout: config.timeout ?? 30000,
      batchSize: config.batchSize ?? 50,
      retries: config.retries ?? 3,
    };
  }

  /**
   * Проверка доступности сервиса
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(`${this.config.apiUrl}/health`, {
        method: 'GET',
      });

      if (!response.ok) {
        return false;
      }

      const data = (await response.json()) as { status: string };
      return data.status === 'healthy';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Анализ одного текста
   */
  async analyze(text: string, type?: 'news' | 'social' | 'other'): Promise<SentimentResult> {
    const request: AnalyzeRequest = { text, type };

    try {
      const response = await this.fetchWithRetry(`${this.config.apiUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as AnalyzeResponse;

      return this.mapResponse(data);
    } catch (error) {
      console.error('Failed to analyze text:', error);
      throw error;
    }
  }

  /**
   * Батч-анализ нескольких текстов
   */
  async analyzeBatch(
    texts: Array<{ text: string; type?: 'news' | 'social' | 'other' }>
  ): Promise<BatchAnalysisResult> {
    if (texts.length === 0) {
      return {
        total: 0,
        success: 0,
        failed: 0,
        results: [],
        errors: [],
      };
    }

    // Разбиваем на батчи
    const batches: Array<typeof texts> = [];
    for (let i = 0; i < texts.length; i += this.config.batchSize) {
      batches.push(texts.slice(i, i + this.config.batchSize));
    }

    const allResults: SentimentResult[] = [];
    const allErrors: string[] = [];
    let successCount = 0;
    let failedCount = 0;

    // Обрабатываем батчи последовательно
    for (const batch of batches) {
      try {
        const requests = batch.map((item) => ({
          text: item.text,
          type: item.type || 'news',
        }));

        const response = await this.fetchWithRetry(`${this.config.apiUrl}/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requests),
        });

        if (!response.ok) {
          const error = (await response.json().catch(() => ({}))) as { detail?: string };
          throw new Error(error.detail || `HTTP ${response.status}`);
        }

        const data = (await response.json()) as AnalyzeResponse[];

        for (const item of data) {
          try {
            allResults.push(this.mapResponse(item));
            successCount++;
          } catch (error) {
            allErrors.push(error instanceof Error ? error.message : 'Unknown error');
            failedCount++;
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        allErrors.push(`Batch failed: ${errorMsg}`);
        failedCount += batch.length;
      }
    }

    return {
      total: texts.length,
      success: successCount,
      failed: failedCount,
      results: allResults,
      errors: allErrors,
    };
  }

  /**
   * Маппинг ответа API на внутренний формат
   */
  private mapResponse(data: AnalyzeResponse): SentimentResult {
    return {
      sentiment: data.sentiment,
      confidence: data.confidence,
      label: data.label as SentimentLabel,
      entities: data.entities.map((e) => ({
        text: e.text,
        type: e.type as EntityInfo['type'],
        start: e.start,
        end: e.end,
      })),
      impact: data.impact as ImpactLevel,
      keywords: data.keywords,
    };
  }

  /**
   * Fetch с таймаутом
   */
  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch с повторными попытками
   */
  private async fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retries; attempt++) {
      try {
        return await this.fetchWithTimeout(url, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Не повторяем, если это AbortError (таймаут)
        if (lastError.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.config.timeout}ms`);
        }

        // Ждем перед следующей попыткой (exponential backoff)
        if (attempt < this.config.retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Получение конфигурации
   */
  getConfig(): Required<SentimentAnalyzerConfig> {
    return { ...this.config };
  }

  /**
   * Обновление конфигурации
   */
  updateConfig(config: Partial<SentimentAnalyzerConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }
}
