# Торговые стратегии (Trading Strategies)

Модуль торговых стратегий для автоматической торговли на основе новостных и социальных сигналов.

## Обзор

Модуль предоставляет гибкую систему для создания и комбинирования торговых стратегий:

- **Базовые интерфейсы** - общие типы и абстрактные классы
- **Готовые стратегии** - News Momentum и Sentiment Swing
- **Strategy Manager** - комбинирование нескольких стратегий
- **Конфигурируемые параметры** - для каждой стратегии

## Установка

```bash
npm install
```

## Быстрый старт

```typescript
import {
  NewsMomentumStrategy,
  StrategyManager,
  CombinationMode,
} from './src/trading/strategies/index.js';

// Создание стратегии
const strategy = new NewsMomentumStrategy({
  impactThreshold: 0.7,
  reactionTimeSeconds: 60,
});

// Анализ рынка
const decision = strategy.analyze(marketData, signals);

if (decision) {
  console.log(`Direction: ${decision.direction}`);
  console.log(`Confidence: ${decision.confidence}`);
  console.log(`Position Size: ${decision.positionSize}%`);
}
```

## Доступные стратегии

### 1. Price Channel Breakout

**Описание**: Техническая стратегия торговли на пробое ценовых каналов.

**Особенности**:
- Определяет ценовые каналы на основе исторических максимумов и минимумов
- Генерирует сигналы при пробое верхней или нижней границы канала
- Использует ширину канала для динамического расчета stop-loss и take-profit
- Может работать с несколькими таймфреймами одновременно (18, 54, 108 периодов)
- Опциональное требование подтверждения сигналом

**Параметры**:

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `enabled` | boolean | true | Включить/выключить стратегию |
| `minImpact` | number | 0.3 | Минимальный impact сигнала (0-1) |
| `minConfidence` | number | 0.6 | Минимальная уверенность для входа |
| `maxPositionSize` | number | 6 | Максимальный размер позиции (%) |
| `channelPeriod` | number | 18 | Период для расчета канала |
| `minChannelPercent` | number | 0.5 | Минимальная ширина канала в % |
| `maxChannelPercent` | number | 3 | Максимальная ширина канала в % |
| `breakoutThreshold` | number | 0.1 | Порог для определения пробоя (%) |
| `requireSignalConfirmation` | boolean | false | Требовать подтверждения сигналом |
| `useMultipleTimeframes` | boolean | false | Использовать несколько таймфреймов |

**Пример использования**:

```typescript
const channelStrategy = new PriceChannelStrategy({
  channelPeriod: 18,
  minChannelPercent: 0.5,
  maxChannelPercent: 3,
  requireSignalConfirmation: true,
  useMultipleTimeframes: true,
});

// Накопление истории цен
for (const historicalData of priceHistory) {
  channelStrategy.analyze(historicalData, []);
}

// Анализ текущей цены
const decision = channelStrategy.analyze(currentMarketData, signals);

// Получение текущего канала
const channel = channelStrategy.getCurrentChannel();
console.log(`Channel: [${channel.low}, ${channel.high}], width: ${channel.widthPercent}%`);
```

### 2. News Momentum

**Описание**: Быстрая реакция на важные новости с высоким impact.

**Особенности**:
- Открывает позицию в течение секунд после значимой новости
- Короткий timeframe (обычно 1 час)
- Высокие требования к impact новости
- Учет волатильности для размера позиции

**Параметры**:

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `enabled` | boolean | true | Включить/выключить стратегию |
| `minImpact` | number | 0.7 | Минимальный impact сигнала (0-1) |
| `minConfidence` | number | 0.65 | Минимальная уверенность для входа |
| `maxPositionSize` | number | 5 | Максимальный размер позиции (%) |
| `stopLossPercent` | number | 2 | Стоп-лосс в процентах |
| `takeProfitPercent` | number | 4 | Тейк-профит в процентах |
| `impactThreshold` | number | 0.7 | Порог для реакции на новость |
| `reactionTimeSeconds` | number | 60 | Время на вход после новости |
| `exitTimeSeconds` | number | 3600 | Время удержания позиции |
| `volatilityMultiplier` | number | 0.8 | Множитель волатильности |
| `requireMultipleSignals` | boolean | false | Требовать несколько сигналов |
| `minSignalsCount` | number | 2 | Минимум сигналов для входа |

**Пример использования**:

```typescript
const newsStrategy = new NewsMomentumStrategy({
  impactThreshold: 0.75,
  reactionTimeSeconds: 90,
  requireMultipleSignals: true,
  minSignalsCount: 2,
});

const decision = newsStrategy.analyze(marketData, newsSignals);
```

### 3. Sentiment Swing

**Описание**: Позиционная торговля на основе агрегированных настроений за период.

**Особенности**:
- Более длинный горизонт (часы-дни)
- Агрегация sentiment за период
- Детекция трендов и разворотов
- Больший размер позиции

