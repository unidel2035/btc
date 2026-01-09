/**
 * Платформа социальной сети
 */
export enum SocialPlatform {
  TWITTER = 'twitter',
  REDDIT = 'reddit',
  TELEGRAM = 'telegram',
}

/**
 * Структура поста из социальной сети
 */
export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  author: string;
  authorFollowers?: number;
  content: string;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
  timestamp: Date;
  url: string;
  collectedAt: Date;
}

/**
 * Результат сбора данных из социальных сетей
 */
export interface SocialCollectionResult {
  platform: SocialPlatform;
  success: boolean;
  postsCount: number;
  duplicatesSkipped: number;
  errors?: string[];
  collectedAt: Date;
}

/**
 * Конфигурация Twitter коллектора
 */
export interface TwitterConfig {
  bearerToken: string;
  accounts?: string[]; // Ключевые аккаунты для отслеживания
  hashtags?: string[]; // Хештеги для мониторинга
  maxResults?: number;
}

/**
 * Конфигурация Reddit коллектора
 */
export interface RedditConfig {
  clientId: string;
  clientSecret: string;
  userAgent: string;
  subreddits?: string[]; // Subreddits для мониторинга
  sortBy?: 'hot' | 'new' | 'top' | 'rising';
  timeFilter?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  limit?: number;
}

/**
 * Конфигурация Telegram коллектора
 */
export interface TelegramConfig {
  apiId: string;
  apiHash: string;
  sessionString?: string;
  channels?: string[]; // Публичные каналы для мониторинга
  limit?: number;
}

/**
 * Конфигурация оркестратора социальных коллекторов
 */
export interface SocialOrchestratorConfig {
  twitter?: TwitterConfig;
  reddit?: RedditConfig;
  telegram?: TelegramConfig;
  pollInterval?: number; // Интервал опроса в миллисекундах (по умолчанию 5 минут)
}

/**
 * Callback для обработки собранных постов
 */
export type PostCallback = (posts: SocialPost[]) => void | Promise<void>;

/**
 * Callback для обработки ошибок
 */
export type ErrorCallback = (platform: SocialPlatform, error: Error) => void | Promise<void>;

/**
 * Статистика работы коллектора
 */
export interface CollectorStats {
  platform: SocialPlatform;
  totalPosts: number;
  totalErrors: number;
  lastCollectionAt?: Date;
  isRunning: boolean;
}
