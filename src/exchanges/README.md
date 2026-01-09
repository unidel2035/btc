# Exchange API Integration

Модуль интеграции с криптовалютными биржами для получения рыночных данных и торговли.

## Поддерживаемые биржи

- ✅ **Binance** (Spot + Futures) - полная реализация
- ✅ **Bybit** (Spot + Futures) - полная реализация
- 🚧 **OKX** - базовая заглушка (требует доработки)

## Возможности

### Market Data

- ✅ Получение свечей (OHLCV)
- ✅ Order book (глубина рынка)
- ✅ Recent trades (последние сделки)
- ✅ Ticker (текущая цена и статистика)
- ✅ Все тикеры
- ✅ Информация о бирже и доступных символах

### Trading

- ✅ Market orders (рыночные ордера)
- ✅ Limit orders (лимитные ордера)
- ✅ Stop orders (стоп ордера)
- ✅ Отмена ордеров (одного или всех)
- ✅ Получение информации об ордере
- ✅ Открытые ордера
- ✅ История ордеров
- ✅ Получение баланса

### Futures (только для Futures рынка)

- ✅ Получение позиций
- ✅ Установка кредитного плеча
- ✅ Установка типа маржи (isolated/cross)

### Безопасность

- ✅ Шифрование API ключей (AES-256-GCM)
- ✅ Rate limiting (контроль частоты запросов)
- ✅ Маскирование ключей в логах
- ✅ HMAC подпись запросов
- ✅ Логирование всех операций

### WebSocket Streams

- 🚧 Trades stream
- 🚧 Ticker stream
- 🚧 Order book stream
- 🚧 Candles stream

> **Примечание:** WebSocket функциональность пока в разработке

## Использование

### Быстрый старт

```typescript
import { BinanceExchange, MarketType, CandleInterval } from './exchanges';

// Создание экземпляра биржи
const exchange = new BinanceExchange({
  marketType: MarketType.SPOT,
  testnet: true, // Использовать testnet
  apiKey: process.env.BINANCE_API_KEY,
  apiSecret: process.env.BINANCE_SECRET,
});

// Инициализация
await exchange.initialize();

// Получение свечей
const candles = await exchange.getCandles('BTCUSDT', CandleInterval.ONE_HOUR, 100);

// Получение текущей цены
const ticker = await exchange.getTicker('BTCUSDT');
console.log(`BTC/USDT: $${ticker.lastPrice}`);

// Отключение
await exchange.disconnect();
```

### Market Data

```typescript
// Получить свечи (OHLCV)
const candles = await exchange.getCandles(
  'BTCUSDT',
  CandleInterval.ONE_HOUR,
  100, // количество
  startTime, // опционально
  endTime, // опционально
);

// Получить order book
const orderBook = await exchange.getOrderBook('BTCUSDT', 20); // глубина 20
console.log('Best bid:', orderBook.bids[0].price);
console.log('Best ask:', orderBook.asks[0].price);

// Получить последние сделки
const trades = await exchange.getTrades('BTCUSDT', 100);

// Получить тикер
const ticker = await exchange.getTicker('BTCUSDT');
console.log('24h change:', ticker.priceChangePercent24h + '%');

// Получить все тикеры
const allTickers = await exchange.getAllTickers();
```

### Trading

