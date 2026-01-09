import {
  ICollector,
  SocialPost,
  CollectionResult,
  CollectorStats,
  SocialPlatform,
} from './types';
import { Logger, createLogger } from './utils/logger';

/**
 * Конфигурация оркестратора
 */
export interface OrchestratorConfig {
  /** Сохранять ли собранные данные */
  persistData?: boolean;

  /** Callback для обработки собранных данных */
  onDataCollected?: (result: CollectionResult) => void | Promise<void>;

  /** Callback для обработки ошибок */
  onError?: (platform: SocialPlatform, error: Error) => void | Promise<void>;
}

/**
 * Оркестратор для управления всеми коллекторами социальных сетей
 */
export class SocialCollectorOrchestrator {
  private collectors: Map<SocialPlatform, ICollector>;
  private config: OrchestratorConfig;
  private logger: Logger;
  private allPosts: SocialPost[];

  constructor(config: OrchestratorConfig = {}) {
    this.collectors = new Map();
    this.config = config;
    this.logger = createLogger('SocialCollectorOrchestrator');
    this.allPosts = [];
  }

  /**
   * Зарегистрировать коллектор
   */
  registerCollector(platform: SocialPlatform, collector: ICollector): void {
    if (this.collectors.has(platform)) {
      this.logger.warn(`Collector for ${platform} already registered. Replacing...`);
    }

    this.collectors.set(platform, collector);
    this.logger.info(`Registered collector for ${platform}`);
  }

  /**
   * Получить коллектор по платформе
   */
  getCollector(platform: SocialPlatform): ICollector | undefined {
    return this.collectors.get(platform);
  }

  /**
   * Инициализировать все коллекторы
   */
  async initializeAll(): Promise<void> {
    this.logger.info('Initializing all collectors...');

    const initPromises = Array.from(this.collectors.entries()).map(
      async ([platform, collector]) => {
        try {
          await collector.initialize();
          this.logger.info(`Initialized ${platform} collector`);
        } catch (error) {
          this.logger.error(`Failed to initialize ${platform} collector`, error);
          throw error;
        }
      }
    );

    await Promise.all(initPromises);
    this.logger.info('All collectors initialized');
  }

  /**
   * Запустить все коллекторы
   */
  async startAll(): Promise<void> {
    this.logger.info('Starting all collectors...');

    for (const [platform, collector] of this.collectors) {
      try {
        if ('start' in collector && typeof collector.start === 'function') {
          await collector.start();
        }
        this.logger.info(`Started ${platform} collector`);
      } catch (error) {
        this.logger.error(`Failed to start ${platform} collector`, error);
        if (this.config.onError) {
          await this.config.onError(platform, error as Error);
        }
      }
    }

    this.logger.info('All collectors started');
  }

  /**
   * Остановить все коллекторы
   */
  async stopAll(): Promise<void> {
    this.logger.info('Stopping all collectors...');

    const stopPromises = Array.from(this.collectors.entries()).map(
      async ([platform, collector]) => {
        try {
          await collector.stop();
          this.logger.info(`Stopped ${platform} collector`);
        } catch (error) {
          this.logger.error(`Failed to stop ${platform} collector`, error);
        }
      }
    );

    await Promise.all(stopPromises);
    this.logger.info('All collectors stopped');
  }

  /**
   * Собрать данные из всех коллекторов
   */
  async collectAll(): Promise<CollectionResult[]> {
    this.logger.info('Collecting data from all collectors...');
    const results: CollectionResult[] = [];

    for (const [platform, collector] of this.collectors) {
      try {
        const posts = await collector.collect();

        const result: CollectionResult = {
          platform,
          posts,
          count: posts.length,
          collectedAt: new Date(),
        };

        results.push(result);

        // Сохранить посты
        if (this.config.persistData) {
          this.allPosts.push(...posts);
        }

        // Вызвать callback
        if (this.config.onDataCollected) {
          await this.config.onDataCollected(result);
        }

        this.logger.info(`Collected ${posts.length} posts from ${platform}`);
      } catch (error) {
        this.logger.error(`Failed to collect from ${platform}`, error);

        const result: CollectionResult = {
          platform,
          posts: [],
          count: 0,
          collectedAt: new Date(),
          errors: [error as Error],
        };

        results.push(result);

        if (this.config.onError) {
          await this.config.onError(platform, error as Error);
        }
      }
    }

    return results;
  }

  /**
   * Получить статистику всех коллекторов
   */
  getStats(): Map<SocialPlatform, CollectorStats> {
    const stats = new Map<SocialPlatform, CollectorStats>();

    for (const [platform, collector] of this.collectors) {
      if ('getStats' in collector && typeof collector.getStats === 'function') {
        stats.set(platform, collector.getStats());
      }
    }

    return stats;
  }

  /**
   * Получить все собранные посты
   */
  getAllPosts(): SocialPost[] {
    return [...this.allPosts];
  }

  /**
   * Получить посты с определенной платформы
   */
  getPostsByPlatform(platform: SocialPlatform): SocialPost[] {
    return this.allPosts.filter(post => post.platform === platform);
  }

  /**
   * Очистить собранные данные
   */
  clearPosts(): void {
    this.allPosts = [];
    this.logger.info('Cleared all collected posts');
  }

  /**
   * Получить количество активных коллекторов
   */
  getActiveCollectorsCount(): number {
    return Array.from(this.collectors.values()).filter(c => c.isRunning()).length;
  }

  /**
   * Получить общее количество собранных постов
   */
  getTotalPostsCount(): number {
    return this.allPosts.length;
  }

  /**
   * Проверить, все ли коллекторы запущены
   */
  areAllRunning(): boolean {
    return Array.from(this.collectors.values()).every(c => c.isRunning());
  }

  /**
   * Получить список зарегистрированных платформ
   */
  getRegisteredPlatforms(): SocialPlatform[] {
    return Array.from(this.collectors.keys());
  }
}
