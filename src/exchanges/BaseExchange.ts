/**
 * Base Exchange Class
 *
 * Базовый абстрактный класс для всех криптовалютных бирж
 * Реализует общую функциональность: rate limiting, retry logic, error handling
 */

import type {
  IExchange,
  ExchangeConfig,
  Candle,
  OrderBook,
  Trade,
  Ticker,
  Order,
  OrderRequest,
  Balance,
  CandleInterval,
  WebSocketCallback,
  WebSocketTradeUpdate,
  WebSocketTickerUpdate,
  WebSocketCandleUpdate,
  WebSocketOrderBookUpdate,
  ExchangeLimits,
  MarketType,
  GetCandlesOptions,
  GetOrderBookOptions,
  GetTradesOptions,
  GetTickerOptions,
} from './types.js';

/**
 * Опции для HTTP запроса
 */
interface RequestOptions {
  method: 'GET' | 'POST' | 'DELETE' | 'PUT';
  endpoint: string;
  params?: Record<string, string | number | boolean | undefined>;
  body?: Record<string, unknown>;
  signed?: boolean;
}

/**
 * Базовый абстрактный класс биржи
 */
export abstract class BaseExchange implements IExchange {
  public readonly name: string;
  public readonly config: ExchangeConfig;

  protected baseUrl: string = '';
  protected wsUrl: string = '';

  private requestCount: number = 0;
  private requestWindowStart: number = Date.now();
  private readonly requestWindow: number = 60000; // 1 минута

  /**
   * Конструктор
   * @param config Конфигурация биржи
   */
  constructor(config: ExchangeConfig) {
    this.name = config.name;
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      enableLogging: false,
      defaultMarketType: 'spot',
      testnet: false,
      ...config,
    };
  }

  /**
   * Абстрактные методы, которые должны быть реализованы в дочерних классах
   */
  abstract getCandles(
    symbol: string,
    interval: CandleInterval,
    limit: number,
    options?: GetCandlesOptions,
  ): Promise<Candle[]>;

  abstract getOrderBook(
    symbol: string,
    depth: number,
    options?: GetOrderBookOptions,
  ): Promise<OrderBook>;

  abstract getTrades(symbol: string, options?: GetTradesOptions): Promise<Trade[]>;

  abstract getTicker(symbol: string, options?: GetTickerOptions): Promise<Ticker>;

  abstract placeOrder(order: OrderRequest): Promise<Order>;

  abstract cancelOrder(orderId: string, symbol: string, marketType?: MarketType): Promise<void>;

  abstract getOrder(orderId: string, symbol: string, marketType?: MarketType): Promise<Order>;

  abstract getOpenOrders(symbol?: string, marketType?: MarketType): Promise<Order[]>;

  abstract getBalance(marketType?: MarketType): Promise<Balance[]>;

  abstract subscribeToTrades(
    symbol: string,
    callback: WebSocketCallback<WebSocketTradeUpdate>,
    marketType?: MarketType,
  ): void;

  abstract subscribeToTicker(
    symbol: string,
    callback: WebSocketCallback<WebSocketTickerUpdate>,
    marketType?: MarketType,
  ): void;

  abstract subscribeToCandles(
    symbol: string,
    interval: CandleInterval,
    callback: WebSocketCallback<WebSocketCandleUpdate>,
    marketType?: MarketType,
  ): void;

  abstract subscribeToOrderBook(
    symbol: string,
    callback: WebSocketCallback<WebSocketOrderBookUpdate>,
    marketType?: MarketType,
  ): void;

  abstract unsubscribeAll(): void;

  /**
   * Проверить соединение с биржей
   */
  async ping(): Promise<boolean> {
    try {
      await this.getServerTime();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Получить время сервера (должен быть реализован в дочерних классах)
   */
  abstract getServerTime(): Promise<number>;

  /**
   * Получить информацию о лимитах
   */
  getLimits(): ExchangeLimits {
    const now = Date.now();
    const resetTime = this.requestWindowStart + this.requestWindow - now;

    return {
      exchange: this.name,
      requestsPerMinute: this.getRequestsPerMinute(),
      ordersPerSecond: this.getOrdersPerSecond(),
      currentRequests: this.requestCount,
      resetTime: Math.max(0, resetTime),
    };
  }

  /**
   * Получить лимит запросов в минуту (может быть переопределен в дочерних классах)
   */
  protected getRequestsPerMinute(): number {
    return 1200; // По умолчанию
  }

  /**
   * Получить лимит ордеров в секунду (может быть переопределен в дочерних классах)
   */
  protected getOrdersPerSecond(): number {
    return 10; // По умолчанию
  }

  /**
   * Выполнить HTTP запрос с retry логикой и rate limiting
   */
  protected async request<T>(options: RequestOptions): Promise<T> {
    let lastError: Error | null = null;
    const maxRetries = this.config.maxRetries ?? 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Rate limiting
        await this.checkRateLimit();

        // Выполнить запрос
        const response = await this.executeRequest<T>(options);

        // Логирование
        if (this.config.enableLogging) {
          this.log('REQUEST', `${options.method} ${options.endpoint}`, response);
        }

        return response;
      } catch (error) {
        lastError = error as Error;

        // Логирование ошибки
        if (this.config.enableLogging) {
          this.log(
            'ERROR',
            `${options.method} ${options.endpoint} (attempt ${attempt + 1})`,
            error,
          );
        }

        // Если это последняя попытка, выбросить ошибку
        if (attempt === maxRetries) {
          break;
        }

        // Если это ошибка rate limit, подождать дольше
        const delay = this.isRateLimitError(error as Error)
          ? (this.config.retryDelay ?? 1000) * 5
          : (this.config.retryDelay ?? 1000) * Math.pow(2, attempt);

        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Выполнить HTTP запрос (должен быть реализован в дочерних классах)
   */
  protected abstract executeRequest<T>(options: RequestOptions): Promise<T>;

  /**
   * Проверить rate limit
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();

    // Сброс счетчика если прошло окно
    if (now - this.requestWindowStart >= this.requestWindow) {
      this.requestCount = 0;
      this.requestWindowStart = now;
    }

    // Проверка лимита
    const limit = this.getRequestsPerMinute();
    if (this.requestCount >= limit) {
      const waitTime = this.requestWindow - (now - this.requestWindowStart);
      if (this.config.enableLogging) {
        this.log('RATE_LIMIT', `Waiting ${waitTime}ms before next request`);
      }
      await this.sleep(waitTime);
      this.requestCount = 0;
      this.requestWindowStart = Date.now();
    }

    this.requestCount++;
  }

  /**
   * Проверить является ли ошибка ошибкой rate limit
   */
  protected isRateLimitError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('429')
    );
  }

  /**
   * Задержка
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Логирование
   */
  protected log(level: string, message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.name}] [${level}]`;

    if (data !== undefined) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }

  /**
   * Создать подпись для запроса (должен быть реализован в дочерних классах для приватных API)
   */
  protected abstract createSignature(params: Record<string, string | number | boolean>): string;

  /**
   * Нормализовать символ торговой пары для конкретной биржи
   */
  protected abstract normalizeSymbol(symbol: string): string;

  /**
   * Нормализовать интервал свечей для конкретной биржи
   */
  protected abstract normalizeInterval(interval: CandleInterval): string;
}
