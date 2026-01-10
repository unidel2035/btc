/**
 * Portfolio Analytics Example
 * Demonstrates how to use the Portfolio Analytics module
 */

/* eslint-disable no-console */

import { PortfolioAnalytics } from '../src/analytics/PortfolioAnalytics.js';
import type { AnalyticsTrade, EquityPoint } from '../src/analytics/types.js';

// Example 1: Generate mock trading data
function generateMockTrades(count: number): AnalyticsTrade[] {
  const trades: AnalyticsTrade[] = [];
  const strategies = ['Price Channel', 'News Momentum', 'Sentiment Swing'];
  const assets = ['BTC/USDT', 'ETH/USDT', 'RNDR/USDT', 'TAO/USDT'];

  const startDate = new Date('2024-01-01');

  for (let i = 0; i < count; i++) {
    const strategy = strategies[Math.floor(Math.random() * strategies.length)]!;
    const asset = assets[Math.floor(Math.random() * assets.length)]!;

    const entryDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const exitDate = new Date(entryDate.getTime() + (12 + Math.random() * 48) * 60 * 60 * 1000);

    const entryPrice = 30000 + Math.random() * 70000;
    const priceChange = (Math.random() - 0.4) * 0.1; // Slightly biased positive
    const exitPrice = entryPrice * (1 + priceChange);

    const size = 5000 + Math.random() * 10000;
    const pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
    const fees = size * 0.001;
    const pnl = (size * pnlPercent / 100) - fees;

    trades.push({
      id: `trade-${i + 1}`,
      strategy,
      asset,
      entryDate,
      exitDate,
      duration: (exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60),
      entryPrice,
      exitPrice,
      size,
      pnl,
      pnlPercent,
      fees,
      slippage: size * 0.0002,
      direction: 'long',
      exitReason: pnl > 0 ? 'take-profit' : 'stop-loss',
    });
  }

  return trades;
}

// Example 2: Generate equity curve from trades
function generateEquityCurve(trades: AnalyticsTrade[], initialCapital: number): EquityPoint[] {
  const curve: EquityPoint[] = [];
  let equity = initialCapital;
  let peakEquity = initialCapital;

  // Initial point
  curve.push({
    timestamp: new Date('2024-01-01'),
    equity: initialCapital,
    cash: initialCapital,
    positions: 0,
    drawdown: 0,
  });

  // Add point for each trade
  for (const trade of trades) {
    equity += trade.pnl;

    if (equity > peakEquity) {
      peakEquity = equity;
    }

    const drawdown = ((peakEquity - equity) / peakEquity) * 100;

    curve.push({
      timestamp: trade.exitDate,
      equity,
      cash: equity,
      positions: 0,
      drawdown: -drawdown,
    });
  }

  return curve;
}

