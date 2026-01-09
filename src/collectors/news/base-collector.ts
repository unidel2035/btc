import { NewsItem, INewsCollector } from '../../types/news';
import { v4 as uuidv4 } from 'uuid';

/**
 * Abstract base class for news collectors
 */
export abstract class BaseNewsCollector implements INewsCollector {
  public abstract readonly source: string;
  protected debug: boolean;

  constructor(debug = false) {
    this.debug = debug;
  }

  /**
   * Collect news from the source
   */
  abstract collect(): Promise<NewsItem[]>;

  /**
   * Create a NewsItem with default values
   */
  protected createNewsItem(data: {
    title: string;
    content: string;
    url: string;
    publishedAt: Date;
    tags?: string[];
  }): NewsItem {
    return {
      id: uuidv4(),
      source: this.source,
      title: data.title.trim(),
      content: data.content.trim(),
      url: data.url,
      publishedAt: data.publishedAt,
      collectedAt: new Date(),
      tags: data.tags || [],
      sentiment: undefined,
    };
  }

  /**
   * Log debug messages
   */
  protected log(message: string, ...args: unknown[]): void {
    if (this.debug) {
      console.log(`[${this.source}] ${message}`, ...args);
    }
  }

  /**
   * Log error messages
   */
  protected error(message: string, error?: unknown): void {
    console.error(`[${this.source}] ERROR: ${message}`, error);
  }

  /**
   * Extract tags from content
   */
  protected extractTags(text: string): string[] {
    const cryptoKeywords = [
      'bitcoin',
      'btc',
      'ethereum',
      'eth',
      'crypto',
      'blockchain',
      'defi',
      'nft',
      'mining',
      'trading',
      'market',
      'price',
      'regulation',
      'sec',
      'etf',
    ];

    const lowerText = text.toLowerCase();
    return cryptoKeywords.filter((keyword) => lowerText.includes(keyword));
  }
}
