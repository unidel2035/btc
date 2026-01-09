import { BaseExchange } from './BaseExchange.js';
import { BinanceExchange } from './BinanceExchange.js';
import { BybitExchange } from './BybitExchange.js';
import { ExchangeName, MarketType, type ExchangeConfig, type ExchangeInfo } from './types.js';

/**
 * Менеджер для управления несколькими биржами
 */
export class ExchangeManager {
  private exchanges: Map<string, BaseExchange>;
  private isInitialized: boolean;

  constructor() {
    this.exchanges = new Map();
    this.isInitialized = false;
  }

  /**
   * Создание ключа для хранения биржи
   */
  private createExchangeKey(name: ExchangeName, marketType: MarketType): string {
    return `${name}:${marketType}`;
  }

  /**
   * Добавление биржи
   */
  addExchange(config: ExchangeConfig, marketType: MarketType = MarketType.SPOT): BaseExchange {
    const key = this.createExchangeKey(config.name, marketType);

    // Проверяем, не добавлена ли уже эта биржа
    if (this.exchanges.has(key)) {
      console.warn(`[ExchangeManager] Exchange ${key} already exists, replacing...`);
    }

    let exchange: BaseExchange;

    switch (config.name) {
      case ExchangeName.BINANCE:
        exchange = new BinanceExchange(config, marketType);
        break;
      case ExchangeName.BYBIT:
        exchange = new BybitExchange(config, marketType);
        break;
      default:
        throw new Error(`Unsupported exchange: ${config.name}`);
    }

    this.exchanges.set(key, exchange);
    console.info(`[ExchangeManager] Added exchange: ${key}`);

    return exchange;
  }

  /**
   * Получение биржи
   */
  getExchange(name: ExchangeName, marketType: MarketType = MarketType.SPOT): BaseExchange | null {
    const key = this.createExchangeKey(name, marketType);
    return this.exchanges.get(key) || null;
  }

  /**
   * Получение всех бирж
   */
  getAllExchanges(): BaseExchange[] {
    return Array.from(this.exchanges.values());
  }

  /**
   * Проверка существования биржи
   */
  hasExchange(name: ExchangeName, marketType: MarketType = MarketType.SPOT): boolean {
    const key = this.createExchangeKey(name, marketType);
    return this.exchanges.has(key);
  }

  /**
   * Удаление биржи
   */
  async removeExchange(
    name: ExchangeName,
    marketType: MarketType = MarketType.SPOT,
  ): Promise<void> {
    const key = this.createExchangeKey(name, marketType);
    const exchange = this.exchanges.get(key);

    if (exchange) {
      await exchange.cleanup();
      this.exchanges.delete(key);
      console.info(`[ExchangeManager] Removed exchange: ${key}`);
    }
  }

  /**
   * Инициализация всех бирж (проверка подключения)
   */
  async initialize(): Promise<void> {
    console.info('[ExchangeManager] Initializing exchanges...');

    const promises = Array.from(this.exchanges.entries()).map(async ([key, exchange]) => {
      try {
        const connected = await exchange.testConnection();
        if (connected) {
          console.info(`[ExchangeManager] ✅ ${key} connected successfully`);
        } else {
          console.error(`[ExchangeManager] ❌ ${key} connection failed`);
        }
        return { key, connected };
      } catch (error) {
        console.error(`[ExchangeManager] ❌ ${key} initialization error:`, error);
        return { key, connected: false };
      }
    });

    const results = await Promise.all(promises);

    const successCount = results.filter((r) => r.connected).length;
    const totalCount = results.length;

    console.info(
      `[ExchangeManager] Initialization complete: ${successCount}/${totalCount} exchanges connected`,
    );

    this.isInitialized = true;
  }

  /**
   * Получение информации обо всех биржах
   */
  getExchangesInfo(): ExchangeInfo[] {
    return Array.from(this.exchanges.values()).map((exchange) => exchange.getExchangeInfo());
  }

  /**
   * Получение статистики
   */
  getStats(): {
    totalExchanges: number;
    connectedExchanges: number;
    isInitialized: boolean;
    exchanges: string[];
  } {
    const allExchanges = Array.from(this.exchanges.values());
    const connectedCount = allExchanges.filter((e) => e.getIsConnected()).length;

    return {
      totalExchanges: this.exchanges.size,
      connectedExchanges: connectedCount,
      isInitialized: this.isInitialized,
      exchanges: Array.from(this.exchanges.keys()),
    };
  }

  /**
   * Очистка всех ресурсов
   */
  async cleanup(): Promise<void> {
    console.info('[ExchangeManager] Cleaning up all exchanges...');

    const promises = Array.from(this.exchanges.values()).map((exchange) => exchange.cleanup());

    await Promise.all(promises);

    this.exchanges.clear();
    this.isInitialized = false;

    console.info('[ExchangeManager] ✅ All exchanges cleaned up');
  }

  /**
   * Проверка инициализации
   */
  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Получение количества бирж
   */
  getExchangeCount(): number {
    return this.exchanges.size;
  }
}