// Example 3: Calculate and display analytics
async function runAnalyticsExample(): Promise<void> {
  console.log('📊 Portfolio Analytics Example\n');

  // Step 1: Create analytics instance
  const analytics = new PortfolioAnalytics({
    riskFreeRate: 0.03, // 3% risk-free rate
    tradingDaysPerYear: 365, // Crypto trades 24/7
  });

  // Step 2: Generate mock data
  console.log('Generating mock trading data...');
  const trades = generateMockTrades(100);
  const equityCurve = generateEquityCurve(trades, 10000);
  console.log(`✅ Generated ${trades.length} trades\n`);

  // Step 3: Calculate performance metrics
  console.log('=== Performance Metrics ===');
  const performance = analytics.calculatePerformanceMetrics(trades, equityCurve);

  console.log(`Total Return: ${performance.totalReturn.toFixed(2)}%`);
  console.log(`Annualized Return: ${performance.annualizedReturn.toFixed(2)}%`);
  console.log(`Sharpe Ratio: ${performance.sharpeRatio.toFixed(2)}`);
  console.log(`Sortino Ratio: ${performance.sortinoRatio.toFixed(2)}`);
  console.log(`Calmar Ratio: ${performance.calmarRatio.toFixed(2)}`);
  console.log(`Max Drawdown: ${performance.maxDrawdown.toFixed(2)}%`);
  console.log(`VaR (95%): ${performance.valueAtRisk95.toFixed(2)}%`);
  console.log(`CVaR (95%): ${performance.conditionalVaR95.toFixed(2)}%\n`);

  // Step 4: Calculate trade statistics
  console.log('=== Trade Statistics ===');
  const tradeStats = analytics.calculateTradeStatistics(trades);

  console.log(`Total Trades: ${tradeStats.totalTrades}`);
  console.log(`Win Rate: ${tradeStats.winRate.toFixed(2)}%`);
  console.log(`Profit Factor: ${tradeStats.profitFactor.toFixed(2)}`);
  console.log(`Avg Win: ${tradeStats.avgWin.toFixed(2)}%`);
  console.log(`Avg Loss: ${tradeStats.avgLoss.toFixed(2)}%`);
  console.log(`Largest Win: ${tradeStats.largestWin.toFixed(2)}%`);
  console.log(`Largest Loss: ${tradeStats.largestLoss.toFixed(2)}%`);
  console.log(`Avg Trade Duration: ${tradeStats.avgTradeDuration.toFixed(1)} hours`);
  console.log(`Consecutive Wins (max): ${tradeStats.consecutiveWinsMax}`);
  console.log(`Consecutive Losses (max): ${tradeStats.consecutiveLossesMax}\n`);

  // Step 5: Strategy performance breakdown
  console.log('=== Strategy Performance ===');
  const strategies = analytics.getStrategyPerformance(trades);

  strategies.forEach((strategy, index) => {
    console.log(`\n${index + 1}. ${strategy.strategy}`);
    console.log(`   Trades: ${strategy.trades}`);
    console.log(`   Win Rate: ${strategy.winRate.toFixed(2)}%`);
    console.log(`   PnL: $${strategy.pnl.toFixed(2)} (${strategy.pnlPercent.toFixed(2)}%)`);
    console.log(`   Sharpe: ${strategy.sharpeRatio.toFixed(2)}`);
    console.log(`   Max DD: ${strategy.maxDrawdown.toFixed(2)}%`);
  });

  console.log('\n=== Asset Performance ===');
  const assets = analytics.getAssetPerformance(trades);

  assets.forEach((asset, index) => {
    console.log(`\n${index + 1}. ${asset.asset}`);
    console.log(`   Trades: ${asset.trades}`);
    console.log(`   Win Rate: ${asset.winRate.toFixed(2)}%`);
    console.log(`   PnL: $${asset.pnl.toFixed(2)} (${asset.pnlPercent.toFixed(2)}%)`);
    console.log(`   Avg Hold: ${asset.avgHoldTime.toFixed(1)} hours`);
    console.log(`   Total Volume: $${asset.totalVolume.toFixed(2)}`);
  });

  // Step 6: Drawdown analysis
  console.log('\n\n=== Drawdown Analysis ===');
  const drawdown = analytics.calculateDrawdown(equityCurve);

  console.log(`Max Drawdown: ${drawdown.maxDrawdown.toFixed(2)}% ($${drawdown.maxDrawdownAbsolute.toFixed(2)})`);
  console.log(`Current Drawdown: ${drawdown.currentDrawdown.toFixed(2)}%`);
  console.log(`Avg Drawdown: ${drawdown.avgDrawdown.toFixed(2)}%`);
  console.log(`Drawdown Duration: ${drawdown.drawdownDuration.toFixed(0)} days`);
  console.log(`Days since ATH: ${drawdown.daysSinceATH}`);
  console.log(`Drawdown Periods: ${drawdown.drawdownPeriods.length}`);

  // Step 7: Correlation matrix
  console.log('\n=== Asset Correlation Matrix ===');
  const correlation = analytics.calculateCorrelationMatrix(trades);

  console.log('\nAssets:', correlation.assets.join(', '));
  console.log('\nCorrelation Matrix:');
  correlation.matrix.forEach((row, i) => {
    const rowStr = row.map(val => val.toFixed(2).padStart(6)).join(' ');
    console.log(`${correlation.assets[i]!.padEnd(10)} ${rowStr}`);
  });

  // Step 8: Risk exposure
  console.log('\n\n=== Risk Exposure ===');
  const currentPositions = [
    { asset: 'BTC/USDT', size: 3000 },
    { asset: 'ETH/USDT', size: 2000 },
    { asset: 'RNDR/USDT', size: 1000 },
  ];

  const totalEquity = equityCurve[equityCurve.length - 1]?.equity ?? 10000;
  const riskExposure = analytics.calculateRiskExposure(currentPositions, totalEquity, trades);

  console.log(`Current Exposure: ${riskExposure.currentExposure.toFixed(2)}%`);
  console.log(`Max Exposure: ${riskExposure.maxExposure.toFixed(2)}%`);
  console.log(`Avg Exposure: ${riskExposure.avgExposure.toFixed(2)}%`);
  console.log(`Concentration Risk (top 3): ${riskExposure.concentrationRisk.toFixed(2)}%`);
  console.log('\nTop Positions:');
  riskExposure.topPositions.forEach((pos, index) => {
    console.log(`  ${index + 1}. ${pos.asset}: ${pos.exposure.toFixed(2)}%`);
  });

  // Step 9: Generate comprehensive report
  console.log('\n\n=== Generating Comprehensive Report ===');
  const report = await analytics.generateReport(
    trades,
    equityCurve,
    {
      start: new Date('2024-01-01'),
      end: new Date('2024-12-31'),
      type: 'yearly',
    },
    currentPositions,
  );

  console.log('\nReport Summary:');
  console.log(`  Period: ${report.period.start.toISOString().split('T')[0]} to ${report.period.end.toISOString().split('T')[0]}`);
  console.log(`  Total Trades: ${report.summary.totalTrades}`);
  console.log(`  Win Rate: ${report.summary.winRate.toFixed(2)}%`);
  console.log(`  Total Return: ${report.summary.totalReturn.toFixed(2)}%`);
  console.log(`  Sharpe Ratio: ${report.summary.sharpeRatio.toFixed(2)}`);
  console.log(`  Max Drawdown: ${report.summary.maxDrawdown.toFixed(2)}%`);

  console.log('\n✅ Analytics example completed!');
}

// Run the example
runAnalyticsExample().catch(console.error);
