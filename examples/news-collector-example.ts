/**
 * Пример использования модуля сбора новостей
 *
 * Запуск:
 * tsx examples/news-collector-example.ts
 */

import { config } from 'dotenv';
import { NewsCollectorManager } from '../src/collectors/news/index.js';

config();

async function main() {
  console.info('🚀 News Collector Example\n');

  // Создаем менеджер с in-memory хранилищем
  const manager = new NewsCollectorManager();

  try {
    // Инициализация коллекторов
    console.info('1️⃣  Initializing collectors...');
    manager.initialize();

    // Однократный сбор
    console.info('\n2️⃣  Running news collection...\n');
    const results = await manager.collectAll();

    // Получаем статистику
    console.info('\n3️⃣  Manager Statistics:');
    const stats = manager.getStats();
    console.info(JSON.stringify(stats, null, 2));

    // Получаем сохраненные новости
    console.info('\n4️⃣  Checking stored news...');
    const storage = manager.getStorage();
    const newsCount = await storage.count();
    console.info(`Total news in storage: ${newsCount}`);

    if (newsCount > 0) {
      const recentNews = await storage.getRecent(5);
      console.info('\n📰 Recent news (top 5):');
      for (const news of recentNews) {
        console.info(`\n  - [${news.source}] ${news.title}`);
        console.info(`    URL: ${news.url}`);
        console.info(`    Published: ${news.publishedAt.toISOString()}`);
        console.info(`    Tags: ${news.tags.join(', ')}`);
      }
    }

    // Очистка
    console.info('\n5️⃣  Cleaning up...');
    await manager.cleanup();

    console.info('\n✅ Example completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Example failed:', error);
    await manager.cleanup();
    process.exit(1);
  }
}

main();
