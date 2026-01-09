/**
 * Пример использования SocialCollectorOrchestrator
 *
 * Этот пример показывает, как использовать оркестратор для одновременного
 * мониторинга всех социальных платформ
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import {
  SocialCollectorOrchestrator,
  TwitterCollector,
  RedditCollector,
  TelegramCollector,
  CollectionResult,
} from '../src/collectors/social';

// Загрузить переменные окружения
dotenv.config();

async function main() {
  // Создать оркестратор
  const orchestrator = new SocialCollectorOrchestrator({
    persistData: true,
    onDataCollected: async (result: CollectionResult) => {
      console.log(`\n[${new Date().toISOString()}] Collected from ${result.platform}:`);
      console.log(`  Posts: ${result.count}`);

      if (result.count > 0) {
        // Показать последний пост
        const lastPost = result.posts[result.posts.length - 1];
        console.log(`  Latest: [${lastPost.author}] ${lastPost.content.substring(0, 60)}...`);
      }

      if (result.errors && result.errors.length > 0) {
        console.error(`  Errors: ${result.errors.length}`);
      }
    },
    onError: async (platform, error) => {
      console.error(`\n[ERROR] ${platform}:`, error.message);
    },
  });

  try {
    console.log('Setting up collectors...\n');

    // Настроить Twitter collector
    if (process.env.TWITTER_BEARER_TOKEN) {
      const twitterCollector = new TwitterCollector({
        bearerToken: process.env.TWITTER_BEARER_TOKEN,
        accounts: ['whale_alert', 'VitalikButerin', 'CZ_Binance'],
        hashtags: ['Bitcoin', 'BTC', 'Crypto'],
        pollInterval: 60000,
        maxResults: 10,
        enabled: true,
        batchSize: 10,
      });
      orchestrator.registerCollector('twitter', twitterCollector);
      console.log('✓ Twitter collector registered');
    }

    // Настроить Reddit collector
    if (process.env.REDDIT_CLIENT_ID) {
      const redditCollector = new RedditCollector({
        clientId: process.env.REDDIT_CLIENT_ID,
        clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
        username: process.env.REDDIT_USERNAME || '',
        password: process.env.REDDIT_PASSWORD || '',
        userAgent: process.env.REDDIT_USER_AGENT || 'btc-trading-bot/0.1.0',
        subreddits: ['Bitcoin', 'CryptoCurrency', 'CryptoMarkets'],
        sort: 'hot',
        pollInterval: 120000,
        enabled: true,
        batchSize: 25,
      });
      orchestrator.registerCollector('reddit', redditCollector);
      console.log('✓ Reddit collector registered');
    }

    // Настроить Telegram collector
    if (process.env.TELEGRAM_API_ID) {
      const telegramCollector = new TelegramCollector({
        apiId: parseInt(process.env.TELEGRAM_API_ID),
        apiHash: process.env.TELEGRAM_API_HASH || '',
        sessionString: process.env.TELEGRAM_SESSION_STRING,
        channels: ['@crypto', '@bitcoin'],
        pollInterval: 60000,
        enabled: true,
        batchSize: 20,
      });
      orchestrator.registerCollector('telegram', telegramCollector);
      console.log('✓ Telegram collector registered');
    }

    console.log('\nInitializing all collectors...');
    await orchestrator.initializeAll();
    console.log('✓ All collectors initialized\n');

    console.log('Starting all collectors...');
    await orchestrator.startAll();
    console.log('✓ All collectors started\n');

    console.log('Monitoring social media... Press Ctrl+C to stop.\n');

    // Показать статистику каждые 60 секунд
    const statsInterval = setInterval(() => {
      const stats = orchestrator.getStats();
      const platforms = orchestrator.getRegisteredPlatforms();

      console.log('\n=== Overall Statistics ===');
      console.log(`Active collectors: ${orchestrator.getActiveCollectorsCount()}/${platforms.length}`);
      console.log(`Total posts: ${orchestrator.getTotalPostsCount()}`);
      console.log('\nPer-platform stats:');

      for (const [platform, stat] of stats) {
        console.log(`\n${platform.toUpperCase()}:`);
        console.log(`  Status: ${stat.status}`);
        console.log(`  Total posts: ${stat.totalPosts}`);
        console.log(`  Success rate: ${stat.successfulRequests}/${stat.successfulRequests + stat.failedRequests}`);
      }

      console.log('\n==========================\n');
    }, 60000);

    // Сохранить данные каждые 5 минут
    const saveInterval = setInterval(() => {
      saveData(orchestrator);
    }, 5 * 60 * 1000);

    // Обработка завершения
    process.on('SIGINT', async () => {
      console.log('\n\nShutting down...');
      clearInterval(statsInterval);
      clearInterval(saveInterval);

      await orchestrator.stopAll();
      saveData(orchestrator);

      console.log('All collectors stopped. Goodbye!');
      process.exit(0);
    });

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

/**
 * Сохранить собранные данные в файл
 */
function saveData(orchestrator: SocialCollectorOrchestrator): void {
  const allPosts = orchestrator.getAllPosts();

  if (allPosts.length === 0) {
    console.log('No data to save.');
    return;
  }

  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `social-posts-${timestamp}.json`;
  const filepath = path.join(dataDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(allPosts, null, 2));
  console.log(`\nSaved ${allPosts.length} posts to ${filename}`);
}

// Пример одноразового сбора со всех платформ
async function oneTimeCollection() {
  const orchestrator = new SocialCollectorOrchestrator({ persistData: true });

  // Настроить коллекторы
  if (process.env.TWITTER_BEARER_TOKEN) {
    const twitterCollector = new TwitterCollector({
      bearerToken: process.env.TWITTER_BEARER_TOKEN,
      accounts: ['whale_alert'],
      hashtags: ['Bitcoin'],
      maxResults: 5,
      enabled: true,
      pollInterval: 0,
      batchSize: 5,
    });
    orchestrator.registerCollector('twitter', twitterCollector);
  }

  if (process.env.REDDIT_CLIENT_ID) {
    const redditCollector = new RedditCollector({
      clientId: process.env.REDDIT_CLIENT_ID,
      clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
      username: process.env.REDDIT_USERNAME || '',
      password: process.env.REDDIT_PASSWORD || '',
      userAgent: process.env.REDDIT_USER_AGENT || 'btc-trading-bot/0.1.0',
      subreddits: ['Bitcoin'],
      batchSize: 5,
      enabled: true,
      pollInterval: 0,
    });
    orchestrator.registerCollector('reddit', redditCollector);
  }

  try {
    console.log('Initializing...');
    await orchestrator.initializeAll();

    console.log('Collecting from all platforms...');
    const results = await orchestrator.collectAll();

    console.log('\n=== Collection Results ===\n');
    for (const result of results) {
      console.log(`${result.platform.toUpperCase()}: ${result.count} posts`);
      if (result.errors && result.errors.length > 0) {
        console.log(`  Errors: ${result.errors.length}`);
      }
    }

    console.log(`\nTotal: ${orchestrator.getTotalPostsCount()} posts\n`);

    await orchestrator.stopAll();
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
