/**
 * Database seed script for development/testing
 */

import postgres from './postgres.js';

/**
 * Seed sample data for development
 */
async function seedDatabase(): Promise<void> {
  console.log('Seeding database with sample data...\n');

  try {
    await postgres.connect();

    // Sample news articles
    console.log('Seeding news articles...');
    await postgres.query(`
      INSERT INTO news (source, title, content, url, published_at, sentiment, impact, processed)
      VALUES
        ('coindesk', 'Bitcoin Reaches New All-Time High', 'Bitcoin has reached a new all-time high of $100,000...', 'https://example.com/btc-ath', NOW() - INTERVAL '1 hour', 0.85, 'high', true),
        ('cointelegraph', 'Ethereum Upgrade Successful', 'The latest Ethereum upgrade has been successfully implemented...', 'https://example.com/eth-upgrade', NOW() - INTERVAL '2 hours', 0.72, 'medium', true),
        ('theblock', 'Regulatory Concerns in Crypto Market', 'New regulatory challenges emerge for cryptocurrency exchanges...', 'https://example.com/regulation', NOW() - INTERVAL '3 hours', -0.45, 'high', true)
      ON CONFLICT (url) DO NOTHING
    `);

    // Sample social posts
    console.log('Seeding social posts...');
    await postgres.query(`
      INSERT INTO social_posts (platform, author, content, engagement, sentiment, timestamp, url)
      VALUES
        ('twitter', 'crypto_trader', 'Bitcoin looking bullish! 🚀', '{"likes": 1250, "retweets": 320}', 0.78, NOW() - INTERVAL '30 minutes', 'https://twitter.com/example/1'),
        ('reddit', 'btc_enthusiast', 'Just bought the dip, feeling confident', '{"upvotes": 450, "comments": 89}', 0.65, NOW() - INTERVAL '45 minutes', 'https://reddit.com/r/example/1'),
        ('twitter', 'market_analyst', 'Bearish signals on the hourly chart', '{"likes": 890, "retweets": 210}', -0.55, NOW() - INTERVAL '1 hour', 'https://twitter.com/example/2')
    `);

    // Sample signals
    console.log('Seeding trading signals...');
    await postgres.query(`
      INSERT INTO signals (type, source, symbol, direction, strength, data, created_at)
      VALUES
        ('news_momentum', 'sentiment_analyzer', 'BTCUSDT', 'long', 0.82, '{"reason": "positive news sentiment", "confidence": 0.82}', NOW() - INTERVAL '20 minutes'),
        ('technical', 'ma_crossover', 'ETHUSDT', 'long', 0.65, '{"indicator": "MA50/MA200 golden cross"}', NOW() - INTERVAL '30 minutes'),
        ('sentiment', 'social_analyzer', 'BTCUSDT', 'short', 0.48, '{"reason": "negative social sentiment"}', NOW() - INTERVAL '40 minutes')
    `);

    // Sample trades
    console.log('Seeding trades...');
    const signalsResult = await postgres.query<{ id: string }>(`
      SELECT id FROM signals ORDER BY created_at DESC LIMIT 1
    `);

    if (signalsResult.rows.length > 0 && signalsResult.rows[0]) {
      const signalId = signalsResult.rows[0].id;
      await postgres.query(
        `
        INSERT INTO trades (symbol, side, type, quantity, price, status, strategy, signal_id, opened_at)
        VALUES
          ('BTCUSDT', 'buy', 'market', 0.01, 98500.00, 'open', 'news_momentum', $1, NOW() - INTERVAL '15 minutes'),
          ('ETHUSDT', 'buy', 'limit', 0.5, 3200.00, 'open', 'sentiment_swing', NULL, NOW() - INTERVAL '25 minutes')
      `,
        [signalId],
      );
    }

    // Sample candles (OHLCV data)
    console.log('Seeding candle data...');
    const now = new Date();
    for (let i = 10; i >= 0; i--) {
      const openTime = new Date(now.getTime() - i * 60000); // 1-minute candles
      const basePrice = 98000 + Math.random() * 1000;
      const open = basePrice;
      const close = basePrice + (Math.random() - 0.5) * 100;
      const high = Math.max(open, close) + Math.random() * 50;
      const low = Math.min(open, close) - Math.random() * 50;
      const volume = 10 + Math.random() * 20;

      await postgres.query(
        `
        INSERT INTO candles (symbol, interval, open_time, open, high, low, close, volume)
        VALUES ('BTCUSDT', '1m', $1, $2, $3, $4, $5, $6)
        ON CONFLICT (symbol, interval, open_time) DO NOTHING
      `,
        [openTime, open, high, low, close, volume],
      );
    }

    console.log('\n✓ Database seeded successfully');
  } catch (error) {
    console.error('✗ Seeding failed:', error);
    throw error;
  } finally {
    await postgres.disconnect();
  }
}

// Run seeding if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { seedDatabase };
