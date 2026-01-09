# Exchange API Integration

Модуль интеграции с криптовалютными биржами для получения рыночных данных и торговли.

## Поддерживаемые биржи

- ✅ **Binance** (Spot + Futures)
- ✅ **Bybit** (Spot + Futures)
- 🔄 **OKX** (в разработке)
- 🔄 **Coinbase Pro** (в планах)

## Возможности

### Market Data
- ✅ Получение свечей (OHLCV) с различными интервалами
- ✅ Order book (глубина рынка)
- ✅ Recent trades (последние сделки)
- ✅ Ticker (текущая цена и статистика)
- ✅ Все тикеры сразу
- 🔄 WebSocket streams (в разработке)

### Trading
- ✅ Market orders (рыночные ордера)
- ✅ Limit orders (лимитные ордера)
- ✅ Stop orders (стоп-ордера)
- ✅ OCO orders (только Binance Spot)
- ✅ Отмена ордеров (одного или всех)
- ✅ Получение информации об ордерах
- ✅ Получение открытых ордеров

### Account
- ✅ Получение баланса всех активов
- ✅ Получение баланса конкретного актива

### Futures
- ✅ Получение открытых позиций
- ✅ Изменение плеча (leverage)
- ✅ Isolated и Cross margin

### Security
- ✅ Шифрование API ключей (AES-256-GCM)
- ✅ Rate limiting (ограничение частоты запросов)
- ✅ Логирование всех операций
- ✅ IP whitelist support
- ✅ Безопасное хранение паролей (PBKDF2)

## Установка

Модуль является частью торгового бота и не требует отдельной установки.

## Конфигурация

Добавьте API ключи в файл `.env`:

```env
# Binance
BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET=your_binance_secret
BINANCE_TESTNET=true

# Bybit
BYBIT_API_KEY=your_bybit_api_key
BYBIT_SECRET=your_bybit_secret
BYBIT_TESTNET=true

# OKX (опционально)
OKX_API_KEY=your_okx_api_key
OKX_SECRET=your_okx_secret
OKX_PASSPHRASE=your_okx_passphrase
OKX_TESTNET=true
```

## Использование

### Базовый пример

```typescript
import {
  ExchangeManager,
  getBinanceConfig,
  MarketType,
  CandleInterval,
  OrderType,
  OrderSide,
  ExchangeName,
} from './exchanges';

// Создание менеджера бирж
const manager = new ExchangeManager();

// Добавление Binance Spot
const binanceConfig = getBinanceConfig();
manager.addExchange(binanceConfig, MarketType.SPOT);

// Инициализация (проверка подключения)
await manager.initialize();

// Получение биржи
const binance = manager.getExchange(ExchangeName.BINANCE, MarketType.SPOT);

// Получение свечей
const candles = await binance.getCandles('BTCUSDT', CandleInterval.ONE_HOUR, 100);

// Получение текущей цены
const ticker = await binance.getTicker('BTCUSDT');
console.log(`BTC/USDT: ${ticker.last}`);

// Получение баланса
const balances = await binance.getBalance();

// Размещение ордера (только testnet!)
const order = await binance.placeOrder({
  symbol: 'BTCUSDT',
  type: OrderType.LIMIT,
  side: OrderSide.BUY,
  quantity: 0.001,
  price: 40000,
  timeInForce: TimeInForce.GTC,
});

// Очистка ресурсов
await manager.cleanup();
```

### Работа с несколькими биржами

```typescript
// Добавляем несколько бирж
manager.addExchange(getBinanceConfig(), MarketType.SPOT);
manager.addExchange(getBinanceConfig(), MarketType.FUTURES);
manager.addExchange(getBybitConfig(), MarketType.SPOT);
manager.addExchange(getBybitConfig(), MarketType.FUTURES);

await manager.initialize();

// Сравнение цен на разных биржах
const exchanges = manager.getAllExchanges();

for (const exchange of exchanges) {
  const ticker = await exchange.getTicker('BTCUSDT');
  console.log(`${exchange.getName()}: ${ticker.last}`);
}
```

### Шифрование API ключей

```typescript
import { encryptExchangeKeys, decryptExchangeKeys, generateMasterPassword } from './exchanges';

// Генерация мастер-пароля
const masterPassword = generateMasterPassword();

// Шифрование ключей
const encrypted = encryptExchangeKeys(
  'your-api-key',
  'your-api-secret',
  masterPassword,
  'passphrase' // опционально для OKX
);

// Сохранение зашифрованных ключей в БД
// ...

// Расшифровка ключей
const decrypted = decryptExchangeKeys(encrypted, masterPassword);
console.log(decrypted.apiKey); // 'your-api-key'
```

### Работа с фьючерсами

