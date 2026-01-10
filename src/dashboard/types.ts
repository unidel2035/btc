/**
 * Dashboard Types
 * Типы данных для веб-интерфейса
 */

export interface DashboardMetrics {
  balance: number;
  equity: number;
  pnl: number;
  pnlPercent: number;
  totalTrades: number;
  winRate: number;
  openPositions: number;
  dailyPnl: number;
  dailyPnlPercent: number;
}

export interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  pnl: number;
  pnlPercent: number;
  openedAt: string;
  updatedAt: string;
}

export interface Signal {
  id: string;
  type: string;
  source: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  strength: number;
  confidence: number;
  price?: number;
  reason: string;
  timestamp: string;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  source: string;
  url: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  sentimentScore: number;
  publishedAt: string;
  fetchedAt: string;
}

export interface EquityPoint {
  timestamp: string;
  equity: number;
  balance: number;
}

export interface TradeHistory {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  openedAt: string;
  closedAt: string;
  reason: string;
}

export interface StrategyConfig {
  name: string;
  enabled: boolean;
  riskPerTrade: number;
  maxPositions: number;
  parameters: Record<string, unknown>;
}

export interface RiskConfig {
  maxPositionSize: number;
  maxPositions: number;
  maxDailyLoss: number;
  maxTotalDrawdown: number;
  defaultStopLoss: number;
  defaultTakeProfit: number;
  trailingStop: boolean;
  maxAssetExposure: number;
}

export interface PerformanceStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalPnl: number;
  totalPnlPercent: number;
}

export interface StrategyPreset {
  id: string;
  name: string;
  strategy: string;
  params: Record<string, unknown>;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebSocketMessage {
  type:
    | 'connected'
    | 'metrics'
    | 'position'
    | 'signal'
    | 'news'
    | 'price'
    | 'notification'
    | 'pong'
    | 'subscribed'
    | 'unsubscribed'
    | 'chart_candle'
    | 'filtersUpdated';
  data: unknown;
  timestamp: string;
}
