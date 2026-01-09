/**
 * Paper Trading Statistics Tracker
 * Tracks and calculates performance metrics for paper trading
 */

import {
  PaperStats,
  TradingMode,
  PaperTrade,
  VirtualOrder,
  OrderStatus,
} from './types.js';
import { PaperAccount } from './PaperAccount.js';

export class StatsTracker {
  private mode: TradingMode;
  private startTime: Date;
  private totalFees: number;
  private totalSlippage: number;
  private closedTrades: PaperTrade[];
  private winningTrades: number;
  private losingTrades: number;
  private largestWin: number;
  private largestLoss: number;

  constructor(mode: TradingMode) {
    this.mode = mode;
    this.startTime = new Date();
    this.totalFees = 0;
    this.totalSlippage = 0;
    this.closedTrades = [];
    this.winningTrades = 0;
    this.losingTrades = 0;
    this.largestWin = 0;
    this.largestLoss = 0;
  }

  /**
   * Record a completed trade
   */
  public recordTrade(trade: PaperTrade, pnl: number): void {
    this.totalFees += trade.fees;
    this.totalSlippage += trade.slippage;

    if (trade.isClosing) {
      this.closedTrades.push(trade);

      if (pnl > 0) {
        this.winningTrades++;
        this.largestWin = Math.max(this.largestWin, pnl);
      } else if (pnl < 0) {
        this.losingTrades++;
        this.largestLoss = Math.min(this.largestLoss, pnl);
      }
    }
  }

  /**
   * Get current statistics
   */
  public getStats(account: PaperAccount, orders: VirtualOrder[]): PaperStats {
    const balance = account.getBalance();
    const initialBalance = account.getInitialBalance();
    const peakEquity = account.getPeakEquity();
    const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);

    // Calculate returns
    const totalReturn = ((balance.equity - initialBalance) / initialBalance) * 100;

    // Calculate drawdown
    const currentDrawdown = peakEquity > 0
      ? ((peakEquity - balance.equity) / peakEquity) * 100
      : 0;
    const maxDrawdown = this.calculateMaxDrawdown(account);

    // Order statistics
    const totalOrders = orders.length;
    const filledOrders = orders.filter(
      (o) => o.status === OrderStatus.FILLED,
    ).length;
    const cancelledOrders = orders.filter(
      (o) => o.status === OrderStatus.CANCELLED,
    ).length;
    const rejectedOrders = orders.filter(
      (o) => o.status === OrderStatus.REJECTED,
    ).length;

    // Trade statistics
    const totalTrades = this.closedTrades.length;
    const winRate = totalTrades > 0 ? (this.winningTrades / totalTrades) * 100 : 0;

    // Calculate profit factor
    const grossProfit = this.closedTrades
      .filter((t) => t.isClosing)
      .reduce((sum, t) => {
        const position = balance.positions.find((p) => p.orderId === t.orderId);
        if (!position) return sum;
        const pnl = t.quantity * (t.executedPrice - position.entryPrice) - t.fees - position.entryFees;
        return sum + (pnl > 0 ? pnl : 0);
      }, 0);

    const grossLoss = Math.abs(
      this.closedTrades
        .filter((t) => t.isClosing)
        .reduce((sum, t) => {
          const position = balance.positions.find((p) => p.orderId === t.orderId);
          if (!position) return sum;
          const pnl = t.quantity * (t.executedPrice - position.entryPrice) - t.fees - position.entryFees;
          return sum + (pnl < 0 ? pnl : 0);
        }, 0),
    );

    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;

    // Average win/loss
    const avgWin = this.winningTrades > 0 ? this.largestWin / this.winningTrades : 0;
    const avgLoss = this.losingTrades > 0 ? this.largestLoss / this.losingTrades : 0;

