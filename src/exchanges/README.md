## 📈 Exchange Integration Module

Модуль интеграции с криптовалютными биржами для торгового бота.

### ✨ Возможности

- 🔗 **Унифицированный интерфейс** для работы с несколькими биржами
- 📊 **Market Data** - свечи (OHLCV), стакан заявок, недавние сделки, тикеры
- 💼 **Trading** - создание/отмена ордеров, получение баланса
- ⚡ **WebSocket streams** - подписка на real-time обновления
- 🔒 **Безопасность** - шифрование API ключей, HMAC подписи
- ⏱️ **Rate limiting** - автоматическое ограничение частоты запросов
- 🔄 **Retry logic** - автоматические повторные попытки при ошибках
- 📝 **Полная типизация** TypeScript

### 🏦 Поддерживаемые биржи

| Биржа | Spot | Futures | WebSocket | Status |
|-------|------|---------|-----------|---------|
| **Binance** | ✅ | ✅ | ✅ | Полная поддержка |
| **Bybit** | ✅ | ✅ | ✅ | Полная поддержка |
| OKX | ⏳ | ⏳ | ⏳ | Планируется |
| Coinbase Pro | ⏳ | ❌ | ⏳ | Планируется |

---

## 📖 Содержание

- [Быстрый старт](#быстрый-старт)
- [Архитектура](#архитектура)
- [API Reference](#api-reference)
  - [Exchange Manager](#exchange-manager)
  - [Binance Exchange](#binance-exchange)
  - [Bybit Exchange](#bybit-exchange)
- [Market Data](#market-data)
- [Trading](#trading)
- [WebSocket Streams](#websocket-streams)
- [Безопасность](#безопасность)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Примеры](#примеры)

---

## 🚀 Быстрый старт

### Установка зависимостей

```bash
npm install ws @types/ws
```

### Настройка переменных окружения

```env
# Binance
BINANCE_API_KEY=your_api_key
BINANCE_SECRET=your_secret_key
BINANCE_TESTNET=false

# Bybit
BYBIT_API_KEY=your_api_key
BYBIT_SECRET=your_secret_key
BYBIT_TESTNET=false

# Опционально: мастер-ключ для шифрования
EXCHANGE_MASTER_KEY=your_master_key_min_32_chars

# Логирование
EXCHANGE_LOGGING=false
```

### Базовое использование

```typescript
import { ExchangeManager, createExchangeConfig } from './exchanges';

// Создать менеджер бирж
const config = createExchangeConfig();
const manager = new ExchangeManager(config);

// Проверить соединение
const pingResults = await manager.pingAll();
console.log('Ping results:', pingResults);

// Получить тикер
const ticker = await manager.getTicker('binance', 'BTCUSDT');
console.log('BTC Price:', ticker.lastPrice);

// Получить баланс
const binance = manager.getExchange('binance');
const balance = await binance.getBalance();
console.log('Balance:', balance);
```

---

## 🏗️ Архитектура

```
src/exchanges/
├── types.ts              # TypeScript типы и интерфейсы
├── BaseExchange.ts       # Базовый класс с общей функциональностью
├── BinanceExchange.ts    # Реализация Binance API
├── BybitExchange.ts      # Реализация Bybit API
├── ExchangeManager.ts    # Менеджер для управления несколькими биржами
├── security.ts           # Утилиты шифрования и безопасности
├── config.ts             # Конфигурация и валидация
├── index.ts              # Экспорты модуля
└── README.md             # Документация
```

### Интерфейс IExchange

Все биржи реализуют единый интерфейс `IExchange`:

```typescript
interface IExchange {
  // Market Data
  getCandles(symbol: string, interval: CandleInterval, limit: number): Promise<Candle[]>;
  getOrderBook(symbol: string, depth: number): Promise<OrderBook>;
  getTrades(symbol: string): Promise<Trade[]>;
  getTicker(symbol: string): Promise<Ticker>;

  // Trading
  placeOrder(order: OrderRequest): Promise<Order>;
  cancelOrder(orderId: string, symbol: string): Promise<void>;
  getOrder(orderId: string, symbol: string): Promise<Order>;
  getOpenOrders(symbol?: string): Promise<Order[]>;
  getBalance(): Promise<Balance[]>;

  // WebSocket
  subscribeToTrades(symbol: string, callback: Function): void;
  subscribeToTicker(symbol: string, callback: Function): void;
  subscribeToCandles(symbol: string, interval: CandleInterval, callback: Function): void;
  subscribeToOrderBook(symbol: string, callback: Function): void;
  unsubscribeAll(): void;

  // Utility
  ping(): Promise<boolean>;
  getServerTime(): Promise<number>;
  getLimits(): ExchangeLimits;
}
```

---

## 📚 API Reference

### Exchange Manager

Централизованное управление несколькими биржами.

#### Создание

```typescript
import { ExchangeManager, createExchangeConfig } from './exchanges';

const config = createExchangeConfig();
const manager = new ExchangeManager(config);
```

#### Методы

**`getExchange(name: string): IExchange | undefined`**

Получить биржу по имени.

```typescript
const binance = manager.getExchange('binance');
const bybit = manager.getExchange('bybit');
```

**`getAllExchanges(): IExchange[]`**

Получить все биржи.

**`getExchangeNames(): string[]`**

Получить названия всех бирж.

**`pingAll(): Promise<Map<string, boolean>>`**

Проверить соединение со всеми биржами.

```typescript
const results = await manager.pingAll();
// Map { 'binance' => true, 'bybit' => true }
```

**`getAggregatedBalance(): Promise<Map<string, { total: number; byExchange: Map<string, Balance> }>>`**

Получить объединенный баланс со всех бирж.

```typescript
const balance = await manager.getAggregatedBalance();
for (const [asset, data] of balance) {
  console.log(`${asset}: ${data.total}`);
  for (const [exchange, bal] of data.byExchange) {
    console.log(`  ${exchange}: ${bal.free}`);
  }
}
```

**`getTicker(exchange: string, symbol: string): Promise<Ticker>`**

Получить тикер с определенной биржи.

```typescript
const ticker = await manager.getTicker('binance', 'BTCUSDT');
```

**`getTickerFromMultiple(symbol: string, exchanges?: string[]): Promise<Map<string, Ticker>>`**

Получить тикер с нескольких бирж.

```typescript
const tickers = await manager.getTickerFromMultiple('BTCUSDT');
for (const [exchange, ticker] of tickers) {
  console.log(`${exchange}: $${ticker.lastPrice}`);
}
```

**`findBestBidPrice(symbol: string): Promise<{ exchange: string; price: number } | null>`**

Найти лучшую цену покупки среди всех бирж.

```typescript
const best = await manager.findBestBidPrice('BTCUSDT');
console.log(`Best bid on ${best.exchange}: $${best.price}`);
```

**`findBestAskPrice(symbol: string): Promise<{ exchange: string; price: number } | null>`**

Найти лучшую цену продажи среди всех бирж.

---

### Binance Exchange

#### Создание

```typescript
import { BinanceExchange } from './exchanges';

const binance = new BinanceExchange({
  apiKey: 'your_api_key',
  apiSecret: 'your_secret',
  testnet: false,
});
```

#### Особенности

- Поддержка Spot и Futures рынков
- WebSocket Streams для real-time данных
- Rate limit: 1200 запросов/минуту
- Orders limit: 10 ордеров/секунду

#### Spot vs Futures

```typescript
// Spot рынок
const spotCandles = await binance.getCandles('BTCUSDT', '1h', 100, {
  marketType: 'spot',
});

// Futures рынок
const futuresCandles = await binance.getCandles('BTCUSDT', '1h', 100, {
  marketType: 'futures',
});
```

---

### Bybit Exchange

#### Создание

```typescript
import { BybitExchange } from './exchanges';

const bybit = new BybitExchange({
  apiKey: 'your_api_key',
  apiSecret: 'your_secret',
  testnet: false,
});
```

#### Особенности

- Unified Trading Account API (V5)
- Поддержка Spot и Linear (USDT) Perpetual
- Rate limit: 600 запросов/минуту
- Orders limit: 10 ордеров/секунду

---

## 📊 Market Data

### Получить свечи (OHLCV)

```typescript
const candles = await exchange.getCandles('BTCUSDT', '1h', 100, {
  startTime: Date.now() - 24 * 60 * 60 * 1000, // 24 часа назад
  endTime: Date.now(),
  marketType: 'spot',
});

for (const candle of candles) {
  console.log(`Time: ${new Date(candle.timestamp)}`);
  console.log(`Open: ${candle.open}, High: ${candle.high}`);
  console.log(`Low: ${candle.low}, Close: ${candle.close}`);
  console.log(`Volume: ${candle.volume}`);
}
```

**Доступные интервалы:**
`1m`, `3m`, `5m`, `15m`, `30m`, `1h`, `2h`, `4h`, `6h`, `8h`, `12h`, `1d`, `3d`, `1w`, `1M`

### Получить стакан заявок (Order Book)

```typescript
const orderBook = await exchange.getOrderBook('BTCUSDT', 20);

console.log('Bids (покупатели):');
for (const bid of orderBook.bids) {
  console.log(`Price: ${bid.price}, Quantity: ${bid.quantity}`);
}

console.log('Asks (продавцы):');
for (const ask of orderBook.asks) {
  console.log(`Price: ${ask.price}, Quantity: ${ask.quantity}`);
}
```

### Получить недавние сделки

```typescript
const trades = await exchange.getTrades('BTCUSDT', { limit: 50 });

for (const trade of trades) {
  console.log(`${trade.side} ${trade.quantity} @ $${trade.price}`);
  console.log(`Time: ${new Date(trade.timestamp)}`);
}
```

### Получить тикер

```typescript
const ticker = await exchange.getTicker('BTCUSDT');

console.log(`Last Price: $${ticker.lastPrice}`);
console.log(`24h Change: ${ticker.priceChange24h}%`);
console.log(`24h High: $${ticker.high24h}`);
console.log(`24h Low: $${ticker.low24h}`);
console.log(`24h Volume: ${ticker.volume24h}`);
console.log(`Bid: $${ticker.bidPrice}, Ask: $${ticker.askPrice}`);
```

---

## 💼 Trading

### Создать Market ордер

```typescript
const order = await exchange.placeOrder({
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'MARKET',
  quantity: 0.001,
  marketType: 'spot',
});

console.log(`Order ID: ${order.id}`);
console.log(`Status: ${order.status}`);
console.log(`Executed: ${order.executedQuantity} of ${order.quantity}`);
```

### Создать Limit ордер

```typescript
const order = await exchange.placeOrder({
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'LIMIT',
  quantity: 0.001,
  price: 40000,
  timeInForce: 'GTC', // Good Till Cancel
  marketType: 'spot',
});
```

### Создать Stop Loss ордер

```typescript
const order = await exchange.placeOrder({
  symbol: 'BTCUSDT',
  side: 'SELL',
  type: 'STOP_LOSS',
  quantity: 0.001,
  stopPrice: 39000,
  marketType: 'spot',
});
```

### Отменить ордер

```typescript
await exchange.cancelOrder(orderId, 'BTCUSDT', 'spot');
```

### Получить информацию об ордере

```typescript
const order = await exchange.getOrder(orderId, 'BTCUSDT');
console.log(`Status: ${order.status}`);
console.log(`Price: ${order.price}`);
```

### Получить открытые ордера

```typescript
// Все открытые ордера
const allOrders = await exchange.getOpenOrders();

// Открытые ордера для конкретного символа
const btcOrders = await exchange.getOpenOrders('BTCUSDT');

for (const order of btcOrders) {
  console.log(`${order.side} ${order.quantity} @ ${order.price}`);
}
```

### Получить баланс

```typescript
const balance = await exchange.getBalance('spot');

for (const asset of balance) {
  if (asset.total > 0) {
    console.log(`${asset.asset}:`);
    console.log(`  Free: ${asset.free}`);
    console.log(`  Locked: ${asset.locked}`);
    console.log(`  Total: ${asset.total}`);
  }
}
```

---

## ⚡ WebSocket Streams

### Подписаться на трейды

```typescript
exchange.subscribeToTrades('BTCUSDT', (trade) => {
  console.log(`${trade.side} ${trade.quantity} @ $${trade.price}`);
  console.log(`Time: ${new Date(trade.timestamp)}`);
});
```

### Подписаться на тикер

```typescript
exchange.subscribeToTicker('BTCUSDT', (ticker) => {
  console.log(`Price: $${ticker.lastPrice}`);
  console.log(`Volume: ${ticker.volume}`);
});
```

### Подписаться на свечи

```typescript
exchange.subscribeToCandles('BTCUSDT', '1m', (update) => {
  const { candle, interval } = update;
  console.log(`[${interval}] O: ${candle.open}, H: ${candle.high}`);
  console.log(`L: ${candle.low}, C: ${candle.close}, V: ${candle.volume}`);
  console.log(`Closed: ${candle.isClosed}`);
});
```

### Подписаться на Order Book

```typescript
exchange.subscribeToOrderBook('BTCUSDT', (update) => {
  console.log('Order Book Update:');
  console.log(`Best Bid: ${update.bids[0]?.price}`);
  console.log(`Best Ask: ${update.asks[0]?.price}`);
});
```

### Отписаться от всех подписок

```typescript
exchange.unsubscribeAll();
```

---

## 🔒 Безопасность

### Шифрование API ключей

```typescript
import { generateMasterKey, encrypt, decrypt } from './exchanges';

// Сгенерировать мастер-ключ
const masterKey = generateMasterKey();
console.log('Master Key:', masterKey);
// Сохраните этот ключ в безопасном месте!

// Зашифровать ключи
const encryptedKey = encrypt('your_api_key', masterKey);
const encryptedSecret = encrypt('your_secret', masterKey);

// Сохранить зашифрованные ключи в .env
console.log('BINANCE_API_KEY=', encryptedKey);
console.log('BINANCE_SECRET=', encryptedSecret);
console.log('BINANCE_ENCRYPTED=true');
console.log('EXCHANGE_MASTER_KEY=', masterKey);
```

### Использование зашифрованных ключей

```typescript
const manager = new ExchangeManager({
  masterKey: process.env.EXCHANGE_MASTER_KEY,
  exchanges: {
    binance: {
      apiKey: process.env.BINANCE_API_KEY!, // Зашифрованный
      apiSecret: process.env.BINANCE_SECRET!, // Зашифрованный
      encrypted: true,
    },
  },
});
```

### IP Whitelist

Настройте IP whitelist в настройках API на бирже для дополнительной безопасности.

### Permissions (Разрешения)

Используйте минимальные необходимые разрешения:
- **Spot Trading**: для торговли на спотовом рынке
- **Futures Trading**: для торговли фьючерсами
- **Read**: только чтение данных (для тестирования)

⚠️ **Никогда не давайте разрешение "Withdraw" (Вывод средств)!**

---

## ⏱️ Rate Limiting

Модуль автоматически управляет rate limiting для каждой биржи.

### Получить информацию о лимитах

```typescript
const limits = exchange.getLimits();

console.log(`Requests per minute: ${limits.requestsPerMinute}`);
console.log(`Orders per second: ${limits.ordersPerSecond}`);
console.log(`Current requests: ${limits.currentRequests}`);
console.log(`Reset in: ${limits.resetTime}ms`);
```

### Лимиты бирж

| Биржа | Requests/min | Orders/sec |
|-------|--------------|------------|
| Binance | 1200 | 10 |
| Bybit | 600 | 10 |

При достижении лимита модуль автоматически ждет до сброса счетчика.

---

## 🐛 Error Handling

### Автоматические повторные попытки

Модуль автоматически повторяет запросы при ошибках:

```typescript
const exchange = new BinanceExchange({
  apiKey: 'key',
  apiSecret: 'secret',
  maxRetries: 3, // Количество попыток
  retryDelay: 1000, // Задержка между попытками (мс)
});
```

### Обработка ошибок

```typescript
try {
  const order = await exchange.placeOrder({
    symbol: 'BTCUSDT',
    side: 'BUY',
    type: 'MARKET',
    quantity: 0.001,
  });
} catch (error) {
  if (error.message.includes('Insufficient balance')) {
    console.error('Недостаточно средств');
  } else if (error.message.includes('rate limit')) {
    console.error('Превышен лимит запросов');
  } else {
    console.error('Ошибка:', error.message);
  }
}
```

---

## 📝 Примеры

### Арбитраж между биржами

```typescript
const manager = new ExchangeManager(config);

// Найти лучшую цену покупки
const bestBid = await manager.findBestBidPrice('BTCUSDT');
console.log(`Best bid: ${bestBid.exchange} at $${bestBid.price}`);

// Найти лучшую цену продажи
const bestAsk = await manager.findBestAskPrice('BTCUSDT');
console.log(`Best ask: ${bestAsk.exchange} at $${bestAsk.price}`);

// Рассчитать потенциальную прибыль
const spread = bestBid.price - bestAsk.price;
console.log(`Potential profit: $${spread}`);
```

### Мониторинг цены в реальном времени

```typescript
const exchanges = ['binance', 'bybit'];

for (const name of exchanges) {
  const exchange = manager.getExchange(name);

  exchange.subscribeToTicker('BTCUSDT', (ticker) => {
    console.log(`[${name}] BTC: $${ticker.lastPrice}`);
  });
}
```

### Копирование ордеров между биржами

```typescript
// Создать ордер на Binance
const binance = manager.getExchange('binance');
const order = await binance.placeOrder({
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'LIMIT',
  quantity: 0.001,
  price: 40000,
});

// Скопировать на Bybit
const bybit = manager.getExchange('bybit');
await bybit.placeOrder({
  symbol: 'BTCUSDT',
  side: order.side,
  type: order.type,
  quantity: order.quantity,
  price: order.price,
});
```

---

## 🔧 Troubleshooting

### Проблема: "Invalid API key"

- Проверьте что API ключи правильные
- Убедитесь что ключи не зашифрованы если `encrypted: false`
- Проверьте что IP адрес в whitelist

### Проблема: "Rate limit exceeded"

- Увеличьте `retryDelay` в конфигурации
- Уменьшите частоту запросов
- Используйте WebSocket вместо polling

### Проблема: "Insufficient balance"

- Проверьте баланс: `exchange.getBalance()`
- Убедитесь что используете правильный тип рынка (spot/futures)

### Проблема: WebSocket отключается

- Проверьте стабильность интернет-соединения
- Биржи закрывают соединение после 24 часов - переподключайтесь периодически
- Используйте ping/pong для поддержания соединения

---

## 📄 Лицензия

MIT

---

## 🤝 Вклад

При добавлении новой биржи:

1. Создайте класс, наследующий `BaseExchange`
2. Реализуйте все методы интерфейса `IExchange`
3. Добавьте конфигурацию в `config.ts`
4. Обновите `ExchangeManager.ts`
5. Добавьте тесты
6. Обновите документацию

---

**⚠️ Disclaimer**: Торговля криптовалютами связана с высокими рисками. Этот модуль предоставляется "как есть" без каких-либо гарантий.
