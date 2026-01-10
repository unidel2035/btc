/**
 * Types for Portfolio Analytics Module
 */

/**
 * Historical trade record for analytics
 */
export interface AnalyticsTrade {
  id: string;
  strategy: string;
  asset: string;
  entryDate: Date;
  exitDate: Date;
  duration: number; // hours
  entryPrice: number;
  exitPrice: number;
  size: number; // USDT
  pnl: number; // USDT
  pnlPercent: number;
  fees: number;
  slippage: number;
  slDistance?: number; // % from entry
  tpDistance?: number; // % from entry
  maxFavorableExcursion?: number; // MFE %
  maxAdverseExcursion?: number; // MAE %
  direction: 'long' | 'short';
  exitReason?: 'take-profit' | 'stop-loss' | 'signal' | 'time-limit' | 'manual';
}

/**
 * Daily portfolio snapshot
 */
export interface DailyPortfolioSnapshot {
  date: Date;
  totalBalance: number;
  availableBalance: number;
  inPositions: number;
  dailyReturn: number; // %
  dailyPnL: number; // USDT
  openPositionsCount: number;
  tradesCount: number;
  winRate: number; // %
  maxDrawdown: number; // %
  sharpeRatio30d: number; // rolling 30-day Sharpe
}

/**
 * Performance metrics results
 */
export interface PerformanceMetrics {
  // Returns
  totalReturn: number; // %
  totalReturnAbsolute: number; // USDT
  dailyReturn?: number;
  weeklyReturn?: number;
  monthlyReturn?: number;
  yearlyReturn?: number;
  cagr: number; // Compound Annual Growth Rate
  annualizedReturn: number;
  timeWeightedReturn: number; // TWR
  moneyWeightedReturn: number; // MWR/IRR

  // Risk metrics
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number; // %
  maxDrawdownAbsolute: number; // USDT
  avgDrawdown: number;
  drawdownDuration: number; // days
  currentDrawdown: number;
  valueAtRisk95: number; // VaR 95%
  valueAtRisk99: number; // VaR 99%
  conditionalVaR95: number; // CVaR 95%
  conditionalVaR99: number; // CVaR 99%
  beta?: number; // vs BTC/market
  alpha?: number; // excess return

  // Volatility
  volatility: number; // standard deviation of returns
  downsideDeviation: number;
  annualizedVolatility: number;
}

/**
 * Trade statistics
 */
export interface TradeStatistics {
  totalTrades: number;
  avgTradesPerDay: number;
  avgTradesPerWeek: number;
  avgTradesPerMonth: number;
  avgTradeDuration: number; // hours
  avgPositionSize: number; // USDT
  turnoverRate: number; // trades per unit of capital

  // Win/Loss metrics
  winRate: number; // %
  profitFactor: number; // gross profit / gross loss
  avgWin: number; // %
  avgLoss: number; // %
  winLossRatio: number;
  largestWin: number; // %
  largestLoss: number; // %
  avgHoldingTimeWinners: number; // hours
  avgHoldingTimeLosers: number; // hours
  consecutiveWinsMax: number;
  consecutiveLossesMax: number;

  // Trade distribution
  longTrades: number;
  shortTrades: number;
  longWinRate: number;
  shortWinRate: number;
}

/**
 * Strategy performance breakdown
 */
export interface StrategyPerformance {
  strategy: string;
  trades: number;
  winRate: number; // %
  pnl: number; // USDT
  pnlPercent: number; // %
  sharpeRatio: number;
  maxDrawdown: number;
  avgTradeDuration: number; // hours
  profitFactor: number;
  avgPositionSize: number;
}

/**
 * Asset performance breakdown
 */
export interface AssetPerformance {
  asset: string;
  trades: number;
  winRate: number; // %
  pnl: number; // USDT
  pnlPercent: number; // %
  avgHoldTime: number; // hours
  largestWin: number; // %
  largestLoss: number; // %
  avgPositionSize: number;
  totalVolume: number; // USDT traded
}

/**
 * Equity curve point
 */
export interface EquityPoint {
  timestamp: Date;
  equity: number;
  cash: number;
  positions: number;
  drawdown: number; // %
  dailyReturn?: number; // %
}

/**
 * Drawdown analysis
 */
