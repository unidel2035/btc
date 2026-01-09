/**
 * Paper Trading Tests
 */

import { PaperTradingEngine } from '../../src/trading/paper/PaperTradingEngine.js';
import { OrderSide, TradingMode, OrderType, OrderStatus } from '../../src/trading/paper/types.js';

/**
 * Test helper to assert equality
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Test helper to assert approximate equality for numbers
 */
function assertApprox(actual: number, expected: number, tolerance: number = 0.01, message: string = ''): void {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new Error(`Assertion failed: ${message}. Expected ${expected} ± ${tolerance}, got ${actual} (diff: ${diff})`);
  }
}

/**
 * Test 1: Engine initialization
 */
function testEngineInitialization(): void {
  console.log('Test 1: Engine initialization');

  const engine = new PaperTradingEngine({
    initialBalance: 10000,
    currency: 'USDT',
    fees: { maker: 0.1, taker: 0.1 },
    slippage: 0.05,
  });

  const balance = engine.getBalance();
  assert(balance.total === 10000, 'Initial balance should be 10000');
  assert(balance.available === 10000, 'Available balance should be 10000');
  assert(balance.locked === 0, 'Locked balance should be 0');
  assert(balance.currency === 'USDT', 'Currency should be USDT');

  const config = engine.getConfig();
  assert(config.mode === TradingMode.PAPER, 'Mode should be PAPER');
  assert(config.initialBalance === 10000, 'Initial balance config should be 10000');

  console.log('✅ Test 1 passed\n');
}

/**
 * Test 2: Market order - Buy
 */
function testMarketOrderBuy(): void {
  console.log('Test 2: Market order - Buy');

  const engine = new PaperTradingEngine({ initialBalance: 10000 });
  engine.updateMarketPrice('BTCUSDT', 50000);

  const order = engine.placeMarketOrder('BTCUSDT', OrderSide.BUY, 0.1);
  assert(order !== null, 'Order should be created');
  assert(order!.status === 'filled', 'Order should be filled');
  assert(order!.quantity === 0.1, 'Quantity should be 0.1');

  // Price with slippage (0.05%)
  const expectedPrice = 50000 * 1.0005;
  assertApprox(order!.averagePrice, expectedPrice, 1, 'Price should include slippage');

  // Check balance
  const balance = engine.getBalance();
  const orderValue = 0.1 * expectedPrice;
  const fees = orderValue * 0.001; // 0.1%
  const totalCost = orderValue + fees;

  assertApprox(balance.available, 10000 - totalCost, 1, 'Available balance should be reduced by order cost + fees');
  assertApprox(balance.locked, orderValue, 1, 'Locked balance should equal order value');

  // Check position
  const positions = engine.getPositions();
  assert(positions.length === 1, 'Should have 1 open position');
  assert(positions[0].symbol === 'BTCUSDT', 'Position symbol should be BTCUSDT');
  assert(positions[0].side === 'long', 'Position side should be long');
  assertApprox(positions[0].quantity, 0.1, 0.001, 'Position quantity should be 0.1');

  console.log('✅ Test 2 passed\n');
}

/**
 * Test 3: Market order - Sell (close position)
 */
function testMarketOrderSell(): void {
  console.log('Test 3: Market order - Sell (close position)');

  const engine = new PaperTradingEngine({ initialBalance: 10000 });
  engine.updateMarketPrice('BTCUSDT', 50000);

  // Open position
  engine.placeMarketOrder('BTCUSDT', OrderSide.BUY, 0.1);

  // Update price and close
  engine.updateMarketPrice('BTCUSDT', 51000);
  const sellOrder = engine.placeMarketOrder('BTCUSDT', OrderSide.SELL, 0.1);

  assert(sellOrder !== null, 'Sell order should be created');
  assert(sellOrder!.status === 'filled', 'Sell order should be filled');

  // Check positions
  const positions = engine.getPositions();
  assert(positions.length === 0, 'Should have no open positions after sell');

  // Check closed trades
  const trades = engine.getClosedTrades();
  assert(trades.length === 1, 'Should have 1 closed trade');

  const trade = trades[0];
  assert(trade.pnl > 0, 'P&L should be positive (price went up)');
  console.log(`   P&L: ${trade.pnl.toFixed(2)} USDT (${trade.pnlPercent.toFixed(2)}%)`);

  // Check stats
  const stats = engine.getStats();
  assert(stats.totalTrades === 1, 'Total trades should be 1');
  assert(stats.winningTrades === 1, 'Winning trades should be 1');
  assert(stats.winRate === 100, 'Win rate should be 100%');

  console.log('✅ Test 3 passed\n');
}

