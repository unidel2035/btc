import { NewsSource, CollectorType, type NewsSourceConfig } from './types.js';

/**
 * Конфигурация источников новостей
 */
export const NEWS_SOURCES: NewsSourceConfig[] = [
  // RSS источники
  {
    name: NewsSource.COINDESK,
    type: CollectorType.RSS,
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
    enabled: true,
    updateInterval: 5,
    tags: ['bitcoin', 'crypto', 'news'],
  },
  {
    name: NewsSource.BITCOIN_MAGAZINE,
    type: CollectorType.RSS,
    url: 'https://bitcoinmagazine.com/.rss/full/',
    enabled: true,
    updateInterval: 5,
    tags: ['bitcoin', 'magazine'],
  },
  {
    name: NewsSource.DECRYPT,
    type: CollectorType.RSS,
    url: 'https://decrypt.co/feed',
    enabled: true,
    updateInterval: 5,
    tags: ['crypto', 'web3', 'news'],
  },

  // Web Scraper источники
  {
    name: NewsSource.COINTELEGRAPH,
    type: CollectorType.SCRAPER,
    url: 'https://cointelegraph.com/tags/bitcoin',
    enabled: true,
    updateInterval: 5,
    selector: 'article.post-card',
    tags: ['bitcoin', 'crypto'],
  },
  {
    name: NewsSource.THE_BLOCK,
    type: CollectorType.SCRAPER,
    url: 'https://www.theblock.co/latest',
    enabled: true,
    updateInterval: 5,
    selector: 'article',
    tags: ['crypto', 'blockchain'],
  },
  {
    name: NewsSource.CRYPTONEWS,
    type: CollectorType.SCRAPER,
    url: 'https://cryptonews.com/',
    enabled: true,
    updateInterval: 5,
    selector: 'article.article',
    tags: ['crypto', 'news'],
  },
];

/**
 * Селекторы для веб-скрапинга по источникам
 */
export const SCRAPER_SELECTORS = {
  [NewsSource.COINTELEGRAPH]: {
    article: 'article.post-card',
    title: '.post-card__title',
    content: '.post-card__text',
    link: 'a.post-card__link',
    date: '.post-card__date',
  },
  [NewsSource.THE_BLOCK]: {
    article: 'article.articleCard',
    title: 'h2.headline',
    content: '.summary',
    link: 'a',
    date: 'time',
  },
  [NewsSource.CRYPTONEWS]: {
    article: 'article.article',
    title: '.article__title',
    content: '.article__excerpt',
    link: 'a.article__link',
    date: '.article__date',
  },
};

/**
 * Получить конфигурацию источника по имени
 */
export function getSourceConfig(source: NewsSource): NewsSourceConfig | undefined {
  return NEWS_SOURCES.find((s) => s.name === source);
}

/**
 * Получить все активные источники
 */
export function getEnabledSources(): NewsSourceConfig[] {
  return NEWS_SOURCES.filter((s) => s.enabled);
}

/**
 * Получить источники по типу коллектора
 */
export function getSourcesByType(type: CollectorType): NewsSourceConfig[] {
  return NEWS_SOURCES.filter((s) => s.enabled && s.type === type);
}
