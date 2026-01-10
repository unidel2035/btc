# Integram Database Integration

Интеграция с облачной базой данных [Интеграм](https://интеграм.рф) для хранения данных торгового бота.

## Что такое Интеграм?

**Интеграм** - это облачная бизнес-платформа с встроенной базой данных, REST API и веб-интерфейсом.

### Преимущества

✅ **Облачное хранение** - данные не теряются при перезапуске
✅ **REST API** - готовый CRUD без написания SQL
✅ **Веб-интерфейс** - можно просматривать данные через браузер
✅ **Типизированные данные** - схема с валидацией
✅ **Справочники** - встроенная поддержка связанных таблиц
✅ **Бесплатный тариф** - до 3 баз данных

### Ссылки

- 🌐 URL: https://интеграм.рф или https://app.integram.io
- 📚 Документация: https://интеграм.рф/docs
- 🔑 Тестовый доступ: база `bts`, логин/пароль: `d/d`

---

## Быстрый старт

### 1. Установка зависимостей

Зависимости уже установлены в проекте (`axios` для HTTP-клиента).

### 2. Настройка подключения

Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Настройте параметры подключения к Интеграм:

```env
# Integram Database
INTEGRAM_URL=https://интеграм.рф
INTEGRAM_DATABASE=bts
INTEGRAM_LOGIN=d
INTEGRAM_PASSWORD=d

# Storage backend для Dashboard
DASHBOARD_STORAGE=integram
```

### 3. Создание таблиц

Запустите скрипт настройки для получения инструкций по созданию таблиц:

```bash
npm run integram:setup
```

Скрипт покажет:
- ✅ Статус подключения
- 📋 Список таблиц для создания
- 📝 Инструкции по настройке

### 4. Создание таблиц в веб-интерфейсе

Перейдите на https://интеграм.рф и создайте следующие таблицы:

#### Справочники (Lookup Tables)

1. **PositionSide** - справочник сторон позиции
   - LONG
   - SHORT

2. **PositionStatus** - справочник статусов позиции
   - OPEN
   - CLOSED
   - PENDING

3. **SignalAction** - справочник действий по сигналу
   - BUY
   - SELL
   - HOLD

4. **Sentiment** - справочник настроений
   - POSITIVE
   - NEGATIVE
   - NEUTRAL

#### Основные таблицы

5. **Positions** - торговые позиции

| Поле | Тип | Описание |
|------|-----|----------|
| symbol | SHORT | Символ торговой пары |
| side | REFERENCE → PositionSide | LONG/SHORT |
| size | NUMBER | Размер позиции |
| entryPrice | NUMBER | Цена входа |
| currentPrice | NUMBER | Текущая цена |
| stopLoss | NUMBER | Стоп-лосс |
| takeProfit | NUMBER | Тейк-профит |
| pnl | NUMBER | P&L |
| pnlPercent | NUMBER | P&L в процентах |
| openTime | DATETIME | Время открытия |
| closeTime | DATETIME | Время закрытия |
| status | REFERENCE → PositionStatus | Статус |
| updatedAt | DATETIME | Время обновления |

6. **Signals** - торговые сигналы

| Поле | Тип | Описание |
|------|-----|----------|
| type | SHORT | Тип стратегии |
| source | SHORT | Источник |
| symbol | SHORT | Символ |
| action | REFERENCE → SignalAction | BUY/SELL/HOLD |
| strength | NUMBER | Сила сигнала (0-100) |
| confidence | NUMBER | Уверенность (0-1) |
| price | NUMBER | Рекомендуемая цена |
| reason | LONG | Причина |
| timestamp | DATETIME | Время создания |

7. **News** - новости

| Поле | Тип | Описание |
|------|-----|----------|
| title | SHORT | Заголовок |
| content | LONG | Содержание |
| source | SHORT | Источник |
| url | SHORT | URL |
| sentiment | REFERENCE → Sentiment | Настроение |
| sentimentScore | NUMBER | Оценка (-1 to 1) |
| publishedAt | DATETIME | Дата публикации |
| fetchedAt | DATETIME | Дата сбора |

8. **TradeHistory** - история торгов

| Поле | Тип | Описание |
|------|-----|----------|
| symbol | SHORT | Символ |
| side | REFERENCE → PositionSide | BUY/SELL |
| entryPrice | NUMBER | Цена входа |
| exitPrice | NUMBER | Цена выхода |
| quantity | NUMBER | Количество |
| pnl | NUMBER | P&L |
| openTime | DATETIME | Время открытия |
| closeTime | DATETIME | Время закрытия |
| reason | LONG | Причина закрытия |

9. **EquityHistory** - история капитала

| Поле | Тип | Описание |
|------|-----|----------|
| equity | NUMBER | Капитал |
| balance | NUMBER | Баланс |
| timestamp | DATETIME | Время |

### 5. Получение ID таблиц

После создания таблиц в веб-интерфейсе:

1. Откройте таблицу в браузере
2. Используйте Developer Tools (F12) → Network
3. Найдите запросы к `/_d_list?type=XXX`
4. Скопируйте `XXX` - это ID таблицы

Обновите `.env`:

```env
# Integram Table IDs
INTEGRAM_TYPE_POSITIONS=100
INTEGRAM_TYPE_SIGNALS=101
INTEGRAM_TYPE_NEWS=102
INTEGRAM_TYPE_TRADE_HISTORY=103
INTEGRAM_TYPE_EQUITY_HISTORY=104
INTEGRAM_TYPE_POSITION_SIDE=10
INTEGRAM_TYPE_POSITION_STATUS=11
INTEGRAM_TYPE_SIGNAL_ACTION=12
INTEGRAM_TYPE_SENTIMENT=13
```

### 6. Запуск Dashboard с Integram

```bash
npm run dashboard
```

При запуске вы увидите:

```
🗄️  Initializing Integram storage...
✅ Integram authenticated successfully
✅ IntegramStorage initialized
✅ Integram storage initialized
```

---

## Использование в коде

### Базовое использование

```typescript
import { IntegramClient, IntegramStorage } from './src/database/integram';

// Создание клиента
const client = new IntegramClient({
  serverURL: 'https://интеграм.рф',
  database: 'bts',
  login: 'd',
  password: 'd',
});

// Аутентификация
await client.authenticate();

// Создание storage
const storage = new IntegramStorage(client);
await storage.initialize();

// Использование
const positions = await storage.getPositions();
const signals = await storage.getSignals(50);
const metrics = await storage.getMetrics();
```

### Пример: Добавление позиции

```typescript
const position = await storage.addPosition({
  symbol: 'BTC/USDT',
  side: 'LONG',
  size: 0.1,
  entryPrice: 45000,
  currentPrice: 45500,
  pnl: 50,
  pnlPercent: 1.11,
});

console.log('Position created:', position.id);
```

### Пример: Получение метрик

```typescript
const metrics = await storage.getMetrics();

console.log({
  balance: metrics.balance,
  equity: metrics.equity,
  pnl: metrics.pnl,
  winRate: metrics.winRate,
});
```

---

## Архитектура

### Текущая схема (In-Memory)

```
Dashboard → storage.ts (Map/Array в памяти) → ❌ Данные теряются
```

### Новая схема (Integram)

```
Dashboard → IntegramStorage.ts → Integram API → ☁️ Облачная БД
```

### Структура файлов

```
src/
├── database/
│   ├── integram/
│   │   ├── IntegramClient.ts     # HTTP-клиент для Integram API
│   │   ├── types.ts               # TypeScript типы
│   │   └── index.ts               # Экспорты модуля
│   └── index.ts                   # Экспорт всех БД
├── dashboard/
│   ├── storage/
│   │   ├── IntegramStorage.ts    # Адаптер storage для Integram
│   │   └── index.ts               # Экспорты storage
│   ├── storage.ts                 # In-memory storage (legacy)
│   └── server.ts                  # Dashboard сервер (обновлен)
└── ...

scripts/
└── setup-integram.ts              # Скрипт настройки

examples/
└── integram-example.ts            # Пример использования

docs/
└── INTEGRAM.md                    # Эта документация
```

---

## API Reference

### IntegramClient

#### Методы

- `authenticate(): Promise<void>` - Аутентификация
- `getObjects<T>(typeId: number, limit?: number): Promise<T[]>` - Получить объекты
- `createObject(typeId: number, value: string, requisites: Record<string, unknown>): Promise<number>` - Создать объект
- `updateRequisites(objectId: number, requisites: Record<string, unknown>): Promise<void>` - Обновить реквизиты
- `deleteObject(objectId: number): Promise<void>` - Удалить объект
- `findObjectByValue(typeId: number, value: string): Promise<IntegramObject | null>` - Найти по значению
- `ping(): Promise<boolean>` - Проверить подключение

### IntegramStorage

Реализует интерфейс `DashboardStorage` с методами:

#### Positions
- `getPositions(): Promise<Position[]>`
- `getPosition(id: string): Promise<Position | undefined>`
- `addPosition(position): Promise<Position>`
- `updatePosition(id: string, updates): Promise<Position | null>`
- `closePosition(id: string, exitPrice: number, reason: string): Promise<TradeHistory | null>`

#### Signals
- `getSignals(limit?: number): Promise<Signal[]>`
- `addSignal(signal): Promise<Signal>`

#### News
- `getNews(limit?: number): Promise<NewsItem[]>`
- `addNews(news): Promise<NewsItem>`

#### Trade History
- `getTradeHistory(limit?: number): Promise<TradeHistory[]>`

#### Equity History
- `getEquityHistory(limit?: number): Promise<EquityPoint[]>`
- `addEquityPoint(): Promise<void>`

#### Metrics
- `getMetrics(): Promise<DashboardMetrics>`
- `getPerformanceStats(): Promise<PerformanceStats>`

#### Configuration
- `getStrategyConfig(name: string): StrategyConfig | undefined`
- `getAllStrategyConfigs(): StrategyConfig[]`
- `updateStrategyConfig(name: string, updates): StrategyConfig | null`
- `getRiskConfig(): RiskConfig`
- `updateRiskConfig(updates): RiskConfig`

---

## Примеры использования

### Запуск примера

```bash
npm run example:integram
```

### Тестирование подключения

```bash
npm run integram:setup
```

---

## Переключение между Storage

### In-Memory Storage (по умолчанию)

```env
DASHBOARD_STORAGE=memory
```

### Integram Storage

```env
DASHBOARD_STORAGE=integram
```

---

## Troubleshooting

### Ошибка аутентификации

```
❌ Integram authentication failed
```

**Решение:**
- Проверьте логин и пароль в `.env`
- Убедитесь, что база данных существует
- Проверьте сетевое подключение

### Таблицы не настроены

```
⚠️ INTEGRAM_TYPE_POSITIONS not configured, returning empty array
```

**Решение:**
- Создайте таблицы в веб-интерфейсе
- Обновите ID таблиц в `.env`
- Запустите `npm run integram:setup` для проверки

### Ошибка сети

```
Failed to get objects for type XXX: Network Error
```

**Решение:**
- Проверьте доступность `https://интеграм.рф`
- Проверьте настройки прокси/файрвола
- Проверьте timeout в `IntegramClient.ts`

---

## Миграция с In-Memory на Integram

1. **Экспорт данных** (опционально, если есть важные данные)
   ```bash
   # Запустите dashboard с DASHBOARD_DEMO=true для сбора данных
   npm run dashboard
   ```

2. **Настройка Integram**
   - Создайте таблицы по инструкции выше
   - Настройте `.env`

3. **Переключение storage**
   ```env
   DASHBOARD_STORAGE=integram
   ```

4. **Проверка**
   ```bash
   npm run dashboard
   # Проверьте веб-интерфейс: http://localhost:8080
   # Проверьте данные в Интеграм: https://интеграм.рф
   ```

---

## Ограничения и известные проблемы

### Текущие ограничения

1. **Создание таблиц** - необходимо делать через веб-интерфейс
2. **ID таблиц** - нужно получать вручную после создания
3. **Справочники** - нужно создавать до основных таблиц
4. **Pagination** - загружает все объекты (может быть медленно при больших объемах)

### В планах

- [ ] Автоматическое создание таблиц через API
- [ ] Кэширование данных для улучшения производительности
- [ ] Batch операции для массовых обновлений
- [ ] Автоматическое определение ID таблиц

---

## FAQ

### Q: Нужно ли платить за Integram?

A: Нет, есть бесплатный тариф до 3 баз данных.

### Q: Можно ли использовать Integram и PostgreSQL одновременно?

A: Да, но в текущей реализации нужно выбрать один storage backend через `DASHBOARD_STORAGE`.

### Q: Безопасно ли хранить логин/пароль в .env?

A: `.env` файл должен быть в `.gitignore` и не коммититься в git. Для production используйте переменные окружения сервера.

### Q: Как посмотреть данные в веб-интерфейсе?

A: Перейдите на https://интеграм.рф, войдите с вашими учетными данными и выберите базу данных.

---

## Дополнительные ресурсы

- [Документация Integram](https://интеграм.рф/docs)
- [GitHub Issues](https://github.com/unidel2035/btc/issues)
- [Dashboard Documentation](../README.md)

---

**Автор:** BTC Trading Bot Team
**Дата:** 2026-01-10
**Версия:** 1.0.0
