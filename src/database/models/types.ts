/**
 * Database model types
 */

/**
 * News model
 */
export interface NewsModel {
  id: string;
  source: string;
  title: string;
  content: string;
  url: string;
  published_at: Date;
  collected_at: Date;
  sentiment: number | null;
  impact: string | null;
  processed: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Social post model
 */
export interface SocialPostModel {
  id: string;
  platform: string;
  author: string;
  content: string;
  engagement: {
    likes?: number;
    retweets?: number;
    comments?: number;
    views?: number;
  } | null;
  sentiment: number | null;
  timestamp: Date;
  url: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Signal model
 */
export interface SignalModel {
  id: string;
  type: string;
  source: string;
  symbol: string;
  direction: 'long' | 'short';
  strength: number;
  data: Record<string, any> | null;
  created_at: Date;
}

/**
 * Trade model
 */
export interface TradeModel {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: string;
  quantity: number;
  price: number;
  status: 'open' | 'closed' | 'cancelled';
  strategy: string | null;
  signal_id: string | null;
  pnl: number | null;
  opened_at: Date;
  closed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Candle model
 */
export interface CandleModel {
  symbol: string;
  interval: string;
  open_time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  close_time: Date;
  quote_volume: number | null;
  trades_count: number | null;
  created_at: Date;
}

/**
 * Insert types (without auto-generated fields)
 */

export type NewsInsert = Omit<NewsModel, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type SocialPostInsert = Omit<SocialPostModel, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type SignalInsert = Omit<SignalModel, 'id' | 'created_at'> & {
  id?: string;
};

export type TradeInsert = Omit<TradeModel, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type CandleInsert = Omit<CandleModel, 'created_at'>;

/**
 * Update types (partial models)
 */

export type NewsUpdate = Partial<Omit<NewsModel, 'id' | 'created_at' | 'updated_at'>>;

export type SocialPostUpdate = Partial<
  Omit<SocialPostModel, 'id' | 'created_at' | 'updated_at'>
>;

export type SignalUpdate = Partial<Omit<SignalModel, 'id' | 'created_at'>>;

export type TradeUpdate = Partial<Omit<TradeModel, 'id' | 'created_at' | 'updated_at'>>;

export type CandleUpdate = Partial<Omit<CandleModel, 'symbol' | 'interval' | 'open_time'>>;

/**
 * Query filter types
 */

export interface NewsFilter {
  source?: string;
  processed?: boolean;
  sentiment?: {
    min?: number;
    max?: number;
  };
  published_after?: Date;
  published_before?: Date;
  search?: string;
}

export interface SocialPostFilter {
  platform?: string;
  author?: string;
  sentiment?: {
    min?: number;
    max?: number;
  };
  timestamp_after?: Date;
  timestamp_before?: Date;
}

export interface SignalFilter {
  type?: string;
  source?: string;
  symbol?: string;
  direction?: 'long' | 'short';
  strength_min?: number;
  created_after?: Date;
  created_before?: Date;
}

export interface TradeFilter {
  symbol?: string;
  status?: 'open' | 'closed' | 'cancelled';
  strategy?: string;
  signal_id?: string;
  opened_after?: Date;
  opened_before?: Date;
  closed_after?: Date;
  closed_before?: Date;
}

export interface CandleFilter {
  symbol: string;
  interval: string;
  open_time_after?: Date;
  open_time_before?: Date;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}
