/**
 * Paper Trading Module
 * Export all paper trading components
 */

// Export types
export type {
  PaperTradingConfig,
  VirtualOrder,
  PaperBalance,
  PaperPosition,
  PaperTrade,
  PaperStats,
  MarketTick,
  PlaceOrderParams,
  CancelOrderResult,
  ClosePositionParams,
  ModeSwitchWarning,
} from './types.js';

// Export enums (both as types and values)
export {
  TradingMode,
  OrderType,
  OrderSide,
  OrderStatus,
} from './types.js';

// Export classes
export { PaperAccount } from './PaperAccount.js';
export { OrderManager } from './OrderManager.js';
export { StatsTracker } from './StatsTracker.js';
export { PaperTradingEngine } from './PaperTradingEngine.js';
export { ModeSwitcher } from './ModeSwitcher.js';

// Export market data feed
export type { IMarketDataFeed } from './MarketDataFeed.js';
export {
  MockMarketDataFeed,
  BinanceMarketDataFeed,
  MarketDataFeedFactory,
} from './MarketDataFeed.js';
