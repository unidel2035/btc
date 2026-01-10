# Telegram Bot для удаленного управления торговым ботом

Telegram Bot обеспечивает полный контроль и мониторинг торгового бота через мобильное приложение Telegram без необходимости доступа к веб-dashboard.

## 📋 Содержание

- [Установка и настройка](#установка-и-настройка)
- [Конфигурация](#конфигурация)
- [Использование](#использование)
- [Безопасность](#безопасность)
- [Архитектура](#архитектура)
- [Примеры](#примеры)

## 🚀 Установка и настройка

### 1. Создание бота

1. Откройте Telegram и найдите [@BotFather](https://t.me/BotFather)
2. Отправьте команду `/newbot`
3. Следуйте инструкциям для создания бота
4. Скопируйте полученный **Bot Token**

### 2. Получение User ID

1. Найдите [@userinfobot](https://t.me/userinfobot) в Telegram
2. Отправьте ему любое сообщение
3. Скопируйте ваш **User ID**

### 3. Настройка переменных окружения

Создайте или обновите файл `.env`:

```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_USER_ID=your_user_id_here
TELEGRAM_PIN_CODE=1234  # Optional: PIN for critical operations

# Optional: CoinGecko API for screening
COINGECKO_API_KEY=your_coingecko_api_key
```

### 4. Установка зависимостей

```bash
npm install telegraf
```

## ⚙️ Конфигурация

### Базовая конфигурация

```typescript
import { TelegramBot } from './src/telegram/index.js';
import type { TelegramBotConfig } from './src/telegram/index.js';

const config: TelegramBotConfig = {
  token: process.env.TELEGRAM_BOT_TOKEN!,
  whitelist: [parseInt(process.env.TELEGRAM_USER_ID!)],
  pinCode: process.env.TELEGRAM_PIN_CODE || '1234',
  rateLimit: {
    maxCommands: 10,      // Max commands
    windowMs: 60 * 1000,  // Per 60 seconds
  },
  features: {
    trading: true,        // Enable trading control
    positions: true,      // Enable position management
    screening: true,      // Enable screening results
    notifications: true,  // Enable notifications
  },
};
```

### Параметры конфигурации

| Параметр | Тип | Описание |
|----------|-----|----------|
| `token` | string | Bot token от BotFather |
| `whitelist` | number[] | Массив разрешенных Telegram User IDs |
| `pinCode` | string (optional) | PIN-код для критических операций |
| `rateLimit.maxCommands` | number | Максимум команд в окне |
| `rateLimit.windowMs` | number | Окно времени в миллисекундах |
| `features.trading` | boolean | Включить управление торговлей |
| `features.positions` | boolean | Включить управление позициями |
| `features.screening` | boolean | Включить скрининг |
| `features.notifications` | boolean | Включить уведомления |

## 📱 Использование

### Запуск бота

```typescript
import { TelegramBot } from './src/telegram/index.js';
import { PaperTradingEngine } from './src/trading/paper/PaperTradingEngine.js';
import { ScreeningModule } from './src/analyzers/screening/ScreeningModule.js';

// Initialize services
const tradingEngine = new PaperTradingEngine({ initialBalance: 10000 });
const screeningModule = new ScreeningModule(apiKey);

// Create and start bot
const bot = new TelegramBot(config, tradingEngine, screeningModule);
await bot.start();
```

### Использование из командной строки

```bash
# Run example
npm run example:telegram

# Or directly
tsx examples/telegram-bot-example.ts
```

### Доступные команды

См. [telegram-commands.md](./telegram-commands.md) для полного списка команд.

## 🔐 Безопасность

### Whitelist

Только пользователи из whitelist могут взаимодействовать с ботом:

```typescript
whitelist: [123456789, 987654321]  // Ваши Telegram User IDs
```

### PIN-код

Критические операции требуют PIN-код:

- `/start_trading` - Запуск торговли
- `/stop_trading` - Остановка торговли
- `/close_position` - Закрытие позиции

Пример потока с PIN:

```
User: /stop_trading
Bot: ⚠️ CONFIRMATION REQUIRED
     Action: Stop Trading
     This will stop automated trading.
     Enter your PIN to confirm:

User: 1234
Bot: ✅ Automated trading stopped!
```

### Rate Limiting

Предотвращение спама команд:

```typescript
rateLimit: {
  maxCommands: 10,      // Max 10 commands
  windowMs: 60 * 1000,  // Per 60 seconds
}
```

При превышении лимита:

```
⚠️ Rate limit exceeded. Please wait 45 seconds before sending more commands.
```

### Логирование

Все команды автоматически логируются:

```
[Telegram] User 123456789 (@username) executed: /status
[Telegram] User 123456789 (@username) executed: /balance
```

## 🏗️ Архитектура

### Структура модуля

```
src/telegram/
├── TelegramBot.ts          # Main bot class
├── types.ts                # TypeScript types
├── index.ts                # Public exports
├── handlers/               # Command handlers
│   ├── basicCommands.ts    # /start, /help
│   ├── infoCommands.ts     # /status, /balance, /positions
│   ├── tradingCommands.ts  # /start_trading, /stop_trading
│   └── settingsCommands.ts # /settings
├── middleware/             # Middleware
│   ├── auth.ts            # Authentication & authorization
│   └── rateLimit.ts       # Rate limiting
└── templates/             # Message templates
    └── index.ts           # Formatting functions
```

### Интеграция с системой

```typescript
TelegramBot
  ├── PaperTradingEngine    # Trading operations
  ├── ScreeningModule       # Screening analysis
  └── NotificationManager   # Event notifications
```

### Event Flow

```
Trading Event → NotificationManager → TelegramBot → User
User Command → TelegramBot → TradingEngine/ScreeningModule
```

## 📊 Примеры использования

### Пример 1: Базовый бот

```typescript
import { TelegramBot } from './src/telegram/index.js';

const config = {
  token: process.env.TELEGRAM_BOT_TOKEN!,
  whitelist: [parseInt(process.env.TELEGRAM_USER_ID!)],
  features: {
    trading: false,      // Только мониторинг
    positions: false,
    screening: true,
    notifications: true,
  },
};

const bot = new TelegramBot(config);
await bot.start();
```

### Пример 2: Полнофункциональный бот

```typescript
import { TelegramBot } from './src/telegram/index.js';
import { PaperTradingEngine } from './src/trading/paper/PaperTradingEngine.js';
import { ScreeningModule } from './src/analyzers/screening/ScreeningModule.js';

const tradingEngine = new PaperTradingEngine({
  initialBalance: 10000,
  currency: 'USDT',
});

const screeningModule = new ScreeningModule(apiKey);

const bot = new TelegramBot(
  config,
  tradingEngine,
  screeningModule,
);

await bot.start();
```

### Пример 3: Отправка уведомлений

```typescript
// Position opened
await bot.notifyPositionOpened({
  symbol: 'BTC/USDT',
  side: 'long',
  entryPrice: 50000,
  quantity: 0.1,
  value: 5000,
  stopLoss: 48000,
  takeProfit: 55000,
});

// Position closed
await bot.notifyPositionClosed({
  symbol: 'BTC/USDT',
  side: 'long',
  entryPrice: 50000,
  exitPrice: 52000,
  quantity: 0.1,
  pnl: 200,
  pnlPercent: 4.0,
  duration: 3600000, // 1 hour
});

// Custom notification
await bot.sendNotification(
  '🚨 *Critical Alert*\n\nDaily drawdown limit reached!',
  'Markdown'
);
```

### Пример 4: Интеграция с событиями

```typescript
// Listen to trading engine events
tradingEngine.on('position.opened', async (position) => {
  await bot.notifyPositionOpened({
    symbol: position.symbol,
    side: position.side,
    entryPrice: position.entryPrice,
    quantity: position.quantity,
    value: position.value,
  });
});

tradingEngine.on('position.closed', async (position) => {
  await bot.notifyPositionClosed({
    symbol: position.symbol,
    side: position.side,
    entryPrice: position.entryPrice,
    exitPrice: position.exitPrice,
    quantity: position.quantity,
    pnl: position.pnl,
    pnlPercent: position.pnlPercent,
    duration: position.duration,
  });
});
```

## 🧪 Тестирование

```bash
# Run tests
npm run test:telegram

# Run example
npm run example:telegram
```

## 🔍 Отладка

Включите детальное логирование:

```typescript
console.log('Debug mode enabled');

// Bot logs all commands automatically
// Check console for:
// [Telegram] User X executed: /command
// [RateLimit] Cleaned up N expired entries
```

## 📚 Дополнительная документация

- [Команды бота](./telegram-commands.md) - Полный список команд
- [API Reference](./api/telegram.md) - API документация
- [Примеры](../examples/telegram-bot-example.ts) - Примеры кода

## ❓ FAQ

### Как добавить нескольких пользователей?

```typescript
whitelist: [123456789, 987654321, 555555555]
```

### Как отключить PIN-код?

```typescript
pinCode: undefined,  // или не указывайте параметр
```

### Как изменить rate limit?

```typescript
rateLimit: {
  maxCommands: 20,      // Больше команд
  windowMs: 60 * 1000,  // В том же окне
}
```

### Как использовать webhook вместо polling?

```typescript
// Coming soon in future updates
// Webhook mode for production deployment
```

## 🐛 Troubleshooting

### Бот не отвечает

1. Проверьте `TELEGRAM_BOT_TOKEN` в `.env`
2. Убедитесь, что ваш User ID в whitelist
3. Проверьте логи на наличие ошибок

### Rate limit срабатывает слишком часто

Увеличьте `maxCommands` или `windowMs` в конфигурации.

### PIN не работает

1. Проверьте `TELEGRAM_PIN_CODE` в `.env`
2. Убедитесь, что вводите точный PIN
3. PIN действителен 5 минут после запроса

## 📝 Лицензия

MIT
