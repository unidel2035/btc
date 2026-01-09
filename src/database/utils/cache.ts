import { redis } from '../redis.js';
import { REDIS_KEYS, CACHE_TTL } from '../config.js';

/**
 * Price data structure
 */
export interface PriceData {
  symbol: string;
  price: number;
  timestamp: number;
  volume24h?: number;
  change24h?: number;
}

/**
 * Candle data structure
 */
export interface CandleData {
  symbol: string;
  interval: string;
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

/**
 * Orderbook data structure
 */
export interface OrderbookData {
  symbol: string;
  bids: [number, number][]; // [price, quantity]
  asks: [number, number][]; // [price, quantity]
  timestamp: number;
}

/**
 * Cache manager for market data
 */
export class CacheManager {
  /**
   * Cache current price
   */
  static async cachePrice(data: PriceData): Promise<void> {
    const key = REDIS_KEYS.PRICE(data.symbol);
    await redis.set(key, data, CACHE_TTL.PRICE_REALTIME);
  }

  /**
   * Get cached price
   */
  static async getPrice(symbol: string): Promise<PriceData | null> {
    const key = REDIS_KEYS.PRICE(symbol);
    return await redis.get<PriceData>(key);
  }

  /**
   * Cache multiple prices
   */
  static async cachePrices(prices: PriceData[]): Promise<void> {
    const client = redis.getClient();
    const pipeline = client.pipeline();

    for (const price of prices) {
      const key = REDIS_KEYS.PRICE(price.symbol);
      pipeline.setex(key, CACHE_TTL.PRICE_REALTIME, JSON.stringify(price));
    }

    await pipeline.exec();
  }

  /**
   * Get all cached prices
   */
  static async getAllPrices(): Promise<PriceData[]> {
    const client = redis.getClient();
    const keys = await client.keys(REDIS_KEYS.PRICES);

    if (keys.length === 0) return [];

    const prices: PriceData[] = [];
    for (const key of keys) {
      const price = await redis.get<PriceData>(key);
      if (price) prices.push(price);
    }

    return prices;
  }

  /**
   * Cache candle data
   */
  static async cacheCandle(data: CandleData): Promise<void> {
    const key = REDIS_KEYS.CANDLE(data.symbol, data.interval, data.openTime);
    const ttl = this.getCandleTTL(data.interval);
    await redis.set(key, data, ttl);
  }

  /**
   * Get cached candle
   */
  static async getCandle(
    symbol: string,
    interval: string,
    openTime: number,
  ): Promise<CandleData | null> {
    const key = REDIS_KEYS.CANDLE(symbol, interval, openTime);
    return await redis.get<CandleData>(key);
  }

  /**
   * Cache multiple candles
   */
  static async cacheCandles(candles: CandleData[]): Promise<void> {
    if (candles.length === 0) return;

    const client = redis.getClient();
    const pipeline = client.pipeline();

    for (const candle of candles) {
      const key = REDIS_KEYS.CANDLE(candle.symbol, candle.interval, candle.openTime);
      const ttl = this.getCandleTTL(candle.interval);
      pipeline.setex(key, ttl, JSON.stringify(candle));
    }

    await pipeline.exec();
  }

  /**
   * Get candles for a symbol and interval
   */
  static async getCandles(symbol: string, interval: string): Promise<CandleData[]> {
    const client = redis.getClient();
    const pattern = REDIS_KEYS.CANDLES(symbol, interval);
    const keys = await client.keys(pattern);

    if (keys.length === 0) return [];

    const candles: CandleData[] = [];
    for (const key of keys) {
      const candle = await redis.get<CandleData>(key);
      if (candle) candles.push(candle);
    }

    // Sort by openTime
    return candles.sort((a, b) => a.openTime - b.openTime);
  }

  /**
   * Cache orderbook
   */
  static async cacheOrderbook(data: OrderbookData): Promise<void> {
    const key = REDIS_KEYS.ORDERBOOK(data.symbol);
    await redis.set(key, data, CACHE_TTL.ORDERBOOK);
  }

  /**
   * Get cached orderbook
   */
  static async getOrderbook(symbol: string): Promise<OrderbookData | null> {
    const key = REDIS_KEYS.ORDERBOOK(symbol);
    return await redis.get<OrderbookData>(key);
  }

  /**
   * Clear all price cache
   */
  static async clearPriceCache(): Promise<void> {
    await redis.deletePattern(REDIS_KEYS.PRICES);
  }

  /**
   * Clear candle cache for symbol
   */
  static async clearCandleCache(symbol: string, interval: string): Promise<void> {
    const pattern = REDIS_KEYS.CANDLES(symbol, interval);
    await redis.deletePattern(pattern);
  }

  /**
   * Clear all orderbook cache
   */
  static async clearOrderbookCache(): Promise<void> {
    await redis.deletePattern(REDIS_KEYS.ORDERBOOKS);
  }

  /**
   * Get TTL for candle based on interval
   */
  private static getCandleTTL(interval: string): number {
    switch (interval) {
      case '1m':
        return CACHE_TTL.CANDLE_1M;
      case '5m':
        return CACHE_TTL.CANDLE_5M;
      case '15m':
        return CACHE_TTL.CANDLE_15M;
      case '1h':
        return CACHE_TTL.CANDLE_1H;
      case '4h':
        return CACHE_TTL.CANDLE_4H;
      case '1d':
        return CACHE_TTL.CANDLE_1D;
      default:
        return CACHE_TTL.CANDLE_1H;
    }
  }
}
