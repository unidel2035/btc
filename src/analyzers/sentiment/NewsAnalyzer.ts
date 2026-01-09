/**
 * News Sentiment Analyzer
 *
 * Integrates sentiment analysis with news collection
 */
import { SentimentClient } from './client/SentimentClient';
import type { SentimentResult } from './types';
import type { NewsItem } from '../../collectors/news/types';

/**
 * Options for news sentiment analysis
 */
export interface NewsAnalyzerOptions {
  sentimentApiUrl?: string;
  batchSize?: number;
  timeout?: number;
  enableCaching?: boolean;
}

/**
 * Analyzer for news sentiment
 */
export class NewsAnalyzer {
  private client: SentimentClient;
  private batchSize: number;
  private cache: Map<string, SentimentResult>;
  private enableCaching: boolean;

  constructor(options: NewsAnalyzerOptions = {}) {
    const apiUrl = options.sentimentApiUrl || process.env.SENTIMENT_API_URL || 'http://localhost:8000';

    this.client = new SentimentClient({
      baseUrl: apiUrl,
      timeout: options.timeout || 30000,
      retries: 3,
    });

    this.batchSize = options.batchSize || 10;
    this.enableCaching = options.enableCaching !== false;
    this.cache = new Map();
  }

  /**
   * Check if sentiment service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const health = await this.client.health();
      return health.models_loaded;
    } catch (error) {
      return false;
    }
  }

  /**
   * Wait for sentiment service to be ready
   */
  async waitForReady(maxWaitMs: number = 60000): Promise<void> {
    await this.client.waitForReady(maxWaitMs);
  }

  /**
   * Analyze sentiment of a single news item
   */
  async analyzeNewsItem(newsItem: NewsItem): Promise<NewsItem> {
    // Check cache first
    if (this.enableCaching && this.cache.has(newsItem.url)) {
      const cachedResult = this.cache.get(newsItem.url)!;
      return this.mergeResults(newsItem, cachedResult);
    }

    try {
      // Combine title and content for analysis
      const text = `${newsItem.title}. ${newsItem.content}`;

      // Analyze
      const result = await this.client.analyze(text, 'news');

      // Cache the result
      if (this.enableCaching) {
        this.cache.set(newsItem.url, result);
      }

      return this.mergeResults(newsItem, result);
    } catch (error) {
      console.error(`Failed to analyze news item ${newsItem.id}:`, error);
      // Return original item if analysis fails
      return newsItem;
    }
  }

  /**
   * Analyze sentiment of multiple news items in batch
   */
  async analyzeNewsItems(newsItems: NewsItem[]): Promise<NewsItem[]> {
    const results: NewsItem[] = [];

    // Process in batches
    for (let i = 0; i < newsItems.length; i += this.batchSize) {
      const batch = newsItems.slice(i, i + this.batchSize);

      try {
        // Separate cached and non-cached items
        const uncachedItems: NewsItem[] = [];
        const uncachedTexts: string[] = [];

        for (const item of batch) {
          if (this.enableCaching && this.cache.has(item.url)) {
            const cachedResult = this.cache.get(item.url)!;
            results.push(this.mergeResults(item, cachedResult));
          } else {
            uncachedItems.push(item);
            uncachedTexts.push(`${item.title}. ${item.content}`);
          }
        }

        // Analyze uncached items in batch
        if (uncachedItems.length > 0) {
          const batchResults = await this.client.analyzeBatch(uncachedTexts, 'news');

          for (let j = 0; j < uncachedItems.length; j++) {
            const item = uncachedItems[j];
            const result = batchResults.results[j];

            // Ensure both item and result exist
            if (item && result) {
              // Cache the result
              if (this.enableCaching) {
                this.cache.set(item.url, result);
              }

              results.push(this.mergeResults(item, result));
            }
          }
        }
      } catch (error) {
        console.error(`Failed to analyze batch starting at index ${i}:`, error);
        // Add original items if batch analysis fails
        results.push(...batch);
      }
    }

    return results;
  }

  /**
   * Clear the sentiment cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: Infinity, // No limit currently
    };
  }

  /**
   * Merge sentiment results into news item
   */
  private mergeResults(newsItem: NewsItem, sentimentResult: SentimentResult): NewsItem {
    return {
      ...newsItem,
      sentiment: sentimentResult.sentiment,
      // Add optional metadata
      sentimentData: {
        confidence: sentimentResult.confidence,
        label: sentimentResult.label,
        entities: sentimentResult.entities,
        impact: sentimentResult.impact,
        keywords: sentimentResult.keywords,
      },
    };
  }
}

/**
 * Create a news analyzer with default configuration
 */
export function createNewsAnalyzer(options?: NewsAnalyzerOptions): NewsAnalyzer {
  return new NewsAnalyzer(options);
}
