/**
 * Примеры использования системы уведомлений
 */

import { NotificationManager, NotificationImportance, NotificationCategory } from '../src/notifications/index.js';
import type { NotificationConfig, PositionData } from '../src/notifications/types.js';

/**
 * Пример 1: Базовая конфигурация с Telegram и Console
 */
async function basicExample() {
  console.log('\n=== Example 1: Basic Telegram + Console ===\n');

  const config: NotificationConfig = {
    enabled: true,
    console: {
      enabled: true,
      minImportance: NotificationImportance.LOW,
    },
    telegram: {
      enabled: true,
      botToken: process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN',
      chatId: process.env.TELEGRAM_CHAT_ID || 'YOUR_CHAT_ID',
      minImportance: NotificationImportance.MEDIUM,
    },
  };

  const notificationManager = new NotificationManager(config);

  // Отправка тестового уведомления
  console.log('Sending test notification...');
  await notificationManager.sendTest();

  // Уведомление об открытии позиции
  const positionData: PositionData = {
    symbol: 'BTCUSDT',
    side: 'long',
    entryPrice: 45000,
    size: 0.1,
    stopLoss: 44000,
    takeProfit: 47000,
  };

  console.log('\nSending position opened notification...');
  await notificationManager.notifyPositionOpened(positionData);
}

/**
 * Пример 2: Уведомление о закрытии позиции с прибылью
 */
async function positionClosedExample() {
  console.log('\n=== Example 2: Position Closed with Profit ===\n');

  const config: NotificationConfig = {
    enabled: true,
    console: {
      enabled: true,
      minImportance: NotificationImportance.LOW,
    },
  };

  const notificationManager = new NotificationManager(config);

  const positionData: PositionData = {
    symbol: 'ETHUSDT',
    side: 'long',
    entryPrice: 2500,
    exitPrice: 2650,
    size: 1.5,
    pnl: 225,
    pnlPercent: 6.0,
    duration: 3600000, // 1 hour in milliseconds
  };

  await notificationManager.notifyPositionClosed(positionData);
}

/**
 * Пример 3: Риск-уведомления
 */
async function riskNotificationsExample() {
  console.log('\n=== Example 3: Risk Notifications ===\n');

  const config: NotificationConfig = {
    enabled: true,
    console: {
      enabled: true,
      minImportance: NotificationImportance.LOW,
    },
    telegram: {
      enabled: true,
      botToken: process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN',
      chatId: process.env.TELEGRAM_CHAT_ID || 'YOUR_CHAT_ID',
      minImportance: NotificationImportance.HIGH, // Только важные уведомления в Telegram
    },
  };

  const notificationManager = new NotificationManager(config);

  // Уведомление о приближении к дневному лимиту
  console.log('Sending daily limit warning...');
  await notificationManager.notifyDailyLimit(4.5, 5.0);

  // Уведомление о просадке
  console.log('\nSending drawdown warning...');
  await notificationManager.notifyDrawdown(18.5, 20.0);
}

/**
 * Пример 4: Множественные каналы с фильтрами
 */
async function multiChannelWithFiltersExample() {
  console.log('\n=== Example 4: Multi-Channel with Filters ===\n');

  const config: NotificationConfig = {
    enabled: true,
    console: {
      enabled: true,
      minImportance: NotificationImportance.LOW,
    },
    telegram: {
      enabled: true,
      botToken: process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN',
      chatId: process.env.TELEGRAM_CHAT_ID || 'YOUR_CHAT_ID',
      minImportance: NotificationImportance.MEDIUM,
    },
    discord: {
      enabled: true,
      webhookUrl: process.env.DISCORD_WEBHOOK_URL || 'YOUR_WEBHOOK_URL',
      username: 'Trading Bot',
      minImportance: NotificationImportance.HIGH,
    },
    // Фильтр: отправлять только критические уведомления о рисках
    filters: [
      {
        category: NotificationCategory.RISK,
        importance: NotificationImportance.CRITICAL,
      },
      {
        category: NotificationCategory.TRADING,
        importance: [NotificationImportance.MEDIUM, NotificationImportance.HIGH],
      },
    ],
  };

  const notificationManager = new NotificationManager(config);

  // Это уведомление пройдет фильтр (RISK + CRITICAL)
  await notificationManager.notifyDrawdown(19.5, 20.0);

  // Это уведомление тоже пройдет (TRADING + MEDIUM)
  const positionData: PositionData = {
    symbol: 'BTCUSDT',
    side: 'long',
    entryPrice: 45000,
    size: 0.1,
  };
  await notificationManager.notifyPositionOpened(positionData);
}

