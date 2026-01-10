/**
 * Health Monitoring Module
 * Exports for system health monitoring and automated recovery
 */

// Main Service
export { HealthMonitoringService } from './HealthMonitoringService.js';

// Monitors
export { ExchangeHealthMonitor } from './monitors/ExchangeHealthMonitor.js';
export { DatabaseHealthMonitor } from './monitors/DatabaseHealthMonitor.js';
export { TradingHealthMonitor } from './monitors/TradingHealthMonitor.js';
export { SystemHealthMonitor } from './monitors/SystemHealthMonitor.js';

// Alert & Recovery
export { AlertManager } from './AlertManager.js';
export { AutoRecoveryManager } from './recovery/AutoRecoveryManager.js';

// Utilities
export { CircuitBreaker } from './utils/CircuitBreaker.js';

// Types
export * from './types.js';

// Re-export configuration types
export type { ExchangeHealthMonitorConfig } from './monitors/ExchangeHealthMonitor.js';
export type { DatabaseHealthMonitorConfig } from './monitors/DatabaseHealthMonitor.js';
export type { TradingHealthMonitorConfig } from './monitors/TradingHealthMonitor.js';
export type { SystemHealthMonitorConfig } from './monitors/SystemHealthMonitor.js';
export type { AlertManagerConfig } from './AlertManager.js';
export type { RecoveryConfig, RecoveryContext } from './recovery/AutoRecoveryManager.js';
