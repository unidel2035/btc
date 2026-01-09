/**
 * Paper Trading Tests
 * Unit tests for paper trading module
 */

import {
  PaperTradingEngine,
  PaperAccount,
  OrderManager,
  StatsTracker,
  ModeSwitcher,
  PaperTradingConfig,
  TradingMode,
  OrderType,
  OrderSide,
  OrderStatus,
} from '../../src/trading/paper/index.js';

/**
 * Test utilities
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertApprox(
  actual: number,
  expected: number,
  tolerance: number,
  message: string,
): void {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new Error(
      `${message}: expected ${expected} ± ${tolerance}, got ${actual} (diff: ${diff})`,
    );
  }
}

/**
 * Test 1: Paper Account - Balance Management
 */
function testPaperAccount(): void {
  console.info('Running Test 1: Paper Account - Balance Management');

  const config: PaperTradingConfig = {
    mode: TradingMode.PAPER,
    initialBalance: 10000,
    fees: {
      maker: 0.001,
      taker: 0.001,
    },
    slippage: 0.0005,
  };

  const account = new PaperAccount(config);

  // Test initial balance
  const balance = account.getBalance();
  assert(balance.cash === 10000, 'Initial cash should be 10000');
  assert(balance.equity === 10000, 'Initial equity should be 10000');
  assert(balance.positions.length === 0, 'Should start with no positions');

  // Test order check
  const canPlace = account.canPlaceOrder(OrderSide.BUY, 0.1, 50000);
  assert(canPlace.allowed, 'Should be able to place order with sufficient funds');

  // Test insufficient funds
  const cannotPlace = account.canPlaceOrder(OrderSide.BUY, 1, 50000);
  assert(!cannotPlace.allowed, 'Should not be able to place order with insufficient funds');

  console.info('✅ Test 1 passed');
}

/**
 * Test 2: Order Manager - Order Placement
 */
function testOrderManager(): void {
  console.info('Running Test 2: Order Manager - Order Placement');

  const config: PaperTradingConfig = {
    mode: TradingMode.PAPER,
    initialBalance: 10000,
    fees: {
      maker: 0.001,
      taker: 0.001,
    },
    slippage: 0.0005,
  };

  const account = new PaperAccount(config);
  const orderManager = new OrderManager(account);

  // Test market order placement
  const order = orderManager.placeOrder({
    symbol: 'BTCUSDT',
    type: OrderType.MARKET,
    side: OrderSide.BUY,
    quantity: 0.1,
    price: 50000,
  });

  assert(!('error' in order), 'Order should be placed successfully');
  if ('error' in order) return;

  assert(order.symbol === 'BTCUSDT', 'Order symbol should be BTCUSDT');
  assert(order.quantity === 0.1, 'Order quantity should be 0.1');
  assert(order.side === OrderSide.BUY, 'Order side should be BUY');
  assert(order.status === OrderStatus.PENDING, 'Order status should be PENDING');

  // Test order retrieval
  const retrieved = orderManager.getOrder(order.id);
  assert(retrieved !== undefined, 'Should be able to retrieve order');
  assert(retrieved?.id === order.id, 'Retrieved order should match');

  console.info('✅ Test 2 passed');
}

/**
 * Test 3: Fee and Slippage Calculation
 */
function testFeesAndSlippage(): void {
  console.info('Running Test 3: Fee and Slippage Calculation');

  const config: PaperTradingConfig = {
    mode: TradingMode.PAPER,
    initialBalance: 10000,
    fees: {
      maker: 0.001,
      taker: 0.002,
    },
    slippage: 0.0005,
  };

  const account = new PaperAccount(config);

  // Test fee calculation
  const orderValue = 5000;
  const makerFee = account.calculateFees(orderValue, 'maker');
  const takerFee = account.calculateFees(orderValue, 'taker');

  assertApprox(makerFee, 5, 0.01, 'Maker fee should be 5 (0.1%)');
  assertApprox(takerFee, 10, 0.01, 'Taker fee should be 10 (0.2%)');

  // Test slippage calculation
  const slippage = account.calculateSlippage(orderValue);
  assertApprox(slippage, 2.5, 0.01, 'Slippage should be 2.5 (0.05%)');

  // Test slippage application
  const buyPrice = account.applySlippage(50000, OrderSide.BUY);
  const sellPrice = account.applySlippage(50000, OrderSide.SELL);

  assert(buyPrice > 50000, 'Buy price should be higher due to slippage');
  assert(sellPrice < 50000, 'Sell price should be lower due to slippage');

  assertApprox(buyPrice, 50025, 1, 'Buy price with slippage');
  assertApprox(sellPrice, 49975, 1, 'Sell price with slippage');

  console.info('✅ Test 3 passed');
}

/**
 * Test 4: Position Management
 */
