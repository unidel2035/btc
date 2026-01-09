/**
 * Backtesting Example
 * Demonstrates how to use the backtesting engine
 */

import {
  BacktestEngine,
  MockDataLoader,
  Visualizer,
  type BacktestConfig,
} from '../src/trading/backtest/index.js';
import { NewsMomentumStrategy, SentimentSwingStrategy } from '../src/trading/strategies/index.js';

console.log('═══════════════════════════════════════════════════════');
console.log('          BACKTESTING ENGINE EXAMPLES');
console.log('═══════════════════════════════════════════════════════\n');

// ========================================
// Example 1: Basic Backtest with News Momentum Strategy
// ========================================
console.log('📈 Example 1: News Momentum Strategy Backtest\n');

const config1: BacktestConfig = {
  symbol: 'BTCUSDT',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-03-31'), // 3 months
  initialCapital: 10000,
  strategyName: 'news-momentum',
  fees: {
    maker: 0.1, // 0.1%
    taker: 0.1, // 0.1%
  },
  slippage: 0.05, // 0.05%
  maxPositionSize: 10, // 10% max per trade
  allowShorts: false,
  timeframe: '1h',
};

const strategy1 = new NewsMomentumStrategy({
  impactThreshold: 0.7,
  reactionTimeSeconds: 60,
  exitTimeSeconds: 3600,
});

const dataLoader1 = new MockDataLoader(50000, 0.02);
const engine1 = new BacktestEngine(config1, strategy1, dataLoader1);

console.log('Running backtest...\n');
const result1 = await engine1.run();

Visualizer.printSummary(result1);
Visualizer.printEquityCurve(result1.equityCurve, 10, 50);

// ========================================
// Example 2: Sentiment Swing Strategy
// ========================================
console.log('\n\n📊 Example 2: Sentiment Swing Strategy Backtest\n');

const config2: BacktestConfig = {
  symbol: 'ETHUSDT',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-06-30'), // 6 months
  initialCapital: 20000,
  strategyName: 'sentiment-swing',
  fees: {
    maker: 0.08,
    taker: 0.1,
  },
  slippage: 0.03,
  maxPositionSize: 15,
  allowShorts: false,
  timeframe: '4h',
};

const strategy2 = new SentimentSwingStrategy({
  aggregationPeriodHours: 4,
  trendThreshold: 0.6,
  holdingPeriodHours: 24,
});

const dataLoader2 = new MockDataLoader(3000, 0.025); // ETH price ~$3000
const engine2 = new BacktestEngine(config2, strategy2, dataLoader2);

console.log('Running backtest...\n');
const result2 = await engine2.run();

Visualizer.printSummary(result2);
Visualizer.printDrawdownChart(result2.equityCurve, 8, 50);

// ========================================
// Example 3: Multiple Symbols
// ========================================
console.log('\n\n🌐 Example 3: Multi-Symbol Portfolio Backtest\n');

const config3: BacktestConfig = {
  symbol: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'), // Full year
  initialCapital: 50000,
  strategyName: 'news-momentum',
  fees: {
    maker: 0.1,
    taker: 0.1,
  },
  slippage: 0.05,
  maxPositionSize: 5, // Smaller position size for diversification
  allowShorts: false,
  timeframe: '1h',
};

const strategy3 = new NewsMomentumStrategy();
const dataLoader3 = new MockDataLoader(50000, 0.02);
const engine3 = new BacktestEngine(config3, strategy3, dataLoader3);

console.log('Running multi-symbol backtest...\n');
const result3 = await engine3.run();

Visualizer.printSummary(result3);
Visualizer.printMonthlyReturns(result3);

// ========================================
// Example 4: Comparing Different Fee Structures
// ========================================
console.log('\n\n💰 Example 4: Impact of Fees Comparison\n');

console.log('Running backtest with LOW fees (0.05%)...\n');
const configLowFees: BacktestConfig = {
  symbol: 'BTCUSDT',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-03-31'),
  initialCapital: 10000,
  strategyName: 'news-momentum',
  fees: { maker: 0.05, taker: 0.05 },
  slippage: 0.02,
  timeframe: '1h',
};

const strategyLow = new NewsMomentumStrategy();
const dataLoaderLow = new MockDataLoader(50000, 0.015);
const engineLow = new BacktestEngine(configLowFees, strategyLow, dataLoaderLow);
const resultLow = await engineLow.run();

console.log('Running backtest with HIGH fees (0.2%)...\n');
const configHighFees: BacktestConfig = {
  ...configLowFees,
  fees: { maker: 0.2, taker: 0.2 },
  slippage: 0.1,
};

const strategyHigh = new NewsMomentumStrategy();
const dataLoaderHigh = new MockDataLoader(50000, 0.015);
const engineHigh = new BacktestEngine(configHighFees, strategyHigh, dataLoaderHigh);
const resultHigh = await engineHigh.run();

console.log('\n📊 Fee Impact Comparison:\n');
console.log(`   Low Fees (0.05%):  Return = ${resultLow.totalReturn.toFixed(2)}%, Sharpe = ${resultLow.sharpeRatio.toFixed(2)}`);
console.log(`   High Fees (0.2%):  Return = ${resultHigh.totalReturn.toFixed(2)}%, Sharpe = ${resultHigh.sharpeRatio.toFixed(2)}`);
console.log(`   Impact:            ${(resultLow.totalReturn - resultHigh.totalReturn).toFixed(2)}% difference\n`);

// ========================================
// Example 5: Strategy Parameter Optimization
// ========================================
console.log('\n\n🎯 Example 5: Strategy Parameter Testing\n');

const testParams = [
  { impactThreshold: 0.5, name: 'Low Threshold (0.5)' },
  { impactThreshold: 0.7, name: 'Medium Threshold (0.7)' },
  { impactThreshold: 0.9, name: 'High Threshold (0.9)' },
];

console.log('Testing different impact threshold values...\n');

for (const param of testParams) {
  const configTest: BacktestConfig = {
    symbol: 'BTCUSDT',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-02-29'),
    initialCapital: 10000,
    strategyName: `news-momentum-${param.impactThreshold}`,
    fees: { maker: 0.1, taker: 0.1 },
    slippage: 0.05,
    timeframe: '1h',
  };

  const strategyTest = new NewsMomentumStrategy({
    impactThreshold: param.impactThreshold,
  });

  const dataLoaderTest = new MockDataLoader(50000, 0.02);
  const engineTest = new BacktestEngine(configTest, strategyTest, dataLoaderTest);

  console.log(`Testing ${param.name}...`);
  const resultTest = await engineTest.run();

  console.log(`   Trades: ${resultTest.totalTrades}, Return: ${resultTest.totalReturn.toFixed(2)}%, Sharpe: ${resultTest.sharpeRatio.toFixed(2)}\n`);
}

console.log('═══════════════════════════════════════════════════════');
console.log('          EXAMPLES COMPLETED');
console.log('═══════════════════════════════════════════════════════\n');

console.log('💡 Tips:');
console.log('   - Use CSV data loader for real historical data');
console.log('   - Adjust strategy parameters for different market conditions');
console.log('   - Monitor Sharpe ratio for risk-adjusted performance');
console.log('   - Consider transaction costs in your strategy design');
console.log('   - Test on multiple time periods to avoid overfitting\n');
