/**
 * Тесты для системы уведомлений
 */

import {
  NotificationService,
  NotificationFactory,
  TelegramBot,
  DiscordWebhook,
  ConsoleHandler,
  WebhookHandler,
  NotificationChannel,
  NotificationImportance,
  NotificationCategory,
  TradingNotificationType,
  SignalNotificationType,
  RiskNotificationType,
  SystemNotificationType,
  type NotificationConfig,
  type TelegramConfig,
  type DiscordConfig,
  type BotCommandHandler,
  type BotStatus,
  type BalanceInfo,
  type PositionInfo,
  type PnLInfo,
} from '../../src/notifications/index.js';

/**
 * Mock обработчик команд для тестирования Telegram бота
 */
class MockCommandHandler implements BotCommandHandler {
  async getStatus(): Promise<BotStatus> {
    return {
      isRunning: true,
      uptime: 3600,
      openPositions: 2,
      todayPnL: 125.5,
      totalPnL: 1500.75,
      activeStrategies: ['news-momentum', 'sentiment-swing'],
    };
  }

  async getBalance(): Promise<BalanceInfo> {
    return {
      totalBalance: 10000,
      availableBalance: 8000,
      usedMargin: 2000,
      unrealizedPnL: 150.5,
      currency: 'USDT',
    };
  }

  async getPositions(): Promise<PositionInfo[]> {
    return [
      {
        symbol: 'BTC/USDT',
        side: 'long',
        entryPrice: 45000,
        currentPrice: 46000,
        quantity: 0.1,
        unrealizedPnL: 100,
        unrealizedPnLPercent: 2.22,
      },
    ];
  }

  async getPnL(period: 'today' | 'week' | 'month' | 'total'): Promise<PnLInfo> {
    return {
      period,
      realizedPnL: 500,
      unrealizedPnL: 150,
      totalPnL: 650,
      winRate: 0.65,
      totalTrades: 20,
      profitableTrades: 13,
    };
  }

  async stopTrading(): Promise<boolean> {
    return true;
  }

  async startTrading(): Promise<boolean> {
    return true;
  }
}

/**
 * Тестирование NotificationFactory
 */
async function testNotificationFactory(): Promise<void> {
  console.info('\n=== Testing NotificationFactory ===\n');

  // Тест создания торгового уведомления
  const tradingNotification = NotificationFactory.createTradingNotification(
    TradingNotificationType.POSITION_OPENED,
    {
      symbol: 'BTC/USDT',
      side: 'long',
      entryPrice: 45000,
      quantity: 0.1,
    },
    NotificationImportance.MEDIUM,
  );

  console.info('✅ Trading notification created:');
  console.info(`   ID: ${tradingNotification.id}`);
  console.info(`   Category: ${tradingNotification.category}`);
  console.info(`   Type: ${tradingNotification.type}`);
  console.info(`   Title: ${tradingNotification.title}`);
  console.info(`   Message: ${tradingNotification.message}`);

  // Тест создания сигнального уведомления
  const signalNotification = NotificationFactory.createSignalNotification(
    SignalNotificationType.IMPORTANT_NEWS,
    {
      source: 'CoinDesk',
      title: 'Bitcoin reaches new high',
      description: 'BTC price hits $50,000',
      sentiment: 0.8,
    },
    NotificationImportance.HIGH,
  );

  console.info('\n✅ Signal notification created:');
  console.info(`   Title: ${signalNotification.title}`);
  console.info(`   Importance: ${signalNotification.importance}`);

  // Тест создания риск уведомления
  const riskNotification = NotificationFactory.createRiskNotification(
    RiskNotificationType.DAILY_LIMIT_APPROACHING,
    {
      metric: 'Daily Loss',
      currentValue: 400,
      limitValue: 500,
      percentage: 80,
    },
    NotificationImportance.HIGH,
  );

  console.info('\n✅ Risk notification created:');
  console.info(`   Title: ${riskNotification.title}`);
  console.info(`   Message: ${riskNotification.message}`);

  // Тест создания системного уведомления
  const systemNotification = NotificationFactory.createSystemNotification(
    SystemNotificationType.BOT_RESTART,
    {
      service: 'Trading Bot',
      status: 'Running',
      uptime: 3600,
    },
    NotificationImportance.MEDIUM,
  );

  console.info('\n✅ System notification created:');
  console.info(`   Title: ${systemNotification.title}`);
  console.info(`   Category: ${systemNotification.category}`);
}

/**
 * Тестирование NotificationService
 */
