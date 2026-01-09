-- Initial database schema for BTC Trading Bot
-- Migration: 001_initial_schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Migrations tracking table
CREATE TABLE IF NOT EXISTS migrations (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  executed_at TIMESTAMP DEFAULT NOW()
);

-- News articles
CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  published_at TIMESTAMP NOT NULL,
  collected_at TIMESTAMP DEFAULT NOW(),
  sentiment FLOAT,
  impact VARCHAR(20),
  processed BOOLEAN DEFAULT FALSE,
  CONSTRAINT news_impact_check CHECK (impact IN ('low', 'medium', 'high'))
);

-- Create index for frequent queries on news
CREATE INDEX IF NOT EXISTS idx_news_source ON news(source);
CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_processed ON news(processed);
CREATE INDEX IF NOT EXISTS idx_news_sentiment ON news(sentiment);
CREATE INDEX IF NOT EXISTS idx_news_collected_at ON news(collected_at DESC);

-- Social media posts
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform VARCHAR(20) NOT NULL,
  author VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  engagement JSONB,
  sentiment FLOAT,
  timestamp TIMESTAMP NOT NULL,
  url TEXT,
  CONSTRAINT social_posts_platform_check CHECK (platform IN ('twitter', 'reddit', 'telegram'))
);

-- Create index for social posts
CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_posts(platform);
CREATE INDEX IF NOT EXISTS idx_social_posts_timestamp ON social_posts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_sentiment ON social_posts(sentiment);
CREATE INDEX IF NOT EXISTS idx_social_posts_author ON social_posts(author);

-- Trading signals
CREATE TABLE IF NOT EXISTS signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL,
  source VARCHAR(50) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  direction VARCHAR(10) NOT NULL,
  strength FLOAT NOT NULL,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT signals_direction_check CHECK (direction IN ('long', 'short')),
  CONSTRAINT signals_strength_check CHECK (strength >= 0 AND strength <= 1)
);

-- Create index for signals
CREATE INDEX IF NOT EXISTS idx_signals_symbol ON signals(symbol);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_type ON signals(type);
CREATE INDEX IF NOT EXISTS idx_signals_source ON signals(source);
CREATE INDEX IF NOT EXISTS idx_signals_strength ON signals(strength DESC);

-- Trades
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol VARCHAR(20) NOT NULL,
  side VARCHAR(10) NOT NULL,
  type VARCHAR(20) NOT NULL,
  quantity DECIMAL(20, 8) NOT NULL,
  price DECIMAL(20, 8) NOT NULL,
  status VARCHAR(20) NOT NULL,
  strategy VARCHAR(50) NOT NULL,
  signal_id UUID REFERENCES signals(id),
  pnl DECIMAL(20, 8),
  opened_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP,
  CONSTRAINT trades_side_check CHECK (side IN ('buy', 'sell')),
  CONSTRAINT trades_type_check CHECK (type IN ('market', 'limit', 'stop', 'stop_limit')),
  CONSTRAINT trades_status_check CHECK (status IN ('pending', 'open', 'closed', 'cancelled')),
  CONSTRAINT trades_quantity_check CHECK (quantity > 0),
  CONSTRAINT trades_price_check CHECK (price > 0)
);

-- Create index for trades
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_opened_at ON trades(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_closed_at ON trades(closed_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_strategy ON trades(strategy);
CREATE INDEX IF NOT EXISTS idx_trades_signal_id ON trades(signal_id);

-- OHLCV Candles
CREATE TABLE IF NOT EXISTS candles (
  symbol VARCHAR(20) NOT NULL,
  interval VARCHAR(10) NOT NULL,
  open_time TIMESTAMP NOT NULL,
  open DECIMAL(20, 8) NOT NULL,
  high DECIMAL(20, 8) NOT NULL,
  low DECIMAL(20, 8) NOT NULL,
  close DECIMAL(20, 8) NOT NULL,
  volume DECIMAL(20, 8) NOT NULL,
  PRIMARY KEY (symbol, interval, open_time),
  CONSTRAINT candles_ohlc_check CHECK (
    high >= open AND
    high >= close AND
    high >= low AND
    low <= open AND
    low <= close
  ),
  CONSTRAINT candles_volume_check CHECK (volume >= 0)
);

-- Create index for candles
CREATE INDEX IF NOT EXISTS idx_candles_symbol_interval ON candles(symbol, interval);
CREATE INDEX IF NOT EXISTS idx_candles_open_time ON candles(open_time DESC);

-- Record this migration
INSERT INTO migrations (id, name, executed_at)
VALUES ('001', '001_initial_schema', NOW())
ON CONFLICT (id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE news IS 'News articles from various sources';
COMMENT ON TABLE social_posts IS 'Social media posts from Twitter, Reddit, Telegram';
COMMENT ON TABLE signals IS 'Trading signals generated from various sources';
COMMENT ON TABLE trades IS 'Trading positions and their status';
COMMENT ON TABLE candles IS 'OHLCV candlestick data for technical analysis';
