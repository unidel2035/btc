/**
 * Example: Basic news collection from a single source
 */

import dotenv from 'dotenv';
import { CoinDeskCollector } from '../src/collectors/news/rss-collector';
import { db } from '../src/database/connection';
import { newsRepository } from '../src/database/repository';

dotenv.config();

async function main() {
  try {
    console.log('=== Basic News Collection Example ===\n');

    // Connect to database
    await db.connect();
    await db.migrate();

    // Create collector
    const collector = new CoinDeskCollector(true); // debug mode

    // Collect news
    console.log('Collecting news from CoinDesk...\n');
    const items = await collector.collect();

    console.log(`\nCollected ${items.length} items`);
    console.log('\nFirst 3 items:');
    items.slice(0, 3).forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.title}`);
      console.log(`   URL: ${item.url}`);
      console.log(`   Published: ${item.publishedAt.toISOString()}`);
      console.log(`   Tags: ${item.tags.join(', ')}`);
    });

    // Save to database
    console.log('\nSaving to database...');
    const saved = await newsRepository.saveMany(items);
    console.log(`Saved ${saved} items to database`);

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
