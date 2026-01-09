/**
 * Exchange Manager
 * Унифицированный интерфейс для работы с несколькими биржами
 */

import { IExchange, ExchangeConfig, MarketType, ExchangeError } from './types';
import { BinanceExchange } from './binance/BinanceExchange';
import { BybitExchange } from './bybit/BybitExchange';
import { OKXExchange } from './okx/OKXExchange';

export type SupportedExchange = 'binance' | 'bybit' | 'okx';

export interface ExchangeManagerConfig {
  exchanges: {
    [key in SupportedExchange]?: ExchangeConfig & {
      marketType?: MarketType;
      enabled?: boolean;
    };
  };
  defaultExchange?: SupportedExchange;
}

/**
 * Exchange Manager
 * Управляет несколькими биржами и предоставляет единый интерфейс
 */
export class ExchangeManager {
  private exchanges = new Map<string, IExchange>();
  private defaultExchange?: SupportedExchange;

  constructor(private config: ExchangeManagerConfig) {
    this.defaultExchange = config.defaultExchange;
  }

  /**
   * Инициализация всех бирж
   */
  async initialize(): Promise<void> {
    const initPromises: Promise<void>[] = [];

    // Binance
    if (this.config.exchanges.binance?.enabled !== false) {
      const binanceConfig = this.config.exchanges.binance;
      if (binanceConfig) {
        const marketType = binanceConfig.marketType || MarketType.SPOT;
        const exchange = new BinanceExchange({
          ...binanceConfig,
          marketType,
        });
        const key = this.getExchangeKey('binance', marketType);
        this.exchanges.set(key, exchange);
        initPromises.push(exchange.initialize());
      }
    }

    // Bybit
    if (this.config.exchanges.bybit?.enabled !== false) {
      const bybitConfig = this.config.exchanges.bybit;
      if (bybitConfig) {
        const marketType = bybitConfig.marketType || MarketType.SPOT;
        const exchange = new BybitExchange({
          ...bybitConfig,
          marketType,
        });
        const key = this.getExchangeKey('bybit', marketType);
        this.exchanges.set(key, exchange);
        initPromises.push(exchange.initialize());
      }
    }

    // OKX
    if (this.config.exchanges.okx?.enabled !== false) {
      const okxConfig = this.config.exchanges.okx;
      if (okxConfig) {
        const marketType = okxConfig.marketType || MarketType.SPOT;
        const exchange = new OKXExchange({
          ...okxConfig,
          marketType,
        });
        const key = this.getExchangeKey('okx', marketType);
        this.exchanges.set(key, exchange);
        initPromises.push(
          exchange.initialize().catch((error) => {
            console.warn(`[OKX] Initialization failed (stub implementation):`, error.message);
          }),
        );
      }
    }

    await Promise.all(initPromises);

    console.info(`[ExchangeManager] Initialized ${this.exchanges.size} exchanges`);
    this.listExchanges();
  }

  /**
   * Отключение всех бирж
   */
  async disconnect(): Promise<void> {
    const disconnectPromises = Array.from(this.exchanges.values()).map((exchange) =>
      exchange.disconnect(),
    );
    await Promise.all(disconnectPromises);
    this.exchanges.clear();
    console.info('[ExchangeManager] All exchanges disconnected');
  }

  /**
   * Получить биржу по имени и типу рынка
   */
  getExchange(name: SupportedExchange, marketType: MarketType = MarketType.SPOT): IExchange {
    const key = this.getExchangeKey(name, marketType);
    const exchange = this.exchanges.get(key);

    if (!exchange) {
      throw new ExchangeError(`Exchange ${name} (${marketType}) not found or not initialized`);
    }

    return exchange;
  }

  /**
   * Получить биржу по умолчанию
   */
  getDefaultExchange(marketType: MarketType = MarketType.SPOT): IExchange {
    if (!this.defaultExchange) {
      throw new ExchangeError('No default exchange configured');
    }

    return this.getExchange(this.defaultExchange, marketType);
  }

  /**
   * Проверить, доступна ли биржа
   */
  hasExchange(name: SupportedExchange, marketType: MarketType = MarketType.SPOT): boolean {
    const key = this.getExchangeKey(name, marketType);
    return this.exchanges.has(key);
  }