/**
 * Пример 5: Telegram бот с командами
 */
async function telegramBotExample() {
  console.log('\n=== Example 5: Telegram Bot with Commands ===\n');

  const config: NotificationConfig = {
    enabled: true,
    telegram: {
      enabled: true,
      botToken: process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN',
      chatId: process.env.TELEGRAM_CHAT_ID || 'YOUR_CHAT_ID',
      minImportance: NotificationImportance.LOW,
    },
  };

  const notificationManager = new NotificationManager(config);

  // Получение Telegram канала
  const telegramChannel = notificationManager.getChannel('telegram' as any);

  if (telegramChannel) {
    // Регистрация custom команд
    (telegramChannel as any).registerCommand('/status', async () => {
      return '🤖 *Bot Status*\n\nStatus: Running\nUptime: 2h 15m\nOpen Positions: 3\nDaily P&L: +2.5%';
    });

    (telegramChannel as any).registerCommand('/balance', async () => {
      return '💰 *Account Balance*\n\nTotal: $10,250\nAvailable: $8,500\nLocked: $1,750';
    });

    (telegramChannel as any).registerCommand('/positions', async () => {
      return '📊 *Open Positions*\n\n1. BTCUSDT LONG @ 45000 (+2.3%)\n2. ETHUSDT LONG @ 2500 (+1.8%)\n3. SOLUSDT SHORT @ 120 (-0.5%)';
    });

    console.log('Telegram bot commands registered');
    console.log('Starting command listener...');

    // Запуск прослушивания команд (в реальном приложении)
    // await (telegramChannel as any).startCommandListener();
    console.log('Command listener would be running (commented out for example)');
  }
}

/**
 * Пример 6: Проверка статистики
 */
async function statisticsExample() {
  console.log('\n=== Example 6: Notification Statistics ===\n');

  const config: NotificationConfig = {
    enabled: true,
    console: {
      enabled: true,
      minImportance: NotificationImportance.LOW,
    },
  };

  const notificationManager = new NotificationManager(config);

  // Отправка нескольких уведомлений
  await notificationManager.sendTest();

  const positionData: PositionData = {
    symbol: 'BTCUSDT',
    side: 'long',
    entryPrice: 45000,
    size: 0.1,
  };

  await notificationManager.notifyPositionOpened(positionData);
  await notificationManager.notifyDailyLimit(4.5, 5.0);

  // Получение статистики
  const stats = notificationManager.getStats();
  console.log('\n📊 Notification Statistics:');
  console.log(JSON.stringify(stats, null, 2));

  // Получение истории
  const history = notificationManager.getHistory(5);
  console.log('\n📜 Last 5 Notifications:');
  history.forEach((notification, index) => {
    console.log(`${index + 1}. [${notification.importance}] ${notification.title} - ${notification.message}`);
  });
}

/**
 * Пример 7: Email уведомления
 */
async function emailExample() {
  console.log('\n=== Example 7: Email Notifications ===\n');

  const config: NotificationConfig = {
    enabled: true,
    console: {
      enabled: true,
      minImportance: NotificationImportance.LOW,
    },
    email: {
      enabled: true,
      smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        password: process.env.EMAIL_PASSWORD || 'your-password',
        from: 'trading-bot@example.com',
      },
      recipients: ['admin@example.com'],
      minImportance: NotificationImportance.CRITICAL, // Только критические на email
    },
  };

  const notificationManager = new NotificationManager(config);

  // Это уведомление будет отправлено на email (CRITICAL)
  await notificationManager.notifyDrawdown(19.8, 20.0);
}

/**
 * Запуск всех примеров
 */
async function runAllExamples() {
  try {
    await basicExample();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await positionClosedExample();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await riskNotificationsExample();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await multiChannelWithFiltersExample();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await telegramBotExample();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await statisticsExample();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await emailExample();

    console.log('\n✅ All examples completed!\n');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Запуск примеров
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}
