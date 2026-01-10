/**
 * Types and interfaces for Health Monitoring System
 */

/**
 * Health status levels
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  UNKNOWN = 'unknown',
}

/**
 * Alert severity levels
 */
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

/**
 * Component types for monitoring
 */
export enum ComponentType {
  EXCHANGE = 'exchange',
  DATABASE = 'database',
  TRADING = 'trading',
  SYSTEM = 'system',
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: HealthStatus;
  message: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Alert definition
 */
export interface Alert {
  id: string;
  level: AlertLevel;
  component: string;
  componentType: ComponentType;
  message: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  actions?: string[];
  resolved?: boolean;
  resolvedAt?: Date;
}

/**
 * Alert rule definition
 */
export interface AlertRule {
  id: string;
  condition: string;
  level: AlertLevel;
  message: string;
  cooldown: number; // Cooldown in seconds
  actions: string[];
  enabled: boolean;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  endpoint: string;
  limit: number;
  remaining: number;
  resetAt: Date;
  utilization: number; // Percentage
}

/**
 * Latency metrics
 */
export interface LatencyMetrics {
  endpoint: string;
  latency: number; // in milliseconds
  timestamp: Date;
  status: 'good' | 'acceptable' | 'poor';
}

/**
 * Exchange health status
 */
export interface ExchangeHealthStatus {
  exchange: string;
  status: HealthStatus;
  apiConnected: boolean;
  websocketConnected: boolean;
  latency: number;
  rateLimit: RateLimitInfo;
  lastCheck: Date;
  errors: string[];
}

/**
 * Database health status
 */
export interface DatabaseHealthStatus {
  status: HealthStatus;
  connected: boolean;
  queryTime: number; // Average query time in ms
  connectionPool: {
    total: number;
    active: number;
    idle: number;
    waiting: number;
  };
  storageUsed: number; // Percentage
  replicationLag?: number; // in seconds
  lastCheck: Date;
  errors: string[];
}

/**
 * Trading health status
 */
export interface TradingHealthStatus {
  status: HealthStatus;
  activePositions: number;
  pendingOrders: number;
  staleOrders: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  riskLimitReached: boolean;
  lastSignalTime: Date;
  failedExecutions24h: number;
  lastCheck: Date;
  errors: string[];
}

/**
 * System resource status
 */
export interface SystemHealthStatus {
  status: HealthStatus;
  cpu: {
    usage: number; // Percentage
    cores: number;
  };
  memory: {
    used: number; // Bytes
    total: number; // Bytes
    percentUsed: number;
  };
  disk: {
    used: number; // Bytes
    total: number; // Bytes
    percentUsed: number;
  };
  network: {
    connected: boolean;
    latency?: number;
  };
  uptime: number; // in seconds
  lastCheck: Date;
  errors: string[];
}

/**
 * Overall health dashboard
 */
export interface HealthDashboard {
  overallStatus: HealthStatus;
  lastUpdate: Date;
  uptime: number;
  exchanges: ExchangeHealthStatus[];
  database: DatabaseHealthStatus;
  trading: TradingHealthStatus;
  system: SystemHealthStatus;
  recentAlerts: Alert[];
}

/**
 * Health monitoring configuration
 */
export interface HealthMonitoringConfig {
  enabled: boolean;
  checkIntervals: {
    exchange: number; // in seconds
    database: number;
    trading: number;
    system: number;
  };
  thresholds: {
    exchange: {
      maxLatency: number; // in ms
      minRateLimitRemaining: number; // percentage
    };
    database: {
      maxQueryTime: number; // in ms
      maxStorageUsed: number; // percentage
      maxReplicationLag: number; // in seconds
    };
    trading: {
      maxStaleOrderAge: number; // in seconds
      maxDailyDrawdown: number; // percentage
      maxFailedExecutions: number;
      maxHoursSinceLastSignal: number;
    };
    system: {
      maxCpuUsage: number; // percentage
      maxMemoryUsage: number; // percentage
      maxDiskUsage: number; // percentage
    };
  };
  alerts: {
    enabled: boolean;
    channels: string[]; // e.g., ['telegram', 'email', 'console']
    rules: AlertRule[];
  };
  recovery: {
    enabled: boolean;
    autoReconnect: boolean;
    maxRetries: number;
    retryDelay: number; // in seconds
    emergencyStop: {
      enabled: boolean;
      closePositions: boolean;
    };
  };
}

/**
 * Circuit breaker state
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number; // in ms
  resetTimeout: number; // in ms
}

/**
 * Recovery action result
 */
export interface RecoveryActionResult {
  action: string;
  success: boolean;
  message: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Health monitor interface
 */
export interface IHealthMonitor {
  check(): Promise<HealthCheckResult>;
  getStatus(): HealthCheckResult | null;
  getName(): string;
}
