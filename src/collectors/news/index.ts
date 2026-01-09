/**
 * Модуль сбора новостей из различных криптовалютных источников
 *
 * @module collectors/news
 */

export { BaseNewsCollector } from './BaseCollector.js';
export { RSSCollector } from './RSSCollector.js';
export { WebScraper } from './WebScraper.js';
export { NewsCollectorManager } from './NewsCollectorManager.js';

export {
  NEWS_SOURCES,
  SCRAPER_SELECTORS,
  getSourceConfig,
  getEnabledSources,
  getSourcesByType,
} from './config.js';

export { InMemoryNewsStorage, NEWS_TABLE_SCHEMA, type NewsStorage } from './storage.js';

export type {
  NewsItem,
  NewsSourceConfig,
  CollectionResult,
  DeduplicationOptions,
} from './types.js';

export { NewsSource, CollectorType } from './types.js';
