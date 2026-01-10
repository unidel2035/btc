/**
 * Health Monitoring Service
 * Main orchestrator for system health monitoring
 */

import {
  HealthStatus,
  HealthDashboard,
  HealthMonitoringConfig,
  ComponentType,
  AlertLevel,
} from './types.js';
import { ExchangeHealthMonitor } from './monitors/ExchangeHealthMonitor.js';
import { DatabaseHealthMonitor } from './monitors/DatabaseHealthMonitor.js';
import { TradingHealthMonitor } from './monitors/TradingHealthMonitor.js';
import { SystemHealthMonitor } from './monitors/SystemHealthMonitor.js';
import { AlertManager } from './AlertManager.js';
import { AutoRecoveryManager } from './recovery/AutoRecoveryManager.js';

export class HealthMonitoringService {
  private readonly config: HealthMonitoringConfig;
  private readonly exchangeMonitors: Map<string, ExchangeHealthMonitor> = new Map();
  private databaseMonitor?: DatabaseHealthMonitor;
  private tradingMonitor?: TradingHealthMonitor;
  private readonly systemMonitor: SystemHealthMonitor;
  private readonly alertManager: AlertManager;
  private readonly recoveryManager: AutoRecoveryManager;

  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;
  private startTime: Date | null = null;

  constructor(config: HealthMonitoringConfig) {
    this.config = config;

    // Initialize System Monitor (always required)
    this.systemMonitor = new SystemHealthMonitor({
      thresholds: config.thresholds.system,
    });

    // Initialize Alert Manager
    this.alertManager = new AlertManager({
      enabled: config.alerts.enabled,
      rules: config.alerts.rules,
      maxAlertHistory: 1000,
    });

    // Initialize Auto Recovery Manager
    this.recoveryManager = new AutoRecoveryManager(config.recovery, {});
  }

  /**
   * Add exchange monitor
   */
  addExchangeMonitor(monitor: ExchangeHealthMonitor): void {
    const exchange = monitor.getName();
    this.exchangeMonitors.set(exchange, monitor);
    console.log(`✅ Exchange monitor added: ${exchange}`);
  }

  /**
   * Set database monitor
   */
  setDatabaseMonitor(monitor: DatabaseHealthMonitor): void {
    this.databaseMonitor = monitor;
    console.log('✅ Database monitor set');
  }

  /**
   * Set trading monitor
   */
  setTradingMonitor(monitor: TradingHealthMonitor): void {
    this.tradingMonitor = monitor;
    console.log('✅ Trading monitor set');
  }

  /**
   * Start health monitoring
   */
  start(): void {
    if (this.isRunning) {
      console.warn('⚠️  Health monitoring already running');
      return;
    }

    if (!this.config.enabled) {
      console.warn('⚠️  Health monitoring is disabled in config');
      return;
    }

    console.log('🏥 Starting Health Monitoring Service...');
    this.isRunning = true;
    this.startTime = new Date();

    // Start monitoring intervals
    this.startExchangeMonitoring();
    this.startDatabaseMonitoring();
    this.startTradingMonitoring();
    this.startSystemMonitoring();

    console.log('✅ Health Monitoring Service started');
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn('⚠️  Health monitoring not running');
      return;
    }

    console.log('🛑 Stopping Health Monitoring Service...');

    // Clear all intervals
    for (const [name, interval] of this.monitoringIntervals) {
      clearInterval(interval);
      console.log(`⏹️  Stopped monitoring: ${name}`);
    }

    this.monitoringIntervals.clear();
    this.isRunning = false;

