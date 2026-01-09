/**
 * Exchange API Integration Types
 * Унифицированные интерфейсы для работы с криптобиржами
 */

/**
 * OHLCV свеча
 */
export interface Candle {
  timestamp: number; // Unix timestamp в миллисекундах
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol: string;
  interval: string;
}

/**
 * Интервалы для свечей
 */
export enum CandleInterval {
  ONE_MINUTE = '1m',
  THREE_MINUTES = '3m',
  FIVE_MINUTES = '5m',
  FIFTEEN_MINUTES = '15m',
  THIRTY_MINUTES = '30m',
  ONE_HOUR = '1h',
  TWO_HOURS = '2h',
  FOUR_HOURS = '4h',
  SIX_HOURS = '6h',
  EIGHT_HOURS = '8h',
  TWELVE_HOURS = '12h',
  ONE_DAY = '1d',
  THREE_DAYS = '3d',
  ONE_WEEK = '1w',
  ONE_MONTH = '1M',
}

/**
 * Запись в order book
 */
export interface OrderBookEntry {
  price: number;
  quantity: number;
}

/**
 * Order Book (стакан)
 */
export interface OrderBook {
  symbol: string;
  timestamp: number;
  bids: OrderBookEntry[]; // Заявки на покупку (отсортированы по убыванию цены)
  asks: OrderBookEntry[]; // Заявки на продажу (отсортированы по возрастанию цены)
}

/**
 * Последняя сделка
 */
export interface Trade {
  id: string;
  timestamp: number;
  symbol: string;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  isBuyerMaker: boolean;
}

/**
 * Тикер (текущая цена и статистика)
 */
export interface Ticker {
  symbol: string;
  timestamp: number;
  lastPrice: number;
  bidPrice: number;
  askPrice: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  priceChange24h: number;
  priceChangePercent24h: number;
}

/**
 * Тип ордера
 */
export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  STOP_LOSS = 'STOP_LOSS',
  STOP_LOSS_LIMIT = 'STOP_LOSS_LIMIT',
  TAKE_PROFIT = 'TAKE_PROFIT',
  TAKE_PROFIT_LIMIT = 'TAKE_PROFIT_LIMIT',
  LIMIT_MAKER = 'LIMIT_MAKER', // Post-only limit order
}

/**
 * Сторона ордера
 */
export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL',
}

/**
 * Статус ордера
 */
export enum OrderStatus {
  NEW = 'NEW',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  FILLED = 'FILLED',
  CANCELED = 'CANCELED',
  PENDING_CANCEL = 'PENDING_CANCEL',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

/**
 * Time in Force
 */
export enum TimeInForce {
  GTC = 'GTC', // Good Till Cancel
  IOC = 'IOC', // Immediate or Cancel
  FOK = 'FOK', // Fill or Kill
}

/**
 * Запрос на создание ордера
 */
export interface OrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number; // Для limit ордеров
  stopPrice?: number; // Для stop ордеров
  timeInForce?: TimeInForce;
  clientOrderId?: string;
  // OCO (One-Cancels-the-Other) параметры
  stopLimitPrice?: number;
  stopLimitTimeInForce?: TimeInForce;
}

/**
 * Ордер
 */
export interface Order {
  orderId: string;
  clientOrderId?: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  status: OrderStatus;
  filled: number;
  remaining: number;
  averagePrice?: number;
  createdAt: number;
  updatedAt: number;
  timeInForce?: TimeInForce;
  commission?: number;
  commissionAsset?: string;
}

/**
 * Баланс актива
 */
export interface Balance {
  asset: string;
  free: number; // Доступный баланс
  locked: number; // Заблокированный баланс
  total: number; // Общий баланс
}

/**
 * Позиция (для futures)
 */
export interface Position {
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice?: number;
  leverage: number;
  unrealizedPnl: number;
  margin: number;
  marginType: 'isolated' | 'cross';
}

/**
 * WebSocket события
 */
export enum WebSocketEventType {
  TRADE = 'trade',
  TICKER = 'ticker',
  ORDER_BOOK = 'orderBook',
  ORDER_UPDATE = 'orderUpdate',
  BALANCE_UPDATE = 'balanceUpdate',
  CANDLE = 'candle',
  ERROR = 'error',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
}

