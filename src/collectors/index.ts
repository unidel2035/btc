import { config } from 'dotenv';
import { SocialCollectorManager } from './social/index.js';

config();

/**
 * Запуск коллекторов данных
 */
async function runCollectors(): Promise<void> {
  console.info('📊 Starting data collectors...');

  try {
    // Инициализация и запуск коллекторов социальных сетей
    const socialManager = new SocialCollectorManager();

    // Подписка на новые посты
    socialManager.subscribe((post) => {
      console.info(
        `[${post.platform.toUpperCase()}] @${post.author}: ${post.content.substring(0, 100)}...`,
      );
      console.info(
        `  Engagement: ${post.engagement.likes} likes, ${post.engagement.comments} comments, ${post.engagement.shares} shares`,
      );
    });

    // Запуск менеджера
    await socialManager.start();

    // TODO: Инициализация и запуск других коллекторов
    // - Новостные агрегаторы
    // - Рыночные данные с бирж

    console.info('✅ Data collectors started');

    // Graceful shutdown
    const shutdown = async (): Promise<void> => {
      console.info('\n🛑 Shutting down collectors...');
      await socialManager.stop();
      process.exit(0);
    };

    process.on('SIGINT', () => {
      void shutdown();
    });
    process.on('SIGTERM', () => {
      void shutdown();
    });

    // Вывод статуса коллекторов
    setInterval(() => {
      const status = socialManager.getStatus();
      const activeCollectors = Object.entries(status)
        .filter(([, isRunning]) => isRunning)
        .map(([name]) => name);

      if (activeCollectors.length > 0) {
        console.info(`Active collectors: ${activeCollectors.join(', ')}`);
      }
    }, 300000); // Каждые 5 минут
  } catch (error) {
    console.error('Failed to initialize collectors:', error);
    throw error;
  }
}

runCollectors().catch((error: Error) => {
  console.error('Failed to run collectors:', error);
  process.exit(1);
});
