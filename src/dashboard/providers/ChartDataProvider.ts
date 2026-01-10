/**
 * Chart Data Provider
 * Subscribes to exchange WebSocket and broadcasts candles to dashboard clients
 */

import type { ExchangeManager } from '../../exchanges/ExchangeManager.js';
import type { DashboardWebSocket } from '../websocket.js';
import { CandleInterval, type Candle } from '../../exchanges/types.js';

interface ChartSubscription {
  exchange: string;
  symbol: string;
  timeframe: CandleInterval;
  lastUpdate: number;
}

export class ChartDataProvider {
  private exchangeManager: ExchangeManager;
  private ws: DashboardWebSocket;
  private activeSubscriptions: Map<string, ChartSubscription> = new Map();

  constructor(exchangeManager: ExchangeManager, ws: DashboardWebSocket) {
    this.exchangeManager = exchangeManager;
    this.ws = ws;
  }

  /**
   * Subscribe to chart data for a specific exchange, symbol, and timeframe
   */
  subscribeToChart(exchange: string, symbol: string, timeframe: string): void {
    const key = this.getSubscriptionKey(exchange, symbol, timeframe);

    // Check if already subscribed
    if (this.activeSubscriptions.has(key)) {
      console.log(`[ChartDataProvider] Already subscribed to ${key}`);
      return;
    }

    try {
      const exchangeInstance = this.exchangeManager.getExchange(exchange as 'binance' | 'bybit' | 'okx');

      // Subscribe to candles from exchange
      exchangeInstance.subscribeToCandles(
        symbol,
        timeframe as CandleInterval,
        (candle: Candle) => {
          this.handleCandle(exchange, symbol, timeframe, candle);
        }
      );

      this.activeSubscriptions.set(key, {
        exchange,
        symbol,
        timeframe: timeframe as CandleInterval,
        lastUpdate: Date.now(),
      });

      console.log(`[ChartDataProvider] Subscribed to ${key}`);
    } catch (error) {
      console.error(`[ChartDataProvider] Failed to subscribe to ${key}:`, error);
    }
  }

  /**
   * Unsubscribe from chart data
   */
  unsubscribeFromChart(exchange: string, symbol: string, timeframe: string): void {
    const key = this.getSubscriptionKey(exchange, symbol, timeframe);

    if (!this.activeSubscriptions.has(key)) {
      return;
    }

    try {
      const exchangeInstance = this.exchangeManager.getExchange(exchange as 'binance' | 'bybit' | 'okx');
      exchangeInstance.unsubscribe(symbol, 'candle' as any);

      this.activeSubscriptions.delete(key);
      console.log(`[ChartDataProvider] Unsubscribed from ${key}`);
    } catch (error) {
      console.error(`[ChartDataProvider] Failed to unsubscribe from ${key}:`, error);
    }
  }

  /**
   * Handle incoming candle from exchange
   */
  private handleCandle(exchange: string, symbol: string, timeframe: string, candle: Candle): void {
    // Broadcast to dashboard clients
    this.ws.broadcastChartCandle({
      exchange,
      symbol,
      timeframe,
      timestamp: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    });
  }

  /**
   * Get subscription key
   */
  private getSubscriptionKey(exchange: string, symbol: string, timeframe: string): string {
    return `${exchange}:${symbol}:${timeframe}`;
  }

  /**
   * Cleanup all subscriptions
   */
  stop(): void {
    this.activeSubscriptions.forEach((sub) => {
      try {
        const exchangeInstance = this.exchangeManager.getExchange(sub.exchange as 'binance' | 'bybit' | 'okx');
        exchangeInstance.unsubscribe(sub.symbol, 'candle' as any);
      } catch (error) {
        console.error(`[ChartDataProvider] Failed to unsubscribe:`, error);
      }
    });
    this.activeSubscriptions.clear();
    console.log('[ChartDataProvider] Stopped and cleaned up all subscriptions');
  }
}
