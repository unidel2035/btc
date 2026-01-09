/**
 * Database types and interfaces
 */

// News article from various sources
export interface News {
  id: string;
  source: string;
  title: string;
  content: string;
  url: string;
  published_at: Date;
  collected_at: Date;
  sentiment: number | null;
  impact: 'low' | 'medium' | 'high' | null;
  processed: boolean;
}

// Social media post
export interface SocialPost {
  id: string;
  platform: 'twitter' | 'reddit' | 'telegram';
  author: string;
  content: string;
  engagement: {
    likes?: number;
    retweets?: number;
    comments?: number;
    upvotes?: number;
  };
  sentiment: number | null;
  timestamp: Date;
  url: string | null;
}

// Trading signal
export interface Signal {
  id: string;
  type: string;
  source: string;
  symbol: string;
  direction: 'long' | 'short';
  strength: number;
  data: Record<string, any>;
  created_at: Date;
}

// Trade/position
export interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  quantity: number;
  price: number;
  status: 'pending' | 'open' | 'closed' | 'cancelled';
  strategy: string;
  signal_id: string | null;
  pnl: number | null;
  opened_at: Date;
  closed_at: Date | null;
}

// OHLCV candle data
export interface Candle {
  symbol: string;
  interval: string;
  open_time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Database configuration
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

// Redis configuration
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
}

// Migration interface
export interface Migration {
  id: string;
  name: string;
  executed_at: Date;
}
