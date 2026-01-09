# Risk Management Module

Полнофункциональная система управления рисками для защиты капитала в торговом роботе.

## Содержание

- [Обзор](#обзор)
- [Компоненты](#компоненты)
- [Быстрый старт](#быстрый-старт)
- [API Документация](#api-документация)
- [Примеры использования](#примеры-использования)
- [Конфигурация](#конфигурация)
- [Лучшие практики](#лучшие-практики)

## Обзор

Модуль риск-менеджмента предоставляет комплексные инструменты для управления рисками торгового робота:

- **Position Sizing** — расчет оптимального размера позиции
- **Stop-Loss / Take-Profit** — автоматическое управление выходами
- **Risk Limits** — жесткие лимиты для защиты капитала
- **Correlation Analysis** — анализ корреляции активов для диверсификации
- **Event Logging** — полное логирование всех риск-событий
- **Notifications** — уведомления о критических событиях

## Компоненты

### 1. Position Sizing

Расчет размера позиции на основе различных методов:

#### Fixed (Фиксированный)
```typescript
const size = (balance * riskPerTrade) / stopLossPercent
```
Простой метод с фиксированным процентом риска.

#### Percentage (Процент от баланса)
```typescript
const size = (balance * riskPerTrade) / stopLossPercent
```
Адаптируется к изменению баланса.

#### Kelly Criterion
```typescript
const kellyPercent = (p * b - q) / b
const size = balance * (kellyPercent * 0.5) // Fractional Kelly
```
Оптимальный размер на основе вероятности выигрыша и матожидания.
- `p` = вероятность выигрыша
- `q` = вероятность проигрыша (1 - p)
- `b` = отношение среднего выигрыша к среднему проигрышу

#### Volatility-Adjusted (С учетом волатильности)
```typescript
const volatilityRatio = baseVolatility / currentVolatility
const size = baseSize * volatilityRatio // Корректируется на волатильность
```
Увеличивает размер при низкой волатильности, уменьшает при высокой.

### 2. Stop-Loss Management

#### Fixed Stop-Loss
Фиксированный процент от цены входа:
```typescript
stopLoss = entryPrice * (1 - percent / 100)
```

#### ATR-based Stop-Loss
На основе Average True Range:
```typescript
stopLoss = entryPrice - (ATR * multiplier)
```

#### Trailing Stop
Динамический стоп-лосс, следующий за ценой:
```typescript
// Для LONG позиции
stopLoss = highestPrice * (1 - trailingDistance / 100)
```
Активируется при достижении определенного уровня профита.

### 3. Take-Profit Management

Поддержка множественных уровней тейк-профита:

```typescript
const levels = [
  { percent: 3, closePercent: 50 },  // Закрыть 50% при +3%
  { percent: 5, closePercent: 30 },  // Закрыть 30% при +5%
  { percent: 10, closePercent: 20 }, // Закрыть 20% при +10%
]
```

### 4. Risk Limits

#### Лимит размера позиции
```typescript
maxPositionSize: 10 // Максимум 10% от баланса на одну позицию
```

#### Лимит количества позиций
```typescript
maxPositions: 5 // Максимум 5 одновременных позиций
```

#### Дневной лимит убытков
```typescript
maxDailyLoss: 5 // Максимум 5% убытков за день
```
Автоматический сброс в 00:00 UTC.

#### Общий лимит просадки
```typescript
maxTotalDrawdown: 20 // Максимум 20% от пикового баланса
```

#### Лимит на актив
```typescript
maxAssetExposure: 15 // Максимум 15% на один актив
```

### 5. Correlation Analysis

Анализ корреляции между активами для управления диверсификацией:

```typescript
// Коэффициент корреляции Пирсона
correlation = cov(X, Y) / (σX * σY)
```

- Корреляция > 0.7: сильная положительная
- Корреляция < -0.7: сильная отрицательная
- -0.3 < корреляция < 0.3: слабая

### 6. Event Logging

Все события риска логируются с детальной информацией:

- `position_opened` — открытие позиции
- `position_closed` — закрытие позиции
- `stop_loss_triggered` — срабатывание стоп-лосса
- `take_profit_triggered` — срабатывание тейк-профита
- `trailing_stop_activated` — активация трейлинг стопа
- `limit_warning` — предупреждение о приближении к лимиту
- `limit_reached` — достижение лимита

### 7. Notifications

Уведомления через различные каналы:

- **Console** — вывод в консоль
- **Telegram** — отправка в Telegram бота
- **Email** — email уведомления (TODO)
- **Webhook** — HTTP webhook

## Быстрый старт

### Установка

```bash
npm install
```

### Базовое использование

```typescript
import { RiskManager, PositionSizingMethod, PositionSide, StopLossType } from './src/trading/risk/index.js';

// 1. Создание конфигурации
const riskConfig = {
  maxPositionSize: 10,
  maxPositions: 5,
  maxDailyLoss: 5,
  maxTotalDrawdown: 20,
  defaultStopLoss: 2,
  defaultTakeProfit: 5,
  trailingStop: true,
  trailingStopActivation: 3,
  trailingStopDistance: 1.5,
  maxAssetExposure: 15,
  maxCorrelatedPositions: 2,
  correlationThreshold: 0.7,
};

// 2. Инициализация Risk Manager
const riskManager = new RiskManager(riskConfig, 10000);

// 3. Открытие позиции
const result = await riskManager.openPosition({
  symbol: 'BTC/USDT',
  side: PositionSide.LONG,
  sizingParams: {
    method: PositionSizingMethod.PERCENTAGE,
    balance: 10000,
    riskPerTrade: 2,
    stopLossPercent: 2,
    entryPrice: 50000,
  },
  stopLossParams: {
    type: StopLossType.FIXED,
    entryPrice: 50000,
    percent: 2,
  },
});

// 4. Обновление позиции
await riskManager.updatePosition(result.position.id, {
  currentPrice: 51000,
});

// 5. Получение статистики
const stats = riskManager.getStats();
console.log(stats);
```

## API Документация

### RiskManager

Главный класс для управления рисками.

#### constructor(config, initialBalance, notificationConfig?)

```typescript
const riskManager = new RiskManager(
  riskConfig,      // RiskConfig
  10000,           // Initial balance
  {                // NotificationConfig (optional)
    enabled: true,
    channels: ['console', 'telegram'],
    warningThreshold: 80,
  }
);
```

#### openPosition(params)

Открывает новую позицию с полной валидацией рисков.

```typescript
const result = await riskManager.openPosition({
  symbol: 'BTC/USDT',
  side: PositionSide.LONG,
  sizingParams: {...},
  stopLossParams: {...},
  takeProfitParams: {...}, // Optional
});

// Returns: { success: boolean, position?: Position, error?: string }
```

#### updatePosition(positionId, params)

Обновляет позицию и проверяет срабатывание SL/TP.

```typescript
const result = await riskManager.updatePosition(positionId, {
  currentPrice: 51000,
  timestamp: new Date(), // Optional
});

// Returns: { position?: Position, actions: Array<{type, message}> }
```

#### closePosition(positionId, closePrice, reason?)

Закрывает позицию.

```typescript
const result = await riskManager.closePosition(
  positionId,
  51000,
  'manual_close'
);

// Returns: { success: boolean, position?: Position, pnl?: number }
```

#### addMarketData(symbol, ohlcvData)

Добавляет исторические данные для корреляционного анализа.

```typescript
riskManager.addMarketData('BTC/USDT', [
  {
    timestamp: new Date(),
    open: 50000,
    high: 51000,
    low: 49000,
    close: 50500,
    volume: 1000000,
  },
  // ... more candles
]);
```

#### getStats()

Возвращает статистику рисков.

```typescript
const stats = riskManager.getStats();
// Returns: RiskStats
```

#### checkWarnings()

Проверяет предупреждения о приближении к лимитам.

```typescript
await riskManager.checkWarnings();
```

### Position

Интерфейс позиции:

```typescript
interface Position {
  id: string;
  symbol: string;
  side: PositionSide; // 'long' | 'short'
  status: PositionStatus; // 'open' | 'closed' | 'partially_closed'

  entryPrice: number;
  currentPrice: number;
  size: number;
  quantity: number;
  remainingQuantity: number;

  stopLoss: number;
  takeProfit: number[];

  unrealizedPnL: number;
  realizedPnL: number;

  openedAt: Date;
  closedAt?: Date;
}
```

### RiskConfig

Конфигурация риск-менеджмента:

```typescript
interface RiskConfig {
  maxPositionSize: number;      // % от баланса
  maxPositions: number;          // Количество позиций
  maxDailyLoss: number;          // % дневного лимита
  maxTotalDrawdown: number;      // % общей просадки
  defaultStopLoss: number;       // % стоп-лосса
  defaultTakeProfit: number;     // % тейк-профита
  trailingStop: boolean;         // Использовать трейлинг
  trailingStopActivation: number; // % для активации
  trailingStopDistance: number;  // % дистанция
  maxAssetExposure: number;      // % на актив
  maxCorrelatedPositions: number; // Количество
  correlationThreshold: number;  // Порог (0-1)
}
```

## Примеры использования

### Пример 1: Базовая торговая позиция

```typescript
const result = await riskManager.openPosition({
  symbol: 'BTC/USDT',
  side: PositionSide.LONG,
  sizingParams: {
    method: PositionSizingMethod.PERCENTAGE,
    balance: 10000,
    riskPerTrade: 2, // Риск 2% от баланса
    stopLossPercent: 2,
    entryPrice: 50000,
  },
  stopLossParams: {
    type: StopLossType.FIXED,
    entryPrice: 50000,
    percent: 2, // SL на 2% ниже входа
  },
});
```

### Пример 2: Kelly Criterion с множественными TP

```typescript
const result = await riskManager.openPosition({
  symbol: 'ETH/USDT',
  side: PositionSide.LONG,
  sizingParams: {
    method: PositionSizingMethod.KELLY,
    balance: 10000,
    riskPerTrade: 2,
    stopLossPercent: 2,
    entryPrice: 3000,
    winRate: 0.6,      // 60% винрейт
    avgWinLoss: 2.0,   // Соотношение 2:1
  },
  stopLossParams: {
    type: StopLossType.FIXED,
    entryPrice: 3000,
    percent: 2,
  },
  takeProfitParams: {
    entryPrice: 3000,
    levels: [
      { percent: 3, closePercent: 50 },  // 50% при +3%
      { percent: 5, closePercent: 30 },  // 30% при +5%
      { percent: 10, closePercent: 20 }, // 20% при +10%
    ],
  },
});
```

### Пример 3: ATR-based Stop Loss с Trailing

```typescript
const result = await riskManager.openPosition({
  symbol: 'SOL/USDT',
  side: PositionSide.LONG,
  sizingParams: {
    method: PositionSizingMethod.VOLATILITY_ADJUSTED,
    balance: 10000,
    riskPerTrade: 2,
    stopLossPercent: 3,
    entryPrice: 100,
    volatility: 5,      // Текущий ATR
    baseVolatility: 3,  // Базовый ATR
  },
  stopLossParams: {
    type: StopLossType.ATR_BASED,
    entryPrice: 100,
    atr: 5,
    atrMultiplier: 2, // SL = entry - (2 * ATR)
  },
});

// Активация трейлинг стопа при профите +3%
// Дистанция трейлинг стопа: 1.5% от пика
```

### Пример 4: Мониторинг корреляции

```typescript
// Добавляем исторические данные
riskManager.addMarketData('BTC/USDT', btcData);
riskManager.addMarketData('ETH/USDT', ethData);
riskManager.addMarketData('SOL/USDT', solData);

// Получаем статистику с корреляциями
const stats = riskManager.getStats();

// Проверяем коррелированные пары
for (const pair of stats.correlatedPairs) {
  console.log(`${pair.pair1} <-> ${pair.pair2}: ${pair.correlation.toFixed(2)}`);
}
```

## Конфигурация

### Рекомендуемые настройки

#### Консервативная стратегия
```typescript
const conservativeConfig = {
  maxPositionSize: 5,   // 5% на позицию
  maxPositions: 3,      // Максимум 3 позиции
  maxDailyLoss: 3,      // 3% дневной лимит
  maxTotalDrawdown: 15, // 15% максимальная просадка
  defaultStopLoss: 1.5, // Узкий стоп
  defaultTakeProfit: 3,
  trailingStop: true,
  trailingStopActivation: 2,
  trailingStopDistance: 1,
  maxAssetExposure: 10,
  maxCorrelatedPositions: 1,
  correlationThreshold: 0.6,
};
```

#### Агрессивная стратегия
```typescript
const aggressiveConfig = {
  maxPositionSize: 15,  // 15% на позицию
  maxPositions: 8,      // Больше позиций
  maxDailyLoss: 10,     // 10% дневной лимит
  maxTotalDrawdown: 30, // 30% максимальная просадка
  defaultStopLoss: 3,   // Широкий стоп
  defaultTakeProfit: 8,
  trailingStop: true,
  trailingStopActivation: 5,
  trailingStopDistance: 2.5,
  maxAssetExposure: 25,
  maxCorrelatedPositions: 3,
  correlationThreshold: 0.8,
};
```

### Переменные окружения

```env
# Telegram уведомления
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Webhook уведомления
RISK_WEBHOOK_URL=https://your-webhook.com/risk-events
```

## Лучшие практики

### 1. Всегда используйте Stop-Loss

```typescript
// ❌ ПЛОХО: Без стоп-лосса
const badPosition = await riskManager.openPosition({...});

// ✅ ХОРОШО: Со стоп-лоссом
const goodPosition = await riskManager.openPosition({
  ...,
  stopLossParams: {
    type: StopLossType.ATR_BASED,
    entryPrice: 50000,
    atr: 1000,
    atrMultiplier: 2,
  },
});
```

### 2. Используйте множественные Take-Profit уровни

```typescript
takeProfitParams: {
  entryPrice: 50000,
  levels: [
    { percent: 2, closePercent: 33 },  // Первый TP близко
    { percent: 5, closePercent: 33 },  // Второй TP средне
    { percent: 10, closePercent: 34 }, // Третий TP далеко
  ],
}
```

### 3. Регулярно проверяйте предупреждения

```typescript
// Проверка каждые 5 минут
setInterval(async () => {
  await riskManager.checkWarnings();
}, 5 * 60 * 1000);
```

### 4. Обновляйте позиции при изменении цены

```typescript
// При получении новой цены
websocket.on('price_update', async (symbol, price) => {
  const positions = riskManager.getOpenPositions()
    .filter(pos => pos.symbol === symbol);

  for (const position of positions) {
    await riskManager.updatePosition(position.id, {
      currentPrice: price,
    });
  }
});
```

### 5. Диверсифицируйте портфель

```typescript
// Используйте корреляционный анализ
const stats = riskManager.getStats();

if (stats.correlatedPairs.length > config.maxCorrelatedPositions) {
  console.warn('⚠️  Portfolio has too many correlated positions');
}
```

### 6. Логируйте все события

```typescript
// Получение событий для анализа
const events = riskManager.getEvents(100);

// Экспорт в файл
import { writeFileSync } from 'fs';
writeFileSync('risk-events.json', JSON.stringify(events, null, 2));
```

## Тестирование

```bash
# Запуск unit тестов
npm run test:risk

# Запуск примера
npm run example:risk
```

## Производительность

- **Position Sizing**: < 1ms
- **Stop Loss Calculation**: < 1ms
- **Correlation Analysis**: 10-50ms (зависит от количества активов)
- **Risk Limits Check**: < 1ms
- **Position Update**: 1-5ms

## Troubleshooting

### Проблема: Позиция отклоняется

```
Error: Maximum number of positions reached
```

**Решение**: Проверьте `maxPositions` в конфигурации или закройте существующие позиции.

### Проблема: Kelly Criterion ошибка

```
Error: Kelly Criterion requires winRate and avgWinLoss parameters
```

**Решение**: Убедитесь, что передаете `winRate` и `avgWinLoss` в `sizingParams`.

### Проблема: Корреляция не рассчитывается

```
Warning: Price data not available
```

**Решение**: Добавьте исторические данные через `addMarketData()` перед открытием позиций.

## Лицензия

MIT

## Контакты

- GitHub Issues: [https://github.com/unidel2035/btc/issues](https://github.com/unidel2035/btc/issues)
