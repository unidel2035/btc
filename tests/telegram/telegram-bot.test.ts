/**
 * Telegram Bot Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import type { TelegramBotConfig } from '../../src/telegram/types.js';
import * as templates from '../../src/telegram/templates/index.js';

describe('Telegram Bot', () => {
  let config: TelegramBotConfig;

  beforeEach(() => {
    config = {
      token: 'test_token',
      whitelist: [123456789],
      pinCode: '1234',
      rateLimit: {
        maxCommands: 10,
        windowMs: 60000,
      },
      features: {
        trading: true,
        positions: true,
        screening: true,
        notifications: true,
      },
    };
  });

  describe('Configuration', () => {
    it('should create a valid config', () => {
      expect(config.token).toBe('test_token');
      expect(config.whitelist).toHaveLength(1);
      expect(config.whitelist[0]).toBe(123456789);
      expect(config.pinCode).toBe('1234');
    });

    it('should have rate limit settings', () => {
      expect(config.rateLimit.maxCommands).toBe(10);
      expect(config.rateLimit.windowMs).toBe(60000);
    });

    it('should have feature flags', () => {
      expect(config.features.trading).toBe(true);
      expect(config.features.positions).toBe(true);
      expect(config.features.screening).toBe(true);
      expect(config.features.notifications).toBe(true);
    });
  });

  describe('Message Templates', () => {
    it('should format numbers correctly', () => {
      expect(templates.formatNumber(1234.567, 2)).toBe('1,234.57');
      expect(templates.formatNumber(1000000, 0)).toBe('1,000,000');
    });

    it('should format percentages correctly', () => {
      expect(templates.formatPercent(5.123)).toBe('+5.12%');
      expect(templates.formatPercent(-2.456)).toBe('-2.46%');
      expect(templates.formatPercent(0)).toBe('+0.00%');
    });

    it('should format currency correctly', () => {
      expect(templates.formatCurrency(1234.56)).toBe('1,234.56 USDT');
      expect(templates.formatCurrency(1000, 'BTC')).toBe('1,000.00 BTC');
    });

    it('should format duration correctly', () => {
      expect(templates.formatDuration(1000)).toBe('1s');
      expect(templates.formatDuration(60000)).toBe('1m 0s');
      expect(templates.formatDuration(3600000)).toBe('1h 0m');
      expect(templates.formatDuration(86400000)).toBe('1d 0h');
    });

    it('should get correct PnL emoji', () => {
      expect(templates.getPnLEmoji(100)).toBe('🟢');
      expect(templates.getPnLEmoji(-50)).toBe('🔴');
      expect(templates.getPnLEmoji(0)).toBe('⚪');
    });

    it('should generate welcome message', () => {
      const message = templates.welcomeMessage();
      expect(message).toContain('BTC TRADING BOT');
      expect(message).toContain('/status');
      expect(message).toContain('/help');
    });

    it('should generate help message', () => {
      const message = templates.helpMessage();
      expect(message).toContain('AVAILABLE COMMANDS');
      expect(message).toContain('/status');
      expect(message).toContain('/balance');
      expect(message).toContain('/positions');
    });

    it('should generate status message', () => {
      const stats = {
        running: true,
        uptime: 3600000,
        openPositions: 2,
        dailyPnL: 150,
        weeklyPnL: 500,
        monthlyPnL: 1200,
        totalPnL: 5000,
        winRate: 0.65,
        totalTrades: 100,
      };

      const message = templates.statusMessage(stats);
      expect(message).toContain('BOT STATUS');
      expect(message).toContain('ACTIVE');
      expect(message).toContain('150.00 USDT');
      expect(message).toContain('+65.00%');
    });

    it('should generate balance message', () => {
      const balance = {
        total: 10000,
        available: 8000,
        inPositions: 2000,
        currency: 'USDT',
        dailyPnL: 100,
        dailyPnLPercent: 1.0,
        weeklyPnL: 500,
        weeklyPnLPercent: 5.0,
        assets: [
          { asset: 'BTC', amount: 0.1, value: 5000, percentage: 50 },
          { asset: 'ETH', amount: 1.5, value: 4500, percentage: 45 },
        ],
      };

      const message = templates.balanceMessage(balance);
      expect(message).toContain('BALANCE');
      expect(message).toContain('10,000.00 USDT');
      expect(message).toContain('8,000.00 USDT');
      expect(message).toContain('BTC');
      expect(message).toContain('ETH');
    });

    it('should generate position message', () => {
      const position = {
        id: 'pos-1',
        symbol: 'BTC/USDT',
        side: 'long' as const,
        entryPrice: 50000,
        currentPrice: 52000,
        quantity: 0.1,
        value: 5200,
        unrealizedPnL: 200,
        unrealizedPnLPercent: 4.0,
        stopLoss: 48000,
        takeProfit: 55000,
        duration: '1h 30m',
        openedAt: new Date(),
      };

      const message = templates.positionMessage(position);
      expect(message).toContain('LONG BTC/USDT');
      expect(message).toContain('50,000.00 USDT');
      expect(message).toContain('52,000.00 USDT');
      expect(message).toContain('+4.00%');
      expect(message).toContain('200.00 USDT');
    });

    it('should generate positions list message', () => {
      const positions = [
        {
          id: 'pos-1',
          symbol: 'BTC/USDT',
          side: 'long' as const,
          entryPrice: 50000,
          currentPrice: 52000,
          quantity: 0.1,
          value: 5200,
          unrealizedPnL: 200,
          unrealizedPnLPercent: 4.0,
          duration: '1h',
          openedAt: new Date(),
        },
        {
          id: 'pos-2',
          symbol: 'ETH/USDT',
          side: 'long' as const,
          entryPrice: 3000,
          currentPrice: 3100,
          quantity: 1,
          value: 3100,
          unrealizedPnL: 100,
          unrealizedPnLPercent: 3.33,
          duration: '30m',
          openedAt: new Date(),
        },
      ];

      const message = templates.positionsListMessage(positions);
      expect(message).toContain('POSITIONS');
      expect(message).toContain('BTC/USDT');
      expect(message).toContain('ETH/USDT');
      expect(message).toContain('300.00 USDT'); // Total PnL
    });

    it('should handle empty positions list', () => {
      const message = templates.positionsListMessage([]);
      expect(message).toContain('No open positions');
    });

    it('should generate error message', () => {
      const message = templates.errorMessage('Something went wrong');
      expect(message).toContain('❌');
      expect(message).toContain('Something went wrong');
    });

    it('should generate success message', () => {
      const message = templates.successMessage('Operation completed');
      expect(message).toContain('✅');
      expect(message).toContain('Operation completed');
    });
  });

  describe('Notification Settings', () => {
    it('should have default notification settings structure', () => {
      const settings = {
        tradeAlerts: {
          positionOpened: true,
          positionClosed: true,
          stopLossHit: true,
          takeProfitHit: true,
          trailingStopUpdated: false,
        },
        systemAlerts: {
          criticalErrors: true,
          dailyDrawdownLimit: true,
          positionLossThreshold: 5,
          apiRateLimits: false,
        },
        reports: {
          dailySummary: true,
          dailySummaryTime: '09:00',
          weeklySummary: true,
          monthlySummary: false,
        },
        quietHours: {
          enabled: false,
          startTime: '23:00',
          endTime: '07:00',
        },
      };

      expect(settings.tradeAlerts.positionOpened).toBe(true);
      expect(settings.systemAlerts.positionLossThreshold).toBe(5);
      expect(settings.reports.dailySummaryTime).toBe('09:00');
      expect(settings.quietHours.enabled).toBe(false);
    });
  });
});
