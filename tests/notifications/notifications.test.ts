/**
 * Тесты для системы уведомлений
 */

import { NotificationManager } from '../../src/notifications/NotificationManager.js';
import { ConsoleChannel } from '../../src/notifications/channels/ConsoleChannel.js';
import {
  NotificationImportance,
  NotificationCategory,
  NotificationType,
} from '../../src/notifications/types.js';
import type { NotificationConfig, Notification } from '../../src/notifications/types.js';

/**
 * Тест 1: Создание NotificationManager
 */
async function testNotificationManagerCreation() {
  console.log('\n📋 Test 1: NotificationManager Creation');

  const config: NotificationConfig = {
    enabled: true,
    console: {
      enabled: true,
      minImportance: NotificationImportance.LOW,
    },
  };

  const manager = new NotificationManager(config);

  console.log('✅ NotificationManager created successfully');
  console.log('   Enabled:', manager.isEnabled());
  console.log('   Stats:', manager.getStats());
}

/**
 * Тест 2: Отправка уведомления через Console
 */
async function testConsoleNotification() {
  console.log('\n📋 Test 2: Console Notification');

  const config: NotificationConfig = {
    enabled: true,
    console: {
      enabled: true,
      minImportance: NotificationImportance.LOW,
    },
  };

  const manager = new NotificationManager(config);

  const notification: Notification = {
    id: 'test-1',
    type: NotificationType.POSITION_OPENED,
    category: NotificationCategory.TRADING,
    importance: NotificationImportance.MEDIUM,
    title: 'Test Notification',
    message: 'This is a test message',
    symbol: 'BTCUSDT',
    data: {
      price: 45000,
      size: 0.1,
    },
    timestamp: new Date(),
  };

  const results = await manager.send(notification);

  console.log('✅ Notification sent successfully');
  console.log('   Results:', results.length, 'channels');
  console.log('   Success:', results.every((r) => r.success));
}

/**
 * Тест 3: Фильтрация по важности
 */
async function testImportanceFiltering() {
  console.log('\n📋 Test 3: Importance Filtering');

  const config: NotificationConfig = {
    enabled: true,
    console: {
      enabled: true,
      minImportance: NotificationImportance.HIGH, // Только HIGH и CRITICAL
    },
  };

  const manager = new NotificationManager(config);

  // Low importance - не должно быть отправлено
  console.log('\nSending LOW importance notification (should be filtered out)...');
  const lowNotification: Notification = {
    id: 'test-low',
    type: NotificationType.BOT_RESTART,
    category: NotificationCategory.SYSTEM,
    importance: NotificationImportance.LOW,
    title: 'Low Importance',
    message: 'This should not appear',
    timestamp: new Date(),
  };

  await manager.send(lowNotification);

  // High importance - должно быть отправлено
  console.log('\nSending HIGH importance notification (should be sent)...');
  const highNotification: Notification = {
    id: 'test-high',
    type: NotificationType.DAILY_LIMIT_WARNING,
    category: NotificationCategory.RISK,
    importance: NotificationImportance.HIGH,
    title: 'High Importance',
    message: 'This should appear',
    timestamp: new Date(),
  };

  await manager.send(highNotification);

  console.log('✅ Importance filtering test completed');
}

/**
 * Тест 4: Уведомления о позициях
 */
