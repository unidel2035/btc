/**
 * TradingView Webhook Examples
 * Demonstrates how to use the webhook integration
 */

import { WebhookService } from '../src/webhooks/WebhookService.js';
import type { WebhookConfig, TradingViewWebhookPayload } from '../src/webhooks/types.js';

// Example webhook configuration
const exampleConfig: WebhookConfig = {
  secretKey: 'example-secret-key-12345',
  enableIpWhitelist: false,
  allowedIps: [],
  enableSignatureValidation: false,

  autoExecute: true,
  requireManualApproval: false,
  manualApprovalThresholds: {
    highRiskPositionUsd: 5000,
    unusualPriceDeviationPercent: 3,
  },

  maxSignalsPerMinute: 60,
  cooldownBetweenSignalsSeconds: 60,
  maxConcurrentWebhookPositions: 10,

  applyStandardRiskChecks: true,
  checkPortfolioLimits: true,
  validateAgainstExistingPositions: true,
  maxPositionSizePercent: 5,

  notifyOnSignalReceived: true,
  notifyOnSignalExecuted: true,
  notifyOnSignalRejected: true,

  supportedTickers: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'],
};

// Initialize webhook service
const webhookService = new WebhookService(exampleConfig);

/**
 * Example 1: Simple Buy Signal
 */
async function exampleSimpleBuySignal() {
  console.log('\n=== Example 1: Simple Buy Signal ===\n');

  const payload: TradingViewWebhookPayload = {
    secret: 'example-secret-key-12345',
    ticker: 'BTCUSDT',
    action: 'buy',
    price: 45000,
  };

  const record = await webhookService.processWebhook(payload);
  console.log('Signal processed:', {
    id: record.id,
    ticker: record.signal.ticker,
    action: record.signal.action,
    price: record.signal.price,
    status: record.status,
  });

  const validation = await webhookService.validateSignal(record.signal, 45100);
  console.log('Validation result:', validation);
}

/**
 * Example 2: Complete Signal with SL/TP
 */
async function exampleCompleteSignal() {
  console.log('\n=== Example 2: Complete Signal with SL/TP ===\n');

  const payload: TradingViewWebhookPayload = {
    secret: 'example-secret-key-12345',
    ticker: 'ETHUSDT',
    action: 'buy',
    price: 2500,
    stop_loss: 2450,
    take_profit: 2600,
    position_size: 3.5,
    confidence: 0.85,
    strategy: 'RSI Oversold Strategy',
    alert_name: 'ETH RSI Buy',
    interval: '4h',
    signal_type: 'momentum',
  };

  const record = await webhookService.processWebhook(payload);
  console.log('Signal processed:', record);

  const validation = await webhookService.validateSignal(record.signal, 2505);
  console.log('Validation result:', validation);

  // Convert to trading signal format
  const tradingSignal = webhookService.convertToTradingSignal(record.signal);
  console.log('Trading signal:', tradingSignal);

  // Convert to market data format
  const marketData = webhookService.convertToMarketData(record.signal);
  console.log('Market data:', marketData);
}

/**
 * Example 3: Short Signal
 */
async function exampleShortSignal() {
  console.log('\n=== Example 3: Short Signal ===\n');

  const payload: TradingViewWebhookPayload = {
    secret: 'example-secret-key-12345',
    ticker: 'BNBUSDT',
    action: 'short',
    price: 350,
    stop_loss: 355,
    take_profit: 340,
    confidence: 0.75,
    strategy: 'Moving Average Crossover',
  };

  const record = await webhookService.processWebhook(payload);
  console.log('Signal processed:', record.signal);

  const validation = await webhookService.validateSignal(record.signal, 350.5);
  console.log('Validation result:', validation);
}

/**
 * Example 4: Close Position Signal
 */
async function exampleCloseSignal() {
  console.log('\n=== Example 4: Close Position Signal ===\n');

  const payload: TradingViewWebhookPayload = {
    secret: 'example-secret-key-12345',
    ticker: 'BTCUSDT',
    action: 'close_long',
    price: 46000,
    strategy: 'Take Profit Hit',
  };

  const record = await webhookService.processWebhook(payload);
  console.log('Signal processed:', record);

  const validation = await webhookService.validateSignal(record.signal, 46050);
  console.log('Validation result:', validation);
}

/**
 * Example 5: Invalid Signal (Price Deviation)
 */
async function exampleInvalidSignal() {
  console.log('\n=== Example 5: Invalid Signal (Price Deviation) ===\n');

  const payload: TradingViewWebhookPayload = {
    secret: 'example-secret-key-12345',
    ticker: 'BTCUSDT',
    action: 'buy',
    price: 50000, // Too far from current price
  };

  const record = await webhookService.processWebhook(payload);
  console.log('Signal processed:', record);

  const validation = await webhookService.validateSignal(record.signal, 45000);
  console.log('Validation result:', validation);

  if (!validation.valid) {
    console.log('Signal rejected due to:', validation.errors);
    webhookService.updateSignalStatus(record.id, 'rejected', {
      rejectionReason: validation.errors.join(', '),
    });
  }
}

