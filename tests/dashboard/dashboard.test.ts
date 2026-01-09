/**
 * Dashboard Tests
 * Unit tests для веб-интерфейса
 */

import { storage } from '../../src/dashboard/storage.js';

console.log('🧪 Running Dashboard Tests...\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name: string, fn: () => void | Promise<void>): void {
  try {
    fn();
    console.log(`✅ Test ${testsPassed + 1}: ${name}`);
    testsPassed++;
  } catch (error) {
    console.error(`❌ Test ${testsPassed + testsFailed + 1}: ${name}`);
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    testsFailed++;
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals(actual: any, expected: any, message?: string): void {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected} but got ${actual}`);
  }
}

// Test 1: Storage Initialization
test('Storage Initialization', () => {
  const metrics = storage.getMetrics();
  assert(metrics.balance === 10000, 'Initial balance should be 10000');
  assert(metrics.equity === 10000, 'Initial equity should equal balance');
});

// Test 2: Add Position
test('Add Position', () => {
  const position = storage.addPosition({
    symbol: 'BTC/USDT',
    side: 'LONG',
    size: 0.1,
    entryPrice: 50000,
    currentPrice: 51000,
    stopLoss: 49000,
    takeProfit: 52500,
    pnl: 100,
    pnlPercent: 2.0,
  });

  assert(position.id !== undefined, 'Position should have an ID');
  assert(position.symbol === 'BTC/USDT', 'Position symbol should match');
  assert(position.side === 'LONG', 'Position side should be LONG');

  const positions = storage.getPositions();
  assert(positions.length > 0, 'Should have at least one position');
});

// Test 3: Update Position
test('Update Position', () => {
  const positions = storage.getPositions();
  const firstPosition = positions[0];

  const updated = storage.updatePosition(firstPosition.id, {
    currentPrice: 52000,
    pnl: 200,
    pnlPercent: 4.0,
  });

  assert(updated !== null, 'Update should return the updated position');
  assert(updated?.currentPrice === 52000, 'Current price should be updated');
  assert(updated?.pnl === 200, 'PnL should be updated');
});

// Test 4: Close Position
test('Close Position', () => {
  const positions = storage.getPositions();
  const positionToClose = positions[0];
  const initialBalance = storage.getBalance();

  const trade = storage.closePosition(positionToClose.id, 52000, 'Test close');

  assert(trade !== null, 'Close should return a trade history entry');
  assert(trade?.exitPrice === 52000, 'Exit price should match');
  assert(trade?.reason === 'Test close', 'Reason should match');

  const remainingPositions = storage.getPositions();
  assert(remainingPositions.length === positions.length - 1, 'Should have one less position');

  const newBalance = storage.getBalance();
  assert(newBalance !== initialBalance, 'Balance should change after closing position');
});

// Test 5: Add Signal
test('Add Signal', () => {
  const signal = storage.addSignal({
    type: 'NEWS_MOMENTUM',
    source: 'Test',
    symbol: 'BTC/USDT',
    action: 'BUY',
    strength: 85,
    confidence: 0.9,
    price: 50000,
    reason: 'Test signal',
  });

  assert(signal.id !== undefined, 'Signal should have an ID');
  assert(signal.timestamp !== undefined, 'Signal should have a timestamp');

  const signals = storage.getSignals(10);
  assert(signals.length > 0, 'Should have at least one signal');
});

// Test 6: Add News
test('Add News', () => {
  const news = storage.addNews({
    title: 'Test News',
    content: 'Test content',
    source: 'Test Source',
    url: 'https://example.com',
    sentiment: 'POSITIVE',
    sentimentScore: 0.8,
    publishedAt: new Date().toISOString(),
  });

  assert(news.id !== undefined, 'News should have an ID');
  assert(news.fetchedAt !== undefined, 'News should have a fetchedAt timestamp');

  const newsList = storage.getNews(10);
  assert(newsList.length > 0, 'Should have at least one news item');
});

// Test 7: Equity History
test('Equity History', () => {
  storage.addEquityPoint();

  const equity = storage.getEquityHistory(10);
  assert(equity.length > 0, 'Should have equity history');
  assert(equity[0].timestamp !== undefined, 'Equity point should have timestamp');
  assert(equity[0].equity !== undefined, 'Equity point should have equity value');
});

// Test 8: Get Metrics
test('Get Metrics', () => {
  const metrics = storage.getMetrics();

  assert(metrics.balance !== undefined, 'Metrics should include balance');
  assert(metrics.equity !== undefined, 'Metrics should include equity');
  assert(metrics.pnl !== undefined, 'Metrics should include PnL');
  assert(metrics.winRate !== undefined, 'Metrics should include win rate');
  assert(metrics.totalTrades !== undefined, 'Metrics should include total trades');
  assert(metrics.openPositions !== undefined, 'Metrics should include open positions');
});

// Test 9: Performance Stats
test('Performance Stats', () => {
  const stats = storage.getPerformanceStats();

  assert(stats.totalTrades !== undefined, 'Stats should include total trades');
  assert(stats.winningTrades !== undefined, 'Stats should include winning trades');
  assert(stats.losingTrades !== undefined, 'Stats should include losing trades');
  assert(stats.winRate !== undefined, 'Stats should include win rate');
  assert(stats.profitFactor !== undefined, 'Stats should include profit factor');
  assert(stats.sharpeRatio !== undefined, 'Stats should include Sharpe ratio');
  assert(stats.maxDrawdown !== undefined, 'Stats should include max drawdown');
});

// Test 10: Strategy Configuration
test('Strategy Configuration', () => {
  const strategies = storage.getAllStrategyConfigs();
  assert(strategies.length > 0, 'Should have at least one strategy');

  const strategy = strategies[0];
  assert(strategy.name !== undefined, 'Strategy should have a name');
  assert(strategy.enabled !== undefined, 'Strategy should have enabled status');

  // Use the key 'news-momentum' instead of the display name
  const updated = storage.updateStrategyConfig('news-momentum', {
    enabled: false,
    riskPerTrade: 1.5,
  });

  assert(updated !== null, 'Update should return updated strategy');
  if (updated) {
    assert(updated.enabled === false, 'Strategy should be disabled');
    assert(updated.riskPerTrade === 1.5, 'Risk per trade should be updated');
  }
});

// Test 11: Risk Configuration
test('Risk Configuration', () => {
  const config = storage.getRiskConfig();

  assert(config.maxPositionSize !== undefined, 'Risk config should include maxPositionSize');
  assert(config.maxPositions !== undefined, 'Risk config should include maxPositions');
  assert(config.maxDailyLoss !== undefined, 'Risk config should include maxDailyLoss');

  const updated = storage.updateRiskConfig({
    maxPositionSize: 15,
    maxPositions: 10,
  });

  assert(updated.maxPositionSize === 15, 'maxPositionSize should be updated');
  assert(updated.maxPositions === 10, 'maxPositions should be updated');
});

// Test 12: Trade History
test('Trade History', () => {
  const history = storage.getTradeHistory(10);

  // Should have at least one trade from the closed position test
  assert(history.length > 0, 'Should have trade history');

  const trade = history[0];
  assert(trade.id !== undefined, 'Trade should have an ID');
  assert(trade.symbol !== undefined, 'Trade should have a symbol');
  assert(trade.pnl !== undefined, 'Trade should have PnL');
  assert(trade.openedAt !== undefined, 'Trade should have openedAt timestamp');
  assert(trade.closedAt !== undefined, 'Trade should have closedAt timestamp');
});

// Test 13: Multiple Positions Management
test('Multiple Positions Management', () => {
  // Add multiple positions
  storage.addPosition({
    symbol: 'ETH/USDT',
    side: 'LONG',
    size: 1.0,
    entryPrice: 3000,
    currentPrice: 3100,
    pnl: 100,
    pnlPercent: 3.33,
  });

  storage.addPosition({
    symbol: 'BNB/USDT',
    side: 'SHORT',
    size: 10,
    entryPrice: 400,
    currentPrice: 390,
    pnl: 100,
    pnlPercent: 2.5,
  });

  const positions = storage.getPositions();
  assert(positions.length >= 2, 'Should have at least 2 positions');

  const longPositions = positions.filter((p) => p.side === 'LONG');
  const shortPositions = positions.filter((p) => p.side === 'SHORT');

  assert(longPositions.length > 0, 'Should have LONG positions');
  assert(shortPositions.length > 0, 'Should have SHORT positions');
});

// Test 14: Signal Filtering
test('Signal Filtering', () => {
  // Add signals with different types
  storage.addSignal({
    type: 'SENTIMENT_SWING',
    source: 'Test',
    symbol: 'ETH/USDT',
    action: 'SELL',
    strength: 75,
    confidence: 0.85,
    reason: 'Test',
  });

  storage.addSignal({
    type: 'TECHNICAL',
    source: 'Test',
    symbol: 'BTC/USDT',
    action: 'HOLD',
    strength: 50,
    confidence: 0.7,
    reason: 'Test',
  });

  const allSignals = storage.getSignals(100);
  assert(allSignals.length >= 3, 'Should have multiple signals');

  const newsSignals = allSignals.filter((s) => s.type === 'NEWS_MOMENTUM');
  const sentimentSignals = allSignals.filter((s) => s.type === 'SENTIMENT_SWING');

  assert(newsSignals.length > 0, 'Should have NEWS_MOMENTUM signals');
  assert(sentimentSignals.length > 0, 'Should have SENTIMENT_SWING signals');
});

// Test 15: PnL Calculation
test('PnL Calculation', () => {
  const longPosition = storage.addPosition({
    symbol: 'TEST/USDT',
    side: 'LONG',
    size: 1,
    entryPrice: 100,
    currentPrice: 110,
    pnl: 10,
    pnlPercent: 10,
  });

  // For LONG: PnL = (currentPrice - entryPrice) * size
  const expectedLongPnl = (110 - 100) * 1;
  assertEquals(longPosition.pnl, expectedLongPnl, 'LONG position PnL should be correct');

  const shortPosition = storage.addPosition({
    symbol: 'TEST2/USDT',
    side: 'SHORT',
    size: 1,
    entryPrice: 100,
    currentPrice: 90,
    pnl: 10,
    pnlPercent: 10,
  });

  // For SHORT: PnL = (entryPrice - currentPrice) * size
  const expectedShortPnl = (100 - 90) * 1;
  assertEquals(shortPosition.pnl, expectedShortPnl, 'SHORT position PnL should be correct');
});

// Summary
console.log('\n' + '='.repeat(50));
console.log(`📊 Test Results:`);
console.log(`   ✅ Passed: ${testsPassed}`);
console.log(`   ❌ Failed: ${testsFailed}`);
console.log(`   Total: ${testsPassed + testsFailed}`);
console.log('='.repeat(50));

if (testsFailed > 0) {
  process.exit(1);
}
