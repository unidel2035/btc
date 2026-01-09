# Система уведомлений (Notifications)

Комплексная система уведомлений для торгового бота, поддерживающая множественные каналы доставки и гибкую фильтрацию сообщений.

## 📋 Содержание

- [Обзор](#обзор)
- [Каналы уведомлений](#каналы-уведомлений)
- [Типы уведомлений](#типы-уведомлений)
- [Установка](#установка)
- [Быстрый старт](#быстрый-старт)
- [Конфигурация](#конфигурация)
- [API Reference](#api-reference)
- [Примеры использования](#примеры-использования)
- [Telegram Bot](#telegram-bot)
- [Фильтрация уведомлений](#фильтрация-уведомлений)
- [Статистика и история](#статистика-и-история)

## Обзор

Система уведомлений позволяет отправлять уведомления о важных событиях через различные каналы:

- **Telegram** - с поддержкой команд бота
- **Email** - через SMTP или внешние API (SendGrid, Mailgun)
- **Discord** - через webhooks
- **Push** - Web Push API для браузерных уведомлений
- **Console** - логирование в консоль

### Особенности

- 🔔 **Множественные каналы** - отправка через несколько каналов одновременно
- 🎯 **Фильтрация** - гибкая система фильтров по важности, категории, символу
- 📊 **Статистика** - отслеживание отправленных уведомлений
- 📜 **История** - сохранение истории уведомлений
- 🤖 **Telegram команды** - интерактивный бот с командами
- ⚙️ **Конфигурация** - настройка каждого канала отдельно

## Каналы уведомлений

### Console

Вывод уведомлений в консоль с форматированием и цветами.

```typescript
console: {
  enabled: true,
  minImportance: NotificationImportance.LOW
}
```

### Telegram

Отправка уведомлений в Telegram с поддержкой команд бота.

**Переменные окружения:**
- `TELEGRAM_BOT_TOKEN` - токен бота от @BotFather
- `TELEGRAM_CHAT_ID` - ID чата для уведомлений

**Команды бота:**
- `/status` - Текущий статус бота
- `/balance` - Баланс аккаунта
- `/positions` - Открытые позиции
- `/pnl` - Прибыль/убыток
- `/stop` - Остановить торговлю
- `/start` - Возобновить торговлю

### Email

Отправка email уведомлений через SMTP или API (SendGrid).

**Переменные окружения:**
- `SENDGRID_API_KEY` - API ключ SendGrid (опционально)
- `EMAIL_USER` - SMTP пользователь
- `EMAIL_PASSWORD` - SMTP пароль

### Discord

Отправка уведомлений через Discord webhook.

**Переменные окружения:**
- `DISCORD_WEBHOOK_URL` - URL webhook'а Discord канала

### Push

Web Push уведомления для браузеров.

## Типы уведомлений

### Торговые (Trading)

- `POSITION_OPENED` - Открытие позиции
- `POSITION_CLOSED` - Закрытие позиции (с PnL)
- `STOP_LOSS_TRIGGERED` - Достижение stop-loss
- `TAKE_PROFIT_TRIGGERED` - Достижение take-profit
- `LIQUIDATION` - Ликвидация (futures)

### Сигналы (Signal)

- `NEWS_SIGNAL` - Важный новостной сигнал
- `SOCIAL_ANOMALY` - Аномальная социальная активность
- `WHALE_ALERT` - Whale alert

### Риск (Risk)

- `DAILY_LIMIT_WARNING` - Приближение к дневному лимиту
- `DRAWDOWN_WARNING` - Достижение drawdown
- `HIGH_VOLATILITY` - Высокая волатильность

### Система (System)

- `EXCHANGE_ERROR` - Ошибки подключения к бирже
- `SERVICE_FAILURE` - Сбои сервисов
- `BOT_RESTART` - Перезапуск бота

## Установка

Базовая установка не требует дополнительных зависимостей. Для расширенных возможностей:

```bash
# Для email через nodemailer (опционально)
npm install nodemailer @types/nodemailer

# Для Web Push (опционально)
npm install web-push @types/web-push
```

## Быстрый старт

```typescript
import { NotificationManager, NotificationImportance } from './notifications/index.js';

// Создание менеджера с базовой конфигурацией
const manager = new NotificationManager({
  enabled: true,
  console: {
    enabled: true,
    minImportance: NotificationImportance.LOW,
  },
  telegram: {
    enabled: true,
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
    chatId: process.env.TELEGRAM_CHAT_ID!,
    minImportance: NotificationImportance.MEDIUM,
  },
});

// Отправка уведомления об открытии позиции
await manager.notifyPositionOpened({
  symbol: 'BTCUSDT',
  side: 'long',
  entryPrice: 45000,
  size: 0.1,
  stopLoss: 44000,
  takeProfit: 47000,
});
```

## Конфигурация

### Полная конфигурация

```typescript
interface NotificationConfig {
  enabled: boolean;

  console?: {
    enabled: boolean;
    minImportance: NotificationImportance;
  };

  telegram?: {
    enabled: boolean;
    botToken: string;
    chatId: string;
    minImportance: NotificationImportance;
  };

  email?: {
    enabled: boolean;
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      user: string;
      password: string;
      from: string;
    };
    recipients: string[];
    minImportance: NotificationImportance;
  };

  discord?: {
    enabled: boolean;
    webhookUrl: string;
    username?: string;
    avatarUrl?: string;
    minImportance: NotificationImportance;
  };

  push?: {
    enabled: boolean;
    endpoint: string;
    publicKey: string;
    privateKey: string;
    minImportance: NotificationImportance;
  };

  filters?: NotificationFilter[];
}
```

### Уровни важности

```typescript
enum NotificationImportance {
  LOW = 'low',        // Информационные сообщения
  MEDIUM = 'medium',  // Обычные события
  HIGH = 'high',      // Важные события
  CRITICAL = 'critical' // Критические события
}
```

## API Reference

### NotificationManager

#### Методы

```typescript
// Основные методы отправки
send(notification: Notification): Promise<NotificationResult[]>
sendTest(): Promise<NotificationResult[]>

// Торговые уведомления
notifyPositionOpened(data: PositionData): Promise<NotificationResult[]>
notifyPositionClosed(data: PositionData): Promise<NotificationResult[]>
notifyStopLoss(data: PositionData): Promise<NotificationResult[]>
notifyTakeProfit(data: PositionData): Promise<NotificationResult[]>

// Сигналы
notifyNewsSignal(symbol: string, message: string, data?: object): Promise<NotificationResult[]>
notifyWhaleAlert(symbol: string, message: string, data?: object): Promise<NotificationResult[]>

// Риски
notifyDailyLimit(currentValue: number, limitValue: number): Promise<NotificationResult[]>
notifyDrawdown(currentDrawdown: number, maxDrawdown: number): Promise<NotificationResult[]>

// Система
notifySystem(type: NotificationType, title: string, message: string, importance?: NotificationImportance, data?: object): Promise<NotificationResult[]>

// Управление
setEnabled(enabled: boolean): void
isEnabled(): boolean
updateConfig(newConfig: Partial<NotificationConfig>): void

// Статистика и история
getStats(): NotificationStats
getHistory(limit?: number): Notification[]
clearHistory(): void

// Каналы
getChannel<T>(channelType: NotificationChannel): T | undefined
```

## Примеры использования

### Пример 1: Базовая настройка

```typescript
const manager = new NotificationManager({
  enabled: true,
  console: {
    enabled: true,
    minImportance: NotificationImportance.LOW,
  },
});

await manager.sendTest();
```

### Пример 2: Уведомление о позиции

```typescript
// Открытие позиции
await manager.notifyPositionOpened({
  symbol: 'BTCUSDT',
  side: 'long',
  entryPrice: 45000,
  size: 0.1,
  stopLoss: 44000,
  takeProfit: 47000,
});

// Закрытие с прибылью
await manager.notifyPositionClosed({
  symbol: 'BTCUSDT',
  side: 'long',
  entryPrice: 45000,
  exitPrice: 46500,
  size: 0.1,
  pnl: 150,
  pnlPercent: 3.33,
  duration: 3600000, // 1 час
});
```

### Пример 3: Риск-уведомления

```typescript
// Предупреждение о дневном лимите
await manager.notifyDailyLimit(4.5, 5.0);

// Предупреждение о просадке
await manager.notifyDrawdown(18.5, 20.0);
```

### Пример 4: Множественные каналы

```typescript
const manager = new NotificationManager({
  enabled: true,
  console: {
    enabled: true,
    minImportance: NotificationImportance.LOW,
  },
  telegram: {
    enabled: true,
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
    chatId: process.env.TELEGRAM_CHAT_ID!,
    minImportance: NotificationImportance.MEDIUM,
  },
  discord: {
    enabled: true,
    webhookUrl: process.env.DISCORD_WEBHOOK_URL!,
    username: 'Trading Bot',
    minImportance: NotificationImportance.HIGH,
  },
});

// Будет отправлено во все каналы согласно их minImportance
await manager.notifyPositionOpened({
  symbol: 'BTCUSDT',
  side: 'long',
  entryPrice: 45000,
  size: 0.1,
});
```

## Telegram Bot

### Настройка бота

1. Создайте бота через @BotFather в Telegram
2. Получите токен бота
3. Получите chat ID (можно через @userinfobot)
4. Установите переменные окружения:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### Стандартные команды

```
/status - Текущий статус бота
/balance - Баланс аккаунта
/positions - Открытые позиции
/pnl - Прибыль/убыток за период
/stop - Остановить торговлю
/start - Возобновить торговлю
/help - Помощь
```

### Добавление custom команд

```typescript
const telegramChannel = manager.getChannel<TelegramChannel>(NotificationChannel.TELEGRAM);

if (telegramChannel) {
  telegramChannel.registerCommand('/balance', async () => {
    // Ваша логика получения баланса
    const balance = await getBalance();
    return `💰 Balance: $${balance.toFixed(2)}`;
  });

  // Запуск прослушивания команд
  await telegramChannel.startCommandListener();
}
```

### Webhook vs Polling

По умолчанию используется polling. Для production рекомендуется webhook:

```typescript
const telegramChannel = manager.getChannel<TelegramChannel>(NotificationChannel.TELEGRAM);

if (telegramChannel) {
  await telegramChannel.setWebhook('https://your-domain.com/telegram-webhook');
}
```

## Фильтрация уведомлений

### Фильтр по важности

```typescript
const manager = new NotificationManager({
  enabled: true,
  telegram: {
    enabled: true,
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
    chatId: process.env.TELEGRAM_CHAT_ID!,
    minImportance: NotificationImportance.HIGH, // Только HIGH и CRITICAL
  },
});
```

### Фильтр по категории и типу

```typescript
const manager = new NotificationManager({
  enabled: true,
  console: {
    enabled: true,
    minImportance: NotificationImportance.LOW,
  },
  filters: [
    {
      // Только критические риск-события
      category: NotificationCategory.RISK,
      importance: NotificationImportance.CRITICAL,
    },
    {
      // Все торговые события средней и высокой важности
      category: NotificationCategory.TRADING,
      importance: [NotificationImportance.MEDIUM, NotificationImportance.HIGH],
    },
  ],
});
```

### Фильтр по символу

```typescript
const manager = new NotificationManager({
  enabled: true,
  console: { enabled: true, minImportance: NotificationImportance.LOW },
  filters: [
    {
      // Только уведомления для BTC и ETH
      symbol: ['BTCUSDT', 'ETHUSDT'],
    },
  ],
});
```

### Комбинированные фильтры

```typescript
filters: [
  {
    // BTC позиции средней важности
    symbol: 'BTCUSDT',
    category: NotificationCategory.TRADING,
    importance: NotificationImportance.MEDIUM,
  },
  {
    // Все критические уведомления
    importance: NotificationImportance.CRITICAL,
  },
]
```

## Статистика и история

### Получение статистики

```typescript
const stats = manager.getStats();

console.log('Total sent:', stats.total);
console.log('Failed:', stats.failed);
console.log('By channel:', stats.byChannel);
console.log('By importance:', stats.byImportance);
console.log('By category:', stats.byCategory);
console.log('Last sent:', stats.lastSent);
```

### История уведомлений

```typescript
// Последние 10 уведомлений
const recent = manager.getHistory(10);

recent.forEach(notification => {
  console.log(`[${notification.importance}] ${notification.title}`);
  console.log(`  ${notification.message}`);
});

// Очистка истории
manager.clearHistory();
```

## Best Practices

### 1. Используйте правильные уровни важности

```typescript
// LOW - Информационные сообщения (логи, статусы)
NotificationImportance.LOW

// MEDIUM - Обычные торговые события (открытие/закрытие позиций)
NotificationImportance.MEDIUM

// HIGH - Важные события (stop-loss, сигналы)
NotificationImportance.HIGH

// CRITICAL - Критические события (достижение лимитов, ошибки)
NotificationImportance.CRITICAL
```

### 2. Настройте разные уровни для разных каналов

```typescript
{
  console: {
    enabled: true,
    minImportance: NotificationImportance.LOW, // Все в консоль
  },
  telegram: {
    enabled: true,
    minImportance: NotificationImportance.HIGH, // Только важное в Telegram
  },
  email: {
    enabled: true,
    minImportance: NotificationImportance.CRITICAL, // Критическое на email
  }
}
```

### 3. Используйте фильтры для разделения потоков

```typescript
// Отдельный менеджер для торговых уведомлений
const tradingNotifications = new NotificationManager({
  enabled: true,
  telegram: { /* ... */ },
  filters: [{ category: NotificationCategory.TRADING }],
});

// Отдельный менеджер для рисков
const riskNotifications = new NotificationManager({
  enabled: true,
  email: { /* ... */ },
  filters: [{ category: NotificationCategory.RISK }],
});
```

### 4. Обрабатывайте ошибки

```typescript
try {
  const results = await manager.notifyPositionOpened(data);

  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    console.error('Failed to send notifications:', failed);
  }
} catch (error) {
  console.error('Notification error:', error);
}
```

### 5. Тестируйте конфигурацию

```typescript
// Перед запуском в production
await manager.sendTest();

// Проверьте, что все каналы работают
const testResults = await manager.sendTest();
console.log('Working channels:', testResults.filter(r => r.success).length);
```

## Troubleshooting

### Telegram не отправляет уведомления

1. Проверьте токен и chat ID
2. Убедитесь, что бот добавлен в чат
3. Проверьте minImportance
4. Проверьте фильтры

### Email не отправляет

1. Проверьте SMTP настройки
2. Для Gmail включите "Less secure app access"
3. Используйте App Password вместо обычного пароля
4. Проверьте SendGrid API ключ (если используется)

### Discord webhook не работает

1. Проверьте URL webhook'а
2. Убедитесь, что webhook активен в Discord
3. Проверьте права доступа

## Примеры

Полные рабочие примеры доступны в `examples/notifications-example.ts`:

```bash
npm run example:notifications
```

## Тесты

Запуск тестов:

```bash
npm run test:notifications
```

## License

MIT
