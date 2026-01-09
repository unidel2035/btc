/**
 * Exchange Manager
 *
 * Централизованное управление несколькими биржами
 */

import type { IExchange, Balance, Ticker, Order, OrderRequest } from './types.js';
import { BinanceExchange } from './BinanceExchange.js';
import { BybitExchange } from './BybitExchange.js';
import { encrypt, decrypt, isValidMasterKey } from './security.js';

/**
 * Конфигурация Exchange Manager
 */
export interface ExchangeManagerConfig {
  /** Мастер-ключ для шифрования API ключей (должен быть безопасно сохранен) */
  masterKey?: string;
  /** Включить логирование */
  enableLogging?: boolean;
  /** Биржи для инициализации */
  exchanges: {
    binance?: {
      apiKey: string;
      apiSecret: string;
      testnet?: boolean;
      encrypted?: boolean;
    };
    bybit?: {
      apiKey: string;
      apiSecret: string;
      testnet?: boolean;
      encrypted?: boolean;
    };
  };
}

/**
 * Exchange Manager
 */
export class ExchangeManager {
  private exchanges: Map<string, IExchange> = new Map();
  private masterKey?: string;
  private enableLogging: boolean = false;

  /**
   * Конструктор
   * @param config Конфигурация
   */
  constructor(config: ExchangeManagerConfig) {
    this.masterKey = config.masterKey;
    this.enableLogging = config.enableLogging ?? false;

    // Валидация мастер-ключа если он предоставлен
    if (this.masterKey && !isValidMasterKey(this.masterKey)) {
      throw new Error('Invalid master key. Must be at least 32 characters long.');
    }

    // Инициализировать биржи
    if (config.exchanges.binance) {
      this.addBinance(config.exchanges.binance);
    }

    if (config.exchanges.bybit) {
      this.addBybit(config.exchanges.bybit);
    }
  }

  /**
   * Добавить Binance биржу
   */
  private addBinance(config: {
    apiKey: string;
    apiSecret: string;
    testnet?: boolean;
    encrypted?: boolean;
  }): void {
    const apiKey =
      config.encrypted && this.masterKey ? decrypt(config.apiKey, this.masterKey) : config.apiKey;
    const apiSecret =
      config.encrypted && this.masterKey
        ? decrypt(config.apiSecret, this.masterKey)
        : config.apiSecret;

    const exchange = new BinanceExchange({
      apiKey,
      apiSecret,
      testnet: config.testnet,
    });

    this.exchanges.set('binance', exchange);

    if (this.enableLogging) {
      console.log('[ExchangeManager] Added Binance exchange');
    }
  }

  /**
   * Добавить Bybit биржу
   */
  private addBybit(config: {
    apiKey: string;
    apiSecret: string;
    testnet?: boolean;
    encrypted?: boolean;
  }): void {
    const apiKey =
      config.encrypted && this.masterKey ? decrypt(config.apiKey, this.masterKey) : config.apiKey;
    const apiSecret =
      config.encrypted && this.masterKey
        ? decrypt(config.apiSecret, this.masterKey)
        : config.apiSecret;

    const exchange = new BybitExchange({
      apiKey,
      apiSecret,
      testnet: config.testnet,
    });

    this.exchanges.set('bybit', exchange);

    if (this.enableLogging) {
      console.log('[ExchangeManager] Added Bybit exchange');
    }
  }

  /**
   * Получить биржу по имени
   * @param name Название биржи
   */
  getExchange(name: string): IExchange | undefined {
    return this.exchanges.get(name.toLowerCase());
  }

  /**
   * Получить все биржи
   */
  getAllExchanges(): IExchange[] {
    return Array.from(this.exchanges.values());
  }

  /**
   * Получить названия всех бирж
   */
  getExchangeNames(): string[] {
    return Array.from(this.exchanges.keys());
  }

  /**
   * Проверить есть ли биржа
   * @param name Название биржи
   */
  hasExchange(name: string): boolean {
    return this.exchanges.has(name.toLowerCase());
  }

