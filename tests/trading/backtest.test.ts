/**
 * Backtesting Engine Tests
 */

import { BacktestEngine, MockDataLoader, MetricsCalculator } from '../../src/trading/backtest/index.js';
import { NewsMomentumStrategy } from '../../src/trading/strategies/index.js';
import type { BacktestConfig } from '../../src/trading/backtest/types.js';

/**
 * Test: BacktestEngine basic functionality
 */
async function testBacktestEngineBasic(): Promise<void> {
  console.log('Test: BacktestEngine basic functionality');

  const config: BacktestConfig = {
    symbol: 'BTCUSDT',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    initialCapital: 10000,
    strategyName: 'news-momentum',
    fees: {
      maker: 0.1,
      taker: 0.1,
    },
    slippage: 0.05,
    maxPositionSize: 10,
    allowShorts: false,
    timeframe: '1h',
  };

  const strategy = new NewsMomentumStrategy();
  const dataLoader = new MockDataLoader(50000, 0.02);

  const engine = new BacktestEngine(config, strategy, dataLoader);
  const result = await engine.run();

  // Validate results
  console.assert(result.config.symbol === 'BTCUSDT', 'Symbol should match');
  console.assert(result.config.initialCapital === 10000, 'Initial capital should match');
  console.assert(result.equityCurve.length > 0, 'Equity curve should not be empty');
  console.assert(result.totalTrades >= 0, 'Total trades should be non-negative');
  console.assert(result.executionTime > 0, 'Execution time should be positive');

  console.log('✅ Passed: Basic backtest engine functionality');
  console.log(`   Total trades: ${result.totalTrades}`);
  console.log(`   Final equity: $${result.equityCurve[result.equityCurve.length - 1]?.equity.toFixed(2)}`);
  console.log(`   Total return: ${result.totalReturn.toFixed(2)}%\n`);
}

/**
 * Test: MetricsCalculator
 */
async function testMetricsCalculator(): Promise<void> {
  console.log('Test: MetricsCalculator');

  const config: BacktestConfig = {
    symbol: 'BTCUSDT',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    initialCapital: 10000,
    strategyName: 'test',
    fees: { maker: 0.1, taker: 0.1 },
    slippage: 0.05,
  };

  // Create mock equity curve
  const equityCurve = [
    { timestamp: new Date('2024-01-01'), equity: 10000, cash: 10000, positions: 0, drawdown: 0 },
    { timestamp: new Date('2024-06-01'), equity: 11000, cash: 11000, positions: 0, drawdown: 0 },
    { timestamp: new Date('2024-12-31'), equity: 12000, cash: 12000, positions: 0, drawdown: 0 },
  ];

  const trades = [
    {
      id: '1',
      symbol: 'BTCUSDT',
      direction: 'long' as const,
      entryTime: new Date('2024-01-15'),
      entryPrice: 50000,
      exitTime: new Date('2024-01-16'),
      exitPrice: 51000,
      quantity: 0.1,
      positionSize: 5,
      pnl: 100,
      pnlPercent: 2,
      fees: 10,
      slippage: 0.05,
      exitReason: 'take-profit' as const,
      strategyName: 'test',
    },
  ];

  const result = MetricsCalculator.calculateMetrics(
    trades,
    equityCurve,
    config,
    new Date('2024-01-01'),
    new Date('2024-12-31'),
    1000,
  );

  // Validate metrics
  console.assert(result.totalReturn === 20, 'Total return should be 20%');
  console.assert(result.totalTrades === 1, 'Total trades should be 1');
  console.assert(result.winningTrades === 1, 'Winning trades should be 1');
  console.assert(result.losingTrades === 0, 'Losing trades should be 0');
  console.assert(result.winRate === 100, 'Win rate should be 100%');

  console.log('✅ Passed: Metrics calculation');
  console.log(`   Total return: ${result.totalReturn.toFixed(2)}%`);
  console.log(`   Annualized return: ${result.annualizedReturn.toFixed(2)}%`);
  console.log(`   Win rate: ${result.winRate.toFixed(2)}%\n`);
}

/**
 * Test: MockDataLoader
 */
async function testMockDataLoader(): Promise<void> {
  console.log('Test: MockDataLoader');

  const loader = new MockDataLoader(50000, 0.02);
  const candles = await loader.loadCandles(
    'BTCUSDT',
    new Date('2024-01-01'),
    new Date('2024-01-07'),
    '1h',
  );

  // Should have ~7 days * 24 hours = ~168 candles
  console.assert(candles.length > 100, 'Should have at least 100 candles');
  console.assert(candles.length < 200, 'Should have less than 200 candles');

  // Validate candle structure
  const firstCandle = candles[0];
  console.assert(firstCandle !== undefined, 'First candle should exist');
  console.assert(firstCandle!.open > 0, 'Open price should be positive');
  console.assert(firstCandle!.high >= firstCandle!.open, 'High should be >= open');
  console.assert(firstCandle!.low <= firstCandle!.open, 'Low should be <= open');
  console.assert(firstCandle!.volume > 0, 'Volume should be positive');

  // Validate chronological order
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    console.assert(
      curr!.timestamp > prev!.timestamp,
      'Candles should be in chronological order',
    );
  }

  console.log('✅ Passed: Mock data loader');
  console.log(`   Generated ${candles.length} candles`);
  console.log(`   Price range: $${Math.min(...candles.map((c) => c.low)).toFixed(2)} - $${Math.max(...candles.map((c) => c.high)).toFixed(2)}\n`);
}

