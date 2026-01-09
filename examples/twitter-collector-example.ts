/**
 * Пример использования Twitter коллектора
 *
 * Запуск:
 *   npm run example:twitter
 */

import { config } from 'dotenv';
import { TwitterCollector } from '../src/collectors/social/index.js';

config();

async function main() {
  console.info('🐦 Twitter Collector Example\n');

  // Проверка наличия токена
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) {
    console.error('❌ TWITTER_BEARER_TOKEN not found in environment variables');
    console.info('💡 Please set TWITTER_BEARER_TOKEN in your .env file');
    process.exit(1);
  }

  // Инициализация коллектора
  const collector = new TwitterCollector({
    bearerToken,
    accounts: process.env.TWITTER_ACCOUNTS?.split(',') || ['whale_alert', 'DocumentingBTC'],
    hashtags: process.env.TWITTER_HASHTAGS?.split(',') || ['Bitcoin', 'BTC'],
    maxResults: parseInt(process.env.TWITTER_MAX_RESULTS || '10'),
  });

  console.info('📊 Configuration:');
  console.info(`  Accounts: ${collector['config'].accounts?.join(', ')}`);
  console.info(`  Hashtags: ${collector['config'].hashtags?.join(', ')}`);
  console.info(`  Max Results: ${collector['config'].maxResults}\n`);

  try {
    console.info('🔄 Collecting tweets...\n');

    // Сбор твитов
    const posts = await collector.collect();

    console.info(`\n✅ Collected ${posts.length} tweets\n`);

    // Вывод примеров постов
    if (posts.length > 0) {
      console.info('📝 Sample posts:\n');
      posts.slice(0, 3).forEach((post, index) => {
        console.info(`${index + 1}. @${post.author}`);
        console.info(`   Content: ${post.content.substring(0, 100)}...`);
        console.info(`   Engagement: ❤️ ${post.engagement.likes} | 💬 ${post.engagement.comments} | 🔄 ${post.engagement.shares}`);
        console.info(`   URL: ${post.url}`);
        console.info(`   Timestamp: ${post.timestamp.toISOString()}\n`);
      });
    }

    // Статистика
    const stats = collector.getStats();
    console.info('📈 Statistics:');
    console.info(`  Platform: ${stats.platform}`);
    console.info(`  Cached tweets: ${stats.cachedTweets}`);

    console.info('\n✅ Example completed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main().catch((error: Error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
