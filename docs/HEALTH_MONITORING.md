# Health Monitoring & Automated Recovery

Comprehensive system health monitoring with automated recovery for the trading bot.

## Overview

The Health Monitoring System provides:

- **Real-time monitoring** of all critical components
- **Multi-level alerts** (INFO, WARNING, CRITICAL)
- **Automated recovery** actions
- **Circuit breaker** pattern for failure prevention
- **Health dashboard** with detailed metrics
- **REST API** for monitoring integration

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│         HealthMonitoringService                          │
│  (Main orchestrator)                                    │
└───────────────────┬─────────────────────────────────────┘
                    │
        ┌───────────┼───────────┬───────────┐
        │           │           │           │
┌───────▼──────┐ ┌─▼──────┐ ┌─▼──────┐ ┌──▼──────┐
│ Exchange     │ │Database│ │Trading │ │ System  │
│ Health       │ │Health  │ │Health  │ │ Health  │
│ Monitor      │ │Monitor │ │Monitor │ │ Monitor │
└──────────────┘ └────────┘ └────────┘ └─────────┘
        │
┌───────┴──────────────────────────────────────────┐
│                                                   │
│  ┌─────────────┐      ┌──────────────────┐      │
│  │AlertManager │      │AutoRecoveryManager│      │
│  └─────────────┘      └──────────────────┘      │
│                                                   │
└───────────────────────────────────────────────────┘
```

## Components

### 1. Health Monitors

#### ExchangeHealthMonitor
Monitors exchange API health:
- API connectivity
- WebSocket status
- Latency measurements
- Rate limit tracking
- Order placement testing

#### DatabaseHealthMonitor
Monitors Integram database:
- Connection status
- Query performance
- Connection pool stats
- Replication lag (if applicable)

#### TradingHealthMonitor
Monitors trading operations:
- Active positions count
- Pending/stale orders
- Daily P&L tracking
- Risk limit compliance
- Signal generation
- Failed execution tracking

#### SystemHealthMonitor
Monitors system resources:
- CPU usage
- Memory usage (with leak detection)
- Disk space
- Network connectivity
- Process uptime

### 2. Alert Manager

Multi-level alert system:
- **INFO**: Informational alerts
- **WARNING**: Potential issues requiring attention
- **CRITICAL**: Immediate action required

Features:
- Alert cooldowns to prevent spam
- Alert history tracking
- Filtering by component/level
- Integration with notification system

### 3. Auto Recovery Manager

Automated recovery actions:
- WebSocket reconnection with exponential backoff
- REST API fallback
- Database reconnection
- Failed order retry
- Memory cleanup
- Emergency stop mechanism

### 4. Circuit Breaker

Prevents cascading failures:
- **CLOSED**: Normal operation
- **OPEN**: Too many failures, blocking requests
- **HALF_OPEN**: Testing if service recovered

## Usage

### Basic Setup

```typescript
import {
  HealthMonitoringService,
  ExchangeHealthMonitor,
  DatabaseHealthMonitor,
  TradingHealthMonitor,
  SystemHealthMonitor,
} from './monitoring';

// Create config
const config = {
  enabled: true,
  checkIntervals: {
    exchange: 30,  // Check every 30 seconds
    database: 60,
    trading: 30,
    system: 60,
  },
  thresholds: {
    exchange: {
      maxLatency: 5000,           // 5 seconds
      minRateLimitRemaining: 10,  // 10%
    },
    database: {
      maxQueryTime: 5000,         // 5 seconds
      maxStorageUsed: 90,         // 90%
      maxReplicationLag: 60,      // 60 seconds
    },
    trading: {
      maxStaleOrderAge: 60,       // 60 seconds
      maxDailyDrawdown: 5,        // 5%
      maxFailedExecutions: 5,
      maxHoursSinceLastSignal: 24,
    },
    system: {
      maxCpuUsage: 90,            // 90%
      maxMemoryUsage: 90,
      maxDiskUsage: 90,
    },
  },
  alerts: {
    enabled: true,
    channels: ['telegram', 'email', 'console'],
    rules: [
      // Alert rules configuration
    ],
  },
  recovery: {
    enabled: true,
    autoReconnect: true,
    maxRetries: 5,
    retryDelay: 5,
    emergencyStop: {
      enabled: true,
      closePositions: false,
    },
  },
};

// Initialize service
const healthMonitoring = new HealthMonitoringService(config);

// Add monitors (optional - add only what you need)
healthMonitoring.addExchangeMonitor(exchangeMonitor);
healthMonitoring.setDatabaseMonitor(databaseMonitor);
healthMonitoring.setTradingMonitor(tradingMonitor);

// Start monitoring
await healthMonitoring.start();

// Get dashboard
const dashboard = await healthMonitoring.getHealthDashboard();
console.log(dashboard);