  /**
   * Проверить соединение со всеми биржами
   */
  async pingAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [name, exchange] of this.exchanges) {
      try {
        const isAlive = await exchange.ping();
        results.set(name, isAlive);

        if (this.enableLogging) {
          console.log(`[ExchangeManager] ${name} ping: ${isAlive ? 'OK' : 'FAILED'}`);
        }
      } catch (error) {
        results.set(name, false);

        if (this.enableLogging) {
          console.error(`[ExchangeManager] ${name} ping error:`, error);
        }
      }
    }

    return results;
  }

  /**
   * Получить объединенный баланс со всех бирж
   */
  async getAggregatedBalance(): Promise<
    Map<string, { total: number; byExchange: Map<string, Balance> }>
  > {
    const aggregated = new Map<string, { total: number; byExchange: Map<string, Balance> }>();

    for (const [name, exchange] of this.exchanges) {
      try {
        const balances = await exchange.getBalance();

        for (const balance of balances) {
          if (!aggregated.has(balance.asset)) {
            aggregated.set(balance.asset, {
              total: 0,
              byExchange: new Map(),
            });
          }

          const assetData = aggregated.get(balance.asset)!;
          assetData.total += balance.total;
          assetData.byExchange.set(name, balance);
        }
      } catch (error) {
        if (this.enableLogging) {
          console.error(`[ExchangeManager] Failed to get balance from ${name}:`, error);
        }
      }
    }

    return aggregated;
  }

  /**
   * Получить тикер с определенной биржи
   * @param exchange Название биржи
   * @param symbol Торговая пара
   */
  async getTicker(exchange: string, symbol: string): Promise<Ticker> {
    const ex = this.getExchange(exchange);
    if (!ex) {
      throw new Error(`Exchange ${exchange} not found`);
    }
    return ex.getTicker(symbol);
  }

  /**
   * Получить тикер с нескольких бирж
   * @param symbol Торговая пара
   * @param exchanges Список бирж (если не указано, используются все)
   */
  async getTickerFromMultiple(symbol: string, exchanges?: string[]): Promise<Map<string, Ticker>> {
    const results = new Map<string, Ticker>();
    const targetExchanges = exchanges ?? this.getExchangeNames();

    await Promise.all(
      targetExchanges.map(async (name) => {
        const exchange = this.getExchange(name);
        if (!exchange) return;

        try {
          const ticker = await exchange.getTicker(symbol);
          results.set(name, ticker);
        } catch (error) {
          if (this.enableLogging) {
            console.error(`[ExchangeManager] Failed to get ticker from ${name}:`, error);
          }
        }
      }),
    );

    return results;
  }

  /**
   * Найти лучшую цену покупки среди всех бирж
   * @param symbol Торговая пара
   */
  async findBestBidPrice(symbol: string): Promise<{ exchange: string; price: number } | null> {
    const tickers = await this.getTickerFromMultiple(symbol);
    let best: { exchange: string; price: number } | null = null;

    for (const [name, ticker] of tickers) {
      if (!best || ticker.bidPrice > best.price) {
        best = { exchange: name, price: ticker.bidPrice };
      }
    }

    return best;
  }

  /**
   * Найти лучшую цену продажи среди всех бирж
   * @param symbol Торговая пара
   */
  async findBestAskPrice(symbol: string): Promise<{ exchange: string; price: number } | null> {
    const tickers = await this.getTickerFromMultiple(symbol);
    let best: { exchange: string; price: number } | null = null;

    for (const [name, ticker] of tickers) {
      if (!best || ticker.askPrice < best.price) {
        best = { exchange: name, price: ticker.askPrice };
      }
    }

    return best;
  }

  /**
   * Создать ордер на определенной бирже
   * @param exchange Название биржи
   * @param order Параметры ордера
   */
  async placeOrder(exchange: string, order: OrderRequest): Promise<Order> {
    const ex = this.getExchange(exchange);
    if (!ex) {
      throw new Error(`Exchange ${exchange} not found`);
    }
    return ex.placeOrder(order);
  }

  /**
   * Получить открытые ордера со всех бирж
   * @param symbol Торговая пара (опционально)
   */
  async getAllOpenOrders(symbol?: string): Promise<Map<string, Order[]>> {
    const results = new Map<string, Order[]>();

    await Promise.all(
      Array.from(this.exchanges.entries()).map(async ([name, exchange]) => {
        try {
          const orders = await exchange.getOpenOrders(symbol);
          results.set(name, orders);
        } catch (error) {
          if (this.enableLogging) {
            console.error(`[ExchangeManager] Failed to get orders from ${name}:`, error);
          }
        }
      }),
    );

    return results;
  }

  /**
   * Отменить все ордера на всех биржах
   * @param symbol Торговая пара (опционально)
   */
  async cancelAllOrders(symbol?: string): Promise<void> {
    const allOrders = await this.getAllOpenOrders(symbol);

    for (const [name, orders] of allOrders) {
      const exchange = this.getExchange(name);
      if (!exchange) continue;

      await Promise.all(
        orders.map(async (order) => {
          try {
            await exchange.cancelOrder(order.id, order.symbol, order.marketType);

            if (this.enableLogging) {
              console.log(`[ExchangeManager] Cancelled order ${order.id} on ${name}`);
            }
          } catch (error) {
            if (this.enableLogging) {
              console.error(
                `[ExchangeManager] Failed to cancel order ${order.id} on ${name}:`,
                error,
              );
            }
          }
        }),
      );
    }
  }

  /**
   * Отписаться от всех WebSocket подписок на всех биржах
   */
  unsubscribeAll(): void {
    for (const [name, exchange] of this.exchanges) {
      try {
        exchange.unsubscribeAll();

        if (this.enableLogging) {
          console.log(`[ExchangeManager] Unsubscribed all WebSocket streams on ${name}`);
        }
      } catch (error) {
        if (this.enableLogging) {
          console.error(`[ExchangeManager] Failed to unsubscribe on ${name}:`, error);
        }
      }
    }
  }

  /**
   * Зашифровать API ключи для безопасного хранения
   * @param apiKey API ключ
   * @param apiSecret Секретный ключ
   */
  encryptCredentials(apiKey: string, apiSecret: string): { apiKey: string; apiSecret: string } {
    if (!this.masterKey) {
      throw new Error('Master key is required for encryption');
    }

    return {
      apiKey: encrypt(apiKey, this.masterKey),
      apiSecret: encrypt(apiSecret, this.masterKey),
    };
  }

  /**
   * Получить информацию о лимитах всех бирж
   */
  getLimitsInfo(): Map<
    string,
    {
      exchange: string;
      requestsPerMinute: number;
      ordersPerSecond: number;
      currentRequests: number;
      resetTime: number;
    }
  > {
    const limits = new Map<
      string,
      {
        exchange: string;
        requestsPerMinute: number;
        ordersPerSecond: number;
        currentRequests: number;
        resetTime: number;
      }
    >();

    for (const [name, exchange] of this.exchanges) {
      limits.set(name, exchange.getLimits());
    }

    return limits;
  }
}
