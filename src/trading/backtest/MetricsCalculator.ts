import type { Trade, BacktestResult, EquityPoint, MonthlyPerformance, BacktestConfig } from './types.js';

/**
 * Calculate backtest performance metrics
 */
export class MetricsCalculator {
  /**
   * Calculate all backtest metrics
   */
  static calculateMetrics(
    trades: Trade[],
    equityCurve: EquityPoint[],
    config: BacktestConfig,
    startTime: Date,
    endTime: Date,
    executionTime: number,
  ): BacktestResult {
    const initialCapital = config.initialCapital;
    const finalEquity = equityCurve[equityCurve.length - 1]?.equity ?? initialCapital;

    // Filter only closed trades
    const closedTrades = trades.filter((t) => t.exitPrice !== undefined);

    const winningTrades = closedTrades.filter((t) => (t.pnl ?? 0) > 0);
    const losingTrades = closedTrades.filter((t) => (t.pnl ?? 0) < 0);

    const totalReturn = ((finalEquity - initialCapital) / initialCapital) * 100;
    const annualizedReturn = this.calculateAnnualizedReturn(
      initialCapital,
      finalEquity,
      config.startDate,
      config.endDate,
    );

    const sharpeRatio = this.calculateSharpeRatio(equityCurve);
    const sortinoRatio = this.calculateSortinoRatio(equityCurve);
    const maxDrawdown = this.calculateMaxDrawdown(equityCurve);
    const maxDrawdownDuration = this.calculateMaxDrawdownDuration(equityCurve);

    const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;

    const grossProfit = winningTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    const avgTradeDuration = this.calculateAvgTradeDuration(closedTrades);
    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + (t.pnlPercent ?? 0), 0) / winningTrades.length
      : 0;
    const avgLoss = losingTrades.length > 0
      ? losingTrades.reduce((sum, t) => sum + (t.pnlPercent ?? 0), 0) / losingTrades.length
      : 0;

    const largestWin = winningTrades.length > 0
      ? Math.max(...winningTrades.map((t) => t.pnlPercent ?? 0))
      : 0;
    const largestLoss = losingTrades.length > 0
      ? Math.min(...losingTrades.map((t) => t.pnlPercent ?? 0))
      : 0;

