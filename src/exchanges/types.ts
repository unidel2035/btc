/**
 * Типы данных для интеграции с биржами
 */

/**
 * Название биржи
 */
export enum ExchangeName {
  BINANCE = 'binance',
  BYBIT = 'bybit',
  OKX = 'okx',
  COINBASE = 'coinbase',
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
 * Интервал свечей
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
  TWELVE_HOURS = '12h',
  ONE_DAY = '1d',
  THREE_DAYS = '3d',
  ONE_WEEK = '1w',
  ONE_MONTH = '1M',
}

/**
 * Свеча (OHLCV)
 */
export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Запись в order book
 */
export interface OrderBookEntry {
  price: number;
  quantity: number;
}

/**
 * Order book (стакан)
 */
export interface OrderBook {
  symbol: string;
  timestamp: number;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

/**
 * Последняя сделка
 */
export interface Trade {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  timestamp: number;
  side: 'buy' | 'sell';
}

/**
 * Ticker (текущая цена)
 */
export interface Ticker {
  symbol: string;
  timestamp: number;
  bid: number;
  ask: number;
  last: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  change24h: number;
  changePercent24h: number;
}

/**
 * Тип ордера
 */
export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  STOP_LOSS = 'stop_loss',
  STOP_LOSS_LIMIT = 'stop_loss_limit',
  TAKE_PROFIT = 'take_profit',
  TAKE_PROFIT_LIMIT = 'take_profit_limit',
  STOP_MARKET = 'stop_market',
  TAKE_PROFIT_MARKET = 'take_profit_market',
  TRAILING_STOP = 'trailing_stop',
}

/**
 * Сторона ордера
 */
export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell',
}

/**
 * Статус ордера
 */
export enum OrderStatus {
  NEW = 'new',
  PARTIALLY_FILLED = 'partially_filled',
  FILLED = 'filled',
  CANCELED = 'canceled',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

/**
 * Time in Force
 */
export enum TimeInForce {
  GTC = 'GTC', // Good Till Cancel
  IOC = 'IOC', // Immediate or Cancel
  FOK = 'FOK', // Fill or Kill
  GTX = 'GTX', // Good Till Crossing (Post only)
}

/**
 * Запрос на создание ордера
 */
export interface OrderRequest {
  symbol: string;
  type: OrderType;
  side: OrderSide;
  quantity: number;
  price?: number; // Для лимитных ордеров
  stopPrice?: number; // Для стоп-ордеров
  timeInForce?: TimeInForce;
  clientOrderId?: string;
  reduceOnly?: boolean; // Только для фьючерсов
  postOnly?: boolean; // Только maker ордера
}

/**
 * Ордер
 */
export interface Order {
  id: string;
  clientOrderId?: string;
  symbol: string;
  type: OrderType;
  side: OrderSide;
  status: OrderStatus;
  price?: number;
  stopPrice?: number;
  quantity: number;
  executedQuantity: number;
  remainingQuantity: number;
  averagePrice?: number;
  createdAt: number;
  updatedAt: number;
  timeInForce?: TimeInForce;
}

/**
 * OCO (One-Cancels-the-Other) ордер
 */
export interface OCOOrderRequest {
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number; // Лимитная цена
  stopPrice: number; // Стоп-цена
  stopLimitPrice?: number; // Стоп-лимит цена (если нужен stop-limit)
  stopLimitTimeInForce?: TimeInForce;
}

/**
 * Баланс
 */
export interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
}

/**
 * Позиция (для фьючерсов)
 */
export interface Position {
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice?: number;
  leverage: number;
  unrealizedPnl: number;
  marginType: 'isolated' | 'cross';
  timestamp: number;
}

/**
 * Конфигурация биржи
 */
export interface ExchangeConfig {
  name: ExchangeName;
  apiKey: string;
  apiSecret: string;
  passphrase?: string; // Для OKX
  testnet?: boolean;
  timeout?: number; // Таймаут запросов в мс
  recvWindow?: number; // Окно приема для Binance
  enableRateLimit?: boolean;
  rateLimit?: number; // Запросов в минуту
}

/**
 * WebSocket подписка
 */
export interface WebSocketSubscription {
  symbol: string;
  channel: 'trades' | 'orderbook' | 'ticker' | 'kline';
  interval?: CandleInterval; // Для kline
}

/**
 * Callback для WebSocket событий
 */
export type WebSocketCallback = (data: any) => void;

/**
 * Результат операции
 */
export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

/**
 * Информация о бирже
 */
export interface ExchangeInfo {
  name: ExchangeName;
  marketType: MarketType;
  isConnected: boolean;
  testnet: boolean;
  rateLimitUsed: number;
  rateLimitTotal: number;
}
