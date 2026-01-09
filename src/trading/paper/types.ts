/**
 * Paper Trading Types
 * Types and interfaces for paper trading simulation
 */

/**
 * Trading mode
 */
export enum TradingMode {
  PAPER = 'paper',
  LIVE = 'live',
}

/**
 * Order type
 */
export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  STOP_LOSS = 'stop_loss',
  TAKE_PROFIT = 'take_profit',
}

/**
 * Order side
 */
export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell',
}

/**
 * Order status
 */
export enum OrderStatus {
  PENDING = 'pending',
  FILLED = 'filled',
  PARTIALLY_FILLED = 'partially_filled',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

/**
 * Virtual order in paper trading
 */
export interface PaperOrder {
  id: string;
  symbol: string;
  type: OrderType;
  side: OrderSide;
  status: OrderStatus;
  price?: number; // for limit orders
  quantity: number;
  filledQuantity: number;
  averagePrice: number;
  fees: number;
  slippage: number;
  createdAt: Date;
  filledAt?: Date;
  cancelledAt?: Date;
}

/**
 * Paper trading position
 */
export interface PaperPosition {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  quantity: number;
  currentPrice?: number;
  unrealizedPnL?: number;
  unrealizedPnLPercent?: number;
  stopLoss?: number;
  takeProfit?: number;
  openedAt: Date;
  openOrderId: string;
}

/**
 * Paper trading balance
 */
export interface PaperBalance {
  currency: string;
  total: number; // total balance
  available: number; // available for trading
  locked: number; // locked in orders/positions
  equity: number; // total equity (balance + unrealized P&L)
}

/**
 * Paper trading configuration
 */
export interface PaperTradingConfig {
  mode: TradingMode;
  initialBalance: number;
  currency?: string; // default: USDT
  fees: {
    maker: number; // maker fee in %
    taker: number; // taker fee in %
  };
  slippage: number; // slippage in %
  allowShorts?: boolean; // allow short positions
  maxPositions?: number; // maximum number of open positions
  marketDataSource?: 'binance' | 'bybit' | 'okx' | 'mock';
}

/**
 * Paper trading statistics
 */
export interface PaperTradingStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  totalPnLPercent: number;
  totalFees: number;
  totalSlippage: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;
  sharpeRatio?: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  startBalance: number;
  currentBalance: number;
  equity: number;
  startTime: Date;
  lastTradeTime?: Date;
}

/**
 * Closed trade record
 */
export interface ClosedTrade {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  entryTime: Date;
  exitTime: Date;
  pnl: number;
  pnlPercent: number;
  fees: number;
  slippage: number;
  entryOrderId: string;
  exitOrderId: string;
  exitReason: 'manual' | 'stop-loss' | 'take-profit' | 'strategy';
}

/**
 * Market price data for paper trading
 */
export interface MarketPrice {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  timestamp: Date;
}

/**
 * Paper trading event
 */
export interface PaperTradingEvent {
  type: 'order' | 'position' | 'balance' | 'error';
  action: 'created' | 'filled' | 'cancelled' | 'opened' | 'closed' | 'updated';
  data: unknown;
  timestamp: Date;
}
