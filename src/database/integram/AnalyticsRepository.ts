/**
 * Integram Analytics Repository
 * Handles storage and retrieval of portfolio analytics data in Integram database
 */

import type { IntegramClient } from './IntegramClient.js';
import type {
  ANALYTICS_TYPES,
  IntegramTradeAnalytics,
  IntegramDailyPortfolioSnapshot,
  IntegramStrategyPerformance,
  IntegramAssetPerformance,
  IntegramAnalyticsReport,
  IntegramEquityCurvePoint,
  IntegramDrawdownPeriod,
  IntegramStrategy,
  IntegramAsset,
} from './analytics-types.js';
import type {
  AnalyticsTrade,
  DailyPortfolioSnapshot,
  StrategyPerformance,
  AssetPerformance,
  AnalyticsReport,
  EquityPoint,
  DrawdownPeriod,
} from '../../analytics/types.js';

export class AnalyticsRepository {
  constructor(private client: IntegramClient) {}

  /**
   * Save trade analytics to Integram
   */
  async saveTrade(trade: AnalyticsTrade, typeId: number): Promise<number> {
    const requisites = {
      tradeId: trade.id,
      strategy: trade.strategy,
      asset: trade.asset,
      entryDateTime: trade.entryDate.toISOString(),
      exitDateTime: trade.exitDate.toISOString(),
      duration: trade.duration,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice,
      size: trade.size,
      pnl: trade.pnl,
      pnlPercent: trade.pnlPercent,
      fees: trade.fees,
      slippage: trade.slippage,
      slDistance: trade.slDistance ?? null,
      tpDistance: trade.tpDistance ?? null,
      mfe: trade.maxFavorableExcursion ?? null,
      mae: trade.maxAdverseExcursion ?? null,
      direction: trade.direction,
      exitReason: trade.exitReason ?? 'unknown',
    };

    return await this.client.createObject(typeId, trade.id, requisites);
  }

  /**
   * Bulk save trades
   */
  async saveTrades(trades: AnalyticsTrade[], typeId: number): Promise<number[]> {
    const ids: number[] = [];

    for (const trade of trades) {
      try {
        const id = await this.saveTrade(trade, typeId);
        ids.push(id);
      } catch (error) {
        console.error(`Failed to save trade ${trade.id}:`, error);
      }
    }

    return ids;
  }

  /**
   * Save daily portfolio snapshot
   */
  async saveDailySnapshot(snapshot: DailyPortfolioSnapshot, typeId: number): Promise<number> {
    const dateStr = snapshot.date.toISOString().split('T')[0];

    const requisites = {
      date: dateStr!,
      totalBalance: snapshot.totalBalance,
      availableBalance: snapshot.availableBalance,
      inPositions: snapshot.inPositions,
      dailyReturn: snapshot.dailyReturn,
      dailyPnL: snapshot.dailyPnL,
      openPositionsCount: snapshot.openPositionsCount,
      tradesCount: snapshot.tradesCount,
      winRate: snapshot.winRate,
      maxDrawdown: snapshot.maxDrawdown,
      sharpeRatio30d: snapshot.sharpeRatio30d,
      drawdownFromPeak: 0, // Can be calculated
      daysSinceATH: 0, // Can be calculated
    };

    return await this.client.createObject(typeId, dateStr!, requisites);
  }