```typescript
// Добавляем Binance Futures
manager.addExchange(getBinanceConfig(), MarketType.FUTURES);

const binanceFutures = manager.getExchange(ExchangeName.BINANCE, MarketType.FUTURES);

// Изменение плеча
await binanceFutures.setLeverage('BTCUSDT', 10);

// Получение открытых позиций
const positions = await binanceFutures.getPositions();

for (const pos of positions) {
  console.log(`${pos.symbol}: ${pos.side} ${pos.size} @ ${pos.entryPrice}`);
  console.log(`Unrealized PnL: ${pos.unrealizedPnl}`);
}
```

## API Reference

### BaseExchange

Базовый класс для всех интеграций бирж.

#### Market Data Methods

- `getCandles(symbol, interval, limit?, startTime?, endTime?)` - Получение исторических свечей
- `getOrderBook(symbol, depth?)` - Получение order book
- `getRecentTrades(symbol, limit?)` - Получение последних сделок
- `getTicker(symbol)` - Получение текущего ticker
- `getAllTickers()` - Получение всех тикеров

#### Trading Methods

- `placeOrder(order)` - Размещение ордера
- `cancelOrder(symbol, orderId)` - Отмена ордера
- `cancelAllOrders(symbol)` - Отмена всех ордеров по символу
- `getOrder(symbol, orderId)` - Получение ордера по ID
- `getOpenOrders(symbol?)` - Получение открытых ордеров
- `placeOCOOrder(order)` - Размещение OCO ордера

#### Account Methods

- `getBalance()` - Получение баланса всех активов
- `getAssetBalance(asset)` - Получение баланса конкретного актива

#### Futures Methods

- `getPositions(symbol?)` - Получение открытых позиций
- `setLeverage(symbol, leverage)` - Изменение плеча

#### Connection Methods

- `testConnection()` - Проверка подключения к API
- `getExchangeInfo()` - Получение информации о бирже
- `cleanup()` - Закрытие всех соединений

### ExchangeManager

Менеджер для управления несколькими биржами.

#### Methods

- `addExchange(config, marketType)` - Добавление биржи
- `getExchange(name, marketType)` - Получение биржи
- `getAllExchanges()` - Получение всех бирж
- `hasExchange(name, marketType)` - Проверка существования биржи
- `removeExchange(name, marketType)` - Удаление биржи
- `initialize()` - Инициализация всех бирж
- `getExchangesInfo()` - Получение информации обо всех биржах
- `getStats()` - Получение статистики
- `cleanup()` - Очистка всех ресурсов

## Rate Limiting

Модуль автоматически применяет rate limiting для предотвращения блокировки по API:

- **Binance**: 1200 запросов/мин
- **Bybit**: 600 запросов/мин
- **OKX**: 600 запросов/мин

Rate limiting можно отключить в конфигурации:

```typescript
const config = {
  ...getBinanceConfig(),
  enableRateLimit: false,
};
```

## Безопасность

### Шифрование API ключей

Все API ключи должны храниться в зашифрованном виде. Модуль предоставляет функции для шифрования:

```typescript
// AES-256-GCM шифрование
const encrypted = encrypt('sensitive-data', 'master-password');
const decrypted = decrypt(encrypted, 'master-password');
```

### IP Whitelist

Рекомендуется настроить IP whitelist на биржах для дополнительной безопасности.

### Логирование

Все операции логируются для аудита:

```
[binance:spot] GET /api/v3/ticker/24hr {"symbol":"BTCUSDT"}
[binance:spot] Connection test successful
```

## Тестирование

```bash
# Запуск тестов безопасности
npm run test:exchanges

# Запуск примера
npm run example:exchanges
```

## Структура файлов

```
src/exchanges/
├── types.ts              # TypeScript типы и интерфейсы
├── BaseExchange.ts       # Базовый класс биржи
├── BinanceExchange.ts    # Binance адаптер
├── BybitExchange.ts      # Bybit адаптер
├── ExchangeManager.ts    # Менеджер бирж
├── config.ts             # Конфигурация
├── security.ts           # Шифрование и безопасность
├── index.ts              # Экспорты модуля
└── README.md             # Документация
```

## Roadmap

- [x] Binance Spot
- [x] Binance Futures
- [x] Bybit Spot
- [x] Bybit Futures
- [x] Rate limiting
- [x] API key encryption
- [ ] WebSocket streams
- [ ] OKX integration
- [ ] Coinbase Pro integration
- [ ] Reconnection logic
- [ ] Trading history
- [ ] Portfolio management

## Troubleshooting

### "API key not found" error

Убедитесь, что API ключи добавлены в `.env` файл:

```env
BINANCE_API_KEY=your_key
BINANCE_SECRET=your_secret
```

### "Rate limit exceeded" error

Снизьте частоту запросов или подождите минуту для сброса лимита.

### "Signature verification failed" error

Проверьте правильность API secret. Убедитесь, что время на сервере синхронизировано.

### "Insufficient balance" error

Проверьте баланс на бирже перед размещением ордера.

## Поддержка

Для вопросов и предложений создайте issue в репозитории.

## Лицензия

MIT

## Disclaimer

Торговля криптовалютами связана с высокими рисками. Всегда тестируйте на testnet перед использованием на production.
