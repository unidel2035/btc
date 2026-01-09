#!/usr/bin/env node
/**
 * Paper Trading CLI
 * Command-line interface for paper trading mode
 */

import { config } from 'dotenv';
import {
  PaperTradingEngine,
  PaperTradingConfig,
  TradingMode,
  OrderType,
  OrderSide,
  ModeSwitcher,
} from './paper/index.js';

// Load environment variables
config();

/**
 * Parse command-line arguments
 */
function parseArgs(): {
  mode: TradingMode;
  balance: number;
  fees: number;
  slippage: number;
  dataSource: 'binance' | 'mock';
  help: boolean;
} {
  const args = process.argv.slice(2);
  const result: {
    mode: TradingMode;
    balance: number;
    fees: number;
    slippage: number;
    dataSource: 'binance' | 'mock';
    help: boolean;
  } = {
    mode: TradingMode.PAPER,
    balance: 10000,
    fees: 0.001, // 0.1%
    slippage: 0.0005, // 0.05%
    dataSource: 'mock',
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--mode') {
      const mode = args[++i];
      if (mode === 'paper' || mode === 'live') {
        result.mode = mode as TradingMode;
      }
    } else if (arg === '--balance') {
      const val = args[++i];
      if (val) result.balance = parseFloat(val) || 10000;
    } else if (arg === '--fees') {
      const val = args[++i];
      if (val) result.fees = parseFloat(val) || 0.001;
    } else if (arg === '--slippage') {
      const val = args[++i];
      if (val) result.slippage = parseFloat(val) || 0.0005;
    } else if (arg === '--data-source') {
      const source = args[++i];
      if (source === 'binance' || source === 'mock') {
        result.dataSource = source as 'binance' | 'mock';
      }
    }
  }

  return result;
}

/**
 * Display help message
 */
function displayHelp(): void {
  console.info(`
╔═══════════════════════════════════════════════════════════════╗
║              BTC Trading Bot - Paper Trading Mode            ║
╚═══════════════════════════════════════════════════════════════╝

Usage:
  npm run start -- --mode=paper [options]

Options:
  --mode <mode>          Trading mode: 'paper' or 'live' (default: paper)
  --balance <amount>     Initial balance in USD (default: 10000)
  --fees <percent>       Trading fees as decimal (default: 0.001 = 0.1%)
  --slippage <percent>   Slippage as decimal (default: 0.0005 = 0.05%)
  --data-source <source> Data source: 'mock' or 'binance' (default: mock)
  --help, -h            Display this help message

Examples:
  # Start in paper mode with default settings
  npm run start -- --mode=paper

  # Start with custom balance
  npm run start -- --mode=paper --balance=50000

  # Start with real Binance data feed
  npm run start -- --mode=paper --data-source=binance

  # Start with custom fees and slippage
  npm run start -- --mode=paper --fees=0.0015 --slippage=0.001

Environment Variables:
  PAPER_TRADING=true           Enable paper trading mode
  PAPER_INITIAL_BALANCE=10000  Initial balance for paper trading
  PAPER_FEES=0.001            Trading fees (maker/taker)
  PAPER_SLIPPAGE=0.0005       Slippage percentage

Features:
  ✓ Virtual balance simulation
  ✓ Realistic order execution
  ✓ Real-time market data feed
  ✓ Fee and slippage simulation
  ✓ Comprehensive statistics
  ✓ Risk management integration
  ✓ Strategy testing without risk

Mode Switching:
  When switching between paper and live modes, you will be shown
  warnings and asked for confirmation if switching to live mode.

Press Ctrl+C to stop the trading bot.
`);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    displayHelp();
    return;
  }

  console.info('╔═══════════════════════════════════════════════════════════════╗');
  console.info('║              BTC Trading Bot - Paper Trading Mode            ║');
  console.info('╚═══════════════════════════════════════════════════════════════╝');
  console.info('');

  // Display mode
  console.info(`Mode: ${ModeSwitcher.formatMode(args.mode)}`);

  if (args.mode === TradingMode.LIVE) {
    // Show warnings for live mode
    const warning = ModeSwitcher.generateWarnings(
      TradingMode.PAPER,
      TradingMode.LIVE,
      false,
      false,
    );
    ModeSwitcher.displayWarnings(warning);
    console.error('⚠️  Live trading mode is not yet implemented');
    console.error('⚠️  Please use paper trading mode for now');
    process.exit(1);
  }

  // Create paper trading configuration
  const paperConfig: PaperTradingConfig = {
    mode: args.mode,
    initialBalance: args.balance,
    fees: {
      maker: args.fees,
      taker: args.fees,
    },
    slippage: args.slippage,
    dataSource: args.dataSource,
    maxPositionSize: 10, // 10% max position size
    maxPositions: 5, // max 5 concurrent positions
  };

  // Create and start paper trading engine
  const engine = new PaperTradingEngine(paperConfig);

  try {
    await engine.start();

    // Subscribe to BTC market data
    engine.subscribeToMarketData('BTCUSDT');

    console.info('');
    console.info('✅ Paper trading engine is running');
    console.info('✅ Subscribed to BTCUSDT market data');
    console.info('');
    console.info('Available commands:');
    console.info('  - Press "s" to show statistics');
    console.info('  - Press "b" to show balance');
    console.info('  - Press "o" to show orders');
    console.info('  - Press "p" to show positions');
    console.info('  - Press "q" or Ctrl+C to quit');
    console.info('');

    // Example: Place a test order after 5 seconds
    setTimeout(() => {
      console.info('\n📝 Placing test order...');
      const order = engine.placeOrder({
        symbol: 'BTCUSDT',
        type: OrderType.MARKET,
        side: OrderSide.BUY,
        quantity: 0.01,
        strategyName: 'test',
        reason: 'Test order',
      });

      if ('error' in order) {
        console.error(`❌ Order failed: ${order.error}`);
      } else {
        console.info(`✅ Order placed: ${order.id}`);
      }
    }, 5000);

    // Print statistics every 30 seconds
    setInterval(() => {
      engine.printStats();
    }, 30000);

    // Keep the process running
    await new Promise(() => {
      // This promise never resolves, keeping the process alive
    });
  } catch (error) {
    console.error('❌ Error running paper trading engine:', error);
    await engine.stop();
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.info('\n\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.info('\n\n🛑 Shutting down gracefully...');
  process.exit(0);
});

// Run the CLI
main().catch((error: Error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