    return {
      mode: this.mode,
      startTime: this.startTime,
      uptime,

      initialBalance,
      currentEquity: balance.equity,
      totalReturn,
      realizedPnL: balance.realizedPnL,
      unrealizedPnL: balance.unrealizedPnL,

      totalOrders,
      filledOrders,
      cancelledOrders,
      rejectedOrders,

      openPositions: balance.positions.length,
      closedPositions: totalTrades,

      totalTrades,
      winningTrades: this.winningTrades,
      losingTrades: this.losingTrades,
      winRate,
      profitFactor,
      avgWin,
      avgLoss,
      largestWin: this.largestWin,
      largestLoss: this.largestLoss,

      maxDrawdown,
      currentDrawdown,
      peakEquity,

      totalFees: this.totalFees,
      totalSlippage: this.totalSlippage,

      updatedAt: new Date(),
    };
  }

  /**
   * Calculate maximum drawdown
   */
  private calculateMaxDrawdown(account: PaperAccount): number {
    const peakEquity = account.getPeakEquity();
    const currentEquity = account.getBalance().equity;

    if (peakEquity === 0) return 0;

    const drawdown = ((peakEquity - currentEquity) / peakEquity) * 100;
    return Math.max(0, drawdown);
  }

  /**
   * Reset statistics
   */
  public reset(): void {
    this.startTime = new Date();
    this.totalFees = 0;
    this.totalSlippage = 0;
    this.closedTrades = [];
    this.winningTrades = 0;
    this.losingTrades = 0;
    this.largestWin = 0;
    this.largestLoss = 0;
  }

  /**
   * Format statistics for display
   */
  public static formatStats(stats: PaperStats): string {
    const lines = [
      '═══════════════════════════════════════════════════════',
      `         PAPER TRADING STATISTICS (${stats.mode.toUpperCase()})`,
      '═══════════════════════════════════════════════════════',
      '',
      '📊 Balance & Performance:',
      `   Initial Balance: $${stats.initialBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `   Current Equity: $${stats.currentEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `   Total Return: ${stats.totalReturn >= 0 ? '+' : ''}${stats.totalReturn.toFixed(2)}%`,
      `   Realized P&L: ${stats.realizedPnL >= 0 ? '+' : ''}$${stats.realizedPnL.toFixed(2)}`,
      `   Unrealized P&L: ${stats.unrealizedPnL >= 0 ? '+' : ''}$${stats.unrealizedPnL.toFixed(2)}`,
      '',
      '📈 Trading Activity:',
      `   Total Orders: ${stats.totalOrders}`,
      `   Filled: ${stats.filledOrders} | Cancelled: ${stats.cancelledOrders} | Rejected: ${stats.rejectedOrders}`,
      `   Open Positions: ${stats.openPositions}`,
      `   Closed Positions: ${stats.closedPositions}`,
      '',
      '🎯 Performance Metrics:',
      `   Total Trades: ${stats.totalTrades}`,
      `   Win Rate: ${stats.winRate.toFixed(2)}% (${stats.winningTrades}W / ${stats.losingTrades}L)`,
      `   Profit Factor: ${stats.profitFactor.toFixed(2)}`,
      `   Avg Win: $${stats.avgWin.toFixed(2)}`,
      `   Avg Loss: $${stats.avgLoss.toFixed(2)}`,
      `   Largest Win: $${stats.largestWin.toFixed(2)}`,
      `   Largest Loss: $${stats.largestLoss.toFixed(2)}`,
      '',
      '⚠️  Risk Metrics:',
      `   Max Drawdown: ${stats.maxDrawdown.toFixed(2)}%`,
      `   Current Drawdown: ${stats.currentDrawdown.toFixed(2)}%`,
      `   Peak Equity: $${stats.peakEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      '',
      '💰 Costs:',
      `   Total Fees: $${stats.totalFees.toFixed(2)}`,
      `   Total Slippage: $${stats.totalSlippage.toFixed(2)}`,
      '',
      '⏱️  Session Info:',
      `   Start Time: ${stats.startTime.toLocaleString()}`,
      `   Uptime: ${this.formatUptime(stats.uptime)}`,
      `   Last Updated: ${stats.updatedAt.toLocaleString()}`,
      '═══════════════════════════════════════════════════════',
    ];

    return lines.join('\n');
  }

  /**
   * Format uptime duration
   */
  private static formatUptime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}
