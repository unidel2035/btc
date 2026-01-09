/**
 * Структура новости
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
 * Источник новостей
 */
export enum NewsSource {
  COINDESK = 'coindesk',
  COINTELEGRAPH = 'cointelegraph',
  THE_BLOCK = 'theblock',
  CRYPTONEWS = 'cryptonews',
  BITCOIN_MAGAZINE = 'bitcoin_magazine',
  DECRYPT = 'decrypt',
}

/**
 * Тип коллектора новостей
 */
export enum CollectorType {
  RSS = 'rss',
  SCRAPER = 'scraper',
}

/**
 * Конфигурация источника новостей
 */
export interface NewsSourceConfig {
  name: NewsSource;
  type: CollectorType;
  url: string;
  enabled: boolean;
  updateInterval: number; // в минутах
  selector?: string; // CSS селектор для скрапера
  tags?: string[];
}

/**
 * Результат сбора новостей
 */
export interface CollectionResult {
  source: NewsSource;
  success: boolean;
  newsCount: number;
  duplicatesSkipped: number;
  errors?: string[];
  collectedAt: Date;
}

/**
 * Опции дедупликации
 */
export interface DeduplicationOptions {
  checkUrl: boolean;
  checkTitle: boolean;
  similarityThreshold?: number; // 0-1 для проверки схожести заголовков
}