  /**
   * Получить список всех доступных бирж
   */
  listExchanges(): Array<{ name: string; marketType: MarketType; initialized: boolean }> {
    const list = Array.from(this.exchanges.entries()).map(([key, exchange]) => {
      const parts = key.split(':');
      const name = parts[0] || '';
      const marketType = (parts[1] || MarketType.SPOT) as MarketType;
      return {
        name,
        marketType,
        initialized: exchange.isInitialized(),
      };
    });

    console.info('[ExchangeManager] Available exchanges:', list);
    return list;
  }

  /**
   * Получить балансы со всех бирж
   */
  async getAllBalances(): Promise<
    Array<{
      exchange: string;
      marketType: MarketType;
      balances: Array<{ asset: string; free: number; locked: number; total: number }>;
    }>
  > {
    const results = [];

    for (const [key, exchange] of this.exchanges.entries()) {
      try {
        const balances = await exchange.getBalance();
        const parts = key.split(':');
        const name = parts[0] || '';
        const marketType = (parts[1] || MarketType.SPOT) as MarketType;
        results.push({
          exchange: name,
          marketType,
          balances,
        });
      } catch (error) {
        console.error(`[${key}] Failed to get balance:`, error);
      }
    }

    return results;
  }

  /**
   * Получить тикеры с нескольких бирж для сравнения цен
   */
  async comparePrice(
    symbol: string,
    exchanges?: SupportedExchange[],
  ): Promise<
    Array<{
      exchange: string;
      marketType: MarketType;
      lastPrice: number;
      bidPrice: number;
      askPrice: number;
      volume24h: number;
    }>
  > {
    const results = [];
    const targetExchanges = exchanges
      ? exchanges.map((name) => this.getExchangeKey(name, MarketType.SPOT))
      : Array.from(this.exchanges.keys());

    for (const key of targetExchanges) {
      const exchange = this.exchanges.get(key);
      if (!exchange) continue;

      try {
        const ticker = await exchange.getTicker(symbol);
        const parts = key.split(':');
        const name = parts[0] || '';
        const marketType = (parts[1] || MarketType.SPOT) as MarketType;
        results.push({
          exchange: name,
          marketType,
          lastPrice: ticker.lastPrice,
          bidPrice: ticker.bidPrice,
          askPrice: ticker.askPrice,
          volume24h: ticker.volume24h,
        });
      } catch (error) {
        console.error(`[${key}] Failed to get ticker for ${symbol}:`, error);
      }
    }

    return results;
  }

  /**
   * Найти лучшую цену покупки/продажи между биржами
   */
  async findBestPrice(
    symbol: string,
    side: 'buy' | 'sell',
    exchanges?: SupportedExchange[],
  ): Promise<{
    exchange: string;
    marketType: MarketType;
    price: number;
    volume: number;
  } | null> {
    const prices = await this.comparePrice(symbol, exchanges);

    if (prices.length === 0) {
      return null;
    }

    const sorted = prices.sort((a, b) => {
      if (side === 'buy') {
        return a.askPrice - b.askPrice; // Лучшая цена для покупки - минимальная
      } else {
        return b.bidPrice - a.bidPrice; // Лучшая цена для продажи - максимальная
      }
    });

    const best = sorted[0];
    if (!best) {
      return null;
    }

    return {
      exchange: best.exchange,
      marketType: best.marketType,
      price: side === 'buy' ? best.askPrice : best.bidPrice,
      volume: best.volume24h,
    };
  }

  /**
   * Получить агрегированный order book с нескольких бирж
   */
  async getAggregatedOrderBook(symbol: string, depth = 20) {
    const orderBooks = [];

    for (const [key, exchange] of this.exchanges.entries()) {
      try {
        const orderBook = await exchange.getOrderBook(symbol, depth);
        const parts = key.split(':');
      const name = parts[0] || '';
      const marketType = (parts[1] || MarketType.SPOT) as MarketType;
        orderBooks.push({
          exchange: name,
          marketType: marketType as MarketType,
          orderBook,
        });
      } catch (error) {
        console.error(`[${key}] Failed to get order book:`, error);
      }
    }

    return orderBooks;
  }

  /**
   * Получить ключ для Map
   */
  private getExchangeKey(name: SupportedExchange, marketType: MarketType): string {
    return `${name}:${marketType}`;
  }

  /**
   * Получить статистику rate limiter всех бирж
   */
  getRateLimiterStats() {
    const stats: Record<string, unknown> = {};
    for (const [key, exchange] of this.exchanges.entries()) {
      if ('getRateLimiterStats' in exchange && typeof exchange.getRateLimiterStats === 'function') {
        stats[key] = exchange.getRateLimiterStats();
      }
    }
    return stats;
  }
}
