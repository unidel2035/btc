import { randomUUID } from 'crypto';
import type {
  DashboardOverview,
  NewsItem,
  PositionWithPnL,
  PerformanceMetrics,
  StrategyPerformance,
  TradeJournalEntry,
  DashboardSettings,
  Signal,
  SignalType,
  SignalSentiment,
} from '../types/index.js';
import { PositionSide, PositionStatus } from '../../trading/risk/types.js';

/**
 * Dashboard Service
 *
 * Manages all dashboard data and business logic.
 * In a production environment, this would integrate with actual trading systems,
 * databases, and real-time data sources.
 *
 * Currently uses mock data for demonstration purposes.
 */
export class DashboardService {
  private mockBalance = 10000;
  private mockPositions: PositionWithPnL[] = [];
  private mockSignals: Signal[] = [];
  private mockNews: NewsItem[] = [];
  private mockSettings: DashboardSettings;

  constructor() {
    this.mockSettings = this.getDefaultSettings();
    this.initializeMockData();
  }

  /**
   * Get dashboard overview data
   */
  public getDashboardOverview(): DashboardOverview {
    const positions = this.getPositions();
    const inPositionsAmount = positions.reduce((sum, p) => sum + p.size, 0);

    return {
      balance: {
        total: this.mockBalance,
        available: this.mockBalance - inPositionsAmount,
        inPositions: inPositionsAmount,
      },
      pnl: {
        today: 245.67,
        week: 892.34,
        month: 1456.78,
        total: 2341.56,
      },
      positions: {
        count: positions.length,
        long: positions.filter((p) => p.side === PositionSide.LONG).length,
        short: positions.filter((p) => p.side === PositionSide.SHORT).length,
      },
      signals: {
        recent: this.getRecentSignals(5),
        count24h: this.mockSignals.length,
      },
      metrics: {
        winRate: 0.65,
        avgProfit: 2.3,
        maxDrawdown: 8.5,
        sharpeRatio: 1.8,
      },
    };
  }

  /**
   * Get signals with optional filtering
   */
  public getSignals(limit = 50, type?: string): Signal[] {
    let signals = [...this.mockSignals];

    if (type) {
      signals = signals.filter((s) => s.type === type);
    }

    return signals.slice(0, limit);
  }

  /**
   * Get recent signals
   */
  public getRecentSignals(limit = 5): Signal[] {
    return this.mockSignals.slice(0, limit);
  }

  /**
   * Get current positions
   */
  public getPositions(): PositionWithPnL[] {
    // Update current prices and PnL
    return this.mockPositions.map((pos) => {
      const currentPrice = this.getCurrentPrice(pos.symbol);
      const pnl = this.calculatePnL(pos, currentPrice);
      const pnlPercent = (pnl / pos.size) * 100;
      const duration = Math.floor((Date.now() - pos.openedAt.getTime()) / 1000);

      return {
        ...pos,
        currentPrice,
        pnl,
        pnlPercent,
        duration,
      };
    });
  }

  /**
   * Get position history
   */
  public getPositionHistory(limit = 100): PositionWithPnL[] {
    // In production, this would fetch from database
    // For now, return closed mock positions
    const closedPositions: PositionWithPnL[] = [];

    for (let i = 0; i < Math.min(limit, 20); i++) {
      const symbol = this.getRandomSymbol();
      const side = Math.random() > 0.5 ? PositionSide.LONG : PositionSide.SHORT;
      const entryPrice = this.getRandomPrice(symbol);
      const exitPrice = entryPrice * (1 + (Math.random() - 0.4) * 0.1);
      const size = 100 + Math.random() * 900;
      const pnl =
        side === PositionSide.LONG
          ? (exitPrice - entryPrice) * (size / entryPrice)
          : (entryPrice - exitPrice) * (size / entryPrice);

      const openedAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      const closedAt = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);

      closedPositions.push({
        id: randomUUID(),
        symbol,
        side,
        size,
        entryPrice,
        openedAt,
        exitTime: closedAt,
        closedAt,
        status: PositionStatus.CLOSED,
        currentPrice: exitPrice,
        pnl,
        pnlPercent: (pnl / size) * 100,
        duration: Math.floor(Math.random() * 86400),
        stopLoss: entryPrice * 0.98,
        takeProfit: [entryPrice * 1.05],
        quantity: size / entryPrice,
        remainingQuantity: 0,
        trailingStopActive: false,
        unrealizedPnL: 0,
        realizedPnL: pnl,
        lastUpdatedAt: closedAt,
      });
    }

