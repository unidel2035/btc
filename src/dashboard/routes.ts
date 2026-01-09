/**
 * Dashboard API Routes
 * REST API endpoints для веб-интерфейса
 */

import type { Request, Response, Router } from 'express';
import { storage } from './storage.js';

export function setupRoutes(router: Router): void {
  // Health check
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
    });
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
      const position = storage.getPosition(req.params.id || '');
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

      const trade = storage.closePosition(req.params.id || '', exitPrice, reason || 'Manual close');
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
      if (currentPrice !== undefined) {
        updates.currentPrice = currentPrice;
        const position = storage.getPosition(req.params.id || '');
        if (position) {
          const pnl =
            position.side === 'LONG'
              ? (currentPrice - position.entryPrice) * position.size
              : (position.entryPrice - currentPrice) * position.size;
          updates.pnl = pnl;
          updates.pnlPercent = (pnl / (position.entryPrice * position.size)) * 100;
        }
      }

      const position = storage.updatePosition(req.params.id || '', updates);
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
      const news = storage.getNews(limit);
      res.json(news);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch news' });
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
      const strategy = storage.getStrategyConfig(req.params.name || '');
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
      const strategy = storage.updateStrategyConfig(
        req.params.name || '',
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
}
