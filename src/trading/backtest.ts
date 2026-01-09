import { config } from 'dotenv';
import { BacktestEngine, CSVDataLoader, MockDataLoader } from './backtest/index.js';
import { Visualizer } from './backtest/Visualizer.js';
import type { BacktestConfig } from './backtest/types.js';
import { NewsMomentumStrategy, SentimentSwingStrategy } from './strategies/index.js';
import type { Strategy } from './strategies/types.js';

config();

/**
 * Parse command-line arguments
 */
function parseArguments(): {
  strategy: string;
  symbol: string | string[];
  from: string;
  to: string;
  params?: Record<string, unknown>;
  dataSource: 'csv' | 'binance' | 'parquet' | 'custom' | 'mock';
  initialCapital: number;
  timeframe: string;
} {
  const args = process.argv.slice(2);

  const strategy =
    args.find((arg) => arg.startsWith('--strategy='))?.split('=')[1] ?? 'news-momentum';

  const symbolArg = args.find((arg) => arg.startsWith('--symbol='))?.split('=')[1];
  const symbolsArg = args.find((arg) => arg.startsWith('--symbols='))?.split('=')[1];

  let symbol: string | string[];
  if (symbolsArg) {
    symbol = symbolsArg.split(',');
  } else {
    symbol = symbolArg ?? 'BTCUSDT';
  }

  const from = args.find((arg) => arg.startsWith('--from='))?.split('=')[1] ?? '2024-01-01';
  const to = args.find((arg) => arg.startsWith('--to='))?.split('=')[1] ?? '2024-12-31';

  const paramsArg = args.find((arg) => arg.startsWith('--params='))?.split('=')[1];
  const params = paramsArg ? (JSON.parse(paramsArg) as Record<string, unknown>) : undefined;

  const dataSource =
    (args.find((arg) => arg.startsWith('--data='))?.split('=')[1] as
      | 'csv'
      | 'binance'
      | 'parquet'
      | 'custom'
      | 'mock'
      | undefined) ?? 'mock';

  const capitalArg = args.find((arg) => arg.startsWith('--capital='))?.split('=')[1];
  const initialCapital = capitalArg ? parseFloat(capitalArg) : 10000;

  const timeframe = args.find((arg) => arg.startsWith('--timeframe='))?.split('=')[1] ?? '1h';

  return { strategy, symbol, from, to, params, dataSource, initialCapital, timeframe };
}

/**
 * Create strategy instance based on name
 */
function createStrategy(name: string, params?: Record<string, unknown>): Strategy {
  switch (name.toLowerCase()) {
    case 'news-momentum':
      return new NewsMomentumStrategy(params);

    case 'sentiment-swing':
      return new SentimentSwingStrategy(params);

    default:
      throw new Error(`Unknown strategy: ${name}. Available: news-momentum, sentiment-swing`);
  }
}

/**
 * Print usage information
 */
function printUsage(): void {
  console.log(`
Usage: npm run backtest [options]

Options:
  --strategy=<name>        Strategy to backtest (news-momentum, sentiment-swing)
  --symbol=<symbol>        Trading symbol (e.g., BTCUSDT)
  --symbols=<s1,s2,s3>     Multiple symbols (comma-separated)
  --from=<date>            Start date (YYYY-MM-DD)
  --to=<date>              End date (YYYY-MM-DD)
  --params='<json>'        Strategy parameters as JSON
  --data=<source>          Data source (csv, mock) [default: mock]
  --capital=<amount>       Initial capital [default: 10000]
  --timeframe=<tf>         Candle timeframe (1m, 5m, 15m, 1h, 4h, 1d) [default: 1h]

Examples:
  # Simple run with mock data
  npm run backtest --strategy=news-momentum --symbol=BTCUSDT --from=2024-01-01 --to=2024-12-31

  # With custom parameters
  npm run backtest --strategy=sentiment-swing --params='{"threshold": 0.7}'

  # Multiple symbols
  npm run backtest --strategy=news-momentum --symbols=BTCUSDT,ETHUSDT,SOLUSDT

  # With CSV data
  npm run backtest --strategy=news-momentum --data=csv --symbol=BTCUSDT

  # Custom capital and timeframe
  npm run backtest --strategy=news-momentum --capital=50000 --timeframe=4h
  `);
}

/**
 * Main backtest function
 */
async function runBacktest(): Promise<void> {
  // Check for help flag
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    return;
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('           BACKTESTING ENGINE');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Parse arguments
    const args = parseArguments();
    console.log('📋 Configuration:');
    console.log(`   Strategy: ${args.strategy}`);
    console.log(
      `   Symbol(s): ${Array.isArray(args.symbol) ? args.symbol.join(', ') : args.symbol}`,
    );
    console.log(`   Period: ${args.from} to ${args.to}`);
    console.log(`   Initial Capital: $${args.initialCapital.toLocaleString()}`);
    console.log(`   Data Source: ${args.dataSource}`);
    console.log(`   Timeframe: ${args.timeframe}`);
    if (args.params) {
      console.log(`   Params: ${JSON.stringify(args.params)}`);
    }
    console.log();

    // Create strategy
    const strategy = createStrategy(args.strategy, args.params);

    // Create data loader
    const dataLoader =
      args.dataSource === 'csv' ? new CSVDataLoader('./data') : new MockDataLoader(50000, 0.02);

    // Create backtest config
    const config: BacktestConfig = {
      symbol: args.symbol,
      startDate: new Date(args.from),
      endDate: new Date(args.to),
      initialCapital: args.initialCapital,
      strategyName: args.strategy,
      strategyParams: args.params,
      fees: {
        maker: 0.1, // 0.1%
        taker: 0.1, // 0.1%
      },
      slippage: 0.05, // 0.05%
      maxPositionSize: 10, // 10% max per trade
      allowShorts: false,
      timeframe: args.timeframe,
      dataSource: args.dataSource,
    };

    // Create and run backtest
    const engine = new BacktestEngine(config, strategy, dataLoader);
    const result = await engine.run();

    // Display results
    Visualizer.printSummary(result);
    Visualizer.printEquityCurve(result.equityCurve);
    Visualizer.printDrawdownChart(result.equityCurve);
    Visualizer.printMonthlyReturns(result);
    Visualizer.printTradeDistribution(result.trades);

    // Export results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const symbolStr = Array.isArray(args.symbol) ? args.symbol.join('-') : args.symbol;
    const jsonFile = `./results/backtest_${args.strategy}_${symbolStr}_${timestamp}.json`;
    const csvFile = `./results/backtest_${args.strategy}_${symbolStr}_${timestamp}.csv`;

    console.log('\n📁 Exporting results...');
    try {
      await Visualizer.exportToJSON(result, jsonFile);
      await Visualizer.exportToCSV(result, csvFile);
    } catch (exportError) {
      console.warn('⚠️  Could not export results (results directory may not exist)');
      console.warn('   Create ./results directory to enable exports');
    }

    console.log('\n✅ Backtesting completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error running backtest:');
    console.error(error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the backtest
try {
  await runBacktest();
} catch (error) {
  console.error('Fatal error:', error);
  process.exit(1);
}
