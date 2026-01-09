/**
 * Base Exchange Class
 * Базовый класс для всех интеграций с биржами
 */

import {
  IExchange,
  ExchangeConfig,
  MarketType,
  Candle,
  CandleInterval,
  OrderBook,
  Trade,
  Ticker,
  OrderRequest,
  Order,
  Balance,
  WebSocketEventType,
  ExchangeInfo,
  ExchangeError,
} from './types';
import { RateLimiter } from './utils/RateLimiter';
import { getApiKey, maskApiKey } from './utils/security';

export interface BaseExchangeConfig extends ExchangeConfig {
  name: string;
  marketType: MarketType;
}

export abstract class BaseExchange implements IExchange {
  public readonly name: string;
  public readonly marketType: MarketType;

  protected config: ExchangeConfig;
  protected rateLimiter: RateLimiter;
  protected apiKey: string;
  protected apiSecret: string;
  protected passphrase?: string;
  protected initialized = false;
  protected websockets = new Map<string, unknown>();

  constructor(config: BaseExchangeConfig) {
    this.name = config.name;
    this.marketType = config.marketType;
    this.config = config;

    // Инициализация API ключей с расшифровкой если нужно
    this.apiKey = config.apiKey ? getApiKey(config.apiKey) : '';
    this.apiSecret = config.apiSecret ? getApiKey(config.apiSecret) : '';
    this.passphrase = config.passphrase ? getApiKey(config.passphrase) : undefined;

    // Rate limiter по умолчанию: 1200 запросов в минуту (20 в секунду)
    const rateLimit = config.rateLimit ?? 1200;
    this.rateLimiter = new RateLimiter({
      maxRequests: rateLimit,
      interval: 60000, // 1 минута
      enabled: config.enableRateLimit ?? true,
    });

    this.logConfig();
  }

  /**
   * Логирование конфигурации (с маскированием ключей)
   */
  protected logConfig(): void {
    console.info(`[${this.name}] Exchange initialized`);
    console.info(`[${this.name}] Market Type: ${this.marketType}`);
    console.info(`[${this.name}] Testnet: ${this.config.testnet ?? false}`);
    console.info(`[${this.name}] API Key: ${this.apiKey ? maskApiKey(this.apiKey) : 'not set'}`);
    console.info(`[${this.name}] Rate Limit: ${this.rateLimiter.getStats().maxRequests} req/min`);
  }

  /**
   * Защищенный HTTP запрос с rate limiting
   */
  protected async request<T>(
    method: string,
    endpoint: string,
    params?: Record<string, unknown>,
    signed = false,
  ): Promise<T> {
    await this.rateLimiter.waitForSlot();

    try {
      const response = await this.makeRequest<T>(method, endpoint, params, signed);
      return response;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Абстрактный метод для выполнения HTTP запроса
   * Должен быть реализован в конкретной бирже
   */
  protected abstract makeRequest<T>(
    method: string,
    endpoint: string,
    params?: Record<string, unknown>,
    signed?: boolean,
  ): Promise<T>;

  /**
   * Обработка ошибок
   */
  protected handleError(error: unknown): void {
    if (error instanceof ExchangeError) {
      console.error(`[${this.name}] Exchange Error:`, error.message);
      return;
    }

    if (error instanceof Error) {
      console.error(`[${this.name}] Error:`, error.message);
      throw new ExchangeError(error.message);
    }

    console.error(`[${this.name}] Unknown error:`, error);
    throw new ExchangeError('Unknown error occurred');
  }

  /**
   * Проверка инициализации
   */
  protected requireInitialized(): void {
    if (!this.initialized) {
      throw new ExchangeError(`${this.name} exchange is not initialized. Call initialize() first.`);
    }
  }

  /**
   * Проверка наличия API ключей
   */
  protected requireApiKeys(): void {
    if (!this.apiKey || !this.apiSecret) {
      throw new ExchangeError(`${this.name} requires API key and secret for this operation`);
    }
  }

  // Реализация IExchange интерфейса

  abstract initialize(): Promise<void>;

  isInitialized(): boolean {
    return this.initialized;
  }

  abstract disconnect(): Promise<void>;

  // Market Data
  abstract getCandles(
    symbol: string,
    interval: CandleInterval,
    limit?: number,
    startTime?: number,
    endTime?: number,
  ): Promise<Candle[]>;

  abstract getOrderBook(symbol: string, depth?: number): Promise<OrderBook>;

  abstract getTrades(symbol: string, limit?: number): Promise<Trade[]>;

  abstract getTicker(symbol: string): Promise<Ticker>;

  abstract getAllTickers(): Promise<Ticker[]>;

  // Trading
  abstract placeOrder(order: OrderRequest): Promise<Order>;

  abstract cancelOrder(symbol: string, orderId: string): Promise<void>;

  abstract cancelAllOrders(symbol: string): Promise<void>;

  abstract getOrder(symbol: string, orderId: string): Promise<Order>;

  abstract getOpenOrders(symbol?: string): Promise<Order[]>;

  abstract getOrderHistory(
    symbol?: string,
    limit?: number,
    startTime?: number,
    endTime?: number,
  ): Promise<Order[]>;

  // Account
  abstract getBalance(): Promise<Balance[]>;

  abstract getBalanceForAsset(asset: string): Promise<Balance>;

  // WebSocket
  abstract subscribeToTrades(symbol: string, callback: (trade: Trade) => void): void;

  abstract subscribeToTicker(symbol: string, callback: (ticker: Ticker) => void): void;

  abstract subscribeToOrderBook(symbol: string, callback: (orderBook: OrderBook) => void): void;

  abstract subscribeToCandles(
    symbol: string,
    interval: CandleInterval,
    callback: (candle: Candle) => void,
  ): void;

  abstract unsubscribe(symbol: string, event: WebSocketEventType): void;

  abstract unsubscribeAll(): void;

  // Utility
  abstract getExchangeInfo(): Promise<ExchangeInfo>;

  abstract getSymbols(): Promise<string[]>;

  abstract validateSymbol(symbol: string): Promise<boolean>;

  abstract formatSymbol(base: string, quote: string): string;

  /**
   * Получить статистику rate limiter
   */
  getRateLimiterStats(): {
    maxRequests: number;
    interval: number;
    currentRequests: number;
    remainingRequests: number;
    enabled: boolean;
  } {
    return this.rateLimiter.getStats();
  }

  /**
   * Сброс rate limiter
   */
  resetRateLimiter(): void {
    this.rateLimiter.reset();
  }
}
