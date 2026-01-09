/**
 * Paper Trading Example
 * Demonstrates how to use the paper trading engine
 */

import { PaperTradingEngine, OrderSide, TradingMode } from '../src/trading/paper/index.js';

/**
 * Example 1: Basic market orders
 */
function example1BasicMarketOrders(): void {
  console.log('\n📚 Example 1: Basic Market Orders');
  console.log('='.repeat(50));

  const engine = new PaperTradingEngine({
    mode: TradingMode.PAPER,
    initialBalance: 10000,
    currency: 'USDT',
    fees: { maker: 0.1, taker: 0.1 },
    slippage: 0.05,
  });

  // Update market price
  console.log('\n📊 Updating market price: BTCUSDT = $50,000');
  engine.updateMarketPrice('BTCUSDT', 50000);

  // Place buy order
  console.log('\n🛒 Placing BUY order: 0.1 BTC');
  const buyOrder = engine.placeMarketOrder('BTCUSDT', OrderSide.BUY, 0.1);
  console.log(`Order ID: ${buyOrder?.id}`);
  console.log(`Filled at: $${buyOrder?.averagePrice.toFixed(2)}`);
  console.log(`Fees: $${buyOrder?.fees.toFixed(2)}`);

  // Check balance and positions
  const balance = engine.getBalance();
  console.log(`\n💰 Balance after buy:`);
  console.log(`   Available: $${balance.available.toFixed(2)}`);
  console.log(`   Locked: $${balance.locked.toFixed(2)}`);
  console.log(`   Total: $${balance.total.toFixed(2)}`);

  const positions = engine.getPositions();
  console.log(`\n📈 Open Positions: ${positions.length}`);
  positions.forEach((pos) => {
    console.log(`   ${pos.symbol} - ${pos.side.toUpperCase()} ${pos.quantity} @ $${pos.entryPrice.toFixed(2)}`);
  });

  // Simulate price change
  console.log('\n📊 Price increased to $52,000');
  engine.updateMarketPrice('BTCUSDT', 52000);

  // Check unrealized P&L
  const updatedPositions = engine.getPositions();
  console.log(`\n💹 Unrealized P&L:`);
  updatedPositions.forEach((pos) => {
    console.log(
      `   ${pos.symbol}: $${pos.unrealizedPnL?.toFixed(2)} (${pos.unrealizedPnLPercent?.toFixed(2)}%)`,
    );
  });

  // Close position
  console.log('\n💰 Closing position: SELL 0.1 BTC');
  const sellOrder = engine.placeMarketOrder('BTCUSDT', OrderSide.SELL, 0.1);

  // Check trade result
  const trades = engine.getClosedTrades();
  if (trades.length > 0) {
    const trade = trades[trades.length - 1];
    console.log(`\n📊 Trade Result:`);
    console.log(`   Entry: $${trade.entryPrice.toFixed(2)}`);
    console.log(`   Exit: $${trade.exitPrice.toFixed(2)}`);
    console.log(`   P&L: $${trade.pnl.toFixed(2)} (${trade.pnlPercent.toFixed(2)}%)`);
    console.log(`   Fees: $${trade.fees.toFixed(2)}`);
  }

  const finalBalance = engine.getBalance();
  console.log(`\n💰 Final Balance: $${finalBalance.total.toFixed(2)}`);
  console.log(`   Profit: $${(finalBalance.total - 10000).toFixed(2)}`);
}

/**
 * Example 2: Limit orders
 */
function example2LimitOrders(): void {
  console.log('\n\n📚 Example 2: Limit Orders');
  console.log('='.repeat(50));

  const engine = new PaperTradingEngine({ initialBalance: 10000 });

  // Current market price
  console.log('\n📊 Current market price: BTCUSDT = $50,000');
  engine.updateMarketPrice('BTCUSDT', 50000);

  // Place limit buy order below market
  console.log('\n📝 Placing LIMIT BUY order: 0.1 BTC @ $49,000');
  const limitOrder = engine.placeLimitOrder('BTCUSDT', OrderSide.BUY, 0.1, 49000);
  console.log(`Order ID: ${limitOrder?.id}`);
  console.log(`Status: ${limitOrder?.status}`);

  // Price hasn't reached limit yet
  console.log('\n📊 Price drops to $49,500 (still above limit)');
  engine.updateMarketPrice('BTCUSDT', 49500);
  console.log(`Open positions: ${engine.getPositions().length}`);

  // Price reaches limit
  console.log('\n📊 Price drops to $49,000 (limit reached!)');
  engine.updateMarketPrice('BTCUSDT', 49000);
  const positions = engine.getPositions();
  console.log(`Open positions: ${positions.length}`);

  if (positions.length > 0) {
    console.log(`\n✅ Limit order filled!`);
    console.log(`   Position opened: ${positions[0].side.toUpperCase()} ${positions[0].quantity} BTC`);
    console.log(`   Entry price: $${positions[0].entryPrice.toFixed(2)}`);
  }
}