```typescript
import { OrderSide, OrderType, TimeInForce } from './exchanges';

// Market order (покупка)
const marketOrder = await exchange.placeOrder({
  symbol: 'BTCUSDT',
  side: OrderSide.BUY,
  type: OrderType.MARKET,
  quantity: 0.001,
});

// Limit order (продажа)
const limitOrder = await exchange.placeOrder({
  symbol: 'BTCUSDT',
  side: OrderSide.SELL,
  type: OrderType.LIMIT,
  quantity: 0.001,
  price: 50000,
  timeInForce: TimeInForce.GTC,
});

// Stop-loss order
const stopLoss = await exchange.placeOrder({
  symbol: 'BTCUSDT',
  side: OrderSide.SELL,
  type: OrderType.STOP_LOSS,
  quantity: 0.001,
  stopPrice: 48000,
});

// Отменить ордер
await exchange.cancelOrder('BTCUSDT', orderId);

// Отменить все ордера
await exchange.cancelAllOrders('BTCUSDT');

// Получить информацию об ордере
const order = await exchange.getOrder('BTCUSDT', orderId);

// Получить открытые ордера
const openOrders = await exchange.getOpenOrders('BTCUSDT');

// Получить баланс
const balances = await exchange.getBalance();
const btcBalance = await exchange.getBalanceForAsset('BTC');
```

### Binance Futures

```typescript
const futures = new BinanceExchange({
  marketType: MarketType.FUTURES,
  testnet: true,
  apiKey: process.env.BINANCE_API_KEY,
  apiSecret: process.env.BINANCE_SECRET,
});

await futures.initialize();

// Установить кредитное плечо
await futures.setLeverage('BTCUSDT', 10);

// Установить тип маржи
await futures.setMarginType('BTCUSDT', 'isolated');

// Получить позиции
const positions = await futures.getPositions('BTCUSDT');
positions.forEach((pos) => {
  console.log(`${pos.symbol} ${pos.side}: ${pos.quantity}`);
  console.log(`Entry: $${pos.entryPrice}, Mark: $${pos.markPrice}`);
  console.log(`Unrealized P&L: $${pos.unrealizedPnl}`);
});
```

### Exchange Manager

Управление несколькими биржами одновременно:

```typescript
import { ExchangeManager, MarketType } from './exchanges';

const manager = new ExchangeManager({
  exchanges: {
    binance: {
      marketType: MarketType.SPOT,
      testnet: true,
      apiKey: process.env.BINANCE_API_KEY,
      apiSecret: process.env.BINANCE_SECRET,
    },
    bybit: {
      marketType: MarketType.SPOT,
      testnet: true,
      apiKey: process.env.BYBIT_API_KEY,
      apiSecret: process.env.BYBIT_SECRET,
    },
  },
  defaultExchange: 'binance',
});

await manager.initialize();

// Получить конкретную биржу
const binance = manager.getExchange('binance', MarketType.SPOT);
const ticker = await binance.getTicker('BTCUSDT');

// Получить биржу по умолчанию
const defaultExchange = manager.getDefaultExchange();

// Сравнить цены на разных биржах
const prices = await manager.comparePrice('BTCUSDT');
prices.forEach((price) => {
  console.log(`${price.exchange}: $${price.lastPrice}`);
});

// Найти лучшую цену для покупки
const bestBuy = await manager.findBestPrice('BTCUSDT', 'buy');
console.log(`Buy on ${bestBuy.exchange} at $${bestBuy.price}`);

// Найти лучшую цену для продажи
const bestSell = await manager.findBestPrice('BTCUSDT', 'sell');
console.log(`Sell on ${bestSell.exchange} at $${bestSell.price}`);

// Получить балансы со всех бирж
const allBalances = await manager.getAllBalances();

await manager.disconnect();
```

## Безопасность

### Шифрование API ключей

```typescript
import { encrypt, decrypt } from './exchanges';

// Зашифровать API ключ
const encrypted = encrypt('your_api_key_here');

// Расшифровать
const decrypted = decrypt(encrypted);

// Использовать зашифрованный ключ
const exchange = new BinanceExchange({
  marketType: MarketType.SPOT,
  apiKey: encrypted, // Автоматически расшифруется
  apiSecret: encryptedSecret,
});
```

Установите `ENCRYPTION_KEY` в `.env` файле:

```env
ENCRYPTION_KEY=your_secure_encryption_key_here
```

### Rate Limiting

Rate limiting автоматически включен и настроен для каждой биржи:

