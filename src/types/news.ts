/**
 * Core news item interface
 */
export interface NewsItem {
  id: string;
  source: string;
  title: string;
  content: string;
  url: string;
  publishedAt: Date;
  collectedAt: Date;
  tags: string[];
  sentiment?: number;
}

/**
 * Source configuration
 */
export interface NewsSource {
  name: string;
  type: 'rss' | 'scraper';
  url: string;
  enabled: boolean;
}

/**
 * Collector statistics
 */
export interface CollectorStats {
  source: string;
  itemsCollected: number;
  itemsStored: number;
  duplicatesSkipped: number;
  errors: number;
  lastRun: Date;
}

/**
 * Base collector interface
 */
export interface INewsCollector {
  source: string;
  collect(): Promise<NewsItem[]>;
}