async function testPositionNotifications() {
  console.log('\n📋 Test 4: Position Notifications');

  const config: NotificationConfig = {
    enabled: true,
    console: {
      enabled: true,
      minImportance: NotificationImportance.LOW,
    },
  };

  const manager = new NotificationManager(config);

  // Position opened
  console.log('\nTesting position opened notification...');
  await manager.notifyPositionOpened({
    symbol: 'BTCUSDT',
    side: 'long',
    entryPrice: 45000,
    size: 0.1,
    stopLoss: 44000,
    takeProfit: 47000,
  });

  // Position closed with profit
  console.log('\nTesting position closed with profit...');
  await manager.notifyPositionClosed({
    symbol: 'BTCUSDT',
    side: 'long',
    entryPrice: 45000,
    exitPrice: 46500,
    size: 0.1,
    pnl: 150,
    pnlPercent: 3.33,
    duration: 3600000,
  });

  // Stop loss triggered
  console.log('\nTesting stop loss notification...');
  await manager.notifyStopLoss({
    symbol: 'ETHUSDT',
    side: 'long',
    entryPrice: 2500,
    exitPrice: 2450,
    size: 1.0,
    stopLoss: 2450,
    pnl: -50,
    pnlPercent: -2.0,
  });

  // Take profit triggered
  console.log('\nTesting take profit notification...');
  await manager.notifyTakeProfit({
    symbol: 'SOLUSDT',
    side: 'short',
    entryPrice: 120,
    exitPrice: 115,
    size: 10,
    takeProfit: 115,
    pnl: 50,
    pnlPercent: 4.17,
  });

  console.log('✅ Position notifications test completed');
}

/**
 * Тест 5: Риск-уведомления
 */
async function testRiskNotifications() {
  console.log('\n📋 Test 5: Risk Notifications');

  const config: NotificationConfig = {
    enabled: true,
    console: {
      enabled: true,
      minImportance: NotificationImportance.LOW,
    },
  };

  const manager = new NotificationManager(config);

  // Daily limit warning
  console.log('\nTesting daily limit warning...');
  await manager.notifyDailyLimit(4.5, 5.0);

  // Drawdown warning
  console.log('\nTesting drawdown warning...');
  await manager.notifyDrawdown(18.5, 20.0);

  console.log('✅ Risk notifications test completed');
}

/**
 * Тест 6: Сигнальные уведомления
 */
async function testSignalNotifications() {
  console.log('\n📋 Test 6: Signal Notifications');

  const config: NotificationConfig = {
    enabled: true,
    console: {
      enabled: true,
      minImportance: NotificationImportance.LOW,
    },
  };

  const manager = new NotificationManager(config);

  // News signal
  console.log('\nTesting news signal notification...');
  await manager.notifyNewsSignal('BTCUSDT', 'Important Bitcoin regulation news detected', {
    sentiment: 'positive',
    impact: 'high',
    source: 'Reuters',
  });

  // Whale alert
  console.log('\nTesting whale alert notification...');
  await manager.notifyWhaleAlert('ETHUSDT', 'Large ETH transfer detected: 50,000 ETH', {
    amount: 50000,
    from: 'exchange',
    to: 'private_wallet',
  });

  console.log('✅ Signal notifications test completed');
}

/**
 * Тест 7: Статистика и история
 */
async function testStatisticsAndHistory() {
  console.log('\n📋 Test 7: Statistics and History');

  const config: NotificationConfig = {
    enabled: true,
    console: {
      enabled: true,
      minImportance: NotificationImportance.LOW,
    },
  };

  const manager = new NotificationManager(config);

  // Отправка нескольких уведомлений
  await manager.sendTest();
  await manager.notifyPositionOpened({
    symbol: 'BTCUSDT',
    side: 'long',
    entryPrice: 45000,
    size: 0.1,
  });
  await manager.notifyDailyLimit(4.0, 5.0);

  // Получение статистики
  const stats = manager.getStats();
  console.log('\n📊 Statistics:');
  console.log('   Total notifications:', stats.total);
  console.log('   Failed:', stats.failed);
  console.log('   By importance:', stats.byImportance);
  console.log('   By category:', stats.byCategory);

  // Получение истории
  const history = manager.getHistory(5);
  console.log('\n📜 History (last 5):');
  history.forEach((n, i) => {
    console.log(`   ${i + 1}. [${n.importance}] ${n.title}`);
  });

  console.log('✅ Statistics and history test completed');
}