**Параметры**:

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `enabled` | boolean | true | Включить/выключить стратегию |
| `minImpact` | number | 0.5 | Минимальный impact сигнала |
| `minConfidence` | number | 0.6 | Минимальная уверенность для входа |
| `maxPositionSize` | number | 8 | Максимальный размер позиции (%) |
| `stopLossPercent` | number | 3 | Стоп-лосс в процентах |
| `takeProfitPercent` | number | 8 | Тейк-профит в процентах |
| `aggregationPeriodHours` | number | 4 | Период агрегации (1h, 4h, 24h) |
| `trendThreshold` | number | 0.6 | Порог для определения тренда |
| `reversalDetection` | boolean | true | Детекция разворотов |
| `continuationDetection` | boolean | true | Детекция продолжений |
| `minSentimentChange` | number | 0.3 | Минимальное изменение sentiment |
| `holdingPeriodHours` | number | 24 | Период удержания позиции |

**Пример использования**:

```typescript
const sentimentStrategy = new SentimentSwingStrategy({
  aggregationPeriodHours: 4,
  reversalDetection: true,
  holdingPeriodHours: 48,
});

// Требуется минимум 2 анализа для построения тренда
sentimentStrategy.analyze(marketData, signals);
const decision = sentimentStrategy.analyze(marketData, newSignals);
```

## Strategy Manager

Менеджер стратегий позволяет комбинировать несколько стратегий и принимать решения на основе их совместного анализа.

### Режимы комбинирования

1. **FIRST** - использует решение первой сработавшей стратегии
2. **CONSENSUS** - требует согласия большинства стратегий
3. **BEST_CONFIDENCE** - выбирает решение с наивысшей уверенностью
4. **WEIGHTED** - взвешенное комбинирование на основе весов

### Пример использования

```typescript
import { StrategyManager, CombinationMode } from './src/trading/strategies/index.js';

const manager = new StrategyManager({
  mode: CombinationMode.BEST_CONFIDENCE,
});

// Добавление стратегий
manager.addStrategy(new NewsMomentumStrategy());
manager.addStrategy(new SentimentSwingStrategy());

// Анализ
const decision = manager.analyze(marketData, signals);

// Получение статистики
const stats = manager.getStats();
for (const [name, stat] of stats) {
  console.log(`${name}: ${stat.totalTrades} trades`);
}
```

### Weighted режим

Для взвешенного комбинирования можно задать веса стратегий:

```typescript
const weights = new Map([
  ['News Momentum', 0.7],
  ['Sentiment Swing', 0.3],
]);

const manager = new StrategyManager({
  mode: CombinationMode.WEIGHTED,
  weights,
});
```

## Структура данных

### MarketData

```typescript
interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: Date;
  ohlc?: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
  volatility?: number;
}
```

### Signal

```typescript
interface Signal {
  id: string;
  type: SignalType; // 'news' | 'sentiment' | 'technical' | 'social' | 'event'
  sentiment: SignalSentiment; // 'bullish' | 'bearish' | 'neutral'
  impact: number; // 0-1
  source: string;
  timestamp: Date;
  data: Record<string, unknown>;
}
```

### TradeDecision

```typescript
interface TradeDecision {
  direction: TradeDirection; // 'long' | 'short'
  confidence: number; // 0-1
  entryPrice: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  positionSize: number; // % от капитала
  timeframe?: number; // время удержания в секундах
  reason: string;
  signals: Signal[];
}
```

## Создание собственной стратегии

Для создания собственной стратегии наследуйтесь от `BaseStrategy`:

```typescript
import { BaseStrategy } from './BaseStrategy.js';
import type { MarketData, Signal, TradeDecision, StrategyParams } from './types.js';

export class MyCustomStrategy extends BaseStrategy {
  public name = 'My Custom Strategy';
  public description = 'Custom strategy description';

  constructor(params: Partial<StrategyParams> = {}) {
    super({
      enabled: true,
      minImpact: 0.5,
      ...params,
    });
  }

  public analyze(data: MarketData, signals: Signal[]): TradeDecision | null {
    // Ваша логика анализа
    const filteredSignals = this.filterSignalsByImpact(signals);

    if (filteredSignals.length === 0) {
      return null;
    }

    // Генерация решения
    const decision: TradeDecision = {
      direction: 'long',
      confidence: 0.8,
      entryPrice: data.price,
      stopLoss: this.calculateStopLoss(data.price, true),
      takeProfit: this.calculateTakeProfit(data.price, true),
      positionSize: this.calculatePositionSize(0.8),
      reason: 'Custom logic',
      signals: filteredSignals,
    };

    this.updateStats(signals, decision);
    return decision;
  }
}
```

## Тестирование

Запуск тестов:

```bash
npm run test
# или
npx tsx tests/trading/strategies.test.ts
```

## Примеры

Запуск примера:

```bash
npm run example:strategies
# или
npx tsx examples/strategies-example.ts
```

## Лучшие практики

1. **Backtesting** - всегда тестируйте стратегии на исторических данных перед использованием
2. **Риск-менеджмент** - используйте stop-loss и ограничивайте размер позиций
3. **Комбинирование** - используйте несколько стратегий для снижения рисков
4. **Мониторинг** - отслеживайте статистику и производительность стратегий
5. **Параметры** - подбирайте параметры под конкретные рыночные условия

## Roadmap

- [x] Price Channel Breakout стратегия
- [ ] Event-Driven стратегия для запланированных событий
- [ ] Social Momentum стратегия на основе социальных всплесков
- [ ] Hybrid стратегия с комбинацией технического анализа
- [ ] Machine Learning стратегия
- [ ] Backtesting engine интеграция

## Лицензия

MIT
