/**
 * Sentiment metadata for news
 */
export interface SentimentData {
  confidence: number;
  label: 'positive' | 'negative' | 'neutral';
  entities: string[];
  impact: 'low' | 'medium' | 'high';
  keywords: string[];
}

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
  sentiment?: number; // -1 to 1 sentiment score
  sentimentData?: SentimentData; // Detailed sentiment analysis
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
