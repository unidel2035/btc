/**
 * Telegram Bot Example
 *
 * This example demonstrates how to set up and use the Telegram Bot
 * for remote trading bot control and monitoring.
 *
 * Prerequisites:
 * 1. Create a bot with @BotFather on Telegram
 * 2. Get your bot token
 * 3. Get your Telegram user ID (use @userinfobot)
 * 4. Set environment variables:
 *    - TELEGRAM_BOT_TOKEN
 *    - TELEGRAM_USER_ID
 *    - TELEGRAM_PIN_CODE (optional)
 */

import dotenv from 'dotenv';
import { TelegramBot } from '../src/telegram/index.js';
import type { TelegramBotConfig } from '../src/telegram/index.js';
import { PaperTradingEngine } from '../src/trading/paper/PaperTradingEngine.js';
import { ScreeningModule } from '../src/analyzers/screening/ScreeningModule.js';

dotenv.config();

async function main() {
  console.log('🚀 Starting Telegram Bot Example\n');

  // Validate environment variables
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const userId = process.env.TELEGRAM_USER_ID;

  if (!botToken || !userId) {
    console.error('❌ Missing required environment variables:');
    console.error('   - TELEGRAM_BOT_TOKEN');
    console.error('   - TELEGRAM_USER_ID');
    console.error('\nPlease set them in your .env file or environment.');
    process.exit(1);
  }

  // Bot configuration
  const config: TelegramBotConfig = {
    token: botToken,
    whitelist: [parseInt(userId, 10)], // Only allow your user ID
    pinCode: process.env.TELEGRAM_PIN_CODE || '1234', // PIN for critical operations
    rateLimit: {
      maxCommands: 10, // Max 10 commands
      windowMs: 60 * 1000, // Per 60 seconds
    },
    features: {
      trading: true, // Enable trading control
      positions: true, // Enable position management
      screening: true, // Enable screening results
      notifications: true, // Enable notifications
    },
  };

  console.log('📋 Bot Configuration:');
  console.log(`   Whitelist: ${config.whitelist.join(', ')}`);
  console.log(`   PIN Required: ${config.pinCode ? 'Yes' : 'No'}`);
  console.log(`   Rate Limit: ${config.rateLimit.maxCommands} commands / ${config.rateLimit.windowMs / 1000}s`);
  console.log('');

  // Initialize trading engine (paper trading)
  console.log('💰 Initializing Paper Trading Engine...');
  const tradingEngine = new PaperTradingEngine({
    initialBalance: 10000,
    currency: 'USDT',
    fees: {
      maker: 0.1,
      taker: 0.1,
    },
    slippage: 0.05,
    allowShorts: true,
    maxPositions: 5,
  });

  // Update some market prices for testing
  tradingEngine.updateMarketPrice('BTC/USDT', 50000);
  tradingEngine.updateMarketPrice('ETH/USDT', 3000);
  tradingEngine.updateMarketPrice('RNDR/USDT', 2.50);

  // Open a test position
  console.log('📈 Opening test position...');
  const testOrder = tradingEngine.placeMarketOrder('BTC/USDT', 'buy' as any, 0.1);
  if (testOrder) {
    console.log(`   ✅ Test position opened: ${testOrder.symbol}`);
  }

  // Initialize screening module (optional)
  let screeningModule: ScreeningModule | undefined;
  if (process.env.COINGECKO_API_KEY) {
    console.log('🔍 Initializing Screening Module...');
    screeningModule = new ScreeningModule(process.env.COINGECKO_API_KEY);
    console.log('   ✅ Screening module ready');
  } else {
    console.log('⚠️  Screening module disabled (no CoinGecko API key)');
  }

  console.log('');

  // Create and start the bot
  console.log('🤖 Creating Telegram Bot...');
  const bot = new TelegramBot(
    config,
    tradingEngine,
    screeningModule,
  );

  console.log('');
  console.log('═'.repeat(60));
  console.log('🎉 Telegram Bot is starting!');
  console.log('═'.repeat(60));
  console.log('');
  console.log('📱 Open Telegram and send /start to your bot');
  console.log('');
  console.log('Available commands:');
  console.log('   /status - Check bot status');
  console.log('   /balance - View balance');
  console.log('   /positions - See open positions');
  console.log('   /pnl - Check profit & loss');
  console.log('   /signals - View trading signals');
  console.log('   /screening - Run screening analysis');
  console.log('   /start_trading - Start automated trading');
  console.log('   /stop_trading - Stop automated trading');
  console.log('   /close_position <symbol> - Close a position');
  console.log('   /settings - Manage notification settings');
  console.log('   /help - Show all commands');
  console.log('');
  console.log('Press Ctrl+C to stop the bot');
  console.log('');

  await bot.start();

  // Simulate some trading events for demonstration
  setTimeout(async () => {
    console.log('\n📢 Sending test notification: Position opened');
    await bot.notifyPositionOpened({
      symbol: 'BTC/USDT',
      side: 'long',
      entryPrice: 50000,
      quantity: 0.1,
      value: 5000,
      stopLoss: 48000,
      takeProfit: 55000,
    });
  }, 5000);

  setTimeout(async () => {
    console.log('📢 Sending test notification: Position closed');
    await bot.notifyPositionClosed({
      symbol: 'BTC/USDT',
      side: 'long',
      entryPrice: 50000,
      exitPrice: 52000,
      quantity: 0.1,
      pnl: 200,
      pnlPercent: 4.0,
      duration: 3600000, // 1 hour
    });
  }, 10000);
}

// Run the example
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
