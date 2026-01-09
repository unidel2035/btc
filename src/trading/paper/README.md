# Paper Trading Module

Режим бумажной торговли для тестирования торговых стратегий на реальных рыночных данных без риска реальных денег.

## Возможности

- ✅ **Симуляция баланса** - виртуальный баланс с отслеживанием доступных и заблокированных средств
- ✅ **Виртуальные ордера** - market и limit ордера с реалистичным исполнением
- ✅ **Реальные рыночные данные** - использование актуальных цен с бирж
- ✅ **Учет комиссий** - maker/taker комиссии как на реальных биржах
- ✅ **Симуляция проскальзывания** - реалистичное проскальзывание цены при исполнении
- ✅ **Stop-Loss и Take-Profit** - автоматическое закрытие позиций
- ✅ **Статистика и метрики** - подробная аналитика торговли
- ✅ **События и уведомления** - event-driven архитектура

## Установка и настройка

### Переменные окружения

Добавьте в `.env`:

```env
# Режим торговли
TRADING_MODE=paper  # paper или live

# Настройки paper trading
PAPER_INITIAL_BALANCE=10000
PAPER_CURRENCY=USDT
PAPER_MAKER_FEE=0.1      # 0.1%
PAPER_TAKER_FEE=0.1      # 0.1%
PAPER_SLIPPAGE=0.05      # 0.05%
PAPER_ALLOW_SHORTS=true
PAPER_MAX_POSITIONS=5
PAPER_MARKET_DATA_SOURCE=binance
```

### CLI аргументы

Запуск с параметрами командной строки:

```bash
# Запуск в paper mode
npm run start -- --mode=paper

# С кастомным балансом
npm run start -- --mode=paper --balance=50000

# С настройкой проскальзывания
npm run start -- --mode=paper --balance=50000 --slippage=0.1

# С настройкой комиссий
npm run start -- --mode=paper --fees=0.05
```

## Использование

### Базовый пример

```typescript
import { PaperTradingEngine, OrderSide } from './trading/paper';

// Создание engine
const engine = new PaperTradingEngine({
  initialBalance: 10000,
  currency: 'USDT',
  fees: {
    maker: 0.1,
    taker: 0.1,
  },
  slippage: 0.05,
});

// Обновление рыночной цены
engine.updateMarketPrice('BTCUSDT', 45000);

// Размещение market ордера
const order = engine.placeMarketOrder('BTCUSDT', OrderSide.BUY, 0.1);

// Проверка баланса
const balance = engine.getBalance();
console.log(`Balance: ${balance.available} ${balance.currency}`);

// Проверка открытых позиций
const positions = engine.getPositions();
console.log(`Open positions: ${positions.length}`);

// Получение статистики
const stats = engine.getStats();
console.log(`Win Rate: ${stats.winRate.toFixed(2)}%`);
console.log(`Total P&L: ${stats.totalPnL.toFixed(2)} ${balance.currency}`);
```

### Limit ордера

```typescript
// Размещение limit ордера
const limitOrder = engine.placeLimitOrder('BTCUSDT', OrderSide.BUY, 0.1, 44000);

// Отмена ордера
engine.cancelOrder(limitOrder.id);
```

### Stop-Loss и Take-Profit

```typescript
// Открытие позиции
const order = engine.placeMarketOrder('BTCUSDT', OrderSide.BUY, 0.1);

// Получение позиции
const positions = engine.getPositions();
const position = positions[0];

// Установка stop-loss и take-profit
engine.setStopLoss(position.id, 44000); // -2%
engine.setTakeProfit(position.id, 46000); // +2%

// Проверка SL/TP при обновлении цены
engine.updateMarketPrice('BTCUSDT', 45500);
engine.checkStopLossTakeProfit();
```

### События

```typescript
// Подписка на события
engine.on((event) => {
  console.log(`Event: ${event.type} - ${event.action}`);
  console.log(event.data);
});
```

### Загрузка конфигурации

