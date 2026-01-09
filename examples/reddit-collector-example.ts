/**
 * Пример использования Reddit Collector
 *
 * Этот пример показывает, как использовать RedditCollector для мониторинга
 * популярных постов в криптовалютных subreddits
 */

import * as dotenv from 'dotenv';
import { RedditCollector } from '../src/collectors/social';

// Загрузить переменные окружения
dotenv.config();

async function main() {
  // Создать коллектор с конфигурацией
  const collector = new RedditCollector({
    clientId: process.env.REDDIT_CLIENT_ID || '',
    clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
    username: process.env.REDDIT_USERNAME || '',
    password: process.env.REDDIT_PASSWORD || '',
    userAgent: process.env.REDDIT_USER_AGENT || 'btc-trading-bot/0.1.0',
    pollInterval: 120000, // Опрос каждые 2 минуты
    batchSize: 25,
    enabled: true,
    subreddits: [
      'Bitcoin',
      'CryptoCurrency',
      'CryptoMarkets',
      'btc',
      'ethtrader',
    ],
    sort: 'hot', // hot, new, top, rising
    timeFilter: 'day', // hour, day, week, month, year, all
  });

  try {
    console.log('Initializing Reddit collector...');
    await collector.initialize();

    console.log('Starting collection...');
    await collector.start();

    console.log('Collector is running. Press Ctrl+C to stop.');

    // Получить статистику каждые 30 секунд
    const statsInterval = setInterval(() => {
      const stats = collector.getStats();
      console.log('\n=== Reddit Collector Stats ===');
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

// Пример получения trending topics
async function getTrendingTopics() {
  const collector = new RedditCollector({
    clientId: process.env.REDDIT_CLIENT_ID || '',
    clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
    username: process.env.REDDIT_USERNAME || '',
    password: process.env.REDDIT_PASSWORD || '',
    userAgent: process.env.REDDIT_USER_AGENT || 'btc-trading-bot/0.1.0',
    subreddits: ['Bitcoin'],
    enabled: true,
    pollInterval: 0,
    batchSize: 10,
  });

  try {
    console.log('Initializing...');
    await collector.initialize();

    console.log('Fetching trending topics from r/Bitcoin...');
    const topics = await collector.getTrendingTopics('Bitcoin', 10);

    console.log('\nTrending topics:');
    topics.forEach((topic, i) => {
      console.log(`${i + 1}. ${topic}`);
    });

    await collector.stop();
  } catch (error) {
    console.error('Error:', error);
  }
}

// Пример анализа комментариев
async function analyzeComments() {
  const collector = new RedditCollector({
    clientId: process.env.REDDIT_CLIENT_ID || '',
    clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
    username: process.env.REDDIT_USERNAME || '',
    password: process.env.REDDIT_PASSWORD || '',
    userAgent: process.env.REDDIT_USER_AGENT || 'btc-trading-bot/0.1.0',
    subreddits: ['Bitcoin'],
    enabled: true,
    pollInterval: 0,
    batchSize: 10,
  });

  try {
    console.log('Initializing...');
    await collector.initialize();

    // Сначала получить посты
    console.log('Collecting posts...');
    const posts = await collector.collect();

    if (posts.length > 0) {
      const submissionId = posts[0].id;
      console.log(`\nAnalyzing comments for post: ${posts[0].content.substring(0, 50)}...`);

      const comments = await collector.analyzeComments(submissionId);

      console.log(`\nFound ${comments.length} comments:`);
      comments.slice(0, 5).forEach(comment => {
        console.log(`\n[${comment.author}] ${comment.content.substring(0, 100)}...`);
        console.log(`  Upvotes: ${comment.engagement.likes}`);
      });
    }

    await collector.stop();
  } catch (error) {
    console.error('Error:', error);
  }
}

// Запустить пример
if (require.main === module) {
  const mode = process.argv[2] || 'realtime';

  if (mode === 'topics') {
    getTrendingTopics();
  } else if (mode === 'comments') {
    analyzeComments();
  } else {
    main();
  }
}
