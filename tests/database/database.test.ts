/**
 * Database integration tests
 *
 * These tests require PostgreSQL and Redis to be running.
 * Run with: npm run test:database
 */

import { postgres, redis } from '../../src/database/index.js';
import { NewsRepository, SignalRepository, TradeRepository, CandleRepository } from '../../src/database/index.js';

/**
 * Setup test database connection
 */
async function setupDatabase() {
  console.log('Connecting to test database...');

  try {
    await postgres.connect();
    await redis.connect();
    console.log('✓ Database connections established');
  } catch (error) {
    console.error('✗ Failed to connect to database:', error);
    throw error;
  }
}

/**
 * Cleanup test database connection
 */
async function cleanupDatabase() {
  console.log('Cleaning up database connections...');

  try {
    await postgres.disconnect();
    await redis.disconnect();
    console.log('✓ Database connections closed');
  } catch (error) {
    console.error('✗ Failed to disconnect from database:', error);
  }
}

/**
 * Test PostgreSQL connection
 */
async function testPostgresConnection() {
  console.log('\n=== Testing PostgreSQL Connection ===');

  try {
    const result = await postgres.query('SELECT NOW() as current_time');
    console.log('✓ PostgreSQL connection successful');
    console.log('  Current time:', result.rows[0].current_time);

    const stats = postgres.getStats();
    console.log('  Pool stats:', stats);
  } catch (error) {
    console.error('✗ PostgreSQL connection failed:', error);
    throw error;
  }
}

/**
 * Test Redis connection
 */
async function testRedisConnection() {
  console.log('\n=== Testing Redis Connection ===');

  try {
    await redis.set('test_key', 'test_value', 10);
    const value = await redis.get('test_key');

    if (value === 'test_value') {
      console.log('✓ Redis connection successful');
      console.log('  Set and get operations working');
    } else {
      throw new Error('Redis get/set operations failed');
    }

    await redis.delete('test_key');
    console.log('✓ Redis delete operation successful');
  } catch (error) {
    console.error('✗ Redis connection failed:', error);
    throw error;
  }
}

/**
 * Test NewsRepository
 */
async function testNewsRepository() {
  console.log('\n=== Testing NewsRepository ===');

  try {
    // Create a test news item
    const newsData = {
      source: 'test_source',
      title: 'Test News Title',
      content: 'Test news content for database testing',
      url: `https://test.com/news-${Date.now()}`,
      published_at: new Date(),
      collected_at: new Date(),
      sentiment: 0.75,
      impact: 'high',
      processed: false,
    };

    const created = await NewsRepository.create(newsData);
    console.log('✓ Created news item:', created.id);

    // Find by ID
    const found = await NewsRepository.findById(created.id);
    if (found && found.id === created.id) {
      console.log('✓ Found news item by ID');
    } else {
      throw new Error('Failed to find news by ID');
    }

    // Update news
    const updated = await NewsRepository.update(created.id, { processed: true });
    if (updated && updated.processed === true) {
      console.log('✓ Updated news item');
    } else {
      throw new Error('Failed to update news');
    }

    // Get recent news
    const recent = await NewsRepository.getRecent(10);
    console.log('✓ Retrieved recent news:', recent.length, 'items');

    // Count news
    const count = await NewsRepository.count();
    console.log('✓ Total news count:', count);

    // Delete news
    const deleted = await NewsRepository.delete(created.id);
    if (deleted) {
      console.log('✓ Deleted news item');
    } else {
      throw new Error('Failed to delete news');
    }
  } catch (error) {
    console.error('✗ NewsRepository test failed:', error);
    throw error;
  }
}

/**
 * Test SignalRepository
 */
async function testSignalRepository() {
  console.log('\n=== Testing SignalRepository ===');

  try {
    // Create a test signal
    const signalData = {
      type: 'news_momentum',
      source: 'sentiment_analyzer',
      symbol: 'BTCUSDT',
      direction: 'long' as const,
      strength: 0.85,
      data: {
        sentiment: 0.85,
        confidence: 0.9,
      },
    };

    const created = await SignalRepository.create(signalData);
    console.log('✓ Created signal:', created.id);

    // Find by ID
    const found = await SignalRepository.findById(created.id);
    if (found && found.id === created.id) {
      console.log('✓ Found signal by ID');
    } else {
      throw new Error('Failed to find signal by ID');
    }

    // Get signals by symbol
    const bySymbol = await SignalRepository.getBySymbol('BTCUSDT', 10);
    console.log('✓ Retrieved signals by symbol:', bySymbol.length, 'items');

    // Get strong signals
    const strongSignals = await SignalRepository.getStrongSignals(0.7, 10);
    console.log('✓ Retrieved strong signals:', strongSignals.length, 'items');

    // Delete signal
    const deleted = await SignalRepository.delete(created.id);
    if (deleted) {
      console.log('✓ Deleted signal');
    } else {
      throw new Error('Failed to delete signal');
    }
  } catch (error) {
    console.error('✗ SignalRepository test failed:', error);
    throw error;
  }
}

