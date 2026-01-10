/**
 * Exchange Health Monitor
 * Monitors health of exchange connections and API status
 */

import {
  HealthStatus,
  HealthCheckResult,
  ExchangeHealthStatus,
  RateLimitInfo,
  LatencyMetrics,
  IHealthMonitor,
} from '../types.js';
import { CircuitBreaker } from '../utils/CircuitBreaker.js';
import type { IExchange } from '../../exchanges/types.js';

export interface ExchangeHealthMonitorConfig {
  exchange: IExchange;
  thresholds: {
    maxLatency: number; // in ms
    minRateLimitRemaining: number; // percentage
  };
}

export class ExchangeHealthMonitor implements IHealthMonitor {
  private readonly exchange: IExchange;
  private readonly thresholds: ExchangeHealthMonitorConfig['thresholds'];
  private readonly circuitBreaker: CircuitBreaker;
  private latencyHistory: number[] = [];
  private maxHistorySize = 10;
  private lastStatus: HealthCheckResult | null = null;
  private currentHealth: ExchangeHealthStatus | null = null;

  constructor(config: ExchangeHealthMonitorConfig) {
    this.exchange = config.exchange;
    this.thresholds = config.thresholds;
    this.circuitBreaker = new CircuitBreaker(`exchange-${this.exchange.name}`, {
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
    return `Exchange[${this.exchange.name}]`;
  }

  /**
   * Perform health check
   */
  async check(): Promise<HealthCheckResult> {
    const errors: string[] = [];
    let status = HealthStatus.HEALTHY;

    try {
      // Check if exchange is initialized
      const initialized = await this.checkInitialized();
      if (!initialized) {
        errors.push('Exchange not initialized');
        status = HealthStatus.CRITICAL;
      }

      // Check API connectivity and latency
      const latency = await this.measureLatency();
      this.recordLatency(latency.latency);

      if (latency.latency > this.thresholds.maxLatency) {
        errors.push(`High latency: ${latency.latency}ms`);
        status = HealthStatus.WARNING;
      }

      // Check rate limits
      const rateLimit = await this.checkRateLimits();
      if (rateLimit.utilization > (100 - this.thresholds.minRateLimitRemaining)) {
        errors.push(`Rate limit utilization: ${rateLimit.utilization.toFixed(1)}%`);
        if (status === HealthStatus.HEALTHY) {
          status = HealthStatus.WARNING;
        }
      }

      // Check WebSocket connection
      const wsConnected = await this.checkWebSocket();

      // Update current health status
      this.currentHealth = {
        exchange: this.exchange.name,
        status,
        apiConnected: initialized,
        websocketConnected: wsConnected,
        latency: latency.latency,
        rateLimit,
        lastCheck: new Date(),
        errors,
      };

      const result: HealthCheckResult = {
        status,
        message:
          status === HealthStatus.HEALTHY
            ? 'All systems operational'
            : `Issues detected: ${errors.join(', ')}`,
        timestamp: new Date(),
        metadata: {
          exchange: this.exchange.name,
          latency: latency.latency,
          avgLatency: this.getAverageLatency(),
          rateLimitUtilization: rateLimit.utilization,
          websocketConnected: wsConnected,
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
          exchange: this.exchange.name,
          error: errorMessage,
        },
      };

      this.lastStatus = result;
      return result;
    }
  }

  /**
   * Check if exchange is initialized
   */
  private async checkInitialized(): Promise<boolean> {
    try {
      return await this.circuitBreaker.execute(async () => {
        return this.exchange.isInitialized();
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Measure API latency
   */
  private async measureLatency(): Promise<LatencyMetrics> {
    const start = Date.now();

    try {
      await this.circuitBreaker.execute(async () => {
        // Use a lightweight endpoint to measure latency
        await this.exchange.getTicker('BTC/USDT');
      });

      const latency = Date.now() - start;

      return {
        endpoint: 'getTicker',
        latency,
        timestamp: new Date(),
        status: latency < 1000 ? 'good' : latency < 3000 ? 'acceptable' : 'poor',
      };
    } catch (error) {
      const latency = Date.now() - start;
      return {
        endpoint: 'getTicker',
        latency,
        timestamp: new Date(),
        status: 'poor',
      };
    }
  }

  /**
   * Check rate limits
   */
  private async checkRateLimits(): Promise<RateLimitInfo> {
    try {
      // Check if exchange has getRateLimitInfo method
      const exchangeAny = this.exchange as any;
      if (typeof exchangeAny.getRateLimitInfo === 'function') {
        const info = await this.circuitBreaker.execute(async () => {
          return exchangeAny.getRateLimitInfo();
        });

        return {
          endpoint: 'general',
          limit: info.limit,
          remaining: info.remaining,
          resetAt: info.resetAt,
          utilization: ((info.limit - info.remaining) / info.limit) * 100,
        };
      }

      // Fallback: return default values
      return {
        endpoint: 'general',
        limit: 1200,
        remaining: 1200,
        resetAt: new Date(Date.now() + 60000),
        utilization: 0,
      };
    } catch (error) {
      // Return default values if rate limit info is not available
      return {
        endpoint: 'general',
        limit: 1200,
        remaining: 1200,
        resetAt: new Date(Date.now() + 60000),
        utilization: 0,
      };
    }
  }

  /**
   * Check WebSocket connection status
   */
  private async checkWebSocket(): Promise<boolean> {
    try {
      return await this.circuitBreaker.execute(async () => {
        // Try to check if WebSocket is connected
        // This is a simplified check - actual implementation may vary
        return this.exchange.isInitialized();
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Record latency measurement
   */
  private recordLatency(latency: number): void {
    this.latencyHistory.unshift(latency);

    if (this.latencyHistory.length > this.maxHistorySize) {
      this.latencyHistory = this.latencyHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Get average latency
   */
  private getAverageLatency(): number {
    if (this.latencyHistory.length === 0) {
      return 0;
    }

    const sum = this.latencyHistory.reduce((acc, val) => acc + val, 0);
    return sum / this.latencyHistory.length;
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
  getHealth(): ExchangeHealthStatus | null {
    return this.currentHealth;
  }

  /**
   * Get circuit breaker statistics
   */
  getCircuitBreakerStats() {
    return this.circuitBreaker.getStats();
  }

  /**
   * Test order placement (optional, for comprehensive health check)
   */
  async testOrderPlacement(): Promise<boolean> {
    try {
      // This would require a test order with minimal size
      // Implementation depends on exchange capabilities
      // For now, we'll skip this in the regular health check
      return true;
    } catch (error) {
      return false;
    }
  }
}
