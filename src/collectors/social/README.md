# Social Media Collector

Модуль для мониторинга криптовалютных обсуждений в социальных сетях.

## Поддерживаемые платформы

- ✅ **Twitter/X API v2** - мониторинг аккаунтов и хештегов
- ✅ **Reddit API** - мониторинг subreddits
- ✅ **Telegram API** - мониторинг публичных каналов (требует дополнительной библиотеки)

## Установка

Все необходимые зависимости уже включены в проект. Модуль использует нативный `fetch` API, доступный в Node.js 20+.

## Конфигурация

### Twitter

1. Создайте приложение на [Twitter Developer Portal](https://developer.twitter.com/)
2. Получите Bearer Token для API v2
3. Добавьте в `.env`:

```env
TWITTER_BEARER_TOKEN=your_bearer_token_here
```

### Reddit

1. Создайте приложение на [Reddit Apps](https://www.reddit.com/prefs/apps)
2. Получите Client ID и Secret
3. Добавьте в `.env`:

```env
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
REDDIT_USERNAME=your_username_here
REDDIT_PASSWORD=your_password_here
```

### Telegram

1. Получите API credentials на [Telegram API](https://my.telegram.org/apps)
2. Получите session string (требует дополнительной библиотеки типа `telegram` или `gramjs`)
3. Добавьте в `.env`:

```env
TELEGRAM_API_ID=your_api_id_here
TELEGRAM_API_HASH=your_api_hash_here
TELEGRAM_SESSION_STRING=your_session_string_here
```

**Примечание**: Telegram коллектор требует установки дополнительной библиотеки для работы с MTProto API.

## Использование

### Twitter Collector

```typescript
import { TwitterCollector } from './src/collectors/social/index.js';

const collector = new TwitterCollector({
  bearerToken: process.env.TWITTER_BEARER_TOKEN!,
  accounts: ['elonmusk', 'CoinDesk', 'whale_alert'],
  hashtags: ['Bitcoin', 'BTC', 'Crypto'],
  maxResults: 10,
  pollInterval: 60000, // 1 минута
});

// Однократный сбор
const result = await collector.run((posts) => {
  console.info(`Received ${posts.length} posts`);
  // Обработка постов
});

// Или периодический опрос
collector.startPolling((posts) => {
  console.info(`Received ${posts.length} posts`);
});
```

### Reddit Collector

```typescript
import { RedditCollector } from './src/collectors/social/index.js';

const collector = new RedditCollector({
  clientId: process.env.REDDIT_CLIENT_ID!,
  clientSecret: process.env.REDDIT_CLIENT_SECRET!,
  username: process.env.REDDIT_USERNAME!,
  password: process.env.REDDIT_PASSWORD!,
  subreddits: ['Bitcoin', 'CryptoCurrency', 'CryptoMarkets'],
  sortBy: 'hot',
  maxResults: 25,
  pollInterval: 120000, // 2 минуты
});

const result = await collector.run((posts) => {
  console.info(`Received ${posts.length} posts`);
});
```

### Orchestrator (все платформы)

```typescript
import { SocialCollectorOrchestrator } from './src/collectors/social/index.js';

const orchestrator = new SocialCollectorOrchestrator({
  enableTwitter: true,
  twitter: {
    bearerToken: process.env.TWITTER_BEARER_TOKEN!,
    accounts: ['elonmusk'],
    hashtags: ['Bitcoin'],
  },
  enableReddit: true,
  reddit: {
    clientId: process.env.REDDIT_CLIENT_ID!,
    clientSecret: process.env.REDDIT_CLIENT_SECRET!,
    username: process.env.REDDIT_USERNAME!,
    password: process.env.REDDIT_PASSWORD!,
    subreddits: ['Bitcoin'],
  },
});

// Регистрация обработчиков
orchestrator.onPosts(async (posts) => {
  console.info(`Received ${posts.length} posts from ${posts[0].platform}`);
  // Сохранение в базу, анализ и т.д.
});

orchestrator.onError((error, platform) => {
  console.error(`Error from ${platform}:`, error.message);
});

// Инициализация и запуск
await orchestrator.initialize();
await orchestrator.collectAll(); // Однократный сбор

// Или непрерывный мониторинг
orchestrator.startPolling();
```

## Структура данных

Все коллекторы возвращают данные в едином формате:

```typescript
interface SocialPost {
  id: string;
  platform: 'twitter' | 'reddit' | 'telegram';
  author: string;
  authorFollowers?: number;
  content: string;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
  timestamp: Date;
  url: string;
}
```

## Rate Limiting

Модуль автоматически соблюдает ограничения API каждой платформы:

- **Twitter**: 15 запросов / 15 минут
- **Reddit**: 60 запросов / минуту
- **Telegram**: 20 запросов / минуту

## Retry Logic

Автоматические повторные попытки при временных ошибках:

- Network timeouts
- Rate limiting (429)
- Server errors (5xx)

Экспоненциальная задержка между попытками.

## Примеры

Запустите примеры для тестирования:

```bash
# Twitter
npm run example:twitter once
npm run example:twitter polling

# Reddit
npm run example:reddit once
npm run example:reddit polling

# Orchestrator (все платформы)
npm run example:social once
npm run example:social polling
```

## Тестирование

```bash
# Retry logic
npm run test:social:retry

# Orchestrator
npm run test:social:orchestrator
```

## Архитектура

```
src/collectors/social/
├── types.ts                    # Интерфейсы и типы
├── twitter/
│   └── TwitterCollector.ts    # Twitter коллектор
├── reddit/
│   └── RedditCollector.ts     # Reddit коллектор
├── telegram/
│   └── TelegramCollector.ts   # Telegram коллектор
├── utils/
│   ├── rateLimiter.ts         # Rate limiting
│   ├── retry.ts               # Retry logic
│   └── logger.ts              # Логирование
├── SocialCollectorOrchestrator.ts  # Оркестратор
└── index.ts                   # Экспорты
```

## API Reference

### TwitterCollector

**Methods:**
- `collectFromAccounts()` - сбор твитов от указанных аккаунтов
- `collectFromHashtags()` - сбор твитов по хештегам
- `run(onPosts?, options?)` - однократный сбор
- `startPolling(onPosts?, options?)` - запуск периодического опроса
- `stopPolling()` - остановка опроса
- `clearCache()` - очистка кеша дедупликации
- `getStats()` - получение статистики

### RedditCollector

**Methods:**
- `collectFromSubreddits()` - сбор постов из subreddits
- `run(onPosts?, options?)` - однократный сбор
- `startPolling(onPosts?, options?)` - запуск периодического опроса
- `stopPolling()` - остановка опроса
- `clearCache()` - очистка кеша
- `getStats()` - получение статистики

### TelegramCollector

**Methods:**
- `initialize()` - инициализация клиента (async)
- `collectFromChannels()` - сбор сообщений из каналов
- `run(onPosts?, options?)` - однократный сбор
- `startPolling(onPosts?, options?)` - запуск периодического опроса
- `stopPolling()` - остановка опроса
- `cleanup()` - graceful shutdown
- `clearCache()` - очистка кеша
- `getStats()` - получение статистики

### SocialCollectorOrchestrator

**Methods:**
- `onPosts(callback)` - регистрация обработчика постов
- `onError(callback)` - регистрация обработчика ошибок
- `initialize()` - инициализация всех коллекторов (async)
- `collectAll()` - однократный сбор со всех платформ
- `startPolling()` - запуск всех коллекторов
- `stopPolling()` - остановка всех коллекторов
- `cleanup()` - graceful shutdown
- `clearAllCaches()` - очистка всех кешей
- `getStats()` - получение статистики по всем коллекторам
- `getCollectorStats(platform)` - статистика конкретного коллектора
- `isAnyCollectorRunning()` - проверка активности коллекторов

## Лицензия

MIT
