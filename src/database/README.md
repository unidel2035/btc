# База данных и хранение данных

Модуль для работы с PostgreSQL и Redis в торговом боте.

## Компоненты

- **PostgreSQL** — основное хранилище для новостей, сигналов, сделок и свечей
- **Redis** — кеширование, rate limiting и pub/sub для real-time данных
- **Миграции** — версионирование схемы базы данных
- **Бекапы** — создание и восстановление резервных копий

## Структура базы данных

### Таблицы

#### news
Новостные статьи из различных источников:
- `id` — UUID, первичный ключ
- `source` — источник (coindesk, cointelegraph, и т.д.)
- `title` — заголовок новости
- `content` — полный текст новости
- `url` — уникальный URL статьи
- `published_at` — дата публикации
- `collected_at` — дата сбора
- `sentiment` — оценка настроения (-1 до 1)
- `impact` — влияние на рынок (low, medium, high)
- `processed` — флаг обработки

#### social_posts
Посты из социальных сетей:
- `id` — UUID, первичный ключ
- `platform` — платформа (twitter, reddit, telegram)
- `author` — автор поста
- `content` — текст поста
- `engagement` — JSON с метриками вовлеченности
- `sentiment` — оценка настроения
- `timestamp` — время публикации
- `url` — ссылка на пост

#### signals
Торговые сигналы:
- `id` — UUID, первичный ключ
- `type` — тип сигнала
- `source` — источник сигнала
- `symbol` — торговая пара (BTCUSDT)
- `direction` — направление (long/short)
- `strength` — сила сигнала (0-1)
- `data` — JSON с дополнительными данными
- `created_at` — время создания

#### trades
Торговые позиции:
- `id` — UUID, первичный ключ
- `symbol` — торговая пара
- `side` — сторона сделки (buy/sell)
- `type` — тип ордера (market, limit, stop)
- `quantity` — количество
- `price` — цена
- `status` — статус (pending, open, closed, cancelled)
- `strategy` — использованная стратегия
- `signal_id` — связь с сигналом
- `pnl` — прибыль/убыток
- `opened_at` — время открытия
- `closed_at` — время закрытия

#### candles
OHLCV данные для технического анализа:
- `symbol` — торговая пара
- `interval` — интервал (1m, 5m, 1h, и т.д.)
- `open_time` — время открытия свечи
- `open` — цена открытия
- `high` — максимальная цена
- `low` — минимальная цена
- `close` — цена закрытия
- `volume` — объем торгов

### Индексы

Созданы индексы для оптимизации частых запросов:
- По источнику, дате публикации и статусу обработки (news)
- По платформе, времени и автору (social_posts)
- По символу, типу и силе сигнала (signals)
- По символу, статусу и датам (trades)
- По символу, интервалу и времени (candles)

## Использование

### Подключение к базе данных

```typescript
import { postgres, redis } from './database/index.js';

// Подключение к PostgreSQL
await postgres.connect();

// Подключение к Redis
await redis.connect();
```

### PostgreSQL

```typescript
// Простой запрос
const result = await postgres.query('SELECT * FROM news LIMIT 10');

// Запрос с параметрами
const news = await postgres.query(
  'SELECT * FROM news WHERE source = $1',
  ['coindesk']
);

// Транзакция
await postgres.transaction(async (client) => {
  await client.query('INSERT INTO signals ...');
  await client.query('INSERT INTO trades ...');
});
```

### Redis

```typescript
// Установка значения с TTL
await redis.set('btc:price', '98000', 60); // 60 секунд

// Получение значения
const price = await redis.get('btc:price');

// JSON объекты
await redis.setJSON('user:123', { name: 'John', balance: 1000 }, 300);
const user = await redis.getJSON('user:123');

// Rate limiting
const allowed = await redis.checkRateLimit('api:user:123', 100, 60);
if (!allowed) {
  throw new Error('Rate limit exceeded');
}

// Pub/Sub
await redis.publish('trades', JSON.stringify({ symbol: 'BTCUSDT', ... }));
await redis.subscribe('trades', (message) => {
  console.log('New trade:', message);
});
```

## Миграции

### Запуск миграций

```bash
npm run db:migrate
```

Миграции находятся в `src/database/migrations/` и выполняются по порядку.

### Создание новой миграции

1. Создайте файл `XXX_migration_name.sql` в папке `migrations/`
2. Используйте формат имени: `001_initial_schema.sql`, `002_add_indexes.sql`, и т.д.
3. Запустите `npm run db:migrate`

## Бекапы

### Создание бекапа PostgreSQL

```bash
npm run db:backup create
```

### Восстановление из бекапа

```bash
npm run db:backup restore ./backups/backup_file.sql
```

### Бекап Redis

```bash
npm run db:backup redis
```

Бекапы сохраняются в директорию `./backups/` (настраивается через `BACKUP_DIR`).

## Тестовые данные

Для заполнения базы тестовыми данными:

```bash
npm run db:seed
```

Это создаст:
- 3 новостные статьи
- 3 социальных поста
- 3 торговых сигнала
- 2 сделки
- 11 свечей для BTCUSDT

## Конфигурация

Настройки подключения берутся из переменных окружения (`.env`):

```env
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=btc_trading_bot
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## Docker

Для запуска PostgreSQL и Redis через Docker Compose:

```bash
docker-compose up -d postgres redis
```

## Примеры

Смотрите `examples/database-example.ts` для полных примеров использования:

```bash
npm run example:database
```

## API Reference

### PostgresClient

- `connect(config?)` — подключение к базе
- `query<T>(text, params?)` — выполнение запроса
- `transaction(callback)` — выполнение транзакции
- `disconnect()` — закрытие соединения
- `isConnected()` — проверка соединения
- `testConnection()` — тест соединения

### RedisClient

- `connect(config?)` — подключение к Redis
- `set(key, value, ttl?)` — установка значения
- `get(key)` — получение значения
- `setJSON(key, value, ttl?)` — сохранение JSON
- `getJSON<T>(key)` — получение JSON
- `del(key)` — удаление ключа
- `exists(key)` — проверка существования
- `expire(key, seconds)` — установка TTL
- `incr(key)` — инкремент счетчика
- `checkRateLimit(key, limit, window)` — rate limiting
- `publish(channel, message)` — публикация сообщения
- `subscribe(channel, callback)` — подписка на канал
- `disconnect()` — закрытие соединения

## Лучшие практики

1. **Всегда используйте параметризованные запросы** для защиты от SQL injection
2. **Используйте транзакции** для связанных операций
3. **Устанавливайте TTL** для временных данных в Redis
4. **Создавайте индексы** для часто используемых запросов
5. **Регулярно создавайте бекапы** в production окружении
6. **Используйте connection pooling** (уже настроен в PostgresClient)
7. **Логируйте ошибки** подключения и запросов

## Troubleshooting

### Ошибка подключения к PostgreSQL

```bash
# Проверьте, что PostgreSQL запущен
docker-compose ps postgres

# Проверьте логи
docker-compose logs postgres
```

### Ошибка подключения к Redis

```bash
# Проверьте, что Redis запущен
docker-compose ps redis

# Тест соединения
redis-cli ping
```

### Миграции не применяются

```bash
# Проверьте таблицу миграций
psql -U postgres -d btc_trading_bot -c "SELECT * FROM migrations;"

# Пересоздайте базу (ВНИМАНИЕ: удалит все данные)
psql -U postgres -c "DROP DATABASE btc_trading_bot;"
psql -U postgres -c "CREATE DATABASE btc_trading_bot;"
npm run db:migrate
```
