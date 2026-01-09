import type { PaperTradingConfig } from './types.js';
import { TradingMode } from './types.js';

/**
 * Load paper trading configuration from environment variables
 */
export function loadPaperTradingConfig(): PaperTradingConfig {
  const mode =
    process.env.TRADING_MODE?.toLowerCase() === 'live' ? TradingMode.LIVE : TradingMode.PAPER;

  const config: PaperTradingConfig = {
    mode,
    initialBalance: parseFloat(process.env.PAPER_INITIAL_BALANCE || '10000'),
    currency: process.env.PAPER_CURRENCY || 'USDT',
    fees: {
      maker: parseFloat(process.env.PAPER_MAKER_FEE || '0.1'),
      taker: parseFloat(process.env.PAPER_TAKER_FEE || '0.1'),
    },
    slippage: parseFloat(process.env.PAPER_SLIPPAGE || '0.05'),
    allowShorts: process.env.PAPER_ALLOW_SHORTS !== 'false',
    maxPositions: parseInt(process.env.PAPER_MAX_POSITIONS || '5', 10),
    marketDataSource: (process.env.PAPER_MARKET_DATA_SOURCE as any) || 'binance',
  };

  return config;
}

/**
 * Parse CLI arguments for paper trading
 */
export function parseCLIArgs(): Partial<PaperTradingConfig> {
  const args = process.argv.slice(2);
  const config: Partial<PaperTradingConfig> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    if (arg === '--mode') {
      const nextArg = args[i + 1];
      if (nextArg) {
        config.mode = nextArg.toLowerCase() === 'live' ? TradingMode.LIVE : TradingMode.PAPER;
        i++;
      }
    } else if (arg.startsWith('--mode=')) {
      const value = arg.split('=')[1];
      if (value) {
        config.mode = value.toLowerCase() === 'live' ? TradingMode.LIVE : TradingMode.PAPER;
      }
    } else if (arg === '--balance') {
      const nextArg = args[i + 1];
      if (nextArg) {
        config.initialBalance = parseFloat(nextArg);
        i++;
      }
    } else if (arg.startsWith('--balance=')) {
      const value = arg.split('=')[1];
      if (value) {
        config.initialBalance = parseFloat(value);
      }
    } else if (arg === '--slippage') {
      const nextArg = args[i + 1];
      if (nextArg) {
        config.slippage = parseFloat(nextArg);
        i++;
      }
    } else if (arg.startsWith('--slippage=')) {
      const value = arg.split('=')[1];
      if (value) {
        config.slippage = parseFloat(value);
      }
    } else if (arg === '--fees') {
      const nextArg = args[i + 1];
      if (nextArg) {
        const fee = parseFloat(nextArg);
        config.fees = { maker: fee, taker: fee };
        i++;
      }
    } else if (arg.startsWith('--fees=')) {
      const value = arg.split('=')[1];
      if (value) {
        const fee = parseFloat(value);
        config.fees = { maker: fee, taker: fee };
      }
    }
  }

  return config;
}

/**
 * Merge configurations with priority: CLI > Environment > Defaults
 */
export function mergeConfigs(
  envConfig: PaperTradingConfig,
  cliConfig: Partial<PaperTradingConfig>,
): PaperTradingConfig {
  return {
    ...envConfig,
    ...cliConfig,
    fees: {
      ...envConfig.fees,
      ...(cliConfig.fees || {}),
    },
  };
}

/**
 * Validate mode switching and show warnings
 */
export function validateModeSwitch(config: PaperTradingConfig): void {
  if (config.mode === TradingMode.LIVE) {
    console.warn('\n⚠️  WARNING: LIVE TRADING MODE ENABLED ⚠️');
    console.warn('   Real money will be used for trading!');
    console.warn('   Make sure you have configured API keys correctly.');
    console.warn('   Double-check your risk management settings.\n');

    // Additional safety check
    if (process.env.PAPER_TRADING === 'true') {
      console.error('❌ ERROR: Conflicting configuration detected!');
      console.error('   PAPER_TRADING=true but mode is set to LIVE');
      console.error('   Please fix your configuration.\n');
      throw new Error('Conflicting trading mode configuration');
    }

    // Require explicit confirmation
    const explicitLiveMode =
      process.env.TRADING_MODE?.toLowerCase() === 'live' || process.argv.includes('--mode=live');

    if (!explicitLiveMode) {
      console.error('❌ ERROR: Live trading mode requires explicit confirmation');
      console.error(
        '   Use --mode=live CLI argument or set TRADING_MODE=live environment variable\n',
      );
      throw new Error('Live trading mode requires explicit confirmation');
    }
  } else {
    console.log('\n📄 Paper Trading Mode');
    console.log('   Simulated trading with virtual balance');
    console.log('   No real money will be used');
    console.log('   Safe for testing strategies\n');
  }
}

/**
 * Display configuration summary
 */
export function displayConfigSummary(config: PaperTradingConfig): void {
  console.log('Configuration Summary:');
  console.log(`  Mode: ${config.mode.toUpperCase()}`);
  console.log(`  Initial Balance: ${config.initialBalance} ${config.currency}`);
  console.log(`  Fees: ${config.fees.maker}% maker / ${config.fees.taker}% taker`);
  console.log(`  Slippage: ${config.slippage}%`);
  console.log(`  Max Positions: ${config.maxPositions}`);
  console.log(`  Allow Shorts: ${config.allowShorts ? 'Yes' : 'No'}`);
  console.log(`  Market Data: ${config.marketDataSource}\n`);
}
