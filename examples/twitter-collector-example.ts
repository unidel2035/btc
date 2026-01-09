import { config } from 'dotenv';
import { TwitterCollector } from '../src/collectors/social/index.js';

config();

/**
 * Пример использования Twitter коллектора
 */
async function runTwitterExample(): Promise<void> {
  console.info('🐦 Twitter Collector Example\n');

  // Конфигурация
  const twitterCollector = new TwitterCollector({
    bearerToken: process.env.TWITTER_BEARER_TOKEN || 'your_bearer_token_here',
    accounts: ['elonmusk', 'CoinDesk', 'whale_alert'],
    hashtags: ['Bitcoin', 'BTC', 'Crypto'],
    maxResults: 10,
    pollInterval: 60000, // 1 минута
  });

  // Callback для обработки постов
  const handlePosts = (posts: any[]): void => {
    console.info(`\n📊 Received ${posts.length} posts:`);
    for (const post of posts) {
      console.info(`\n- Author: @${post.author} (${post.authorFollowers || 'N/A'} followers)`);
      console.info(`  Content: ${post.content.substring(0, 100)}...`);
      console.info(`  Engagement: ${post.engagement.likes} likes, ${post.engagement.comments} comments`);
      console.info(`  URL: ${post.url}`);
    }
  };

  try {
    // Режим работы: один раз или с polling
    const mode = process.argv[2] || 'once';

    if (mode === 'once') {
      // Однократный сбор
      console.info('Mode: Single collection\n');
      const result = await twitterCollector.run(handlePosts);

      console.info(`\n✅ Collection completed:`);
      console.info(`   Success: ${result.success}`);
      console.info(`   Posts: ${result.postsCount}`);
      console.info(`   Duplicates skipped: ${result.duplicatesSkipped}`);
    } else if (mode === 'polling') {
      // Периодический опрос
      console.info('Mode: Continuous polling\n');
      console.info('Press Ctrl+C to stop\n');

      twitterCollector.startPolling(handlePosts);

      // Graceful shutdown
      process.on('SIGINT', () => {
        console.info('\n\n🛑 Stopping Twitter collector...');
        twitterCollector.stopPolling();

        const stats = twitterCollector.getStats();
        console.info('\n📊 Final stats:');
        console.info(`   Cached IDs: ${stats.cachedIds}`);
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
runTwitterExample().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
