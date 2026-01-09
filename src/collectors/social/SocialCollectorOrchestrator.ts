import type {
  SocialPost,
  TwitterConfig,
  RedditConfig,
  TelegramConfig,
  PostCallback,
  ErrorCallback,
  CollectorStats,
} from './types.js';
import { SocialPlatform } from './types.js';
import { TwitterCollector } from './twitter/TwitterCollector.js';
import { RedditCollector } from './reddit/RedditCollector.js';
import { TelegramCollector } from './telegram/TelegramCollector.js';

/**
 * Конфигурация оркестратора
 */
export interface OrchestratorConfig {
  twitter?: TwitterConfig;
  reddit?: RedditConfig;
  telegram?: TelegramConfig;
  enableTwitter?: boolean;
  enableReddit?: boolean;
  enableTelegram?: boolean;
}

/**
 * Оркестратор для централизованного управления всеми социальными коллекторами
 */
export class SocialCollectorOrchestrator {
  private twitterCollector?: TwitterCollector;
  private redditCollector?: RedditCollector;
  private telegramCollector?: TelegramCollector;

  private postCallbacks: PostCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];

  private stats: Map<SocialPlatform, CollectorStats>;

  constructor(config: OrchestratorConfig) {
    this.stats = new Map();

    // Инициализация Twitter коллектора
    if (config.enableTwitter && config.twitter) {
      this.twitterCollector = new TwitterCollector(config.twitter);
      this.initializeStats(SocialPlatform.TWITTER);
      console.info('[Orchestrator] Twitter collector registered');
    }

    // Инициализация Reddit коллектора
    if (config.enableReddit && config.reddit) {
      this.redditCollector = new RedditCollector(config.reddit);
      this.initializeStats(SocialPlatform.REDDIT);
      console.info('[Orchestrator] Reddit collector registered');
    }

    // Инициализация Telegram коллектора
    if (config.enableTelegram && config.telegram) {
      this.telegramCollector = new TelegramCollector(config.telegram);
      this.initializeStats(SocialPlatform.TELEGRAM);
      console.info('[Orchestrator] Telegram collector registered');
    }
  }

  /**
   * Инициализация статистики для платформы
   */
  private initializeStats(platform: SocialPlatform): void {
    this.stats.set(platform, {
      platform,
      totalPosts: 0,
      successfulCollections: 0,
      failedCollections: 0,
      isRunning: false,
    });
  }

  /**
   * Регистрация callback для обработки постов
   */
  onPosts(callback: PostCallback): void {
    this.postCallbacks.push(callback);
  }

  /**
   * Регистрация callback для обработки ошибок
   */
  onError(callback: ErrorCallback): void {
    this.errorCallbacks.push(callback);
  }

  /**
   * Инициализация всех коллекторов (для тех, кто требует async init)
   */
  async initialize(): Promise<void> {
    console.info('[Orchestrator] Initializing collectors...');

    const initPromises: Promise<void>[] = [];

    // Telegram требует инициализации
    if (this.telegramCollector) {
      initPromises.push(
        this.telegramCollector.initialize().catch((error) => {
          console.error('[Orchestrator] Failed to initialize Telegram:', error);
          this.telegramCollector = undefined;
        }),
      );
    }

    await Promise.all(initPromises);

    console.info('[Orchestrator] All collectors initialized');
  }

  /**
   * Однократный сбор данных со всех платформ
   */
  async collectAll(): Promise<void> {
    console.info('[Orchestrator] Starting collection from all platforms...');

    const collectPromises: Promise<void>[] = [];

    // Twitter
    if (this.twitterCollector) {
      collectPromises.push(this.runCollector(SocialPlatform.TWITTER, this.twitterCollector));
    }

    // Reddit
    if (this.redditCollector) {
      collectPromises.push(this.runCollector(SocialPlatform.REDDIT, this.redditCollector));
    }

    // Telegram
    if (this.telegramCollector) {
      collectPromises.push(this.runCollector(SocialPlatform.TELEGRAM, this.telegramCollector));
    }

    await Promise.all(collectPromises);

    console.info('[Orchestrator] Collection completed from all platforms');
  }

  /**
   * Запуск конкретного коллектора
   */
  private async runCollector(
    platform: SocialPlatform,
    collector: TwitterCollector | RedditCollector | TelegramCollector,
  ): Promise<void> {
    const stats = this.stats.get(platform);
    if (!stats) return;

    stats.isRunning = true;

    try {
      const result = await collector.run(async (posts) => {
        // Обновление статистики
        stats.totalPosts += posts.length;

        // Вызов всех зарегистрированных callbacks
        for (const callback of this.postCallbacks) {
          try {
            await callback(posts);
          } catch (error) {
            console.error(`[Orchestrator] Post callback error for ${platform}:`, error);
          }
        }
      });

      if (result.success) {
        stats.successfulCollections++;
      } else {
        stats.failedCollections++;

        // Вызов error callbacks
        if (result.errors && result.errors.length > 0) {
          const error = new Error(result.errors.join('; '));
          for (const callback of this.errorCallbacks) {
            try {
              await callback(error, platform);
            } catch (err) {
              console.error(`[Orchestrator] Error callback error for ${platform}:`, err);
            }
          }
        }
      }

      stats.lastCollectionAt = result.collectedAt;
    } catch (error) {
      stats.failedCollections++;
      console.error(`[Orchestrator] Collector error for ${platform}:`, error);

      // Вызов error callbacks
      for (const callback of this.errorCallbacks) {
        try {
          await callback(error as Error, platform);
        } catch (err) {
          console.error(`[Orchestrator] Error callback error for ${platform}:`, err);
        }
      }
    } finally {
      stats.isRunning = false;
    }
  }

  /**
   * Запуск периодического опроса всех коллекторов
   */
  startPolling(): void {
    console.info('[Orchestrator] Starting polling for all collectors...');

    // Обертка для callbacks
    const postsHandler = async (posts: SocialPost[]): Promise<void> => {
      for (const callback of this.postCallbacks) {
        try {
          await callback(posts);
        } catch (error) {
          console.error('[Orchestrator] Post callback error:', error);
        }
      }
    };

    // Запуск каждого коллектора
    if (this.twitterCollector) {
      this.twitterCollector.startPolling(postsHandler);
      const stats = this.stats.get(SocialPlatform.TWITTER);
      if (stats) stats.isRunning = true;
    }

    if (this.redditCollector) {
      this.redditCollector.startPolling(postsHandler);
      const stats = this.stats.get(SocialPlatform.REDDIT);
      if (stats) stats.isRunning = true;
    }

    if (this.telegramCollector) {
      this.telegramCollector.startPolling(postsHandler);
      const stats = this.stats.get(SocialPlatform.TELEGRAM);
      if (stats) stats.isRunning = true;
    }

    console.info('[Orchestrator] All collectors are polling');
  }

  /**
   * Остановка всех коллекторов
   */
  stopPolling(): void {
    console.info('[Orchestrator] Stopping all collectors...');

    if (this.twitterCollector) {
      this.twitterCollector.stopPolling();
      const stats = this.stats.get(SocialPlatform.TWITTER);
      if (stats) stats.isRunning = false;
    }

    if (this.redditCollector) {
      this.redditCollector.stopPolling();
      const stats = this.stats.get(SocialPlatform.REDDIT);
      if (stats) stats.isRunning = false;
    }

    if (this.telegramCollector) {
      this.telegramCollector.stopPolling();
      const stats = this.stats.get(SocialPlatform.TELEGRAM);
      if (stats) stats.isRunning = false;
    }

    console.info('[Orchestrator] All collectors stopped');
  }

  /**
   * Graceful shutdown
   */
  async cleanup(): Promise<void> {
    console.info('[Orchestrator] Cleaning up...');

    this.stopPolling();

    // Telegram требует cleanup
    if (this.telegramCollector) {
      await this.telegramCollector.cleanup();
    }

    console.info('[Orchestrator] Cleanup completed');
  }

  /**
   * Очистка кеша всех коллекторов
   */
  clearAllCaches(): void {
    console.info('[Orchestrator] Clearing all caches...');

    if (this.twitterCollector) {
      this.twitterCollector.clearCache();
    }

    if (this.redditCollector) {
      this.redditCollector.clearCache();
    }

    if (this.telegramCollector) {
      this.telegramCollector.clearCache();
    }

    console.info('[Orchestrator] All caches cleared');
  }

  /**
   * Получение статистики по всем коллекторам
   */
  getStats(): Map<SocialPlatform, CollectorStats> {
    return new Map(this.stats);
  }

  /**
   * Получение статистики конкретного коллектора
   */
  getCollectorStats(platform: SocialPlatform): CollectorStats | undefined {
    return this.stats.get(platform);
  }

  /**
   * Проверка, активен ли хотя бы один коллектор
   */
  isAnyCollectorRunning(): boolean {
    for (const stats of this.stats.values()) {
      if (stats.isRunning) {
        return true;
      }
    }
    return false;
  }
}