/**
 * Test 4: Limit order
 */
function testLimitOrder(): void {
  console.log('Test 4: Limit order');

  const engine = new PaperTradingEngine({ initialBalance: 10000 });
  engine.updateMarketPrice('BTCUSDT', 50000);

  // Place limit buy order below market price
  const order = engine.placeLimitOrder('BTCUSDT', OrderSide.BUY, 0.1, 49000);
  assert(order !== null, 'Limit order should be created');
  assert(order!.status === 'pending', 'Limit order should be pending');

  // Price hasn't reached limit yet
  engine.updateMarketPrice('BTCUSDT', 49500);
  let positions = engine.getPositions();
  assert(positions.length === 0, 'Position should not be opened yet');

  // Price reaches limit
  engine.updateMarketPrice('BTCUSDT', 49000);
  positions = engine.getPositions();
  assert(positions.length === 1, 'Position should be opened');

  // Check order status
  const orders = engine.getOrders();
  const filledOrder = orders.find((o) => o.id === order!.id);
  assert(filledOrder!.status === 'filled', 'Order should be filled');

  console.log('✅ Test 4 passed\n');
}

/**
 * Test 5: Cancel limit order
 */
function testCancelLimitOrder(): void {
  console.log('Test 5: Cancel limit order');

  const engine = new PaperTradingEngine({ initialBalance: 10000 });
  engine.updateMarketPrice('BTCUSDT', 50000);

  const order = engine.placeLimitOrder('BTCUSDT', OrderSide.BUY, 0.1, 49000);
  assert(order !== null, 'Order should be created');

  const initialBalance = engine.getBalance().available;

  // Cancel order
  const cancelled = engine.cancelOrder(order!.id);
  assert(cancelled, 'Order should be cancelled');

  // Check balance restored
  const balance = engine.getBalance();
  assert(balance.available === 10000, 'Balance should be fully restored after cancel');

  // Check order status
  const orders = engine.getOrders();
  const cancelledOrder = orders.find((o) => o.id === order!.id);
  assert(cancelledOrder!.status === 'cancelled', 'Order status should be cancelled');

  console.log('✅ Test 5 passed\n');
}

/**
 * Test 6: Stop-loss
 */
function testStopLoss(): void {
  console.log('Test 6: Stop-loss');

  const engine = new PaperTradingEngine({ initialBalance: 10000 });
  engine.updateMarketPrice('BTCUSDT', 50000);

  // Open position
  engine.placeMarketOrder('BTCUSDT', OrderSide.BUY, 0.1);

  // Set stop-loss at -2%
  const positions = engine.getPositions();
  engine.setStopLoss(positions[0].id, 49000);

  // Price drops to stop-loss level
  engine.updateMarketPrice('BTCUSDT', 49000);
  engine.checkStopLossTakeProfit();

  // Check position closed
  const positionsAfter = engine.getPositions();
  assert(positionsAfter.length === 0, 'Position should be closed by stop-loss');

  // Check trade
  const trades = engine.getClosedTrades();
  assert(trades.length === 1, 'Should have 1 closed trade');
  assert(trades[0].exitReason === 'stop-loss', 'Exit reason should be stop-loss');
  assert(trades[0].pnl < 0, 'P&L should be negative');

  console.log(`   P&L: ${trades[0].pnl.toFixed(2)} USDT (${trades[0].pnlPercent.toFixed(2)}%)`);
  console.log('✅ Test 6 passed\n');
}

/**
 * Test 7: Take-profit
 */
