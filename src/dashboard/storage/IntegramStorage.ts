/**
 * Integram Storage Adapter for Dashboard
 * Адаптер для работы с облачной БД Интеграм
 */

import { randomUUID } from 'crypto';
import { IntegramClient, INTEGRAM_TYPES } from '../../database/integram/index.js';
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
} from '../types.js';

export class IntegramStorage {
  private client: IntegramClient;
  private balance: number = 10000;
  private strategyConfig: Map<string, StrategyConfig> = new Map();
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

  constructor(client: IntegramClient) {
    this.client = client;
  }

  async initialize(): Promise<void> {
    await this.client.authenticate();

    // Инициализация стратегий (в памяти, т.к. это конфигурация)
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

    // Добавляем начальную точку equity если её нет
    const equityHistory = await this.getEquityHistory(1);
    if (equityHistory.length === 0) {
      await this.addEquityPoint();
    }

    console.log('✅ IntegramStorage initialized');
  }

  // === Positions ===

  async getPositions(): Promise<Position[]> {
    if (INTEGRAM_TYPES.POSITIONS === 0) {
      console.warn('INTEGRAM_TYPE_POSITIONS not configured, returning empty array');
      return [];
    }

    try {
      const objects = await this.client.getObjects(INTEGRAM_TYPES.POSITIONS);

      return objects
        .filter((obj) => obj.requisites?.status === 'OPEN')
        .map((obj) => ({
          id: obj.value,
          symbol: String(obj.requisites.symbol || ''),
          side: (obj.requisites.side as 'LONG' | 'SHORT') || 'LONG',
          size: Number(obj.requisites.size || 0),
          entryPrice: Number(obj.requisites.entryPrice || 0),
          currentPrice: Number(obj.requisites.currentPrice || 0),
          stopLoss: obj.requisites.stopLoss ? Number(obj.requisites.stopLoss) : undefined,
          takeProfit: obj.requisites.takeProfit ? Number(obj.requisites.takeProfit) : undefined,
          pnl: Number(obj.requisites.pnl || 0),
          pnlPercent: Number(obj.requisites.pnlPercent || 0),
          openedAt: String(obj.requisites.openTime || new Date().toISOString()),
          updatedAt: String(obj.requisites.updatedAt || new Date().toISOString()),
        }));
    } catch (error) {
      console.error('Failed to get positions from Integram:', error);
      return [];
    }
  }

  async getPosition(id: string): Promise<Position | undefined> {
    const positions = await this.getPositions();
    return positions.find((p) => p.id === id);
  }

  async addPosition(position: Omit<Position, 'id' | 'openedAt' | 'updatedAt'>): Promise<Position> {
    if (INTEGRAM_TYPES.POSITIONS === 0) {
      throw new Error('INTEGRAM_TYPE_POSITIONS not configured');
    }

    const newPosition: Position = {
      ...position,
      id: randomUUID(),
      openedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await this.client.createObject(INTEGRAM_TYPES.POSITIONS, newPosition.id, {
        symbol: newPosition.symbol,
        side: newPosition.side,
        size: newPosition.size,
        entryPrice: newPosition.entryPrice,
        currentPrice: newPosition.currentPrice,
        stopLoss: newPosition.stopLoss || 0,
        takeProfit: newPosition.takeProfit || 0,
        pnl: newPosition.pnl,
        pnlPercent: newPosition.pnlPercent,
        openTime: newPosition.openedAt,
        status: 'OPEN',
        updatedAt: newPosition.updatedAt,
      });

      return newPosition;
    } catch (error) {
      console.error('Failed to add position to Integram:', error);
      throw error;
    }
  }

