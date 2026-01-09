import dotenv from 'dotenv';
import { db } from '../../database/connection';
import { NewsCollectorService } from './collector-service';
import { CollectorScheduler } from './scheduler';
import {
  CoinDeskCollector,
  CoinTelegraphCollector,
  BitcoinMagazineCollector,
} from './rss-collector';
import { TheBlockCollector, CryptoNewsCollector, DecryptCollector } from './scraper-collector';

// Load environment variables
dotenv.config();

/**
 * Initialize and run news collector
 */
async function main() {
  try {
    console.log('=== BTC Trading Bot - News Collector ===\n');

    // Connect to database
    console.log('Connecting to database...');
    await db.connect();

    // Run migrations
    console.log('Running database migrations...');
    await db.migrate();

    // Initialize collectors
    const debug = process.env.DEBUG === 'true';
    const collectors = [
      new CoinDeskCollector(debug),
      new CoinTelegraphCollector(debug),
      new BitcoinMagazineCollector(debug),
      new TheBlockCollector(debug),
      new CryptoNewsCollector(debug),
      new DecryptCollector(debug),
    ];

    console.log(`Initialized ${collectors.length} collectors\n`);

    // Create service
    const service = new NewsCollectorService(collectors, debug);

    // Check if we should run once or schedule
    const runOnce = process.env.RUN_ONCE === 'true';
    const intervalMinutes = parseInt(process.env.COLLECTION_INTERVAL || '5');

    if (runOnce) {
      console.log('Running collection once...\n');
      const result = await service.collectAll();
      console.log('\nCollection complete!');
      console.log(`Total: ${result.total}, Stored: ${result.stored}, Duplicates: ${result.duplicates}`);
      await db.close();
      process.exit(0);
    } else {
      console.log(`Starting scheduler (every ${intervalMinutes} minutes)...\n`);
      const scheduler = new CollectorScheduler(service, intervalMinutes);
      scheduler.start();

      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\nShutting down gracefully...');
        scheduler.stop();
        await db.close();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        console.log('\nShutting down gracefully...');
        scheduler.stop();
        await db.close();
        process.exit(0);
      });
    }
  } catch (error) {
    console.error('Fatal error:', error);
    await db.close();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { NewsCollectorService, CollectorScheduler };
export * from './rss-collector';
export * from './scraper-collector';
export * from './base-collector';
