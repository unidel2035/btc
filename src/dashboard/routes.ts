/**
 * Dashboard API Routes
 * REST API endpoints для веб-интерфейса
 */

import type { Request, Response, Router } from 'express';
import { storage } from './storage.js';
import type { SignalsProvider } from './providers/SignalsProvider.js';
import type { ExchangeManager } from '../exchanges/ExchangeManager.js';
import { CandleInterval, type Candle } from '../exchanges/types.js';

// Type for dashboard server to access signals provider and exchange manager
interface DashboardServerInterface {
  getSignalsProvider(): SignalsProvider | null;
  getExchangeManager(): ExchangeManager | null;
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

  // GET /api/strategies/:name/schema - Get strategy parameter schema
  router.get('/api/strategies/:name/schema', (req: Request, res: Response): void => {
    try {
      const signalsProvider = dashboardServer?.getSignalsProvider();
      if (!signalsProvider) {
        res.status(503).json({ error: 'Signals provider not available (demo mode or disabled)' });
        return;
      }

      const name = (
        Array.isArray(req.params.name) ? req.params.name[0] : req.params.name
      ) as string;

      const schema = signalsProvider.getStrategySchema(name || '');
      if (!schema) {
        res.status(404).json({ error: 'Strategy not found' });
        return;
      }

      res.json(schema);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch strategy schema' });
    }
  });

  // POST /api/strategies/:name/validate - Validate strategy parameters
  router.post('/api/strategies/:name/validate', (req: Request, res: Response): void => {
    try {
      const signalsProvider = dashboardServer?.getSignalsProvider();
      if (!signalsProvider) {
        res.status(503).json({ error: 'Signals provider not available (demo mode or disabled)' });
        return;
      }

      const name = (
        Array.isArray(req.params.name) ? req.params.name[0] : req.params.name
      ) as string;

      const result = signalsProvider.validateStrategyParams(
        name || '',
        req.body as Record<string, unknown>,
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to validate strategy parameters' });
    }
  });

  // Strategy Presets Management

  // GET /api/strategies/presets - Get all presets
  router.get('/api/strategies/presets', (_req: Request, res: Response) => {
    try {
      const presets = storage.getStrategyPresets();
      res.json(presets);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch presets' });
    }
  });

  // GET /api/strategies/:name/presets - Get presets for specific strategy
  router.get('/api/strategies/:name/presets', (req: Request, res: Response): void => {
    try {
      const name = (
        Array.isArray(req.params.name) ? req.params.name[0] : req.params.name
      ) as string;
      const presets = storage.getStrategyPresets(name || '');
      res.json(presets);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch presets' });
    }
  });

  // POST /api/strategies/presets - Create new preset
  router.post('/api/strategies/presets', (req: Request, res: Response): void => {
    try {
      const preset = storage.createStrategyPreset(
        req.body as {
          name: string;
          strategy: string;
          params: Record<string, unknown>;
          description?: string;
        },
      );
      res.status(201).json(preset);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create preset' });
    }
  });

  // GET /api/strategies/presets/:id - Get preset by ID
  router.get('/api/strategies/presets/:id', (req: Request, res: Response): void => {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const preset = storage.getStrategyPreset(id || '');
      if (!preset) {
        res.status(404).json({ error: 'Preset not found' });
        return;
      }
      res.json(preset);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch preset' });
    }
  });

  // DELETE /api/strategies/presets/:id - Delete preset
  router.delete('/api/strategies/presets/:id', (req: Request, res: Response): void => {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const success = storage.deleteStrategyPreset(id || '');
      if (!success) {
        res.status(404).json({ error: 'Preset not found' });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete preset' });
    }
  });

  // POST /api/strategies/:name/apply-preset/:presetId - Apply preset to strategy
  router.post(
    '/api/strategies/:name/apply-preset/:presetId',
    (req: Request, res: Response): void => {
      try {
        const signalsProvider = dashboardServer?.getSignalsProvider();
        if (!signalsProvider) {
          res.status(503).json({ error: 'Signals provider not available (demo mode or disabled)' });
          return;
        }

        const name = (
          Array.isArray(req.params.name) ? req.params.name[0] : req.params.name
        ) as string;
        const presetId = (
          Array.isArray(req.params.presetId) ? req.params.presetId[0] : req.params.presetId
        ) as string;

        const preset = storage.getStrategyPreset(presetId || '');
        if (!preset) {
          res.status(404).json({ error: 'Preset not found' });
          return;
        }

        if (preset.strategy !== name) {
          res.status(400).json({ error: 'Preset is for different strategy' });
          return;
        }

        signalsProvider.updateStrategyParams(name || '', preset.params);
        res.json({ success: true, message: `Preset "${preset.name}" applied to ${name}` });
      } catch (error) {
        res.status(500).json({ error: 'Failed to apply preset' });
      }
    },
  );

  // GET /api/chart/history - Chart historical data
  router.get('/api/chart/history', async (req: Request, res: Response): Promise<void> => {
    try {
      const exchangeManager = dashboardServer?.getExchangeManager();
      if (!exchangeManager) {
        res.status(503).json({ error: 'Exchange manager not available (demo mode or disabled)' });
        return;
      }

      const exchange = (req.query.exchange as string) || 'binance';
      const symbol = (req.query.symbol as string) || 'BTC/USDT';
      const timeframe = (req.query.timeframe as string) || '1h';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

      // Validate timeframe
      const validTimeframes = Object.values(CandleInterval);
      if (!validTimeframes.includes(timeframe as CandleInterval)) {
        res
          .status(400)
          .json({ error: `Invalid timeframe. Valid values: ${validTimeframes.join(', ')}` });
        return;
      }

      // Get exchange instance
      let exchangeInstance;
      try {
        exchangeInstance = exchangeManager.getExchange(exchange as 'binance' | 'bybit' | 'okx');
      } catch (error) {
        res.status(404).json({ error: `Exchange ${exchange} not found or not initialized` });
        return;
      }

      // Fetch historical candles
      const candles: Candle[] = await exchangeInstance.getCandles(
        symbol,
        timeframe as CandleInterval,
        limit,
      );

      // Transform to chart format
      const chartData = candles.map((candle) => ({
        time: Math.floor(candle.timestamp / 1000), // Convert to seconds for lightweight-charts
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      }));

      res.json({
        exchange,
        symbol,
        timeframe,
        data: chartData,
      });
    } catch (error) {
      console.error('Failed to fetch chart history:', error);
      res.status(500).json({ error: 'Failed to fetch chart history', message: String(error) });
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