  async updatePosition(id: string, updates: Partial<Position>): Promise<Position | null> {
    if (INTEGRAM_TYPES.POSITIONS === 0) {
      throw new Error('INTEGRAM_TYPE_POSITIONS not configured');
    }

    try {
      const obj = await this.client.findObjectByValue(INTEGRAM_TYPES.POSITIONS, id);
      if (!obj) return null;

      const updatedData = {
        currentPrice: updates.currentPrice,
        pnl: updates.pnl,
        pnlPercent: updates.pnlPercent,
        stopLoss: updates.stopLoss,
        takeProfit: updates.takeProfit,
        updatedAt: new Date().toISOString(),
      };

      await this.client.updateRequisites(obj.id, updatedData);

      const position = await this.getPosition(id);
      return position || null;
    } catch (error) {
      console.error('Failed to update position in Integram:', error);
      return null;
    }
  }

  async closePosition(id: string, exitPrice: number, reason: string): Promise<TradeHistory | null> {
    const position = await this.getPosition(id);
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

    try {
      // Закрыть позицию
      const obj = await this.client.findObjectByValue(INTEGRAM_TYPES.POSITIONS, id);
      if (obj) {
        await this.client.updateRequisites(obj.id, {
          status: 'CLOSED',
          closeTime: trade.closedAt,
        });
      }

      // Добавить в историю торгов
      if (INTEGRAM_TYPES.TRADE_HISTORY !== 0) {
        await this.client.createObject(INTEGRAM_TYPES.TRADE_HISTORY, trade.id, {
          symbol: trade.symbol,
          side: trade.side,
          entryPrice: trade.entryPrice,
          exitPrice: trade.exitPrice,
          quantity: trade.size,
          pnl: trade.pnl,
          openTime: trade.openedAt,
          closeTime: trade.closedAt,
          reason: trade.reason,
        });
      }

      this.balance += pnl;

      // Добавляем точку equity
      await this.addEquityPoint();

      return trade;
    } catch (error) {
      console.error('Failed to close position in Integram:', error);
      return null;
    }
  }

  // === Signals ===

  async getSignals(limit: number = 50): Promise<Signal[]> {
    if (INTEGRAM_TYPES.SIGNALS === 0) {
      console.warn('INTEGRAM_TYPE_SIGNALS not configured, returning empty array');
      return [];
    }

    try {
      const objects = await this.client.getObjects(INTEGRAM_TYPES.SIGNALS, limit * 2);

      return objects
        .map((obj) => ({
          id: obj.value,
          type: String(obj.requisites.type || ''),
          source: String(obj.requisites.source || ''),
          symbol: String(obj.requisites.symbol || ''),
          action: (obj.requisites.action as 'BUY' | 'SELL' | 'HOLD') || 'HOLD',
          strength: Number(obj.requisites.strength || 0),
          confidence: Number(obj.requisites.confidence || 0),
          price: obj.requisites.price ? Number(obj.requisites.price) : undefined,
          reason: String(obj.requisites.reason || ''),
          timestamp: String(obj.requisites.timestamp || new Date().toISOString()),
        }))
        .slice(-limit)
        .reverse();
    } catch (error) {
      console.error('Failed to get signals from Integram:', error);
      return [];
    }
  }

  async addSignal(signal: Omit<Signal, 'id' | 'timestamp'>): Promise<Signal> {
    if (INTEGRAM_TYPES.SIGNALS === 0) {
      throw new Error('INTEGRAM_TYPE_SIGNALS not configured');
    }

    const newSignal: Signal = {
      ...signal,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };

    try {
      await this.client.createObject(INTEGRAM_TYPES.SIGNALS, newSignal.id, {
        type: newSignal.type,
        source: newSignal.source,
        symbol: newSignal.symbol,
        action: newSignal.action,
        strength: newSignal.strength,
        confidence: newSignal.confidence,
        price: newSignal.price || 0,
        reason: newSignal.reason,
        timestamp: newSignal.timestamp,
      });

      return newSignal;
    } catch (error) {
      console.error('Failed to add signal to Integram:', error);
      throw error;
    }
  }

  // === News ===

