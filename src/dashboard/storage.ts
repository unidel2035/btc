/**
 * Dashboard Data Storage
 * In-memory storage для демо версии
 */

import { randomUUID } from 'crypto';
import type {
  Position,
  Signal,
  NewsItem,
  EquityPoint,
  TradeHistory,
  StrategyConfig,
  RiskConfig,
  PerformanceStats,
  DashboardMetrics,
  StrategyPreset,
} from './types.js';

class DashboardStorage {
  private positions: Map<string, Position> = new Map();
  private signals: Signal[] = [];
  private news: NewsItem[] = [];
  private equityHistory: EquityPoint[] = [];
  private tradeHistory: TradeHistory[] = [];
  private balance: number = 10000;
  private strategyConfig: Map<string, StrategyConfig> = new Map();
  private strategyPresets: Map<string, StrategyPreset> = new Map();
  private riskConfig: RiskConfig = {
    maxPositionSize: 10,
    maxPositions: 5,
    maxDailyLoss: 5,
    maxTotalDrawdown: 20,
    defaultStopLoss: 2,
    defaultTakeProfit: 5,
    trailingStop: true,
    maxAssetExposure: 15,
  };

  // Screening-related properties
  public screeningTasks: Map<string, unknown> | undefined;
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  public latestScreeningReport: unknown | undefined;
  public screeningHistory: unknown[] | undefined;
  public screeningConfigOverrides: Record<string, unknown> | undefined;

  constructor() {
    // Инициализация с демо данными
    this.initializeDemoData();
  }

  private initializeDemoData(): void {
    // Добавляем начальную точку equity
    this.equityHistory.push({
      timestamp: new Date().toISOString(),
      equity: this.balance,
      balance: this.balance,
    });

    // Инициализация стратегий
    this.strategyConfig.set('news-momentum', {
      name: 'News Momentum',
      enabled: true,
      riskPerTrade: 2,
      maxPositions: 3,
      parameters: {
        minSentimentScore: 0.7,
        volumeThreshold: 1.5,
      },
    });

    this.strategyConfig.set('sentiment-swing', {
      name: 'Sentiment Swing',
      enabled: true,
      riskPerTrade: 2,
      maxPositions: 2,
      parameters: {
        sentimentThreshold: 0.6,
        holdingPeriod: 24,
      },
    });
  }

  // Positions
  getPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  getPosition(id: string): Position | undefined {
    return this.positions.get(id);
  }

