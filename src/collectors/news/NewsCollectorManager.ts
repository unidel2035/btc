import * as cron from 'node-cron';
import { RSSCollector } from './RSSCollector.js';
import { WebScraper } from './WebScraper.js';
import { SCRAPER_SELECTORS, getEnabledSources } from './config.js';
import { InMemoryNewsStorage, type NewsStorage } from './storage.js';
import { CollectorType, type CollectionResult } from './types.js';

/**
 * Менеджер сбора новостей
 */
export class NewsCollectorManager {
  private storage: NewsStorage;
  private collectors: Map<string, RSSCollector | WebScraper>;
  private cronJobs: Map<string, cron.ScheduledTask>;
  private isRunning: boolean;

  constructor(storage?: NewsStorage) {
    this.storage = storage || new InMemoryNewsStorage();
    this.collectors = new Map();
    this.cronJobs = new Map();
    this.isRunning = false;
  }

  /**
   * Инициализация коллекторов
   */
  initialize(): void {
    console.info('📊 Initializing news collectors...');

    const sources = getEnabledSources();

    for (const sourceConfig of sources) {
      try {
        if (sourceConfig.type === CollectorType.RSS) {
          // Создаем RSS коллектор
          const collector = new RSSCollector(sourceConfig.name, sourceConfig.url);
          this.collectors.set(sourceConfig.name, collector);
        } else if (sourceConfig.type === CollectorType.SCRAPER) {
          // Создаем web scraper
          const selectors = SCRAPER_SELECTORS[sourceConfig.name as keyof typeof SCRAPER_SELECTORS];
          if (selectors) {
            const collector = new WebScraper(sourceConfig.name, {
              url: sourceConfig.url,
              selectors,
            });
            this.collectors.set(sourceConfig.name, collector);
          } else {
            console.warn(`No selectors configured for scraper: ${sourceConfig.name}`);
          }
        }

        console.info(`✅ Initialized collector: ${sourceConfig.name}`);
      } catch (error) {
        console.error(`Failed to initialize collector ${sourceConfig.name}:`, error);
      }
    }

    console.info(`✅ Initialized ${this.collectors.size} news collectors`);
  }

  /**
   * Запуск сбора новостей со всех источников
   */
  async collectAll(): Promise<CollectionResult[]> {
    console.info('🔄 Starting news collection from all sources...');

    const results: CollectionResult[] = [];
    const promises: Promise<void>[] = [];

    for (const [sourceName, collector] of this.collectors) {
      promises.push(
        (async () => {
          try {
            const result = await collector.run({
              checkUrl: true,
              checkTitle: true,
              similarityThreshold: 0.8,
            });

            results.push(result);

            // Сохраняем в БД только успешно собранные новости
            if (result.success && result.newsCount > 0) {
              // Получаем новости из коллектора (для этого нужно немного модифицировать архитектуру)
              // Временно пропускаем сохранение, т.к. collect() не возвращает новости напрямую
              console.info(`[${sourceName}] Collected ${result.newsCount} news items`);
            }
          } catch (error) {
            console.error(`[${sourceName}] Collection failed:`, error);
            results.push({
              source: sourceName as any,
              success: false,
              newsCount: 0,
              duplicatesSkipped: 0,
              errors: [error instanceof Error ? error.message : String(error)],
              collectedAt: new Date(),
            });
          }
        })(),
      );
    }

    await Promise.all(promises);

    // Выводим сводку
    this.printCollectionSummary(results);

    return results;
  }

  /**
   * Запуск планировщика для автоматического сбора новостей
   */
  startScheduler(): void {
    if (this.isRunning) {
      console.warn('⚠️  Scheduler is already running');
      return;
    }

    console.info('⏰ Starting news collection scheduler...');

    const sources = getEnabledSources();

    for (const sourceConfig of sources) {
      // Создаем cron задачу для каждого источника
      const cronExpression = `*/${sourceConfig.updateInterval} * * * *`;

      const task = cron.schedule(cronExpression, async () => {
        const collector = this.collectors.get(sourceConfig.name);
        if (collector) {
          console.info(`\n[${sourceConfig.name}] Scheduled collection started`);
          await collector.run({
            checkUrl: true,
            checkTitle: true,
            similarityThreshold: 0.8,
          });
        }
      });

      this.cronJobs.set(sourceConfig.name, task);
      console.info(
        `✅ Scheduled ${sourceConfig.name}: every ${sourceConfig.updateInterval} minutes`,
      );
    }

    this.isRunning = true;
    console.info(`✅ Scheduler started with ${this.cronJobs.size} tasks`);
  }

  /**
   * Остановка планировщика
   */
  stopScheduler(): void {
    if (!this.isRunning) {
      console.warn('⚠️  Scheduler is not running');
      return;
    }

    console.info('⏸️  Stopping news collection scheduler...');

    for (const [sourceName, task] of this.cronJobs) {
      task.stop();
      console.info(`✅ Stopped scheduler for: ${sourceName}`);
    }

    this.cronJobs.clear();
    this.isRunning = false;

    console.info('✅ Scheduler stopped');
  }

  /**
   * Очистка ресурсов
   */
  async cleanup(): Promise<void> {
    console.info('🧹 Cleaning up news collectors...');

    // Останавливаем планировщик
    if (this.isRunning) {
      this.stopScheduler();
    }

    // Закрываем браузеры для scrapers
    const cleanupPromises: Promise<void>[] = [];

    for (const collector of this.collectors.values()) {
      if (collector instanceof WebScraper) {
        cleanupPromises.push(collector.closeBrowser());
      }
    }

    await Promise.all(cleanupPromises);

    this.collectors.clear();
    console.info('✅ Cleanup completed');
  }

  /**
   * Получение статистики сбора
   */
  getStats(): {
    collectorsCount: number;
    isRunning: boolean;
    storage: any;
  } {
    const storageStats =
      this.storage instanceof InMemoryNewsStorage ? this.storage.getStats() : null;

    return {
      collectorsCount: this.collectors.size,
      isRunning: this.isRunning,
      storage: storageStats,
    };
  }

  /**
   * Вывод сводки результатов сбора
   */
  private printCollectionSummary(results: CollectionResult[]): void {
    console.info('\n📊 Collection Summary:');
    console.info('═'.repeat(60));

    let totalNews = 0;
    let totalDuplicates = 0;
    let successCount = 0;
    let failureCount = 0;

    for (const result of results) {
      const status = result.success ? '✅' : '❌';
      console.info(
        `${status} ${result.source}: ${result.newsCount} news, ${result.duplicatesSkipped} duplicates`,
      );

      if (result.success) {
        successCount++;
        totalNews += result.newsCount;
        totalDuplicates += result.duplicatesSkipped;
      } else {
        failureCount++;
        if (result.errors && result.errors.length > 0) {
          console.error(`   Errors: ${result.errors.join(', ')}`);
        }
      }
    }

    console.info('─'.repeat(60));
    console.info(`Total: ${totalNews} news collected, ${totalDuplicates} duplicates skipped`);
    console.info(
      `Success: ${successCount}/${results.length}, Failures: ${failureCount}/${results.length}`,
    );
    console.info('═'.repeat(60) + '\n');
  }

  /**
   * Получить хранилище новостей
   */
  getStorage(): NewsStorage {
    return this.storage;
  }
}
