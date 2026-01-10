/**
 * Database Health Monitor
 * Monitors Integram database health and performance
 */

import {
  HealthStatus,
  HealthCheckResult,
  DatabaseHealthStatus,
  IHealthMonitor,
} from '../types.js';
import { CircuitBreaker } from '../utils/CircuitBreaker.js';
import { IntegramClient } from '../../database/integram/IntegramClient.js';

export interface DatabaseHealthMonitorConfig {
  client: IntegramClient;
  thresholds: {
    maxQueryTime: number; // in ms
    maxStorageUsed: number; // percentage
    maxReplicationLag?: number; // in seconds
  };
}

export class DatabaseHealthMonitor implements IHealthMonitor {
  private readonly client: IntegramClient;
  private readonly thresholds: DatabaseHealthMonitorConfig['thresholds'];
  private readonly circuitBreaker: CircuitBreaker;
  private queryTimeHistory: number[] = [];
  private maxHistorySize = 10;
  private lastStatus: HealthCheckResult | null = null;
  private currentHealth: DatabaseHealthStatus | null = null;

  constructor(config: DatabaseHealthMonitorConfig) {
    this.client = config.client;
    this.thresholds = config.thresholds;
    this.circuitBreaker = new CircuitBreaker('database', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 5000, // 5 seconds
      resetTimeout: 30000, // 30 seconds
    });
  }

  /**
   * Get monitor name
   */
  getName(): string {
    return 'Database[Integram]';
  }

  /**
   * Perform health check
   */
  async check(): Promise<HealthCheckResult> {
    const errors: string[] = [];
    let status = HealthStatus.HEALTHY;

    try {
      // Check connection
      const connected = await this.testConnection();
      if (!connected) {
        errors.push('Database connection failed');
        status = HealthStatus.CRITICAL;

        this.currentHealth = {
          status: HealthStatus.CRITICAL,
          connected: false,
          queryTime: 0,
          connectionPool: {
            total: 0,
            active: 0,
            idle: 0,
            waiting: 0,
          },
          storageUsed: 0,
          lastCheck: new Date(),
          errors,
        };

        const result: HealthCheckResult = {
          status: HealthStatus.CRITICAL,
          message: 'Database connection failed',
          timestamp: new Date(),
          metadata: {
            connected: false,
          },
        };

        this.lastStatus = result;
        return result;
      }

      // Measure query performance
      const queryTime = await this.measureQueryTime();
      this.recordQueryTime(queryTime);

      if (queryTime > this.thresholds.maxQueryTime) {
        errors.push(`Slow query detected: ${queryTime}ms`);
        status = HealthStatus.WARNING;
      }

      // Get connection pool stats (simplified for Integram)
      const poolStats = this.getConnectionPoolStats();

      // Check storage (if available)
      const storageUsed = 0; // Integram doesn't expose this easily

      // Check replication lag (if configured)
      let replicationLag: number | undefined = undefined;
      if (this.thresholds.maxReplicationLag !== undefined) {
        replicationLag = await this.checkReplicationLag();
        if (replicationLag > this.thresholds.maxReplicationLag) {
          errors.push(`High replication lag: ${replicationLag}s`);
          if (status === HealthStatus.HEALTHY) {
            status = HealthStatus.WARNING;
          }
        }
      }

      // Update current health status
      this.currentHealth = {
        status,
        connected: true,
        queryTime,
        connectionPool: poolStats,
        storageUsed,
        replicationLag,
        lastCheck: new Date(),
        errors,
      };

      const result: HealthCheckResult = {
        status,
        message:
          status === HealthStatus.HEALTHY
            ? 'Database operational'
            : `Issues detected: ${errors.join(', ')}`,
        timestamp: new Date(),
        metadata: {
          queryTime,
          avgQueryTime: this.getAverageQueryTime(),
          connectionPool: poolStats,
          replicationLag,
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
   * Test database connection
   */
  private async testConnection(): Promise<boolean> {
    try {
      return await this.circuitBreaker.execute(async () => {
        // Try to authenticate or check if already authenticated
        try {
          await this.client.authenticate();
          return true;
        } catch (error) {
          // If authentication fails, connection is not available
          return false;
        }
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Measure query execution time
   */
  private async measureQueryTime(): Promise<number> {
    const start = Date.now();

    try {
      await this.circuitBreaker.execute(async () => {
        // Execute a simple query to measure performance
        // This is a lightweight operation for Integram
        await this.client.authenticate();
      });

      return Date.now() - start;
    } catch (error) {
      return Date.now() - start;
    }
  }

  /**
   * Get connection pool statistics
   */
  private getConnectionPoolStats(): DatabaseHealthStatus['connectionPool'] {
    // Integram uses a single HTTP client, so we provide simplified stats
    return {
      total: 1,
      active: 1,
      idle: 0,
      waiting: 0,
    };
  }

  /**
   * Check replication lag (if applicable)
   */
  private async checkReplicationLag(): Promise<number> {
    // Integram is a cloud service, replication lag is not directly accessible
    // Return 0 by default
    return 0;
  }

  /**
   * Record query time measurement
   */
  private recordQueryTime(queryTime: number): void {
    this.queryTimeHistory.unshift(queryTime);

    if (this.queryTimeHistory.length > this.maxHistorySize) {
      this.queryTimeHistory = this.queryTimeHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Get average query time
   */
  private getAverageQueryTime(): number {
    if (this.queryTimeHistory.length === 0) {
      return 0;
    }

    const sum = this.queryTimeHistory.reduce((acc, val) => acc + val, 0);
    return sum / this.queryTimeHistory.length;
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
  getHealth(): DatabaseHealthStatus | null {
    return this.currentHealth;
  }

  /**
   * Get circuit breaker statistics
   */
  getCircuitBreakerStats() {
    return this.circuitBreaker.getStats();
  }
}
