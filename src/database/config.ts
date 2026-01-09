import dotenv from 'dotenv';

dotenv.config();

/**
 * Database configuration
 */
export const config = {
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'btc_trading_bot',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    maxConnections: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20', 10),
    idleTimeout: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000', 10),
    connectionTimeout: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '10000', 10),
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
};

/**
 * Redis key prefixes for different data types
 */
export const REDIS_KEYS = {
  // Price cache
  PRICE: (symbol: string) => `price:${symbol}`,
  PRICES: 'prices:*',

  // Rate limiting
  RATE_LIMIT: (identifier: string, action: string) => `ratelimit:${action}:${identifier}`,
  RATE_LIMITS: 'ratelimit:*',

  // Market data cache
  CANDLE: (symbol: string, interval: string, timestamp: number) =>
    `candle:${symbol}:${interval}:${timestamp}`,
  CANDLES: (symbol: string, interval: string) => `candle:${symbol}:${interval}:*`,

  // Orderbook cache
  ORDERBOOK: (symbol: string) => `orderbook:${symbol}`,
  ORDERBOOKS: 'orderbook:*',

  // Signal cache
  SIGNAL: (id: string) => `signal:${id}`,
  SIGNALS: 'signal:*',

  // Session data
  SESSION: (id: string) => `session:${id}`,
  SESSIONS: 'session:*',

  // Queue tracking
  QUEUE: (name: string) => `queue:${name}`,
  QUEUES: 'queue:*',

  // Locks
  LOCK: (resource: string) => `lock:${resource}`,
  LOCKS: 'lock:*',
};

/**
 * Cache TTL values (in seconds)
 */
export const CACHE_TTL = {
  // Price data
  PRICE_REALTIME: 5, // 5 seconds for real-time prices
  PRICE_MINUTE: 60, // 1 minute for minute data
  PRICE_HOUR: 3600, // 1 hour for hourly data

  // Market data
  CANDLE_1M: 60, // 1 minute
  CANDLE_5M: 300, // 5 minutes
  CANDLE_15M: 900, // 15 minutes
  CANDLE_1H: 3600, // 1 hour
  CANDLE_4H: 14400, // 4 hours
  CANDLE_1D: 86400, // 1 day

  // Orderbook
  ORDERBOOK: 10, // 10 seconds

  // Signals
  SIGNAL: 3600, // 1 hour

  // Session
  SESSION: 86400, // 1 day

  // Rate limiting windows
  RATE_LIMIT_MINUTE: 60,
  RATE_LIMIT_HOUR: 3600,
  RATE_LIMIT_DAY: 86400,
};
