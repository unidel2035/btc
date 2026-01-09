/**
 * Пример использования Telegram коллектора
 *
 * Запуск:
 *   npm run example:telegram
 */

import { config } from 'dotenv';
import { TelegramCollector } from '../src/collectors/social/index.js';

config();

async function main() {
  console.info('✈️ Telegram Collector Example\n');

  // Проверка наличия credentials
  const apiId = process.env.TELEGRAM_API_ID;
  const apiHash = process.env.TELEGRAM_API_HASH;
  const sessionString = process.env.TELEGRAM_SESSION_STRING;

  if (!apiId || !apiHash) {
    console.error('❌ Telegram credentials not found in environment variables');
    console.info('💡 Please set TELEGRAM_API_ID and TELEGRAM_API_HASH in your .env file');
    console.info('💡 For session string, you need to authenticate first using telegram library');
    process.exit(1);
  }

  // Инициализация коллектора
  const collector = new TelegramCollector({
    apiId,
    apiHash,
    sessionString,
    channels: process.env.TELEGRAM_CHANNELS?.split(',') || ['bitcoinchannel', 'cryptonews'],
    limit: parseInt(process.env.TELEGRAM_LIMIT || '20'),
  });

  console.info('📊 Configuration:');
  console.info(`  Channels: ${collector['config'].channels?.join(', ')}`);
  console.info(`  Limit: ${collector['config'].limit}\n`);

  try {
    console.info('🔄 Collecting Telegram messages...\n');

    // Подключение к Telegram
    await collector.connect();

    // Сбор сообщений
    const posts = await collector.collect();

    console.info(`\n✅ Collected ${posts.length} messages\n`);

    // Вывод примеров постов
    if (posts.length > 0) {
      console.info('📝 Sample messages:\n');
      posts.slice(0, 3).forEach((post, index) => {
        console.info(`${index + 1}. @${post.author}`);
        console.info(`   Content: ${post.content.substring(0, 100)}...`);
        console.info(`   Engagement: 🔄 ${post.engagement.likes} | 💬 ${post.engagement.comments}`);
        console.info(`   URL: ${post.url}`);
        console.info(`   Timestamp: ${post.timestamp.toISOString()}\n`);
      });
    }

    // Статистика
    const stats = collector.getStats();
    console.info('📈 Statistics:');
    console.info(`  Platform: ${stats.platform}`);
    console.info(`  Cached messages: ${stats.cachedMessages}`);

    // Отключение
    await collector.disconnect();

    console.info('\n✅ Example completed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
    await collector.disconnect();
    process.exit(1);
  }
}

main().catch((error: Error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
