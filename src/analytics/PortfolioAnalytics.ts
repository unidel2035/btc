/**
 * Portfolio Analytics Module
 * Provides comprehensive analytics for trading portfolio performance
 */

import type {
  AnalyticsTrade,
  PerformanceMetrics,
  TradeStatistics,
  StrategyPerformance,
  AssetPerformance,
  EquityPoint,
  Drawdown,
  DrawdownPeriod,
  CorrelationMatrix,
  RiskExposure,
  AnalyticsReport,
  AnalyticsPeriod,
  AnalyticsConfig,
  Returns,
} from './types.js';

export class PortfolioAnalytics {
  private config: Required<AnalyticsConfig>;

  constructor(config?: AnalyticsConfig) {
    this.config = {
      riskFreeRate: config?.riskFreeRate ?? 0,
      tradingDaysPerYear: config?.tradingDaysPerYear ?? 365, // Crypto trades 24/7
      benchmark: config?.benchmark ?? 'BTC',
      includeOpenPositions: config?.includeOpenPositions ?? false,
    };
  }

  /**
   * Calculate returns for a given period
   */
  calculateReturns(equityCurve: EquityPoint[], period: AnalyticsPeriod): Returns {
    if (equityCurve.length < 2) {
      throw new Error('Insufficient data for returns calculation');
    }

    const startEquity = equityCurve[0]!.equity;
    const endEquity = equityCurve[equityCurve.length - 1]!.equity;
    const startDate = equityCurve[0]!.timestamp;
    const endDate = equityCurve[equityCurve.length - 1]!.timestamp;

    const totalReturn = ((endEquity - startEquity) / startEquity) * 100;
    const absoluteReturn = endEquity - startEquity;

    // Calculate annualized return
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const years = daysDiff / this.config.tradingDaysPerYear;
    const annualizedReturn =
      years > 0 ? (Math.pow(endEquity / startEquity, 1 / years) - 1) * 100 : 0;

    // Calculate daily returns for volatility
    const dailyReturns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prev = equityCurve[i - 1]!;
      const curr = equityCurve[i]!;
      if (prev.equity > 0) {
        dailyReturns.push((curr.equity - prev.equity) / prev.equity);
      }
    }

    const volatility = this.calculateVolatility(dailyReturns);
    const sharpeRatio = this.calculateSharpeRatioFromReturns(dailyReturns);