    return closedPositions.sort((a, b) => b.exitTime!.getTime() - a.exitTime!.getTime());
  }

  /**
   * Close a position
   */
  public closePosition(id: string): { success: boolean; message: string; data?: unknown } {
    const index = this.mockPositions.findIndex((p) => p.id === id);

    if (index === -1) {
      return { success: false, message: 'Position not found' };
    }

    const position = this.mockPositions[index]!;
    position.status = PositionStatus.CLOSED;
    position.closedAt = new Date();
    (position as PositionWithPnL).exitTime = new Date();

    this.mockPositions.splice(index, 1);

    return {
      success: true,
      message: 'Position closed successfully',
      data: position,
    };
  }

  /**
   * Update position SL/TP
   */
  public updatePosition(
    id: string,
    updates: { stopLoss?: number; takeProfit?: number },
  ): { success: boolean; message: string; data?: unknown } {
    const position = this.mockPositions.find((p) => p.id === id);

    if (!position) {
      return { success: false, message: 'Position not found' };
    }

    if (updates.stopLoss !== undefined) {
      position.stopLoss = updates.stopLoss;
    }

    if (updates.takeProfit !== undefined) {
      position.takeProfit = [updates.takeProfit];
    }

    position.lastUpdatedAt = new Date();

    return {
      success: true,
      message: 'Position updated successfully',
      data: position,
    };
  }

  /**
   * Get news with optional sentiment filtering
   */
  public getNews(limit = 50, sentiment?: string): NewsItem[] {
    let news = [...this.mockNews];

    if (sentiment) {
      news = news.filter((n) => n.sentiment === sentiment);
    }

    return news.slice(0, limit);
  }

  /**
   * Get recent news
   */
  public getRecentNews(limit = 10): NewsItem[] {
    return this.mockNews.slice(0, limit);
  }

  /**
   * Get settings
   */
  public getSettings(): DashboardSettings {
    return this.mockSettings;
  }

  /**
   * Update settings
   */
  public updateSettings(updates: Partial<DashboardSettings>): {
    success: boolean;
    message: string;
    data?: unknown;
  } {
    try {
      this.mockSettings = {
        ...this.mockSettings,
        ...updates,
        strategies: { ...this.mockSettings.strategies, ...updates.strategies },
        risk: { ...this.mockSettings.risk, ...updates.risk },
        notifications: { ...this.mockSettings.notifications, ...updates.notifications },
        api: { ...this.mockSettings.api, ...updates.api },
      };

      return {
        success: true,
        message: 'Settings updated successfully',
        data: this.mockSettings,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update settings: ${error}`,
      };
    }
  }

  /**
   * Get performance metrics for a period
   */
  public getPerformanceMetrics(period: string): PerformanceMetrics {
    const days = this.parsePeriod(period);
    const equity = this.generateEquityCurve(days);

    return {
      period,
      equity,
      trades: {
        total: 45,
        wins: 29,
        losses: 16,
        winRate: 0.644,
      },
      profit: {
        gross: 2841.56,
        net: 2341.56,
        avgWin: 145.32,
        avgLoss: -62.18,
        profitFactor: 2.34,
      },
      risk: {
        maxDrawdown: 850,
        maxDrawdownPercent: 8.5,
        sharpeRatio: 1.8,
        sortinoRatio: 2.3,
      },
    };
  }

  /**
   * Get strategy statistics
   */
  public getStrategyStats(): StrategyPerformance[] {
    return [
      {
        name: 'News Momentum',
        enabled: true,
        signals: 156,
        trades: 28,
        winRate: 0.68,
        profit: 1245.32,
        avgProfit: 44.48,
        maxDrawdown: 5.2,
      },
      {
        name: 'Sentiment Swing',
        enabled: true,
        signals: 89,
        trades: 17,
        winRate: 0.59,
        profit: 876.24,
        avgProfit: 51.54,
        maxDrawdown: 7.1,
      },
      {
        name: 'Event-Driven',
        enabled: false,
        signals: 12,
        trades: 0,
        winRate: 0,
        profit: 0,
        avgProfit: 0,
        maxDrawdown: 0,
      },
    ];
  }

  /**
   * Get trade journal
   */
  public getTradeJournal(limit = 100): TradeJournalEntry[] {
    const trades: TradeJournalEntry[] = [];

    for (let i = 0; i < Math.min(limit, 50); i++) {
      const symbol = this.getRandomSymbol();
      const side = Math.random() > 0.5 ? PositionSide.LONG : PositionSide.SHORT;
      const entryPrice = this.getRandomPrice(symbol);
      const exitPrice = entryPrice * (1 + (Math.random() - 0.4) * 0.1);
      const quantity = (100 + Math.random() * 900) / entryPrice;
      const pnl = (exitPrice - entryPrice) * quantity * (side === PositionSide.LONG ? 1 : -1);
      const entryTime = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const exitTime = new Date(entryTime.getTime() + Math.random() * 24 * 60 * 60 * 1000);

      const strategyNames = ['News Momentum', 'Sentiment Swing'];
      trades.push({
        id: randomUUID(),
        symbol,
        side,
        entryTime,
        exitTime,
        entryPrice,
        exitPrice,
        quantity,
        pnl,
        pnlPercent: (pnl / (entryPrice * quantity)) * 100,
        strategy: strategyNames[Math.floor(Math.random() * 2)]!,
        signals: ['news', 'sentiment', 'technical'],
        duration: Math.floor((exitTime.getTime() - entryTime.getTime()) / 1000),
        fees: Math.abs(pnl) * 0.001,
      });
    }

    return trades.sort((a, b) => b.exitTime.getTime() - a.exitTime.getTime());
  }

  /**
   * Get current prices for all symbols
   */
  public getCurrentPrices(): Record<string, number> {
    return {
      'BTC/USDT': this.getCurrentPrice('BTC/USDT'),
      'ETH/USDT': this.getCurrentPrice('ETH/USDT'),
      'BNB/USDT': this.getCurrentPrice('BNB/USDT'),
    };
  }

  /**
   * Initialize mock data
   */
  private initializeMockData(): void {
    // Generate mock positions
    this.generateMockPositions(3);

    // Generate mock signals
    this.generateMockSignals(20);

    // Generate mock news
    this.generateMockNews(30);
  }

  /**
   * Generate mock positions
   */
  private generateMockPositions(count: number): void {
    const symbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'];

    for (let i = 0; i < count; i++) {
      const symbol = symbols[i % symbols.length]!;
      const side = Math.random() > 0.5 ? PositionSide.LONG : PositionSide.SHORT;
      const entryPrice = this.getRandomPrice(symbol);
      const size = 100 + Math.random() * 400;
      const quantity = size / entryPrice;
      const openedAt = new Date(Date.now() - Math.random() * 3600000);

      this.mockPositions.push({
        id: randomUUID(),
        symbol,
        side,
        size,
        entryPrice,
        openedAt,
        status: PositionStatus.OPEN,
        currentPrice: entryPrice,
        pnl: 0,
        pnlPercent: 0,
        duration: 0,
        stopLoss: entryPrice * (side === PositionSide.LONG ? 0.98 : 1.02),
        takeProfit: [entryPrice * (side === PositionSide.LONG ? 1.05 : 0.95)],
        quantity,
        remainingQuantity: quantity,
        trailingStopActive: false,
        unrealizedPnL: 0,
        realizedPnL: 0,
        lastUpdatedAt: openedAt,
      });
    }
  }

  /**
   * Generate mock signals
   */
  private generateMockSignals(count: number): void {
    const types = ['news', 'sentiment', 'technical', 'social', 'event'] as const;
    const sentiments = ['bullish', 'bearish', 'neutral'] as const;
    const sources = ['CoinDesk', 'CoinTelegraph', 'Bloomberg', 'Twitter'];

    for (let i = 0; i < count; i++) {
      this.mockSignals.push({
        id: randomUUID(),
        type: types[Math.floor(Math.random() * types.length)] as SignalType,
        sentiment: sentiments[Math.floor(Math.random() * sentiments.length)] as SignalSentiment,
        impact: Math.random(),
        source: sources[Math.floor(Math.random() * 4)]!,
        timestamp: new Date(Date.now() - Math.random() * 86400000),
        data: {},
      });
    }

    this.mockSignals.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Generate mock news
   */
  private generateMockNews(count: number): void {
    const titles = [
      'Bitcoin reaches new all-time high',
      'Ethereum upgrade successfully completed',
      'Major exchange announces new listings',
      'Regulatory clarity improves market sentiment',
      'DeFi protocol suffers security breach',
      'Institutional adoption continues to grow',
      'Market volatility increases amid uncertainty',
      'New blockchain technology promises scalability',
      'Central bank announces CBDC pilot program',
      'Cryptocurrency mining difficulty adjusts higher',
    ];

    const sentiments = ['bullish', 'bearish', 'neutral'] as const;
    const sources = ['CoinDesk', 'CoinTelegraph', 'Bloomberg', 'Reuters'];

    for (let i = 0; i < count; i++) {
      const sentiment = sentiments[
        Math.floor(Math.random() * sentiments.length)
      ] as SignalSentiment;
      this.mockNews.push({
        id: randomUUID(),
        title: titles[Math.floor(Math.random() * titles.length)]!,
        summary:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.',
        source: sources[Math.floor(Math.random() * 4)]!,
        url: 'https://example.com/news',
        sentiment,
        sentimentScore:
          sentiment === 'bullish'
            ? 0.3 + Math.random() * 0.7
            : sentiment === 'bearish'
              ? -0.3 - Math.random() * 0.7
              : -0.2 + Math.random() * 0.4,
        impact: Math.random(),
        timestamp: new Date(Date.now() - Math.random() * 86400000),
        symbols: ['BTC', 'ETH'],
      });
    }

    this.mockNews.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get current price for a symbol
   */
  private getCurrentPrice(symbol: string): number {
    const basePrices: Record<string, number> = {
      'BTC/USDT': 50000,
      'ETH/USDT': 3000,
      'BNB/USDT': 400,
    };

    const base = basePrices[symbol] || 1000;
    return base * (1 + (Math.random() - 0.5) * 0.02); // +/- 1% variation
  }

  /**
   * Get random price for a symbol
   */
  private getRandomPrice(symbol: string): number {
    return this.getCurrentPrice(symbol);
  }

  /**
   * Get random symbol
   */
  private getRandomSymbol(): string {
    const symbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'];
    return symbols[Math.floor(Math.random() * symbols.length)]!;
  }

  /**
   * Calculate PnL for a position
   */
  private calculatePnL(position: PositionWithPnL, currentPrice: number): number {
    const priceDiff = currentPrice - position.entryPrice;
    const multiplier = position.side === PositionSide.LONG ? 1 : -1;
    return (priceDiff * position.size * multiplier) / position.entryPrice;
  }

  /**
   * Parse period string to days
   */
  private parsePeriod(period: string): number {
    const match = period.match(/^(\d+)([dwmy])$/);
    if (!match) return 7;

    const [, num, unit] = match;
    const value = parseInt(num!);

    switch (unit) {
      case 'd':
        return value;
      case 'w':
        return value * 7;
      case 'm':
        return value * 30;
      case 'y':
        return value * 365;
      default:
        return 7;
    }
  }

  /**
   * Generate equity curve
   */
  private generateEquityCurve(days: number): Array<{ timestamp: Date; value: number }> {
    const curve: Array<{ timestamp: Date; value: number }> = [];
    let value = 10000;

    for (let i = days; i >= 0; i--) {
      const timestamp = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      value += (Math.random() - 0.4) * 100; // Slight upward trend
      curve.push({ timestamp, value: Math.max(value, 5000) });
    }

    return curve;
  }

  /**
   * Get default settings
   */
  private getDefaultSettings(): DashboardSettings {
    return {
      strategies: {
        'news-momentum': {
          enabled: true,
          params: {
            minImpact: 0.7,
            minConfidence: 0.6,
            maxPositionSize: 10,
          },
        },
        'sentiment-swing': {
          enabled: true,
          params: {
            minImpact: 0.6,
            timeframe: '4h',
          },
        },
        'event-driven': {
          enabled: false,
          params: {},
        },
      },
      risk: {
        maxPositionSize: 10,
        maxPositions: 5,
        maxDailyLoss: 5,
        maxTotalDrawdown: 20,
        defaultStopLoss: 2,
        defaultTakeProfit: 5,
      },
      notifications: {
        telegram: {
          enabled: false,
        },
        email: {
          enabled: false,
        },
        webhook: {
          enabled: false,
        },
      },
      api: {
        exchange: 'binance',
        testMode: true,
      },
    };
  }
}