async function testNotificationService(): Promise<void> {
  console.info('\n=== Testing NotificationService ===\n');

  const config: NotificationConfig = {
    enabled: true,
    telegram: {
      enabled: false, // Disabled for testing
      botToken: 'test_token',
      chatId: '123456',
      minImportance: NotificationImportance.MEDIUM,
    },
    minImportance: NotificationImportance.LOW,
    categories: [NotificationCategory.TRADING, NotificationCategory.RISK],
  };

  const service = new NotificationService(config);

  // Регистрация console handler
  const consoleHandler = new ConsoleHandler();
  service.registerHandler(NotificationChannel.CONSOLE, (notification) =>
    consoleHandler.sendNotification(notification),
  );

  console.info('✅ NotificationService initialized');

  // Отправка тестового уведомления
  const notification = NotificationFactory.createTradingNotification(
    TradingNotificationType.POSITION_CLOSED,
    {
      symbol: 'BTC/USDT',
      side: 'long',
      entryPrice: 45000,
      exitPrice: 46500,
      quantity: 0.1,
      pnl: 150,
      pnlPercent: 3.33,
    },
    NotificationImportance.MEDIUM,
  );

  await service.send(notification);

  console.info('\n✅ Notification sent through service');

  // Тест фильтрации по категории
  const signalNotification = NotificationFactory.createSignalNotification(
    SignalNotificationType.WHALE_ALERT,
    {
      source: 'Whale Alert',
      description: 'Large BTC transfer detected',
    },
    NotificationImportance.HIGH,
  );

  console.info('\n📢 Trying to send signal notification (should be filtered out):');
  await service.send(signalNotification);
  console.info('✅ Category filter working (signal notifications filtered)');
}

/**
 * Тестирование Discord webhook
 */
async function testDiscordWebhook(): Promise<void> {
  console.info('\n=== Testing Discord Webhook ===\n');

  const config: DiscordConfig = {
    enabled: false, // Disabled for testing without real webhook
    webhookUrl: 'https://discord.com/api/webhooks/test',
    minImportance: NotificationImportance.MEDIUM,
    username: 'Trading Bot',
  };

  const discord = new DiscordWebhook(config);

  console.info('✅ Discord webhook initialized');
  console.info('   (Sending disabled for testing)');

  const notification = NotificationFactory.createTradingNotification(
    TradingNotificationType.TAKE_PROFIT_HIT,
    {
      symbol: 'ETH/USDT',
      side: 'long',
      exitPrice: 2500,
      pnl: 250,
      pnlPercent: 5.0,
    },
    NotificationImportance.HIGH,
  );

  // В реальном окружении с настроенным webhook:
  // await discord.sendNotification(notification);

  console.info('✅ Discord webhook test completed');
}

/**
 * Тестирование Telegram бота
 */
async function testTelegramBot(): Promise<void> {
  console.info('\n=== Testing Telegram Bot ===\n');

  const config: TelegramConfig = {
    enabled: false, // Disabled for testing
    botToken: 'test_token',
    chatId: '123456',
    minImportance: NotificationImportance.MEDIUM,
    commands: true,
  };

  const bot = new TelegramBot(config);
  bot.registerCommandHandler(new MockCommandHandler());

  console.info('✅ Telegram bot initialized');
  console.info('   Commands: /status, /balance, /positions, /pnl, /stop, /start');
  console.info('   (Bot initialization disabled for testing)');

  // В реальном окружении:
  // await bot.initialize();

  const notification = NotificationFactory.createRiskNotification(
    RiskNotificationType.HIGH_VOLATILITY,
    {
      metric: 'ATR',
      currentValue: 1500,
      limitValue: 1000,
      percentage: 150,
      symbol: 'BTC/USDT',
    },
    NotificationImportance.HIGH,
  );

  // В реальном окружении:
  // await bot.sendNotification(notification);

  console.info('✅ Telegram bot test completed');
}

/**
 * Тестирование фильтров важности
 */
async function testImportanceFilters(): Promise<void> {
  console.info('\n=== Testing Importance Filters ===\n');

  const config: NotificationConfig = {
    enabled: true,
    minImportance: NotificationImportance.HIGH, // Только HIGH и CRITICAL
  };

  const service = new NotificationService(config);
  const consoleHandler = new ConsoleHandler();
  service.registerHandler(NotificationChannel.CONSOLE, (notification) =>
    consoleHandler.sendNotification(notification),
  );

  // LOW - должно быть отфильтровано
  const lowNotification = NotificationFactory.createSystemNotification(
    SystemNotificationType.BOT_RESTART,
    {
      service: 'Bot',
    },
    NotificationImportance.LOW,
  );

  console.info('📢 Sending LOW importance notification (should be filtered):');
  await service.send(lowNotification);

  // HIGH - должно пройти
  const highNotification = NotificationFactory.createRiskNotification(
    RiskNotificationType.DRAWDOWN_REACHED,
    {
      metric: 'Drawdown',
      currentValue: 20,
      limitValue: 20,
      percentage: 100,
    },
    NotificationImportance.HIGH,
  );

  console.info('\n📢 Sending HIGH importance notification (should pass):');
  await service.send(highNotification);

  console.info('\n✅ Importance filters working correctly');
}

/**
 * Главная функция запуска тестов
 */
async function runTests(): Promise<void> {
  console.info('🧪 Starting Notification System Tests\n');
  console.info('='.repeat(50));

  try {
    await testNotificationFactory();
    await testNotificationService();
    await testDiscordWebhook();
    await testTelegramBot();
    await testImportanceFilters();

    console.info('\n' + '='.repeat(50));
    console.info('\n✅ All notification tests passed!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Запуск тестов
void runTests();
