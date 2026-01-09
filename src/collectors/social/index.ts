/**
 * Главный модуль для мониторинга социальных сетей
 */

import { TwitterCollector } from './twitter.js';
import { RedditCollector } from './reddit.js';
import { TelegramCollector } from './telegram.js';
import { SocialRateLimiter } from './utils.js';
import type {
  SocialCollectorConfig,
  CollectionResult,
  SocialPost,
  CollectorStats,
  SocialPlatform,
} from './types.js';

/**
 * Главный класс для управления всеми коллекторами социальных сетей
 */
export class SocialCollectorManager {
  private config: SocialCollectorConfig;
  private rateLimiter: SocialRateLimiter;
  private twitterCollector?: TwitterCollector;
  private redditCollector?: RedditCollector;
  private telegramCollector?: TelegramCollector;
  private isRunning: boolean;
  private stats: Map<SocialPlatform, CollectorStats>;

  constructor(config: SocialCollectorConfig) {
    this.config = config;
    this.rateLimiter = new SocialRateLimiter();
    this.isRunning = false;
    this.stats = new Map();

    this.initializeStats();
  }

  /**
   * Инициализирует коллекторы на основе конфигурации
   */
  private async initializeCollectors(): Promise<void> {
    // Twitter
    if (this.config.enabled.twitter && this.config.twitter) {
      this.twitterCollector = new TwitterCollector(this.config.twitter, this.rateLimiter);
      console.info('✅ Twitter collector initialized');
    }

    // Reddit
    if (this.config.enabled.reddit && this.config.reddit) {
      this.redditCollector = new RedditCollector(this.config.reddit, this.rateLimiter);
      console.info('✅ Reddit collector initialized');
    }

    // Telegram
    if (this.config.enabled.telegram && this.config.telegram) {
      this.telegramCollector = new TelegramCollector(this.config.telegram, this.rateLimiter);
      console.info('✅ Telegram collector initialized');
    }

    // Discord можно добавить позже
    if (this.config.enabled.discord && this.config.discord) {
      console.warn('Discord collector not yet implemented');
    }
  }

  /**
   * Инициализирует статистику для всех платформ
   */
  private initializeStats(): void {
    const platforms: SocialPlatform[] = ['twitter', 'reddit', 'telegram', 'discord'];
    for (const platform of platforms) {
      this.stats.set(platform, {
        platform,
        totalPosts: 0,
        successfulRequests: 0,
        failedRequests: 0,
      });
    }
  }

  /**
   * Запускает все активные коллекторы
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Social collectors are already running');
      return;
    }

    console.info('🚀 Starting social collectors...');

    await this.initializeCollectors();

    // Запускаем коллекторы
    const startPromises: Promise<void>[] = [];

    if (this.twitterCollector) {
      startPromises.push(this.twitterCollector.start());
    }

    if (this.redditCollector) {
      startPromises.push(this.redditCollector.start());
    }

    if (this.telegramCollector) {
      startPromises.push(this.telegramCollector.start());
    }

    await Promise.all(startPromises);

    this.isRunning = true;
    console.info('✅ All social collectors started successfully');
  }

  /**
   * Останавливает все коллекторы
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.info('🛑 Stopping social collectors...');

    const stopPromises: Promise<void>[] = [];

    if (this.twitterCollector) {
      this.twitterCollector.stop();
    }

    if (this.redditCollector) {
      this.redditCollector.stop();
    }

    if (this.telegramCollector) {
      stopPromises.push(this.telegramCollector.stop());
    }

    await Promise.all(stopPromises);

    this.isRunning = false;
    console.info('✅ All social collectors stopped');
  }

  /**
   * Собирает данные из всех активных коллекторов
   */
  async collectAll(): Promise<CollectionResult[]> {
    const results: CollectionResult[] = [];

    if (this.twitterCollector) {
      try {
        const result = await this.twitterCollector.collect();
        results.push(result);
        this.updateStats('twitter', result);
      } catch (error) {
        console.error('Error collecting from Twitter:', error);
        this.updateStatsOnError('twitter', error as Error);
      }
    }

    if (this.redditCollector) {
      try {
        const result = await this.redditCollector.collect();
        results.push(result);
        this.updateStats('reddit', result);
      } catch (error) {
        console.error('Error collecting from Reddit:', error);
        this.updateStatsOnError('reddit', error as Error);
      }
    }

    if (this.telegramCollector) {
      try {
        const result = await this.telegramCollector.collect();
        results.push(result);
        this.updateStats('telegram', result);
      } catch (error) {
        console.error('Error collecting from Telegram:', error);
        this.updateStatsOnError('telegram', error as Error);
      }
    }

    return results;
  }

  /**
   * Обновляет статистику после успешного сбора
   */
  private updateStats(platform: SocialPlatform, result: CollectionResult): void {
    const stats = this.stats.get(platform);
    if (stats) {
      stats.totalPosts += result.count;
      stats.successfulRequests += 1;
      stats.lastSuccessfulCollection = result.collectedAt;
      this.stats.set(platform, stats);
    }
  }

  /**
   * Обновляет статистику при ошибке
   */
  private updateStatsOnError(platform: SocialPlatform, error: Error): void {
    const stats = this.stats.get(platform);
    if (stats) {
      stats.failedRequests += 1;
      stats.lastError = error;
      this.stats.set(platform, stats);
    }
  }

  /**
   * Получает статистику по всем коллекторам
   */
  getStats(): CollectorStats[] {
    return Array.from(this.stats.values());
  }

  /**
   * Получает статистику по конкретной платформе
   */
  getStatsByPlatform(platform: SocialPlatform): CollectorStats | undefined {
    return this.stats.get(platform);
  }

  /**
   * Проверяет соединение со всеми API
   */
  async testConnections(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    if (this.twitterCollector) {
      results.twitter = await this.twitterCollector.testConnection();
    }

    if (this.redditCollector) {
      results.reddit = await this.redditCollector.testConnection();
    }

    if (this.telegramCollector) {
      results.telegram = await this.telegramCollector.testConnection();
    }

    return results;
  }

  /**
   * Получает все посты, отфильтрованные по ключевым словам
   */
  async collectFiltered(keywords: string[]): Promise<SocialPost[]> {
    const results = await this.collectAll();
    const allPosts = results.flatMap((result) => result.posts);

    // Фильтруем посты по ключевым словам
    return allPosts.filter((post) => {
      const content = post.content.toLowerCase();
      return keywords.some((keyword) => content.includes(keyword.toLowerCase()));
    });
  }

  /**
   * Получает топ-посты по вовлеченности
   */
  async getTopPosts(limit = 10): Promise<SocialPost[]> {
    const results = await this.collectAll();
    const allPosts = results.flatMap((result) => result.posts);

    // Сортируем по общей вовлеченности
    return allPosts
      .sort((a, b) => {
        const engagementA = a.engagement.likes + a.engagement.comments + a.engagement.shares;
        const engagementB = b.engagement.likes + b.engagement.comments + b.engagement.shares;
        return engagementB - engagementA;
      })
      .slice(0, limit);
  }

  /**
   * Проверяет, запущены ли коллекторы
   */
  get running(): boolean {
    return this.isRunning;
  }
}

// Экспортируем все необходимые типы и классы
export * from './types.js';
export { TwitterCollector } from './twitter.js';
export { RedditCollector } from './reddit.js';
export { TelegramCollector } from './telegram.js';
export { SocialRateLimiter } from './utils.js';
