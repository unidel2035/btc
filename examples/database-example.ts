/**
 * Database usage example
 * Demonstrates PostgreSQL and Redis operations
 */

import 'dotenv/config';
import { postgres, redis } from '../src/database/index.js';

async function demonstratePostgreSQL() {
  console.log('=== PostgreSQL Examples ===\n');

  try {
    // Connect to database
    console.log('Connecting to PostgreSQL...');
    await postgres.connect();
    console.log('✓ Connected\n');

    // Test connection
    const isConnected = await postgres.testConnection();
    console.log(`Connection test: ${isConnected ? '✓ OK' : '✗ Failed'}\n`);

    // Example 1: Query news articles
    console.log('1. Fetching latest news articles...');
    const newsResult = await postgres.query(`
      SELECT id, source, title, sentiment, published_at
      FROM news
      ORDER BY published_at DESC
      LIMIT 5
    `);
    console.log(`Found ${newsResult.rows.length} articles:`);
    newsResult.rows.forEach((row) => {
      console.log(`  - [${row.source}] ${row.title}`);
    });
    console.log();

    // Example 2: Query with parameters
    console.log('2. Finding news by source...');
    const coinDeskNews = await postgres.query(
      'SELECT COUNT(*) as count FROM news WHERE source = $1',
      ['coindesk'],
    );
    console.log(`CoinDesk articles: ${coinDeskNews.rows[0].count}\n`);

    // Example 3: Insert new signal
    console.log('3. Creating a new trading signal...');
    const signalResult = await postgres.query(
      `
      INSERT INTO signals (type, source, symbol, direction, strength, data)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, symbol, direction, strength
    `,
      [
        'technical',
        'example_script',
        'BTCUSDT',
        'long',
        0.75,
        JSON.stringify({ indicator: 'RSI oversold', value: 28 }),
      ],
    );
    console.log(
      `✓ Created signal: ${signalResult.rows[0].id} (${signalResult.rows[0].symbol} ${signalResult.rows[0].direction})\n`,
    );

    // Example 4: Transaction
    console.log('4. Performing a transaction...');
    await postgres.transaction(async (client) => {
      // Create signal
      const signal = await client.query(
        `INSERT INTO signals (type, source, symbol, direction, strength, data)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          'news_momentum',
          'example_script',
          'ETHUSDT',
          'long',
          0.82,
          JSON.stringify({ reason: 'positive news' }),
        ],
      );

      const signalId = signal.rows[0].id;

      // Create trade based on signal
      await client.query(
        `INSERT INTO trades (symbol, side, type, quantity, price, status, strategy, signal_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['ETHUSDT', 'buy', 'market', 0.5, 3250.0, 'open', 'news_momentum', signalId],
      );

      console.log(`✓ Transaction completed: signal ${signalId} and trade created\n`);
    });

    // Example 5: Aggregation query
    console.log('5. Analyzing trade statistics...');
    const stats = await postgres.query(`
      SELECT
        symbol,
        COUNT(*) as total_trades,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_trades,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_trades
      FROM trades
      GROUP BY symbol
      ORDER BY total_trades DESC
    `);
    console.log('Trade statistics by symbol:');
    stats.rows.forEach((row) => {
      console.log(
        `  ${row.symbol}: ${row.total_trades} total (${row.open_trades} open, ${row.closed_trades} closed)`,
      );
    });
    console.log();

    // Example 6: Latest candles
    console.log('6. Fetching latest candle data...');
    const candles = await postgres.query(`
      SELECT symbol, interval, open_time, close, volume
      FROM candles
      WHERE symbol = 'BTCUSDT' AND interval = '1m'
      ORDER BY open_time DESC
      LIMIT 5
    `);
    console.log('Latest BTCUSDT 1m candles:');
    candles.rows.forEach((candle) => {
      console.log(
        `  ${candle.open_time.toISOString()}: close=${candle.close}, volume=${candle.volume}`,
      );
    });
    console.log();
  } catch (error) {
    console.error('PostgreSQL error:', error);
  } finally {
    await postgres.disconnect();
    console.log('✓ Disconnected from PostgreSQL\n');
  }
}

async function demonstrateRedis() {
  console.log('=== Redis Examples ===\n');

  try {
    // Connect to Redis
    console.log('Connecting to Redis...');
    await redis.connect();
    console.log('✓ Connected\n');

    // Test connection
    const isConnected = await redis.testConnection();
    console.log(`Connection test: ${isConnected ? '✓ OK' : '✗ Failed'}\n`);

    // Example 1: Simple key-value
    console.log('1. Setting and getting simple values...');
    await redis.set('example:price', '98500');
    const price = await redis.get('example:price');
    console.log(`Price: $${price}\n`);

    // Example 2: JSON storage
    console.log('2. Storing and retrieving JSON objects...');
    const tradeData = {
      symbol: 'BTCUSDT',
      side: 'buy',
      quantity: 0.01,
      price: 98500,
      timestamp: new Date().toISOString(),
    };
    await redis.setJSON('example:trade:123', tradeData, 300); // TTL 5 minutes
    const retrievedTrade = await redis.getJSON('example:trade:123');
    console.log('Stored trade:', retrievedTrade);
    console.log();

    // Example 3: TTL management
    console.log('3. Managing TTL...');
    await redis.set('example:temp', 'temporary data', 60); // 60 seconds TTL
    const ttl = await redis.ttl('example:temp');
    console.log(`TTL for temporary data: ${ttl} seconds\n`);

    // Example 4: Counters
    console.log('4. Using counters...');
    await redis.set('example:counter', '0');
    await redis.incr('example:counter');
    await redis.incr('example:counter');
    await redis.incr('example:counter');
    const counter = await redis.get('example:counter');
    console.log(`Counter value: ${counter}\n`);

    // Example 5: Rate limiting
    console.log('5. Rate limiting example...');
    const userId = 'user:123';
    const limit = 10; // 10 requests
    const window = 60; // per 60 seconds

    for (let i = 1; i <= 12; i++) {
      const allowed = await redis.checkRateLimit(userId, limit, window);
      console.log(`  Request ${i}: ${allowed ? '✓ Allowed' : '✗ Rate limit exceeded'}`);
    }
    console.log();

    // Example 6: Caching prices
    console.log('6. Caching market prices...');
    const prices = {
      BTCUSDT: 98500,
      ETHUSDT: 3250,
      SOLUSDT: 145,
    };

    for (const [symbol, price] of Object.entries(prices)) {
      await redis.set(`price:${symbol}`, price.toString(), 30);
    }

    console.log('Cached prices (30s TTL):');
    for (const symbol of Object.keys(prices)) {
      const cachedPrice = await redis.get(`price:${symbol}`);
      console.log(`  ${symbol}: $${cachedPrice}`);
    }
    console.log();

    // Example 7: Check existence
    console.log('7. Checking key existence...');
    const exists = await redis.exists('price:BTCUSDT');
    const notExists = await redis.exists('price:INVALID');
    console.log(`price:BTCUSDT exists: ${exists}`);
    console.log(`price:INVALID exists: ${notExists}\n`);

    // Example 8: Pattern matching
    console.log('8. Finding keys by pattern...');
    const priceKeys = await redis.keys('price:*');
    console.log(`Found ${priceKeys.length} price keys:`, priceKeys);
    console.log();

    // Example 9: Delete operations
    console.log('9. Deleting keys...');
    const deleted = await redis.del('example:temp');
    console.log(`Deleted ${deleted} key(s)\n`);

    // Cleanup example keys
    console.log('Cleaning up example keys...');
    const exampleKeys = await redis.keys('example:*');
    if (exampleKeys.length > 0) {
      const deletedCount = await redis.delMany(exampleKeys);
      console.log(`Deleted ${deletedCount} example key(s)\n`);
    }
  } catch (error) {
    console.error('Redis error:', error);
  } finally {
    await redis.disconnect();
    console.log('✓ Disconnected from Redis\n');
  }
}

async function main() {
  console.log('Database Examples\n');
  console.log('=====================================\n');

  await demonstratePostgreSQL();
  await demonstrateRedis();

  console.log('=====================================');
  console.log('All examples completed!');
}

// Run examples
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