function testTakeProfit(): void {
  console.log('Test 7: Take-profit');

  const engine = new PaperTradingEngine({ initialBalance: 10000 });
  engine.updateMarketPrice('BTCUSDT', 50000);

  // Open position
  engine.placeMarketOrder('BTCUSDT', OrderSide.BUY, 0.1);

  // Set take-profit at +4%
  const positions = engine.getPositions();
  engine.setTakeProfit(positions[0].id, 52000);

  // Price rises to take-profit level
  engine.updateMarketPrice('BTCUSDT', 52000);
  engine.checkStopLossTakeProfit();

  // Check position closed
  const positionsAfter = engine.getPositions();
  assert(positionsAfter.length === 0, 'Position should be closed by take-profit');

  // Check trade
  const trades = engine.getClosedTrades();
  assert(trades.length === 1, 'Should have 1 closed trade');
  assert(trades[0].exitReason === 'take-profit', 'Exit reason should be take-profit');
  assert(trades[0].pnl > 0, 'P&L should be positive');

  console.log(`   P&L: ${trades[0].pnl.toFixed(2)} USDT (${trades[0].pnlPercent.toFixed(2)}%)`);
  console.log('✅ Test 7 passed\n');
}

/**
 * Test 8: Unrealized P&L
 */
function testUnrealizedPnL(): void {
  console.log('Test 8: Unrealized P&L');

  const engine = new PaperTradingEngine({ initialBalance: 10000 });
  engine.updateMarketPrice('BTCUSDT', 50000);

  // Open position
  engine.placeMarketOrder('BTCUSDT', OrderSide.BUY, 0.1);

  // Update price
  engine.updateMarketPrice('BTCUSDT', 52000);

  const positions = engine.getPositions();
  assert(positions[0].unrealizedPnL !== undefined, 'Unrealized P&L should be calculated');
  assert(positions[0].unrealizedPnL! > 0, 'Unrealized P&L should be positive');

  console.log(`   Unrealized P&L: ${positions[0].unrealizedPnL!.toFixed(2)} USDT (${positions[0].unrealizedPnLPercent!.toFixed(2)}%)`);

  // Check equity updated
  const balance = engine.getBalance();
  assert(balance.equity > balance.total, 'Equity should be greater than total balance');

  console.log('✅ Test 8 passed\n');
}

/**
 * Test 9: Multiple trades and statistics
 */
function testMultipleTradesStats(): void {
  console.log('Test 9: Multiple trades and statistics');

  const engine = new PaperTradingEngine({ initialBalance: 10000 });

  // Trade 1: Win
  engine.updateMarketPrice('BTCUSDT', 50000);
  engine.placeMarketOrder('BTCUSDT', OrderSide.BUY, 0.1);
  engine.updateMarketPrice('BTCUSDT', 52000);
  engine.placeMarketOrder('BTCUSDT', OrderSide.SELL, 0.1);

  // Trade 2: Loss
  engine.updateMarketPrice('ETHUSDT', 3000);
  engine.placeMarketOrder('ETHUSDT', OrderSide.BUY, 1);
  engine.updateMarketPrice('ETHUSDT', 2900);
  engine.placeMarketOrder('ETHUSDT', OrderSide.SELL, 1);

  // Trade 3: Win
  engine.updateMarketPrice('BTCUSDT', 51000);
  engine.placeMarketOrder('BTCUSDT', OrderSide.BUY, 0.1);
  engine.updateMarketPrice('BTCUSDT', 53000);
  engine.placeMarketOrder('BTCUSDT', OrderSide.SELL, 0.1);

  const stats = engine.getStats();
  assert(stats.totalTrades === 3, 'Total trades should be 3');
  assert(stats.winningTrades === 2, 'Winning trades should be 2');
  assert(stats.losingTrades === 1, 'Losing trades should be 1');
  assertApprox(stats.winRate, 66.67, 0.1, 'Win rate should be ~66.67%');

  assert(stats.profitFactor > 0, 'Profit factor should be positive');
  assert(stats.averageWin > 0, 'Average win should be positive');
  assert(stats.averageLoss > 0, 'Average loss should be positive');

  console.log('   Statistics:');
  console.log(`   - Total Trades: ${stats.totalTrades}`);
  console.log(`   - Win Rate: ${stats.winRate.toFixed(2)}%`);
  console.log(`   - Total P&L: ${stats.totalPnL.toFixed(2)} USDT (${stats.totalPnLPercent.toFixed(2)}%)`);
  console.log(`   - Profit Factor: ${stats.profitFactor.toFixed(2)}`);
  console.log(`   - Max Drawdown: ${stats.maxDrawdown.toFixed(2)} USDT`);

  console.log('✅ Test 9 passed\n');
}