// Stop monitoring
await healthMonitoring.stop();
```

### REST API Endpoints

#### GET /api/health/dashboard
Get complete health dashboard with all components

**Response:**
```json
{
  "overallStatus": "healthy",
  "lastUpdate": "2024-01-10T12:00:00.000Z",
  "uptime": 3600,
  "exchanges": [...],
  "database": {...},
  "trading": {...},
  "system": {...},
  "recentAlerts": [...]
}
```

#### GET /api/health/exchanges
Get health status of all exchanges

#### GET /api/health/database
Get database health status

#### GET /api/health/trading
Get trading module health status

#### GET /api/health/system
Get system resources health status

#### GET /api/health/alerts
Get alert history

**Query Parameters:**
- `limit` (number): Max number of alerts to return
- `level` (string): Filter by alert level (info/warning/critical)
- `componentType` (string): Filter by component type

#### GET /api/health/alerts/unresolved
Get unresolved alerts

#### POST /api/health/alerts/:alertId/resolve
Resolve a specific alert

#### GET /api/health/recovery/history
Get recovery action history

#### POST /api/health/emergency-stop
Trigger emergency stop

**Request Body:**
```json
{
  "reason": "Manual intervention required"
}
```

## Alert Rules

Configure alert rules to trigger notifications:

```typescript
const alertRule = {
  id: 'high-latency',
  condition: 'exchange.latency > 5000',
  level: AlertLevel.WARNING,
  message: 'High exchange latency detected',
  cooldown: 300,  // 5 minutes
  actions: [
    'Check network connection',
    'Switch to backup endpoint',
  ],
  enabled: true,
};
```

### Default Alert Rules

1. **Exchange Alerts**
   - High latency (>5s)
   - WebSocket disconnected
   - Rate limit near exhaustion (>90%)

2. **Database Alerts**
   - Slow queries (>5s)
   - Connection failures
   - High storage usage (>90%)

3. **Trading Alerts**
   - Daily drawdown limit exceeded
   - Multiple failed executions
   - Stale orders detected
   - No signals for extended period

4. **System Alerts**
   - High CPU usage (>90%)
   - High memory usage (>90%)
   - Low disk space (<10%)
   - Network connectivity issues

## Recovery Actions

### Automatic Recovery

The system automatically attempts recovery for:

1. **WebSocket Connection Lost**
   - Reconnect with exponential backoff
   - Fall back to REST API if reconnection fails

2. **Database Connection Lost**
   - Reconnect after delay
   - Notify admin if reconnection fails

3. **High Memory Usage**
   - Clear caches
   - Trigger garbage collection

4. **Failed Order Execution**
   - Retry with exponential backoff
   - Alert after max retries exceeded

### Emergency Stop

Triggered when:
- Daily drawdown limit exceeded
- Critical system failure
- Manual intervention

Actions:
1. Disable signal processing
2. Cancel all pending orders
3. Close all positions (if configured)
4. Notify administrators
5. Log incident

## Testing

Run tests:
```bash
npm run test:monitoring
```

Run example:
```bash
npm run example:health
```

## Configuration

### Health Check Intervals

Recommended intervals:
- **Exchange**: 30 seconds (frequent, lightweight)
- **Database**: 60 seconds (moderate)
- **Trading**: 30 seconds (frequent, important)
- **System**: 60 seconds (moderate)

### Thresholds

Adjust thresholds based on your environment:

**Conservative** (for production):
```typescript
{
  maxCpuUsage: 80,
  maxMemoryUsage: 80,
  maxLatency: 3000,
  maxDailyDrawdown: 3,
}
```

**Aggressive** (for testing):
```typescript
{
  maxCpuUsage: 95,
  maxMemoryUsage: 95,
  maxLatency: 10000,
  maxDailyDrawdown: 10,
}
```

## Best Practices

1. **Alert Cooldowns**: Use appropriate cooldowns to prevent alert fatigue
2. **Recovery Testing**: Test recovery mechanisms in staging environment
3. **Monitor the Monitors**: Track alert and recovery statistics
4. **Emergency Procedures**: Document manual intervention procedures
5. **Regular Review**: Review alert history and adjust thresholds

## Troubleshooting

### High False Alert Rate
- Adjust thresholds
- Increase cooldown periods
- Review alert rules

### Recovery Failures
- Check max retry limits
- Verify recovery context configuration
- Review logs for error details

### Performance Impact
- Increase check intervals
- Disable unnecessary monitors
- Optimize threshold calculations

## Integration

### Notification Channels

Configure notification channels:
```typescript
{
  alerts: {
    channels: ['console', 'telegram', 'email', 'discord'],
  }
}
```

### Custom Monitors

Implement `IHealthMonitor` interface:
```typescript
class CustomHealthMonitor implements IHealthMonitor {
  getName(): string {
    return 'CustomMonitor';
  }

  async check(): Promise<HealthCheckResult> {
    // Your health check logic
    return {
      status: HealthStatus.HEALTHY,
      message: 'All good',
      timestamp: new Date(),
    };
  }

  getStatus(): HealthCheckResult | null {
    return this.lastStatus;
  }
}
```

## References

- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Health Check Patterns](https://microservices.io/patterns/observability/health-check-api.html)
- [SRE Best Practices](https://sre.google/sre-book/monitoring-distributed-systems/)