function testPositionManagement(): void {
  console.info('Running Test 4: Position Management');

  const config: PaperTradingConfig = {
    mode: TradingMode.PAPER,
    initialBalance: 10000,
    fees: {
      maker: 0.001,
      taker: 0.001,
    },
    slippage: 0.0005,
  };

  const account = new PaperAccount(config);

  // Open a position
  const entryPrice = 50000;
  const quantity = 0.1;
  const fees = account.calculateFees(quantity * entryPrice, 'taker');

  const position = account.openPosition(
    'pos-1',
    'order-1',
    'BTCUSDT',
    entryPrice,
    quantity,
    fees,
  );

  assert(position.entryPrice === entryPrice, 'Entry price should match');
  assert(position.quantity === quantity, 'Quantity should match');

  // Check positions
  const positions = account.getOpenPositions();
  assert(positions.length === 1, 'Should have one open position');

  // Close the position
  const exitPrice = 51000;
  const exitFees = account.calculateFees(quantity * exitPrice, 'taker');
  const pnl = account.closePosition('pos-1', exitPrice, exitFees);

  const expectedPnl = quantity * (exitPrice - entryPrice) - fees - exitFees;
  assertApprox(pnl, expectedPnl, 0.01, 'P&L should be calculated correctly');

  // Check positions after close
  const closedPositions = account.getOpenPositions();
  assert(closedPositions.length === 0, 'Should have no open positions after close');

  console.info('✅ Test 4 passed');
}

/**
 * Test 5: Statistics Tracking
 */
function testStatsTracking(): void {
  console.info('Running Test 5: Statistics Tracking');

  const config: PaperTradingConfig = {
    mode: TradingMode.PAPER,
    initialBalance: 10000,
    fees: {
      maker: 0.001,
      taker: 0.001,
    },
    slippage: 0.0005,
  };

  const account = new PaperAccount(config);
  const statsTracker = new StatsTracker(TradingMode.PAPER);

  const stats = statsTracker.getStats(account, []);

  assert(stats.mode === TradingMode.PAPER, 'Mode should be PAPER');
  assert(stats.initialBalance === 10000, 'Initial balance should be 10000');
  assert(stats.currentEquity === 10000, 'Current equity should be 10000');
  assert(stats.totalReturn === 0, 'Total return should be 0');

  console.info('✅ Test 5 passed');
}

/**
 * Test 6: Mode Switcher
 */
function testModeSwitcher(): void {
  console.info('Running Test 6: Mode Switcher');

  // Test validation
  const validation = ModeSwitcher.validateSwitch(TradingMode.PAPER, TradingMode.LIVE);
  assert(validation.valid, 'Switch from PAPER to LIVE should be valid');

  const sameMode = ModeSwitcher.validateSwitch(TradingMode.PAPER, TradingMode.PAPER);
  assert(!sameMode.valid, 'Switch to same mode should be invalid');

  // Test warning generation
  const warning = ModeSwitcher.generateWarnings(
    TradingMode.PAPER,
    TradingMode.LIVE,
    true,
    true,
  );

  assert(warning.fromMode === TradingMode.PAPER, 'From mode should be PAPER');
  assert(warning.toMode === TradingMode.LIVE, 'To mode should be LIVE');
  assert(warning.requiresConfirmation, 'Switching to LIVE should require confirmation');
  assert(warning.warnings.length > 0, 'Should have warnings');

  console.info('✅ Test 6 passed');
}

/**
 * Test 7: Paper Trading Engine Integration
 */
async function testPaperTradingEngine(): Promise<void> {
  console.info('Running Test 7: Paper Trading Engine Integration');

  const config: PaperTradingConfig = {
    mode: TradingMode.PAPER,
    initialBalance: 10000,
    fees: {
      maker: 0.001,
      taker: 0.001,
    },
    slippage: 0.0005,
    dataSource: 'mock',
  };

  const engine = new PaperTradingEngine(config);

  // Start engine
  await engine.start();
  assert(engine.isActive(), 'Engine should be running');

  // Subscribe to market data
  engine.subscribeToMarketData('BTCUSDT');

  // Wait for market data
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Place an order
  const order = engine.placeOrder({
    symbol: 'BTCUSDT',
    type: OrderType.MARKET,
    side: OrderSide.BUY,
    quantity: 0.1,
  });

  assert(!('error' in order), 'Order should be placed successfully');

  // Check balance
  const balance = engine.getBalance();
  assert(balance.positions.length > 0, 'Should have open positions');

  // Get stats
  const stats = engine.getStats();
  assert(stats.totalOrders > 0, 'Should have orders');
  assert(stats.filledOrders > 0, 'Should have filled orders');

  // Stop engine
  await engine.stop();
  assert(!engine.isActive(), 'Engine should be stopped');

  console.info('✅ Test 7 passed');
}

/**
 * Run all tests
 */
async function runAllTests(): Promise<void> {
  console.info('╔═══════════════════════════════════════════════════════════════╗');
  console.info('║              Paper Trading Module - Unit Tests               ║');
  console.info('╚═══════════════════════════════════════════════════════════════╝');
  console.info('');

  const tests = [
    { name: 'Paper Account', fn: testPaperAccount },
    { name: 'Order Manager', fn: testOrderManager },
    { name: 'Fees and Slippage', fn: testFeesAndSlippage },
    { name: 'Position Management', fn: testPositionManagement },
    { name: 'Statistics Tracking', fn: testStatsTracking },
    { name: 'Mode Switcher', fn: testModeSwitcher },
    { name: 'Paper Trading Engine', fn: testPaperTradingEngine },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = test.fn();
      if (result instanceof Promise) {
        await result;
      }
      passed++;
    } catch (error) {
      failed++;
      console.error(`❌ Test failed: ${test.name}`);
      console.error(error);
    }
    console.info('');
  }

  console.info('═'.repeat(60));
  console.info(`Test Results: ${passed} passed, ${failed} failed`);
  console.info('═'.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error: Error) => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
