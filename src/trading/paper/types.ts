/**
 * Types and interfaces for paper trading mode
 */

/**
 * Trading mode
 */
export enum TradingMode {
  PAPER = 'paper',
  LIVE = 'live',
}

/**
 * Paper trading configuration
 */
export interface PaperTradingConfig {
  mode: TradingMode;
  initialBalance: number;
  fees: {
    maker: number; // maker fee in % (e.g., 0.001 = 0.1%)
    taker: number; // taker fee in % (e.g., 0.001 = 0.1%)
  };
  slippage: number; // slippage in % (e.g., 0.0005 = 0.05%)

  // Risk limits for paper trading
  maxPositionSize?: number; // max % of balance per trade
  maxPositions?: number; // max concurrent positions

  // Market data source
  dataSource?: 'binance' | 'mock' | 'custom';
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
  EXPIRED = 'expired',
}

/**
 * Virtual order
 */
export interface VirtualOrder {
  id: string;
  symbol: string;
  type: OrderType;
  side: OrderSide;
  status: OrderStatus;

  // Pricing
  price?: number; // for limit orders
  stopPrice?: number; // for stop orders
  executedPrice?: number; // actual execution price

  // Quantity
  quantity: number;
  filledQuantity: number;
  remainingQuantity: number;

  // Fees and costs
  fees: number;
  slippage: number;
  totalCost: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  filledAt?: Date;

  // Metadata
  strategyName?: string;
  reason?: string;
}

/**
 * Paper trading balance state
 */
export interface PaperBalance {
  cash: number; // available cash
  equity: number; // total equity (cash + positions value)
  positions: PaperPosition[];
  lockedCash: number; // cash locked in pending orders
  unrealizedPnL: number; // unrealized profit/loss
  realizedPnL: number; // realized profit/loss
}

/**
 * Paper position
 */
export interface PaperPosition {
  id: string;
  symbol: string;
  side: 'long' | 'short';

  // Entry
  entryPrice: number;
  entryTime: Date;
  quantity: number;
  entryFees: number;

  // Current state
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;

  // Risk parameters
  stopLoss?: number;
  takeProfit?: number;

  // Related orders
  orderId: string;
  strategyName?: string;
}

/**
 * Paper trade execution
 */
export interface PaperTrade {
  id: string;
  orderId: string;
  symbol: string;
  side: OrderSide;

  // Execution details
  executedPrice: number;
  quantity: number;
  executedAt: Date;

  // Costs
  fees: number;
  slippage: number;
  totalValue: number;

  // Position info
  positionId?: string;
  isClosing: boolean; // true if closing a position

  // Metadata
  strategyName?: string;
}

/**
 * Paper trading statistics
 */
export interface PaperStats {
  // General
  mode: TradingMode;
  startTime: Date;
  uptime: number; // in seconds

  // Balance
  initialBalance: number;
  currentEquity: number;
  totalReturn: number; // in %
  realizedPnL: number;
  unrealizedPnL: number;

  // Trading activity
  totalOrders: number;
  filledOrders: number;
  cancelledOrders: number;
  rejectedOrders: number;

  // Positions
  openPositions: number;
  closedPositions: number;

  // Performance
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // in %
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;

  // Risk metrics
  maxDrawdown: number; // in %
  currentDrawdown: number; // in %
  peakEquity: number;

  // Costs
  totalFees: number;
  totalSlippage: number;

  // Last update
  updatedAt: Date;
}

/**
 * Market data for paper trading
 */
export interface MarketTick {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  timestamp: Date;
}

/**
 * Order placement parameters
 */
export interface PlaceOrderParams {
  symbol: string;
  type: OrderType;
  side: OrderSide;
  quantity: number;
  price?: number; // for limit orders
  stopPrice?: number; // for stop orders
  stopLoss?: number;
  takeProfit?: number;
  strategyName?: string;
  reason?: string;
}

/**
 * Order cancellation result
 */
export interface CancelOrderResult {
  success: boolean;
  orderId: string;
  reason?: string;
}

/**
 * Position closure parameters
 */
export interface ClosePositionParams {
  positionId: string;
  quantity?: number; // partial close if specified
  reason?: string;
}

/**
 * Mode switch warning
 */
export interface ModeSwitchWarning {
  fromMode: TradingMode;
  toMode: TradingMode;
  warnings: string[];
  requiresConfirmation: boolean;
}
