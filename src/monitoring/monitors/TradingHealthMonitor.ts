/**
 * Trading Health Monitor
 * Monitors trading module health and performance
 */

import {
  HealthStatus,
  HealthCheckResult,
  TradingHealthStatus,
  IHealthMonitor,
} from '../types.js';
import { CircuitBreaker } from '../utils/CircuitBreaker.js';

export interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  quantity: number;
  unrealizedPnL?: number;
  openedAt: Date;
}

export interface Order {
  id: string;
  symbol: string;
  status: string;
  createdAt: Date;
}

export interface TradingDataProvider {
  getActivePositions(): Promise<Position[]>;
  getPendingOrders(): Promise<Order[]>;
  getDailyPnL(): Promise<{ pnl: number; pnlPercent: number }>;
  getLastSignalTime(): Promise<Date>;
  getFailedExecutions(hours: number): Promise<number>;
  getRiskLimitStatus(): Promise<{
    dailyDrawdownExceeded: boolean;
    maxPositionsExceeded: boolean;
  }>;
}

export interface TradingHealthMonitorConfig {
  dataProvider: TradingDataProvider;
  thresholds: {
    maxStaleOrderAge: number; // in seconds
    maxDailyDrawdown: number; // percentage
    maxFailedExecutions: number;
    maxHoursSinceLastSignal: number;
  };
  tradingEnabled: boolean;
}

export class TradingHealthMonitor implements IHealthMonitor {
  private readonly dataProvider: TradingDataProvider;
  private readonly thresholds: TradingHealthMonitorConfig['thresholds'];
  private readonly tradingEnabled: boolean;
  private readonly circuitBreaker: CircuitBreaker;
  private lastStatus: HealthCheckResult | null = null;
  private currentHealth: TradingHealthStatus | null = null;

  constructor(config: TradingHealthMonitorConfig) {
    this.dataProvider = config.dataProvider;
    this.thresholds = config.thresholds;
    this.tradingEnabled = config.tradingEnabled;
    this.circuitBreaker = new CircuitBreaker('trading', {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 10000, // 10 seconds
      resetTimeout: 60000, // 1 minute
    });
  }

  /**
   * Get monitor name
   */
  getName(): string {
    return 'Trading';
  }

  /**
   * Perform health check
   */
  async check(): Promise<HealthCheckResult> {
    const errors: string[] = [];
    let status = HealthStatus.HEALTHY;

    try {
      // Get active positions
      const positions = await this.circuitBreaker.execute(() =>
        this.dataProvider.getActivePositions(),
      );

      // Check if no positions but trading enabled (informational)
      if (positions.length === 0 && this.tradingEnabled) {
        // This is informational, not an error
        // Could indicate waiting for signals
      }

      // Get pending orders and check for stale orders
      const pendingOrders = await this.circuitBreaker.execute(() =>
        this.dataProvider.getPendingOrders(),
      );

      const staleOrders = pendingOrders.filter((order) => {
        const ageInSeconds = (Date.now() - order.createdAt.getTime()) / 1000;
        return ageInSeconds > this.thresholds.maxStaleOrderAge;
      });

      if (staleOrders.length > 0) {
        errors.push(`${staleOrders.length} stale orders detected`);
        status = HealthStatus.WARNING;
      }

      // Check risk limits
      const riskStatus = await this.circuitBreaker.execute(() =>
        this.dataProvider.getRiskLimitStatus(),
      );

      if (riskStatus.dailyDrawdownExceeded) {
        errors.push('Daily drawdown limit exceeded');
        status = HealthStatus.CRITICAL;
      }

      if (riskStatus.maxPositionsExceeded) {
        errors.push('Maximum positions limit exceeded');
        if (status === HealthStatus.HEALTHY) {
          status = HealthStatus.WARNING;
        }
      }

      // Get daily PnL
      const dailyPnL = await this.circuitBreaker.execute(() =>
        this.dataProvider.getDailyPnL(),
      );

      // Check signal generation
      const lastSignalTime = await this.circuitBreaker.execute(() =>
        this.dataProvider.getLastSignalTime(),
      );

      const hoursSinceSignal = (Date.now() - lastSignalTime.getTime()) / (1000 * 60 * 60);

      if (hoursSinceSignal > this.thresholds.maxHoursSinceLastSignal && this.tradingEnabled) {
        errors.push(`No signals generated in ${hoursSinceSignal.toFixed(1)}h`);
        if (status === HealthStatus.HEALTHY) {
          status = HealthStatus.WARNING;
        }
      }

      // Check failed executions
      const failedExecutions = await this.circuitBreaker.execute(() =>
        this.dataProvider.getFailedExecutions(24),
      );

      if (failedExecutions > this.thresholds.maxFailedExecutions) {
        errors.push(`${failedExecutions} failed executions in last 24h`);
        status = HealthStatus.CRITICAL;
      }

      // Update current health status
      this.currentHealth = {
        status,
        activePositions: positions.length,
        pendingOrders: pendingOrders.length,
        staleOrders: staleOrders.length,
        dailyPnL: dailyPnL.pnl,
        dailyPnLPercent: dailyPnL.pnlPercent,
        riskLimitReached: riskStatus.dailyDrawdownExceeded,
        lastSignalTime,
        failedExecutions24h: failedExecutions,
        lastCheck: new Date(),
        errors,
      };

      const result: HealthCheckResult = {
        status,
        message:
          status === HealthStatus.HEALTHY
            ? 'Trading operational'
            : `Issues detected: ${errors.join(', ')}`,
        timestamp: new Date(),
        metadata: {
          activePositions: positions.length,
          pendingOrders: pendingOrders.length,
          staleOrders: staleOrders.length,
          dailyPnL: dailyPnL.pnl,
          dailyPnLPercent: dailyPnL.pnlPercent,
          hoursSinceLastSignal: hoursSinceSignal,
          failedExecutions24h: failedExecutions,
        },
      };

      this.lastStatus = result;
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);

      const result: HealthCheckResult = {
        status: HealthStatus.CRITICAL,
        message: `Health check failed: ${errorMessage}`,
        timestamp: new Date(),
        metadata: {
          error: errorMessage,
        },
      };

      this.lastStatus = result;
      return result;
    }
  }

  /**
   * Get last status
   */
  getStatus(): HealthCheckResult | null {
    return this.lastStatus;
  }

  /**
   * Get current health details
   */
  getHealth(): TradingHealthStatus | null {
    return this.currentHealth;
  }

  /**
   * Get circuit breaker statistics
   */
  getCircuitBreakerStats() {
    return this.circuitBreaker.getStats();
  }
}
