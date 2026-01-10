/**
 * Health Monitoring Tests
 * Tests for health monitoring system
 */

import { strict as assert } from 'assert';
import { CircuitBreaker } from '../../src/monitoring/utils/CircuitBreaker.js';
import { AlertManager } from '../../src/monitoring/AlertManager.js';
import {
  HealthStatus,
  AlertLevel,
  ComponentType,
  CircuitBreakerState,
} from '../../src/monitoring/types.js';

// Test CircuitBreaker
async function testCircuitBreaker() {
  console.log('\n🧪 Testing CircuitBreaker...');

  const breaker = new CircuitBreaker('test', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 1000,
    resetTimeout: 2000,
  });

  // Test successful execution
  const result1 = await breaker.execute(async () => 'success');
  assert.equal(result1, 'success', 'Should execute successfully');
  assert.equal(breaker.getState(), CircuitBreakerState.CLOSED, 'Should be CLOSED');

  // Test failures
  let failureCount = 0;
  for (let i = 0; i < 3; i++) {
    try {
      await breaker.execute(async () => {
        throw new Error('Test failure');
      });
    } catch (error) {
      failureCount++;
    }
  }

  assert.equal(failureCount, 3, 'Should have 3 failures');
  assert.equal(breaker.getState(), CircuitBreakerState.OPEN, 'Should be OPEN after failures');

  // Test that circuit is open
  try {
    await breaker.execute(async () => 'should not execute');
    assert.fail('Should not execute when circuit is open');
  } catch (error) {
    assert.ok(error instanceof Error);
    assert.ok(error.message.includes('Circuit breaker'), 'Should throw circuit breaker error');
  }

  // Reset and test
  breaker.reset();
  assert.equal(breaker.getState(), CircuitBreakerState.CLOSED, 'Should be CLOSED after reset');

  console.log('✅ CircuitBreaker tests passed');
}

// Test AlertManager
async function testAlertManager() {
  console.log('\n🧪 Testing AlertManager...');

  const alertManager = new AlertManager({
    enabled: true,
    rules: [
      {
        id: 'test-rule',
        condition: 'test',
        level: AlertLevel.WARNING,
        message: 'Test alert',
        cooldown: 5,
        actions: ['Check logs'],
        enabled: true,
      },
    ],
    maxAlertHistory: 100,
  });

  // Test triggering alert
  const alert1 = await alertManager.triggerAlert(
    AlertLevel.WARNING,
    'TestComponent',
    ComponentType.SYSTEM,
    'Test warning message',
    { test: true },
    ['Action 1', 'Action 2'],
  );

  assert.ok(alert1.id, 'Alert should have an ID');
  assert.equal(alert1.level, AlertLevel.WARNING, 'Alert level should be WARNING');
  assert.equal(alert1.component, 'TestComponent', 'Component should match');
  assert.equal(alert1.resolved, false, 'Alert should not be resolved');

  // Test getting alert history
  const history = alertManager.getAlertHistory();
  assert.equal(history.length, 1, 'Should have 1 alert in history');
  assert.equal(history[0]?.id, alert1.id, 'Alert IDs should match');

  // Test getting unresolved alerts
  const unresolved = alertManager.getUnresolvedAlerts();
  assert.equal(unresolved.length, 1, 'Should have 1 unresolved alert');

  // Test resolving alert
  alertManager.resolveAlert(alert1.id);
  const unresolvedAfter = alertManager.getUnresolvedAlerts();
  assert.equal(unresolvedAfter.length, 0, 'Should have no unresolved alerts');

  // Test critical alert
  const alert2 = await alertManager.triggerAlert(
    AlertLevel.CRITICAL,
    'TestComponent',
    ComponentType.EXCHANGE,
    'Critical error',
  );

  assert.equal(alert2.level, AlertLevel.CRITICAL, 'Alert level should be CRITICAL');

  // Test stats
  const stats = alertManager.getStats();
  assert.equal(stats.totalAlerts, 2, 'Should have 2 total alerts');
  assert.equal(stats.criticalAlerts, 1, 'Should have 1 critical alert');
  assert.equal(stats.warningAlerts, 1, 'Should have 1 warning alert');

  console.log('✅ AlertManager tests passed');
}

// Test health status types
function testHealthStatus() {
  console.log('\n🧪 Testing Health Status Types...');

  const statuses = [
    HealthStatus.HEALTHY,
    HealthStatus.WARNING,
    HealthStatus.CRITICAL,
    HealthStatus.UNKNOWN,
  ];

  assert.equal(statuses.length, 4, 'Should have 4 status types');
  assert.equal(HealthStatus.HEALTHY, 'healthy', 'HEALTHY should be "healthy"');
  assert.equal(HealthStatus.WARNING, 'warning', 'WARNING should be "warning"');
  assert.equal(HealthStatus.CRITICAL, 'critical', 'CRITICAL should be "critical"');
  assert.equal(HealthStatus.UNKNOWN, 'unknown', 'UNKNOWN should be "unknown"');

  console.log('✅ Health Status types tests passed');
}

// Test alert levels
function testAlertLevels() {
  console.log('\n🧪 Testing Alert Levels...');

  const levels = [AlertLevel.INFO, AlertLevel.WARNING, AlertLevel.CRITICAL];

  assert.equal(levels.length, 3, 'Should have 3 alert levels');
  assert.equal(AlertLevel.INFO, 'info', 'INFO should be "info"');
  assert.equal(AlertLevel.WARNING, 'warning', 'WARNING should be "warning"');
  assert.equal(AlertLevel.CRITICAL, 'critical', 'CRITICAL should be "critical"');

  console.log('✅ Alert Levels tests passed');
}

// Test component types
function testComponentTypes() {
  console.log('\n🧪 Testing Component Types...');

  const types = [
    ComponentType.EXCHANGE,
    ComponentType.DATABASE,
    ComponentType.TRADING,
    ComponentType.SYSTEM,
  ];

  assert.equal(types.length, 4, 'Should have 4 component types');
  assert.equal(ComponentType.EXCHANGE, 'exchange', 'EXCHANGE should be "exchange"');
  assert.equal(ComponentType.DATABASE, 'database', 'DATABASE should be "database"');
  assert.equal(ComponentType.TRADING, 'trading', 'TRADING should be "trading"');
  assert.equal(ComponentType.SYSTEM, 'system', 'SYSTEM should be "system"');

  console.log('✅ Component Types tests passed');
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting Health Monitoring Tests\n');
  console.log('='.repeat(60));

  try {
    // Sync tests
    testHealthStatus();
    testAlertLevels();
    testComponentTypes();

    // Async tests
    await testCircuitBreaker();
    await testAlertManager();

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Tests failed:');
    console.error(error);
    console.error('='.repeat(60) + '\n');
    process.exit(1);
  }
}

// Run tests
runTests();