/**
 * Example 3: Stop-Loss and Take-Profit
 */
function example3StopLossTakeProfit(): void {
  console.log('\n\n📚 Example 3: Stop-Loss and Take-Profit');
  console.log('='.repeat(50));

  const engine = new PaperTradingEngine({ initialBalance: 10000 });

  // Open position
  console.log('\n📊 Opening position: BUY 0.1 BTC @ $50,000');
  engine.updateMarketPrice('BTCUSDT', 50000);
  engine.placeMarketOrder('BTCUSDT', OrderSide.BUY, 0.1);

  const positions = engine.getPositions();
  const position = positions[0];

  // Set stop-loss and take-profit
  console.log('\n🛡️ Setting Stop-Loss: $49,000 (-2%)');
  engine.setStopLoss(position.id, 49000);

  console.log('🎯 Setting Take-Profit: $52,000 (+4%)');
  engine.setTakeProfit(position.id, 52000);

  // Scenario 1: Price drops to stop-loss
  console.log('\n📉 Scenario: Price drops to $49,000');
  engine.updateMarketPrice('BTCUSDT', 49000);
  engine.checkStopLossTakeProfit();

  const trades = engine.getClosedTrades();
  if (trades.length > 0) {
    const trade = trades[trades.length - 1];
    console.log(`\n⚠️ Stop-Loss triggered!`);
    console.log(`   Exit reason: ${trade.exitReason}`);
    console.log(`   P&L: $${trade.pnl.toFixed(2)} (${trade.pnlPercent.toFixed(2)}%)`);
  }

  // Reset and try take-profit scenario
  engine.reset();
  console.log('\n\n🔄 Reset engine for Take-Profit scenario');

  engine.updateMarketPrice('BTCUSDT', 50000);
  engine.placeMarketOrder('BTCUSDT', OrderSide.BUY, 0.1);

  const newPositions = engine.getPositions();
  engine.setTakeProfit(newPositions[0].id, 52000);

  console.log('\n📈 Scenario: Price rises to $52,000');
  engine.updateMarketPrice('BTCUSDT', 52000);
  engine.checkStopLossTakeProfit();

  const newTrades = engine.getClosedTrades();
  if (newTrades.length > 0) {
    const trade = newTrades[newTrades.length - 1];
    console.log(`\n🎯 Take-Profit triggered!`);
    console.log(`   Exit reason: ${trade.exitReason}`);
    console.log(`   P&L: $${trade.pnl.toFixed(2)} (${trade.pnlPercent.toFixed(2)}%)`);
  }
}

/**
 * Example 4: Multiple trades and statistics
 */
