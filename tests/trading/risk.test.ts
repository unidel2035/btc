/**
 * Unit tests for Risk Management module
 *
 * Запуск: tsx tests/trading/risk.test.ts
 */

import { RiskManager, PositionSizingMethod, PositionSide, StopLossType } from '../../src/trading/risk/index.js';
import type { RiskConfig } from '../../src/trading/risk/index.js';

/**
 * Простой тестовый фреймворк
 */
class TestRunner {
  private passed = 0;
  private failed = 0;
  private testName = '';

  test(name: string, fn: () => void | Promise<void>): void {
    this.testName = name;
    try {
      const result = fn();
      if (result instanceof Promise) {
        result
          .then(() => {
            this.passed++;
            console.info(`✅ ${name}`);
          })
          .catch((error) => {
            this.failed++;
            console.error(`❌ ${name}`);
            console.error(`   ${error.message}`);
          });
      } else {
        this.passed++;
        console.info(`✅ ${name}`);
      }
    } catch (error) {
      this.failed++;
      console.error(`❌ ${name}`);
      console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  assertEqual<T>(actual: T, expected: T, message?: string): void {
    if (actual !== expected) {
      throw new Error(
        message || `Expected ${expected}, but got ${actual}`,
      );
    }
  }

  assertNotEqual<T>(actual: T, expected: T, message?: string): void {
    if (actual === expected) {
      throw new Error(
        message || `Expected value to not equal ${expected}`,
      );
    }
  }

  assertTrue(value: boolean, message?: string): void {
    if (!value) {
      throw new Error(message || 'Expected true, but got false');
    }
  }

  assertFalse(value: boolean, message?: string): void {
    if (value) {
      throw new Error(message || 'Expected false, but got true');
    }
  }

  assertGreaterThan(actual: number, expected: number, message?: string): void {
    if (actual <= expected) {
      throw new Error(
        message || `Expected ${actual} to be greater than ${expected}`,
      );
    }
  }

  assertLessThan(actual: number, expected: number, message?: string): void {
    if (actual >= expected) {
      throw new Error(
        message || `Expected ${actual} to be less than ${expected}`,
      );
    }
  }

  summary(): void {
    console.info(`\n📊 Test Summary:`);
    console.info(`   Passed: ${this.passed}`);
    console.info(`   Failed: ${this.failed}`);
    console.info(`   Total: ${this.passed + this.failed}`);

    if (this.failed > 0) {
      console.error('\n❌ Some tests failed!');
      process.exit(1);
    } else {
      console.info('\n✅ All tests passed!');
    }
  }
}

const test = new TestRunner();

/**
 * Default risk configuration for tests
 */
const defaultConfig: RiskConfig = {
  maxPositionSize: 10, // 10% of balance
  maxPositions: 5,
  maxDailyLoss: 5, // 5%
  maxTotalDrawdown: 20, // 20%
  defaultStopLoss: 2, // 2%
  defaultTakeProfit: 5, // 5%
  trailingStop: true,
  trailingStopActivation: 3, // 3%
  trailingStopDistance: 1.5, // 1.5%
  maxAssetExposure: 15, // 15%
  maxCorrelatedPositions: 2,
  correlationThreshold: 0.7,
};

console.info('🧪 Running Risk Management Tests\n');

// Test 1: RiskManager Initialization
test.test('RiskManager Initialization', () => {
  const initialBalance = 10000;
  const riskManager = new RiskManager(defaultConfig, initialBalance);

  test.assertEqual(riskManager.getBalance(), initialBalance, 'Initial balance should match');
  test.assertEqual(riskManager.getOpenPositions().length, 0, 'Should have no open positions');

  const config = riskManager.getConfig();
  test.assertEqual(config.maxPositionSize, defaultConfig.maxPositionSize, 'Config should match');
});

// Test 2: Position Sizing - Fixed
test.test('Position Sizing - Fixed Method', async () => {
  const riskManager = new RiskManager(defaultConfig, 10000);

  const result = await riskManager.openPosition({
    symbol: 'BTC/USDT',
    side: PositionSide.LONG,
    sizingParams: {
      method: PositionSizingMethod.FIXED,
      balance: 10000,
      riskPerTrade: 1, // 1% risk
      stopLossPercent: 10, // 10% SL -> size = 1000 (10% of balance)
      entryPrice: 50000,
    },
    stopLossParams: {
      type: StopLossType.FIXED,
      entryPrice: 50000,
      percent: 10,
    },
  });

  test.assertTrue(result.success, 'Position should open successfully');
  test.assertTrue(result.position !== undefined, 'Position should be created');

  if (result.position) {
    test.assertEqual(result.position.symbol, 'BTC/USDT', 'Symbol should match');
    test.assertEqual(result.position.side, PositionSide.LONG, 'Side should be LONG');
    test.assertGreaterThan(result.position.quantity, 0, 'Quantity should be positive');
  }
});

// Test 3: Position Sizing - Percentage
test.test('Position Sizing - Percentage Method', async () => {
  const riskManager = new RiskManager(defaultConfig, 10000);

  const result = await riskManager.openPosition({
    symbol: 'ETH/USDT',
    side: PositionSide.LONG,
    sizingParams: {
      method: PositionSizingMethod.PERCENTAGE,
      balance: 10000,
      riskPerTrade: 0.5, // 0.5% risk
      stopLossPercent: 5, // 5% SL -> size = 1000 (10% of balance)
      entryPrice: 3000,
    },
    stopLossParams: {
      type: StopLossType.FIXED,
      entryPrice: 3000,
      percent: 5,
    },
  });

  test.assertTrue(result.success, 'Position should open successfully');
  test.assertTrue(result.position !== undefined, 'Position should be created');
});

// Test 4: Position Sizing - Kelly Criterion
test.test('Position Sizing - Kelly Criterion', async () => {
  const riskManager = new RiskManager(defaultConfig, 10000);

  const result = await riskManager.openPosition({
    symbol: 'BTC/USDT',
    side: PositionSide.LONG,
    sizingParams: {
      method: PositionSizingMethod.KELLY,
      balance: 10000,
      riskPerTrade: 1, // 1% risk
      stopLossPercent: 10, // 10% SL
      entryPrice: 50000,
      winRate: 0.52, // 52% win rate (lower to reduce Kelly %)
      avgWinLoss: 1.2, // 1.2:1 reward/risk (lower to reduce Kelly %)
    },
    stopLossParams: {
      type: StopLossType.FIXED,
      entryPrice: 50000,
      percent: 10,
    },
  });

  test.assertTrue(result.success, 'Kelly position should open successfully');
});

// Test 5: Max Positions Limit
test.test('Max Positions Limit', async () => {
  const riskManager = new RiskManager(defaultConfig, 10000);

  // Open max number of positions
  for (let i = 0; i < defaultConfig.maxPositions; i++) {
    const result = await riskManager.openPosition({
      symbol: `COIN${i}/USDT`,
      side: PositionSide.LONG,
      sizingParams: {
        method: PositionSizingMethod.PERCENTAGE,
        balance: 10000,
        riskPerTrade: 0.2, // 0.2% risk
        stopLossPercent: 2, // 2% SL -> size = 1000 (10% of balance)
        entryPrice: 100,
      },
      stopLossParams: {
        type: StopLossType.FIXED,
        entryPrice: 100,
        percent: 2,
      },
    });
    test.assertTrue(result.success, `Position ${i + 1} should open`);
  }

  // Try to open one more - should fail
  const result = await riskManager.openPosition({
    symbol: 'EXTRA/USDT',
    side: PositionSide.LONG,
    sizingParams: {
      method: PositionSizingMethod.PERCENTAGE,
      balance: 10000,
      riskPerTrade: 0.2, // 0.2% risk (same as above positions)
      stopLossPercent: 2, // 2% SL -> size = 1000 (10% of balance)
      entryPrice: 100,
    },
    stopLossParams: {
      type: StopLossType.FIXED,
      entryPrice: 100,
      percent: 2,
    },
  });

  test.assertFalse(result.success, 'Should reject position when max positions reached');
  test.assertTrue(result.error?.includes('Maximum number of positions'), 'Error message should mention max positions');
});

// Test 6: Stop Loss Calculation - Fixed
test.test('Stop Loss - Fixed Type', async () => {
  const riskManager = new RiskManager(defaultConfig, 10000);

  const result = await riskManager.openPosition({
    symbol: 'BTC/USDT',
    side: PositionSide.LONG,
    sizingParams: {
      method: PositionSizingMethod.PERCENTAGE,
      balance: 10000,
      riskPerTrade: 2,
      stopLossPercent: 2,
      entryPrice: 50000,
    },
    stopLossParams: {
      type: StopLossType.FIXED,
      entryPrice: 50000,
      percent: 2,
    },
  });

  if (result.position) {
    const expectedSL = 50000 * (1 - 0.02); // 2% below entry
    test.assertEqual(result.position.stopLoss, expectedSL, 'Stop loss should be 2% below entry');
  }
});

// Test 7: Stop Loss Calculation - ATR-based
test.test('Stop Loss - ATR-based Type', async () => {
  const riskManager = new RiskManager(defaultConfig, 10000);

  const entryPrice = 50000;
  const atr = 1000;
  const atrMultiplier = 2;

  const result = await riskManager.openPosition({
    symbol: 'BTC/USDT',
    side: PositionSide.LONG,
    sizingParams: {
      method: PositionSizingMethod.PERCENTAGE,
      balance: 10000,
      riskPerTrade: 2,
      stopLossPercent: 4, // ATR-based will override this
      entryPrice,
    },
    stopLossParams: {
      type: StopLossType.ATR_BASED,
      entryPrice,
      atr,
      atrMultiplier,
    },
  });

  if (result.position) {
    const expectedSL = entryPrice - atr * atrMultiplier;
    test.assertEqual(result.position.stopLoss, expectedSL, 'Stop loss should be based on ATR');
  }
});

// Test 8: Take Profit - Multiple Levels
test.test('Take Profit - Multiple Levels', async () => {
  const riskManager = new RiskManager(defaultConfig, 10000);

  const entryPrice = 50000;

  const result = await riskManager.openPosition({
    symbol: 'BTC/USDT',
    side: PositionSide.LONG,
    sizingParams: {
      method: PositionSizingMethod.PERCENTAGE,
      balance: 10000,
      riskPerTrade: 2,
      stopLossPercent: 2,
      entryPrice,
    },
    stopLossParams: {
      type: StopLossType.FIXED,
      entryPrice,
      percent: 2,
    },
    takeProfitParams: {
      entryPrice,
      levels: [
        { percent: 3, closePercent: 50 }, // Close 50% at +3%
        { percent: 5, closePercent: 30 }, // Close 30% at +5%
        { percent: 10, closePercent: 20 }, // Close 20% at +10%
      ],
    },
  });

  if (result.position) {
    test.assertEqual(result.position.takeProfit.length, 3, 'Should have 3 TP levels');
    test.assertEqual(result.position.takeProfit[0], entryPrice * 1.03, 'TP1 should be +3%');
    test.assertEqual(result.position.takeProfit[1], entryPrice * 1.05, 'TP2 should be +5%');
    test.assertEqual(result.position.takeProfit[2], entryPrice * 1.10, 'TP3 should be +10%');
  }
});

// Test 9: Position Update - Price Movement
test.test('Position Update - Price Movement', async () => {
  const riskManager = new RiskManager(defaultConfig, 10000);

  const openResult = await riskManager.openPosition({
    symbol: 'BTC/USDT',
    side: PositionSide.LONG,
    sizingParams: {
      method: PositionSizingMethod.PERCENTAGE,
      balance: 10000,
      riskPerTrade: 1, // 1% risk
      stopLossPercent: 10, // 10% SL -> size = 1000 (10% of balance)
      entryPrice: 50000,
    },
    stopLossParams: {
      type: StopLossType.FIXED,
      entryPrice: 50000,
      percent: 10,
    },
  });

  if (openResult.position) {
    // Update with positive price movement
    const updateResult = await riskManager.updatePosition(openResult.position.id, {
      currentPrice: 51000,
    });

    test.assertTrue(updateResult.position !== undefined, 'Position should be updated');
    if (updateResult.position) {
      test.assertGreaterThan(updateResult.position.unrealizedPnL, 0, 'PnL should be positive');
    }
  }
});

// Test 10: Close Position
test.test('Close Position', async () => {
  const riskManager = new RiskManager(defaultConfig, 10000);

  const openResult = await riskManager.openPosition({
    symbol: 'BTC/USDT',
    side: PositionSide.LONG,
    sizingParams: {
      method: PositionSizingMethod.PERCENTAGE,
      balance: 10000,
      riskPerTrade: 1, // 1% risk
      stopLossPercent: 10, // 10% SL -> size = 1000 (10% of balance)
      entryPrice: 50000,
    },
    stopLossParams: {
      type: StopLossType.FIXED,
      entryPrice: 50000,
      percent: 10,
    },
  });

  if (openResult.position) {
    const closeResult = await riskManager.closePosition(openResult.position.id, 51000);

    test.assertTrue(closeResult.success, 'Position should close successfully');
    test.assertTrue(closeResult.pnl !== undefined, 'PnL should be calculated');
    if (closeResult.pnl) {
      test.assertGreaterThan(closeResult.pnl, 0, 'PnL should be positive');
    }
  }
});

// Test 11: Risk Statistics
test.test('Risk Statistics', async () => {
  const riskManager = new RiskManager(defaultConfig, 10000);

  // Open a position
  await riskManager.openPosition({
    symbol: 'BTC/USDT',
    side: PositionSide.LONG,
    sizingParams: {
      method: PositionSizingMethod.PERCENTAGE,
      balance: 10000,
      riskPerTrade: 1, // 1% risk
      stopLossPercent: 10, // 10% SL -> size = 1000 (10% of balance)
      entryPrice: 50000,
    },
    stopLossParams: {
      type: StopLossType.FIXED,
      entryPrice: 50000,
      percent: 10,
    },
  });

  const stats = riskManager.getStats();

  test.assertEqual(stats.openPositions, 1, 'Should have 1 open position');
  test.assertGreaterThan(stats.totalExposure, 0, 'Total exposure should be positive');
  test.assertTrue(stats.assetExposure['BTC/USDT'] !== undefined, 'BTC/USDT exposure should be tracked');
});

// Test 12: Configuration Update
test.test('Configuration Update', () => {
  const riskManager = new RiskManager(defaultConfig, 10000);

  const newMaxPositions = 10;
  riskManager.updateConfig({ maxPositions: newMaxPositions });

  const config = riskManager.getConfig();
  test.assertEqual(config.maxPositions, newMaxPositions, 'Config should be updated');
});

// Wait for async tests to complete
setTimeout(() => {
  test.summary();
}, 1000);
