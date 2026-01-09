/**
 * Paper Trading Example
 * Demonstrates how to use the paper trading engine
 */

import {
  PaperTradingEngine,
  PaperTradingConfig,
  TradingMode,
  OrderType,
  OrderSide,
  ModeSwitcher,
} from '../src/trading/paper/index.js';

async function main(): Promise<void> {
  console.info('╔═══════════════════════════════════════════════════════════════╗');
  console.info('║           Paper Trading Engine - Example Usage               ║');
  console.info('╚═══════════════════════════════════════════════════════════════╝');
  console.info('');

  // Example 1: Basic Paper Trading Setup
  console.info('📝 Example 1: Basic Paper Trading Setup');
  console.info('─'.repeat(60));

  const config: PaperTradingConfig = {
    mode: TradingMode.PAPER,
    initialBalance: 10000,
    fees: {
      maker: 0.001, // 0.1%
      taker: 0.001, // 0.1%
    },
    slippage: 0.0005, // 0.05%
    dataSource: 'mock',
    maxPositionSize: 10, // 10% max position size
    maxPositions: 5, // max 5 concurrent positions
  };

  const engine = new PaperTradingEngine(config);

  // Start the engine
  await engine.start();

  // Subscribe to market data
  engine.subscribeToMarketData('BTCUSDT');

  console.info('✅ Paper trading engine started');
  console.info(`✅ Mode: ${ModeSwitcher.formatMode(engine.getMode())}`);
  console.info('');

  // Wait for market data to initialize
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Example 2: Place Market Orders
  console.info('📝 Example 2: Place Market Orders');
  console.info('─'.repeat(60));

  const buyOrder = engine.placeOrder({
    symbol: 'BTCUSDT',
    type: OrderType.MARKET,
    side: OrderSide.BUY,
    quantity: 0.1,
    strategyName: 'example-strategy',
    reason: 'Test buy order',
  });

  if ('error' in buyOrder) {
    console.error(`❌ Buy order failed: ${buyOrder.error}`);
  } else {
    console.info(`✅ Buy order placed: ${buyOrder.id}`);
    console.info(`   Symbol: ${buyOrder.symbol}`);
    console.info(`   Quantity: ${buyOrder.quantity}`);
    console.info(`   Status: ${buyOrder.status}`);
  }

  console.info('');

  // Example 3: Check Balance
  console.info('📝 Example 3: Check Balance');
  console.info('─'.repeat(60));

  const balance = engine.getBalance();
  console.info(`💰 Balance Information:`);
  console.info(`   Cash: $${balance.cash.toFixed(2)}`);
  console.info(`   Equity: $${balance.equity.toFixed(2)}`);
  console.info(`   Open Positions: ${balance.positions.length}`);
  console.info(`   Unrealized P&L: $${balance.unrealizedPnL.toFixed(2)}`);
  console.info(`   Realized P&L: $${balance.realizedPnL.toFixed(2)}`);
  console.info('');

  // Example 4: View Positions
  console.info('📝 Example 4: View Open Positions');
  console.info('─'.repeat(60));

  if (balance.positions.length > 0) {
    balance.positions.forEach((position, index) => {
      console.info(`Position ${index + 1}:`);
      console.info(`   ID: ${position.id}`);
      console.info(`   Symbol: ${position.symbol}`);
      console.info(`   Side: ${position.side}`);
      console.info(`   Entry Price: $${position.entryPrice.toFixed(2)}`);
      console.info(`   Current Price: $${position.currentPrice.toFixed(2)}`);
      console.info(`   Quantity: ${position.quantity}`);
      console.info(`   Market Value: $${position.marketValue.toFixed(2)}`);
      console.info(`   Unrealized P&L: $${position.unrealizedPnL.toFixed(2)} (${position.unrealizedPnLPercent.toFixed(2)}%)`);
      console.info('');
    });
  } else {
    console.info('No open positions');
    console.info('');
  }

  // Example 5: Wait and let prices update
  console.info('📝 Example 5: Monitoring Position Updates');
  console.info('─'.repeat(60));
  console.info('Waiting 10 seconds for price updates...');

  await new Promise((resolve) => setTimeout(resolve, 10000));

  const updatedBalance = engine.getBalance();
  if (updatedBalance.positions.length > 0) {
    const position = updatedBalance.positions[0];
    console.info(`Position Update:`);
    console.info(`   Current Price: $${position.currentPrice.toFixed(2)}`);
    console.info(`   Unrealized P&L: $${position.unrealizedPnL.toFixed(2)} (${position.unrealizedPnLPercent.toFixed(2)}%)`);
  }
  console.info('');

  // Example 6: Close Position
  if (balance.positions.length > 0) {
    console.info('📝 Example 6: Close Position');
    console.info('─'.repeat(60));

    const positionToClose = balance.positions[0];
    const closeOrder = engine.closePosition({
      positionId: positionToClose.id,
      reason: 'Example close',
    });

    if ('error' in closeOrder) {
      console.error(`❌ Close order failed: ${closeOrder.error}`);
    } else {
      console.info(`✅ Close order placed: ${closeOrder.id}`);
    }
    console.info('');

    // Wait for order execution
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Example 7: View Statistics
  console.info('📝 Example 7: View Statistics');
  console.info('─'.repeat(60));

  engine.printStats();
  console.info('');

  // Example 8: View Orders and Trades
  console.info('📝 Example 8: View Orders and Trades');
  console.info('─'.repeat(60));

  const orders = engine.getOrders();
  console.info(`Total Orders: ${orders.length}`);
  console.info(`Pending Orders: ${engine.getPendingOrders().length}`);
  console.info(`Filled Orders: ${engine.getFilledOrders().length}`);

  const trades = engine.getTrades();
  console.info(`Total Trades: ${trades.length}`);

  if (trades.length > 0) {
    console.info('\nRecent Trades:');
    trades.slice(-3).forEach((trade, index) => {
      console.info(`  ${index + 1}. ${trade.side} ${trade.quantity} ${trade.symbol} @ $${trade.executedPrice.toFixed(2)}`);
      console.info(`     Fees: $${trade.fees.toFixed(2)} | Slippage: $${trade.slippage.toFixed(2)}`);
    });
  }
  console.info('');

  // Example 9: Mode Switch Warning
  console.info('📝 Example 9: Mode Switch Warning Demo');
  console.info('─'.repeat(60));

  const hasOpenPositions = engine.getBalance().positions.length > 0;
  const hasPendingOrders = engine.getPendingOrders().length > 0;

  const warning = ModeSwitcher.generateWarnings(
    TradingMode.PAPER,
    TradingMode.LIVE,
    hasOpenPositions,
    hasPendingOrders,
  );

  ModeSwitcher.displayWarnings(warning);

  const actions = ModeSwitcher.getRecommendedActions(
    TradingMode.LIVE,
    hasOpenPositions,
    hasPendingOrders,
  );

  console.info('Recommended Actions Before Switching:');
  actions.forEach((action) => {
    console.info(`  ${action}`);
  });
  console.info('');

  // Stop the engine
  console.info('🛑 Stopping paper trading engine...');
  await engine.stop();
  console.info('✅ Paper trading engine stopped');
  console.info('');

  console.info('╔═══════════════════════════════════════════════════════════════╗');
  console.info('║                    Example Complete!                          ║');
  console.info('╚═══════════════════════════════════════════════════════════════╝');
}

// Run the example
main().catch((error: Error) => {
  console.error('❌ Error running example:', error);
  process.exit(1);
});
