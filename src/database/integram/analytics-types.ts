/**
 * Integram Analytics Database Types
 * Types for storing portfolio analytics data in Integram
 */

/**
 * Table Type IDs in Integram for Analytics
 * These should be set in environment variables after creating tables in Integram web interface
 */
export const ANALYTICS_TYPES = {
  // Main analytics tables
  TRADE_ANALYTICS: parseInt(process.env.INTEGRAM_TYPE_TRADE_ANALYTICS || '0'),
  DAILY_PORTFOLIO_SNAPSHOT: parseInt(process.env.INTEGRAM_TYPE_DAILY_PORTFOLIO_SNAPSHOT || '0'),
  STRATEGY_PERFORMANCE: parseInt(process.env.INTEGRAM_TYPE_STRATEGY_PERFORMANCE || '0'),
  ASSET_PERFORMANCE: parseInt(process.env.INTEGRAM_TYPE_ASSET_PERFORMANCE || '0'),
  ANALYTICS_REPORTS: parseInt(process.env.INTEGRAM_TYPE_ANALYTICS_REPORTS || '0'),

  // Historical data
  EQUITY_CURVE_POINTS: parseInt(process.env.INTEGRAM_TYPE_EQUITY_CURVE_POINTS || '0'),
  DRAWDOWN_PERIODS: parseInt(process.env.INTEGRAM_TYPE_DRAWDOWN_PERIODS || '0'),

  // Lookup tables
  STRATEGIES: parseInt(process.env.INTEGRAM_TYPE_STRATEGIES || '0'),
  ASSETS: parseInt(process.env.INTEGRAM_TYPE_ASSETS || '0'),
  EXIT_REASONS: parseInt(process.env.INTEGRAM_TYPE_EXIT_REASONS || '0'),
} as const;

/**
 * Trade Analytics table schema
 * Stores detailed analytics for each trade
 */
export interface IntegramTradeAnalytics {
  id: number; // Integram object ID
  value: string; // Trade ID
  requisites: {
    tradeId: string; // Reference to original trade
    strategy: string; // Reference to Strategies
    asset: string; // Reference to Assets
    entryDateTime: string; // ISO datetime
    exitDateTime: string; // ISO datetime
    duration: number; // hours
    entryPrice: number;
    exitPrice: number;
    size: number; // USDT
    pnl: number; // USDT
    pnlPercent: number;
    fees: number;
    slippage: number;
    slDistance: number | null; // % from entry
    tpDistance: number | null; // % from entry
    mfe: number | null; // Max Favorable Excursion %
    mae: number | null; // Max Adverse Excursion %
    direction: string; // 'long' or 'short'
    exitReason: string; // Reference to ExitReasons
  };
}

/**
 * Daily Portfolio Snapshot table schema
 * Stores daily portfolio state for historical analysis
 */
export interface IntegramDailyPortfolioSnapshot {
  id: number;
  value: string; // Date (YYYY-MM-DD)
  requisites: {
    date: string; // ISO date
    totalBalance: number;
    availableBalance: number;
    inPositions: number;
    dailyReturn: number; // %
    dailyPnL: number; // USDT
    openPositionsCount: number;
    tradesCount: number;
    winRate: number; // %
    maxDrawdown: number; // %
    sharpeRatio30d: number; // rolling 30-day
    drawdownFromPeak: number; // %
    daysSinceATH: number;
  };
}

/**
 * Strategy Performance table schema (subordinate to Analytics Reports)
 */
export interface IntegramStrategyPerformance {
  id: number;
  value: string; // Strategy name
  up?: number; // Parent report ID
  requisites: {
    strategy: string; // Reference to Strategies
    reportDate: string; // ISO date
    trades: number;
    winRate: number; // %
    pnl: number; // USDT
    pnlPercent: number; // %
    sharpeRatio: number;
    maxDrawdown: number;
    avgTradeDuration: number; // hours
    profitFactor: number;
    avgPositionSize: number;
  };
}

/**
 * Asset Performance table schema (subordinate to Analytics Reports)
 */
export interface IntegramAssetPerformance {
  id: number;
  value: string; // Asset symbol
  up?: number; // Parent report ID
  requisites: {
    asset: string; // Reference to Assets
    reportDate: string; // ISO date
    trades: number;
    winRate: number; // %
    pnl: number; // USDT
    pnlPercent: number; // %
    avgHoldTime: number; // hours
    largestWin: number; // %
    largestLoss: number; // %
    avgPositionSize: number;
    totalVolume: number; // USDT
  };
}

