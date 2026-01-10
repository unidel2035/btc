/**
 * WebhookService Unit Tests
 */

import { WebhookService } from '../../src/webhooks/WebhookService.js';
import type { WebhookConfig, TradingViewWebhookPayload } from '../../src/webhooks/types.js';
import { WebhookAction } from '../../src/webhooks/types.js';

const testConfig: WebhookConfig = {
  secretKey: 'test-secret-key',
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

  supportedTickers: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
};

describe('WebhookService', () => {
  let service: WebhookService;

  beforeEach(() => {
    service = new WebhookService(testConfig);
  });

  describe('processWebhook', () => {
    test('should process valid webhook payload', async () => {
      const payload: TradingViewWebhookPayload = {
        secret: 'test-secret-key',
        ticker: 'BTCUSDT',
        action: 'buy',
        price: 45000,
      };

      const record = await service.processWebhook(payload);

      expect(record).toBeDefined();
      expect(record.id).toBeDefined();
      expect(record.signal.ticker).toBe('BTCUSDT');
      expect(record.signal.action).toBe(WebhookAction.BUY);
      expect(record.signal.price).toBe(45000);
      expect(record.status).toBe('received');
    });

    test('should normalize ticker symbols correctly', async () => {
      const testCases = [
        { input: 'BINANCE:BTCUSDT', expected: 'BTCUSDT' },
        { input: 'BTC/USDT', expected: 'BTCUSDT' },
        { input: 'btcusdt', expected: 'BTCUSDT' },
        { input: 'ETHUSDT', expected: 'ETHUSDT' },
      ];

      for (const testCase of testCases) {
        const payload: TradingViewWebhookPayload = {
          secret: 'test-secret-key',
          ticker: testCase.input,
          action: 'buy',
          price: 1000,
        };

        const record = await service.processWebhook(payload);
        expect(record.signal.ticker).toBe(testCase.expected);
      }
    });

    test('should normalize actions correctly', async () => {
      const testCases = [
        { input: 'buy', expected: WebhookAction.BUY },
        { input: 'long', expected: WebhookAction.LONG },
        { input: 'sell', expected: WebhookAction.SELL },
        { input: 'short', expected: WebhookAction.SHORT },
        { input: 'close_long', expected: WebhookAction.CLOSE_LONG },
        { input: 'closelong', expected: WebhookAction.CLOSE_LONG },
      ];

      for (const testCase of testCases) {
        const payload: TradingViewWebhookPayload = {
          secret: 'test-secret-key',
          ticker: 'BTCUSDT',
          action: testCase.input,
          price: 1000,
        };

        const record = await service.processWebhook(payload);
        expect(record.signal.action).toBe(testCase.expected);
      }
    });

    test('should include all optional fields', async () => {
      const payload: TradingViewWebhookPayload = {
        secret: 'test-secret-key',
        ticker: 'ETHUSDT',
        action: 'buy',
        price: 2500,
        stop_loss: 2450,
        take_profit: 2600,
        position_size: 3.5,
        confidence: 0.85,
        strategy: 'Test Strategy',
        alert_name: 'Test Alert',
        interval: '4h',
        volume: 12345,
      };

      const record = await service.processWebhook(payload);

      expect(record.signal.stop_loss).toBe(2450);
      expect(record.signal.take_profit).toBe(2600);
      expect(record.signal.position_size).toBe(3.5);
      expect(record.signal.confidence).toBe(0.85);
      expect(record.signal.strategy).toBe('Test Strategy');
      expect(record.signal.metadata.alert_name).toBe('Test Alert');
      expect(record.signal.metadata.interval).toBe('4h');
      expect(record.signal.metadata.volume).toBe(12345);
    });
  });

  describe('validateSignal', () => {
    test('should validate correct signal', async () => {
      const payload: TradingViewWebhookPayload = {
        secret: 'test-secret-key',
        ticker: 'BTCUSDT',
        action: 'buy',
        price: 45000,
      };

      const record = await service.processWebhook(payload);
      const validation = await service.validateSignal(record.signal, 45100);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject signal with unsupported ticker', async () => {
      const payload: TradingViewWebhookPayload = {
        secret: 'test-secret-key',
        ticker: 'XYZUSDT', // Not in supportedTickers
        action: 'buy',
        price: 100,
      };

      const record = await service.processWebhook(payload);
      const validation = await service.validateSignal(record.signal);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('not supported'))).toBe(true);
    });

    test('should reject signal with excessive price deviation', async () => {
      const payload: TradingViewWebhookPayload = {
        secret: 'test-secret-key',
        ticker: 'BTCUSDT',
        action: 'buy',
        price: 50000,
      };

      const record = await service.processWebhook(payload);
      const validation = await service.validateSignal(record.signal, 45000);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('deviation too high'))).toBe(true);
    });

    test('should reject long signal with invalid stop loss', async () => {
      const payload: TradingViewWebhookPayload = {
        secret: 'test-secret-key',
        ticker: 'BTCUSDT',
        action: 'buy',
        price: 45000,
        stop_loss: 46000, // SL above entry for long
      };

      const record = await service.processWebhook(payload);
      const validation = await service.validateSignal(record.signal);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('Stop loss must be below'))).toBe(true);
    });

    test('should reject long signal with invalid take profit', async () => {
      const payload: TradingViewWebhookPayload = {
        secret: 'test-secret-key',
        ticker: 'BTCUSDT',
        action: 'buy',
        price: 45000,
        take_profit: 44000, // TP below entry for long
      };

      const record = await service.processWebhook(payload);
      const validation = await service.validateSignal(record.signal);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('Take profit must be above'))).toBe(true);
    });

    test('should reject short signal with invalid stop loss', async () => {
      const payload: TradingViewWebhookPayload = {
        secret: 'test-secret-key',
        ticker: 'BTCUSDT',
        action: 'short',
        price: 45000,
        stop_loss: 44000, // SL below entry for short
      };

      const record = await service.processWebhook(payload);
      const validation = await service.validateSignal(record.signal);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('Stop loss must be above'))).toBe(true);
    });

    test('should reject signal with excessive position size', async () => {
      const payload: TradingViewWebhookPayload = {
        secret: 'test-secret-key',
        ticker: 'BTCUSDT',
        action: 'buy',
        price: 45000,
        position_size: 10, // Exceeds max 5%
      };

      const record = await service.processWebhook(payload);
      const validation = await service.validateSignal(record.signal);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('exceeds maximum'))).toBe(true);
    });

    test('should detect duplicate signals', async () => {
      const payload: TradingViewWebhookPayload = {
        secret: 'test-secret-key',
        ticker: 'BTCUSDT',
        action: 'buy',
        price: 45000,
      };

      // Process first signal
      const record1 = await service.processWebhook(payload);
      const validation1 = await service.validateSignal(record1.signal);
      expect(validation1.valid).toBe(true);

      // Process duplicate signal immediately
      const record2 = await service.processWebhook(payload);
      const validation2 = await service.validateSignal(record2.signal);

      expect(validation2.valid).toBe(false);
      expect(validation2.errors.some((e) => e.includes('Duplicate signal'))).toBe(true);
    });
  });

  describe('convertToTradingSignal', () => {
    test('should convert webhook signal to trading signal', async () => {
      const payload: TradingViewWebhookPayload = {
        secret: 'test-secret-key',
        ticker: 'BTCUSDT',
        action: 'buy',
        price: 45000,
        confidence: 0.8,
      };

      const record = await service.processWebhook(payload);
      const tradingSignal = service.convertToTradingSignal(record.signal);

      expect(tradingSignal.id).toBeDefined();
      expect(tradingSignal.type).toBe('technical');
      expect(tradingSignal.sentiment).toBe('bullish');
      expect(tradingSignal.impact).toBe(0.8);
      expect(tradingSignal.source).toContain('tradingview');
    });

    test('should set correct sentiment for buy signals', async () => {
      const payload: TradingViewWebhookPayload = {
        secret: 'test-secret-key',
        ticker: 'BTCUSDT',
        action: 'buy',
        price: 45000,
      };

      const record = await service.processWebhook(payload);
      const tradingSignal = service.convertToTradingSignal(record.signal);

      expect(tradingSignal.sentiment).toBe('bullish');
    });

    test('should set correct sentiment for sell signals', async () => {
      const payload: TradingViewWebhookPayload = {
        secret: 'test-secret-key',
        ticker: 'BTCUSDT',
        action: 'sell',
        price: 45000,
      };

      const record = await service.processWebhook(payload);
      const tradingSignal = service.convertToTradingSignal(record.signal);

      expect(tradingSignal.sentiment).toBe('bearish');
    });
  });

  describe('calculatePositionSize', () => {
    test('should use provided position size', async () => {
      const payload: TradingViewWebhookPayload = {
        secret: 'test-secret-key',
        ticker: 'BTCUSDT',
        action: 'buy',
        price: 45000,
        position_size: 3,
      };

      const record = await service.processWebhook(payload);
      const positionSize = service.calculatePositionSize(record.signal, 10000);

      expect(positionSize).toBe(3);
    });

    test('should calculate position size based on confidence', async () => {
      const payload: TradingViewWebhookPayload = {
        secret: 'test-secret-key',
        ticker: 'BTCUSDT',
        action: 'buy',
        price: 45000,
        confidence: 0.8,
      };

      const record = await service.processWebhook(payload);
      const positionSize = service.calculatePositionSize(record.signal, 10000);

      expect(positionSize).toBeGreaterThan(0);
      expect(positionSize).toBeLessThanOrEqual(testConfig.maxPositionSizePercent);
    });

    test('should cap position size at maximum', async () => {
      const payload: TradingViewWebhookPayload = {
        secret: 'test-secret-key',
        ticker: 'BTCUSDT',
        action: 'buy',
        price: 45000,
        confidence: 1.0, // Very high confidence
      };

      const record = await service.processWebhook(payload);
      const positionSize = service.calculatePositionSize(record.signal, 10000);

      expect(positionSize).toBeLessThanOrEqual(testConfig.maxPositionSizePercent);
    });
  });

  describe('calculateStopLoss', () => {
    test('should use provided stop loss', async () => {
      const payload: TradingViewWebhookPayload = {
        secret: 'test-secret-key',
        ticker: 'BTCUSDT',
        action: 'buy',
        price: 45000,
        stop_loss: 44000,
      };

      const record = await service.processWebhook(payload);
      const stopLoss = service.calculateStopLoss(record.signal);

      expect(stopLoss).toBe(44000);
    });

    test('should calculate stop loss for long positions', async () => {
      const payload: TradingViewWebhookPayload = {
        secret: 'test-secret-key',
        ticker: 'BTCUSDT',
        action: 'buy',
        price: 45000,
      };

      const record = await service.processWebhook(payload);
      const stopLoss = service.calculateStopLoss(record.signal);

      expect(stopLoss).toBeDefined();
      expect(stopLoss).toBeLessThan(45000); // SL should be below entry for long
    });

    test('should calculate stop loss for short positions', async () => {
      const payload: TradingViewWebhookPayload = {
        secret: 'test-secret-key',
        ticker: 'BTCUSDT',
        action: 'short',
        price: 45000,
      };

      const record = await service.processWebhook(payload);
      const stopLoss = service.calculateStopLoss(record.signal);

      expect(stopLoss).toBeDefined();
      expect(stopLoss).toBeGreaterThan(45000); // SL should be above entry for short
    });
  });

  describe('configuration management', () => {
    test('should get configuration', () => {
      const config = service.getConfig();

      expect(config.secretKey).toBe('test-secret-key');
      expect(config.autoExecute).toBe(true);
      expect(config.maxSignalsPerMinute).toBe(60);
    });

    test('should update configuration', () => {
      service.updateConfig({
        autoExecute: false,
        maxSignalsPerMinute: 30,
      });

      const config = service.getConfig();
      expect(config.autoExecute).toBe(false);
      expect(config.maxSignalsPerMinute).toBe(30);
      expect(config.secretKey).toBe('test-secret-key'); // Should remain unchanged
    });

    test('should generate new secret key', () => {
      const secret1 = service.generateSecretKey();
      const secret2 = service.generateSecretKey();

      expect(secret1).toBeDefined();
      expect(secret2).toBeDefined();
      expect(secret1).not.toBe(secret2);
      expect(secret1.length).toBeGreaterThan(20);
    });
  });

  describe('signal history management', () => {
    test('should get signal by ID', async () => {
      const payload: TradingViewWebhookPayload = {
        secret: 'test-secret-key',
        ticker: 'BTCUSDT',
        action: 'buy',
        price: 45000,
      };

      const record = await service.processWebhook(payload);
      const retrieved = service.getSignal(record.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(record.id);
    });

    test('should get recent signals', async () => {
      const payloads = [
        { ticker: 'BTCUSDT', action: 'buy', price: 45000 },
        { ticker: 'ETHUSDT', action: 'sell', price: 2500 },
        { ticker: 'BNBUSDT', action: 'buy', price: 350 },
      ];

      for (const p of payloads) {
        await service.processWebhook({
          secret: 'test-secret-key',
          ...p,
        });
      }

      const recent = service.getRecentSignals(10);
      expect(recent.length).toBeGreaterThanOrEqual(3);
    });

    test('should update signal status', async () => {
      const payload: TradingViewWebhookPayload = {
        secret: 'test-secret-key',
        ticker: 'BTCUSDT',
        action: 'buy',
        price: 45000,
      };

      const record = await service.processWebhook(payload);
      const updated = service.updateSignalStatus(record.id, 'executed', {
        executedAt: new Date(),
        tradeId: 'test-trade-123',
      });

      expect(updated).toBe(true);

      const retrieved = service.getSignal(record.id);
      expect(retrieved?.status).toBe('executed');
      expect(retrieved?.tradeId).toBe('test-trade-123');
    });

    test('should clear old history', async () => {
      const payload: TradingViewWebhookPayload = {
        secret: 'test-secret-key',
        ticker: 'BTCUSDT',
        action: 'buy',
        price: 45000,
      };

      await service.processWebhook(payload);

      const oldDate = new Date(Date.now() + 1000); // Future date
      service.clearHistory(oldDate);

      const recent = service.getRecentSignals(100);
      expect(recent.length).toBe(0);
    });
  });
});

console.log('✅ WebhookService tests defined');
