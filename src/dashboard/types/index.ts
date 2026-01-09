/**
 * Dashboard-specific types and interfaces
 */

import type { Signal, SignalType, SignalSentiment } from '../../trading/strategies/types.js';
import type { Position, PositionSide, PositionStatus } from '../../trading/risk/types.js';

export interface DashboardOverview {
  balance: {
    total: number;
    available: number;
    inPositions: number;
  };
  pnl: {
    today: number;
    week: number;
    month: number;
    total: number;
  };
  positions: {
    count: number;
    long: number;
    short: number;
  };
  signals: {
    recent: Signal[];
    count24h: number;
  };
  metrics: {
    winRate: number;
    avgProfit: number;
    maxDrawdown: number;
    sharpeRatio: number;
  };
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  sentiment: SignalSentiment;
  sentimentScore: number;
  impact: number;
  timestamp: Date;
  symbols: string[];
}

export interface PositionWithPnL extends Position {
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  duration: number; // seconds
  exitTime?: Date; // for closed positions
}

export interface PerformanceMetrics {
  period: string;
  equity: Array<{ timestamp: Date; value: number }>;
  trades: {
    total: number;
    wins: number;
    losses: number;
    winRate: number;
  };
  profit: {
    gross: number;
    net: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
  };
  risk: {
    maxDrawdown: number;
    maxDrawdownPercent: number;
    sharpeRatio: number;
    sortinoRatio: number;
  };
}

export interface StrategyPerformance {
  name: string;
  enabled: boolean;
  signals: number;
  trades: number;
  winRate: number;
  profit: number;
  avgProfit: number;
  maxDrawdown: number;
}

export interface TradeJournalEntry {
  id: string;
  symbol: string;
  side: PositionSide;
  entryTime: Date;
  exitTime: Date;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  strategy: string;
  signals: string[];
  duration: number;
  fees: number;
}

export interface DashboardSettings {
  strategies: {
    [key: string]: {
      enabled: boolean;
      params: Record<string, unknown>;
    };
  };
  risk: {
    maxPositionSize: number;
    maxPositions: number;
    maxDailyLoss: number;
    maxTotalDrawdown: number;
    defaultStopLoss: number;
    defaultTakeProfit: number;
  };
  notifications: {
    telegram: {
      enabled: boolean;
      chatId?: string;
    };
    email: {
      enabled: boolean;
      address?: string;
    };
    webhook: {
      enabled: boolean;
      url?: string;
    };
  };
  api: {
    exchange: string;
    testMode: boolean;
  };
}

export { Signal, SignalType, SignalSentiment, Position, PositionSide, PositionStatus };