/**
 * Example 6: Invalid Signal (Wrong SL/TP)
 */
async function exampleInvalidSLTP() {
  console.log('\n=== Example 6: Invalid Signal (Wrong SL/TP) ===\n');

  const payload: TradingViewWebhookPayload = {
    secret: 'example-secret-key-12345',
    ticker: 'ETHUSDT',
    action: 'buy',
    price: 2500,
    stop_loss: 2550, // SL above entry for long - WRONG!
    take_profit: 2450, // TP below entry for long - WRONG!
  };

  const record = await webhookService.processWebhook(payload);
  const validation = await webhookService.validateSignal(record.signal, 2500);

  console.log('Validation result:', validation);
  if (!validation.valid) {
    console.log('Errors:', validation.errors);
  }
}

/**
 * Example 7: Get Statistics
 */
async function exampleStatistics() {
  console.log('\n=== Example 7: Get Statistics ===\n');

  // Process multiple signals first
  const signals: TradingViewWebhookPayload[] = [
    {
      secret: 'example-secret-key-12345',
      ticker: 'BTCUSDT',
      action: 'buy',
      price: 45000,
      strategy: 'Strategy A',
    },
    {
      secret: 'example-secret-key-12345',
      ticker: 'ETHUSDT',
      action: 'buy',
      price: 2500,
      strategy: 'Strategy B',
    },
    {
      secret: 'example-secret-key-12345',
      ticker: 'BTCUSDT',
      action: 'sell',
      price: 45200,
      strategy: 'Strategy A',
    },
  ];

  for (const payload of signals) {
    await webhookService.processWebhook(payload);
  }

  // Get recent signals
  const recentSignals = webhookService.getRecentSignals(10);
  console.log(`Total signals: ${recentSignals.length}`);

  // Count by status
  const byStatus = recentSignals.reduce(
    (acc, signal) => {
      acc[signal.status] = (acc[signal.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log('Signals by status:', byStatus);

  // Count by ticker
  const byTicker = recentSignals.reduce(
    (acc, signal) => {
      acc[signal.signal.ticker] = (acc[signal.signal.ticker] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log('Signals by ticker:', byTicker);
}

/**
 * Example 8: Configuration Management
 */
async function exampleConfigManagement() {
  console.log('\n=== Example 8: Configuration Management ===\n');

  // Get current config
  const config = webhookService.getConfig();
  console.log('Current config:');
  console.log('- Auto execute:', config.autoExecute);
  console.log('- Max signals per minute:', config.maxSignalsPerMinute);
  console.log('- Supported tickers:', config.supportedTickers);

  // Update config
  webhookService.updateConfig({
    autoExecute: false,
    maxSignalsPerMinute: 30,
  });

  const updatedConfig = webhookService.getConfig();
  console.log('\nUpdated config:');
  console.log('- Auto execute:', updatedConfig.autoExecute);
  console.log('- Max signals per minute:', updatedConfig.maxSignalsPerMinute);

  // Generate new secret key
  const newSecret = webhookService.generateSecretKey();
  console.log('\nNew secret key generated:', newSecret);
}

/**
 * Example 9: Position Size Calculation
 */
async function examplePositionSizing() {
  console.log('\n=== Example 9: Position Size Calculation ===\n');

  const payload: TradingViewWebhookPayload = {
    secret: 'example-secret-key-12345',
    ticker: 'BTCUSDT',
    action: 'buy',
    price: 45000,
    confidence: 0.9, // High confidence
  };

  const record = await webhookService.processWebhook(payload);

  // Calculate position size (if not provided)
  const accountBalance = 10000; // $10,000
  const positionSize = webhookService.calculatePositionSize(record.signal, accountBalance);
  console.log('Calculated position size:', positionSize, '%');

  // Calculate SL/TP (if not provided)
  const stopLoss = webhookService.calculateStopLoss(record.signal);
  const takeProfit = webhookService.calculateTakeProfit(record.signal);
  console.log('Calculated stop loss:', stopLoss);
  console.log('Calculated take profit:', takeProfit);
}

/**
 * Run all examples
 */
async function runExamples() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   TradingView Webhook Integration Examples    ║');
  console.log('╚════════════════════════════════════════════════╝');

  try {
    await exampleSimpleBuySignal();
    await exampleCompleteSignal();
    await exampleShortSignal();
    await exampleCloseSignal();
    await exampleInvalidSignal();
    await exampleInvalidSLTP();
    await exampleStatistics();
    await exampleConfigManagement();
    await examplePositionSizing();

    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  void runExamples();
}

export {
  exampleSimpleBuySignal,
  exampleCompleteSignal,
  exampleShortSignal,
  exampleCloseSignal,
  exampleInvalidSignal,
  exampleInvalidSLTP,
  exampleStatistics,
  exampleConfigManagement,
  examplePositionSizing,
};