function example4MultipleTradesStats(): void {
  console.log('\n\n📚 Example 4: Multiple Trades and Statistics');
  console.log('='.repeat(50));

  const engine = new PaperTradingEngine({ initialBalance: 10000 });

  console.log('\n🔄 Executing multiple trades...\n');

  // Trade 1: Win
  console.log('Trade 1: BTCUSDT');
  engine.updateMarketPrice('BTCUSDT', 50000);
  engine.placeMarketOrder('BTCUSDT', OrderSide.BUY, 0.1);
  engine.updateMarketPrice('BTCUSDT', 52000);
  engine.placeMarketOrder('BTCUSDT', OrderSide.SELL, 0.1);
  console.log('  ✅ Closed with profit');

  // Trade 2: Loss
  console.log('\nTrade 2: ETHUSDT');
  engine.updateMarketPrice('ETHUSDT', 3000);
  engine.placeMarketOrder('ETHUSDT', OrderSide.BUY, 1);
  engine.updateMarketPrice('ETHUSDT', 2900);
  engine.placeMarketOrder('ETHUSDT', OrderSide.SELL, 1);
  console.log('  ❌ Closed with loss');

  // Trade 3: Win
  console.log('\nTrade 3: BTCUSDT');
  engine.updateMarketPrice('BTCUSDT', 51000);
  engine.placeMarketOrder('BTCUSDT', OrderSide.BUY, 0.1);
  engine.updateMarketPrice('BTCUSDT', 53000);
  engine.placeMarketOrder('BTCUSDT', OrderSide.SELL, 0.1);
  console.log('  ✅ Closed with profit');

  // Trade 4: Loss
  console.log('\nTrade 4: SOLUSDT');
  engine.updateMarketPrice('SOLUSDT', 100);
  engine.placeMarketOrder('SOLUSDT', OrderSide.BUY, 10);
  engine.updateMarketPrice('SOLUSDT', 95);
  engine.placeMarketOrder('SOLUSDT', OrderSide.SELL, 10);
  console.log('  ❌ Closed with loss');

  // Trade 5: Win
  console.log('\nTrade 5: ETHUSDT');
  engine.updateMarketPrice('ETHUSDT', 2950);
  engine.placeMarketOrder('ETHUSDT', OrderSide.BUY, 1);
  engine.updateMarketPrice('ETHUSDT', 3100);
  engine.placeMarketOrder('ETHUSDT', OrderSide.SELL, 1);
  console.log('  ✅ Closed with profit');

  // Get statistics
  const stats = engine.getStats();

  console.log('\n\n📊 Trading Statistics');
  console.log('='.repeat(50));
  console.log(`Total Trades: ${stats.totalTrades}`);
  console.log(`Winning Trades: ${stats.winningTrades}`);
  console.log(`Losing Trades: ${stats.losingTrades}`);
  console.log(`Win Rate: ${stats.winRate.toFixed(2)}%`);
  console.log(`\nP&L:`);
  console.log(`  Total: $${stats.totalPnL.toFixed(2)} (${stats.totalPnLPercent.toFixed(2)}%)`);
  console.log(`  Average Win: $${stats.averageWin.toFixed(2)}`);
  console.log(`  Average Loss: $${stats.averageLoss.toFixed(2)}`);
  console.log(`  Largest Win: $${stats.largestWin.toFixed(2)}`);
  console.log(`  Largest Loss: $${stats.largestLoss.toFixed(2)}`);
  console.log(`\nMetrics:`);
  console.log(`  Profit Factor: ${stats.profitFactor.toFixed(2)}`);
  console.log(`  Max Drawdown: $${stats.maxDrawdown.toFixed(2)} (${stats.maxDrawdownPercent.toFixed(2)}%)`);
  console.log(`\nCosts:`);
  console.log(`  Total Fees: $${stats.totalFees.toFixed(2)}`);
  console.log(`  Total Slippage: ${stats.totalSlippage.toFixed(2)}%`);
  console.log(`\nBalance:`);
  console.log(`  Start: $${stats.startBalance.toFixed(2)}`);
  console.log(`  Current: $${stats.currentBalance.toFixed(2)}`);
  console.log(`  Equity: $${stats.equity.toFixed(2)}`);

  // Show all trades
  console.log('\n\n📋 Trade History');
  console.log('='.repeat(50));
  const trades = engine.getClosedTrades();
  trades.forEach((trade, index) => {
    const emoji = trade.pnl > 0 ? '✅' : '❌';
    console.log(`\n${emoji} Trade ${index + 1}: ${trade.symbol}`);
    console.log(`   Entry: $${trade.entryPrice.toFixed(2)} at ${trade.entryTime.toISOString()}`);
    console.log(`   Exit: $${trade.exitPrice.toFixed(2)} at ${trade.exitTime.toISOString()}`);
    console.log(`   P&L: $${trade.pnl.toFixed(2)} (${trade.pnlPercent.toFixed(2)}%)`);
    console.log(`   Fees: $${trade.fees.toFixed(2)}`);
  });
}

/**
 * Example 5: Events and monitoring
 */
function example5EventsMonitoring(): void {
  console.log('\n\n📚 Example 5: Events and Monitoring');
  console.log('='.repeat(50));

  const engine = new PaperTradingEngine({ initialBalance: 10000 });

  // Register event listener
  console.log('\n🔔 Registering event listener...\n');
  engine.on((event) => {
    const timestamp = event.timestamp.toISOString();
    console.log(`[${timestamp}] ${event.type.toUpperCase()} - ${event.action}`);

    if (event.type === 'order') {
      const order = event.data as any;
      console.log(`  Order: ${order.side.toUpperCase()} ${order.quantity} ${order.symbol}`);
    } else if (event.type === 'position') {
      if (event.action === 'opened') {
        const position = event.data as any;
        console.log(`  Position: ${position.side.toUpperCase()} ${position.quantity} ${position.symbol}`);
      } else if (event.action === 'closed') {
        const data = event.data as any;
        console.log(`  P&L: $${data.trade.pnl.toFixed(2)}`);
      }
    }
  });

  // Execute some trades
  console.log('🔄 Executing trades...\n');

  engine.updateMarketPrice('BTCUSDT', 50000);
  engine.placeMarketOrder('BTCUSDT', OrderSide.BUY, 0.1);

  engine.updateMarketPrice('BTCUSDT', 51000);
  engine.placeMarketOrder('BTCUSDT', OrderSide.SELL, 0.1);

  console.log('\n✅ Event monitoring complete');
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('🤖 Paper Trading Examples');
  console.log('='.repeat(50));

  try {
    example1BasicMarketOrders();
    example2LimitOrders();
    example3StopLossTakeProfit();
    example4MultipleTradesStats();
    example5EventsMonitoring();

    console.log('\n\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
    process.exit(1);
  }
}

// Run examples
main().catch((error) => {
  console.error('Failed to run examples:', error);
  process.exit(1);
});
