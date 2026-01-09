/**
 * Тип платформы социальной сети
 */
export type SocialPlatform = 'twitter' | 'reddit' | 'telegram' | 'discord';

/**
 * Метрики вовлеченности для социального поста
 */
export interface SocialEngagement {
  likes: number;
  comments: number;
  shares: number;
}

/**
 * Интерфейс социального поста
 */
export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  author: string;
  authorFollowers?: number;
  content: string;
  engagement: SocialEngagement;
  timestamp: Date;
  url: string;
}

/**
 * Настройки для Twitter коллектора
 */
export interface TwitterConfig {
  bearerToken: string;
  accounts: string[];
  hashtags: string[];
  maxResults?: number;
  pollingInterval?: number;
}

/**
 * Настройки для Reddit коллектора
 */
export interface RedditConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  subreddits: string[];
  limit?: number;
  pollingInterval?: number;
}

/**
 * Настройки для Telegram коллектора
 */
export interface TelegramConfig {
  apiId: number;
  apiHash: string;
  channels: string[];
  pollingInterval?: number;
}

/**
 * Общая конфигурация социальных коллекторов
 */
export interface SocialCollectorConfig {
  enabled: boolean;
  twitter?: TwitterConfig;
  reddit?: RedditConfig;
  telegram?: TelegramConfig;
}
