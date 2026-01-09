/**
 * Types for backtesting engine
 */

/**
 * Historical candle data (OHLCV)
 */
export interface Candle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Trade execution in backtest
 */
export interface Trade {
  id: string;
  symbol: string;
  direction: 'long' | 'short';
  entryTime: Date;
  entryPrice: number;
  exitTime?: Date;
  exitPrice?: number;
  quantity: number;
  positionSize: number; // % of capital
  stopLoss?: number;
  takeProfit?: number;
  pnl?: number; // profit/loss in quote currency
  pnlPercent?: number; // profit/loss in %
  fees: number;
  slippage: number;
  exitReason?: 'take-profit' | 'stop-loss' | 'signal' | 'time-limit' | 'end-of-data';
  strategyName: string;
}

/**
 * Backtesting configuration
 */
export interface BacktestConfig {
  symbol: string | string[]; // single or multiple symbols
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  strategyName: string;
  strategyParams?: Record<string, unknown>;

  // Execution settings
  fees: {
    maker: number; // maker fee in %
    taker: number; // taker fee in %
  };
  slippage: number; // slippage in %

  // Position sizing
  maxPositionSize?: number; // max % of capital per trade
  allowShorts?: boolean; // allow short positions

  // Data settings
  timeframe?: string; // candle timeframe (1m, 5m, 15m, 1h, 4h, 1d)
  dataSource?: 'binance' | 'csv' | 'parquet' | 'custom' | 'mock';
}

/**
 * Backtest results
 */
export interface BacktestResult {
  // Configuration
  config: BacktestConfig;

  // Performance metrics
  totalReturn: number; // total return in %
  annualizedReturn: number; // annualized return in %
  sharpeRatio: number; // risk-adjusted return
  sortinoRatio: number; // downside risk-adjusted return
  maxDrawdown: number; // maximum drawdown in %
  maxDrawdownDuration: number; // max drawdown duration in days

  // Trading metrics
  winRate: number; // % of winning trades
  profitFactor: number; // gross profit / gross loss
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;

  // Trade statistics
  avgTradeDuration: number; // average trade duration in hours
  avgWin: number; // average winning trade in %
  avgLoss: number; // average losing trade in %
  largestWin: number;
  largestLoss: number;

  // Equity curve
  equityCurve: EquityPoint[];

  // All trades
  trades: Trade[];

  // Timing
  executionTime: number; // backtest execution time in ms
  startTime: Date;
  endTime: Date;
}

/**
 * Point in equity curve
 */
export interface EquityPoint {
  timestamp: Date;
  equity: number; // total equity
  cash: number; // available cash
  positions: number; // value of open positions
  drawdown: number; // drawdown from peak in %
}

/**
 * Monthly performance breakdown
 */
export interface MonthlyPerformance {
  year: number;
  month: number;
  return: number; // return in %
  trades: number;
  winRate: number;
}

/**
 * Historical data loader interface
 */
export interface DataLoader {
  /**
   * Load historical candles for a symbol
   */
  loadCandles(
    symbol: string,
    startDate: Date,
    endDate: Date,
    timeframe?: string,
  ): Promise<Candle[]>;
}

/**
 * Position state during backtest
 */
export interface Position {
  tradeId: string;
  symbol: string;
  direction: 'long' | 'short';
  entryTime: Date;
  entryPrice: number;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  strategyName: string;
}

/**
 * Backtest state at a point in time
 */
export interface BacktestState {
  currentTime: Date;
  cash: number;
  positions: Position[];
  closedTrades: Trade[];
  equity: number;
  peakEquity: number;
  currentDrawdown: number;
}
