/**
 * Dashboard API Routes
 * REST API endpoints для веб-интерфейса
 */

import type { Request, Response, Router } from 'express';
import { storage } from './storage.js';
import type { SignalsProvider } from './providers/SignalsProvider.js';

// Type for dashboard server to access signals provider
interface DashboardServerInterface {
  getSignalsProvider(): SignalsProvider | null;
}

export function setupRoutes(router: Router, dashboardServer?: DashboardServerInterface): void {
  // Health check
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'btc-trading-bot-dashboard',
      version: process.env.npm_package_version || '0.1.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // Detailed health check with service dependencies
  router.get('/health/detailed', (_req: Request, res: Response) => {
    const checks = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'btc-trading-bot-dashboard',
      version: process.env.npm_package_version || '0.1.0',
      checks: {
        server: 'ok',
        storage: 'ok',
      },
    };

    res.json(checks);
  });

  // Readiness check (для Kubernetes/Docker)
  router.get('/ready', (_req: Request, res: Response) => {
    try {
      // Проверяем, что основные компоненты работают
      const isReady = storage.isInitialized();
      if (isReady) {
        res.json({ status: 'ready', timestamp: new Date().toISOString() });
      } else {
        res.status(503).json({ status: 'not ready', timestamp: new Date().toISOString() });
      }
    } catch (error) {
      res.status(503).json({ status: 'not ready', error: String(error) });
    }
  });

  // Liveness check (для Kubernetes/Docker)
  router.get('/live', (_req: Request, res: Response) => {
    res.json({ status: 'alive', timestamp: new Date().toISOString() });
  });

  // Metrics
  router.get('/api/metrics', (_req: Request, res: Response) => {
    try {
      const metrics = storage.getMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  });

  // Positions
  router.get('/api/positions', (_req: Request, res: Response) => {
    try {
      const positions = storage.getPositions();
      res.json(positions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch positions' });
    }
  });

  router.get('/api/positions/:id', (req: Request, res: Response): void => {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const position = storage.getPosition(id || '');
      if (!position) {
        res.status(404).json({ error: 'Position not found' });
        return;
      }
      res.json(position);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch position' });
    }
  });

  router.post('/api/positions/:id/close', (req: Request, res: Response): void => {
    try {
      const { exitPrice, reason } = req.body as { exitPrice?: number; reason?: string };
      if (!exitPrice) {
        res.status(400).json({ error: 'exitPrice is required' });
        return;
      }

      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const trade = storage.closePosition(id || '', exitPrice, reason || 'Manual close');
      if (!trade) {
        res.status(404).json({ error: 'Position not found' });
        return;
      }

      res.json(trade);
    } catch (error) {
      res.status(500).json({ error: 'Failed to close position' });
    }
  });

  router.patch('/api/positions/:id', (req: Request, res: Response): void => {
    try {
      const { stopLoss, takeProfit, currentPrice } = req.body as {
        stopLoss?: number;
        takeProfit?: number;
        currentPrice?: number;
      };
      const updates: {
        stopLoss?: number;
        takeProfit?: number;
        currentPrice?: number;
        pnl?: number;
        pnlPercent?: number;
      } = {};

      if (stopLoss !== undefined) updates.stopLoss = stopLoss;
      if (takeProfit !== undefined) updates.takeProfit = takeProfit;
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      if (currentPrice !== undefined) {
        updates.currentPrice = currentPrice;
        const position = storage.getPosition(id || '');
        if (position) {
          const pnl =
            position.side === 'LONG'
              ? (currentPrice - position.entryPrice) * position.size
              : (position.entryPrice - currentPrice) * position.size;
          updates.pnl = pnl;
          updates.pnlPercent = (pnl / (position.entryPrice * position.size)) * 100;
        }
      }

      const position = storage.updatePosition(id || '', updates);
      if (!position) {
        res.status(404).json({ error: 'Position not found' });
        return;
      }

      res.json(position);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update position' });
    }
  });

  // Signals
  router.get('/api/signals', (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const signals = storage.getSignals(limit);
      res.json(signals);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch signals' });
    }
  });

  // News
  router.get('/api/news', (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const sentiment = req.query.sentiment as string;
      const source = req.query.source as string;

      let news = storage.getNews(limit);

      // Фильтрация по sentiment
      if (sentiment) {
        const upperSentiment = sentiment.toUpperCase();
        if (
          upperSentiment === 'POSITIVE' ||
          upperSentiment === 'NEGATIVE' ||
          upperSentiment === 'NEUTRAL'
        ) {
          news = news.filter((n) => n.sentiment === upperSentiment);
        }
      }

      // Фильтрация по источнику
      if (source) {
        const lowerSource = source.toLowerCase();
        news = news.filter((n) => n.source.toLowerCase().includes(lowerSource));
      }

      res.json(news);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch news' });
    }
  });

  // News Stats
  router.get('/api/news/stats', (_req: Request, res: Response) => {
    try {
      const news = storage.getNews(1000);

      const stats = {
        total: news.length,
        bySource: {} as Record<string, number>,
        bySentiment: {
          POSITIVE: news.filter((n) => n.sentiment === 'POSITIVE').length,
          NEGATIVE: news.filter((n) => n.sentiment === 'NEGATIVE').length,
          NEUTRAL: news.filter((n) => n.sentiment === 'NEUTRAL').length,
        },
        avgSentimentScore:
          news.length > 0 ? news.reduce((sum, n) => sum + n.sentimentScore, 0) / news.length : 0,
        last24Hours: news.filter((n) => {
          const publishedDate = new Date(n.publishedAt);
          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return publishedDate > yesterday;
        }).length,
      };

      // Подсчет по источникам
      news.forEach((n) => {
        stats.bySource[n.source] = (stats.bySource[n.source] || 0) + 1;
      });

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch news stats' });
    }
  });

  // Equity History
  router.get('/api/equity', (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const equity = storage.getEquityHistory(limit);
      res.json(equity);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch equity history' });
    }
  });

  // Trade History
  router.get('/api/history', (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const history = storage.getTradeHistory(limit);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch trade history' });
    }
  });

  // Performance Stats
  router.get('/api/performance', (_req: Request, res: Response) => {
    try {
      const stats = storage.getPerformanceStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch performance stats' });
    }
  });

  // Strategy Configuration
  router.get('/api/strategies', (_req: Request, res: Response) => {
    try {
      const strategies = storage.getAllStrategyConfigs();
      res.json(strategies);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch strategy configs' });
    }
  });

  router.get('/api/strategies/:name', (req: Request, res: Response): void => {
    try {
      const name = (
        Array.isArray(req.params.name) ? req.params.name[0] : req.params.name
      ) as string;
      const strategy = storage.getStrategyConfig(name || '');
      if (!strategy) {
        res.status(404).json({ error: 'Strategy not found' });
        return;
      }
      res.json(strategy);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch strategy config' });
    }
  });

  router.patch('/api/strategies/:name', (req: Request, res: Response): void => {
    try {
      const name = (
        Array.isArray(req.params.name) ? req.params.name[0] : req.params.name
      ) as string;
      const strategy = storage.updateStrategyConfig(
        name || '',
        req.body as Record<string, unknown>,
      );
      if (!strategy) {
        res.status(404).json({ error: 'Strategy not found' });
        return;
      }
      res.json(strategy);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update strategy config' });
    }
  });

  // Risk Configuration
  router.get('/api/settings/risk', (_req: Request, res: Response) => {
    try {
      const config = storage.getRiskConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch risk config' });
    }
  });

  router.patch('/api/settings/risk', (req: Request, res: Response) => {
    try {
      const config = storage.updateRiskConfig(req.body as Record<string, unknown>);
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update risk config' });
    }
  });

  // General Settings
  router.post('/api/settings', (req: Request, res: Response): void => {
    try {
      // Обновляем различные настройки в зависимости от типа
      const { type, ...settings } = req.body as {
        type?: string;
        name?: string;
        [key: string]: unknown;
      };

      switch (type) {
        case 'risk': {
          const riskConfig = storage.updateRiskConfig(settings as Record<string, unknown>);
          res.json(riskConfig);
          return;
        }

        case 'strategy': {
          if (!settings.name) {
            res.status(400).json({ error: 'Strategy name is required' });
            return;
          }
          const strategyConfig = storage.updateStrategyConfig(
            String(settings.name),
            settings as Record<string, unknown>,
          );
          if (!strategyConfig) {
            res.status(404).json({ error: 'Strategy not found' });
            return;
          }
          res.json(strategyConfig);
          return;
        }

        default:
          res.status(400).json({ error: 'Invalid settings type' });
          return;
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // Strategy Management Endpoints (using SignalsProvider)

  // GET /api/strategies/status - Get all strategies status
  router.get('/api/strategies/status', (_req: Request, res: Response) => {
    try {
      const signalsProvider = dashboardServer?.getSignalsProvider();
      if (!signalsProvider) {
        res.status(503).json({ error: 'Signals provider not available (demo mode or disabled)' });
        return;
      }

      const strategies = signalsProvider.getStrategiesStatus();
      res.json(strategies);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch strategies status' });
    }
  });

  // POST /api/strategies/:name/enable - Enable strategy
  router.post('/api/strategies/:name/enable', (req: Request, res: Response): void => {
    try {
      const signalsProvider = dashboardServer?.getSignalsProvider();
      if (!signalsProvider) {
        res.status(503).json({ error: 'Signals provider not available (demo mode or disabled)' });
        return;
      }

      const name = (
        Array.isArray(req.params.name) ? req.params.name[0] : req.params.name
      ) as string;

      signalsProvider.enableStrategy(name || '');
      res.json({ success: true, message: `Strategy ${name} enabled` });
    } catch (error) {
      res.status(500).json({ error: 'Failed to enable strategy' });
    }
  });

  // POST /api/strategies/:name/disable - Disable strategy
  router.post('/api/strategies/:name/disable', (req: Request, res: Response): void => {
    try {
      const signalsProvider = dashboardServer?.getSignalsProvider();
      if (!signalsProvider) {
        res.status(503).json({ error: 'Signals provider not available (demo mode or disabled)' });
        return;
      }

      const name = (
        Array.isArray(req.params.name) ? req.params.name[0] : req.params.name
      ) as string;

      signalsProvider.disableStrategy(name || '');
      res.json({ success: true, message: `Strategy ${name} disabled` });
    } catch (error) {
      res.status(500).json({ error: 'Failed to disable strategy' });
    }
  });

  // PATCH /api/strategies/:name/params - Update strategy parameters
  router.patch('/api/strategies/:name/params', (req: Request, res: Response): void => {
    try {
      const signalsProvider = dashboardServer?.getSignalsProvider();
      if (!signalsProvider) {
        res.status(503).json({ error: 'Signals provider not available (demo mode or disabled)' });
        return;
      }

      const name = (
        Array.isArray(req.params.name) ? req.params.name[0] : req.params.name
      ) as string;

      signalsProvider.updateStrategyParams(name || '', req.body as Record<string, unknown>);
      res.json({ success: true, message: `Strategy ${name} parameters updated` });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update strategy parameters' });
    }
  });

  // GET /api/signals/stats - Signal statistics
  router.get('/api/signals/stats', (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 1000;
      const signals = storage.getSignals(limit);

      const stats = {
        total: signals.length,
        byStrategy: {} as Record<string, number>,
        byAction: {
          BUY: signals.filter((s) => s.action === 'BUY').length,
          SELL: signals.filter((s) => s.action === 'SELL').length,
          HOLD: signals.filter((s) => s.action === 'HOLD').length,
        },
        avgConfidence:
          signals.length > 0
            ? signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length
            : 0,
        highConfidence: signals.filter((s) => s.confidence > 0.8).length,
      };

      signals.forEach((s) => {
        stats.byStrategy[s.type] = (stats.byStrategy[s.type] || 0) + 1;
      });

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch signal stats' });
    }
  });

  // POST /api/backtest/run - Run backtest
  router.post('/api/backtest/run', async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        strategy,
        symbol,
        startDate,
        endDate,
        initialCapital,
        positionSize,
        timeframe,
        fees,
        slippage,
        allowShorts,
      } = req.body as {
        strategy: string;
        symbol: string;
        startDate: string;
        endDate: string;
        initialCapital: number;
        positionSize: number;
        timeframe: string;
        fees: number;
        slippage: number;
        allowShorts: boolean;
      };

      // Validate required fields
      if (
        !strategy ||
        !symbol ||
        !startDate ||
        !endDate ||
        !initialCapital ||
        !positionSize ||
        !timeframe
      ) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Dynamic import to avoid circular dependencies
      const { runBacktest } = await import('./backtest-runner.js');

      // Run backtest
      const results = await runBacktest({
        strategy,
        symbol,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        initialCapital,
        positionSize,
        timeframe,
        fees: fees || 0.1,
        slippage: slippage || 0.05,
        allowShorts: allowShorts || false,
      });

      res.json(results);
    } catch (error) {
      console.error('Backtest error:', error);
      res.status(500).json({
        error: 'Failed to run backtest',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
