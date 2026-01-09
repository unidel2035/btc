import { config } from 'dotenv';
import { RedditCollector } from '../src/collectors/social/index.js';

config();

/**
 * Пример использования Reddit коллектора
 */
async function runRedditExample(): Promise<void> {
  console.info('🤖 Reddit Collector Example\n');

  // Конфигурация
  const redditCollector = new RedditCollector({
    clientId: process.env.REDDIT_CLIENT_ID || 'your_client_id',
    clientSecret: process.env.REDDIT_CLIENT_SECRET || 'your_client_secret',
    username: process.env.REDDIT_USERNAME || 'your_username',
    password: process.env.REDDIT_PASSWORD || 'your_password',
    subreddits: ['Bitcoin', 'CryptoCurrency', 'CryptoMarkets'],
    sortBy: 'hot',
    maxResults: 25,
    pollInterval: 120000, // 2 минуты
  });

  // Callback для обработки постов
  const handlePosts = (posts: any[]): void => {
    console.info(`\n📊 Received ${posts.length} posts:`);
    for (const post of posts) {
      console.info(`\n- Author: u/${post.author}`);
      console.info(`  Content: ${post.content.substring(0, 100)}...`);
      console.info(`  Engagement: ${post.engagement.likes} upvotes, ${post.engagement.comments} comments`);
      console.info(`  URL: ${post.url}`);
    }
  };

  try {
    // Режим работы: один раз или с polling
    const mode = process.argv[2] || 'once';

    if (mode === 'once') {
      // Однократный сбор
      console.info('Mode: Single collection\n');
      const result = await redditCollector.run(handlePosts);

      console.info(`\n✅ Collection completed:`);
      console.info(`   Success: ${result.success}`);
      console.info(`   Posts: ${result.postsCount}`);
      console.info(`   Duplicates skipped: ${result.duplicatesSkipped}`);

      // Статистика
      const stats = redditCollector.getStats();
      console.info(`\n📊 Stats:`);
      console.info(`   Cached IDs: ${stats.cachedIds}`);
      console.info(`   Has valid token: ${stats.hasValidToken}`);
    } else if (mode === 'polling') {
      // Периодический опрос
      console.info('Mode: Continuous polling\n');
      console.info('Press Ctrl+C to stop\n');

      redditCollector.startPolling(handlePosts);

      // Graceful shutdown
      process.on('SIGINT', () => {
        console.info('\n\n🛑 Stopping Reddit collector...');
        redditCollector.stopPolling();

        const stats = redditCollector.getStats();
        console.info('\n📊 Final stats:');
        console.info(`   Cached IDs: ${stats.cachedIds}`);
        console.info(`   Has valid token: ${stats.hasValidToken}`);
        console.info(`   Rate limit: ${stats.rateLimitStats.availableTokens}/${stats.rateLimitStats.maxTokens}`);

        process.exit(0);
      });
    } else {
      console.error('Invalid mode. Use: once | polling');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Запуск примера
runRedditExample().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
