/**
 * Социальная платформа
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
  platform: 'twitter' | 'reddit' | 'telegram';
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
  accounts?: string[]; // Аккаунты для отслеживания
  hashtags?: string[]; // Хештеги для мониторинга
  maxResults?: number; // Максимум результатов за запрос
  pollInterval?: number; // Интервал опроса в миллисекундах
}

/**
 * Конфигурация Reddit коллектора
 */
export interface RedditConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  subreddits: string[]; // Список subreddits для мониторинга
  sortBy?: 'hot' | 'new' | 'top' | 'rising';
  maxResults?: number;
  pollInterval?: number;
}

/**
 * Конфигурация Telegram коллектора
 */
export interface TelegramConfig {
  apiId: number;
  apiHash: string;
  sessionString?: string;
  channels: string[]; // Список каналов для мониторинга
  pollInterval?: number;
}

/**
 * Опции дедупликации для социальных постов
 */
export interface SocialDeduplicationOptions {
  checkId: boolean;
  checkContent: boolean;
  similarityThreshold?: number; // 0-1 для проверки схожести контента
}

/**
 * Callback для обработки собранных постов
 */
export type PostCallback = (posts: SocialPost[]) => void | Promise<void>;

/**
 * Callback для обработки ошибок
 */
export type ErrorCallback = (error: Error, platform: SocialPlatform) => void | Promise<void>;

/**
 * Статистика работы коллектора
 */
export interface CollectorStats {
  platform: SocialPlatform;
  totalPosts: number;
  successfulCollections: number;
  failedCollections: number;
  lastCollectionAt?: Date;
  isRunning: boolean;
}
