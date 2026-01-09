# База данных и хранение данных

Документация по системе базы данных и хранения данных проекта BTC Trading Bot.

## Содержание

- [Обзор](#обзор)
- [Установка](#установка)
- [Конфигурация](#конфигурация)
- [Схема базы данных](#схема-базы-данных)
- [Миграции](#миграции)
- [Использование](#использование)
- [Резервное копирование](#резервное-копирование)
- [Redis кэширование](#redis-кэширование)
- [Примеры](#примеры)

## Обзор

Система использует комбинацию PostgreSQL и Redis для хранения и кэширования данных:

- **PostgreSQL** — основное хранилище для персистентных данных
- **Redis** — кэширование, rate limiting, pub/sub

### Архитектура

```
src/database/
├── postgres.ts          # PostgreSQL клиент
├── redis.ts            # Redis клиент
├── config.ts           # Конфигурация
├── migrations/         # Миграции базы данных
│   ├── runner.ts       # Система миграций
│   └── 001_initial_schema.ts
├── models/             # Модели и репозитории
│   ├── types.ts        # TypeScript типы
│   ├── NewsRepository.ts
│   ├── SignalRepository.ts
│   ├── TradeRepository.ts
│   └── CandleRepository.ts
└── utils/              # Утилиты
    ├── cache.ts        # Менеджер кэша
    └── rateLimiter.ts  # Rate limiting
```

## Установка

### 1. Установка PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Docker:**
```bash
docker-compose up -d postgres
```

### 2. Установка Redis

**Ubuntu/Debian:**
```bash
sudo apt install redis-server
sudo systemctl start redis
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Docker:**
```bash
docker-compose up -d redis
```

### 3. Создание базы данных

```bash
# Создать базу данных
createdb btc_trading_bot

# Или с помощью psql
psql -U postgres
CREATE DATABASE btc_trading_bot;
\q
```

### 4. Установка зависимостей

```bash
npm install pg ioredis @types/pg
```

## Конфигурация

### Переменные окружения

Добавьте в файл `.env`:

```env
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=btc_trading_bot
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_URL=postgresql://postgres:your_password@localhost:5432/btc_trading_bot

# PostgreSQL Connection Pool
POSTGRES_MAX_CONNECTIONS=20
POSTGRES_IDLE_TIMEOUT=30000
POSTGRES_CONNECTION_TIMEOUT=10000

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_URL=redis://localhost:6379

# Backup
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=7
```

## Схема базы данных

### Таблицы

#### 1. News (Новости)

```sql
CREATE TABLE news (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  published_at TIMESTAMPTZ NOT NULL,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sentiment REAL,
  impact VARCHAR(20),
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Индексы:**
- `idx_news_source` — поиск по источнику
- `idx_news_published_at` — сортировка по дате публикации
- `idx_news_collected_at` — сортировка по дате сбора
- `idx_news_processed` — фильтр необработанных
- `idx_news_title_content` — полнотекстовый поиск

#### 2. Social Posts (Социальные посты)

```sql
CREATE TABLE social_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform VARCHAR(20) NOT NULL,
  author VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  engagement JSONB,
  sentiment REAL,
  timestamp TIMESTAMPTZ NOT NULL,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Индексы:**
- `idx_social_posts_platform` — поиск по платформе
- `idx_social_posts_author` — поиск по автору
- `idx_social_posts_timestamp` — сортировка по времени

#### 3. Signals (Сигналы)

```sql
CREATE TABLE signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL,
  source VARCHAR(50) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  direction VARCHAR(10) NOT NULL,
  strength REAL NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Индексы:**
- `idx_signals_symbol` — поиск по символу
- `idx_signals_type` — поиск по типу
- `idx_signals_strength` — сортировка по силе

#### 4. Trades (Сделки)

```sql
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol VARCHAR(20) NOT NULL,
  side VARCHAR(10) NOT NULL,
  type VARCHAR(20) NOT NULL,
  quantity DECIMAL(20, 8) NOT NULL,
  price DECIMAL(20, 8) NOT NULL,
  status VARCHAR(20) NOT NULL,
  strategy VARCHAR(50),
  signal_id UUID REFERENCES signals(id),
  pnl DECIMAL(20, 8),
  opened_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Индексы:**
- `idx_trades_symbol` — поиск по символу
- `idx_trades_status` — фильтр по статусу
- `idx_trades_strategy` — поиск по стратегии

#### 5. Candles (Свечи OHLCV)

```sql
CREATE TABLE candles (
  symbol VARCHAR(20) NOT NULL,
  interval VARCHAR(10) NOT NULL,
  open_time TIMESTAMPTZ NOT NULL,
  open DECIMAL(20, 8) NOT NULL,
  high DECIMAL(20, 8) NOT NULL,
  low DECIMAL(20, 8) NOT NULL,
  close DECIMAL(20, 8) NOT NULL,
  volume DECIMAL(20, 8) NOT NULL,
  close_time TIMESTAMPTZ NOT NULL,
  quote_volume DECIMAL(20, 8),
  trades_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (symbol, interval, open_time)
);
```

**Индексы:**
- `idx_candles_symbol_interval` — композитный индекс
- `idx_candles_open_time` — сортировка по времени

## Миграции

### Запуск миграций

```bash
# Выполнить все pending миграции
npm run db:migrate

# Проверить статус миграций
npm run db:status

# Откатить последнюю миграцию
npm run db:rollback
```

### Создание новой миграции

Создайте новый файл в `src/database/migrations/`:

```typescript
// 002_add_column.ts
import type { PoolClient } from 'pg';

export const up = async (client: PoolClient): Promise<void> => {
  await client.query(`
    ALTER TABLE news
    ADD COLUMN new_field VARCHAR(100);
  `);
};

export const down = async (client: PoolClient): Promise<void> => {
  await client.query(`
    ALTER TABLE news
    DROP COLUMN new_field;
  `);
};
```

Добавьте миграцию в `runner.ts`:

```typescript
import * as migration002 from './002_add_column.js';

const migrations: Migration[] = [
  // ...existing migrations
  {
    id: '002',
    name: 'add_column',
    up: migration002.up,
    down: migration002.down,
  },
];
```

## Использование

### PostgreSQL

```typescript
import { postgres, NewsRepository } from './src/database/index.js';

// Подключение
await postgres.connect();

// Использование репозитория
const news = await NewsRepository.create({
  source: 'coindesk',
  title: 'Bitcoin reaches new high',
  content: 'Full article content...',
  url: 'https://...',
  published_at: new Date(),
  collected_at: new Date(),
  sentiment: 0.85,
  impact: 'high',
  processed: false,
});

// Поиск
const recent = await NewsRepository.getRecent(10);
const bySource = await NewsRepository.getBySource('coindesk', 20);

// Обновление
await NewsRepository.update(news.id, { processed: true });

// Отключение
await postgres.disconnect();
```

### Redis

```typescript
import { redis, CacheManager, RateLimiter } from './src/database/index.js';

// Подключение
await redis.connect();

// Кэширование
await CacheManager.cachePrice({
  symbol: 'BTCUSDT',
  price: 45000,
  timestamp: Date.now(),
});

const price = await CacheManager.getPrice('BTCUSDT');

// Rate limiting
const result = await RateLimiter.checkLimit({
  identifier: 'user-123',
  action: 'api',
  maxRequests: 100,
  windowMs: 60000,
});

if (!result.allowed) {
  console.log('Rate limit exceeded');
}

// Отключение
await redis.disconnect();
```

## Резервное копирование

### Создание бэкапа

```bash
# Автоматический бэкап
npm run db:backup

# Или напрямую
./scripts/backup-database.sh
```

Бэкапы сохраняются в `./backups/` с автоматической ротацией (по умолчанию 7 дней).

### Восстановление из бэкапа

```bash
# Восстановление
npm run db:restore backups/btc_trading_bot_20240115_120000.sql.gz

# Или напрямую
./scripts/restore-database.sh backups/btc_trading_bot_20240115_120000.sql.gz
```

**Внимание:** Восстановление удаляет текущую базу данных!

### Настройка автоматических бэкапов

Добавьте в cron:

```bash
# Ежедневный бэкап в 2:00 AM
0 2 * * * cd /path/to/project && npm run db:backup
```

## Redis кэширование

### Структура ключей

```
price:BTCUSDT              # Текущая цена
candle:BTCUSDT:1m:*        # Свечи 1m
orderbook:BTCUSDT          # Книга ордеров
signal:uuid                # Сигналы
ratelimit:api:user-123     # Rate limiting
```

### TTL значения

- Цены (realtime): 5 секунд
- Свечи 1m: 60 секунд
- Свечи 1h: 1 час
- Orderbook: 10 секунд
- Сигналы: 1 час

## Примеры

### Пример 1: Работа с новостями

```typescript
import { postgres, NewsRepository } from './src/database/index.js';

await postgres.connect();

// Создание
const news = await NewsRepository.create({
  source: 'coindesk',
  title: 'Bitcoin News',
  content: 'Content...',
  url: 'https://example.com/news',
  published_at: new Date(),
  collected_at: new Date(),
  processed: false,
});

// Поиск необработанных
const unprocessed = await NewsRepository.getUnprocessed(10);

// Обработка и обновление
for (const item of unprocessed) {
  const sentiment = await analyzeSentiment(item.content);
  await NewsRepository.markAsProcessed(item.id, sentiment);
}
```

### Пример 2: Торговые сигналы и сделки

```typescript
import { SignalRepository, TradeRepository } from './src/database/index.js';

// Создание сигнала
const signal = await SignalRepository.create({
  type: 'news_momentum',
  source: 'sentiment_analyzer',
  symbol: 'BTCUSDT',
  direction: 'long',
  strength: 0.85,
  data: { sentiment: 0.85 },
});

// Создание сделки на основе сигнала
const trade = await TradeRepository.create({
  symbol: 'BTCUSDT',
  side: 'buy',
  type: 'market',
  quantity: 0.01,
  price: 45000,
  status: 'open',
  strategy: 'news_momentum',
  signal_id: signal.id,
  opened_at: new Date(),
});

// Закрытие сделки
await TradeRepository.close(trade.id, 150.50); // PnL: $150.50

// Статистика
const stats = await TradeRepository.getStats({
  strategy: 'news_momentum',
});
console.log(stats.winRate); // 0.65 (65% win rate)
```

### Пример 3: Кэширование цен

```typescript
import { redis, CacheManager } from './src/database/index.js';

await redis.connect();

// Кэширование цен
await CacheManager.cachePrices([
  { symbol: 'BTCUSDT', price: 45000, timestamp: Date.now() },
  { symbol: 'ETHUSDT', price: 2500, timestamp: Date.now() },
]);

// Получение кэшированной цены
const btcPrice = await CacheManager.getPrice('BTCUSDT');
console.log(btcPrice); // { symbol: 'BTCUSDT', price: 45000, ... }

// Получение всех цен
const allPrices = await CacheManager.getAllPrices();
```

## Тестирование

```bash
# Запуск тестов базы данных
npm run test:database
```

Убедитесь, что PostgreSQL и Redis запущены перед выполнением тестов.

## Troubleshooting

### PostgreSQL не подключается

```bash
# Проверить статус
sudo systemctl status postgresql

# Перезапустить
sudo systemctl restart postgresql

# Проверить подключение
psql -U postgres -h localhost
```

### Redis не подключается

```bash
# Проверить статус
sudo systemctl status redis

# Перезапустить
sudo systemctl restart redis

# Проверить подключение
redis-cli ping
```

### Ошибки миграций

```bash
# Проверить статус
npm run db:status

# Откатить последнюю миграцию
npm run db:rollback

# Повторить миграцию
npm run db:migrate
```

## Производительность

### Рекомендации

1. **Используйте connection pooling** — уже настроено (max 20 соединений)
2. **Индексируйте часто используемые колонки** — все ключевые индексы созданы
3. **Используйте Redis для кэширования** — реализовано для цен, свечей, orderbook
4. **Регулярные бэкапы** — настройте cron для автоматических бэкапов
5. **Мониторинг** — следите за статистикой пула подключений

### Мониторинг

```typescript
// PostgreSQL pool stats
const stats = postgres.getStats();
console.log(stats); // { total: 5, idle: 3, waiting: 0 }

// Redis info
const info = await redis.info();
console.log(info);
```

## Дополнительные ресурсы

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [TypeScript pg Documentation](https://node-postgres.com/)
- [ioredis Documentation](https://github.com/redis/ioredis)