    return {
      period,
      totalReturn,
      absoluteReturn,
      annualizedReturn,
      volatility: volatility * 100, // convert to %
      sharpeRatio,
      startDate,
      endDate,
      startEquity,
      endEquity,
      dailyReturns,
    };
  }

  /**
   * Calculate comprehensive performance metrics
   */
  calculatePerformanceMetrics(
    trades: AnalyticsTrade[],
    equityCurve: EquityPoint[],
  ): PerformanceMetrics {
    if (equityCurve.length < 2) {
      throw new Error('Insufficient equity curve data');
    }

    const startEquity = equityCurve[0]!.equity;
    const endEquity = equityCurve[equityCurve.length - 1]!.equity;
    const startDate = equityCurve[0]!.timestamp;
    const endDate = equityCurve[equityCurve.length - 1]!.timestamp;

    // Calculate returns
    const totalReturn = ((endEquity - startEquity) / startEquity) * 100;
    const totalReturnAbsolute = endEquity - startEquity;

    // Calculate time periods
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const years = daysDiff / this.config.tradingDaysPerYear;

    // CAGR and annualized return
    const cagr = years > 0 ? (Math.pow(endEquity / startEquity, 1 / years) - 1) * 100 : 0;
    const annualizedReturn = cagr;

    // Calculate daily returns
    const dailyReturns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prev = equityCurve[i - 1]!;
      const curr = equityCurve[i]!;
      if (prev.equity > 0) {
        dailyReturns.push((curr.equity - prev.equity) / prev.equity);
      }
    }

    // Risk metrics
    const sharpeRatio = this.calculateSharpeRatioFromReturns(dailyReturns);
    const sortinoRatio = this.calculateSortinoRatioFromReturns(dailyReturns);
    const volatility = this.calculateVolatility(dailyReturns);
    const downsideDeviation = this.calculateDownsideDeviation(dailyReturns);
    const annualizedVolatility = volatility * Math.sqrt(this.config.tradingDaysPerYear);

    // Drawdown analysis
    const drawdown = this.calculateDrawdown(equityCurve);
    const calmarRatio =
      drawdown.maxDrawdown !== 0 ? annualizedReturn / Math.abs(drawdown.maxDrawdown) : 0;

    // Value at Risk
    const var95 = this.calculateVaR(dailyReturns, 0.95);
    const var99 = this.calculateVaR(dailyReturns, 0.99);
    const cvar95 = this.calculateCVaR(dailyReturns, 0.95);
    const cvar99 = this.calculateCVaR(dailyReturns, 0.99);

    // Time-weighted and money-weighted returns
    const twr = this.calculateTimeWeightedReturn(equityCurve);
    const mwr = this.calculateMoneyWeightedReturn(trades);

    return {
      totalReturn,
      totalReturnAbsolute,
      cagr,
      annualizedReturn,
      timeWeightedReturn: twr,
      moneyWeightedReturn: mwr,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      maxDrawdown: drawdown.maxDrawdown,
      maxDrawdownAbsolute: drawdown.maxDrawdownAbsolute,
      avgDrawdown: drawdown.avgDrawdown,
      drawdownDuration: drawdown.drawdownDuration,
      currentDrawdown: drawdown.currentDrawdown,
      valueAtRisk95: var95 * 100,
      valueAtRisk99: var99 * 100,
      conditionalVaR95: cvar95 * 100,
      conditionalVaR99: cvar99 * 100,
      volatility: volatility * 100,
      downsideDeviation: downsideDeviation * 100,
      annualizedVolatility: annualizedVolatility * 100,
    };
  }

  /**
   * Calculate Sharpe Ratio from returns array
   */
  private calculateSharpeRatioFromReturns(returns: number[]): number {
    if (returns.length === 0) return 0;

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    const excessReturn = avgReturn - this.config.riskFreeRate / this.config.tradingDaysPerYear;
    const sharpe = (excessReturn / stdDev) * Math.sqrt(this.config.tradingDaysPerYear);
    return sharpe;
  }

  /**
   * Calculate Sortino Ratio from returns array
   */
  private calculateSortinoRatioFromReturns(returns: number[]): number {
    if (returns.length === 0) return 0;

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const downsideReturns = returns.filter((r) => r < 0);

    if (downsideReturns.length === 0) {
      return avgReturn > 0 ? Infinity : 0;
    }

    const downsideVariance =
      downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length;
    const downsideStdDev = Math.sqrt(downsideVariance);

    if (downsideStdDev === 0) return 0;

    const excessReturn = avgReturn - this.config.riskFreeRate / this.config.tradingDaysPerYear;
    const sortino = (excessReturn / downsideStdDev) * Math.sqrt(this.config.tradingDaysPerYear);
    return sortino;
  }

  /**
   * Calculate volatility (standard deviation of returns)
   */
  private calculateVolatility(returns: number[]): number {
    if (returns.length === 0) return 0;

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate downside deviation (volatility of negative returns)
   */
  private calculateDownsideDeviation(returns: number[]): number {
    const downsideReturns = returns.filter((r) => r < 0);
    if (downsideReturns.length === 0) return 0;

    const variance =
      downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate Value at Risk (VaR)
   */
  private calculateVaR(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0;

    const sorted = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sorted.length);
    return sorted[index] ?? 0;
  }

  /**
   * Calculate Conditional Value at Risk (CVaR / Expected Shortfall)
   */
  private calculateCVaR(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0;

    const sorted = [...returns].sort((a, b) => a - b);
    const cutoffIndex = Math.floor((1 - confidence) * sorted.length);
    const tailReturns = sorted.slice(0, cutoffIndex);

    if (tailReturns.length === 0) return 0;

    return tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;
  }

  /**
   * Calculate drawdown analysis
   */
  calculateDrawdown(equityCurve: EquityPoint[]): Drawdown {
    let maxDrawdown = 0;
    let maxDrawdownAbsolute = 0;
    let peakEquity = 0;
    let peakDate: Date | undefined;
    let valleyDate: Date | undefined;
    let currentDrawdown = 0;
    let daysSinceATH = 0;

    const drawdowns: number[] = [];
    const drawdownPeriods: DrawdownPeriod[] = [];

    let inDrawdown = false;
    let drawdownStart: Date | undefined;
    let drawdownPeak = 0;

    for (const point of equityCurve) {
      if (point.equity > peakEquity) {
        peakEquity = point.equity;
        peakDate = point.timestamp;
        daysSinceATH = 0;

        // End current drawdown period if recovering
        if (inDrawdown && drawdownStart) {
          drawdownPeriods.push({
            startDate: drawdownStart,
            endDate: point.timestamp,
            duration: (point.timestamp.getTime() - drawdownStart.getTime()) / (1000 * 60 * 60 * 24),
            depth: ((drawdownPeak - point.equity) / drawdownPeak) * 100,
            recovered: true,
            recoveryDate: point.timestamp,
          });
          inDrawdown = false;
        }
      } else {
        daysSinceATH++;
      }

      const dd = ((peakEquity - point.equity) / peakEquity) * 100;
      const ddAbsolute = peakEquity - point.equity;

      if (dd > maxDrawdown) {
        maxDrawdown = dd;
        maxDrawdownAbsolute = ddAbsolute;
        valleyDate = point.timestamp;
      }

      currentDrawdown = dd;
      drawdowns.push(dd);

      // Track drawdown periods
      if (dd > 0.1 && !inDrawdown) {
        inDrawdown = true;
        drawdownStart = point.timestamp;
        drawdownPeak = peakEquity;
      }
    }

    // If still in drawdown at end
    if (inDrawdown && drawdownStart) {
      const lastPoint = equityCurve[equityCurve.length - 1]!;
      drawdownPeriods.push({
        startDate: drawdownStart,
        endDate: lastPoint.timestamp,
        duration: (lastPoint.timestamp.getTime() - drawdownStart.getTime()) / (1000 * 60 * 60 * 24),
        depth: ((drawdownPeak - lastPoint.equity) / drawdownPeak) * 100,
        recovered: false,
      });
    }

    const avgDrawdown =
      drawdowns.length > 0 ? drawdowns.reduce((sum, dd) => sum + dd, 0) / drawdowns.length : 0;

    // Calculate max drawdown duration
    const maxDdPeriod = drawdownPeriods.reduce(
      (max, period) => (period.depth > max.depth ? period : max),
      { depth: 0, duration: 0 } as DrawdownPeriod,
    );

    return {
      maxDrawdown,
      maxDrawdownAbsolute,
      avgDrawdown,
      currentDrawdown,
      drawdownDuration: maxDdPeriod.duration || 0,
      daysSinceATH,
      peakDate,
      valleyDate,
      drawdownPeriods,
    };
  }

  /**
   * Calculate time-weighted return (TWR)
   */
  private calculateTimeWeightedReturn(equityCurve: EquityPoint[]): number {
    if (equityCurve.length < 2) return 0;

    let product = 1;
    for (let i = 1; i < equityCurve.length; i++) {
      const prev = equityCurve[i - 1]!;
      const curr = equityCurve[i]!;
      if (prev.equity > 0) {
        product *= curr.equity / prev.equity;
      }
    }

    return (product - 1) * 100;
  }

  /**
   * Calculate money-weighted return (MWR/IRR) - simplified version
   */
  private calculateMoneyWeightedReturn(trades: AnalyticsTrade[]): number {
    // Simplified: use total return weighted by capital deployed
    if (trades.length === 0) return 0;

    const totalCapitalDeployed = trades.reduce((sum, t) => sum + t.size, 0);
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);

    if (totalCapitalDeployed === 0) return 0;

    return (totalPnL / totalCapitalDeployed) * 100;
  }

  /**
   * Calculate trade statistics
   */
  calculateTradeStatistics(trades: AnalyticsTrade[]): TradeStatistics {
    if (trades.length === 0) {
      return this.getEmptyTradeStatistics();
    }

    const winningTrades = trades.filter((t) => t.pnl > 0);
    const losingTrades = trades.filter((t) => t.pnl < 0);

    const winRate = (winningTrades.length / trades.length) * 100;

    // Profit factor
    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    // Average metrics
    const avgWin =
      winningTrades.length > 0
        ? winningTrades.reduce((sum, t) => sum + t.pnlPercent, 0) / winningTrades.length
        : 0;
    const avgLoss =
      losingTrades.length > 0
        ? losingTrades.reduce((sum, t) => sum + t.pnlPercent, 0) / losingTrades.length
        : 0;
    const winLossRatio = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : avgWin > 0 ? Infinity : 0;

    const largestWin =
      winningTrades.length > 0 ? Math.max(...winningTrades.map((t) => t.pnlPercent)) : 0;
    const largestLoss =
      losingTrades.length > 0 ? Math.min(...losingTrades.map((t) => t.pnlPercent)) : 0;

    // Duration
    const avgTradeDuration = trades.reduce((sum, t) => sum + t.duration, 0) / trades.length;
    const avgHoldingTimeWinners =
      winningTrades.length > 0
        ? winningTrades.reduce((sum, t) => sum + t.duration, 0) / winningTrades.length
        : 0;
    const avgHoldingTimeLosers =
      losingTrades.length > 0
        ? losingTrades.reduce((sum, t) => sum + t.duration, 0) / losingTrades.length
        : 0;

    // Position sizing
    const avgPositionSize = trades.reduce((sum, t) => sum + t.size, 0) / trades.length;

    // Time-based metrics
    const firstTrade = trades[0]!;
    const lastTrade = trades[trades.length - 1]!;
    const daysDiff =
      (lastTrade.exitDate.getTime() - firstTrade.entryDate.getTime()) / (1000 * 60 * 60 * 24);
    const avgTradesPerDay = daysDiff > 0 ? trades.length / daysDiff : 0;
    const avgTradesPerWeek = avgTradesPerDay * 7;
    const avgTradesPerMonth = avgTradesPerDay * 30;

    // Turnover rate
    const turnoverRate = avgTradesPerDay;

    // Consecutive wins/losses
    const { maxWins, maxLosses } = this.calculateConsecutiveWinsLosses(trades);

    // Long/short breakdown
    const longTrades = trades.filter((t) => t.direction === 'long').length;
    const shortTrades = trades.filter((t) => t.direction === 'short').length;
    const longWins = trades.filter((t) => t.direction === 'long' && t.pnl > 0).length;
    const shortWins = trades.filter((t) => t.direction === 'short' && t.pnl > 0).length;
    const longWinRate = longTrades > 0 ? (longWins / longTrades) * 100 : 0;
    const shortWinRate = shortTrades > 0 ? (shortWins / shortTrades) * 100 : 0;

    return {
      totalTrades: trades.length,
      avgTradesPerDay,
      avgTradesPerWeek,
      avgTradesPerMonth,
      avgTradeDuration,
      avgPositionSize,
      turnoverRate,
      winRate,
      profitFactor,
      avgWin,
      avgLoss,
      winLossRatio,
      largestWin,
      largestLoss,
      avgHoldingTimeWinners,
      avgHoldingTimeLosers,
      consecutiveWinsMax: maxWins,
      consecutiveLossesMax: maxLosses,
      longTrades,
      shortTrades,
      longWinRate,
      shortWinRate,
    };
  }

  private getEmptyTradeStatistics(): TradeStatistics {
    return {
      totalTrades: 0,
      avgTradesPerDay: 0,
      avgTradesPerWeek: 0,
      avgTradesPerMonth: 0,
      avgTradeDuration: 0,
      avgPositionSize: 0,
      turnoverRate: 0,
      winRate: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      winLossRatio: 0,
      largestWin: 0,
      largestLoss: 0,
      avgHoldingTimeWinners: 0,
      avgHoldingTimeLosers: 0,
      consecutiveWinsMax: 0,
      consecutiveLossesMax: 0,
      longTrades: 0,
      shortTrades: 0,
      longWinRate: 0,
      shortWinRate: 0,
    };
  }

  private calculateConsecutiveWinsLosses(trades: AnalyticsTrade[]): {
    maxWins: number;
    maxLosses: number;
  } {
    let maxWins = 0;
    let maxLosses = 0;
    let currentWins = 0;
    let currentLosses = 0;

    for (const trade of trades) {
      if (trade.pnl > 0) {
        currentWins++;
        currentLosses = 0;
        maxWins = Math.max(maxWins, currentWins);
      } else {
        currentLosses++;
        currentWins = 0;
        maxLosses = Math.max(maxLosses, currentLosses);
      }
    }

    return { maxWins, maxLosses };
  }

  /**
   * Get strategy performance breakdown
   */
  getStrategyPerformance(trades: AnalyticsTrade[]): StrategyPerformance[] {
    const strategyMap = new Map<string, AnalyticsTrade[]>();

    // Group trades by strategy
    for (const trade of trades) {
      if (!strategyMap.has(trade.strategy)) {
        strategyMap.set(trade.strategy, []);
      }
      strategyMap.get(trade.strategy)!.push(trade);
    }

    const results: StrategyPerformance[] = [];

    for (const [strategy, strategyTrades] of Array.from(strategyMap.entries())) {
      const winningTrades = strategyTrades.filter((t) => t.pnl > 0);
      const losingTrades = strategyTrades.filter((t) => t.pnl < 0);
      const winRate = (winningTrades.length / strategyTrades.length) * 100;

      const pnl = strategyTrades.reduce((sum, t) => sum + t.pnl, 0);
      const totalSize = strategyTrades.reduce((sum, t) => sum + t.size, 0);
      const pnlPercent = totalSize > 0 ? (pnl / totalSize) * 100 : 0;

      const avgTradeDuration =
        strategyTrades.reduce((sum, t) => sum + t.duration, 0) / strategyTrades.length;
      const avgPositionSize =
        strategyTrades.reduce((sum, t) => sum + t.size, 0) / strategyTrades.length;

      const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
      const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

      // Calculate Sharpe ratio for strategy (simplified)
      const returns = strategyTrades.map((t) => t.pnlPercent / 100);
      const sharpeRatio = this.calculateSharpeRatioFromReturns(returns);

      // Max drawdown (simplified for strategy)
      const maxDrawdown = this.calculateStrategyMaxDrawdown(strategyTrades);

      results.push({
        strategy,
        trades: strategyTrades.length,
        winRate,
        pnl,
        pnlPercent,
        sharpeRatio,
        maxDrawdown,
        avgTradeDuration,
        profitFactor,
        avgPositionSize,
      });
    }

    return results.sort((a, b) => b.pnl - a.pnl);
  }

  private calculateStrategyMaxDrawdown(trades: AnalyticsTrade[]): number {
    let peak = 0;
    let maxDD = 0;
    let equity = 0;

    for (const trade of trades) {
      equity += trade.pnl;
      if (equity > peak) {
        peak = equity;
      }
      const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
      maxDD = Math.max(maxDD, dd);
    }

    return maxDD;
  }

  /**
   * Get asset performance breakdown
   */
  getAssetPerformance(trades: AnalyticsTrade[]): AssetPerformance[] {
    const assetMap = new Map<string, AnalyticsTrade[]>();

    // Group trades by asset
    for (const trade of trades) {
      if (!assetMap.has(trade.asset)) {
        assetMap.set(trade.asset, []);
      }
      assetMap.get(trade.asset)!.push(trade);
    }

    const results: AssetPerformance[] = [];

    for (const [asset, assetTrades] of Array.from(assetMap.entries())) {
      const winningTrades = assetTrades.filter((t) => t.pnl > 0);
      const winRate = (winningTrades.length / assetTrades.length) * 100;

      const pnl = assetTrades.reduce((sum, t) => sum + t.pnl, 0);
      const totalSize = assetTrades.reduce((sum, t) => sum + t.size, 0);
      const pnlPercent = totalSize > 0 ? (pnl / totalSize) * 100 : 0;

      const avgHoldTime = assetTrades.reduce((sum, t) => sum + t.duration, 0) / assetTrades.length;
      const avgPositionSize = totalSize / assetTrades.length;

      const largestWin =
        winningTrades.length > 0 ? Math.max(...winningTrades.map((t) => t.pnlPercent)) : 0;
      const losingTrades = assetTrades.filter((t) => t.pnl < 0);
      const largestLoss =
        losingTrades.length > 0 ? Math.min(...losingTrades.map((t) => t.pnlPercent)) : 0;

      results.push({
        asset,
        trades: assetTrades.length,
        winRate,
        pnl,
        pnlPercent,
        avgHoldTime,
        largestWin,
        largestLoss,
        avgPositionSize,
        totalVolume: totalSize,
      });
    }

    return results.sort((a, b) => b.pnl - a.pnl);
  }

  /**
   * Calculate correlation matrix for assets
   */
  calculateCorrelationMatrix(trades: AnalyticsTrade[]): CorrelationMatrix {
    const assets = Array.from(new Set(trades.map((t) => t.asset))).sort();

    // Create return series for each asset
    const assetReturns = new Map<string, number[]>();

    for (const asset of assets) {
      const assetTrades = trades.filter((t) => t.asset === asset);
      assetReturns.set(
        asset,
        assetTrades.map((t) => t.pnlPercent / 100),
      );
    }

    // Calculate correlation matrix
    const n = assets.length;
    const matrix: number[][] = Array(n)
      .fill(0)
      .map(() => Array(n).fill(0) as number[]);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const returns1 = assetReturns.get(assets[i]!) || [];
        const returns2 = assetReturns.get(assets[j]!) || [];
        matrix[i]![j] = this.calculateCorrelation(returns1, returns2);
      }
    }

    return {
      assets,
      matrix,
      updated: new Date(),
    };
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length === 0 || y.length === 0 || x.length !== y.length) {
      return 0;
    }

    const n = x.length;
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let sumSqX = 0;
    let sumSqY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i]! - meanX;
      const dy = y[i]! - meanY;
      numerator += dx * dy;
      sumSqX += dx * dx;
      sumSqY += dy * dy;
    }

    const denominator = Math.sqrt(sumSqX * sumSqY);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Calculate risk exposure
   */
  calculateRiskExposure(
    currentPositions: Array<{ asset: string; size: number }>,
    totalEquity: number,
    trades: AnalyticsTrade[],
  ): RiskExposure {
    const currentExposure =
      (currentPositions.reduce((sum, p) => sum + p.size, 0) / totalEquity) * 100;

    // Calculate historical exposure metrics from trades
    const exposures = trades.map((t) => (t.size / totalEquity) * 100);
    const maxExposure = exposures.length > 0 ? Math.max(...exposures) : 0;
    const avgExposure =
      exposures.length > 0 ? exposures.reduce((sum, e) => sum + e, 0) / exposures.length : 0;

    const avgPositionSize = avgExposure;
    const maxPositionSize = maxExposure;

    // Top positions concentration
    const sortedPositions = [...currentPositions].sort((a, b) => b.size - a.size);
    const top3 = sortedPositions.slice(0, 3);
    const concentrationRisk = (top3.reduce((sum, p) => sum + p.size, 0) / totalEquity) * 100;

    const topPositions = currentPositions
      .map((p) => ({
        asset: p.asset,
        exposure: (p.size / totalEquity) * 100,
      }))
      .sort((a, b) => b.exposure - a.exposure)
      .slice(0, 5);

    return {
      currentExposure,
      maxExposure,
      avgExposure,
      avgPositionSize,
      maxPositionSize,
      concentrationRisk,
      topPositions,
    };
  }

  /**
   * Generate comprehensive analytics report
   */
  generateReport(
    trades: AnalyticsTrade[],
    equityCurve: EquityPoint[],
    period: {
      start: Date;
      end: Date;
      type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
    },
    currentPositions: Array<{ asset: string; size: number }> = [],
  ): AnalyticsReport {
    const performance = this.calculatePerformanceMetrics(trades, equityCurve);
    const tradeStats = this.calculateTradeStatistics(trades);
    const strategyPerformance = this.getStrategyPerformance(trades);
    const assetPerformance = this.getAssetPerformance(trades);
    const drawdown = this.calculateDrawdown(equityCurve);
    const correlation = this.calculateCorrelationMatrix(trades);

    const totalEquity = equityCurve[equityCurve.length - 1]?.equity ?? 0;
    const riskExposure = this.calculateRiskExposure(currentPositions, totalEquity, trades);

    return {
      generatedAt: new Date(),
      period,
      performance,
      tradeStats,
      strategyPerformance,
      assetPerformance,
      equityCurve,
      drawdown,
      riskExposure,
      correlation,
      summary: {
        totalTrades: trades.length,
        winRate: tradeStats.winRate,
        totalReturn: performance.totalReturn,
        sharpeRatio: performance.sharpeRatio,
        maxDrawdown: performance.maxDrawdown,
      },
    };
  }
}
