import type { PoolClient } from 'pg';

/**
 * Migration: Initial database schema
 */
export const up = async (client: PoolClient): Promise<void> => {
  await client.query(`
    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- News table
    CREATE TABLE IF NOT EXISTS news (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      source VARCHAR(50) NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      published_at TIMESTAMPTZ NOT NULL,
      collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sentiment REAL,
      impact VARCHAR(20),
      processed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Social posts table
    CREATE TABLE IF NOT EXISTS social_posts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      platform VARCHAR(20) NOT NULL,
      author VARCHAR(100) NOT NULL,
      content TEXT NOT NULL,
      engagement JSONB,
      sentiment REAL,
      timestamp TIMESTAMPTZ NOT NULL,
      url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Signals table
    CREATE TABLE IF NOT EXISTS signals (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      type VARCHAR(50) NOT NULL,
      source VARCHAR(50) NOT NULL,
      symbol VARCHAR(20) NOT NULL,
      direction VARCHAR(10) NOT NULL,
      strength REAL NOT NULL,
      data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Trades table
    CREATE TABLE IF NOT EXISTS trades (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      symbol VARCHAR(20) NOT NULL,
      side VARCHAR(10) NOT NULL,
      type VARCHAR(20) NOT NULL,
      quantity DECIMAL(20, 8) NOT NULL,
      price DECIMAL(20, 8) NOT NULL,
      status VARCHAR(20) NOT NULL,
      strategy VARCHAR(50),
      signal_id UUID REFERENCES signals(id) ON DELETE SET NULL,
      pnl DECIMAL(20, 8),
      opened_at TIMESTAMPTZ NOT NULL,
      closed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Candles (OHLCV) table
    CREATE TABLE IF NOT EXISTS candles (
      symbol VARCHAR(20) NOT NULL,
      interval VARCHAR(10) NOT NULL,
      open_time TIMESTAMPTZ NOT NULL,
      open DECIMAL(20, 8) NOT NULL,
      high DECIMAL(20, 8) NOT NULL,
      low DECIMAL(20, 8) NOT NULL,
      close DECIMAL(20, 8) NOT NULL,
      volume DECIMAL(20, 8) NOT NULL,
      close_time TIMESTAMPTZ NOT NULL,
      quote_volume DECIMAL(20, 8),
      trades_count INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (symbol, interval, open_time)
    );

    -- Indexes for news table
    CREATE INDEX IF NOT EXISTS idx_news_source ON news(source);
    CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_news_collected_at ON news(collected_at DESC);
    CREATE INDEX IF NOT EXISTS idx_news_processed ON news(processed) WHERE processed = FALSE;
    CREATE INDEX IF NOT EXISTS idx_news_sentiment ON news(sentiment) WHERE sentiment IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_news_title_content ON news
      USING gin(to_tsvector('english', title || ' ' || content));

    -- Indexes for social_posts table
    CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_posts(platform);
    CREATE INDEX IF NOT EXISTS idx_social_posts_author ON social_posts(author);
    CREATE INDEX IF NOT EXISTS idx_social_posts_timestamp ON social_posts(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_social_posts_sentiment ON social_posts(sentiment)
      WHERE sentiment IS NOT NULL;

    -- Indexes for signals table
    CREATE INDEX IF NOT EXISTS idx_signals_type ON signals(type);
    CREATE INDEX IF NOT EXISTS idx_signals_source ON signals(source);
    CREATE INDEX IF NOT EXISTS idx_signals_symbol ON signals(symbol);
    CREATE INDEX IF NOT EXISTS idx_signals_direction ON signals(direction);
    CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_signals_strength ON signals(strength DESC);

    -- Indexes for trades table
    CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
    CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
    CREATE INDEX IF NOT EXISTS idx_trades_strategy ON trades(strategy);
    CREATE INDEX IF NOT EXISTS idx_trades_signal_id ON trades(signal_id);
    CREATE INDEX IF NOT EXISTS idx_trades_opened_at ON trades(opened_at DESC);
    CREATE INDEX IF NOT EXISTS idx_trades_closed_at ON trades(closed_at DESC)
      WHERE closed_at IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_trades_pnl ON trades(pnl DESC) WHERE pnl IS NOT NULL;

    -- Indexes for candles table
    CREATE INDEX IF NOT EXISTS idx_candles_symbol_interval ON candles(symbol, interval);
    CREATE INDEX IF NOT EXISTS idx_candles_open_time ON candles(open_time DESC);

    -- Trigger to update updated_at timestamp
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    -- Apply update trigger to tables
    CREATE TRIGGER update_news_updated_at BEFORE UPDATE ON news
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_social_posts_updated_at BEFORE UPDATE ON social_posts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON trades
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);

  console.log('Migration 001: Initial schema created successfully');
};

/**
 * Rollback migration
 */
export const down = async (client: PoolClient): Promise<void> => {
  await client.query(`
    -- Drop triggers
    DROP TRIGGER IF EXISTS update_news_updated_at ON news;
    DROP TRIGGER IF EXISTS update_social_posts_updated_at ON social_posts;
    DROP TRIGGER IF EXISTS update_trades_updated_at ON trades;

    -- Drop function
    DROP FUNCTION IF EXISTS update_updated_at_column();

    -- Drop tables in reverse order (respect foreign keys)
    DROP TABLE IF EXISTS candles;
    DROP TABLE IF EXISTS trades;
    DROP TABLE IF EXISTS signals;
    DROP TABLE IF EXISTS social_posts;
    DROP TABLE IF EXISTS news;
  `);

  console.log('Migration 001: Initial schema rolled back successfully');
};
