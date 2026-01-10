/**
 * Portfolio Analytics Tests
 */

import { PortfolioAnalytics } from '../../src/analytics/PortfolioAnalytics.js';
import type { AnalyticsTrade, EquityPoint } from '../../src/analytics/types.js';

// Test data
const mockTrades: AnalyticsTrade[] = [
  {
    id: 'trade-1',
    strategy: 'Price Channel',
    asset: 'BTC/USDT',
    entryDate: new Date('2025-01-01T10:00:00Z'),
    exitDate: new Date('2025-01-02T10:00:00Z'),
    duration: 24,
    entryPrice: 95000,
    exitPrice: 97000,
    size: 10000,
    pnl: 210.53,
    pnlPercent: 2.11,
    fees: 50,
    slippage: 10,
    direction: 'long',
    exitReason: 'take-profit',
  },
  {
    id: 'trade-2',
    strategy: 'News Momentum',
    asset: 'ETH/USDT',
    entryDate: new Date('2025-01-03T10:00:00Z'),
    exitDate: new Date('2025-01-04T10:00:00Z'),
    duration: 24,
    entryPrice: 3500,
    exitPrice: 3400,
    size: 5000,
    pnl: -150,
    pnlPercent: -2.86,
    fees: 25,
    slippage: 5,
    direction: 'long',
    exitReason: 'stop-loss',
  },
  {
    id: 'trade-3',
    strategy: 'Price Channel',
    asset: 'BTC/USDT',
    entryDate: new Date('2025-01-05T10:00:00Z'),
    exitDate: new Date('2025-01-06T10:00:00Z'),
    duration: 24,
    entryPrice: 96000,
    exitPrice: 98500,
    size: 10000,
    pnl: 260.42,
    pnlPercent: 2.60,
    fees: 50,
    slippage: 10,
    direction: 'long',
    exitReason: 'take-profit',
  },
];

const mockEquityCurve: EquityPoint[] = [
  { timestamp: new Date('2025-01-01T00:00:00Z'), equity: 10000, cash: 10000, positions: 0, drawdown: 0 },
  { timestamp: new Date('2025-01-02T00:00:00Z'), equity: 10210, cash: 10210, positions: 0, drawdown: 0 },
  { timestamp: new Date('2025-01-03T00:00:00Z'), equity: 10210, cash: 10210, positions: 0, drawdown: 0 },
  { timestamp: new Date('2025-01-04T00:00:00Z'), equity: 10060, cash: 10060, positions: 0, drawdown: -1.47 },
  { timestamp: new Date('2025-01-05T00:00:00Z'), equity: 10060, cash: 10060, positions: 0, drawdown: -1.47 },
  { timestamp: new Date('2025-01-06T00:00:00Z'), equity: 10320, cash: 10320, positions: 0, drawdown: 0 },
];

