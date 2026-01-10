/**
 * Webhook API Routes
 * REST API endpoints for TradingView webhooks
 */

import type { Request, Response, Router } from 'express';
import { WebhookService } from './WebhookService.js';
import { createRateLimiter } from './RateLimiter.js';
import type { TradingViewWebhookPayload, WebhookConfig } from './types.js';
import crypto from 'crypto';

// Default webhook configuration
const defaultConfig: WebhookConfig = {
  secretKey: process.env.TRADINGVIEW_WEBHOOK_SECRET || 'change-me-in-production',
  enableIpWhitelist: false,
  allowedIps: [],
  enableSignatureValidation: false,

  autoExecute: process.env.WEBHOOK_AUTO_EXECUTE !== 'false',
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

  supportedTickers: [
    'BTCUSDT',
    'ETHUSDT',
    'BNBUSDT',
    'SOLUSDT',
    'XRPUSDT',
    'ADAUSDT',
    'DOGEUSDT',
    'MATICUSDT',
    'LINKUSDT',
    'UNIUSDT',
  ],
};

// Initialize webhook service
const webhookService = new WebhookService(defaultConfig);

// Create rate limiter
const webhookRateLimiter = createRateLimiter({
  maxRequests: defaultConfig.maxSignalsPerMinute,
  windowMs: 60000, // 1 minute
  keyGenerator: (req) => {
    // Rate limit by strategy name if provided, otherwise by IP
    const payload = req.body as TradingViewWebhookPayload;
    return payload.strategy || req.ip || 'unknown';
  },
});

/**
 * Middleware to authenticate webhook requests
 */
function authenticateWebhook(req: Request, res: Response, next: () => void): void {
  const config = webhookService.getConfig();
  const payload = req.body as TradingViewWebhookPayload;

  // 1. Check secret key
  if (payload.secret !== config.secretKey) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid secret key',
    });
    return;
  }

  // 2. Check IP whitelist (if enabled)
  if (config.enableIpWhitelist && config.allowedIps.length > 0) {
    const clientIp = req.ip || req.socket.remoteAddress || '';
    if (!config.allowedIps.includes(clientIp)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'IP address not whitelisted',
      });
      return;
    }
  }

  // 3. Check HMAC signature (if enabled)
  if (config.enableSignatureValidation) {
    const signature = req.headers['x-tradingview-signature'] as string;
    if (!signature) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing signature',
      });
      return;
    }

    const calculatedSignature = crypto
      .createHmac('sha256', config.secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== calculatedSignature) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid signature',
      });
      return;
    }
  }

  next();
}

/**
 * Middleware to validate webhook payload
 */
function validatePayload(req: Request, res: Response, next: () => void): void {
  const payload = req.body as TradingViewWebhookPayload;

  if (!payload.ticker) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Missing required field: ticker',
    });
    return;
  }

  if (!payload.action) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Missing required field: action',
    });
    return;
  }

  if (!payload.price) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Missing required field: price',
    });
    return;
  }

  next();
}

/**
 * Setup webhook routes
 */