/**
 * Test 10: Insufficient balance
 */
function testInsufficientBalance(): void {
  console.log('Test 10: Insufficient balance');

  const engine = new PaperTradingEngine({ initialBalance: 1000 });
  engine.updateMarketPrice('BTCUSDT', 50000);

  // Try to buy more than balance allows
  const order = engine.placeMarketOrder('BTCUSDT', OrderSide.BUY, 1); // 1 BTC = 50000 USDT
  assert(order === null, 'Order should be rejected due to insufficient balance');

  const positions = engine.getPositions();
  assert(positions.length === 0, 'No position should be opened');

  console.log('✅ Test 10 passed\n');
}

/**
 * Test 11: Max positions limit
 */
function testMaxPositionsLimit(): void {
  console.log('Test 11: Max positions limit');

  const engine = new PaperTradingEngine({
    initialBalance: 100000,
    maxPositions: 2,
  });

  // Open 2 positions (max)
  engine.updateMarketPrice('BTCUSDT', 50000);
  engine.placeMarketOrder('BTCUSDT', OrderSide.BUY, 0.1);

  engine.updateMarketPrice('ETHUSDT', 3000);
  engine.placeMarketOrder('ETHUSDT', OrderSide.BUY, 1);

  // Try to open 3rd position
  engine.updateMarketPrice('SOLUSDT', 100);
  const order = engine.placeMarketOrder('SOLUSDT', OrderSide.BUY, 10);

  assert(order === null, 'Order should be rejected due to max positions limit');
  assert(engine.getPositions().length === 2, 'Should still have only 2 positions');

  console.log('✅ Test 11 passed\n');
}

/**
 * Test 12: Events
 */
function testEvents(): void {
  console.log('Test 12: Events');

  const engine = new PaperTradingEngine({ initialBalance: 10000 });
  const events: any[] = [];

  engine.on((event) => {
    events.push(event);
  });

  engine.updateMarketPrice('BTCUSDT', 50000);
  engine.placeMarketOrder('BTCUSDT', OrderSide.BUY, 0.1);
  engine.updateMarketPrice('BTCUSDT', 51000);
  engine.placeMarketOrder('BTCUSDT', OrderSide.SELL, 0.1);

  assert(events.length === 4, 'Should have 4 events'); // 2 order filled + 2 position open/close
  assert(events[0].type === 'order', 'First event should be order');
  assert(events[0].action === 'filled', 'First event action should be filled');
  assert(events[1].type === 'position', 'Second event should be position');
  assert(events[1].action === 'opened', 'Second event action should be opened');

  console.log(`   Captured ${events.length} events`);
  console.log('✅ Test 12 passed\n');
}

/**
 * Test 13: Reset
 */
function testReset(): void {
  console.log('Test 13: Reset');

  const engine = new PaperTradingEngine({ initialBalance: 10000 });
  engine.updateMarketPrice('BTCUSDT', 50000);
  engine.placeMarketOrder('BTCUSDT', OrderSide.BUY, 0.1);
  engine.updateMarketPrice('BTCUSDT', 51000);
  engine.placeMarketOrder('BTCUSDT', OrderSide.SELL, 0.1);

  // Reset
  engine.reset();

  const balance = engine.getBalance();
  assert(balance.total === 10000, 'Balance should be reset to initial');
  assert(engine.getPositions().length === 0, 'Positions should be cleared');
  assert(engine.getClosedTrades().length === 0, 'Trades should be cleared');
  assert(engine.getStats().totalTrades === 0, 'Stats should be reset');

  console.log('✅ Test 13 passed\n');
}

/**
 * Run all tests
 */
async function runTests(): Promise<void> {
  console.log('🧪 Running Paper Trading Tests\n');
  console.log('='.repeat(50));
  console.log('\n');

  const tests = [
    testEngineInitialization,
    testMarketOrderBuy,
    testMarketOrderSell,
    testLimitOrder,
    testCancelLimitOrder,
    testStopLoss,
    testTakeProfit,
    testUnrealizedPnL,
    testMultipleTradesStats,
    testInsufficientBalance,
    testMaxPositionsLimit,
    testEvents,
    testReset,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      test();
      passed++;
    } catch (error) {
      failed++;
      console.error(`❌ Test failed: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }

  console.log('='.repeat(50));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