```typescript
import { loadPaperTradingConfig, parseCLIArgs, mergeConfigs, validateModeSwitch } from './trading/paper';

// Загрузка из переменных окружения
const envConfig = loadPaperTradingConfig();

// Парсинг CLI аргументов
const cliConfig = parseCLIArgs();

// Объединение конфигураций
const config = mergeConfigs(envConfig, cliConfig);

// Валидация и предупреждения
validateModeSwitch(config);

// Создание engine
const engine = new PaperTradingEngine(config);
```

## API Reference

### PaperTradingEngine

#### Конструктор

```typescript
new PaperTradingEngine(config?: Partial<PaperTradingConfig>)
```

#### Методы управления ценами

- `updateMarketPrice(symbol: string, price: number, bid?: number, ask?: number): void`

#### Методы управления ордерами

- `placeMarketOrder(symbol: string, side: OrderSide, quantity: number): PaperOrder | null`
- `placeLimitOrder(symbol: string, side: OrderSide, quantity: number, price: number): PaperOrder | null`
- `cancelOrder(orderId: string): boolean`

#### Методы управления позициями

- `setStopLoss(positionId: string, stopLoss: number): boolean`
- `setTakeProfit(positionId: string, takeProfit: number): boolean`
- `checkStopLossTakeProfit(): void`

#### Методы получения данных

- `getBalance(): PaperBalance`
- `getOrders(): PaperOrder[]`
- `getPositions(): PaperPosition[]`
- `getClosedTrades(): ClosedTrade[]`
- `getStats(): PaperTradingStats`
- `getConfig(): PaperTradingConfig`

#### Утилиты

- `on(listener: (event: PaperTradingEvent) => void): void`
- `reset(): void`

## Метрики

Engine автоматически отслеживает следующие метрики:

- **Win Rate** - процент прибыльных сделок
- **Total P&L** - общая прибыль/убыток
- **Profit Factor** - отношение прибыльных к убыточным сделкам
- **Max Drawdown** - максимальная просадка
- **Average Win/Loss** - средняя прибыль/убыток
- **Total Fees** - общие комиссии
- **Total Slippage** - общее проскальзывание

## Переключение режимов

### Paper → Live

При переходе с paper на live режим:

1. Система выдаст предупреждение
2. Требуется явное подтверждение через CLI или переменную окружения
3. Проверяются конфликты в конфигурации
4. Выводится summary всех настроек

```bash
# Явное переключение на live
npm run start -- --mode=live
```

### Проверки безопасности

- ❌ Нельзя переключиться на live без явного указания
- ❌ Конфликт: PAPER_TRADING=true и --mode=live
- ⚠️ Предупреждение при включении live режима
- ✅ Подтверждение конфигурации перед стартом

## Интеграция с стратегиями

Paper trading engine полностью совместим с существующими стратегиями:

```typescript
import { NewsMomentumStrategy } from './strategies';
import { PaperTradingEngine } from './paper';

const strategy = new NewsMomentumStrategy();
const engine = new PaperTradingEngine({ initialBalance: 10000 });

// Обработка торговых сигналов
const decision = strategy.analyze(marketData, signals);
if (decision) {
  const order = engine.placeMarketOrder(
    decision.symbol,
    decision.direction === 'long' ? OrderSide.BUY : OrderSide.SELL,
    decision.positionSize / 100,
  );
}
```

## Примеры

См. [examples/paper-trading-example.ts](../../../examples/paper-trading-example.ts) для полных примеров использования.

## Тестирование

```bash
# Запуск тестов paper trading
npm run test:paper

# Запуск примера
npm run example:paper
```

## Roadmap

- [ ] Интеграция с real-time market data feeds
- [ ] Поддержка маржинальной торговли
- [ ] OCO (One-Cancels-Other) ордера
- [ ] Trailing stop-loss
- [ ] Экспорт статистики в CSV/JSON
- [ ] Визуализация equity curve
- [ ] Сравнение с live режимом

## Лицензия

MIT