- **Binance**: 1200 запросов/минуту
- **Bybit**: 1200 запросов/минуту
- **OKX**: 1200 запросов/минуту

```typescript
// Отключить rate limiting (не рекомендуется)
const exchange = new BinanceExchange({
  marketType: MarketType.SPOT,
  enableRateLimit: false,
});

// Настроить лимит
const exchange = new BinanceExchange({
  marketType: MarketType.SPOT,
  rateLimit: 600, // 600 запросов/минуту
});

// Получить статистику
const stats = exchange.getRateLimiterStats();
console.log(`Remaining requests: ${stats.remainingRequests}`);
```

## Конфигурация

### Переменные окружения

```env
# Binance
BINANCE_API_KEY=your_api_key
BINANCE_SECRET=your_secret_key
BINANCE_TESTNET=true

# Bybit
BYBIT_API_KEY=your_api_key
BYBIT_SECRET=your_secret_key
BYBIT_TESTNET=true

# OKX
OKX_API_KEY=your_api_key
OKX_SECRET=your_secret_key
OKX_PASSPHRASE=your_passphrase
OKX_TESTNET=false

# Безопасность
ENCRYPTION_KEY=your_encryption_key
```

### TypeScript конфигурация

```typescript
interface ExchangeConfig {
  apiKey?: string;
  apiSecret?: string;
  passphrase?: string; // Для OKX
  testnet?: boolean; // По умолчанию false
  timeout?: number; // Таймаут запросов в мс (по умолчанию 10000)
  recvWindow?: number; // Для Binance (по умолчанию 5000)
  enableRateLimit?: boolean; // По умолчанию true
  rateLimit?: number; // Запросов в минуту (по умолчанию 1200)
}
```

## Тестирование

```bash
# Запустить все тесты
npm run test:exchanges

# Примеры использования
npm run example:exchanges
```

## Обработка ошибок

```typescript
import { ExchangeError, AuthenticationError, RateLimitError } from './exchanges';

try {
  const ticker = await exchange.getTicker('BTCUSDT');
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API keys');
  } else if (error instanceof RateLimitError) {
    console.error('Rate limit exceeded');
  } else if (error instanceof ExchangeError) {
    console.error('Exchange error:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Типы ошибок

- `ExchangeError` - базовая ошибка биржи
- `AuthenticationError` - ошибка аутентификации (неверные API ключи)
- `RateLimitError` - превышен лимит запросов
- `InsufficientBalanceError` - недостаточно средств
- `InvalidSymbolError` - неверный торговый символ

## Примеры

См. файл `examples/exchanges-example.ts` для подробных примеров использования.

## Архитектура

```
src/exchanges/
├── types.ts                    # Интерфейсы и типы
├── BaseExchange.ts             # Базовый класс
├── ExchangeManager.ts          # Менеджер бирж
├── index.ts                    # Экспорты
├── binance/
│   └── BinanceExchange.ts      # Binance реализация
├── bybit/
│   └── BybitExchange.ts        # Bybit реализация
├── okx/
│   └── OKXExchange.ts          # OKX реализация (заглушка)
└── utils/
    ├── RateLimiter.ts          # Rate limiting
    └── security.ts             # Шифрование и безопасность
```

## Roadmap

- [x] Базовая архитектура и типы
- [x] Binance Spot реализация
- [x] Binance Futures реализация
- [x] Bybit Spot реализация
- [x] Bybit Futures реализация
- [x] Rate limiting
- [x] Шифрование API ключей
- [x] Exchange Manager
- [x] Тесты и примеры
- [ ] OKX полная реализация
- [ ] WebSocket streams
- [ ] Coinbase Pro интеграция
- [ ] Управление IP whitelist
- [ ] Автоматический reconnect
- [ ] Кеширование данных

## Лицензия

MIT

## Поддержка

При возникновении вопросов или проблем создайте issue в репозитории проекта.