describe('PortfolioAnalytics', () => {
  let analytics: PortfolioAnalytics;

  beforeAll(() => {
    analytics = new PortfolioAnalytics();
  });

  describe('calculateReturns', () => {
    it('should calculate returns correctly', async () => {
      const returns = analytics.calculateReturns(mockEquityCurve, 'all');

      expect(returns.totalReturn).toBeCloseTo(3.2, 1); // 3.2% return
      expect(returns.startEquity).toBe(10000);
      expect(returns.endEquity).toBe(10320);
      expect(returns.absoluteReturn).toBe(320);
    });

    it('should throw error for insufficient data', () => {
      expect(() => analytics.calculateReturns([mockEquityCurve[0]!], 'all')).toThrow(
        'Insufficient data',
      );
    });
  });

  describe('calculatePerformanceMetrics', () => {
    it('should calculate comprehensive performance metrics', async () => {
      const metrics = analytics.calculatePerformanceMetrics(mockTrades, mockEquityCurve);

      expect(metrics.totalReturn).toBeCloseTo(3.2, 1);
      expect(metrics.sharpeRatio).toBeGreaterThan(0);
      expect(metrics.sortinoRatio).toBeGreaterThan(0);
      expect(metrics.maxDrawdown).toBeCloseTo(1.47, 1);
      expect(metrics.profitFactor).toBeUndefined(); // Not in PerformanceMetrics
    });

    it('should calculate Sharpe ratio correctly', async () => {
      const metrics = analytics.calculatePerformanceMetrics(mockTrades, mockEquityCurve);

      expect(metrics.sharpeRatio).toBeDefined();
      expect(typeof metrics.sharpeRatio).toBe('number');
    });

    it('should calculate VaR metrics', async () => {
      const metrics = analytics.calculatePerformanceMetrics(mockTrades, mockEquityCurve);

      expect(metrics.valueAtRisk95).toBeDefined();
      expect(metrics.valueAtRisk99).toBeDefined();
      expect(metrics.conditionalVaR95).toBeDefined();
      expect(metrics.conditionalVaR99).toBeDefined();
    });
  });

  describe('calculateTradeStatistics', () => {
    it('should calculate trade statistics correctly', () => {
      const stats = analytics.calculateTradeStatistics(mockTrades);

      expect(stats.totalTrades).toBe(3);
      expect(stats.winRate).toBeCloseTo(66.67, 1); // 2 wins out of 3
      expect(stats.profitFactor).toBeGreaterThan(1);
      expect(stats.avgWin).toBeGreaterThan(0);
      expect(stats.avgLoss).toBeLessThan(0);
    });

    it('should handle empty trades array', () => {
      const stats = analytics.calculateTradeStatistics([]);

      expect(stats.totalTrades).toBe(0);
      expect(stats.winRate).toBe(0);
      expect(stats.profitFactor).toBe(0);
    });

    it('should calculate consecutive wins/losses', () => {
      const stats = analytics.calculateTradeStatistics(mockTrades);

      expect(stats.consecutiveWinsMax).toBeGreaterThan(0);
      expect(stats.consecutiveLossesMax).toBeGreaterThan(0);
    });
  });

  describe('getStrategyPerformance', () => {
    it('should breakdown performance by strategy', () => {
      const strategies = analytics.getStrategyPerformance(mockTrades);

      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies.some(s => s.strategy === 'Price Channel')).toBe(true);
      expect(strategies.some(s => s.strategy === 'News Momentum')).toBe(true);
    });

    it('should calculate strategy-specific metrics', () => {
      const strategies = analytics.getStrategyPerformance(mockTrades);
      const priceChannel = strategies.find(s => s.strategy === 'Price Channel');

      expect(priceChannel).toBeDefined();
      expect(priceChannel!.trades).toBe(2);
      expect(priceChannel!.winRate).toBe(100); // Both trades won
      expect(priceChannel!.pnl).toBeGreaterThan(0);
    });

    it('should sort strategies by PnL', () => {
      const strategies = analytics.getStrategyPerformance(mockTrades);

      for (let i = 1; i < strategies.length; i++) {
        expect(strategies[i - 1]!.pnl).toBeGreaterThanOrEqual(strategies[i]!.pnl);
      }
    });
  });

  describe('getAssetPerformance', () => {
    it('should breakdown performance by asset', () => {
      const assets = analytics.getAssetPerformance(mockTrades);

      expect(assets.length).toBeGreaterThan(0);
      expect(assets.some(a => a.asset === 'BTC/USDT')).toBe(true);
      expect(assets.some(a => a.asset === 'ETH/USDT')).toBe(true);
    });

    it('should calculate asset-specific metrics', () => {
      const assets = analytics.getAssetPerformance(mockTrades);
      const btc = assets.find(a => a.asset === 'BTC/USDT');

      expect(btc).toBeDefined();
      expect(btc!.trades).toBe(2);
      expect(btc!.pnl).toBeGreaterThan(0);
      expect(btc!.avgHoldTime).toBe(24);
    });
  });

  describe('calculateDrawdown', () => {
    it('should calculate max drawdown correctly', () => {
      const drawdown = analytics.calculateDrawdown(mockEquityCurve);

      expect(drawdown.maxDrawdown).toBeCloseTo(1.47, 1);
      expect(drawdown.currentDrawdown).toBeCloseTo(0, 1);
      expect(drawdown.drawdownPeriods).toBeDefined();
    });

    it('should track drawdown periods', () => {
      const drawdown = analytics.calculateDrawdown(mockEquityCurve);

      expect(drawdown.drawdownPeriods.length).toBeGreaterThan(0);
      expect(drawdown.drawdownPeriods[0]!.recovered).toBe(true);
    });
  });

  describe('calculateCorrelationMatrix', () => {
    it('should calculate correlation matrix', () => {
      const correlation = analytics.calculateCorrelationMatrix(mockTrades);

      expect(correlation.assets).toBeDefined();
      expect(correlation.matrix).toBeDefined();
      expect(correlation.assets.length).toBeGreaterThan(0);
      expect(correlation.matrix.length).toBe(correlation.assets.length);
    });

    it('should have 1.0 correlation on diagonal', () => {
      const correlation = analytics.calculateCorrelationMatrix(mockTrades);

      for (let i = 0; i < correlation.matrix.length; i++) {
        expect(correlation.matrix[i]![i]).toBeCloseTo(1.0, 1);
      }
    });
  });

  describe('calculateRiskExposure', () => {
    it('should calculate risk exposure correctly', () => {
      const currentPositions = [
        { asset: 'BTC/USDT', size: 5000 },
        { asset: 'ETH/USDT', size: 3000 },
      ];

      const exposure = analytics.calculateRiskExposure(currentPositions, 10000, mockTrades);

      expect(exposure.currentExposure).toBeCloseTo(80, 1); // 8000/10000 = 80%
      expect(exposure.concentrationRisk).toBeGreaterThan(0);
      expect(exposure.topPositions.length).toBeGreaterThan(0);
    });

    it('should identify top positions', () => {
      const currentPositions = [
        { asset: 'BTC/USDT', size: 5000 },
        { asset: 'ETH/USDT', size: 3000 },
        { asset: 'SOL/USDT', size: 1000 },
      ];

      const exposure = analytics.calculateRiskExposure(currentPositions, 10000, mockTrades);

      expect(exposure.topPositions[0]!.asset).toBe('BTC/USDT');
      expect(exposure.topPositions[0]!.exposure).toBeCloseTo(50, 1);
    });
  });

  describe('generateReport', () => {
    it('should generate comprehensive report', async () => {
      const currentPositions = [
        { asset: 'BTC/USDT', size: 5000 },
      ];

      const report = await analytics.generateReport(
        mockTrades,
        mockEquityCurve,
        {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-06'),
          type: 'weekly',
        },
        currentPositions,
      );

      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.period.type).toBe('weekly');
      expect(report.performance).toBeDefined();
      expect(report.tradeStats).toBeDefined();
      expect(report.strategyPerformance).toBeDefined();
      expect(report.assetPerformance).toBeDefined();
      expect(report.equityCurve).toBeDefined();
      expect(report.drawdown).toBeDefined();
      expect(report.riskExposure).toBeDefined();
      expect(report.summary).toBeDefined();
    });

    it('should include summary metrics', async () => {
      const report = await analytics.generateReport(
        mockTrades,
        mockEquityCurve,
        {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-06'),
          type: 'monthly',
        },
      );

      expect(report.summary.totalTrades).toBe(3);
      expect(report.summary.winRate).toBeCloseTo(66.67, 1);
      expect(report.summary.totalReturn).toBeCloseTo(3.2, 1);
    });
  });
});

console.log('✅ Portfolio Analytics tests completed');
