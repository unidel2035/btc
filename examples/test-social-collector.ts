/**
 * Пример использования коллектора социальных сетей
 *
 * Запуск: tsx examples/test-social-collector.ts
 */

import { config } from 'dotenv';
import { SocialCollectorManager } from '../src/collectors/social/index.js';

config();

async function main(): Promise<void> {
  console.info('🧪 Testing Social Collector Manager\n');

  try {
    // Создание менеджера коллекторов
    const manager = new SocialCollectorManager();

    // Подписка на новые посты
    let postCount = 0;
    manager.subscribe((post) => {
      postCount++;
      console.info(`\n[${postCount}] New post from ${post.platform.toUpperCase()}`);
      console.info(`  Author: @${post.author}`);
      if (post.authorFollowers) {
        console.info(`  Followers: ${post.authorFollowers.toLocaleString()}`);
      }
      console.info(`  Content: ${post.content.substring(0, 150)}${post.content.length > 150 ? '...' : ''}`);
      console.info(
        `  Engagement: ${post.engagement.likes} likes, ${post.engagement.comments} comments, ${post.engagement.shares} shares`,
      );
      console.info(`  URL: ${post.url}`);
      console.info(`  Timestamp: ${post.timestamp.toISOString()}`);
    });

    // Запуск менеджера
    console.info('Starting social collectors...\n');
    await manager.start();

    // Вывод статуса
    const status = manager.getStatus();
    console.info('\nCollector Status:');
    for (const [name, isRunning] of Object.entries(status)) {
      console.info(`  ${name}: ${isRunning ? '✓ Running' : '✗ Not running'}`);
    }

    // Получение существующих постов
    console.info('\nFetching recent posts...\n');
    const posts = await manager.fetchAllPosts(10);
    console.info(`Found ${posts.length} recent posts\n`);

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i]!;
      console.info(`${i + 1}. [${post.platform}] @${post.author}: ${post.content.substring(0, 80)}...`);
    }

    // Ожидание новых постов (30 секунд для теста)
    console.info('\nListening for new posts for 30 seconds...');
    console.info('Press Ctrl+C to stop\n');

    await new Promise((resolve) => setTimeout(resolve, 30000));

    // Остановка менеджера
    console.info('\n\nStopping collectors...');
    await manager.stop();

    console.info(`\n✅ Test completed. Total posts received: ${postCount}`);
  } catch (error) {
    console.error('Error during test:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.info('\n\n👋 Interrupted. Exiting...');
  process.exit(0);
});

main().catch((error: Error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