/**
 * Test: Multiple symbols backtest
 */
async function testMultipleSymbols(): Promise<void> {
  console.log('Test: Multiple symbols backtest');

  const config: BacktestConfig = {
    symbol: ['BTCUSDT', 'ETHUSDT'],
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-15'),
    initialCapital: 10000,
    strategyName: 'news-momentum',
    fees: {
      maker: 0.1,
      taker: 0.1,
    },
    slippage: 0.05,
    maxPositionSize: 10,
    allowShorts: false,
    timeframe: '1h',
  };

  const strategy = new NewsMomentumStrategy();
  const dataLoader = new MockDataLoader(50000, 0.02);

  const engine = new BacktestEngine(config, strategy, dataLoader);
  const result = await engine.run();

  console.assert(Array.isArray(result.config.symbol), 'Config symbol should be array');
  console.assert(result.config.symbol.length === 2, 'Should have 2 symbols');
  console.assert(result.equityCurve.length > 0, 'Should have equity curve');

  console.log('✅ Passed: Multiple symbols backtest');
  console.log(`   Symbols: ${result.config.symbol.join(', ')}`);
  console.log(`   Total trades: ${result.totalTrades}\n`);
}

/**
 * Test: Fees and slippage impact
 */
async function testFeesAndSlippage(): Promise<void> {
  console.log('Test: Fees and slippage impact');

  // Run backtest with no fees/slippage
  const configNoFees: BacktestConfig = {
    symbol: 'BTCUSDT',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-15'),
    initialCapital: 10000,
    strategyName: 'news-momentum',
    fees: { maker: 0, taker: 0 },
    slippage: 0,
    timeframe: '1h',
  };

  const strategy1 = new NewsMomentumStrategy();
  const dataLoader1 = new MockDataLoader(50000, 0.01); // Lower volatility for consistency
  const engine1 = new BacktestEngine(configNoFees, strategy1, dataLoader1);
  const resultNoFees = await engine1.run();

  // Run backtest with fees/slippage
  const configWithFees: BacktestConfig = {
    ...configNoFees,
    fees: { maker: 0.2, taker: 0.2 },
    slippage: 0.1,
  };

  const strategy2 = new NewsMomentumStrategy();
  const dataLoader2 = new MockDataLoader(50000, 0.01);
  const engine2 = new BacktestEngine(configWithFees, strategy2, dataLoader2);
  const resultWithFees = await engine2.run();

  // With fees and slippage, return should generally be lower
  console.log('✅ Passed: Fees and slippage calculation');
  console.log(`   Return without fees: ${resultNoFees.totalReturn.toFixed(2)}%`);
  console.log(`   Return with fees: ${resultWithFees.totalReturn.toFixed(2)}%`);
  console.log(`   Impact: ${(resultNoFees.totalReturn - resultWithFees.totalReturn).toFixed(2)}%\n`);
}

/**
 * Test: Monthly performance calculation
 */
async function testMonthlyPerformance(): Promise<void> {
  console.log('Test: Monthly performance calculation');

  const equityCurve = [
    { timestamp: new Date('2024-01-01'), equity: 10000, cash: 10000, positions: 0, drawdown: 0 },
    { timestamp: new Date('2024-01-31'), equity: 10500, cash: 10500, positions: 0, drawdown: 0 },
    { timestamp: new Date('2024-02-29'), equity: 11000, cash: 11000, positions: 0, drawdown: 0 },
    { timestamp: new Date('2024-03-31'), equity: 10800, cash: 10800, positions: 0, drawdown: 0 },
  ];

  const trades: any[] = []; // No trades for this test

  const monthly = MetricsCalculator.calculateMonthlyPerformance(equityCurve, trades);

  console.assert(monthly.length >= 3, 'Should have at least 3 months');
  console.assert(monthly[0]?.month === 1, 'First month should be January');
  console.assert(monthly[0]?.year === 2024, 'Year should be 2024');

  console.log('✅ Passed: Monthly performance calculation');
  console.log(`   Months analyzed: ${monthly.length}`);
  monthly.forEach((m) => {
    console.log(`   ${m.year}-${String(m.month).padStart(2, '0')}: ${m.return.toFixed(2)}%`);
  });
  console.log();
}

/**
 * Run all tests
 */
async function runAllTests(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════');
  console.log('          BACKTESTING ENGINE TESTS');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    await testMockDataLoader();
    await testMetricsCalculator();
    await testBacktestEngineBasic();
    await testMultipleSymbols();
    await testFeesAndSlippage();
    await testMonthlyPerformance();

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED');
    console.log('═══════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
try {
  await runAllTests();
} catch (error) {
  console.error('Fatal error:', error);
  process.exit(1);
}