  addPosition(position: Omit<Position, 'id' | 'openedAt' | 'updatedAt'>): Position {
    const newPosition: Position = {
      ...position,
      id: randomUUID(),
      openedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.positions.set(newPosition.id, newPosition);
    return newPosition;
  }

  updatePosition(id: string, updates: Partial<Position>): Position | null {
    const position = this.positions.get(id);
    if (!position) return null;

    const updatedPosition = {
      ...position,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.positions.set(id, updatedPosition);
    return updatedPosition;
  }

  clearPositions(): void {
    this.positions.clear();
  }

  closePosition(id: string, exitPrice: number, reason: string): TradeHistory | null {
    const position = this.positions.get(id);
    if (!position) return null;

    const pnl =
      position.side === 'LONG'
        ? (exitPrice - position.entryPrice) * position.size
        : (position.entryPrice - exitPrice) * position.size;

    const pnlPercent = (pnl / (position.entryPrice * position.size)) * 100;

    const trade: TradeHistory = {
      id: position.id,
      symbol: position.symbol,
      side: position.side,
      size: position.size,
      entryPrice: position.entryPrice,
      exitPrice,
      pnl,
      pnlPercent,
      openedAt: position.openedAt,
      closedAt: new Date().toISOString(),
      reason,
    };

    this.tradeHistory.push(trade);
    this.positions.delete(id);
    this.balance += pnl;

    // Добавляем точку equity
    this.addEquityPoint();

    return trade;
  }

  // Signals
  getSignals(limit: number = 50): Signal[] {
    return this.signals.slice(-limit).reverse();
  }

  addSignal(signal: Omit<Signal, 'id' | 'timestamp'>): Signal {
    const newSignal: Signal = {
      ...signal,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };
    this.signals.push(newSignal);

    // Ограничиваем размер массива
    if (this.signals.length > 1000) {
      this.signals = this.signals.slice(-1000);
    }

    return newSignal;
  }

  // News
  getNews(limit: number = 50): NewsItem[] {
    return this.news.slice(-limit).reverse();
  }

  addNews(newsItem: Omit<NewsItem, 'id' | 'fetchedAt'>): NewsItem {
    const newNews: NewsItem = {
      ...newsItem,
      id: randomUUID(),
      fetchedAt: new Date().toISOString(),
    };
    this.news.push(newNews);

    // Ограничиваем размер массива
    if (this.news.length > 1000) {
      this.news = this.news.slice(-1000);
    }

    return newNews;
  }

  // Equity History
  getEquityHistory(limit: number = 100): EquityPoint[] {
    return this.equityHistory.slice(-limit);
  }

  addEquityPoint(): void {
    const equity = this.calculateEquity();
    this.equityHistory.push({
      timestamp: new Date().toISOString(),
      equity,
      balance: this.balance,
    });

    // Ограничиваем размер массива
    if (this.equityHistory.length > 10000) {
      this.equityHistory = this.equityHistory.slice(-10000);
    }
  }

  // Trade History
  getTradeHistory(limit: number = 50): TradeHistory[] {
    return this.tradeHistory.slice(-limit).reverse();
  }

  // Metrics
  getMetrics(): DashboardMetrics {
    const openPositions = Array.from(this.positions.values());
    const equity = this.calculateEquity();
    const totalPnl = equity - 10000;
    const totalPnlPercent = (totalPnl / 10000) * 100;

    // Считаем дневной PnL (последние 24 часа)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentTrades = this.tradeHistory.filter(
      (t) => new Date(t.closedAt).getTime() > oneDayAgo,
    );
    const dailyPnl = recentTrades.reduce((sum, t) => sum + t.pnl, 0);
    const dailyPnlPercent = (dailyPnl / this.balance) * 100;

    const winningTrades = this.tradeHistory.filter((t) => t.pnl > 0).length;
    const winRate =
      this.tradeHistory.length > 0 ? (winningTrades / this.tradeHistory.length) * 100 : 0;

    return {
      balance: this.balance,
      equity,
      pnl: totalPnl,
      pnlPercent: totalPnlPercent,
      totalTrades: this.tradeHistory.length,
      winRate,
      openPositions: openPositions.length,
      dailyPnl,
      dailyPnlPercent,
    };
  }

  getPerformanceStats(): PerformanceStats {
    const winningTrades = this.tradeHistory.filter((t) => t.pnl > 0);
    const losingTrades = this.tradeHistory.filter((t) => t.pnl < 0);

    const totalWin = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const totalPnl = this.tradeHistory.reduce((sum, t) => sum + t.pnl, 0);

    const averageWin = winningTrades.length > 0 ? totalWin / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0;

    const profitFactor = totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? Infinity : 0;

    // Упрощенный расчет Sharpe ratio
    const returns = this.tradeHistory.map((t) => t.pnlPercent);
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length,
    );
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    // Максимальная просадка
    let maxDrawdown = 0;
    let peak = 10000;
    for (const point of this.equityHistory) {
      if (point.equity > peak) peak = point.equity;
      const drawdown = ((peak - point.equity) / peak) * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    return {
      totalTrades: this.tradeHistory.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate:
        this.tradeHistory.length > 0 ? (winningTrades.length / this.tradeHistory.length) * 100 : 0,
      averageWin,
      averageLoss,
      profitFactor,
      sharpeRatio,
      maxDrawdown,
      totalPnl,
      totalPnlPercent: (totalPnl / 10000) * 100,
    };
  }

  // Strategy Configuration
  getStrategyConfig(name: string): StrategyConfig | undefined {
    return this.strategyConfig.get(name);
  }

  getAllStrategyConfigs(): StrategyConfig[] {
    return Array.from(this.strategyConfig.values());
  }

  updateStrategyConfig(name: string, updates: Partial<StrategyConfig>): StrategyConfig | null {
    const config = this.strategyConfig.get(name);
    if (!config) return null;

    const updated = { ...config, ...updates };
    this.strategyConfig.set(name, updated);
    return updated;
  }

  // Risk Configuration
  getRiskConfig(): RiskConfig {
    return { ...this.riskConfig };
  }

  updateRiskConfig(updates: Partial<RiskConfig>): RiskConfig {
    this.riskConfig = { ...this.riskConfig, ...updates };
    return this.getRiskConfig();
  }

  // Helper methods
  private calculateEquity(): number {
    let equity = this.balance;
    for (const position of this.positions.values()) {
      const pnl =
        position.side === 'LONG'
          ? (position.currentPrice - position.entryPrice) * position.size
          : (position.entryPrice - position.currentPrice) * position.size;
      equity += pnl;
    }
    return equity;
  }

  getBalance(): number {
    return this.balance;
  }

  setBalance(balance: number): void {
    this.balance = balance;
  }

  // Health check method
  isInitialized(): boolean {
    return this.equityHistory.length > 0;
  }

  // Strategy Presets Management

  getStrategyPresets(strategyName?: string): StrategyPreset[] {
    const allPresets = Array.from(this.strategyPresets.values());
    if (strategyName) {
      return allPresets.filter((p) => p.strategy === strategyName);
    }
    return allPresets;
  }

  getStrategyPreset(id: string): StrategyPreset | undefined {
    return this.strategyPresets.get(id);
  }

  createStrategyPreset(data: {
    name: string;
    strategy: string;
    params: Record<string, unknown>;
    description?: string;
  }): StrategyPreset {
    const preset: StrategyPreset = {
      id: randomUUID(),
      name: data.name,
      strategy: data.strategy,
      params: data.params,
      description: data.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.strategyPresets.set(preset.id, preset);
    return preset;
  }

  updateStrategyPreset(
    id: string,
    updates: Partial<Omit<StrategyPreset, 'id' | 'createdAt'>>,
  ): StrategyPreset | null {
    const preset = this.strategyPresets.get(id);
    if (!preset) return null;

    const updated: StrategyPreset = {
      ...preset,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.strategyPresets.set(id, updated);
    return updated;
  }

  deleteStrategyPreset(id: string): boolean {
    return this.strategyPresets.delete(id);
  }
}

// Singleton instance
export const storage = new DashboardStorage();
