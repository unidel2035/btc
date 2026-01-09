/**
 * TypeScript client for Sentiment Analysis API
 */
import type {
  SentimentResult,
  AnalyzeRequest,
  BatchAnalyzeRequest,
  BatchAnalyzeResponse,
  HealthStatus,
  SentimentServiceConfig,
  SentimentError,
} from '../types';

/**
 * Client for communicating with the sentiment analysis service
 */
export class SentimentClient {
  private baseUrl: string;
  private timeout: number;
  private retries: number;

  constructor(config: SentimentServiceConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = config.timeout || 30000; // Default 30s
    this.retries = config.retries || 3;
  }

  /**
   * Check if service is healthy and ready
   */
  async health(): Promise<HealthStatus> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/health`);

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    return (await response.json()) as HealthStatus;
  }

  /**
   * Analyze sentiment of a single text
   */
  async analyze(text: string, type: 'news' | 'social' | 'article' = 'news'): Promise<SentimentResult> {
    const request: AnalyzeRequest = { text, type };

    const response = await this.fetchWithRetry(`${this.baseUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = (await response.json()) as SentimentError;
      throw new Error(`Sentiment analysis failed: ${error.detail}`);
    }

    return (await response.json()) as SentimentResult;
  }

  /**
   * Analyze sentiment of multiple texts in batch
   */
  async analyzeBatch(
    texts: string[],
    type: 'news' | 'social' | 'article' = 'news'
  ): Promise<BatchAnalyzeResponse> {
    const request: BatchAnalyzeRequest = { texts, type };

    const response = await this.fetchWithRetry(`${this.baseUrl}/analyze/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = (await response.json()) as SentimentError;
      throw new Error(`Batch sentiment analysis failed: ${error.detail}`);
    }

    return (await response.json()) as BatchAnalyzeResponse;
  }

  /**
   * Wait for service to be ready
   */
  async waitForReady(maxWaitMs: number = 60000, checkIntervalMs: number = 2000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const health = await this.health();
        if (health.models_loaded) {
          return;
        }
      } catch (error) {
        // Service not ready yet, continue waiting
      }

      await new Promise((resolve) => setTimeout(resolve, checkIntervalMs));
    }

    throw new Error('Sentiment analysis service did not become ready in time');
  }

  /**
   * Fetch with automatic retries
   */
  private async fetchWithRetry(url: string, options?: RequestInit): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        lastError = error as Error;

        // Don't retry if it's not a network error
        if (error instanceof Error && !error.message.includes('fetch')) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.retries - 1) {
          const waitMs = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
      }
    }

    throw lastError || new Error('Failed to fetch after retries');
  }
}

/**
 * Create a sentiment client with default configuration
 */
export function createSentimentClient(baseUrl?: string): SentimentClient {
  const url = baseUrl || process.env.SENTIMENT_API_URL || 'http://localhost:8000';

  return new SentimentClient({
    baseUrl: url,
    timeout: 30000,
    retries: 3,
  });
}