  async getNews(limit: number = 50): Promise<NewsItem[]> {
    if (INTEGRAM_TYPES.NEWS === 0) {
      console.warn('INTEGRAM_TYPE_NEWS not configured, returning empty array');
      return [];
    }

    try {
      const objects = await this.client.getObjects(INTEGRAM_TYPES.NEWS, limit * 2);

      return objects
        .map((obj) => ({
          id: obj.value,
          title: String(obj.requisites.title || ''),
          content: String(obj.requisites.content || ''),
          source: String(obj.requisites.source || ''),
          url: String(obj.requisites.url || ''),
          sentiment: (obj.requisites.sentiment as 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL') || 'NEUTRAL',
          sentimentScore: Number(obj.requisites.sentimentScore || 0),
          publishedAt: String(obj.requisites.publishedAt || new Date().toISOString()),
          fetchedAt: String(obj.requisites.fetchedAt || new Date().toISOString()),
        }))
        .slice(-limit)
        .reverse();
    } catch (error) {
      console.error('Failed to get news from Integram:', error);
      return [];
    }
  }

  async addNews(newsItem: Omit<NewsItem, 'id' | 'fetchedAt'>): Promise<NewsItem> {
    if (INTEGRAM_TYPES.NEWS === 0) {
      throw new Error('INTEGRAM_TYPE_NEWS not configured');
    }

    const newNews: NewsItem = {
      ...newsItem,
      id: randomUUID(),
      fetchedAt: new Date().toISOString(),
    };

    try {
      await this.client.createObject(INTEGRAM_TYPES.NEWS, newNews.id, {
        title: newNews.title,
        content: newNews.content,
        source: newNews.source,
        url: newNews.url,
        sentiment: newNews.sentiment,
        sentimentScore: newNews.sentimentScore,
        publishedAt: newNews.publishedAt,
        fetchedAt: newNews.fetchedAt,
      });

      return newNews;
    } catch (error) {
      console.error('Failed to add news to Integram:', error);
      throw error;
    }
  }

  // === Equity History ===

  async getEquityHistory(limit: number = 100): Promise<EquityPoint[]> {
    if (INTEGRAM_TYPES.EQUITY_HISTORY === 0) {
      console.warn('INTEGRAM_TYPE_EQUITY_HISTORY not configured, returning empty array');
      return [];
    }

    try {
      const objects = await this.client.getObjects(INTEGRAM_TYPES.EQUITY_HISTORY, limit * 2);

      return objects
        .map((obj) => ({
          timestamp: String(obj.requisites.timestamp || obj.value),
          equity: Number(obj.requisites.equity || 0),
          balance: Number(obj.requisites.balance || 0),
        }))
        .slice(-limit);
    } catch (error) {
      console.error('Failed to get equity history from Integram:', error);
      return [];
    }
  }

  async addEquityPoint(): Promise<void> {
    if (INTEGRAM_TYPES.EQUITY_HISTORY === 0) {
      return;
    }

    const equity = await this.calculateEquity();
    const timestamp = new Date().toISOString();

    try {
      await this.client.createObject(INTEGRAM_TYPES.EQUITY_HISTORY, timestamp, {
        equity,
        balance: this.balance,
        timestamp,
      });
    } catch (error) {
      console.error('Failed to add equity point to Integram:', error);
    }
  }

  // === Trade History ===

  async getTradeHistory(limit: number = 50): Promise<TradeHistory[]> {
    if (INTEGRAM_TYPES.TRADE_HISTORY === 0) {
      console.warn('INTEGRAM_TYPE_TRADE_HISTORY not configured, returning empty array');
      return [];
    }

    try {
      const objects = await this.client.getObjects(INTEGRAM_TYPES.TRADE_HISTORY, limit * 2);

      return objects
        .map((obj) => ({
          id: obj.value,
          symbol: String(obj.requisites.symbol || ''),
          side: (obj.requisites.side as 'LONG' | 'SHORT') || 'LONG',
          size: Number(obj.requisites.quantity || 0),
          entryPrice: Number(obj.requisites.entryPrice || 0),
          exitPrice: Number(obj.requisites.exitPrice || 0),
          pnl: Number(obj.requisites.pnl || 0),
          pnlPercent:
            ((Number(obj.requisites.pnl || 0) / (Number(obj.requisites.entryPrice || 1) * Number(obj.requisites.quantity || 1))) *
              100) ||
            0,
          openedAt: String(obj.requisites.openTime || new Date().toISOString()),
          closedAt: String(obj.requisites.closeTime || new Date().toISOString()),
          reason: String(obj.requisites.reason || ''),
        }))
        .slice(-limit)
        .reverse();
    } catch (error) {
      console.error('Failed to get trade history from Integram:', error);
      return [];
    }
  }

  // === Metrics ===

  async getMetrics(): Promise<DashboardMetrics> {
    const openPositions = await this.getPositions();
    const equity = await this.calculateEquity();
    const totalPnl = equity - 10000;
    const totalPnlPercent = (totalPnl / 10000) * 100;

    const tradeHistory = await this.getTradeHistory(1000);

    // Считаем дневной PnL (последние 24 часа)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentTrades = tradeHistory.filter((t) => new Date(t.closedAt).getTime() > oneDayAgo);
    const dailyPnl = recentTrades.reduce((sum, t) => sum + t.pnl, 0);
    const dailyPnlPercent = this.balance > 0 ? (dailyPnl / this.balance) * 100 : 0;

    const winningTrades = tradeHistory.filter((t) => t.pnl > 0).length;
    const winRate = tradeHistory.length > 0 ? (winningTrades / tradeHistory.length) * 100 : 0;

    return {
      balance: this.balance,
      equity,
      pnl: totalPnl,
      pnlPercent: totalPnlPercent,
      totalTrades: tradeHistory.length,
      winRate,
      openPositions: openPositions.length,
      dailyPnl,
      dailyPnlPercent,
    };
  }

  async getPerformanceStats(): Promise<PerformanceStats> {
    const tradeHistory = await this.getTradeHistory(1000);

    const winningTrades = tradeHistory.filter((t) => t.pnl > 0);
    const losingTrades = tradeHistory.filter((t) => t.pnl < 0);

    const totalWin = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const totalPnl = tradeHistory.reduce((sum, t) => sum + t.pnl, 0);

    const averageWin = winningTrades.length > 0 ? totalWin / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0;

    const profitFactor = totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? Infinity : 0;

    // Упрощенный расчет Sharpe ratio
    const returns = tradeHistory.map((t) => t.pnlPercent);
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length || 1),
    );
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    // Максимальная просадка
    const equityHistory = await this.getEquityHistory(10000);
    let maxDrawdown = 0;
    let peak = 10000;
    for (const point of equityHistory) {
      if (point.equity > peak) peak = point.equity;
      const drawdown = peak > 0 ? ((peak - point.equity) / peak) * 100 : 0;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    return {
      totalTrades: tradeHistory.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: tradeHistory.length > 0 ? (winningTrades.length / tradeHistory.length) * 100 : 0,
      averageWin,
      averageLoss,
      profitFactor,
      sharpeRatio,
      maxDrawdown,
      totalPnl,
      totalPnlPercent: (totalPnl / 10000) * 100,
    };
  }

  // === Strategy Configuration ===

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

  // === Risk Configuration ===

  getRiskConfig(): RiskConfig {
    return { ...this.riskConfig };
  }

  updateRiskConfig(updates: Partial<RiskConfig>): RiskConfig {
    this.riskConfig = { ...this.riskConfig, ...updates };
    return this.getRiskConfig();
  }

  // === Helper methods ===

  private async calculateEquity(): Promise<number> {
    let equity = this.balance;
    const positions = await this.getPositions();

    for (const position of positions) {
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
  async isInitialized(): Promise<boolean> {
    return await this.client.ping();
  }
}
