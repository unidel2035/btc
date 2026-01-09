# Backtesting Engine

Система тестирования торговых стратегий на исторических данных.

## Описание

Backtesting Engine позволяет симулировать торговые стратегии на исторических данных для оценки их эффективности до использования в реальной торговле. Движок поддерживает:

- ✅ Загрузку исторических данных из различных источников
- ✅ Симуляцию исполнения ордеров с учетом комиссий и проскальзывания
- ✅ Расчет комплексных метрик производительности
- ✅ Визуализацию результатов
- ✅ Тестирование на множественных активах
- ✅ Экспорт результатов в JSON/CSV

## Быстрый старт

### Простой запуск

```bash
npm run backtest --strategy=news-momentum --symbol=BTCUSDT --from=2024-01-01 --to=2024-12-31
```

### С кастомными параметрами

```bash
npm run backtest --strategy=sentiment-swing --params='{"threshold": 0.7}' --capital=50000
```

### Множественные активы

```bash
npm run backtest --strategy=news-momentum --symbols=BTCUSDT,ETHUSDT,SOLUSDT
```

## CLI Интерфейс

### Опции командной строки

```bash
npm run backtest [options]

Options:
  --strategy=<name>        Стратегия для тестирования (news-momentum, sentiment-swing)
  --symbol=<symbol>        Торговый символ (например, BTCUSDT)
  --symbols=<s1,s2,s3>     Множественные символы (через запятую)
  --from=<date>            Дата начала (YYYY-MM-DD)
  --to=<date>              Дата окончания (YYYY-MM-DD)
  --params='<json>'        Параметры стратегии в формате JSON
  --data=<source>          Источник данных (csv, mock) [по умолчанию: mock]
  --capital=<amount>       Начальный капитал [по умолчанию: 10000]
  --timeframe=<tf>         Таймфрейм свечей (1m, 5m, 15m, 1h, 4h, 1d) [по умолчанию: 1h]
```

### Примеры использования

```bash
# Базовый запуск с mock данными
npm run backtest --strategy=news-momentum --symbol=BTCUSDT --from=2024-01-01 --to=2024-12-31

# С CSV данными
npm run backtest --strategy=news-momentum --data=csv --symbol=BTCUSDT

# Кастомные параметры стратегии
npm run backtest --strategy=sentiment-swing --params='{"aggregationPeriodHours": 8, "trendThreshold": 0.7}'

# Большой капитал на 4-часовом таймфрейме
npm run backtest --strategy=news-momentum --capital=100000 --timeframe=4h

# Помощь
npm run backtest --help
```

## Программный API

### Базовое использование

```typescript
import {
  BacktestEngine,
  MockDataLoader,
  Visualizer,
  type BacktestConfig,
} from './trading/backtest/index.js';
import { NewsMomentumStrategy } from './trading/strategies/index.js';

// Конфигурация
const config: BacktestConfig = {
  symbol: 'BTCUSDT',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  initialCapital: 10000,
  strategyName: 'news-momentum',
  fees: {
    maker: 0.1, // 0.1%
    taker: 0.1, // 0.1%
  },
  slippage: 0.05, // 0.05%
  maxPositionSize: 10, // 10% от капитала
  allowShorts: false,
  timeframe: '1h',
};

// Создание стратегии и загрузчика данных
const strategy = new NewsMomentumStrategy();
const dataLoader = new MockDataLoader(50000, 0.02);

// Запуск бэктеста
const engine = new BacktestEngine(config, strategy, dataLoader);
const result = await engine.run();

// Отображение результатов
Visualizer.printSummary(result);
Visualizer.printEquityCurve(result.equityCurve);
Visualizer.printDrawdownChart(result.equityCurve);

// Экспорт
await Visualizer.exportToJSON(result, './results/backtest.json');
await Visualizer.exportToCSV(result, './results/trades.csv');
```

## Метрики производительности

Движок рассчитывает следующие метрики:

### Основные метрики доходности
- **Total Return** - общая доходность в %
- **Annualized Return** - годовая доходность
- **Sharpe Ratio** - коэффициент Шарпа (риск-скорректированная доходность)
- **Sortino Ratio** - коэффициент Сортино (учитывает только downside риск)

### Метрики риска
- **Max Drawdown** - максимальная просадка в %
- **Max Drawdown Duration** - длительность максимальной просадки в днях

### Торговые метрики
- **Win Rate** - процент прибыльных сделок
- **Profit Factor** - отношение прибыли к убыткам
- **Total Trades** - общее количество сделок
- **Avg Trade Duration** - средняя длительность сделки
- **Avg Win/Loss** - средний выигрыш/проигрыш
- **Largest Win/Loss** - максимальный выигрыш/проигрыш

## Источники данных

### Mock Data Loader

Генерирует синтетические данные для тестирования:

```typescript
import { MockDataLoader } from './trading/backtest/index.js';

const loader = new MockDataLoader(
  50000, // базовая цена
  0.02   // волатильность (2%)
);

const candles = await loader.loadCandles(
  'BTCUSDT',
  new Date('2024-01-01'),
  new Date('2024-12-31'),
  '1h'
);
```

