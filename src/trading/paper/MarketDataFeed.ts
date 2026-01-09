/**
 * Market Data Feed for Paper Trading
 * Provides real-time or simulated market data
 */

import { MarketTick } from './types.js';

/**
 * Market data feed interface
 */
export interface IMarketDataFeed {
  /**
   * Subscribe to market data for a symbol
   */
  subscribe(symbol: string): void;

  /**
   * Unsubscribe from market data for a symbol
   */
  unsubscribe(symbol: string): void;

  /**
   * Get latest market tick for a symbol
   */
  getLatestTick(symbol: string): MarketTick | null;

  /**
   * Start the data feed
   */
  start(): Promise<void>;

  /**
   * Stop the data feed
   */
  stop(): Promise<void>;
}

/**
 * Mock market data feed for testing
 * Generates random price movements
 */
export class MockMarketDataFeed implements IMarketDataFeed {
  private subscriptions: Set<string>;
  private latestTicks: Map<string, MarketTick>;
  private intervalId?: NodeJS.Timeout;
  private isRunning: boolean;
  private basePrice: number;
  private volatility: number;

  constructor(basePrice = 50000, volatility = 0.001) {
    this.subscriptions = new Set();
    this.latestTicks = new Map();
    this.isRunning = false;
    this.basePrice = basePrice;
    this.volatility = volatility;
  }

  public subscribe(symbol: string): void {
    this.subscriptions.add(symbol);

    // Initialize with base price if not already present
    if (!this.latestTicks.has(symbol)) {
      this.latestTicks.set(symbol, this.generateInitialTick(symbol));
    }
  }

  public unsubscribe(symbol: string): void {
    this.subscriptions.delete(symbol);
  }

  public getLatestTick(symbol: string): MarketTick | null {
    return this.latestTicks.get(symbol) || null;
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Update prices every second
    this.intervalId = setInterval(() => {
      this.updatePrices();
    }, 1000);
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Generate initial tick for a symbol
   */
  private generateInitialTick(symbol: string): MarketTick {
    const price = this.basePrice;
    const spread = price * 0.0001; // 0.01% spread

    return {
      symbol,
      price,
      bid: price - spread / 2,
      ask: price + spread / 2,
      volume: Math.random() * 100,
      timestamp: new Date(),
    };
  }

  /**
   * Update prices for all subscribed symbols
   */
  private updatePrices(): void {
    for (const symbol of this.subscriptions) {
      const currentTick = this.latestTicks.get(symbol);
      if (!currentTick) {
        continue;
      }

      // Generate random price movement
      const change = (Math.random() - 0.5) * 2 * this.volatility;
      const newPrice = currentTick.price * (1 + change);
      const spread = newPrice * 0.0001;

      const newTick: MarketTick = {
        symbol,
        price: newPrice,
        bid: newPrice - spread / 2,
        ask: newPrice + spread / 2,
        volume: Math.random() * 100,
        timestamp: new Date(),
      };

      this.latestTicks.set(symbol, newTick);
    }
  }
}

/**
 * Binance market data feed (placeholder for real implementation)
 * In a real implementation, this would connect to Binance WebSocket API
 */
export class BinanceMarketDataFeed implements IMarketDataFeed {
  private subscriptions: Set<string>;
  private latestTicks: Map<string, MarketTick>;
  private isRunning: boolean;

  constructor() {
    this.subscriptions = new Set();
    this.latestTicks = new Map();
    this.isRunning = false;
  }

  public subscribe(symbol: string): void {
    this.subscriptions.add(symbol);
    console.info(`[BinanceMarketDataFeed] Subscribed to ${symbol}`);
    // TODO: Implement Binance WebSocket subscription
  }

  public unsubscribe(symbol: string): void {
    this.subscriptions.delete(symbol);
    console.info(`[BinanceMarketDataFeed] Unsubscribed from ${symbol}`);
    // TODO: Implement Binance WebSocket unsubscription
  }

  public getLatestTick(symbol: string): MarketTick | null {
    return this.latestTicks.get(symbol) || null;
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.info('[BinanceMarketDataFeed] Starting market data feed...');
    // TODO: Connect to Binance WebSocket API
    // For now, fall back to mock data
    console.warn('[BinanceMarketDataFeed] Real Binance API not implemented, using mock data');
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    console.info('[BinanceMarketDataFeed] Stopping market data feed...');
    // TODO: Disconnect from Binance WebSocket API
  }
}

/**
 * Market data feed factory
 */
export class MarketDataFeedFactory {
  public static create(source: 'binance' | 'mock' | 'custom'): IMarketDataFeed {
    switch (source) {
      case 'binance':
        return new BinanceMarketDataFeed();
      case 'mock':
        return new MockMarketDataFeed();
      case 'custom':
        throw new Error('Custom market data feed not implemented');
      default:
        return new MockMarketDataFeed();
    }
  }
}