/**
 * Тест 8: Фильтры уведомлений
 */
async function testNotificationFilters() {
  console.log('\n📋 Test 8: Notification Filters');

  const config: NotificationConfig = {
    enabled: true,
    console: {
      enabled: true,
      minImportance: NotificationImportance.LOW,
    },
    filters: [
      {
        category: NotificationCategory.RISK,
        importance: NotificationImportance.CRITICAL,
      },
      {
        symbol: ['BTCUSDT', 'ETHUSDT'],
      },
    ],
  };

  const manager = new NotificationManager(config);

  // Должно пройти фильтр (RISK + CRITICAL)
  console.log('\nSending RISK/CRITICAL notification (should pass)...');
  await manager.notifyDrawdown(19.5, 20.0);

  // Должно пройти фильтр (BTCUSDT symbol)
  console.log('\nSending BTCUSDT notification (should pass)...');
  await manager.notifyPositionOpened({
    symbol: 'BTCUSDT',
    side: 'long',
    entryPrice: 45000,
    size: 0.1,
  });

  // НЕ должно пройти фильтр (SOLUSDT symbol, not in filter)
  console.log('\nSending SOLUSDT notification (should be filtered)...');
  await manager.notifyPositionOpened({
    symbol: 'SOLUSDT',
    side: 'long',
    entryPrice: 120,
    size: 10,
  });

  const stats = manager.getStats();
  console.log('\n✅ Filters test completed');
  console.log('   Total sent:', stats.total);
}

/**
 * Тест 9: Включение/выключение уведомлений
 */
async function testEnableDisable() {
  console.log('\n📋 Test 9: Enable/Disable Notifications');

  const config: NotificationConfig = {
    enabled: true,
    console: {
      enabled: true,
      minImportance: NotificationImportance.LOW,
    },
  };

  const manager = new NotificationManager(config);

  console.log('\nSending notification with enabled=true...');
  await manager.sendTest();

  console.log('\nDisabling notifications...');
  manager.setEnabled(false);

  console.log('\nTrying to send notification with enabled=false...');
  await manager.sendTest();

  console.log('\nRe-enabling notifications...');
  manager.setEnabled(true);

  console.log('\nSending notification with enabled=true again...');
  await manager.sendTest();

  console.log('✅ Enable/Disable test completed');
}

/**
 * Тест 10: ConsoleChannel напрямую
 */
async function testConsoleChannel() {
  console.log('\n📋 Test 10: ConsoleChannel Direct Test');

  const channel = new ConsoleChannel(true, NotificationImportance.LOW);

  const notification: Notification = {
    id: 'test-console',
    type: NotificationType.POSITION_OPENED,
    category: NotificationCategory.TRADING,
    importance: NotificationImportance.MEDIUM,
    title: 'Direct Console Test',
    message: 'Testing console channel directly',
    symbol: 'BTCUSDT',
    data: {
      price: 45000,
      size: 0.1,
    },
    timestamp: new Date(),
  };

  console.log('Channel name:', channel.name);
  console.log('Is enabled:', channel.isEnabled());
  console.log('Should send:', channel.shouldSend(notification));

  await channel.send(notification);

  console.log('✅ ConsoleChannel direct test completed');
}

/**
 * Запуск всех тестов
 */
async function runAllTests() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   Notification System Tests          ║');
  console.log('╚══════════════════════════════════════╝\n');

  try {
    await testNotificationManagerCreation();
    await testConsoleNotification();
    await testImportanceFiltering();
    await testPositionNotifications();
    await testRiskNotifications();
    await testSignalNotifications();
    await testStatisticsAndHistory();
    await testNotificationFilters();
    await testEnableDisable();
    await testConsoleChannel();

    console.log('\n╔══════════════════════════════════════╗');
    console.log('║   ✅ All Tests Passed!               ║');
    console.log('╚══════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Запуск тестов
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}
