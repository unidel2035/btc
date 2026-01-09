import type { BacktestResult, EquityPoint, Trade } from './types.js';
import { MetricsCalculator } from './MetricsCalculator.js';
import { writeFile } from 'fs/promises';

/**
 * Visualization utilities for backtest results
 */
export class Visualizer {
  /**
   * Print summary to console
   */
  static printSummary(result: BacktestResult): void {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('             BACKTEST RESULTS SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');

    // Configuration
    console.log('📋 Configuration:');
    const symbols = Array.isArray(result.config.symbol)
      ? result.config.symbol.join(', ')
      : result.config.symbol;
    console.log(`   Symbol(s): ${symbols}`);
    console.log(`   Strategy: ${result.config.strategyName}`);
    console.log(`   Period: ${result.config.startDate.toISOString().split('T')[0]} to ${result.config.endDate.toISOString().split('T')[0]}`);
    console.log(`   Initial Capital: $${result.config.initialCapital.toLocaleString()}`);
    console.log(`   Fees: ${result.config.fees.maker}% maker, ${result.config.fees.taker}% taker`);
    console.log(`   Slippage: ${result.config.slippage}%\n`);

    // Performance
    console.log('📈 Performance:');
    const finalEquity = result.equityCurve[result.equityCurve.length - 1]?.equity ?? 0;
    console.log(`   Final Equity: $${finalEquity.toLocaleString()}`);
    console.log(`   Total Return: ${this.formatPercent(result.totalReturn)}`);
    console.log(`   Annualized Return: ${this.formatPercent(result.annualizedReturn)}`);
    console.log(`   Max Drawdown: ${this.formatPercent(result.maxDrawdown)}`);
    console.log(`   Max DD Duration: ${result.maxDrawdownDuration.toFixed(1)} days`);
    console.log(`   Sharpe Ratio: ${result.sharpeRatio.toFixed(2)}`);
    console.log(`   Sortino Ratio: ${result.sortinoRatio.toFixed(2)}\n`);

    // Trading
    console.log('📊 Trading Statistics:');
    console.log(`   Total Trades: ${result.totalTrades}`);
    console.log(`   Winning Trades: ${result.winningTrades} (${this.formatPercent(result.winRate)})`);
    console.log(`   Losing Trades: ${result.losingTrades}`);
    console.log(`   Profit Factor: ${result.profitFactor === Infinity ? '∞' : result.profitFactor.toFixed(2)}`);
    console.log(`   Avg Trade Duration: ${result.avgTradeDuration.toFixed(1)} hours`);
    console.log(`   Avg Win: ${this.formatPercent(result.avgWin)}`);
    console.log(`   Avg Loss: ${this.formatPercent(result.avgLoss)}`);
    console.log(`   Largest Win: ${this.formatPercent(result.largestWin)}`);
    console.log(`   Largest Loss: ${this.formatPercent(result.largestLoss)}\n`);

    // Execution
    console.log('⏱️  Execution:');
    console.log(`   Execution Time: ${result.executionTime}ms`);
    console.log(`   Candles Processed: ${result.equityCurve.length}`);

    console.log('\n═══════════════════════════════════════════════════════\n');
  }

  /**
   * Print equity curve as ASCII chart
   */
  static printEquityCurve(equityCurve: EquityPoint[], height: number = 15, width: number = 60): void {
    if (equityCurve.length === 0) return;

    console.log('\n📈 Equity Curve:\n');

    const values = equityCurve.map((p) => p.equity);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    if (range === 0) {
      console.log('   (No change in equity)\n');
      return;
    }

    // Create grid
    const grid: string[][] = [];
    for (let i = 0; i < height; i++) {
      grid.push(new Array(width).fill(' '));
    }

    // Sample points to fit width
    const step = Math.max(1, Math.floor(equityCurve.length / width));
    for (let i = 0; i < width; i++) {
      const idx = Math.min(i * step, equityCurve.length - 1);
      const point = equityCurve[idx];
      if (!point) continue;

      const normalized = (point.equity - min) / range;
      const y = height - 1 - Math.floor(normalized * (height - 1));
      if (grid[y]) {
        grid[y]![i] = '█';
      }
    }

    // Print grid with labels
    for (let i = 0; i < height; i++) {
      const value = max - (i / (height - 1)) * range;
      const label = `$${value.toFixed(0)}`.padStart(10);
      console.log(`   ${label} │${grid[i]?.join('') ?? ''}`);
    }

    // X-axis
    console.log(`   ${''.padStart(10)} └${'─'.repeat(width)}`);

    const firstDate = equityCurve[0]?.timestamp.toISOString().split('T')[0] ?? '';
    const lastDate = equityCurve[equityCurve.length - 1]?.timestamp.toISOString().split('T')[0] ?? '';
    console.log(`   ${''.padStart(12)}${firstDate}${' '.repeat(width - firstDate.length - lastDate.length)}${lastDate}\n`);
  }

