/**
 * Пример использования Twitter Collector
 *
 * Этот пример показывает, как использовать TwitterCollector для мониторинга
 * ключевых аккаунтов и хештегов в Twitter/X
 */

import * as dotenv from 'dotenv';
import { TwitterCollector } from '../src/collectors/social';

// Загрузить переменные окружения
dotenv.config();

async function main() {
  // Создать коллектор с конфигурацией
  const collector = new TwitterCollector({
    bearerToken: process.env.TWITTER_BEARER_TOKEN || '',
    pollInterval: 60000, // Опрос каждую минуту
    batchSize: 10,
    enabled: true,
    accounts: [
      'whale_alert', // Whale Alert - крупные транзакции
      'VitalikButerin', // Виталик Бутерин
      'CZ_Binance', // CZ Binance
      'elonmusk', // Илон Маск
    ],
    hashtags: [
      'Bitcoin',
      'BTC',
      'Crypto',
      'Ethereum',
      'ETH',
    ],
    maxResults: 10,
  });

  try {
    console.log('Initializing Twitter collector...');
    await collector.initialize();

    console.log('Starting collection...');
    // Запустить коллектор в режиме real-time
    await collector.start();

    console.log('Collector is running. Press Ctrl+C to stop.');

    // Получить статистику каждые 30 секунд
    const statsInterval = setInterval(() => {
      const stats = collector.getStats();
      console.log('\n=== Twitter Collector Stats ===');
      console.log(`Status: ${stats.status}`);
      console.log(`Total posts collected: ${stats.totalPosts}`);
      console.log(`Successful requests: ${stats.successfulRequests}`);
      console.log(`Failed requests: ${stats.failedRequests}`);
      console.log(`Last request: ${stats.lastRequest?.toISOString() || 'N/A'}`);
      console.log('================================\n');
    }, 30000);

    // Обработка завершения
    process.on('SIGINT', async () => {
      console.log('\nStopping collector...');
      clearInterval(statsInterval);
      await collector.stop();
      console.log('Collector stopped.');
      process.exit(0);
    });

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Пример одноразового сбора данных
async function oneTimeCollection() {
  const collector = new TwitterCollector({
    bearerToken: process.env.TWITTER_BEARER_TOKEN || '',
    accounts: ['whale_alert', 'VitalikButerin'],
    hashtags: ['Bitcoin', 'BTC'],
    maxResults: 5,
    enabled: true,
    pollInterval: 0,
    batchSize: 5,
  });

  try {
    console.log('Initializing...');
    await collector.initialize();

    console.log('Collecting tweets...');
    const posts = await collector.collect();

    console.log(`\nCollected ${posts.length} tweets:\n`);
    posts.forEach(post => {
      console.log(`[${post.author}] ${post.content.substring(0, 100)}...`);
      console.log(`  Likes: ${post.engagement.likes}, Comments: ${post.engagement.comments}`);
      console.log(`  URL: ${post.url}\n`);
    });

    await collector.stop();
  } catch (error) {
    console.error('Error:', error);
  }
}

// Запустить пример
if (require.main === module) {
  const mode = process.argv[2] || 'realtime';

  if (mode === 'once') {
    oneTimeCollection();
  } else {
    main();
  }
}
