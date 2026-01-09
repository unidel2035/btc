/**
 * Пример использования Reddit коллектора
 *
 * Запуск:
 *   npm run example:reddit
 */

import { config } from 'dotenv';
import { RedditCollector } from '../src/collectors/social/index.js';

config();

async function main() {
  console.info('🤖 Reddit Collector Example\n');

  // Проверка наличия credentials
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const userAgent = process.env.REDDIT_USER_AGENT || 'btc-trading-bot';

  if (!clientId || !clientSecret) {
    console.error('❌ Reddit credentials not found in environment variables');
    console.info('💡 Please set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in your .env file');
    process.exit(1);
  }

  // Инициализация коллектора
  const collector = new RedditCollector({
    clientId,
    clientSecret,
    userAgent,
    subreddits: process.env.REDDIT_SUBREDDITS?.split(',') || [
      'Bitcoin',
      'CryptoCurrency',
      'CryptoMarkets',
    ],
    sortBy: (process.env.REDDIT_SORT_BY as any) || 'hot',
    limit: parseInt(process.env.REDDIT_LIMIT || '25'),
  });

  console.info('📊 Configuration:');
  console.info(`  Subreddits: ${collector['config'].subreddits?.join(', ')}`);
  console.info(`  Sort by: ${collector['config'].sortBy}`);
  console.info(`  Limit: ${collector['config'].limit}\n`);

  try {
    console.info('🔄 Collecting Reddit posts...\n');

    // Сбор постов
    const posts = await collector.collect();

    console.info(`\n✅ Collected ${posts.length} posts\n`);

    // Вывод примеров постов
    if (posts.length > 0) {
      console.info('📝 Sample posts:\n');
      posts.slice(0, 3).forEach((post, index) => {
        console.info(`${index + 1}. u/${post.author}`);
        console.info(`   Content: ${post.content.substring(0, 100)}...`);
        console.info(`   Engagement: ⬆️ ${post.engagement.likes} | 💬 ${post.engagement.comments}`);
        console.info(`   URL: ${post.url}`);
        console.info(`   Timestamp: ${post.timestamp.toISOString()}\n`);
      });
    }

    // Статистика
    const stats = collector.getStats();
    console.info('📈 Statistics:');
    console.info(`  Platform: ${stats.platform}`);
    console.info(`  Cached posts: ${stats.cachedPosts}`);

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
