/**
 * Пример использования системы уведомлений
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
  TradingNotificationType,
  SignalNotificationType,
  RiskNotificationType,
  SystemNotificationType,
  type NotificationConfig,
  type BotCommandHandler,
  type BotStatus,
  type BalanceInfo,
  type PositionInfo,
  type PnLInfo,
} from '../src/notifications/index.js';

/**
 * Пример обработчика команд для Telegram бота
 */
class ExampleCommandHandler implements BotCommandHandler {
  private tradingActive = true;

  async getStatus(): Promise<BotStatus> {
    return {
      isRunning: this.tradingActive,
      uptime: Math.floor(process.uptime()),
      openPositions: 3,
      todayPnL: 245.75,
      totalPnL: 2150.5,
      activeStrategies: ['news-momentum', 'sentiment-swing'],
    };
  }

  async getBalance(): Promise<BalanceInfo> {
    return {
      totalBalance: 15000,
      availableBalance: 12000,
      usedMargin: 3000,
      unrealizedPnL: 245.75,
      currency: 'USDT',
    };
  }

  async getPositions(): Promise<PositionInfo[]> {
    return [
      {
        symbol: 'BTC/USDT',
        side: 'long',
        entryPrice: 45000,
        currentPrice: 46500,
        quantity: 0.15,
        unrealizedPnL: 225,
        unrealizedPnLPercent: 3.33,
      },
      {
        symbol: 'ETH/USDT',
        side: 'short',
        entryPrice: 2500,
        currentPrice: 2480,
        quantity: 2.0,
        unrealizedPnL: 40,
        unrealizedPnLPercent: 0.8,
      },
    ];
  }

  async getPnL(period: 'today' | 'week' | 'month' | 'total'): Promise<PnLInfo> {
    const pnlData: Record<string, PnLInfo> = {
      today: {
        period: 'today',
        realizedPnL: 200,
        unrealizedPnL: 245.75,
        totalPnL: 445.75,
        winRate: 0.7,
        totalTrades: 10,
        profitableTrades: 7,
      },
      week: {
        period: 'week',
        realizedPnL: 800,
        unrealizedPnL: 245.75,
        totalPnL: 1045.75,
        winRate: 0.68,
        totalTrades: 45,
        profitableTrades: 31,
      },
      month: {
        period: 'month',
        realizedPnL: 1900,
        unrealizedPnL: 245.75,
        totalPnL: 2145.75,
        winRate: 0.65,
        totalTrades: 180,
        profitableTrades: 117,
      },
      total: {
        period: 'total',
        realizedPnL: 5000,
        unrealizedPnL: 245.75,
        totalPnL: 5245.75,
        winRate: 0.64,
        totalTrades: 500,
        profitableTrades: 320,
      },
    };

    return pnlData[period];
  }

  async stopTrading(): Promise<boolean> {
    console.info('🛑 Trading stopped by user command');
    this.tradingActive = false;
    return true;
  }

  async startTrading(): Promise<boolean> {
    console.info('✅ Trading started by user command');
    this.tradingActive = true;
    return true;
  }
}

/**
 * Инициализация системы уведомлений
 */
async function initializeNotificationSystem(): Promise<NotificationService> {
  console.info('🔧 Initializing notification system...\n');

  // Конфигурация
  const config: NotificationConfig = {
    enabled: true,
    telegram: {
      enabled: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      chatId: process.env.TELEGRAM_CHAT_ID || '',
      minImportance: NotificationImportance.MEDIUM,
      commands: true,
    },
    discord: {
      enabled: Boolean(process.env.DISCORD_WEBHOOK_URL),
      webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
      minImportance: NotificationImportance.HIGH,
      username: 'Trading Bot',
    },
    webhook: {
      enabled: Boolean(process.env.NOTIFICATION_WEBHOOK_URL),
      url: process.env.NOTIFICATION_WEBHOOK_URL || '',
      minImportance: NotificationImportance.MEDIUM,
    },
    minImportance: NotificationImportance.LOW,
  };

  const service = new NotificationService(config);

  // Регистрация console handler (всегда активен)
  const consoleHandler = new ConsoleHandler();
  service.registerHandler(NotificationChannel.CONSOLE, (notification) =>
    consoleHandler.sendNotification(notification),
  );

  // Telegram bot
  if (config.telegram?.enabled) {
    const telegram = new TelegramBot(config.telegram);
    telegram.registerCommandHandler(new ExampleCommandHandler());
    await telegram.initialize();
    service.registerHandler(NotificationChannel.TELEGRAM, (notification) =>
      telegram.sendNotification(notification),
    );
    console.info('✅ Telegram bot initialized');
  }

  // Discord webhook
  if (config.discord?.enabled) {
    const discord = new DiscordWebhook(config.discord);
    service.registerHandler(NotificationChannel.DISCORD, (notification) =>
      discord.sendNotification(notification),
    );
    console.info('✅ Discord webhook initialized');
  }

  // Generic webhook
  if (config.webhook?.enabled) {
    const webhook = new WebhookHandler(config.webhook.url);
    service.registerHandler(NotificationChannel.WEBHOOK, (notification) =>
      webhook.sendNotification(notification),
    );
    console.info('✅ Generic webhook initialized');
  }

  console.info('\n✅ Notification system ready!\n');
  return service;
}

/**
 * Демонстрация торговых уведомлений
 */
