/**
 * Пример использования модуля мониторинга социальных сетей
 */

import { config } from 'dotenv';
import { SocialCollectorManager } from '../src/collectors/social/index.js';
import type { SocialCollectorConfig } from '../src/collectors/social/types.js';

// Загружаем переменные окружения
config();

/**
 * Создает конфигурацию на основе переменных окружения
 */
function createConfigFromEnv(): SocialCollectorConfig {
  return {
    twitter: {
      bearerToken: process.env.TWITTER_BEARER_TOKEN || '',
      accounts:
        process.env.SOCIAL_TWITTER_ACCOUNTS?.split(',').map((a) => a.trim()) || [
          'elonmusk',
          'whale_alert',
        ],
      hashtags:
        process.env.SOCIAL_TWITTER_HASHTAGS?.split(',').map((h) => h.trim()) || [
          'Bitcoin',
          'BTC',
          'Crypto',
        ],
      maxResults: 10,
      pollInterval: parseInt(process.env.SOCIAL_TWITTER_POLL_INTERVAL || '60000'),
    },
    reddit: {
      clientId: process.env.REDDIT_CLIENT_ID || '',
      clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
      userAgent: process.env.REDDIT_USER_AGENT || 'btc-trading-bot',
      subreddits:
        process.env.SOCIAL_REDDIT_SUBREDDITS?.split(',').map((s) => s.trim()) || [
          'Bitcoin',
          'CryptoCurrency',
          'CryptoMarkets',
        ],
      sortBy: (process.env.SOCIAL_REDDIT_SORT_BY as 'hot' | 'new' | 'top' | 'rising') || 'hot',
      limit: 25,
      pollInterval: parseInt(process.env.SOCIAL_REDDIT_POLL_INTERVAL || '120000'),
    },
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      channels:
        process.env.SOCIAL_TELEGRAM_CHANNELS?.split(',').map((c) => c.trim()) || [
          '@bitcoin',
          '@crypto',
        ],
      pollInterval: 60000,
    },
    enabled: {
      twitter: process.env.SOCIAL_TWITTER_ENABLED === 'true',
      reddit: process.env.SOCIAL_REDDIT_ENABLED === 'true',
      telegram: process.env.SOCIAL_TELEGRAM_ENABLED === 'true',
      discord: false,
    },
  };
}

/**
 * Основная функция примера
 */
async function main(): Promise<void> {
  console.info('🚀 Social Collector Example');
  console.info('============================\n');

  // Создаем конфигурацию
  const config = createConfigFromEnv();

  // Инициализируем менеджер коллекторов
  const manager = new SocialCollectorManager(config);

  try {
    // Проверяем соединения
    console.info('📡 Testing API connections...\n');
    const connections = await manager.testConnections();

    for (const [platform, status] of Object.entries(connections)) {
      console.info(`${platform}: ${status ? '✅ Connected' : '❌ Failed'}`);
    }

    console.info('\n');

    // Если хотя бы одно соединение успешно, запускаем сбор
    const hasConnection = Object.values(connections).some((status) => status);
    if (!hasConnection) {
      console.error('❌ No successful API connections. Please check your credentials.');
      process.exit(1);
    }

    // Запускаем коллекторы
    console.info('🔄 Starting collectors...\n');
    await manager.start();

    // Ждем немного для сбора первых данных
    console.info('⏳ Waiting for initial data collection (30 seconds)...\n');
    await new Promise((resolve) => setTimeout(resolve, 30000));

    // Собираем данные
    console.info('📊 Collecting data from all platforms...\n');
    const results = await manager.collectAll();

    // Выводим результаты
    for (const result of results) {
      console.info(`\n${result.platform.toUpperCase()}:`);
      console.info(`  Posts collected: ${result.count}`);
      console.info(`  Collection time: ${result.collectedAt.toISOString()}`);

      if (result.errors && result.errors.length > 0) {
        console.info(`  Errors: ${result.errors.length}`);
        result.errors.forEach((err) => console.error(`    - ${err.message}`));
      }

      // Показываем первые 3 поста
      if (result.posts.length > 0) {
        console.info(`\n  Sample posts:`);
        result.posts.slice(0, 3).forEach((post, idx) => {
          console.info(`\n  ${idx + 1}. ${post.author} (@${post.platform})`);
          console.info(`     Content: ${post.content.substring(0, 100)}...`);
          console.info(
            `     Engagement: ${post.engagement.likes} likes, ${post.engagement.comments} comments`,
          );
          console.info(`     URL: ${post.url}`);
        });
      }
    }

    // Получаем топ-посты
    console.info('\n\n🔥 Top 5 posts by engagement:\n');
    const topPosts = await manager.getTopPosts(5);
    topPosts.forEach((post, idx) => {
      const totalEngagement =
        post.engagement.likes + post.engagement.comments + post.engagement.shares;
      console.info(`${idx + 1}. [${post.platform.toUpperCase()}] ${post.author}`);
      console.info(`   ${post.content.substring(0, 80)}...`);
      console.info(`   Engagement: ${totalEngagement} (👍 ${post.engagement.likes})`);
      console.info(`   ${post.url}\n`);
    });

    // Фильтруем криптовалютные посты
    console.info('\n🔍 Filtering crypto-related posts...\n');
    const cryptoPosts = await manager.collectFiltered([
      'bitcoin',
      'btc',
      'crypto',
      'blockchain',
    ]);
    console.info(`Found ${cryptoPosts.length} crypto-related posts\n`);

    // Показываем статистику
    console.info('\n📈 Collector Statistics:\n');
    const stats = manager.getStats();
    for (const stat of stats) {
      if (stat.totalPosts > 0 || stat.successfulRequests > 0) {
        console.info(`${stat.platform.toUpperCase()}:`);
        console.info(`  Total posts: ${stat.totalPosts}`);
        console.info(`  Successful requests: ${stat.successfulRequests}`);
        console.info(`  Failed requests: ${stat.failedRequests}`);
        if (stat.lastSuccessfulCollection) {
          console.info(`  Last collection: ${stat.lastSuccessfulCollection.toISOString()}`);
        }
        if (stat.lastError) {
          console.info(`  Last error: ${stat.lastError.message}`);
        }
        console.info('');
      }
    }

    // Останавливаем коллекторы
    console.info('🛑 Stopping collectors...\n');
    await manager.stop();

    console.info('✅ Example completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    await manager.stop();
    process.exit(1);
  }
}

// Обработка сигналов для graceful shutdown
process.on('SIGINT', async () => {
  console.info('\n\n⚠️  Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.info('\n\n⚠️  Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Запускаем пример
main().catch((error: Error) => {
  console.error('Failed to run example:', error);
  process.exit(1);
});