export interface Drawdown {
  maxDrawdown: number; // %
  maxDrawdownAbsolute: number; // USDT
  avgDrawdown: number;
  currentDrawdown: number;
  drawdownDuration: number; // days
  daysSinceATH: number;
  peakDate?: Date;
  valleyDate?: Date;
  recoveryDate?: Date;
  drawdownPeriods: DrawdownPeriod[];
}

/**
 * Individual drawdown period
 */
export interface DrawdownPeriod {
  startDate: Date;
  endDate: Date;
  duration: number; // days
  depth: number; // %
  recovered: boolean;
  recoveryDate?: Date;
}

/**
 * Correlation matrix
 */
export interface CorrelationMatrix {
  assets: string[];
  matrix: number[][]; // NxN matrix
  updated: Date;
}

/**
 * Risk exposure analysis
 */
export interface RiskExposure {
  currentExposure: number; // % of portfolio in positions
  maxExposure: number; // historical max
  avgExposure: number;

  // Position sizing
  avgPositionSize: number; // % of portfolio
  maxPositionSize: number;

  // Sector exposure (if applicable)
  sectorExposure?: Map<string, number>; // sector -> % of portfolio

  // Asset concentration
  concentrationRisk: number; // % in top 3 positions
  topPositions: Array<{
    asset: string;
    exposure: number; // % of portfolio
  }>;
}

/**
 * Stop loss analysis
 */
export interface StopLossAnalysis {
  avgSlDistance: number; // % from entry
  slHitRate: number; // % of trades
  avgSlippage: number; // % on SL executions
  trailingStopPerformance?: number;
}

/**
 * Trade distribution data
 */
export interface TradeDistribution {
  pnlDistribution: {
    bins: number[]; // bin edges
    counts: number[]; // frequency
    mean: number;
    median: number;
    stdDev: number;
  };

  holdingTimeDistribution: {
    bins: number[]; // hours
    counts: number[];
    mean: number;
    median: number;
  };

  entryHourDistribution: Map<number, number>; // hour -> trade count
  exitHourDistribution: Map<number, number>;
  dayOfWeekPerformance: Map<
    string,
    {
      trades: number;
      avgReturn: number;
      winRate: number;
    }
  >;
}

/**
 * Report data
 */
export interface AnalyticsReport {
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
    type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  };

  performance: PerformanceMetrics;
  tradeStats: TradeStatistics;
  strategyPerformance: StrategyPerformance[];
  assetPerformance: AssetPerformance[];
  equityCurve: EquityPoint[];
  drawdown: Drawdown;
  riskExposure: RiskExposure;
  correlation?: CorrelationMatrix;
  distribution?: TradeDistribution;

  // Benchmarks (optional)
  benchmarks?: {
    btcReturn?: number;
    ethReturn?: number;
    marketReturn?: number;
  };

  // Summary
  summary: {
    totalTrades: number;
    winRate: number;
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
}

/**
 * Period type for analytics queries
 */
export type AnalyticsPeriod = 'day' | 'week' | 'month' | 'year' | 'all' | 'custom';

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  riskFreeRate?: number; // for Sharpe/Sortino calculation (default: 0)
  tradingDaysPerYear?: number; // default: 365 for crypto
  benchmark?: string; // asset to compare against (e.g., 'BTC')
  includeOpenPositions?: boolean; // include unrealized PnL
}

/**
 * Historical returns data
 */
export interface Returns {
  period: AnalyticsPeriod;
  totalReturn: number; // %
  absoluteReturn: number; // USDT
  annualizedReturn: number; // %
  volatility: number;
  sharpeRatio: number;

  // Breakdown
  startDate: Date;
  endDate: Date;
  startEquity: number;
  endEquity: number;

  // Sub-period returns
  dailyReturns?: number[];
  weeklyReturns?: number[];
  monthlyReturns?: number[];
}

/**
 * Monte Carlo simulation results
 */
export interface MonteCarloSimulation {
  runs: number;
  periods: number; // days ahead

  results: {
    mean: number;
    median: number;
    stdDev: number;
    percentile5: number;
    percentile25: number;
    percentile75: number;
    percentile95: number;
  };

  paths: Array<{
    equity: number[];
  }>;

  probabilityOfProfit: number; // %
  probabilityOfLoss: number; // %
}