  /**
   * Get daily snapshots for a period
   */
  async getDailySnapshots(
    typeId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<DailyPortfolioSnapshot[]> {
    const allSnapshots = await this.client.getObjects<IntegramDailyPortfolioSnapshot>(typeId);

    return allSnapshots
      .filter((obj) => {
        const date = new Date(obj.requisites.date);
        return date >= startDate && date <= endDate;
      })
      .map((obj) => this.parseSnapshot(obj))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private parseSnapshot(obj: IntegramDailyPortfolioSnapshot): DailyPortfolioSnapshot {
    return {
      date: new Date(obj.requisites.date),
      totalBalance: obj.requisites.totalBalance,
      availableBalance: obj.requisites.availableBalance,
      inPositions: obj.requisites.inPositions,
      dailyReturn: obj.requisites.dailyReturn,
      dailyPnL: obj.requisites.dailyPnL,
      openPositionsCount: obj.requisites.openPositionsCount,
      tradesCount: obj.requisites.tradesCount,
      winRate: obj.requisites.winRate,
      maxDrawdown: obj.requisites.maxDrawdown,
      sharpeRatio30d: obj.requisites.sharpeRatio30d,
    };
  }

  /**
   * Save analytics report
   */
  async saveReport(report: AnalyticsReport, typeId: number): Promise<number> {
    const requisites = {
      generatedAt: report.generatedAt.toISOString(),
      periodType: report.period.type,
      periodStart: report.period.start.toISOString().split('T')[0]!,
      periodEnd: report.period.end.toISOString().split('T')[0]!,

      // Performance
      totalReturn: report.performance.totalReturn,
      totalReturnAbsolute: report.performance.totalReturnAbsolute,
      annualizedReturn: report.performance.annualizedReturn,
      sharpeRatio: report.performance.sharpeRatio,
      sortinoRatio: report.performance.sortinoRatio,
      calmarRatio: report.performance.calmarRatio,

      // Risk
      maxDrawdown: report.performance.maxDrawdown,
      maxDrawdownAbsolute: report.performance.maxDrawdownAbsolute,
      currentDrawdown: report.performance.currentDrawdown,
      valueAtRisk95: report.performance.valueAtRisk95,
      valueAtRisk99: report.performance.valueAtRisk99,

      // Trades
      totalTrades: report.tradeStats.totalTrades,
      winRate: report.tradeStats.winRate,
      profitFactor: report.tradeStats.profitFactor,
      avgTradeDuration: report.tradeStats.avgTradeDuration,

      // Portfolio
      startEquity: report.equityCurve[0]?.equity ?? 0,
      endEquity: report.equityCurve[report.equityCurve.length - 1]?.equity ?? 0,
      currentExposure: report.riskExposure.currentExposure,

      // Benchmarks
      btcReturn: report.benchmarks?.btcReturn ?? null,
      ethReturn: report.benchmarks?.ethReturn ?? null,

      // JSON data
      strategyBreakdown: JSON.stringify(report.strategyPerformance),
      assetBreakdown: JSON.stringify(report.assetPerformance),
      correlationMatrix: report.correlation ? JSON.stringify(report.correlation) : null,
    };

    const reportId = await this.client.createObject(
      typeId,
      `${report.period.type}-${requisites.periodStart}`,
      requisites,
    );

    return reportId;
  }

  /**
   * Save strategy performance (subordinate to report)
   */
  async saveStrategyPerformance(
    performance: StrategyPerformance,
    reportId: number,
    typeId: number,
    reportDate: Date,
  ): Promise<number> {
    const requisites = {
      strategy: performance.strategy,
      reportDate: reportDate.toISOString().split('T')[0]!,
      trades: performance.trades,
      winRate: performance.winRate,
      pnl: performance.pnl,
      pnlPercent: performance.pnlPercent,
      sharpeRatio: performance.sharpeRatio,
      maxDrawdown: performance.maxDrawdown,
      avgTradeDuration: performance.avgTradeDuration,
      profitFactor: performance.profitFactor,
      avgPositionSize: performance.avgPositionSize,
    };

    // Create as subordinate to report
    const objectId = await this.client.createObject(typeId, performance.strategy, requisites);

    // Update to set parent using updateRequisites
    await this.client.updateRequisites(objectId, { up: reportId });

    return objectId;
  }

  /**
   * Save asset performance (subordinate to report)
   */
  async saveAssetPerformance(
    performance: AssetPerformance,
    reportId: number,
    typeId: number,
    reportDate: Date,
  ): Promise<number> {
    const requisites = {
      asset: performance.asset,
      reportDate: reportDate.toISOString().split('T')[0]!,
      trades: performance.trades,
      winRate: performance.winRate,
      pnl: performance.pnl,
      pnlPercent: performance.pnlPercent,
      avgHoldTime: performance.avgHoldTime,
      largestWin: performance.largestWin,
      largestLoss: performance.largestLoss,
      avgPositionSize: performance.avgPositionSize,
      totalVolume: performance.totalVolume,
    };

    const objectId = await this.client.createObject(typeId, performance.asset, requisites);

    // Update to set parent using updateRequisites
    await this.client.updateRequisites(objectId, { up: reportId });

    return objectId;
  }

  /**
   * Save equity curve points (subordinate to snapshot)
   */
  async saveEquityCurvePoints(
    points: EquityPoint[],
    snapshotId: number,
    typeId: number,
  ): Promise<number[]> {
    const ids: number[] = [];

    for (const point of points) {
      try {
        const requisites = {
          timestamp: point.timestamp.toISOString(),
          equity: point.equity,
          cash: point.cash,
          positions: point.positions,
          drawdown: point.drawdown,
          dailyReturn: point.dailyReturn ?? null,
        };

        const objectId = await this.client.createObject(
          typeId,
          point.timestamp.toISOString(),
          requisites,
        );

        // Set parent using updateRequisites
        await this.client.updateRequisites(objectId, { up: snapshotId });

        ids.push(objectId);
      } catch (error) {
        console.error(`Failed to save equity point:`, error);
      }
    }

    return ids;
  }

  /**
   * Save drawdown period
   */
  async saveDrawdownPeriod(period: DrawdownPeriod, typeId: number): Promise<number> {
    const requisites = {
      startDate: period.startDate.toISOString().split('T')[0]!,
      endDate: period.endDate.toISOString().split('T')[0]!,
      duration: period.duration,
      depth: period.depth,
      recovered: period.recovered,
      recoveryDate: period.recoveryDate?.toISOString().split('T')[0] ?? null,
      peakEquity: 0, // Will need to be calculated separately
      valleyEquity: 0,
    };

    return await this.client.createObject(
      typeId,
      period.startDate.toISOString().split('T')[0]!,
      requisites,
    );
  }

  /**
   * Get or create strategy lookup entry
   */
  async ensureStrategy(name: string, description: string, typeId: number): Promise<number> {
    const existing = await this.client.findObjectByValue(typeId, name);
    if (existing) {
      return existing.id;
    }

    const requisites = {
      name,
      description,
      active: true,
      createdAt: new Date().toISOString(),
      params: '{}',
    };

    return await this.client.createObject(typeId, name, requisites);
  }

  /**
   * Get or create asset lookup entry
   */
  async ensureAsset(
    symbol: string,
    name: string,
    exchange: string,
    typeId: number,
  ): Promise<number> {
    const existing = await this.client.findObjectByValue(typeId, symbol);
    if (existing) {
      return existing.id;
    }

    const requisites = {
      symbol,
      name,
      type: 'spot',
      exchange,
      active: true,
      lastTraded: new Date().toISOString(),
    };

    return await this.client.createObject(typeId, symbol, requisites);
  }

  /**
   * Get all reports for a period
   */
  async getReports(
    typeId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<IntegramAnalyticsReport[]> {
    const allReports = await this.client.getObjects<IntegramAnalyticsReport>(typeId);

    return allReports.filter((report) => {
      const reportDate = new Date(report.requisites.periodStart);
      return reportDate >= startDate && reportDate <= endDate;
    });
  }

  /**
   * Get trades for a period
   */
  async getTrades(typeId: number, startDate: Date, endDate: Date): Promise<AnalyticsTrade[]> {
    const allTrades = await this.client.getObjects<IntegramTradeAnalytics>(typeId);

    return allTrades
      .filter((obj) => {
        const exitDate = new Date(obj.requisites.exitDateTime);
        return exitDate >= startDate && exitDate <= endDate;
      })
      .map((obj) => this.parseTrade(obj));
  }

  private parseTrade(obj: IntegramTradeAnalytics): AnalyticsTrade {
    return {
      id: obj.requisites.tradeId,
      strategy: obj.requisites.strategy,
      asset: obj.requisites.asset,
      entryDate: new Date(obj.requisites.entryDateTime),
      exitDate: new Date(obj.requisites.exitDateTime),
      duration: obj.requisites.duration,
      entryPrice: obj.requisites.entryPrice,
      exitPrice: obj.requisites.exitPrice,
      size: obj.requisites.size,
      pnl: obj.requisites.pnl,
      pnlPercent: obj.requisites.pnlPercent,
      fees: obj.requisites.fees,
      slippage: obj.requisites.slippage,
      slDistance: obj.requisites.slDistance ?? undefined,
      tpDistance: obj.requisites.tpDistance ?? undefined,
      maxFavorableExcursion: obj.requisites.mfe ?? undefined,
      maxAdverseExcursion: obj.requisites.mae ?? undefined,
      direction: obj.requisites.direction as 'long' | 'short',
      exitReason: obj.requisites.exitReason as any,
    };
  }

  /**
   * Delete old records (data retention)
   */
  async deleteOldRecords(typeId: number, olderThan: Date): Promise<number> {
    const allObjects = await this.client.getObjects<IntegramTradeAnalytics>(typeId);

    let deletedCount = 0;
    for (const obj of allObjects) {
      const exitDate = new Date(obj.requisites.exitDateTime);
      if (exitDate < olderThan) {
        try {
          await this.client.deleteObject(obj.id);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete object ${obj.id}:`, error);
        }
      }
    }

    return deletedCount;
  }
}
