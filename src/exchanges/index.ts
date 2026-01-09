/**
 * Exchanges Module
 *
 * Модуль интеграции с криптовалютными биржами
 */

// Types
export type {
  IExchange,
  ExchangeConfig,
  Candle,
  OrderBook,
  OrderBookLevel,
  Trade,
  Ticker,
  Order,
  OrderRequest,
  Balance,
  CandleInterval,
  MarketType,
  OrderType,
  OrderSide,
  OrderStatus,
  TimeInForce,
  WebSocketCallback,
  WebSocketTradeUpdate,
  WebSocketTickerUpdate,
  WebSocketCandleUpdate,
  WebSocketOrderBookUpdate,
  ExchangeLimits,
  GetCandlesOptions,
  GetOrderBookOptions,
  GetTradesOptions,
  GetTickerOptions,
} from './types.js';

// Base Exchange
export { BaseExchange } from './BaseExchange.js';

// Exchange Implementations
export { BinanceExchange } from './BinanceExchange.js';
export { BybitExchange } from './BybitExchange.js';

// Exchange Manager
export { ExchangeManager } from './ExchangeManager.js';
export type { ExchangeManagerConfig } from './ExchangeManager.js';

// Configuration
export {
  createExchangeConfig,
  validateExchangeConfig,
  getAvailableExchanges,
  isExchangeAvailable,
} from './config.js';

// Security utilities
export {
  encrypt,
  decrypt,
  createHmacSignature,
  isValidMasterKey,
  generateMasterKey,
  sha256Hash,
} from './security.js';
