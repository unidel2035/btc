# Система уведомлений (Notifications)

Полнофункциональная система уведомлений для торгового бота с поддержкой множества каналов и интерактивными командами.

## Возможности

### Каналы уведомлений
- ✅ **Telegram bot** - с интерактивными командами
- ✅ **Discord webhook** - форматированные embeds
- ✅ **Email** - поддержка SMTP (требует настройки)
- ✅ **Web Push** - push-уведомления для браузера (требует настройки)
- ✅ **Generic Webhook** - произвольный webhook endpoint
- ✅ **Console** - логирование в консоль

### Типы уведомлений

#### 1. Торговые (Trading)
- Открытие позиции
- Закрытие позиции (с PnL)
- Достижение stop-loss
- Достижение take-profit
- Ликвидация (futures)

#### 2. Сигналы (Signals)
- Важные новостные сигналы
- Аномальная социальная активность
- Whale alerts

#### 3. Риск-менеджмент (Risk)
- Приближение к дневному лимиту
- Достижение drawdown
- Высокая волатильность

#### 4. Системные (System)
- Ошибки подключения к бирже
- Сбои сервисов
- Перезапуск бота

### Фильтрация

- **По важности**: LOW, MEDIUM, HIGH, CRITICAL
- **По категориям**: Trading, Signals, Risk, System
- **По каналам**: Разные минимальные уровни важности для каждого канала

## Telegram Bot команды

Интерактивные команды для управления ботом:

```
/status    - Текущий статус бота, uptime, PnL
/balance   - Баланс и маржа
/positions - Открытые позиции с PnL
/pnl       - PnL за период (today/week/month/total)
/stop      - Остановить торговлю
/start     - Возобновить торговлю
```

## Установка и настройка

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка переменных окружения

Создайте файл `.env` и добавьте:

```env
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_CHAT_ID=your_chat_id

# Discord (опционально)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Generic Webhook (опционально)
NOTIFICATION_WEBHOOK_URL=https://your-webhook.com/notify

# Email (опционально)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_RECIPIENTS=recipient1@example.com,recipient2@example.com
```

### 3. Создание Telegram бота

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot` и следуйте инструкциям
3. Скопируйте токен и добавьте в `.env`
4. Получите ваш chat ID (можно использовать [@userinfobot](https://t.me/userinfobot))

### 4. Настройка Discord webhook (опционально)

1. Откройте настройки Discord канала
2. Integrations → Webhooks → New Webhook
3. Скопируйте Webhook URL и добавьте в `.env`

## Использование

### Базовый пример

```typescript
import {
  NotificationService,
  NotificationFactory,
  TelegramBot,
  ConsoleHandler,
  NotificationChannel,
  NotificationImportance,
  TradingNotificationType,
  type NotificationConfig,
} from './src/notifications/index.js';

// Конфигурация
const config: NotificationConfig = {
  enabled: true,
  telegram: {
    enabled: true,
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
    chatId: process.env.TELEGRAM_CHAT_ID!,
    minImportance: NotificationImportance.MEDIUM,
    commands: true,
  },
  minImportance: NotificationImportance.LOW,
};

// Инициализация сервиса
const service = new NotificationService(config);

// Регистрация handlers
const consoleHandler = new ConsoleHandler();
service.registerHandler(
  NotificationChannel.CONSOLE,
  (notification) => consoleHandler.sendNotification(notification)
);

// Telegram bot
const telegram = new TelegramBot(config.telegram!);
await telegram.initialize();
service.registerHandler(
  NotificationChannel.TELEGRAM,
  (notification) => telegram.sendNotification(notification)
);

// Отправка уведомления
const notification = NotificationFactory.createTradingNotification(
  TradingNotificationType.POSITION_OPENED,
  {
    symbol: 'BTC/USDT',
    side: 'long',
    entryPrice: 45000,
    quantity: 0.1,
  },
  NotificationImportance.MEDIUM
);

await service.send(notification);
```

### Использование фабрики уведомлений

```typescript
import {
  NotificationFactory,
  NotificationImportance,
  TradingNotificationType,
  SignalNotificationType,
  RiskNotificationType,
  SystemNotificationType,
} from './src/notifications/index.js';

// Торговое уведомление
const trading = NotificationFactory.createTradingNotification(
  TradingNotificationType.TAKE_PROFIT_HIT,
  {
    symbol: 'BTC/USDT',
    side: 'long',
    exitPrice: 47000,
    pnl: 200,
    pnlPercent: 4.44,
  },
  NotificationImportance.HIGH
);

// Сигнальное уведомление
const signal = NotificationFactory.createSignalNotification(
  SignalNotificationType.IMPORTANT_NEWS,
  {
    source: 'CoinDesk',
    title: 'Bitcoin ETF Approved',
    sentiment: 0.9,
  },
  NotificationImportance.CRITICAL
);

// Риск уведомление
const risk = NotificationFactory.createRiskNotification(
  RiskNotificationType.DAILY_LIMIT_APPROACHING,
  {
    metric: 'Daily Loss',
    currentValue: 450,
    limitValue: 500,
    percentage: 90,
  },
  NotificationImportance.HIGH
);

// Системное уведомление
const system = NotificationFactory.createSystemNotification(
  SystemNotificationType.BOT_RESTART,
  {
    service: 'Trading Bot',
    uptime: 3600,
  },
  NotificationImportance.MEDIUM
);
```

### Регистрация обработчика команд для Telegram

```typescript
import { BotCommandHandler, type BotStatus } from './src/notifications/index.js';