    return {
      config,
      totalReturn,
      annualizedReturn,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      maxDrawdownDuration,
      winRate,
      profitFactor,
      totalTrades: closedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      avgTradeDuration,
      avgWin,
      avgLoss,
      largestWin,
      largestLoss,
      equityCurve,
      trades: closedTrades,
      executionTime,
      startTime,
      endTime,
    };
  }

  /**
   * Calculate annualized return
   */
  private static calculateAnnualizedReturn(
    initialCapital: number,
    finalEquity: number,
    startDate: Date,
    endDate: Date,
  ): number {
    const totalReturn = (finalEquity - initialCapital) / initialCapital;
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const years = daysDiff / 365.25;

    if (years <= 0) return 0;

    const annualizedReturn = (Math.pow(1 + totalReturn, 1 / years) - 1) * 100;
    return annualizedReturn;
  }

  /**
   * Calculate Sharpe Ratio (risk-adjusted return)
   * Assumes risk-free rate of 0 for simplicity
   */
  private static calculateSharpeRatio(equityCurve: EquityPoint[]): number {
    if (equityCurve.length < 2) return 0;

    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prev = equityCurve[i - 1];
      const curr = equityCurve[i];
      if (prev && curr && prev.equity > 0) {
        returns.push((curr.equity - prev.equity) / prev.equity);
      }
    }

    if (returns.length === 0) return 0;

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    // Annualize (assuming daily returns)
    const sharpe = (avgReturn / stdDev) * Math.sqrt(252); // 252 trading days per year
    return sharpe;
  }

  /**
   * Calculate Sortino Ratio (downside risk-adjusted return)
   */
  private static calculateSortinoRatio(equityCurve: EquityPoint[]): number {
    if (equityCurve.length < 2) return 0;

    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prev = equityCurve[i - 1];
      const curr = equityCurve[i];
      if (prev && curr && prev.equity > 0) {
        returns.push((curr.equity - prev.equity) / prev.equity);
      }
    }

    if (returns.length === 0) return 0;

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

    // Only consider downside deviations (negative returns)
    const downsideReturns = returns.filter((r) => r < 0);
    if (downsideReturns.length === 0) return avgReturn > 0 ? Infinity : 0;

    const downsideVariance =
      downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length;
    const downsideStdDev = Math.sqrt(downsideVariance);

    if (downsideStdDev === 0) return 0;

    // Annualize
    const sortino = (avgReturn / downsideStdDev) * Math.sqrt(252);
    return sortino;
  }

  /**
   * Calculate maximum drawdown
   */
  private static calculateMaxDrawdown(equityCurve: EquityPoint[]): number {
    let maxDrawdown = 0;

    for (const point of equityCurve) {
      maxDrawdown = Math.max(maxDrawdown, Math.abs(point.drawdown));
    }

    return maxDrawdown;
  }

  /**
   * Calculate maximum drawdown duration in days
   */
  private static calculateMaxDrawdownDuration(equityCurve: EquityPoint[]): number {
    let maxDuration = 0;
    let currentDuration = 0;
    let inDrawdown = false;

    for (let i = 1; i < equityCurve.length; i++) {
      const point = equityCurve[i];
      if (!point) continue;

      if (point.drawdown < -0.001) {
        // In drawdown (threshold 0.1%)
        if (!inDrawdown) {
          inDrawdown = true;
          currentDuration = 0;
        }
        currentDuration++;
      } else {
        // Recovered from drawdown
        if (inDrawdown) {
          maxDuration = Math.max(maxDuration, currentDuration);
          inDrawdown = false;
        }
      }
    }

    // If still in drawdown at end
    if (inDrawdown) {
      maxDuration = Math.max(maxDuration, currentDuration);
    }

    // Convert from data points to days (approximate)
    // Assuming data points are roughly uniform in time
    if (equityCurve.length >= 2) {
      const first = equityCurve[0];
      const last = equityCurve[equityCurve.length - 1];
      if (first && last) {
        const totalDays =
          (last.timestamp.getTime() - first.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        const daysPerPoint = totalDays / equityCurve.length;
        return maxDuration * daysPerPoint;
      }
    }

    return maxDuration;
  }

  /**
   * Calculate average trade duration in hours
   */
  private static calculateAvgTradeDuration(trades: Trade[]): number {
    const durations = trades
      .filter((t) => t.exitTime)
      .map((t) => {
        if (!t.exitTime) return 0;
        return (t.exitTime.getTime() - t.entryTime.getTime()) / (1000 * 60 * 60);
      });

    if (durations.length === 0) return 0;

    return durations.reduce((sum, d) => sum + d, 0) / durations.length;
  }

  /**
   * Calculate monthly performance breakdown
   */
  static calculateMonthlyPerformance(
    equityCurve: EquityPoint[],
    trades: Trade[],
  ): MonthlyPerformance[] {
    const monthlyData = new Map<string, MonthlyPerformance>();

    // Initialize from equity curve
    for (let i = 1; i < equityCurve.length; i++) {
      const prev = equityCurve[i - 1];
      const curr = equityCurve[i];
      if (!prev || !curr) continue;

      const year = curr.timestamp.getFullYear();
      const month = curr.timestamp.getMonth() + 1;
      const key = `${year}-${month}`;

      if (!monthlyData.has(key)) {
        monthlyData.set(key, {
          year,
          month,
          return: 0,
          trades: 0,
          winRate: 0,
        });
      }
    }

    // Calculate returns per month
    for (let i = 1; i < equityCurve.length; i++) {
      const prev = equityCurve[i - 1];
      const curr = equityCurve[i];
      if (!prev || !curr || prev.equity === 0) continue;

      const year = curr.timestamp.getFullYear();
      const month = curr.timestamp.getMonth() + 1;
      const key = `${year}-${month}`;

      const monthReturn = ((curr.equity - prev.equity) / prev.equity) * 100;
      const data = monthlyData.get(key);
      if (data) {
        data.return += monthReturn;
      }
    }

    // Add trade statistics
    for (const trade of trades) {
      if (!trade.exitTime) continue;

      const year = trade.exitTime.getFullYear();
      const month = trade.exitTime.getMonth() + 1;
      const key = `${year}-${month}`;

      const data = monthlyData.get(key);
      if (data) {
        data.trades++;
      }
    }

    // Calculate win rates
    for (const data of monthlyData.values()) {
      const monthTrades = trades.filter((t) => {
        if (!t.exitTime) return false;
        const year = t.exitTime.getFullYear();
        const month = t.exitTime.getMonth() + 1;
        return year === data.year && month === data.month;
      });

      const winningTrades = monthTrades.filter((t) => (t.pnl ?? 0) > 0);
      data.winRate =
        monthTrades.length > 0 ? (winningTrades.length / monthTrades.length) * 100 : 0;
    }

    return Array.from(monthlyData.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }
}
