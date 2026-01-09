import { config } from 'dotenv';
import { SocialCollectorOrchestrator } from '../src/collectors/social/index.js';
import type { SocialPost } from '../src/collectors/social/index.js';
import { SocialPlatform } from '../src/collectors/social/index.js';

config();

/**
 * Пример использования Social Collector Orchestrator
 */
async function runOrchestratorExample(): Promise<void> {
  console.info('🎭 Social Collector Orchestrator Example\n');

  // Конфигурация всех коллекторов
  const orchestrator = new SocialCollectorOrchestrator({
    // Twitter
    enableTwitter: Boolean(process.env.TWITTER_BEARER_TOKEN),
    twitter: {
      bearerToken: process.env.TWITTER_BEARER_TOKEN || '',
      accounts: ['elonmusk', 'CoinDesk'],
      hashtags: ['Bitcoin', 'BTC'],
      maxResults: 5,
      pollInterval: 60000,
    },

    // Reddit
    enableReddit: Boolean(process.env.REDDIT_CLIENT_ID),
    reddit: {
      clientId: process.env.REDDIT_CLIENT_ID || '',
      clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
      username: process.env.REDDIT_USERNAME || '',
      password: process.env.REDDIT_PASSWORD || '',
      subreddits: ['Bitcoin', 'CryptoCurrency'],
      sortBy: 'hot',
      maxResults: 10,
      pollInterval: 120000,
    },

    // Telegram
    enableTelegram: Boolean(process.env.TELEGRAM_API_ID),
    telegram: {
      apiId: Number(process.env.TELEGRAM_API_ID) || 0,
      apiHash: process.env.TELEGRAM_API_HASH || '',
      sessionString: process.env.TELEGRAM_SESSION_STRING,
      channels: ['bitcoin'],
      pollInterval: 180000,
    },
  });

  // Регистрация callback для обработки постов
  orchestrator.onPosts(async (posts: SocialPost[]) => {
    console.info(`\n📊 Received ${posts.length} posts from ${posts[0]?.platform || 'unknown'}:`);

    for (const post of posts.slice(0, 3)) {
      // Показываем только первые 3
      console.info(`\n- [${post.platform.toUpperCase()}] @${post.author}`);
      console.info(`  ${post.content.substring(0, 80)}...`);
      console.info(`  ❤️ ${post.engagement.likes} | 💬 ${post.engagement.comments} | 🔄 ${post.engagement.shares}`);
    }

    if (posts.length > 3) {
      console.info(`\n  ... and ${posts.length - 3} more posts`);
    }

    // Здесь можно сохранить в базу данных, отправить в аналитику и т.д.
    // await saveToDatabase(posts);
    // await sendToAnalyzer(posts);
  });

  // Регистрация callback для обработки ошибок
  orchestrator.onError(async (error: Error, platform: SocialPlatform) => {
    console.error(`\n❌ Error from ${platform}: ${error.message}`);
    // Здесь можно отправить уведомление, записать в лог и т.д.
  });

  try {
    // Инициализация (для коллекторов, которым нужна async инициализация)
    await orchestrator.initialize();

    const mode = process.argv[2] || 'once';

    if (mode === 'once') {
      // Однократный сбор со всех платформ
      console.info('Mode: Single collection from all platforms\n');

      await orchestrator.collectAll();

      // Статистика
      console.info('\n📊 Collection stats:');
      const stats = orchestrator.getStats();
      for (const [platform, stat] of stats) {
        console.info(`\n${platform.toUpperCase()}:`);
        console.info(`  Total posts: ${stat.totalPosts}`);
        console.info(`  Successful: ${stat.successfulCollections}`);
        console.info(`  Failed: ${stat.failedCollections}`);
        console.info(`  Last collection: ${stat.lastCollectionAt?.toLocaleString() || 'Never'}`);
      }
    } else if (mode === 'polling') {
      // Непрерывный мониторинг
      console.info('Mode: Continuous polling from all platforms\n');
      console.info('Press Ctrl+C to stop\n');

      orchestrator.startPolling();

      // Периодический вывод статистики
      const statsInterval = setInterval(() => {
        const stats = orchestrator.getStats();
        console.info('\n' + '='.repeat(50));
        console.info('📊 Current Stats:');

        for (const [platform, stat] of stats) {
          console.info(
            `\n${platform.toUpperCase()}: ${stat.totalPosts} posts | ` +
              `✅ ${stat.successfulCollections} | ❌ ${stat.failedCollections} | ` +
              `${stat.isRunning ? '🔄 Running' : '⏸️ Stopped'}`,
          );
        }

        console.info('='.repeat(50));
      }, 300000); // Каждые 5 минут

      // Graceful shutdown
      process.on('SIGINT', async () => {
        console.info('\n\n🛑 Shutting down orchestrator...');

        clearInterval(statsInterval);
        await orchestrator.cleanup();

        // Финальная статистика
        const stats = orchestrator.getStats();
        console.info('\n📊 Final stats:');
        for (const [platform, stat] of stats) {
          console.info(`\n${platform.toUpperCase()}:`);
          console.info(`  Total posts collected: ${stat.totalPosts}`);
          console.info(`  Successful collections: ${stat.successfulCollections}`);
          console.info(`  Failed collections: ${stat.failedCollections}`);
        }

        process.exit(0);
      });
    } else {
      console.error('Invalid mode. Use: once | polling');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Fatal error:', error);
    await orchestrator.cleanup();
    process.exit(1);
  }
}

// Запуск примера
runOrchestratorExample().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