export function setupWebhookRoutes(router: Router): void {
  /**
   * POST /api/webhooks/tradingview
   * Main endpoint for receiving TradingView webhook signals
   */
  router.post(
    '/api/webhooks/tradingview',
    webhookRateLimiter,
    authenticateWebhook,
    validatePayload,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const payload = req.body as TradingViewWebhookPayload;

        // Process the webhook
        const record = await webhookService.processWebhook(payload);

        // Validate the signal
        const validation = await webhookService.validateSignal(record.signal);

        if (!validation.valid) {
          // Update status to rejected
          webhookService.updateSignalStatus(record.id, 'rejected', {
            rejectionReason: validation.errors.join(', '),
          });

          res.status(400).json({
            status: 'rejected',
            signal_id: record.id,
            errors: validation.errors,
            warnings: validation.warnings,
          });
          return;
        }

        // Update status to validated
        webhookService.updateSignalStatus(record.id, 'validated');

        // Determine if we should auto-execute or queue for manual approval
        const config = webhookService.getConfig();
        const action = config.autoExecute ? 'queued_for_execution' : 'queued_for_approval';

        webhookService.updateSignalStatus(record.id, 'queued');

        res.status(200).json({
          status: 'success',
          signal_id: record.id,
          action,
          warnings: validation.warnings,
          message: config.autoExecute
            ? 'Signal validated and queued for execution'
            : 'Signal validated and queued for manual approval',
        });
      } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );

  /**
   * GET /api/webhooks/signals
   * Get recent webhook signals
   */
  router.get('/api/webhooks/signals', (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const status = req.query.status as string;

      let signals = webhookService.getRecentSignals(limit);

      // Filter by status if provided
      if (status) {
        signals = signals.filter((s) => s.status === status);
      }

      res.json(signals);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch webhook signals' });
    }
  });

  /**
   * GET /api/webhooks/signals/:id
   * Get specific webhook signal by ID
   */
  router.get('/api/webhooks/signals/:id', (req: Request, res: Response): void => {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const signal = webhookService.getSignal(id || '');

      if (!signal) {
        res.status(404).json({ error: 'Signal not found' });
        return;
      }

      res.json(signal);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch signal' });
    }
  });

  /**
   * GET /api/webhooks/stats
   * Get webhook statistics
   */
  router.get('/api/webhooks/stats', (req: Request, res: Response) => {
    try {
      const period = (req.query.period as string) || '24h';
      const signals = webhookService.getRecentSignals(1000);

      // Calculate time range
      let cutoffTime = new Date();
      if (period === '1h') {
        cutoffTime = new Date(Date.now() - 60 * 60 * 1000);
      } else if (period === '24h') {
        cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      } else if (period === '7d') {
        cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      }

      // Filter signals by time period
      const periodSignals = signals.filter((s) => s.receivedAt >= cutoffTime);

      const stats = {
        period,
        totalReceived: periodSignals.length,
        totalExecuted: periodSignals.filter((s) => s.status === 'executed').length,
        totalRejected: periodSignals.filter((s) => s.status === 'rejected').length,
        totalQueued: periodSignals.filter((s) => s.status === 'queued').length,
        executionRate:
          periodSignals.length > 0
            ? (periodSignals.filter((s) => s.status === 'executed').length / periodSignals.length) *
              100
            : 0,
        rejectionRate:
          periodSignals.length > 0
            ? (periodSignals.filter((s) => s.status === 'rejected').length / periodSignals.length) *
              100
            : 0,
        byStrategy: {} as Record<string, number>,
        byAction: {} as Record<string, number>,
        byTicker: {} as Record<string, number>,
      };

      // Count by strategy
      periodSignals.forEach((s) => {
        const strategy = s.signal.strategy;
        stats.byStrategy[strategy] = (stats.byStrategy[strategy] || 0) + 1;
      });

      // Count by action
      periodSignals.forEach((s) => {
        const action = s.signal.action;
        stats.byAction[action] = (stats.byAction[action] || 0) + 1;
      });

      // Count by ticker
      periodSignals.forEach((s) => {
        const ticker = s.signal.ticker;
        stats.byTicker[ticker] = (stats.byTicker[ticker] || 0) + 1;
      });

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch webhook stats' });
    }
  });

  /**
   * GET /api/webhooks/config
   * Get webhook configuration (excluding secret)
   */
  router.get('/api/webhooks/config', (_req: Request, res: Response) => {
    try {
      const config = webhookService.getConfig();

      // Don't expose the full secret key
      const safeConfig = {
        ...config,
        secretKey: config.secretKey.slice(0, 8) + '********',
      };

      res.json(safeConfig);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch webhook config' });
    }
  });

  /**
   * PATCH /api/webhooks/config
   * Update webhook configuration
   */
  router.patch('/api/webhooks/config', (req: Request, res: Response): void => {
    try {
      const updates = req.body as Partial<WebhookConfig>;

      // Don't allow updating secret key through this endpoint
      delete updates.secretKey;

      webhookService.updateConfig(updates);

      const config = webhookService.getConfig();
      const safeConfig = {
        ...config,
        secretKey: config.secretKey.slice(0, 8) + '********',
      };

      res.json(safeConfig);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update webhook config' });
    }
  });

  /**
   * POST /api/webhooks/config/regenerate-secret
   * Regenerate webhook secret key
   */
  router.post('/api/webhooks/config/regenerate-secret', (_req: Request, res: Response) => {
    try {
      const newSecret = webhookService.generateSecretKey();
      webhookService.updateConfig({ secretKey: newSecret });

      res.json({
        message: 'Secret key regenerated successfully',
        secretKey: newSecret,
        warning: 'Update this secret in your TradingView alerts immediately',
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to regenerate secret key' });
    }
  });
}

export { webhookService };
