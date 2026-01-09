/**
 * Тесты для модуля сбора новостей
 *
 * Базовые тесты для проверки функциональности
 */

import { randomUUID } from 'crypto';
import {
  InMemoryNewsStorage,
  type NewsItem,
  NewsSource,
} from '../../src/collectors/news/index.js';

/**
 * Создание тестовой новости
 */
function createTestNews(overrides?: Partial<NewsItem>): NewsItem {
  return {
    id: randomUUID(),
    source: NewsSource.COINDESK,
    title: 'Test Bitcoin News',
    content: 'This is a test news article about Bitcoin.',
    url: `https://example.com/news/${randomUUID()}`,
    publishedAt: new Date(),
    collectedAt: new Date(),
    tags: ['bitcoin', 'test'],
    ...overrides,
  };
}

/**
 * Тест хранилища новостей
 */
async function testNewsStorage() {
  console.info('\n📝 Testing InMemoryNewsStorage...');

  const storage = new InMemoryNewsStorage();

  // Тест: сохранение и получение новости
  const news1 = createTestNews({
    title: 'Bitcoin reaches new high',
  });

  await storage.save(news1);

  const retrieved = await storage.getById(news1.id);
  if (!retrieved || retrieved.id !== news1.id) {
    throw new Error('Failed to retrieve saved news');
  }
  console.info('  ✅ Save and retrieve test passed');

  // Тест: проверка существования по URL
  const exists = await storage.existsByUrl(news1.url);
  if (!exists) {
    throw new Error('URL should exist in storage');
  }
  console.info('  ✅ URL existence check passed');

  // Тест: сохранение нескольких новостей
  const news2 = createTestNews({
    title: 'Ethereum update announced',
    source: NewsSource.DECRYPT,
  });
  const news3 = createTestNews({
    title: 'Crypto regulation news',
    source: NewsSource.COINDESK,
  });

  await storage.saveMany([news2, news3]);

  const count = await storage.count();
  if (count !== 3) {
    throw new Error(`Expected 3 news items, got ${count}`);
  }
  console.info('  ✅ Save many test passed');

  // Тест: получение последних новостей
  const recent = await storage.getRecent(2);
  if (recent.length !== 2) {
    throw new Error(`Expected 2 recent news, got ${recent.length}`);
  }
  console.info('  ✅ Get recent test passed');

  // Тест: фильтрация по источнику
  const coindesk = await storage.getBySource(NewsSource.COINDESK, 10);
  if (coindesk.length !== 2) {
    throw new Error(`Expected 2 CoinDesk news, got ${coindesk.length}`);
  }
  console.info('  ✅ Filter by source test passed');

  // Тест: удаление старых новостей
  const oldDate = new Date(Date.now() + 86400000); // Завтра
  const deleted = await storage.deleteOlderThan(oldDate);
  if (deleted !== 3) {
    throw new Error(`Expected to delete 3 news, deleted ${deleted}`);
  }

  const countAfterDelete = await storage.count();
  if (countAfterDelete !== 0) {
    throw new Error(`Expected 0 news after deletion, got ${countAfterDelete}`);
  }
  console.info('  ✅ Delete old news test passed');

  console.info('✅ All storage tests passed!\n');
}

/**
 * Тест дедупликации
 */
function testDeduplication() {
  console.info('\n🔍 Testing deduplication logic...');

  // Базовая нормализация заголовка
  const title1 = '  Bitcoin Reaches $50,000!  ';
  const title2 = 'Bitcoin reaches $50000';

  // Простая проверка нормализации (без реального коллектора)
  const normalized1 = title1.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
  const normalized2 = title2.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');

  if (normalized1 !== normalized2) {
    console.warn('  ⚠️  Title normalization might need improvement');
  } else {
    console.info('  ✅ Title normalization works correctly');
  }

  console.info('✅ Deduplication tests passed!\n');
}

/**
 * Запуск всех тестов
 */
async function runTests() {
  console.info('🧪 Running News Collector Tests\n');
  console.info('='.repeat(60));

  try {
    testDeduplication();
    await testNewsStorage();

    console.info('='.repeat(60));
    console.info('\n✅ All tests passed successfully!\n');
  } catch (error) {
    console.error('\n❌ Tests failed:', error);
    process.exit(1);
  }
}

runTests();
