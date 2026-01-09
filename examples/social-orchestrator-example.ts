/**
 * Пример использования Social Collector Orchestrator
 * для сбора данных со всех платформ
 *
 * Запуск:
 *   npm run example:social
 */

import { config } from 'dotenv';
import { SocialCollectorOrchestrator } from '../src/collectors/social/index.js';
import type { SocialPost, SocialPlatform } from '../src/collectors/social/index.js';

config();

async function main() {
  console.info('🎭 Social Collector Orchestrator Example\n');

  // Проверка переменных окружения
  const hasTwitter = !!process.env.TWITTER_BEARER_TOKEN;
  const hasReddit = !!(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET);
  const hasTelegram = !!(process.env.TELEGRAM_API_ID && process.env.TELEGRAM_API_HASH);

  console.info('📊 Available platforms:');
  console.info(`  Twitter: ${hasTwitter ? '✅' : '❌'}`);
  console.info(`  Reddit: ${hasReddit ? '✅' : '❌'}`);
  console.info(`  Telegram: ${hasTelegram ? '✅' : '❌'}\n`);

  if (!hasTwitter && !hasReddit && !hasTelegram) {
    console.error('❌ No platform credentials found');
    console.info('💡 Please configure at least one platform in your .env file');
    process.exit(1);
  }

  // Создание конфигурации оркестратора
  const orchestratorConfig: any = {
    pollInterval: parseInt(process.env.SOCIAL_POLL_INTERVAL || '300000'), // 5 минут
  };

  if (hasTwitter) {
    orchestratorConfig.twitter = {
      bearerToken: process.env.TWITTER_BEARER_TOKEN!,
      accounts: process.env.TWITTER_ACCOUNTS?.split(',') || ['whale_alert'],
      hashtags: process.env.TWITTER_HASHTAGS?.split(',') || ['Bitcoin'],
      maxResults: parseInt(process.env.TWITTER_MAX_RESULTS || '10'),
    };
  }

  if (hasReddit) {
    orchestratorConfig.reddit = {
      clientId: process.env.REDDIT_CLIENT_ID!,
      clientSecret: process.env.REDDIT_CLIENT_SECRET!,
      userAgent: process.env.REDDIT_USER_AGENT || 'btc-trading-bot',
      subreddits: process.env.REDDIT_SUBREDDITS?.split(',') || ['Bitcoin'],
      sortBy: process.env.REDDIT_SORT_BY || 'hot',
      limit: parseInt(process.env.REDDIT_LIMIT || '25'),
    };
  }

  if (hasTelegram) {
    orchestratorConfig.telegram = {
      apiId: process.env.TELEGRAM_API_ID!,
      apiHash: process.env.TELEGRAM_API_HASH!,
      sessionString: process.env.TELEGRAM_SESSION_STRING,
      channels: process.env.TELEGRAM_CHANNELS?.split(',') || ['bitcoinchannel'],
      limit: parseInt(process.env.TELEGRAM_LIMIT || '20'),
    };
  }

  // Инициализация оркестратора
  const orchestrator = new SocialCollectorOrchestrator(orchestratorConfig);

  // Регистрация коллекторов
  orchestrator.registerCollectors();
  console.info(`✅ Registered ${orchestrator.collectorsCount} collectors\n`);

  // Установка callbacks
  orchestrator.onPostsCollected((posts: SocialPost[]) => {
    console.info(`📥 Received ${posts.length} posts from ${posts[0]?.platform}`);
  });

  orchestrator.onError((platform: SocialPlatform, error: Error) => {
    console.error(`❌ Error from ${platform}: ${error.message}`);
  });

  try {
    // Режим работы: разовый сбор или непрерывный
    const mode = process.argv[2] || 'once';

    if (mode === 'continuous') {
      console.info('🔄 Starting continuous collection...\n');
      console.info('Press Ctrl+C to stop\n');

      // Запуск непрерывного сбора
      orchestrator.start();

      // Обработка завершения
      process.on('SIGINT', async () => {
        console.info('\n\n🛑 Stopping orchestrator...');
        await orchestrator.stop();
        console.info('✅ Orchestrator stopped');
        process.exit(0);
      });

      // Вывод статистики каждую минуту
      setInterval(() => {
        const stats = orchestrator.getStats();
        console.info('\n📈 Current Statistics:');
        stats.forEach((stat) => {
          console.info(
            `  ${stat.platform}: ${stat.totalPosts} posts, ${stat.totalErrors} errors, ` +
              `Running: ${stat.isRunning ? '✅' : '❌'}, Last: ${stat.lastCollectionAt?.toISOString() || 'never'}`,
          );
        });
      }, 60000);
    } else {
      console.info('🔄 Performing one-time collection...\n');

      // Разовый сбор
      const allPosts = await orchestrator.collectAll();

      console.info(`\n✅ Collected ${allPosts.length} total posts\n`);

      // Группировка по платформам
      const postsByPlatform = allPosts.reduce(
        (acc, post) => {
          acc[post.platform] = (acc[post.platform] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      console.info('📊 Posts by platform:');
      Object.entries(postsByPlatform).forEach(([platform, count]) => {
        console.info(`  ${platform}: ${count} posts`);
      });

      // Вывод примеров постов
      if (allPosts.length > 0) {
        console.info('\n📝 Sample posts:\n');
        allPosts.slice(0, 3).forEach((post, index) => {
          console.info(`${index + 1}. [${post.platform}] @${post.author}`);
          console.info(`   ${post.content.substring(0, 80)}...`);
          console.info(`   ${post.url}\n`);
        });
      }

      // Статистика
      const stats = orchestrator.getStats();
      console.info('\n📈 Final Statistics:');
      stats.forEach((stat) => {
        console.info(
          `  ${stat.platform}: ${stat.totalPosts} posts, ${stat.totalErrors} errors`,
        );
      });

      console.info('\n✅ Example completed successfully');
      console.info('💡 Run with "continuous" argument for continuous collection');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    await orchestrator.stop();
    process.exit(1);
  }
}

main().catch((error: Error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
