/**
 * Health Monitoring API Routes
 * REST API endpoints for system health monitoring
 */

import type { Request, Response, Router } from 'express';
import type { HealthMonitoringService } from '../monitoring/HealthMonitoringService.js';
import { AlertLevel, ComponentType } from '../monitoring/types.js';

interface HealthRoutesConfig {
  healthMonitoring?: HealthMonitoringService;
}

export function setupHealthRoutes(router: Router, config: HealthRoutesConfig): void {
  const { healthMonitoring } = config;

  /**
   * GET /api/health/dashboard
   * Get complete health dashboard
   */
  router.get('/api/health/dashboard', async (_req: Request, res: Response) => {
    try {
      if (!healthMonitoring) {
        res.status(503).json({ error: 'Health monitoring not configured' });
        return;
      }

      const dashboard = await healthMonitoring.getHealthDashboard();
      res.json(dashboard);
    } catch (error) {
      console.error('Error fetching health dashboard:', error);
      res.status(500).json({ error: 'Failed to fetch health dashboard' });
    }
  });

  /**
   * GET /api/health/exchanges
   * Get health status of all exchanges
   */
  router.get('/api/health/exchanges', async (_req: Request, res: Response) => {
    try {
      if (!healthMonitoring) {
        res.status(503).json({ error: 'Health monitoring not configured' });
        return;
      }

      const dashboard = await healthMonitoring.getHealthDashboard();
      res.json({
        exchanges: dashboard.exchanges,
        timestamp: dashboard.lastUpdate,
      });
    } catch (error) {
      console.error('Error fetching exchange health:', error);
      res.status(500).json({ error: 'Failed to fetch exchange health' });
    }
  });

  /**
   * GET /api/health/database
   * Get database health status
   */
  router.get('/api/health/database', async (_req: Request, res: Response) => {
    try {
      if (!healthMonitoring) {
        res.status(503).json({ error: 'Health monitoring not configured' });
        return;
      }

      const dashboard = await healthMonitoring.getHealthDashboard();
      res.json({
        database: dashboard.database,
        timestamp: dashboard.lastUpdate,
      });
    } catch (error) {
      console.error('Error fetching database health:', error);
      res.status(500).json({ error: 'Failed to fetch database health' });
    }
  });

  /**
   * GET /api/health/trading
   * Get trading module health status
   */
  router.get('/api/health/trading', async (_req: Request, res: Response) => {
    try {
      if (!healthMonitoring) {
        res.status(503).json({ error: 'Health monitoring not configured' });
        return;
      }

      const dashboard = await healthMonitoring.getHealthDashboard();
      res.json({
        trading: dashboard.trading,
        timestamp: dashboard.lastUpdate,
      });
    } catch (error) {
      console.error('Error fetching trading health:', error);
      res.status(500).json({ error: 'Failed to fetch trading health' });
    }
  });

  /**
   * GET /api/health/system
   * Get system resources health status
   */
  router.get('/api/health/system', async (_req: Request, res: Response) => {
    try {
      if (!healthMonitoring) {
        res.status(503).json({ error: 'Health monitoring not configured' });
        return;
      }

      const dashboard = await healthMonitoring.getHealthDashboard();
      res.json({
        system: dashboard.system,
        timestamp: dashboard.lastUpdate,
      });
    } catch (error) {
      console.error('Error fetching system health:', error);
      res.status(500).json({ error: 'Failed to fetch system health' });
    }
  });

  /**
   * GET /api/health/alerts
   * Get alert history
   */
  router.get('/api/health/alerts', (_req: Request, res: Response) => {
    try {
      if (!healthMonitoring) {
        res.status(503).json({ error: 'Health monitoring not configured' });
        return;
      }

      const limit = parseInt((_req.query.limit as string) || '50');
      const level = _req.query.level as AlertLevel | undefined;
      const componentType = _req.query.componentType as ComponentType | undefined;

      const alertManager = healthMonitoring.getAlertManager();
      let alerts = alertManager.getAlertHistory(limit);

      // Filter by level if provided
      if (level) {
        alerts = alerts.filter((a) => a.level === level);
      }

      // Filter by component type if provided
      if (componentType) {
        alerts = alerts.filter((a) => a.componentType === componentType);
      }

      res.json({
        alerts,
        stats: alertManager.getStats(),
      });
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  });

  /**
   * GET /api/health/alerts/unresolved
   * Get unresolved alerts
   */
  router.get('/api/health/alerts/unresolved', (_req: Request, res: Response) => {
    try {
      if (!healthMonitoring) {
        res.status(503).json({ error: 'Health monitoring not configured' });
        return;
      }

      const alertManager = healthMonitoring.getAlertManager();
      const alerts = alertManager.getUnresolvedAlerts();

      res.json({
        alerts,
        count: alerts.length,
      });
    } catch (error) {
      console.error('Error fetching unresolved alerts:', error);
      res.status(500).json({ error: 'Failed to fetch unresolved alerts' });
    }
  });

  /**
   * POST /api/health/alerts/:alertId/resolve
   * Resolve an alert
   */
  router.post('/api/health/alerts/:alertId/resolve', (req: Request, res: Response) => {
    try {
      if (!healthMonitoring) {
        res.status(503).json({ error: 'Health monitoring not configured' });
        return;
      }

      const alertId = req.params.alertId as string;
      const alertManager = healthMonitoring.getAlertManager();
      alertManager.resolveAlert(alertId);

      res.json({
        success: true,
        message: 'Alert resolved',
      });
    } catch (error) {
      console.error('Error resolving alert:', error);
      res.status(500).json({ error: 'Failed to resolve alert' });
    }
  });

  /**
   * GET /api/health/recovery/history
   * Get recovery action history
   */
  router.get('/api/health/recovery/history', (_req: Request, res: Response) => {
    try {
      if (!healthMonitoring) {
        res.status(503).json({ error: 'Health monitoring not configured' });
        return;
      }

      const limit = parseInt((_req.query.limit as string) || '50');
      const recoveryManager = healthMonitoring.getRecoveryManager();
      const history = recoveryManager.getHistory(limit);
      const stats = recoveryManager.getStats();

      res.json({
        history,
        stats,
      });
    } catch (error) {
      console.error('Error fetching recovery history:', error);
      res.status(500).json({ error: 'Failed to fetch recovery history' });
    }
  });

  /**
   * GET /api/health/status
   * Get overall monitoring status
   */
  router.get('/api/health/status', (_req: Request, res: Response) => {
    try {
      if (!healthMonitoring) {
        res.status(503).json({ error: 'Health monitoring not configured' });
        return;
      }

      res.json({
        monitoring: healthMonitoring.isMonitoring(),
        uptime: healthMonitoring.getUptime(),
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error fetching health status:', error);
      res.status(500).json({ error: 'Failed to fetch health status' });
    }
  });

  /**
   * POST /api/health/emergency-stop
   * Trigger emergency stop
   */
  router.post('/api/health/emergency-stop', async (req: Request, res: Response) => {
    try {
      if (!healthMonitoring) {
        res.status(503).json({ error: 'Health monitoring not configured' });
        return;
      }

      const reason = (req.body.reason as string) || 'Manual emergency stop';
      const recoveryManager = healthMonitoring.getRecoveryManager();
      const result = await recoveryManager.emergencyStop(reason);

      res.json({
        success: result.success,
        message: result.message,
        timestamp: result.timestamp,
      });
    } catch (error) {
      console.error('Error triggering emergency stop:', error);
      res.status(500).json({ error: 'Failed to trigger emergency stop' });
    }
  });
}
