/**
 * Оркестратор для управления всеми социальными коллекторами
 */

import { TwitterCollector } from './twitter/TwitterCollector.js';
import { RedditCollector } from './reddit/RedditCollector.js';
import { TelegramCollector } from './telegram/TelegramCollector.js';
import type {
  SocialPost,
  SocialOrchestratorConfig,
  PostCallback,
  ErrorCallback,
  CollectorStats,
  SocialPlatform,
} from './types.js';
import { SocialPlatform as Platform } from './types.js';
import { Logger } from './utils/logger.js';

export class SocialCollectorOrchestrator {
  private config: SocialOrchestratorConfig;
  private logger: Logger;
  private collectors: Map<SocialPlatform, any>;
  private stats: Map<SocialPlatform, CollectorStats>;
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;
  private postCallback?: PostCallback;
  private errorCallback?: ErrorCallback;

  constructor(config: SocialOrchestratorConfig) {
    this.config = config;
    this.logger = new Logger('SocialOrchestrator');
    this.collectors = new Map();
    this.stats = new Map();
  }

  /**
   * Регистрация коллекторов на основе конфигурации
   */
  registerCollectors(): void {
    this.logger.info('Registering collectors...');

    if (this.config.twitter) {
      const twitterCollector = new TwitterCollector(this.config.twitter);
      this.collectors.set(Platform.TWITTER, twitterCollector);
      this.stats.set(Platform.TWITTER, {
        platform: Platform.TWITTER,
        totalPosts: 0,
        totalErrors: 0,
        isRunning: false,
      });
      this.logger.info('Twitter collector registered');
    }

    if (this.config.reddit) {
      const redditCollector = new RedditCollector(this.config.reddit);
      this.collectors.set(Platform.REDDIT, redditCollector);
      this.stats.set(Platform.REDDIT, {
        platform: Platform.REDDIT,
        totalPosts: 0,
        totalErrors: 0,
        isRunning: false,
      });
      this.logger.info('Reddit collector registered');
    }

    if (this.config.telegram) {
      const telegramCollector = new TelegramCollector(this.config.telegram);
      this.collectors.set(Platform.TELEGRAM, telegramCollector);
      this.stats.set(Platform.TELEGRAM, {
        platform: Platform.TELEGRAM,
        totalPosts: 0,
        totalErrors: 0,
        isRunning: false,
      });
      this.logger.info('Telegram collector registered');
    }

    this.logger.info(`Registered ${this.collectors.size} collectors`);
  }

  /**
   * Установка callback для обработки собранных постов
   */
  onPostsCollected(callback: PostCallback): void {
    this.postCallback = callback;
  }

  /**
   * Установка callback для обработки ошибок
   */
  onError(callback: ErrorCallback): void {
    this.errorCallback = callback;
  }

  /**
   * Сбор данных со всех зарегистрированных коллекторов
   */
  async collectAll(): Promise<SocialPost[]> {
    this.logger.info('Starting collection from all platforms...');

    const allPosts: SocialPost[] = [];
    const promises: Promise<void>[] = [];

    for (const [platform, collector] of this.collectors.entries()) {
      const collectionPromise = (async () => {
        const stats = this.stats.get(platform);
        if (!stats) return;

        stats.isRunning = true;

        try {
          this.logger.info(`Collecting from ${platform}...`);
          const posts = await collector.collect();

          stats.totalPosts += posts.length;
          stats.lastCollectionAt = new Date();
          stats.isRunning = false;

          allPosts.push(...posts);
          this.logger.info(`Collected ${posts.length} posts from ${platform}`);

          // Вызов callback для обработки постов
          if (this.postCallback && posts.length > 0) {
            await this.postCallback(posts);
          }
        } catch (error) {
          stats.totalErrors += 1;
          stats.isRunning = false;

          const err = error instanceof Error ? error : new Error(String(error));
          this.logger.error(`Failed to collect from ${platform}: ${err.message}`);

          // Вызов callback для обработки ошибок
          if (this.errorCallback) {
            await this.errorCallback(platform, err);
          }
        }
      })();

      promises.push(collectionPromise);
    }

    // Ждем завершения всех коллекторов
    await Promise.all(promises);

    this.logger.info(`Collection complete: ${allPosts.length} total posts from all platforms`);
    return allPosts;
  }

  /**
   * Запуск периодического сбора данных
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('Orchestrator is already running');
      return;
    }

    const pollInterval = this.config.pollInterval || 5 * 60 * 1000; // По умолчанию 5 минут

    this.logger.info(`Starting orchestrator with ${pollInterval}ms poll interval`);
    this.isRunning = true;

    // Первый сбор сразу
    this.collectAll().catch((error) => {
      this.logger.error(`Initial collection failed: ${error}`);
    });

    // Периодический сбор
    this.intervalId = setInterval(() => {
      this.collectAll().catch((error) => {
        this.logger.error(`Periodic collection failed: ${error}`);
      });
    }, pollInterval);

    this.logger.info('Orchestrator started successfully');
  }

  /**
   * Остановка периодического сбора данных
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Orchestrator is not running');
      return;
    }

    this.logger.info('Stopping orchestrator...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    // Отключаем Telegram клиент, если он был инициализирован
    const telegramCollector = this.collectors.get(Platform.TELEGRAM);
    if (telegramCollector && typeof telegramCollector.disconnect === 'function') {
      await telegramCollector.disconnect();
    }

    this.logger.info('Orchestrator stopped');
  }

  /**
   * Получение статистики всех коллекторов
   */
  getStats(): CollectorStats[] {
    return Array.from(this.stats.values());
  }

  /**
   * Получение статистики конкретного коллектора
   */
  getCollectorStats(platform: SocialPlatform): CollectorStats | undefined {
    return this.stats.get(platform);
  }

  /**
   * Очистка кеша всех коллекторов
   */
  clearAllCaches(): void {
    this.logger.info('Clearing all collector caches...');

    for (const [platform, collector] of this.collectors.entries()) {
      if (typeof collector.clearCache === 'function') {
        collector.clearCache();
        this.logger.info(`Cache cleared for ${platform}`);
      }
    }
  }

  /**
   * Проверка, запущен ли оркестратор
   */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Получение количества зарегистрированных коллекторов
   */
  get collectorsCount(): number {
    return this.collectors.size;
  }
}
