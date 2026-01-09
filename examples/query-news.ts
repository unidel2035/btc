/**
 * Example: Querying collected news
 */

import dotenv from 'dotenv';
import { db } from '../src/database/connection';
import { newsRepository } from '../src/database/repository';

dotenv.config();

async function main() {
  try {
    console.log('=== News Query Example ===\n');

    // Connect to database
    await db.connect();

    // Get recent news
    console.log('Fetching 10 most recent news items...\n');
    const recentNews = await newsRepository.findRecent(10);

    recentNews.forEach((item, index) => {
      console.log(`${index + 1}. [${item.source}] ${item.title}`);
      console.log(`   URL: ${item.url}`);
      console.log(`   Published: ${item.publishedAt.toISOString()}`);
      console.log(`   Tags: ${item.tags.join(', ')}`);
      console.log('');
    });

    // Query by source
    console.log('\n--- News from CoinDesk ---\n');
    const coinDeskNews = await newsRepository.findBySource('CoinDesk', 5);
    coinDeskNews.forEach((item, index) => {
      console.log(`${index + 1}. ${item.title}`);
    });

    // Query by tags
    console.log('\n--- News tagged with "bitcoin" ---\n');
    const bitcoinNews = await newsRepository.findByTags(['bitcoin'], 5);
    bitcoinNews.forEach((item, index) => {
      console.log(`${index + 1}. [${item.source}] ${item.title}`);
    });

    // Get statistics
    const total = await newsRepository.count();
    console.log(`\n--- Statistics ---`);
    console.log(`Total news items in database: ${total}`);

    // Close connection
    await db.close();
    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error);
    await db.close();
    process.exit(1);
  }
}

main();
