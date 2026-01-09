/**
 * Типы данных для модуля мониторинга социальных сетей
 */

/**
 * Платформы социальных сетей
 */
export type SocialPlatform = 'twitter' | 'reddit' | 'telegram' | 'discord';

/**
 * Статистика вовлеченности пользователей
 */
export interface Engagement {
  /** Количество лайков/upvotes */
  likes: number;
  /** Количество комментариев/ответов */
  comments: number;
  /** Количество репостов/shares */
  shares: number;
  /** Количество просмотров (если доступно) */
  views?: number;
}

/**
 * Базовый интерфейс для поста в социальных сетях
 */
export interface SocialPost {
  /** Уникальный идентификатор поста */
  id: string;
  /** Платформа, откуда получен пост */
  platform: SocialPlatform;
  /** Автор поста */
  author: string;
  /** Количество подписчиков автора (если доступно) */
  authorFollowers?: number;
  /** Содержание поста */
  content: string;
  /** Статистика вовлеченности */
  engagement: Engagement;
  /** Временная метка создания поста */
  timestamp: Date;
  /** URL поста */
  url: string;
  /** Хештеги (если есть) */
  hashtags?: string[];
  /** Упоминания (если есть) */
  mentions?: string[];
  /** Медиа-файлы (если есть) */
  media?: MediaAttachment[];
}

/**
 * Медиа-вложение
 */
export interface MediaAttachment {
  /** Тип медиа */
  type: 'image' | 'video' | 'gif';
  /** URL медиа-файла */
  url: string;
  /** Предпросмотр (thumbnail) */
  thumbnail?: string;
}

/**
 * Настройки коллектора для Twitter/X
 */
export interface TwitterCollectorConfig {
  /** Bearer токен для Twitter API v2 */
  bearerToken: string;
  /** Список аккаунтов для отслеживания */
  accounts: string[];
  /** Список хештегов для отслеживания */
  hashtags: string[];
  /** Максимальное количество постов за один запрос */
  maxResults?: number;
  /** Интервал между запросами (мс) */
  pollInterval?: number;
}

/**
 * Настройки коллектора для Reddit
 */
export interface RedditCollectorConfig {
  /** Client ID приложения Reddit */
  clientId: string;
  /** Client Secret приложения Reddit */
  clientSecret: string;
  /** User Agent для запросов */
  userAgent: string;
  /** Список subreddit'ов для мониторинга */
  subreddits: string[];
  /** Тип сортировки постов */
  sortBy?: 'hot' | 'new' | 'top' | 'rising';
  /** Временной период для "top" сортировки */
  timeFilter?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  /** Максимальное количество постов за один запрос */
  limit?: number;
  /** Интервал между запросами (мс) */
  pollInterval?: number;
}

/**
 * Настройки коллектора для Telegram
 */
export interface TelegramCollectorConfig {
  /** Bot токен для Telegram Bot API */
  botToken: string;
  /** Список публичных каналов для мониторинга (username или ID) */
  channels: string[];
  /** Интервал между запросами (мс) */
  pollInterval?: number;
}

/**
 * Настройки коллектора для Discord
 */
export interface DiscordCollectorConfig {
  /** Bot токен для Discord Bot API */
  botToken: string;
  /** Список ID каналов для мониторинга */
  channelIds: string[];
  /** ID гильдий (серверов) для мониторинга */
  guildIds?: string[];
}

/**
 * Объединенные настройки для всех коллекторов
 */
export interface SocialCollectorConfig {
  twitter?: TwitterCollectorConfig;
  reddit?: RedditCollectorConfig;
  telegram?: TelegramCollectorConfig;
  discord?: DiscordCollectorConfig;
  /** Включить/выключить коллекторы */
  enabled: {
    twitter: boolean;
    reddit: boolean;
    telegram: boolean;
    discord: boolean;
  };
}

/**
 * Результат сбора данных
 */
export interface CollectionResult {
  /** Платформа */
  platform: SocialPlatform;
  /** Собранные посты */
  posts: SocialPost[];
  /** Временная метка сбора */
  collectedAt: Date;
  /** Количество собранных постов */
  count: number;
  /** Ошибки при сборе (если были) */
  errors?: Error[];
}

/**
 * Статистика коллектора
 */
export interface CollectorStats {
  /** Платформа */
  platform: SocialPlatform;
  /** Всего собрано постов */
  totalPosts: number;
  /** Количество успешных запросов */
  successfulRequests: number;
  /** Количество неудачных запросов */
  failedRequests: number;
  /** Время последнего успешного сбора */
  lastSuccessfulCollection?: Date;
  /** Последняя ошибка */
  lastError?: Error;
}