/**
 * WebSocket сообщение
 */
export interface WebSocketMessage {
  type: WebSocketEventType;
  data: unknown;
  timestamp: number;
}

/**
 * Конфигурация биржи
 */
export interface ExchangeConfig {
  apiKey?: string;
  apiSecret?: string;
  passphrase?: string; // Для OKX
  testnet?: boolean;
  timeout?: number; // Таймаут запросов в мс
  recvWindow?: number; // Для Binance
  enableRateLimit?: boolean;
  rateLimit?: number; // Запросов в минуту
}

/**
 * Тип рынка
 */
export enum MarketType {
  SPOT = 'spot',
  FUTURES = 'futures',
  MARGIN = 'margin',
}

/**
 * Информация о бирже
 */
export interface ExchangeInfo {
  name: string;
  marketTypes: MarketType[];
  symbols: string[];
  fees: {
    maker: number;
    taker: number;
  };
  limits: {
    withdrawal: Record<string, { min: number; max: number }>;
    deposit: Record<string, { min: number; max: number }>;
    order: {
      minQuantity: number;
      maxQuantity: number;
      minPrice: number;
      maxPrice: number;
    };
  };
}

/**
 * Базовый интерфейс биржи
 */
export interface IExchange {
  readonly name: string;
  readonly marketType: MarketType;

  // Инициализация и управление
  initialize(): Promise<void>;
  isInitialized(): boolean;
  disconnect(): Promise<void>;

  // Market Data
  getCandles(
    symbol: string,
    interval: CandleInterval,
    limit?: number,
    startTime?: number,
    endTime?: number,
  ): Promise<Candle[]>;

  getOrderBook(symbol: string, depth?: number): Promise<OrderBook>;

  getTrades(symbol: string, limit?: number): Promise<Trade[]>;

  getTicker(symbol: string): Promise<Ticker>;

  getAllTickers(): Promise<Ticker[]>;

  // Trading
  placeOrder(order: OrderRequest): Promise<Order>;

  cancelOrder(symbol: string, orderId: string): Promise<void>;

  cancelAllOrders(symbol: string): Promise<void>;

  getOrder(symbol: string, orderId: string): Promise<Order>;

  getOpenOrders(symbol?: string): Promise<Order[]>;

  getOrderHistory(
    symbol?: string,
    limit?: number,
    startTime?: number,
    endTime?: number,
  ): Promise<Order[]>;

  // Account
  getBalance(): Promise<Balance[]>;

  getBalanceForAsset(asset: string): Promise<Balance>;

  // Futures specific (optional)
  getPositions?(symbol?: string): Promise<Position[]>;

  setLeverage?(symbol: string, leverage: number): Promise<void>;

  setMarginType?(symbol: string, marginType: 'isolated' | 'cross'): Promise<void>;

  // WebSocket
  subscribeToTrades(symbol: string, callback: (trade: Trade) => void): void;

  subscribeToTicker(symbol: string, callback: (ticker: Ticker) => void): void;

  subscribeToOrderBook(symbol: string, callback: (orderBook: OrderBook) => void): void;

  subscribeToCandles(
    symbol: string,
    interval: CandleInterval,
    callback: (candle: Candle) => void,
  ): void;

  unsubscribe(symbol: string, event: WebSocketEventType): void;

  unsubscribeAll(): void;

  // Utility
  getExchangeInfo(): Promise<ExchangeInfo>;

  getSymbols(): Promise<string[]>;

  validateSymbol(symbol: string): Promise<boolean>;

  formatSymbol(base: string, quote: string): string;
}

/**
 * Ошибка биржи
 */
export class ExchangeError extends Error {
  constructor(
    message: string,
    public readonly code?: string | number,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'ExchangeError';
  }
}

/**
 * Ошибка аутентификации
 */
export class AuthenticationError extends ExchangeError {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Ошибка rate limit
 */
export class RateLimitError extends ExchangeError {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Ошибка недостаточного баланса
 */
export class InsufficientBalanceError extends ExchangeError {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientBalanceError';
  }
}

/**
 * Ошибка невалидного символа
 */
export class InvalidSymbolError extends ExchangeError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSymbolError';
  }
}
