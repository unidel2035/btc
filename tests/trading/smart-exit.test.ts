/**
 * Unit tests for Smart Exit Management
 *
 * Запуск: tsx tests/trading/smart-exit.test.ts
 */

import {
  SmartStopLoss,
  SmartTakeProfit,
  SmartExitManager,
  TechnicalIndicators,
  StopLossType,
  TakeProfitType,
  PositionSide,
  PositionStatus,
} from '../../src/trading/risk/index.js';
import type {
  StopLossParams,
  TakeProfitParams,
  Position,
  OHLCVData,
  SteppedTrailingStep,
} from '../../src/trading/risk/index.js';

/**
 * Простой тестовый фреймворк
 */
class TestRunner {
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => void | Promise<void>): void {
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
      throw new Error(message || `Expected ${expected}, but got ${actual}`);
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
      throw new Error(message || `Expected ${actual} to be greater than ${expected}`);
    }
  }

  assertLessThan(actual: number, expected: number, message?: string): void {
    if (actual >= expected) {
      throw new Error(message || `Expected ${actual} to be less than ${expected}`);
    }
  }

  assertArrayLength<T>(array: T[], expectedLength: number, message?: string): void {
    if (array.length !== expectedLength) {
      throw new Error(
        message || `Expected array length ${expectedLength}, but got ${array.length}`,
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

// Создаем тестовые OHLCV данные
function createMockOHLCVData(count: number, basePrice: number = 45000): OHLCVData[] {
  const data: OHLCVData[] = [];
  let price = basePrice;

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 1000; // ±500
    price = Math.max(price + change, basePrice * 0.9); // не ниже 90% базовой цены

    data.push({
      timestamp: new Date(Date.now() - (count - i) * 3600000), // 1 час назад
      open: price,
      high: price + Math.random() * 500,
      low: price - Math.random() * 500,
      close: price + change,
      volume: 1000000 + Math.random() * 500000,
    });
  }

  return data;
}

// Запуск тестов
const runner = new TestRunner();

console.info('🧪 Testing Technical Indicators...\n');

runner.test('TechnicalIndicators: ATR calculation', () => {
  const ohlcvData = createMockOHLCVData(20);
  const atr = TechnicalIndicators.calculateATR(ohlcvData, 14);

  runner.assertGreaterThan(atr, 0, 'ATR should be positive');
});

runner.test('TechnicalIndicators: Adaptive ATR Multiplier', () => {
  const lowVolMultiplier = TechnicalIndicators.calculateAdaptiveATRMultiplier(400, 500);
  runner.assertEqual(lowVolMultiplier, 1.5, 'Low volatility should return 1.5');

  const highVolMultiplier = TechnicalIndicators.calculateAdaptiveATRMultiplier(610, 500);
  runner.assertEqual(highVolMultiplier, 2.5, 'High volatility should return 2.5');

  const mediumVolMultiplier = TechnicalIndicators.calculateAdaptiveATRMultiplier(500, 500);
  runner.assertEqual(mediumVolMultiplier, 2.0, 'Medium volatility should return 2.0');
});

runner.test('TechnicalIndicators: Parabolic SAR', () => {
  const ohlcvData = createMockOHLCVData(30);
  const sar = TechnicalIndicators.calculateParabolicSAR(ohlcvData);

  runner.assertArrayLength(sar, 30, 'SAR array should match input length');
});

runner.test('TechnicalIndicators: Find Nearest Support', () => {
  const ohlcvData = createMockOHLCVData(60, 45000);
  const support = TechnicalIndicators.findNearestSupport(ohlcvData, 45500, 50);

  runner.assertGreaterThan(support, 0, 'Support should be positive');
  runner.assertLessThan(support, 45500, 'Support should be below current price');
});

runner.test('TechnicalIndicators: Find Nearest Resistance', () => {
  const ohlcvData = createMockOHLCVData(60, 45000);
  const resistance = TechnicalIndicators.findNearestResistance(ohlcvData, 44500, 50);

  runner.assertGreaterThan(resistance, 44500, 'Resistance should be above current price');
});

runner.test('TechnicalIndicators: Fibonacci Extension', () => {
  const fibLevels = TechnicalIndicators.calculateFibonacciExtension(44000, 46000, 'long');

  runner.assertArrayLength(fibLevels, 4, 'Should return 4 Fibonacci levels');
  runner.assertGreaterThan(fibLevels[0]!, 46000, 'First level should be above swing high');
});

console.info('\n🧪 Testing SmartStopLoss...\n');

runner.test('SmartStopLoss: Fixed Stop Loss (Long)', () => {
  const params: StopLossParams = {
    type: StopLossType.FIXED,
    entryPrice: 45000,
    percent: 2,
    side: 'long',
  };

  const sl = SmartStopLoss.calculateStopLoss(params);
  runner.assertEqual(sl, 44100, 'Long fixed SL should be 2% below entry');
});

runner.test('SmartStopLoss: Fixed Stop Loss (Short)', () => {
  const params: StopLossParams = {
    type: StopLossType.FIXED,
    entryPrice: 45000,
    percent: 2,
    side: 'short',
  };

  const sl = SmartStopLoss.calculateStopLoss(params);
  runner.assertEqual(sl, 45900, 'Short fixed SL should be 2% above entry');
});

runner.test('SmartStopLoss: ATR-based Stop Loss', () => {
  const ohlcvData = createMockOHLCVData(20);
  const params: StopLossParams = {
    type: StopLossType.ATR_BASED,
    entryPrice: 45000,
    side: 'long',
    ohlcvData,
  };

  const sl = SmartStopLoss.calculateStopLoss(params);
  runner.assertLessThan(sl, 45000, 'Long ATR SL should be below entry');
  runner.assertGreaterThan(sl, 42000, 'ATR SL should be reasonable');
});

runner.test('SmartStopLoss: Structure-based Stop Loss', () => {
  const ohlcvData = createMockOHLCVData(60, 45000);
  const params: StopLossParams = {
    type: StopLossType.STRUCTURE_BASED,
    entryPrice: 45000,
    side: 'long',
    ohlcvData,
    lookback: 50,
  };

  const sl = SmartStopLoss.calculateStopLoss(params);
  runner.assertLessThan(sl, 45000, 'Structure SL should be below entry for long');
});

runner.test('SmartStopLoss: Parabolic SAR Stop Loss', () => {
  const ohlcvData = createMockOHLCVData(30);
  const params: StopLossParams = {
    type: StopLossType.PARABOLIC_SAR,
    entryPrice: 45000,
    ohlcvData,
  };

  const sl = SmartStopLoss.calculateStopLoss(params);
  runner.assertGreaterThan(sl, 0, 'Parabolic SAR SL should be positive');
});

runner.test('SmartStopLoss: Stepped Trailing Stop Update', () => {
  const position: Position = {
    id: '1',
    symbol: 'BTC/USDT',
    side: PositionSide.LONG,
    status: PositionStatus.OPEN,
    entryPrice: 45000,
    currentPrice: 47250, // +5% profit
    size: 10000,
    quantity: 0.222,
    remainingQuantity: 0.222,
    stopLoss: 44100,
    takeProfit: [],
    trailingStopActive: false,
    unrealizedPnL: 500,
    realizedPnL: 0,
    openedAt: new Date(),
    lastUpdatedAt: new Date(),
  };

  const steps: SteppedTrailingStep[] = [
    { profitPercent: 2, stopLossPercent: 0 }, // breakeven
    { profitPercent: 5, stopLossPercent: 2 }, // +2%
  ];

  const result = SmartStopLoss.updateSteppedTrailingStop(position, 47250, steps);

  runner.assertTrue(result.updated, 'Stepped trailing should update at +5% profit');
  runner.assertEqual(result.newStopLoss, 45900, 'SL should move to +2% at +5% profit');
});

runner.test('SmartStopLoss: Move to Breakeven', () => {
  const position: Position = {
    id: '1',
    symbol: 'BTC/USDT',
    side: PositionSide.LONG,
    status: PositionStatus.OPEN,
    entryPrice: 45000,
    currentPrice: 46000,
    size: 10000,
    quantity: 0.222,
    remainingQuantity: 0.222,
    stopLoss: 44100,
    takeProfit: [],
    trailingStopActive: false,
    unrealizedPnL: 222,
    realizedPnL: 0,
    openedAt: new Date(),
    lastUpdatedAt: new Date(),
  };

  const result = SmartStopLoss.moveToBreakeven(position);

  runner.assertTrue(result.updated, 'Should update to breakeven');
  runner.assertEqual(result.newStopLoss, 45000, 'SL should be at entry price');
});

runner.test('SmartStopLoss: Check Time-based Stop', () => {
  const oldPosition: Position = {
    id: '1',
    symbol: 'BTC/USDT',
    side: PositionSide.LONG,
    status: PositionStatus.OPEN,
    entryPrice: 45000,
    currentPrice: 45500,
    size: 10000,
    quantity: 0.222,
    remainingQuantity: 0.222,
    stopLoss: 44100,
    takeProfit: [],
    trailingStopActive: false,
    unrealizedPnL: 111,
    realizedPnL: 0,
    openedAt: new Date(Date.now() - 73 * 3600000), // 73 hours ago
    lastUpdatedAt: new Date(),
  };

  const triggered = SmartStopLoss.checkTimeBasedStop(oldPosition, 72);
  runner.assertTrue(triggered, 'Time-based stop should trigger after 72 hours');

  const recentPosition: Position = { ...oldPosition, openedAt: new Date() };
  const notTriggered = SmartStopLoss.checkTimeBasedStop(recentPosition, 72);
  runner.assertFalse(notTriggered, 'Time-based stop should not trigger for recent position');
});

console.info('\n🧪 Testing SmartTakeProfit...\n');

runner.test('SmartTakeProfit: Fixed TP', () => {
  const params: TakeProfitParams = {
    type: TakeProfitType.FIXED,
    entryPrice: 45000,
    side: 'long',
    levels: [{ percent: 10, closePercent: 100 }],
  };

  const tpLevels = SmartTakeProfit.calculateLevels(params);

  runner.assertArrayLength(tpLevels, 1, 'Should return 1 TP level');
  runner.assertEqual(tpLevels[0], 49500, 'TP should be 10% above entry');
});

runner.test('SmartTakeProfit: Multiple Levels', () => {
  const params: TakeProfitParams = {
    type: TakeProfitType.MULTIPLE_LEVELS,
    entryPrice: 45000,
    side: 'long',
    levels: [
      { percent: 5, closePercent: 50 },
      { percent: 10, closePercent: 30 },
      { percent: 15, closePercent: 20 },
    ],
  };

  const tpLevels = SmartTakeProfit.calculateLevels(params);

  runner.assertArrayLength(tpLevels, 3, 'Should return 3 TP levels');
  runner.assertEqual(tpLevels[0], 47250, 'TP1 should be 5% above entry');
  runner.assertEqual(tpLevels[1], 49500, 'TP2 should be 10% above entry');
  runner.assertEqual(tpLevels[2], 51750, 'TP3 should be 15% above entry');
});

runner.test('SmartTakeProfit: Risk/Reward Ratio', () => {
  const params: TakeProfitParams = {
    type: TakeProfitType.RISK_REWARD,
    entryPrice: 45000,
    stopLoss: 44000,
    riskRewardRatio: 2.0,
    side: 'long',
  };

  const tpLevels = SmartTakeProfit.calculateLevels(params);

  runner.assertArrayLength(tpLevels, 1, 'Should return 1 TP level');
  runner.assertEqual(tpLevels[0], 47000, 'TP should be 2x risk distance');
});

runner.test('SmartTakeProfit: Fibonacci Extension', () => {
  const params: TakeProfitParams = {
    type: TakeProfitType.FIBONACCI,
    entryPrice: 45000,
    swingLow: 44000,
    swingHigh: 46000,
    side: 'long',
  };

  const tpLevels = SmartTakeProfit.calculateLevels(params);

  runner.assertArrayLength(tpLevels, 4, 'Should return 4 Fibonacci TP levels');
  runner.assertGreaterThan(tpLevels[0]!, 46000, 'First Fib level should be above swing high');
});

runner.test('SmartTakeProfit: Create Default Levels', () => {
  const levels = SmartTakeProfit.createDefaultLevels();

  runner.assertArrayLength(levels, 3, 'Should return 3 default levels');
  runner.assertEqual(levels[0]!.percent, 5, 'First level at 5%');
  runner.assertEqual(levels[0]!.closePercent, 50, 'Close 50% at first level');
});

console.info('\n🧪 Testing SmartExitManager...\n');

runner.test('SmartExitManager: Breakeven Protection', async () => {
  const exitManager = new SmartExitManager({
    breakevenEnabled: true,
    breakevenActivationPercent: 2,
  });

  const position: Position = {
    id: '1',
    symbol: 'BTC/USDT',
    side: PositionSide.LONG,
    status: PositionStatus.OPEN,
    entryPrice: 45000,
    currentPrice: 45900, // +2%
    size: 10000,
    quantity: 0.222,
    remainingQuantity: 0.222,
    stopLoss: 44100,
    takeProfit: [],
    trailingStopActive: false,
    unrealizedPnL: 200,
    realizedPnL: 0,
    openedAt: new Date(),
    lastUpdatedAt: new Date(),
  };

  const result = await exitManager.updatePosition(position, 45900);

  const breakevenAction = result.actions.find((a) => a.type === 'breakeven_activated');
  runner.assertTrue(breakevenAction !== undefined, 'Breakeven should be activated at +2%');
  runner.assertEqual(result.position.stopLoss, 45000, 'SL should be at breakeven');
});

runner.test('SmartExitManager: Stepped Trailing Activation', async () => {
  const exitManager = new SmartExitManager({
    steppedTrailingEnabled: true,
  });

  const position: Position = {
    id: '1',
    symbol: 'BTC/USDT',
    side: PositionSide.LONG,
    status: PositionStatus.OPEN,
    entryPrice: 45000,
    currentPrice: 49500, // +10%
    size: 10000,
    quantity: 0.222,
    remainingQuantity: 0.222,
    stopLoss: 44100,
    takeProfit: [],
    trailingStopActive: false,
    steppedTrailingSteps: SmartExitManager.createDefaultSteppedTrailing(),
    unrealizedPnL: 1000,
    realizedPnL: 0,
    openedAt: new Date(),
    lastUpdatedAt: new Date(),
  };

  const result = await exitManager.updatePosition(position, 49500);

  const steppedAction = result.actions.find((a) => a.type === 'stepped_trailing_updated');
  runner.assertTrue(steppedAction !== undefined, 'Stepped trailing should activate at +10%');
});

runner.test('SmartExitManager: Time-based Exit', async () => {
  const exitManager = new SmartExitManager({
    timeBasedExitEnabled: true,
    maxHoldingTime: 48,
    minProfitForTimeExit: 3,
  });

  const position: Position = {
    id: '1',
    symbol: 'BTC/USDT',
    side: PositionSide.LONG,
    status: PositionStatus.OPEN,
    entryPrice: 45000,
    currentPrice: 45500, // +1.1% (below min profit)
    size: 10000,
    quantity: 0.222,
    remainingQuantity: 0.222,
    stopLoss: 44100,
    takeProfit: [],
    trailingStopActive: false,
    unrealizedPnL: 111,
    realizedPnL: 0,
    openedAt: new Date(Date.now() - 50 * 3600000), // 50 hours ago
    lastUpdatedAt: new Date(),
  };

  const result = await exitManager.updatePosition(position, 45500);

  runner.assertTrue(result.shouldClose, 'Should close position after max holding time');
  runner.assertEqual(result.closeReason, 'time_based_exit', 'Close reason should be time-based');
});

runner.test('SmartExitManager: Emergency Exit on Critical Loss', () => {
  const exitManager = new SmartExitManager();

  const position: Position = {
    id: '1',
    symbol: 'BTC/USDT',
    side: PositionSide.LONG,
    status: PositionStatus.OPEN,
    entryPrice: 45000,
    currentPrice: 40000, // -11% critical loss
    size: 10000,
    quantity: 0.222,
    remainingQuantity: 0.222,
    stopLoss: 44100,
    takeProfit: [],
    trailingStopActive: false,
    unrealizedPnL: -1110,
    realizedPnL: 0,
    openedAt: new Date(),
    lastUpdatedAt: new Date(),
  };

  const emergencyCheck = exitManager.shouldEmergencyExit(position, 40000);

  runner.assertTrue(emergencyCheck.shouldExit, 'Should trigger emergency exit on -10%+ loss');
});

runner.test('SmartExitManager: Get Exit Recommendations', () => {
  const exitManager = new SmartExitManager();

  const position: Position = {
    id: '1',
    symbol: 'BTC/USDT',
    side: PositionSide.LONG,
    status: PositionStatus.OPEN,
    entryPrice: 45000,
    currentPrice: 49500, // +10%
    size: 10000,
    quantity: 0.222,
    remainingQuantity: 0.222,
    stopLoss: 44100,
    takeProfit: [],
    trailingStopActive: false,
    unrealizedPnL: 1000,
    realizedPnL: 0,
    openedAt: new Date(),
    lastUpdatedAt: new Date(),
  };

  const recommendations = exitManager.getExitRecommendations(position, 49500);

  runner.assertGreaterThan(
    recommendations.length,
    0,
    'Should provide recommendations for profitable position',
  );
});

console.info('\n🧪 Testing Validation...\n');

runner.test('SmartStopLoss: Validate Invalid Params', () => {
  const invalidParams: StopLossParams = {
    type: StopLossType.FIXED,
    entryPrice: -100, // invalid
    percent: 150, // invalid
  };

  const validation = SmartStopLoss.validateParams(invalidParams);

  runner.assertFalse(validation.valid, 'Validation should fail for invalid params');
  runner.assertGreaterThan(validation.errors.length, 0, 'Should return error messages');
});

runner.test('SmartTakeProfit: Validate Invalid Levels Sum', () => {
  const invalidParams: TakeProfitParams = {
    type: TakeProfitType.MULTIPLE_LEVELS,
    entryPrice: 45000,
    levels: [
      { percent: 5, closePercent: 40 }, // sum = 70%, not 100%
      { percent: 10, closePercent: 30 },
    ],
  };

  const validation = SmartTakeProfit.validateParams(invalidParams);

  runner.assertFalse(validation.valid, 'Validation should fail when closePercent sum != 100%');
});

// Выводим итоги
setTimeout(() => {
  runner.summary();
}, 100);
