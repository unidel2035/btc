import {
  ExchangeName,
  MarketType,
  type ExchangeConfig,
  type Candle,
  type CandleInterval,
  type OrderBook,
  type Trade,
  type Ticker,
  type Order,
  type OrderRequest,
  type OCOOrderRequest,
  type Balance,
  type Position,
  type WebSocketSubscription,
  type WebSocketCallback,
  type OperationResult,
  type ExchangeInfo,
} from './types.js';

/**
 * Базовый класс для всех интеграций с биржами
 */
export abstract class BaseExchange {
  protected config: ExchangeConfig;
  protected name: ExchangeName;
  protected marketType: MarketType;
  protected isConnected: boolean;
  protected rateLimitCounter: number;
  protected rateLimitResetTime: number;
  protected wsConnections: Map<string, any>;

  constructor(config: ExchangeConfig, marketType: MarketType = MarketType.SPOT) {
    this.config = config;
    this.name = config.name;
    this.marketType = marketType;
    this.isConnected = false;
    this.rateLimitCounter = 0;
    this.rateLimitResetTime = Date.now() + 60000;
    this.wsConnections = new Map();
  }

  /**
   * Проверка и применение rate limiting
   */
  protected async checkRateLimit(): Promise<void> {
    if (!this.config.enableRateLimit) {
      return;
    }

    const now = Date.now();

    // Сброс счетчика каждую минуту
    if (now >= this.rateLimitResetTime) {
      this.rateLimitCounter = 0;
      this.rateLimitResetTime = now + 60000;
    }

    // Проверка лимита
    const limit = this.config.rateLimit || 1200;
    if (this.rateLimitCounter >= limit) {
      const waitTime = this.rateLimitResetTime - now;
      console.warn(`[${this.name}] Rate limit reached. Waiting ${waitTime}ms before next request`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.rateLimitCounter = 0;
      this.rateLimitResetTime = Date.now() + 60000;
    }

    this.rateLimitCounter++;
  }

  /**
   * Логирование запроса
   */
  protected logRequest(method: string, params?: any): void {
    console.debug(
      `[${this.name}:${this.marketType}] ${method}`,
      params ? JSON.stringify(params) : '',
    );
  }

  /**
   * Логирование ошибки
   */
  protected logError(method: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${this.name}:${this.marketType}] ${method} failed:`, message);
  }

  /**
   * Создание результата операции
   */
  protected createResult<T>(success: boolean, data?: T, error?: string): OperationResult<T> {
    return {
      success,
      data,
      error,
      timestamp: Date.now(),
    };
  }

  // =============================================================================
  // MARKET DATA - Абстрактные методы (должны быть реализованы в наследниках)
  // =============================================================================

  /**
   * Получение исторических свечей (OHLCV)
   */
  abstract getCandles(
    symbol: string,
    interval: CandleInterval,
    limit?: number,
    startTime?: number,
    endTime?: number,
  ): Promise<Candle[]>;

  /**
   * Получение order book (стакан)
   */
  abstract getOrderBook(symbol: string, depth?: number): Promise<OrderBook>;

  /**
   * Получение последних сделок
   */
  abstract getRecentTrades(symbol: string, limit?: number): Promise<Trade[]>;

  /**
   * Получение текущего ticker (цены)
   */
  abstract getTicker(symbol: string): Promise<Ticker>;

  /**
   * Получение всех тикеров
   */
  abstract getAllTickers(): Promise<Ticker[]>;

  // =============================================================================
  // TRADING - Абстрактные методы
  // =============================================================================

  /**
   * Размещение ордера
   */
  abstract placeOrder(order: OrderRequest): Promise<Order>;

  /**
   * Отмена ордера
   */
  abstract cancelOrder(symbol: string, orderId: string): Promise<OperationResult>;

  /**
   * Отмена всех ордеров по символу
   */
  abstract cancelAllOrders(symbol: string): Promise<OperationResult>;

  /**
   * Получение ордера по ID
   */
  abstract getOrder(symbol: string, orderId: string): Promise<Order>;

  /**
   * Получение открытых ордеров
   */
  abstract getOpenOrders(symbol?: string): Promise<Order[]>;

  /**
   * Размещение OCO ордера
   */
  abstract placeOCOOrder(order: OCOOrderRequest): Promise<OperationResult<Order[]>>;

  // =============================================================================
  // ACCOUNT - Абстрактные методы
  // =============================================================================

  /**
   * Получение баланса
   */
  abstract getBalance(): Promise<Balance[]>;

  /**
   * Получение баланса по конкретному активу
   */
  abstract getAssetBalance(asset: string): Promise<Balance | null>;

  // =============================================================================
  // FUTURES - Абстрактные методы (опционально дляspot)
  // =============================================================================

  /**
   * Получение открытых позиций
   */
  abstract getPositions(symbol?: string): Promise<Position[]>;

  /**
   * Изменение плеча (leverage)
   */
  abstract setLeverage(symbol: string, leverage: number): Promise<OperationResult>;

  // =============================================================================
  // WEBSOCKET - Абстрактные методы
  // =============================================================================

  /**
   * Подписка на WebSocket поток
   */
  abstract subscribeToStream(
    subscription: WebSocketSubscription,
    callback: WebSocketCallback,
  ): Promise<void>;

  /**
   * Отписка от WebSocket потока
   */
  abstract unsubscribeFromStream(subscription: WebSocketSubscription): Promise<void>;

  // =============================================================================
  // CONNECTION MANAGEMENT
  // =============================================================================

  /**
   * Проверка подключения к API биржи
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Получение информации о бирже
   */
  getExchangeInfo(): ExchangeInfo {
    const limit = this.config.rateLimit || 1200;
    return {
      name: this.name,
      marketType: this.marketType,
      isConnected: this.isConnected,
      testnet: this.config.testnet || false,
      rateLimitUsed: this.rateLimitCounter,
      rateLimitTotal: limit,
    };
  }

  /**
   * Закрытие всех соединений
   */
  async cleanup(): Promise<void> {
    console.info(`[${this.name}:${this.marketType}] Cleaning up connections...`);

    // Закрываем все WebSocket соединения
    for (const [key, ws] of this.wsConnections) {
      try {
        if (ws && typeof ws.close === 'function') {
          ws.close();
        }
      } catch (error) {
        console.error(`[${this.name}] Failed to close WebSocket ${key}:`, error);
      }
    }

    this.wsConnections.clear();
    this.isConnected = false;

    console.info(`[${this.name}:${this.marketType}] Cleanup completed`);
  }

  /**
   * Получение названия биржи
   */
  getName(): ExchangeName {
    return this.name;
  }

  /**
   * Получение типа рынка
   */
  getMarketType(): MarketType {
    return this.marketType;
  }

  /**
   * Проверка подключения
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }
}