    console.log('✅ Health Monitoring Service stopped');
  }

  /**
   * Start exchange monitoring
   */
  private startExchangeMonitoring(): void {
    if (this.exchangeMonitors.size === 0) {
      return;
    }

    const interval = this.config.checkIntervals.exchange * 1000;

    const checkExchanges = async () => {
      for (const [name, monitor] of this.exchangeMonitors) {
        try {
          const result = await monitor.check();

          if (result.status === HealthStatus.WARNING) {
            await this.alertManager.triggerAlert(
              AlertLevel.WARNING,
              name,
              ComponentType.EXCHANGE,
              result.message,
              result.metadata,
            );
          } else if (result.status === HealthStatus.CRITICAL) {
            await this.alertManager.triggerAlert(
              AlertLevel.CRITICAL,
              name,
              ComponentType.EXCHANGE,
              result.message,
              result.metadata,
            );

            // Attempt recovery
            await this.recoveryManager.handleFailure('exchange.api', new Error(result.message));
          }
        } catch (error) {
          console.error(`Error checking ${name}:`, error);
        }
      }
    };

    // Run immediately
    void checkExchanges();

    // Then run on interval
    const intervalId = setInterval(() => void checkExchanges(), interval);
    this.monitoringIntervals.set('exchanges', intervalId);
  }

  /**
   * Start database monitoring
   */
  private startDatabaseMonitoring(): void {
    if (!this.databaseMonitor) {
      return;
    }

    const interval = this.config.checkIntervals.database * 1000;

    const checkDatabase = async () => {
      if (!this.databaseMonitor) return;

      try {
        const result = await this.databaseMonitor.check();

        if (result.status === HealthStatus.WARNING) {
          await this.alertManager.triggerAlert(
            AlertLevel.WARNING,
            'Integram',
            ComponentType.DATABASE,
            result.message,
            result.metadata,
          );
        } else if (result.status === HealthStatus.CRITICAL) {
          await this.alertManager.triggerAlert(
            AlertLevel.CRITICAL,
            'Integram',
            ComponentType.DATABASE,
            result.message,
            result.metadata,
          );

          // Attempt recovery
          await this.recoveryManager.handleFailure('database', new Error(result.message));
        }
      } catch (error) {
        console.error('Error checking database:', error);
      }
    };

    // Run immediately
    void checkDatabase();

    // Then run on interval
    const intervalId = setInterval(() => void checkDatabase(), interval);
    this.monitoringIntervals.set('database', intervalId);
  }

  /**
   * Start trading monitoring
   */
  private startTradingMonitoring(): void {
    if (!this.tradingMonitor) {
      return;
    }

    const interval = this.config.checkIntervals.trading * 1000;

    const checkTrading = async () => {
      if (!this.tradingMonitor) return;

      try {
        const result = await this.tradingMonitor.check();

        if (result.status === HealthStatus.WARNING) {
          await this.alertManager.triggerAlert(
            AlertLevel.WARNING,
            'TradingEngine',
            ComponentType.TRADING,
            result.message,
            result.metadata,
          );
        } else if (result.status === HealthStatus.CRITICAL) {
          await this.alertManager.triggerAlert(
            AlertLevel.CRITICAL,
            'TradingEngine',
            ComponentType.TRADING,
            result.message,
            result.metadata,
          );

          // Check if emergency stop is needed
          const health = this.tradingMonitor.getHealth();
          if (health?.riskLimitReached) {
            await this.recoveryManager.emergencyStop('Daily drawdown limit exceeded');
          }
        }
      } catch (error) {
        console.error('Error checking trading:', error);
      }
    };

    // Run immediately
    void checkTrading();

    // Then run on interval
    const intervalId = setInterval(() => void checkTrading(), interval);
    this.monitoringIntervals.set('trading', intervalId);
  }

  /**
   * Start system monitoring
   */
  private startSystemMonitoring(): void {
    const interval = this.config.checkIntervals.system * 1000;

    const checkSystem = async () => {
      try {
        const result = await this.systemMonitor.check();

        if (result.status === HealthStatus.WARNING) {
          await this.alertManager.triggerAlert(
            AlertLevel.WARNING,
            'Resources',
            ComponentType.SYSTEM,
            result.message,
            result.metadata,
          );
        } else if (result.status === HealthStatus.CRITICAL) {
          await this.alertManager.triggerAlert(
            AlertLevel.CRITICAL,
            'Resources',
            ComponentType.SYSTEM,
            result.message,
            result.metadata,
          );

          // Attempt memory recovery if needed
          if (result.message.includes('memory')) {
            await this.recoveryManager.handleFailure('system.memory', new Error(result.message));
          }
        }
      } catch (error) {
        console.error('Error checking system:', error);
      }
    };

    // Run immediately
    void checkSystem();

    // Then run on interval
    const intervalId = setInterval(() => void checkSystem(), interval);
    this.monitoringIntervals.set('system', intervalId);
  }

  /**
   * Get overall health dashboard
   */
  getHealthDashboard(): HealthDashboard {
    // Collect all health statuses
    const exchanges = Array.from(this.exchangeMonitors.values())
      .map((monitor) => monitor.getHealth())
      .filter((health) => health !== null);

    const database = this.databaseMonitor?.getHealth() ?? {
      status: HealthStatus.UNKNOWN,
      connected: false,
      queryTime: 0,
      connectionPool: { total: 0, active: 0, idle: 0, waiting: 0 },
      storageUsed: 0,
      lastCheck: new Date(),
      errors: [],
    };

    const trading = this.tradingMonitor?.getHealth() ?? {
      status: HealthStatus.UNKNOWN,
      activePositions: 0,
      pendingOrders: 0,
      staleOrders: 0,
      dailyPnL: 0,
      dailyPnLPercent: 0,
      riskLimitReached: false,
      lastSignalTime: new Date(),
      failedExecutions24h: 0,
      lastCheck: new Date(),
      errors: [],
    };

    const system = this.systemMonitor.getHealth() ?? {
      status: HealthStatus.UNKNOWN,
      cpu: { usage: 0, cores: 0 },
      memory: { used: 0, total: 0, percentUsed: 0 },
      disk: { used: 0, total: 0, percentUsed: 0 },
      network: { connected: false },
      uptime: 0,
      lastCheck: new Date(),
      errors: [],
    };

    // Determine overall status
    const allStatuses = [
      ...exchanges.map((e) => e.status),
      database.status,
      trading.status,
      system.status,
    ];

    let overallStatus = HealthStatus.HEALTHY;
    if (allStatuses.includes(HealthStatus.CRITICAL)) {
      overallStatus = HealthStatus.CRITICAL;
    } else if (allStatuses.includes(HealthStatus.WARNING)) {
      overallStatus = HealthStatus.WARNING;
    } else if (allStatuses.includes(HealthStatus.UNKNOWN)) {
      overallStatus = HealthStatus.UNKNOWN;
    }

    // Get recent alerts
    const recentAlerts = this.alertManager.getAlertHistory(10);

    // Calculate uptime
    const uptime = this.startTime ? (Date.now() - this.startTime.getTime()) / 1000 : 0;

    return {
      overallStatus,
      lastUpdate: new Date(),
      uptime,
      exchanges,
      database,
      trading,
      system,
      recentAlerts,
    };
  }

  /**
   * Get alert manager
   */
  getAlertManager(): AlertManager {
    return this.alertManager;
  }

  /**
   * Get recovery manager
   */
  getRecoveryManager(): AutoRecoveryManager {
    return this.recoveryManager;
  }

  /**
   * Check if monitoring is running
   */
  isMonitoring(): boolean {
    return this.isRunning;
  }

  /**
   * Get service uptime in seconds
   */
  getUptime(): number {
    if (!this.startTime) {
      return 0;
    }
    return (Date.now() - this.startTime.getTime()) / 1000;
  }
}
