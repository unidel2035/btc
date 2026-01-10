/**
 * System Health Monitor
 * Monitors system resources (CPU, memory, disk, network)
 */

import * as os from 'os';
import {
  HealthStatus,
  HealthCheckResult,
  SystemHealthStatus,
  IHealthMonitor,
} from '../types.js';
import { CircuitBreaker } from '../utils/CircuitBreaker.js';

export interface SystemHealthMonitorConfig {
  thresholds: {
    maxCpuUsage: number; // percentage
    maxMemoryUsage: number; // percentage
    maxDiskUsage: number; // percentage
  };
}

export class SystemHealthMonitor implements IHealthMonitor {
  private readonly thresholds: SystemHealthMonitorConfig['thresholds'];
  private readonly circuitBreaker: CircuitBreaker;
  private lastStatus: HealthCheckResult | null = null;
  private currentHealth: SystemHealthStatus | null = null;
  private memorySamples: number[] = [];
  private maxSampleSize = 10;

  constructor(config: SystemHealthMonitorConfig) {
    this.thresholds = config.thresholds;
    this.circuitBreaker = new CircuitBreaker('system', {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 5000, // 5 seconds
      resetTimeout: 30000, // 30 seconds
    });
  }

  /**
   * Get monitor name
   */
  getName(): string {
    return 'System';
  }

  /**
   * Perform health check
   */
  async check(): Promise<HealthCheckResult> {
    const errors: string[] = [];
    let status = HealthStatus.HEALTHY;

    try {
      // Check CPU usage
      const cpuUsage = await this.getCPUUsage();
      if (cpuUsage > this.thresholds.maxCpuUsage) {
        errors.push(`High CPU usage: ${cpuUsage.toFixed(1)}%`);
        status = HealthStatus.WARNING;
      }

      // Check memory usage
      const memoryInfo = this.getMemoryUsage();
      this.recordMemorySample(memoryInfo.percentUsed);

      if (memoryInfo.percentUsed > this.thresholds.maxMemoryUsage) {
        errors.push(`High memory usage: ${memoryInfo.percentUsed.toFixed(1)}%`);
        if (status === HealthStatus.HEALTHY) {
          status = memoryInfo.percentUsed > 95 ? HealthStatus.CRITICAL : HealthStatus.WARNING;
        }
      }

      // Check for memory leak
      const memoryLeakDetected = this.detectMemoryLeak();
      if (memoryLeakDetected) {
        errors.push('Potential memory leak detected');
        if (status === HealthStatus.HEALTHY) {
          status = HealthStatus.WARNING;
        }
      }

      // Check disk space
      const diskInfo = await this.getDiskSpace();
      if (diskInfo.percentUsed > this.thresholds.maxDiskUsage) {
        errors.push(`Low disk space: ${diskInfo.percentUsed.toFixed(1)}% used`);
        if (status === HealthStatus.HEALTHY) {
          status = diskInfo.percentUsed > 95 ? HealthStatus.CRITICAL : HealthStatus.WARNING;
        }
      }

      // Check network connectivity
      const networkInfo = await this.testNetworkConnectivity();
      if (!networkInfo.connected) {
        errors.push('No internet connection');
        status = HealthStatus.CRITICAL;
      }

      // Get process uptime
      const uptime = process.uptime();

      // Update current health status
      this.currentHealth = {
        status,
        cpu: {
          usage: cpuUsage,
          cores: os.cpus().length,
        },
        memory: {
          used: memoryInfo.used,
          total: memoryInfo.total,
          percentUsed: memoryInfo.percentUsed,
        },
        disk: {
          used: diskInfo.used,
          total: diskInfo.total,
          percentUsed: diskInfo.percentUsed,
        },
        network: {
          connected: networkInfo.connected,
          latency: networkInfo.latency,
        },
        uptime,
        lastCheck: new Date(),
        errors,
      };

      const result: HealthCheckResult = {
        status,
        message:
          status === HealthStatus.HEALTHY
            ? 'System resources normal'
            : `Issues detected: ${errors.join(', ')}`,
        timestamp: new Date(),
        metadata: {
          cpuUsage,
          memoryUsage: memoryInfo.percentUsed,
          diskUsage: diskInfo.percentUsed,
          networkConnected: networkInfo.connected,
          uptime,
          memoryLeakDetected,
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
   * Get CPU usage percentage
   */
  private async getCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startMeasure = this.cpuAverage();

      setTimeout(() => {
        const endMeasure = this.cpuAverage();

        const idleDifference = endMeasure.idle - startMeasure.idle;
        const totalDifference = endMeasure.total - startMeasure.total;

        const percentageCPU = 100 - (100 * idleDifference) / totalDifference;
        resolve(percentageCPU);
      }, 100);
    });
  }

  /**
   * Calculate CPU average
   */
  private cpuAverage(): { idle: number; total: number } {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    }

    return {
      idle: totalIdle / cpus.length,
      total: totalTick / cpus.length,
    };
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): {
    used: number;
    total: number;
    percentUsed: number;
  } {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const percentUsed = (used / total) * 100;

    return {
      used,
      total,
      percentUsed,
    };
  }

  /**
   * Get disk space
   */
  private async getDiskSpace(): Promise<{
    used: number;
    total: number;
    percentUsed: number;
  }> {
    try {
      // This is a simplified check for the current directory
      // On Linux, we'd need to parse df output
      // For now, return a mock value
      return {
        used: 50 * 1024 * 1024 * 1024, // 50 GB
        total: 100 * 1024 * 1024 * 1024, // 100 GB
        percentUsed: 50,
      };
    } catch (error) {
      return {
        used: 0,
        total: 0,
        percentUsed: 0,
      };
    }
  }

  /**
   * Test network connectivity
   */
  private async testNetworkConnectivity(): Promise<{
    connected: boolean;
    latency?: number;
  }> {
    try {
      const start = Date.now();

      // Simple check: try to resolve a DNS name
      const dns = await import('dns/promises');
      await dns.resolve('google.com');

      const latency = Date.now() - start;

      return {
        connected: true,
        latency,
      };
    } catch (error) {
      return {
        connected: false,
      };
    }
  }

  /**
   * Record memory sample
   */
  private recordMemorySample(percentUsed: number): void {
    this.memorySamples.unshift(percentUsed);

    if (this.memorySamples.length > this.maxSampleSize) {
      this.memorySamples = this.memorySamples.slice(0, this.maxSampleSize);
    }
  }

  /**
   * Detect potential memory leak
   */
  private detectMemoryLeak(): boolean {
    if (this.memorySamples.length < this.maxSampleSize) {
      return false;
    }

    // Check if memory is consistently increasing
    let increasingCount = 0;
    for (let i = 1; i < this.memorySamples.length; i++) {
      const prev = this.memorySamples[i - 1];
      const current = this.memorySamples[i];
      if (prev !== undefined && current !== undefined && prev < current) {
        increasingCount++;
      }
    }

    // If 80% or more samples show increasing memory, potential leak
    return increasingCount >= this.maxSampleSize * 0.8;
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
  getHealth(): SystemHealthStatus | null {
    return this.currentHealth;
  }

  /**
   * Get circuit breaker statistics
   */
  getCircuitBreakerStats() {
    return this.circuitBreaker.getStats();
  }
}
