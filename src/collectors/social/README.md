# Social Media Collector Module

Модуль для мониторинга криптовалютных обсуждений в социальных сетях.

## Поддерживаемые платформы

- ✅ **Twitter/X** - API v2 интеграция
- ✅ **Reddit** - Мониторинг crypto subreddit'ов
- ✅ **Telegram** - Публичные каналы через Bot API
- ⏳ **Discord** - Планируется в будущем

## Возможности

### Twitter/X
- Отслеживание конкретных аккаунтов (whale alerts, influencers)
- Мониторинг хештегов (#Bitcoin, #BTC, #Crypto)
- Сбор метрик вовлеченности (likes, retweets, comments, impressions)
- Автоматическое извлечение хештегов и упоминаний
- Rate limiting (300 запросов / 15 минут)
- Retry логика с exponential backoff

### Reddit
- Мониторинг популярных crypto subreddit'ов (r/Bitcoin, r/CryptoCurrency, r/CryptoMarkets)
- Различные режимы сортировки (hot, new, top, rising)
- Анализ постов и комментариев
- Rate limiting (60 запросов / минута)
- Подсчет upvotes/downvotes

### Telegram
- Подписка на публичные каналы
- Real-time получение сообщений через Bot API
- Извлечение медиа-вложений
- Rate limiting (30 запросов / секунда)

## Установка

```bash
npm install twitter-api-v2 snoowrap telegraf axios rate-limiter-flexible
```

## Настройка

### Переменные окружения

Скопируйте `.env.example` в `.env` и заполните необходимые ключи:

```env
# Twitter/X API
TWITTER_BEARER_TOKEN=your_bearer_token

# Reddit API
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_USER_AGENT=btc-trading-bot

# Telegram Bot API
TELEGRAM_BOT_TOKEN=your_bot_token

# Настройки коллекторов
SOCIAL_TWITTER_ENABLED=true
SOCIAL_TWITTER_ACCOUNTS=elonmusk,whale_alert,DocumentingBTC
SOCIAL_TWITTER_HASHTAGS=Bitcoin,BTC,Crypto

SOCIAL_REDDIT_ENABLED=true
SOCIAL_REDDIT_SUBREDDITS=Bitcoin,CryptoCurrency,CryptoMarkets
SOCIAL_REDDIT_SORT_BY=hot

SOCIAL_TELEGRAM_ENABLED=false
SOCIAL_TELEGRAM_CHANNELS=@bitcoin,@crypto
```

### Получение API ключей

#### Twitter/X API v2
1. Зарегистрируйтесь на [Twitter Developer Portal](https://developer.twitter.com/)
2. Создайте новое приложение
3. Получите Bearer Token в разделе "Keys and tokens"

#### Reddit API
1. Перейдите на [Reddit Apps](https://www.reddit.com/prefs/apps)
2. Создайте новое приложение типа "script"
3. Скопируйте Client ID и Client Secret

#### Telegram Bot API
1. Найдите [@BotFather](https://t.me/botfather) в Telegram
2. Создайте нового бота командой `/newbot`
3. Получите токен бота
4. Добавьте бота в нужные каналы как администратора

## Использование

### Базовый пример

```typescript
import { SocialCollectorManager } from './collectors/social';

const config = {
  twitter: {
    bearerToken: process.env.TWITTER_BEARER_TOKEN,
    accounts: ['elonmusk', 'whale_alert'],
    hashtags: ['Bitcoin', 'BTC'],
  },
  reddit: {
    clientId: process.env.REDDIT_CLIENT_ID,
    clientSecret: process.env.REDDIT_CLIENT_SECRET,
    userAgent: 'btc-trading-bot',
    subreddits: ['Bitcoin', 'CryptoCurrency'],
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    channels: ['@bitcoin'],
  },
  enabled: {
    twitter: true,
    reddit: true,
    telegram: false,
    discord: false,
  },
};

const manager = new SocialCollectorManager(config);

// Запуск коллекторов
await manager.start();

// Сбор данных
const results = await manager.collectAll();

// Остановка коллекторов
await manager.stop();
```

### Расширенное использование

```typescript
// Проверка соединений
const connections = await manager.testConnections();
console.log('Twitter:', connections.twitter ? '✅' : '❌');

// Получение топ-постов по вовлеченности
const topPosts = await manager.getTopPosts(10);

// Фильтрация по ключевым словам
const cryptoPosts = await manager.collectFiltered(['bitcoin', 'btc', 'crypto']);

// Статистика коллекторов
const stats = manager.getStats();
for (const stat of stats) {
  console.log(`${stat.platform}: ${stat.totalPosts} posts collected`);
}
```

### Запуск примера

```bash
# Настройте .env файл с вашими API ключами
npm run dev examples/social-collector-example.ts
```

## Архитектура

```
src/collectors/social/
├── types.ts          # TypeScript типы и интерфейсы
├── utils.ts          # Утилиты (rate limiting, retry, extractors)
├── twitter.ts        # Twitter/X коллектор
├── reddit.ts         # Reddit коллектор
├── telegram.ts       # Telegram коллектор
├── index.ts          # Главный менеджер коллекторов
└── README.md         # Документация
```

## Структура данных

Все посты конвертируются в единый формат `SocialPost`:

```typescript
interface SocialPost {
  id: string;                    // Уникальный ID
  platform: 'twitter' | 'reddit' | 'telegram';
  author: string;                // Автор поста
  authorFollowers?: number;      // Количество подписчиков
  content: string;               // Текст поста
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views?: number;
  };
  timestamp: Date;               // Время создания
  url: string;                   // Ссылка на пост
  hashtags?: string[];           // Хештеги
  mentions?: string[];           // Упоминания
  media?: MediaAttachment[];     // Медиа-файлы
}
```

## Rate Limiting

Модуль автоматически применяет rate limiting для каждой платформы:

- **Twitter**: 300 запросов / 15 минут
- **Reddit**: 60 запросов / минуту
- **Telegram**: 30 запросов / секунду

При превышении лимитов запросы автоматически ставятся в очередь.

## Retry Logic

Все запросы к API включают retry логику с exponential backoff:

- Максимум 3 попытки
- Базовая задержка: 1 секунда
- Множитель backoff: 2x
- Максимальная задержка: 30 секунд

## Тестирование

```bash
# Запуск тестов
npm test

# Тесты конкретного модуля
npm test -- src/collectors/social/__tests__/utils.test.ts
```

## Лимиты и ограничения

### Twitter API
- Требуется Elevated или Academic access для полного функционала
- Basic tier: 500k твитов/месяц, 300 запросов/15 минут
- Некоторые метрики доступны только с платными планами

### Reddit API
- Требуется регистрация приложения
- OAuth требует refresh token для долгосрочного доступа
- Follower count недоступен через публичное API

### Telegram Bot API
- Бот должен быть администратором канала для чтения истории
- Real-time мониторинг работает только для каналов, где бот добавлен
- Приватные каналы требуют явного приглашения бота

## Troubleshooting

### Twitter API 429 (Rate Limit)
Увеличьте `pollInterval` в конфигурации или используйте меньше accounts/hashtags.

### Reddit OAuth ошибки
Убедитесь, что используете правильный User Agent и credentials для вашего приложения.

### Telegram не получает сообщения
Проверьте, что бот добавлен в канал как администратор и имеет права на чтение сообщений.

## Следующие шаги

- [ ] Добавить поддержку Discord
- [ ] Реализовать хранение данных в базе
- [ ] Добавить sentiment анализ для постов
- [ ] Создать веб-интерфейс для мониторинга
- [ ] Реализовать уведомления о важных событиях
- [ ] Добавить агрегацию и аналитику трендов

## Лицензия

MIT