### CSV Data Loader

Загружает реальные исторические данные из CSV:

```typescript
import { CSVDataLoader } from './trading/backtest/index.js';

const loader = new CSVDataLoader('./data');

// Ожидаемый формат CSV: timestamp,open,high,low,close,volume
// Файл: ./data/BTCUSDT_1h.csv
const candles = await loader.loadCandles(
  'BTCUSDT',
  new Date('2024-01-01'),
  new Date('2024-12-31'),
  '1h'
);
```

### Формат CSV файлов

```csv
timestamp,open,high,low,close,volume
1704067200000,42150.50,42580.30,42020.10,42450.75,1250000000
1704070800000,42450.75,42890.20,42300.50,42750.30,1380000000
...
```

Timestamp может быть в формате:
- Unix timestamp в миллисекундах
- Unix timestamp в секундах
- ISO 8601 строка

## Комиссии и проскальзывание

### Комиссии

Движок поддерживает maker/taker комиссии:

```typescript
fees: {
  maker: 0.1,  // 0.1% за maker ордера
  taker: 0.1,  // 0.1% за taker ордера
}
```

Комиссии вычитаются из каждой сделки (вход и выход).

### Проскальзывание

Проскальзывание симулирует неблагоприятное изменение цены при исполнении:

```typescript
slippage: 0.05  // 0.05% проскальзывание
```

При входе:
- Long: цена входа увеличивается на slippage%
- Short: цена входа уменьшается на slippage%

При выходе - обратный эффект.

## Визуализация

### Консольная визуализация

```typescript
import { Visualizer } from './trading/backtest/index.js';

// Сводка результатов
Visualizer.printSummary(result);

// График equity curve (ASCII)
Visualizer.printEquityCurve(result.equityCurve);

// График просадки
Visualizer.printDrawdownChart(result.equityCurve);

// Месячная доходность
Visualizer.printMonthlyReturns(result);

// Распределение сделок
Visualizer.printTradeDistribution(result.trades);
```

### Экспорт результатов

```typescript
// JSON (полные результаты)
await Visualizer.exportToJSON(result, './results/backtest.json');

// CSV (список сделок)
await Visualizer.exportToCSV(result, './results/trades.csv');
```

## Тестирование множественных стратегий

```typescript
const strategies = [
  { name: 'news-momentum', strategy: new NewsMomentumStrategy() },
  { name: 'sentiment-swing', strategy: new SentimentSwingStrategy() },
];

for (const { name, strategy } of strategies) {
  const config = { ...baseConfig, strategyName: name };
  const engine = new BacktestEngine(config, strategy, dataLoader);
  const result = await engine.run();

  console.log(`${name}: Return = ${result.totalReturn.toFixed(2)}%`);
}
```

## Оптимизация параметров

```typescript
const thresholds = [0.5, 0.6, 0.7, 0.8, 0.9];

for (const threshold of thresholds) {
  const strategy = new NewsMomentumStrategy({
    impactThreshold: threshold,
  });

  const engine = new BacktestEngine(config, strategy, dataLoader);
  const result = await engine.run();

  console.log(`Threshold ${threshold}: Sharpe = ${result.sharpeRatio.toFixed(2)}`);
}
```

## Примеры

Запустите готовые примеры:

```bash
# Запуск всех примеров
npm run example:backtest

# Запуск тестов
npm run test:backtest
```

## Лучшие практики

1. **Тестируйте на разных периодах** - избегайте overfitting, тестируя на нескольких временных отрезках

2. **Учитывайте комиссии** - всегда включайте реалистичные комиссии и проскальзывание

3. **Используйте walk-forward анализ** - тестируйте на одном периоде, оптимизируйте на другом

4. **Смотрите на Sharpe Ratio** - не только на доходность, но и на риск-скорректированную доходность

5. **Проверяйте drawdown** - убедитесь, что просадки приемлемы для вашего риск-профиля

6. **Валидируйте результаты** - используйте out-of-sample тестирование

## Ограничения

Текущая версия имеет следующие ограничения:

- Одна открытая позиция на символ
- Нет partial fills
- Упрощенная модель ликвидности
- Нет учета spread'а
- Базовая модель проскальзывания

## Roadmap

- [ ] Walk-forward анализ
- [ ] Оптимизация параметров с grid search
- [ ] Monte Carlo симуляции
- [ ] Binance API интеграция для загрузки данных
- [ ] Веб-интерфейс для визуализации
- [ ] Поддержка Parquet формата
- [ ] Расширенные модели проскальзывания
- [ ] Portfolio backtesting с multiple strategies

## Troubleshooting

### Нет данных для загрузки

Если используете CSV loader:
```bash
mkdir -p data
# Добавьте CSV файлы в формате: SYMBOL_TIMEFRAME.csv
# Например: data/BTCUSDT_1h.csv
```

### Ошибки экспорта результатов

Создайте директорию для результатов:
```bash
mkdir -p results
```

### Медленная работа

Для больших периодов используйте большие таймфреймы:
```bash
npm run backtest --timeframe=4h  # вместо 1h
```