async function demoTradingNotifications(service: NotificationService): Promise<void> {
  console.info('📊 Demo: Trading Notifications\n');

  // Открытие позиции
  const positionOpened = NotificationFactory.createTradingNotification(
    TradingNotificationType.POSITION_OPENED,
    {
      symbol: 'BTC/USDT',
      side: 'long',
      entryPrice: 45000,
      quantity: 0.1,
    },
    NotificationImportance.MEDIUM,
  );
  await service.send(positionOpened);

  await sleep(2000);

  // Take profit
  const takeProfit = NotificationFactory.createTradingNotification(
    TradingNotificationType.TAKE_PROFIT_HIT,
    {
      symbol: 'BTC/USDT',
      side: 'long',
      entryPrice: 45000,
      exitPrice: 47250,
      quantity: 0.1,
      pnl: 225,
      pnlPercent: 5.0,
    },
    NotificationImportance.HIGH,
  );
  await service.send(takeProfit);

  await sleep(2000);
}

/**
 * Демонстрация сигнальных уведомлений
 */
async function demoSignalNotifications(service: NotificationService): Promise<void> {
  console.info('📡 Demo: Signal Notifications\n');

  // Важная новость
  const news = NotificationFactory.createSignalNotification(
    SignalNotificationType.IMPORTANT_NEWS,
    {
      source: 'CoinDesk',
      title: 'Bitcoin ETF Approved',
      description: 'SEC approves first Bitcoin spot ETF',
      sentiment: 0.9,
      url: 'https://coindesk.com/example',
    },
    NotificationImportance.CRITICAL,
  );
  await service.send(news);

  await sleep(2000);

  // Whale alert
  const whale = NotificationFactory.createSignalNotification(
    SignalNotificationType.WHALE_ALERT,
    {
      source: 'Whale Alert',
      description: '1,000 BTC transferred from unknown wallet to Binance',
    },
    NotificationImportance.HIGH,
  );
  await service.send(whale);

  await sleep(2000);
}

/**
 * Демонстрация риск уведомлений
 */
async function demoRiskNotifications(service: NotificationService): Promise<void> {
  console.info('⚠️  Demo: Risk Notifications\n');

  // Приближение к дневному лимиту
  const dailyLimit = NotificationFactory.createRiskNotification(
    RiskNotificationType.DAILY_LIMIT_APPROACHING,
    {
      metric: 'Daily Loss',
      currentValue: 420,
      limitValue: 500,
      percentage: 84,
    },
    NotificationImportance.HIGH,
  );
  await service.send(dailyLimit);

  await sleep(2000);

  // Высокая волатильность
  const volatility = NotificationFactory.createRiskNotification(
    RiskNotificationType.HIGH_VOLATILITY,
    {
      metric: 'ATR',
      currentValue: 1850,
      limitValue: 1500,
      percentage: 123,
      symbol: 'BTC/USDT',
    },
    NotificationImportance.MEDIUM,
  );
  await service.send(volatility);

  await sleep(2000);
}

/**
 * Демонстрация системных уведомлений
 */
async function demoSystemNotifications(service: NotificationService): Promise<void> {
  console.info('🔧 Demo: System Notifications\n');

  // Перезапуск бота
  const restart = NotificationFactory.createSystemNotification(
    SystemNotificationType.BOT_RESTART,
    {
      service: 'Trading Bot',
      status: 'Running',
      uptime: 7200,
    },
    NotificationImportance.MEDIUM,
  );
  await service.send(restart);

  await sleep(2000);

  // Ошибка подключения
  const connectionError = NotificationFactory.createSystemNotification(
    SystemNotificationType.EXCHANGE_CONNECTION_ERROR,
    {
      service: 'Binance',
      error: 'Connection timeout after 30 seconds',
      status: 'Retrying',
    },
    NotificationImportance.HIGH,
  );
  await service.send(connectionError);

  await sleep(2000);
}

/**
 * Утилита для задержки
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Главная функция
 */
async function main(): Promise<void> {
  console.info('🚀 Notification System Example\n');
  console.info('='.repeat(60));
  console.info('\nEnvironment variables:');
  console.info(
    `  TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ Set' : '❌ Not set'}`,
  );
  console.info(`  TELEGRAM_CHAT_ID: ${process.env.TELEGRAM_CHAT_ID ? '✅ Set' : '❌ Not set'}`);
  console.info(
    `  DISCORD_WEBHOOK_URL: ${process.env.DISCORD_WEBHOOK_URL ? '✅ Set' : '❌ Not set'}`,
  );
  console.info('\n' + '='.repeat(60) + '\n');

  try {
    // Инициализация
    const service = await initializeNotificationSystem();

    // Демонстрация различных типов уведомлений
    await demoTradingNotifications(service);
    await demoSignalNotifications(service);
    await demoRiskNotifications(service);
    await demoSystemNotifications(service);

    console.info('\n' + '='.repeat(60));
    console.info('\n✅ Example completed successfully!\n');
    console.info('💡 Tips:');
    console.info('   - Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID for Telegram notifications');
    console.info('   - Set DISCORD_WEBHOOK_URL for Discord notifications');
    console.info('   - Use /status, /balance, /positions commands in Telegram\n');
  } catch (error) {
    console.error('\n❌ Example failed:', error);
    process.exit(1);
  }
}

// Запуск примера
void main();