/**
 * Test TradeRepository
 */
async function testTradeRepository() {
  console.log('\n=== Testing TradeRepository ===');

  try {
    // Create a test trade
    const tradeData = {
      symbol: 'BTCUSDT',
      side: 'buy' as const,
      type: 'market',
      quantity: 0.001,
      price: 45000,
      status: 'open' as const,
      strategy: 'news_momentum',
      signal_id: null,
      pnl: null,
      opened_at: new Date(),
      closed_at: null,
    };

    const created = await TradeRepository.create(tradeData);
    console.log('✓ Created trade:', created.id);

    // Find by ID
    const found = await TradeRepository.findById(created.id);
    if (found && found.id === created.id) {
      console.log('✓ Found trade by ID');
    } else {
      throw new Error('Failed to find trade by ID');
    }

    // Get open trades
    const openTrades = await TradeRepository.getOpen(10);
    console.log('✓ Retrieved open trades:', openTrades.length, 'items');

    // Close trade
    const closed = await TradeRepository.close(created.id, 100.50);
    if (closed && closed.status === 'closed' && closed.pnl === 100.50) {
      console.log('✓ Closed trade with PnL');
    } else {
      throw new Error('Failed to close trade');
    }

    // Get trade statistics
    const stats = await TradeRepository.getStats({ symbol: 'BTCUSDT' });
    console.log('✓ Trade statistics:', stats);

    // Delete trade
    const deleted = await TradeRepository.delete(created.id);
    if (deleted) {
      console.log('✓ Deleted trade');
    } else {
      throw new Error('Failed to delete trade');
    }
  } catch (error) {
    console.error('✗ TradeRepository test failed:', error);
    throw error;
  }
}

/**
 * Test CandleRepository
 */
async function testCandleRepository() {
  console.log('\n=== Testing CandleRepository ===');

  try {
    // Create a test candle
    const openTime = new Date();
    const closeTime = new Date(openTime.getTime() + 60000); // 1 minute later

    const candleData = {
      symbol: 'BTCUSDT',
      interval: '1m',
      open_time: openTime,
      open: 45000,
      high: 45100,
      low: 44900,
      close: 45050,
      volume: 10.5,
      close_time: closeTime,
      quote_volume: 472500,
      trades_count: 150,
    };

    const created = await CandleRepository.create(candleData);
    console.log('✓ Created candle:', created.symbol, created.interval);

    // Find candle
    const found = await CandleRepository.findOne('BTCUSDT', '1m', openTime);
    if (found && found.open === 45000) {
      console.log('✓ Found candle');
    } else {
      throw new Error('Failed to find candle');
    }

    // Get recent candles
    const recent = await CandleRepository.getRecent('BTCUSDT', '1m', 10);
    console.log('✓ Retrieved recent candles:', recent.length, 'items');

    // Get latest candle
    const latest = await CandleRepository.getLatest('BTCUSDT', '1m');
    if (latest) {
      console.log('✓ Retrieved latest candle');
    }

    // Delete candle
    const deleted = await CandleRepository.delete('BTCUSDT', '1m', openTime);
    if (deleted) {
      console.log('✓ Deleted candle');
    } else {
      throw new Error('Failed to delete candle');
    }
  } catch (error) {
    console.error('✗ CandleRepository test failed:', error);
    throw error;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('Starting database tests...\n');

  try {
    await setupDatabase();

    await testPostgresConnection();
    await testRedisConnection();
    await testNewsRepository();
    await testSignalRepository();
    await testTradeRepository();
    await testCandleRepository();

    console.log('\n✓ All tests passed successfully!');
  } catch (error) {
    console.error('\n✗ Tests failed:', error);
    process.exit(1);
  } finally {
    await cleanupDatabase();
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
