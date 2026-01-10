/**
 * Analytics API Routes
 * REST API endpoints for portfolio analytics
 */

import type { Request, Response, Router } from 'express';
import { PortfolioAnalytics } from '../analytics/PortfolioAnalytics.js';
import type {
  AnalyticsTrade,
  EquityPoint,
  AnalyticsPeriod,
  AnalyticsConfig,
} from '../analytics/types.js';

// Analytics service singleton
let analyticsService: PortfolioAnalytics | null = null;

// Mock data storage (in production, this would come from database)
const mockTrades: AnalyticsTrade[] = [];
const mockEquityCurve: EquityPoint[] = [];

/**
 * Initialize analytics service
 */
export function initializeAnalytics(config?: AnalyticsConfig): void {
  analyticsService = new PortfolioAnalytics(config);
}

/**
 * Setup analytics API routes
 */
export function setupAnalyticsRoutes(router: Router): void {
  // Ensure analytics service is initialized
  if (!analyticsService) {
    initializeAnalytics();
  }

  /**
   * GET /api/analytics/performance
   * Get performance metrics for a period
   */
  router.get('/api/analytics/performance', (req: Request, res: Response) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      // Filter trades and equity curve by period
      let filteredTrades = mockTrades;
      let filteredEquity = mockEquityCurve;

      if (startDate && endDate) {
        filteredTrades = mockTrades.filter((t) => t.exitDate >= startDate && t.exitDate <= endDate);
        filteredEquity = mockEquityCurve.filter(
          (e) => e.timestamp >= startDate && e.timestamp <= endDate,
        );
      }

      if (filteredEquity.length < 2) {
        res.status(400).json({ error: 'Insufficient data for performance calculation' });
        return;
      }

      const performance = analyticsService!.calculatePerformanceMetrics(
        filteredTrades,
        filteredEquity,
      );

      res.json(performance);
    } catch (error) {
      console.error('Error calculating performance:', error);
      res.status(500).json({ error: 'Failed to calculate performance metrics' });
    }
  });

  /**
   * GET /api/analytics/returns
   * Get returns for a period
   */
  router.get('/api/analytics/returns', (req: Request, res: Response) => {
    try {
      const period = (req.query.period as AnalyticsPeriod) || 'all';
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      let filteredEquity = mockEquityCurve;

      if (startDate && endDate) {
        filteredEquity = mockEquityCurve.filter(
          (e) => e.timestamp >= startDate && e.timestamp <= endDate,
        );
      }

      if (filteredEquity.length < 2) {
        res.status(400).json({ error: 'Insufficient data for returns calculation' });
        return;
      }

      const returns = analyticsService!.calculateReturns(filteredEquity, period);

      res.json(returns);
    } catch (error) {
      console.error('Error calculating returns:', error);
      res.status(500).json({ error: 'Failed to calculate returns' });
    }
  });

  /**
   * GET /api/analytics/trades/stats
   * Get trade statistics
   */
  router.get('/api/analytics/trades/stats', (req: Request, res: Response) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      let filteredTrades = mockTrades;

      if (startDate && endDate) {
        filteredTrades = mockTrades.filter((t) => t.exitDate >= startDate && t.exitDate <= endDate);
      }

      const stats = analyticsService!.calculateTradeStatistics(filteredTrades);

      res.json(stats);
    } catch (error) {
      console.error('Error calculating trade stats:', error);
      res.status(500).json({ error: 'Failed to calculate trade statistics' });
    }
  });

  /**
   * GET /api/analytics/strategies
   * Get strategy performance breakdown
   */
  router.get('/api/analytics/strategies', (req: Request, res: Response) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      let filteredTrades = mockTrades;

      if (startDate && endDate) {
        filteredTrades = mockTrades.filter((t) => t.exitDate >= startDate && t.exitDate <= endDate);
      }

      const strategies = analyticsService!.getStrategyPerformance(filteredTrades);

      res.json(strategies);
    } catch (error) {
      console.error('Error calculating strategy performance:', error);
      res.status(500).json({ error: 'Failed to calculate strategy performance' });
    }
  });

  /**
   * GET /api/analytics/assets
   * Get asset performance breakdown
   */
  router.get('/api/analytics/assets', (req: Request, res: Response) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      let filteredTrades = mockTrades;

      if (startDate && endDate) {
        filteredTrades = mockTrades.filter((t) => t.exitDate >= startDate && t.exitDate <= endDate);
      }

      const assets = analyticsService!.getAssetPerformance(filteredTrades);

      res.json(assets);
    } catch (error) {
      console.error('Error calculating asset performance:', error);
      res.status(500).json({ error: 'Failed to calculate asset performance' });
    }
  });

  /**
   * GET /api/analytics/drawdown
   * Get drawdown analysis
   */
  router.get('/api/analytics/drawdown', (req: Request, res: Response) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      let filteredEquity = mockEquityCurve;

      if (startDate && endDate) {
        filteredEquity = mockEquityCurve.filter(
          (e) => e.timestamp >= startDate && e.timestamp <= endDate,
        );
      }

      if (filteredEquity.length < 2) {
        res.status(400).json({ error: 'Insufficient data for drawdown calculation' });
        return;
      }

      const drawdown = analyticsService!.calculateDrawdown(filteredEquity);

      res.json(drawdown);
    } catch (error) {
      console.error('Error calculating drawdown:', error);
      res.status(500).json({ error: 'Failed to calculate drawdown' });
    }
  });

  /**
   * GET /api/analytics/correlation
   * Get asset correlation matrix
   */
  router.get('/api/analytics/correlation', (req: Request, res: Response) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      let filteredTrades = mockTrades;

      if (startDate && endDate) {
        filteredTrades = mockTrades.filter((t) => t.exitDate >= startDate && t.exitDate <= endDate);
      }

      const correlation = analyticsService!.calculateCorrelationMatrix(filteredTrades);

      res.json(correlation);
    } catch (error) {
      console.error('Error calculating correlation:', error);
      res.status(500).json({ error: 'Failed to calculate correlation matrix' });
    }
  });

  /**
   * GET /api/analytics/risk-exposure
   * Get risk exposure analysis
   */
  router.get('/api/analytics/risk-exposure', (req: Request, res: Response) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      let filteredTrades = mockTrades;

      if (startDate && endDate) {
        filteredTrades = mockTrades.filter((t) => t.exitDate >= startDate && t.exitDate <= endDate);
      }

      // Mock current positions (in production, get from exchange)
      const currentPositions = [
        { asset: 'BTC/USDT', size: 10000 },
        { asset: 'ETH/USDT', size: 5000 },
      ];

      const totalEquity = mockEquityCurve[mockEquityCurve.length - 1]?.equity ?? 100000;

      const riskExposure = analyticsService!.calculateRiskExposure(
        currentPositions,
        totalEquity,
        filteredTrades,
      );

      res.json(riskExposure);
    } catch (error) {
      console.error('Error calculating risk exposure:', error);
      res.status(500).json({ error: 'Failed to calculate risk exposure' });
    }
  });

  /**
   * GET /api/analytics/equity-curve
   * Get equity curve data
   */
  router.get('/api/analytics/equity-curve', (req: Request, res: Response) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      let filteredEquity = mockEquityCurve;

      if (startDate && endDate) {
        filteredEquity = mockEquityCurve.filter(
          (e) => e.timestamp >= startDate && e.timestamp <= endDate,
        );
      }

      res.json(filteredEquity);
    } catch (error) {
      console.error('Error fetching equity curve:', error);
      res.status(500).json({ error: 'Failed to fetch equity curve' });
    }
  });

  /**
   * GET /api/analytics/report
   * Generate comprehensive analytics report
   */
  router.get('/api/analytics/report', (req: Request, res: Response) => {
    try {
      const periodType =
        (req.query.periodType as 'daily' | 'weekly' | 'monthly' | 'yearly') || 'monthly';
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

      const filteredTrades = mockTrades.filter(
        (t) => t.exitDate >= startDate && t.exitDate <= endDate,
      );
      const filteredEquity = mockEquityCurve.filter(
        (e) => e.timestamp >= startDate && e.timestamp <= endDate,
      );

      if (filteredEquity.length < 2) {
        res.status(400).json({ error: 'Insufficient data for report generation' });
        return;
      }

      // Mock current positions
      const currentPositions = [
        { asset: 'BTC/USDT', size: 10000 },
        { asset: 'ETH/USDT', size: 5000 },
      ];

      const report = analyticsService!.generateReport(
        filteredTrades,
        filteredEquity,
        {
          start: startDate,
          end: endDate,
          type: periodType,
        },
        currentPositions,
      );

      res.json(report);
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({ error: 'Failed to generate analytics report' });
    }
  });

  /**
   * GET /api/analytics/trades
   * Get all trades with optional filtering
   */
  router.get('/api/analytics/trades', (req: Request, res: Response) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const strategy = req.query.strategy as string | undefined;
      const asset = req.query.asset as string | undefined;

      let filteredTrades = mockTrades;

      if (startDate && endDate) {
        filteredTrades = filteredTrades.filter(
          (t) => t.exitDate >= startDate && t.exitDate <= endDate,
        );
      }

      if (strategy) {
        filteredTrades = filteredTrades.filter((t) => t.strategy === strategy);
      }

      if (asset) {
        filteredTrades = filteredTrades.filter((t) => t.asset === asset);
      }

      res.json(filteredTrades);
    } catch (error) {
      console.error('Error fetching trades:', error);
      res.status(500).json({ error: 'Failed to fetch trades' });
    }
  });

  /**
   * POST /api/analytics/trades
   * Add trade data (for testing/demo purposes)
   */
  router.post('/api/analytics/trades', (req: Request, res: Response) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const trade: AnalyticsTrade = req.body;

      // Validate trade data
      if (!trade.id || !trade.strategy || !trade.asset) {
        res.status(400).json({ error: 'Invalid trade data' });
        return;
      }

      // Convert date strings to Date objects
      trade.entryDate = new Date(trade.entryDate);
      trade.exitDate = new Date(trade.exitDate);

      mockTrades.push(trade);

      res.status(201).json({ success: true, id: trade.id });
    } catch (error) {
      console.error('Error adding trade:', error);
      res.status(500).json({ error: 'Failed to add trade' });
    }
  });

  /**
   * POST /api/analytics/equity
   * Add equity curve point (for testing/demo purposes)
   */
  router.post('/api/analytics/equity', (req: Request, res: Response) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const point: EquityPoint = req.body;

      // Convert date string to Date object
      point.timestamp = new Date(point.timestamp);

      mockEquityCurve.push(point);

      res.status(201).json({ success: true });
    } catch (error) {
      console.error('Error adding equity point:', error);
      res.status(500).json({ error: 'Failed to add equity point' });
    }
  });
}

/**
 * Get analytics service instance (for internal use)
 */
export function getAnalyticsService(): PortfolioAnalytics | null {
  return analyticsService;
}
