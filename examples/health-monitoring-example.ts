/**
 * Health Monitoring Example
 * Demonstrates how to use the health monitoring system
 */

import {
  HealthMonitoringService,
  SystemHealthMonitor,
  AlertManager,
  AlertLevel,
  ComponentType,
} from '../src/monitoring/index.js';

async function main() {
  console.log('🏥 Health Monitoring System Example\n');
  console.log('='.repeat(60));

  // Create health monitoring configuration
  const config = {
    enabled: true,
    checkIntervals: {
      exchange: 30, // seconds
      database: 60,
      trading: 30,
      system: 60,
    },
    thresholds: {
      exchange: {
        maxLatency: 5000, // 5 seconds
        minRateLimitRemaining: 10, // 10%
      },
      database: {
        maxQueryTime: 5000, // 5 seconds
        maxStorageUsed: 90, // 90%
        maxReplicationLag: 60, // 60 seconds
      },
      trading: {
        maxStaleOrderAge: 60, // 60 seconds
        maxDailyDrawdown: 5, // 5%
        maxFailedExecutions: 5,
        maxHoursSinceLastSignal: 24, // 24 hours
      },
      system: {
        maxCpuUsage: 90, // 90%
        maxMemoryUsage: 90, // 90%
        maxDiskUsage: 90, // 90%
      },
    },
    alerts: {
      enabled: true,
      channels: ['console'],
      rules: [
        {
          id: 'high-latency',
          condition: 'exchange.latency > 5000',
          level: AlertLevel.WARNING,
          message: 'High exchange latency detected',
          cooldown: 300, // 5 minutes
          actions: ['Check network', 'Switch exchange endpoint'],
          enabled: true,
        },
        {
          id: 'websocket-disconnected',
          condition: 'exchange.websocket.disconnected',
          level: AlertLevel.CRITICAL,
          message: 'WebSocket connection lost',
          cooldown: 0,
          actions: ['Auto-reconnect', 'Switch to REST fallback'],
          enabled: true,
        },
        {
          id: 'daily-drawdown-exceeded',
          condition: 'trading.dailyDrawdown > config.maxDailyLoss',
          level: AlertLevel.CRITICAL,
          message: 'Daily loss limit exceeded',
          cooldown: 0,
          actions: ['Stop trading', 'Close all positions'],
          enabled: true,
        },
        {
          id: 'high-memory-usage',
          condition: 'system.memory > 90',
          level: AlertLevel.WARNING,
          message: 'High memory usage',
          cooldown: 600, // 10 minutes
          actions: ['Clear cache', 'Trigger garbage collection'],
          enabled: true,
        },
      ],
    },
    recovery: {
      enabled: true,
      autoReconnect: true,
      maxRetries: 5,
      retryDelay: 5, // seconds
      emergencyStop: {
        enabled: true,
        closePositions: false,
      },
    },
  };

  // Initialize health monitoring service
  const healthMonitoring = new HealthMonitoringService(config);

  // Add system monitor (always included)
  const systemMonitor = new SystemHealthMonitor({
    thresholds: config.thresholds.system,
  });

  console.log('✅ Health Monitoring Service initialized\n');

  // Start monitoring
  console.log('🚀 Starting health monitoring...\n');
  await healthMonitoring.start();

  // Wait a bit for first check
  await sleep(2000);

  // Get health dashboard
  console.log('📊 Getting health dashboard...\n');
  const dashboard = await healthMonitoring.getHealthDashboard();

  console.log('Overall Status:', getStatusEmoji(dashboard.overallStatus), dashboard.overallStatus);
  console.log('Last Update:', dashboard.lastUpdate.toISOString());
  console.log('Uptime:', formatUptime(dashboard.uptime), '\n');

  // System Health
  console.log('💻 System Resources:');
  console.log('  Status:', getStatusEmoji(dashboard.system.status), dashboard.system.status);
  console.log(`  CPU Usage: ${dashboard.system.cpu.usage.toFixed(1)}% (${dashboard.system.cpu.cores} cores)`);
  console.log(`  Memory: ${dashboard.system.memory.percentUsed.toFixed(1)}% used`);
  console.log(`  Disk: ${dashboard.system.disk.percentUsed.toFixed(1)}% used`);
  console.log(`  Network: ${dashboard.system.network.connected ? '🟢 Connected' : '🔴 Disconnected'}\n`);

  // Exchanges
  if (dashboard.exchanges.length > 0) {
    console.log('📡 Exchanges:');
    for (const exchange of dashboard.exchanges) {
      console.log(`  ${exchange.exchange}:`);
      console.log('    Status:', getStatusEmoji(exchange.status), exchange.status);
      console.log(`    API: ${exchange.apiConnected ? '🟢' : '🔴'} | WebSocket: ${exchange.websocketConnected ? '🟢' : '🔴'}`);
      console.log(`    Latency: ${exchange.latency}ms`);
      console.log(`    Rate Limit: ${exchange.rateLimit.utilization.toFixed(1)}%`);
    }
    console.log();
  }

  // Database
  console.log('💾 Database:');
  console.log('  Status:', getStatusEmoji(dashboard.database.status), dashboard.database.status);
  console.log(`  Connected: ${dashboard.database.connected ? '🟢' : '🔴'}`);
  console.log(`  Query Time: ${dashboard.database.queryTime}ms avg`);
  console.log(`  Connection Pool: ${dashboard.database.connectionPool.active}/${dashboard.database.connectionPool.total}\n`);

  // Trading
  console.log('🤖 Trading:');
  console.log('  Status:', getStatusEmoji(dashboard.trading.status), dashboard.trading.status);
  console.log(`  Active Positions: ${dashboard.trading.activePositions}`);
  console.log(`  Pending Orders: ${dashboard.trading.pendingOrders}`);
  console.log(`  Daily P&L: ${dashboard.trading.dailyPnL >= 0 ? '+' : ''}${dashboard.trading.dailyPnL.toFixed(2)} (${dashboard.trading.dailyPnLPercent >= 0 ? '+' : ''}${dashboard.trading.dailyPnLPercent.toFixed(2)}%)`);
  console.log(`  Failed Executions (24h): ${dashboard.trading.failedExecutions24h}\n`);

  // Recent Alerts
  if (dashboard.recentAlerts.length > 0) {
    console.log('🚨 Recent Alerts:');
    for (const alert of dashboard.recentAlerts.slice(0, 5)) {
      const emoji = getAlertEmoji(alert.level);
      const status = alert.resolved ? '✅' : '⏳';
      console.log(`  ${status} ${emoji} [${alert.componentType}/${alert.component}] ${alert.message}`);
      console.log(`     ${alert.timestamp.toISOString()}`);
    }
    console.log();
  }

  // Alert Statistics
  const alertManager = healthMonitoring.getAlertManager();
  const alertStats = alertManager.getStats();

  console.log('📈 Alert Statistics:');
  console.log(`  Total Alerts: ${alertStats.totalAlerts}`);
  console.log(`  Unresolved: ${alertStats.unresolvedAlerts}`);
  console.log(`  Critical: ${alertStats.criticalAlerts} | Warning: ${alertStats.warningAlerts} | Info: ${alertStats.infoAlerts}\n`);

  // Recovery Statistics
  const recoveryManager = healthMonitoring.getRecoveryManager();
  const recoveryStats = recoveryManager.getStats();

  console.log('🔧 Recovery Statistics:');
  console.log(`  Total Actions: ${recoveryStats.totalActions}`);
  console.log(`  Successful: ${recoveryStats.successfulActions} (${recoveryStats.successRate.toFixed(1)}%)`);
  console.log(`  Failed: ${recoveryStats.failedActions}\n`);

  // Demonstrate manual alert triggering
  console.log('🧪 Triggering test alert...');
  await alertManager.triggerAlert(
    AlertLevel.INFO,
    'Example',
    ComponentType.SYSTEM,
    'This is a test alert from the example',
    { test: true },
  );

  // Wait a bit
  await sleep(2000);

  // Stop monitoring
  console.log('\n🛑 Stopping health monitoring...');
  await healthMonitoring.stop();

  console.log('✅ Example completed!\n');
  console.log('='.repeat(60));
}

// Helper functions
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'healthy':
      return '🟢';
    case 'warning':
      return '🟡';
    case 'critical':
      return '🔴';
    default:
      return '⚪';
  }
}

function getAlertEmoji(level: string): string {
  switch (level) {
    case 'critical':
      return '🚨';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    default:
      return '📢';
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

// Run example
main().catch((error) => {
  console.error('❌ Error running example:', error);
  process.exit(1);
});