/**
 * Analytics Reports table schema
 * Main container for periodic analytics reports
 */
export interface IntegramAnalyticsReport {
  id: number;
  value: string; // Report date/period
  requisites: {
    generatedAt: string; // ISO datetime
    periodType: string; // 'daily', 'weekly', 'monthly', 'yearly'
    periodStart: string; // ISO date
    periodEnd: string; // ISO date

    // Performance summary
    totalReturn: number; // %
    totalReturnAbsolute: number; // USDT
    annualizedReturn: number;
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;

    // Risk metrics
    maxDrawdown: number; // %
    maxDrawdownAbsolute: number; // USDT
    currentDrawdown: number;
    valueAtRisk95: number;
    valueAtRisk99: number;

    // Trade stats
    totalTrades: number;
    winRate: number; // %
    profitFactor: number;
    avgTradeDuration: number; // hours

    // Portfolio state
    startEquity: number;
    endEquity: number;
    currentExposure: number; // %

    // Benchmarks
    btcReturn: number | null; // %
    ethReturn: number | null; // %

    // JSON data (serialized)
    strategyBreakdown: string; // JSON array
    assetBreakdown: string; // JSON array
    correlationMatrix: string | null; // JSON
  };
}

/**
 * Equity Curve Points table schema (subordinate to Daily Portfolio Snapshot)
 */
export interface IntegramEquityCurvePoint {
  id: number;
  value: string; // Timestamp
  up?: number; // Parent snapshot ID
  requisites: {
    timestamp: string; // ISO datetime
    equity: number;
    cash: number;
    positions: number;
    drawdown: number; // %
    dailyReturn: number | null; // %
  };
}

/**
 * Drawdown Periods table schema
 * Tracks significant drawdown events
 */
export interface IntegramDrawdownPeriod {
  id: number;
  value: string; // Start date
  requisites: {
    startDate: string; // ISO date
    endDate: string; // ISO date (valley)
    duration: number; // days
    depth: number; // %
    recovered: boolean;
    recoveryDate: string | null; // ISO date
    peakEquity: number;
    valleyEquity: number;
  };
}

/**
 * Strategies lookup table schema
 */
export interface IntegramStrategy {
  id: number;
  value: string; // Strategy name (unique)
  requisites: {
    name: string;
    description: string; // Long text
    active: boolean;
    createdAt: string; // ISO datetime
    params: string; // JSON configuration
  };
}

/**
 * Assets lookup table schema
 */
export interface IntegramAsset {
  id: number;
  value: string; // Asset symbol (unique)
  requisites: {
    symbol: string;
    name: string;
    type: string; // 'spot', 'futures', etc.
    exchange: string;
    active: boolean;
    lastTraded: string; // ISO datetime
  };
}

/**
 * Exit Reasons lookup table schema
 */
export interface IntegramExitReason {
  id: number;
  value: string; // Reason name (unique)
  requisites: {
    reason: string; // 'take-profit', 'stop-loss', 'signal', etc.
    description: string;
    category: string; // 'planned', 'risk-management', 'strategy', 'manual'
  };
}

/**
 * Helper types for analytics queries
 */

/**
 * Performance comparison between periods
 */
export interface PeriodComparison {
  period1: {
    start: Date;
    end: Date;
    return: number;
    sharpe: number;
    trades: number;
  };
  period2: {
    start: Date;
    end: Date;
    return: number;
    sharpe: number;
    trades: number;
  };
  returnDelta: number;
  sharpeDelta: number;
  tradesDelta: number;
}

/**
 * Strategy ranking over time
 */
export interface StrategyRanking {
  strategy: string;
  avgReturn: number;
  avgSharpe: number;
  totalTrades: number;
  winRate: number;
  rank: number;
}

/**
 * Asset ranking over time
 */
export interface AssetRanking {
  asset: string;
  avgReturn: number;
  totalTrades: number;
  winRate: number;
  totalVolume: number;
  rank: number;
}

/**
 * Performance trend data
 */
export interface PerformanceTrend {
  dates: Date[];
  returns: number[];
  sharpeRatios: number[];
  winRates: number[];
  equityCurve: number[];
}