  /**
   * Print drawdown chart
   */
  static printDrawdownChart(equityCurve: EquityPoint[], height: number = 10, width: number = 60): void {
    if (equityCurve.length === 0) return;

    console.log('\n📉 Drawdown Chart:\n');

    const drawdowns = equityCurve.map((p) => p.drawdown);
    const maxDD = Math.min(...drawdowns);

    if (maxDD === 0) {
      console.log('   (No drawdown)\n');
      return;
    }

    // Create grid
    const grid: string[][] = [];
    for (let i = 0; i < height; i++) {
      grid.push(new Array(width).fill(' '));
    }

    // Sample points
    const step = Math.max(1, Math.floor(equityCurve.length / width));
    for (let i = 0; i < width; i++) {
      const idx = Math.min(i * step, equityCurve.length - 1);
      const point = equityCurve[idx];
      if (!point) continue;

      const normalized = point.drawdown / maxDD;
      const y = Math.floor(normalized * (height - 1));
      if (grid[y]) {
        grid[y]![i] = '█';
      }
    }

    // Print grid
    for (let i = 0; i < height; i++) {
      const value = (i / (height - 1)) * maxDD;
      const label = `${value.toFixed(1)}%`.padStart(8);
      console.log(`   ${label} │${grid[i]?.join('') ?? ''}`);
    }

    console.log(`   ${''.padStart(8)} └${'─'.repeat(width)}\n`);
  }

  /**
   * Print monthly returns heatmap
   */
  static printMonthlyReturns(result: BacktestResult): void {
    const monthly = MetricsCalculator.calculateMonthlyPerformance(
      result.equityCurve,
      result.trades,
    );

    if (monthly.length === 0) return;

    console.log('\n📅 Monthly Returns:\n');

    // Group by year
    const byYear = new Map<number, typeof monthly>();
    for (const m of monthly) {
      if (!byYear.has(m.year)) {
        byYear.set(m.year, []);
      }
      byYear.get(m.year)?.push(m);
    }

    // Print header
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    console.log(`   ${'Year'.padEnd(6)} ${months.join('  ')}`);
    console.log(`   ${'─'.repeat(6 + 3 * 12 + 11)}`);

    // Print each year
    for (const [year, yearData] of byYear) {
      const row = [`   ${year}`];

      for (let m = 1; m <= 12; m++) {
        const monthData = yearData.find((d) => d.month === m);
        if (monthData) {
          const ret = monthData.return;
          const color = ret > 0 ? '+' : ret < 0 ? '-' : ' ';
          row.push(` ${color}${Math.abs(ret).toFixed(0)}%`.padEnd(5));
        } else {
          row.push('   - '.padEnd(5));
        }
      }

      console.log(row.join(''));
    }

    console.log();
  }

  /**
   * Print trade distribution
   */
  static printTradeDistribution(trades: Trade[]): void {
    if (trades.length === 0) return;

    console.log('\n📊 Trade P&L Distribution:\n');

    const pnls = trades.map((t) => t.pnlPercent ?? 0).sort((a, b) => a - b);
    const min = pnls[0] ?? 0;
    const max = pnls[pnls.length - 1] ?? 0;
    const range = max - min;

    if (range === 0) {
      console.log('   (All trades same P&L)\n');
      return;
    }

    // Create histogram
    const buckets = 20;
    const histogram = new Array(buckets).fill(0);

    for (const pnl of pnls) {
      const bucketIdx = Math.min(Math.floor(((pnl - min) / range) * buckets), buckets - 1);
      histogram[bucketIdx]++;
    }

    const maxCount = Math.max(...histogram);
    const barWidth = 40;

    for (let i = 0; i < buckets; i++) {
      const count = histogram[i] ?? 0;
      const barLength = Math.floor((count / maxCount) * barWidth);
      const bar = '█'.repeat(barLength);
      const rangeStart = min + (i * range) / buckets;
      const rangeEnd = min + ((i + 1) * range) / buckets;
      console.log(`   ${rangeStart.toFixed(1)}% to ${rangeEnd.toFixed(1)}% │${bar} (${count})`);
    }

    console.log();
  }

  /**
   * Export results to JSON
   */
  static async exportToJSON(result: BacktestResult, filename: string): Promise<void> {
    const json = JSON.stringify(result, null, 2);
    await writeFile(filename, json, 'utf-8');
    console.log(`📄 Results exported to ${filename}`);
  }

  /**
   * Export results to CSV
   */
  static async exportToCSV(result: BacktestResult, filename: string): Promise<void> {
    const lines: string[] = [];

    // Header
    lines.push('Trade ID,Symbol,Direction,Entry Time,Entry Price,Exit Time,Exit Price,Quantity,Position Size %,P&L,P&L %,Fees,Exit Reason,Strategy');

    // Trades
    for (const trade of result.trades) {
      lines.push(
        [
          trade.id,
          trade.symbol,
          trade.direction,
          trade.entryTime.toISOString(),
          trade.entryPrice.toFixed(2),
          trade.exitTime?.toISOString() ?? '',
          trade.exitPrice?.toFixed(2) ?? '',
          trade.quantity.toFixed(8),
          trade.positionSize.toFixed(2),
          trade.pnl?.toFixed(2) ?? '',
          trade.pnlPercent?.toFixed(2) ?? '',
          trade.fees.toFixed(2),
          trade.exitReason ?? '',
          trade.strategyName,
        ].join(','),
      );
    }

    await writeFile(filename, lines.join('\n'), 'utf-8');
    console.log(`📄 Trades exported to ${filename}`);
  }

  /**
   * Format percentage with sign and color
   */
  private static formatPercent(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }
}