class MyCommandHandler implements BotCommandHandler {
  async getStatus(): Promise<BotStatus> {
    return {
      isRunning: true,
      uptime: process.uptime(),
      openPositions: 3,
      todayPnL: 150.5,
      totalPnL: 2500.75,
      activeStrategies: ['news-momentum'],
    };
  }

  async getBalance(): Promise<BalanceInfo> {
    // Ваша логика получения баланса
  }

  async getPositions(): Promise<PositionInfo[]> {
    // Ваша логика получения позиций
  }

  async getPnL(period: string): Promise<PnLInfo> {
    // Ваша логика получения PnL
  }

  async stopTrading(): Promise<boolean> {
    // Ваша логика остановки торговли
    return true;
  }

  async startTrading(): Promise<boolean> {
    // Ваша логика запуска торговли
    return true;
  }
}

// Регистрация
telegram.registerCommandHandler(new MyCommandHandler());
```

## Примеры и тесты

### Запуск примера

```bash
npm run example:notifications
```

### Запуск тестов

```bash
npm run test:notifications
```

## Архитектура

```
src/notifications/
├── types.ts                    # Типы и интерфейсы
├── NotificationService.ts      # Основной сервис
├── NotificationFactory.ts      # Фабрика уведомлений
├── TelegramBot.ts             # Telegram бот с командами
├── DiscordWebhook.ts          # Discord webhook
├── WebPushNotifier.ts         # Web push уведомления
├── ConsoleHandler.ts          # Console handler
├── WebhookHandler.ts          # Generic webhook handler
└── index.ts                   # Экспорты
```

## Интеграция с существующими модулями

### Риск-менеджмент

```typescript
import { RiskManager } from './src/trading/risk/index.js';
import { NotificationService, NotificationFactory } from './src/notifications/index.js';

// В вашем риск-менеджере
class RiskManager {
  constructor(
    config: RiskConfig,
    private notificationService: NotificationService
  ) {
    // ...
  }

  async checkLimits(): Promise<void> {
    // Проверка лимитов
    if (this.isDailyLimitApproaching()) {
      const notification = NotificationFactory.createRiskNotification(
        RiskNotificationType.DAILY_LIMIT_APPROACHING,
        {
          metric: 'Daily Loss',
          currentValue: this.currentDailyLoss,
          limitValue: this.config.maxDailyLoss,
          percentage: (this.currentDailyLoss / this.config.maxDailyLoss) * 100,
        },
        NotificationImportance.HIGH
      );

      await this.notificationService.send(notification);
    }
  }
}
```

### Торговые стратегии

```typescript
import { BaseStrategy } from './src/trading/strategies/index.js';
import { NotificationService, NotificationFactory } from './src/notifications/index.js';

class MyStrategy extends BaseStrategy {
  async openPosition(signal: Signal): Promise<void> {
    // Открытие позиции
    const position = await this.executeOrder(signal);

    // Уведомление
    const notification = NotificationFactory.createTradingNotification(
      TradingNotificationType.POSITION_OPENED,
      {
        symbol: position.symbol,
        side: position.side,
        entryPrice: position.entryPrice,
        quantity: position.quantity,
      },
      NotificationImportance.MEDIUM
    );

    await this.notificationService.send(notification);
  }
}
```

## Расширение

### Добавление нового канала

1. Создайте класс обработчика:

```typescript
export class MyCustomHandler {
  async sendNotification(notification: Notification): Promise<void> {
    // Ваша логика отправки
  }
}
```

2. Зарегистрируйте handler:

```typescript
const customHandler = new MyCustomHandler();
service.registerHandler(
  NotificationChannel.CUSTOM,
  (notification) => customHandler.sendNotification(notification)
);
```

## Лучшие практики

1. **Используйте правильные уровни важности**
   - CRITICAL: Ликвидация, критические ошибки
   - HIGH: Stop-loss, take-profit, важные сигналы
   - MEDIUM: Открытие/закрытие позиций
   - LOW: Информационные сообщения

2. **Фильтруйте уведомления по каналам**
   - Telegram: MEDIUM и выше
   - Discord: HIGH и выше
   - Email: CRITICAL только

3. **Используйте NotificationFactory**
   - Автоматическое форматирование сообщений
   - Правильная типизация данных
   - Консистентность уведомлений

4. **Обрабатывайте ошибки**
   - Все handlers обрабатывают ошибки независимо
   - Сбой одного канала не влияет на другие

## Безопасность

- **Никогда не коммитьте токены и секреты** - используйте `.env`
- **Проверяйте chat ID** - бот отвечает только на команды из правильного чата
- **Используйте HTTPS** для всех webhook URL
- **Ограничьте доступ** к Telegram боту только для вашего chat ID

## Troubleshooting

### Telegram бот не отвечает

1. Проверьте токен: правильный ли он и активен ли бот
2. Убедитесь, что `commands: true` в конфигурации
3. Проверьте chat ID - отправьте команду боту в правильный чат

### Discord уведомления не приходят

1. Проверьте webhook URL
2. Убедитесь, что webhook не удален в настройках Discord
3. Проверьте права бота на отправку сообщений

### Уведомления не проходят фильтр

1. Проверьте `minImportance` в конфигурации
2. Убедитесь, что категория уведомления включена в `categories`
3. Проверьте `minImportance` для конкретного канала

## Лицензия

MIT
