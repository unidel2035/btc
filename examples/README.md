# Social Collectors Examples

Примеры использования модуля мониторинга социальных сетей.

## Подготовка

1. Установите зависимости:
```bash
npm install
```

2. Скопируйте `.env.example` в `.env` и заполните необходимые API ключи:
```bash
cp ../.env.example ../.env
```

3. Скомпилируйте TypeScript:
```bash
npm run build
```

## Примеры

### Twitter Collector

Мониторинг Twitter/X для отслеживания ключевых аккаунтов и хештегов.

**Real-time мониторинг:**
```bash
ts-node examples/twitter-collector-example.ts
```

**Одноразовый сбор:**
```bash
ts-node examples/twitter-collector-example.ts once
```

**Что отслеживается:**
- Аккаунты: whale_alert, VitalikButerin, CZ_Binance, elonmusk
- Хештеги: #Bitcoin, #BTC, #Crypto, #Ethereum, #ETH

### Reddit Collector

Мониторинг Reddit для анализа популярных постов в криптовалютных subreddits.

**Real-time мониторинг:**
```bash
ts-node examples/reddit-collector-example.ts
```

**Получить trending topics:**
```bash
ts-node examples/reddit-collector-example.ts topics
```

**Анализ комментариев:**
```bash
ts-node examples/reddit-collector-example.ts comments
```

**Что отслеживается:**
- Subreddits: r/Bitcoin, r/CryptoCurrency, r/CryptoMarkets, r/btc, r/ethtrader

### Orchestrator (Все платформы)

Одновременный мониторинг всех социальных платформ через оркестратор.

**Real-time мониторинг:**
```bash
ts-node examples/orchestrator-example.ts
```

**Одноразовый сбор:**
```bash
ts-node examples/orchestrator-example.ts once
```

**Возможности:**
- Параллельный сбор данных со всех платформ
- Автоматическое сохранение данных каждые 5 минут
- Агрегированная статистика
- Обработка ошибок

## Конфигурация

### Twitter API

Получить Bearer Token:
1. Создайте приложение на https://developer.twitter.com/
2. Перейдите в раздел "Keys and tokens"
3. Скопируйте Bearer Token

### Reddit API

Получить Client ID и Secret:
1. Перейдите на https://www.reddit.com/prefs/apps
2. Создайте новое приложение (script type)
3. Скопируйте Client ID и Client Secret

### Telegram API

Получить API ID и Hash:
1. Перейдите на https://my.telegram.org/
2. Войдите с вашим номером телефона
3. Перейдите в "API development tools"
4. Создайте новое приложение
5. Скопируйте API ID и API Hash

**Важно:** Для Telegram необходима авторизация. При первом запуске нужно будет ввести код подтверждения из SMS.

## Структура данных

Все коллекторы возвращают данные в формате `SocialPost`:

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

## Сохранение данных

Собранные данные автоматически сохраняются в директорию `data/` в формате JSON:

```
data/
  social-posts-2024-01-15T10-30-00-000Z.json
  social-posts-2024-01-15T10-35-00-000Z.json
```

## Rate Limiting

Все коллекторы включают встроенные механизмы rate limiting:

- **Twitter**: 15 запросов / 15 минут
- **Reddit**: 60 запросов / минуту
- **Telegram**: 20 запросов / минуту

## Обработка ошибок

Все коллекторы используют retry logic с экспоненциальной задержкой для обработки временных ошибок (network timeouts, rate limits, etc.).

## Мониторинг

Статистика работы коллекторов включает:
- Общее количество собранных постов
- Количество успешных/неудачных запросов
- Время последнего запроса
- Текущий статус (running/stopped/error)
