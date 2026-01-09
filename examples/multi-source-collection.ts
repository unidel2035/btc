/**
 * Example: Collecting news from multiple sources
 */

import dotenv from 'dotenv';
import { NewsCollectorService } from '../src/collectors/news/collector-service';
import {
  CoinDeskCollector,
  CoinTelegraphCollector,
  BitcoinMagazineCollector,
} from '../src/collectors/news/rss-collector';
import { db } from '../src/database/connection';

dotenv.config();

async function main() {
  try {
    console.log('=== Multi-Source Collection Example ===\n');

    // Connect to database
    await db.connect();
    await db.migrate();

    // Create collectors
    const collectors = [
      new CoinDeskCollector(true),
      new CoinTelegraphCollector(true),
      new BitcoinMagazineCollector(true),
    ];

    // Create service
    const service = new NewsCollectorService(collectors, true);

    // Collect from all sources
    console.log('Collecting from all sources...\n');
    const result = await service.collectAll();

    console.log('\n=== Results ===');
    console.log(`Total collected: ${result.total}`);
    console.log(`Stored: ${result.stored}`);
    console.log(`Duplicates skipped: ${result.duplicates}\n`);

    console.log('Per-source statistics:');
    result.stats.forEach((stat) => {
      console.log(`\n${stat.source}:`);
      console.log(`  Collected: ${stat.itemsCollected}`);
      console.log(`  Stored: ${stat.itemsStored}`);
      console.log(`  Duplicates: ${stat.duplicatesSkipped}`);
      console.log(`  Errors: ${stat.errors}`);
    });

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
