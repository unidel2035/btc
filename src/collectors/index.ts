import { config } from 'dotenv';
import { NewsCollectorManager } from './news/index.js';

config();

/**
 * Запуск коллекторов данных
 */
async function runCollectors(): Promise<void> {
  console.info('📊 Starting data collectors...');

  // Инициализация менеджера сбора новостей
  const newsManager = new NewsCollectorManager();

  try {
    // Инициализация коллекторов
    newsManager.initialize();

    // Запуск однократного сбора новостей
    console.info('\n🔄 Running initial news collection...\n');
    await newsManager.collectAll();

    // Запуск планировщика для периодического сбора
    const enableScheduler = process.env.ENABLE_NEWS_SCHEDULER === 'true';

    if (enableScheduler) {
      newsManager.startScheduler();
      console.info('\n✅ News collectors started with scheduler');
      console.info('Press Ctrl+C to stop\n');

      // Обработка завершения
      process.on('SIGINT', () => {
        void (async (): Promise<void> => {
          console.info('\n🛑 Shutting down collectors...');
          await newsManager.cleanup();
          process.exit(0);
        })();
      });

      process.on('SIGTERM', () => {
        void (async (): Promise<void> => {
          console.info('\n🛑 Shutting down collectors...');
          await newsManager.cleanup();
          process.exit(0);
        })();
      });
    } else {
      console.info('\n✅ Initial news collection completed');
      console.info('💡 Set ENABLE_NEWS_SCHEDULER=true to enable periodic collection\n');
      await newsManager.cleanup();
    }

    // TODO: Другие коллекторы
    // - Социальные сети (Twitter, Reddit, Telegram)
    // - Рыночные данные с бирж
  } catch (error) {
    console.error('Failed to run collectors:', error);
    await newsManager.cleanup();
    process.exit(1);
  }
}

runCollectors().catch((error: Error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
