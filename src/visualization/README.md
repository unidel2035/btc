# Visualization Module

Модуль визуализации торговых сетапов на графике TradingView (Visual Backtest & Setup Presentation Module).

## Описание

Этот модуль автоматически создает интерактивные графики в TradingView с нанесенными разметками, которые визуализируют:

- ✅ **Торговые сетапы** (лонг/шорт) согласно SMC-анализу
- ✅ **Точки входа** (лимитные ордера)
- ✅ **Уровни стоп-лосса и тейк-профита**
- ✅ **Ключевые SMC-структуры** (Order Blocks, FVG, уровни ликвидности)

## Возможности

### 1. Pine Script Generation
Генерация Pine Script кода для TradingView индикаторов:
```typescript
const generator = new PineScriptGenerator();
const result = generator.generate(tradingSetup);
console.log(result.code); // Pine Script код
console.log(result.url);  // TradingView URL
```

### 2. TradingView Charting Library Integration
Конфигурация для встроенного виджета TradingView:
```typescript
const chartGen = new ChartingLibraryGenerator();
const config = chartGen.generate(tradingSetup);
const widgetCode = chartGen.generateWidgetCode(tradingSetup);
const htmlPage = chartGen.generateHTMLPage(tradingSetup);
```

### 3. Visual Reports
Генерация HTML и Markdown отчетов:
```typescript
const reportGen = new VisualReportGenerator();
const report = await reportGen.generate(tradingSetup, config);
```

### 4. Complete Visualization Module
Универсальный модуль для всех типов визуализации:
```typescript
const visualization = new VisualizationModule();
const report = await visualization.visualize(tradingSetup);
```

## Использование

### Базовый пример

```typescript
import { VisualizationModule, TradingSetup, TradingDirection, SMCStructureType } from './visualization';

// Создать торговый сетап
const setup: TradingSetup = {
  symbol: 'BTCUSDT',
  direction: TradingDirection.LONG,
  currentPrice: 45000,
  entryZones: [
    { priceHigh: 44500, priceLow: 44000, orderType: 'limit', positionPercent: 50 },
    { priceHigh: 43500, priceLow: 43000, orderType: 'limit', positionPercent: 50 },
  ],
  stopLoss: 42500,
  takeProfits: [
    { price: 47000, positionPercent: 50, label: 'TP1' },
    { price: 50000, positionPercent: 50, label: 'TP2' },
  ],
  smcStructures: [
    {
      type: SMCStructureType.ORDER_BLOCK,
      direction: 'bullish',
      priceHigh: 44800,
      priceLow: 44200,
      label: 'Bullish OB',
    },
  ],
  riskPercent: 2.0,
  riskRewardRatio: 2.5,
  confidence: 0.75,
  analysis: 'Strong bullish setup with confluence at Order Block zone',
  timestamp: new Date(),
};

// Создать визуализацию
const visualization = new VisualizationModule();
const report = await visualization.visualize(setup);

// Использовать результаты
console.log('Pine Script:', report.pineScript?.code);
console.log('Chart Config:', report.chartConfig);
console.log('HTML Report:', report.htmlReport);
```

### Генерация Pine Script

```typescript
const visualization = new VisualizationModule();
const pineScript = visualization.generatePineScript(setup);

// Скопировать в TradingView
console.log(pineScript.code);

// Или открыть URL
window.open(pineScript.url, '_blank');
```

### Генерация HTML страницы

```typescript
const visualization = new VisualizationModule();
const html = visualization.generateHTMLPage(setup);

// Сохранить в файл
fs.writeFileSync('setup.html', html);
```

### Генерация Markdown отчета

```typescript
const visualization = new VisualizationModule();
const markdown = visualization.generateMarkdownReport(setup);

// Сохранить или отправить
fs.writeFileSync('setup.md', markdown);
```

### Пакетная обработка

```typescript
const visualization = new VisualizationModule();
const reports = await visualization.visualizeBatch([setup1, setup2, setup3]);

console.log(`Generated ${reports.length} visualizations`);
```

## Конфигурация

### Через код

```typescript
const visualization = new VisualizationModule({
  method: VisualizationMethod.TRADINGVIEW_EMBEDDED,
  colors: {
    longEntry: '#00FF00',
    shortEntry: '#FF0000',
    stopLoss: '#FF6B6B',
    takeProfit: '#4ECDC4',
    orderBlock: '#1E90FF',
    fvg: '#808080',
    liquidityPool: '#FFA500',
  },
  defaultTimeframe: '4h',
  showVolumeProfile: true,
  generateImages: false,
});
```

### Через переменные окружения

```env
VISUALIZATION_METHOD=tradingview_embedded
VISUALIZATION_TIMEFRAME=4h
VISUALIZATION_SHOW_VOLUME=true
VISUALIZATION_GENERATE_IMAGES=false
VISUALIZATION_COLOR_LONG=#00FF00
VISUALIZATION_COLOR_SHORT=#FF0000
VISUALIZATION_COLOR_SL=#FF6B6B
VISUALIZATION_COLOR_TP=#4ECDC4
VISUALIZATION_COLOR_OB=#1E90FF
VISUALIZATION_COLOR_FVG=#808080
VISUALIZATION_COLOR_LIQUIDITY=#FFA500
```

### Использование пресетов

```typescript
import { VISUALIZATION_PRESETS } from './visualization';

// Минимальный (только Pine Script)
const viz1 = new VisualizationModule(VISUALIZATION_PRESETS.minimal);

// Стандартный (TradingView Embedded)
const viz2 = new VisualizationModule(VISUALIZATION_PRESETS.standard);

// Полный (все функции)
const viz3 = new VisualizationModule(VISUALIZATION_PRESETS.complete);
```

## Типы данных

### TradingSetup

Основная структура данных для торгового сетапа:

```typescript
interface TradingSetup {
  symbol: string;               // Торговая пара (BTCUSDT)
  direction: TradingDirection;  // LONG или SHORT
  currentPrice: number;         // Текущая цена
  entryZones: EntryZone[];     // Зоны входа
  stopLoss: number;            // Стоп-лосс
  takeProfits: TakeProfitLevel[]; // Уровни тейк-профита
  smcStructures: SMCStructure[]; // SMC структуры
  riskPercent: number;         // Риск в %
  riskRewardRatio: number;     // R:R соотношение
  confidence: number;          // Уверенность (0-1)
  analysis: string;            // Описание анализа
  timestamp: Date;             // Дата создания
}
```

### EntryZone

Зона входа:

```typescript
interface EntryZone {
  priceHigh: number;        // Верхняя граница
  priceLow: number;         // Нижняя граница
  orderType: 'limit' | 'market'; // Тип ордера
  positionPercent: number;  // % позиции для этого входа
}
```

### TakeProfitLevel

Уровень тейк-профита:

```typescript
interface TakeProfitLevel {
  price: number;           // Цена
  positionPercent: number; // % позиции для закрытия
  label?: string;          // Метка
}
```

### SMCStructure

SMC структура (Order Block, FVG, и т.д.):

```typescript
interface SMCStructure {
  type: SMCStructureType;  // Тип структуры
  direction: 'bullish' | 'bearish'; // Направление
  priceHigh: number;       // Верхняя граница
  priceLow: number;        // Нижняя граница
  timestamp?: Date;        // Дата формирования
  label?: string;          // Метка
  description?: string;    // Описание
}

enum SMCStructureType {
  ORDER_BLOCK = 'order_block',
  FVG = 'fvg',
  LIQUIDITY_POOL = 'liquidity_pool',
  PREMIUM_DISCOUNT = 'premium_discount',
  BREAKER_BLOCK = 'breaker_block',
}
```

## Методы визуализации

### 1. TradingView Embedded
Встроенный виджет TradingView в веб-интерфейс:
- ✅ Полная интерактивность
- ✅ Все инструменты TradingView
- ✅ Real-time данные
- ⚠️ Требует TradingView Charting Library

### 2. Pine Script
Генерация Pine Script индикатора:
- ✅ Нативная интеграция с TradingView
- ✅ Легко копировать и вставлять
- ✅ Поддержка всех функций Pine Script v5
- ⚠️ Требует ручной установки в TradingView

### 3. Local (Планируется)
Локальная визуализация с использованием библиотек:
- ✅ Полный контроль
- ✅ Не зависит от TradingView
- ✅ Можно сохранять изображения
- ⚠️ Меньше профессиональных инструментов

## Валидация

Модуль автоматически валидирует торговые сетапы:

```typescript
const validation = visualization.validate(setup);

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

Проверяется:
- ✅ Наличие обязательных полей
- ✅ Корректность цен (high > low)
- ✅ Логика направлений (для LONG: TP выше входа, SL ниже)
- ✅ Процентные доли (0-100%)
- ✅ Соответствие текущей цене

## Интеграция с другими модулями

### С модулем анализа

```typescript
import { TechnicalAnalyzer } from '../analyzers/technical';
import { VisualizationModule } from './visualization';

const analyzer = new TechnicalAnalyzer();
const analysis = await analyzer.analyze('BTCUSDT', { indicators: ['rsi', 'macd'] });

// Преобразовать анализ в торговый сетап
const setup = convertAnalysisToSetup(analysis);

// Визуализировать
const visualization = new VisualizationModule();
const report = await visualization.visualize(setup);
```

### С модулем исполнения ордеров

```typescript
// После подтверждения визуализации
const confirmation = await confirmSetup(report);

if (confirmation.approved) {
  // Отправить ордера на биржу
  await orderExecutor.executeSetup(setup);
}
```

## Примеры использования

См. файл `examples/visualization-example.ts` для полных примеров использования.

## Тестирование

```bash
# Запуск тестов
npm run test:visualization

# Запуск примеров
npm run example:visualization
```

## API Reference

### VisualizationModule

Главный класс модуля:

- `visualize(setup: TradingSetup): Promise<VisualReport>` - Создать полную визуализацию
- `generatePineScript(setup: TradingSetup): PineScriptResult` - Сгенерировать Pine Script
- `generateChartConfig(setup: TradingSetup): ChartingLibraryConfig` - Конфиг для виджета
- `generateHTMLPage(setup: TradingSetup): string` - HTML страница
- `generateWidgetCode(setup: TradingSetup): string` - JavaScript код виджета
- `generateMarkdownReport(setup: TradingSetup): string` - Markdown отчет
- `visualizeBatch(setups: TradingSetup[]): Promise<VisualReport[]>` - Пакетная обработка
- `validate(setup: TradingSetup): ValidationResult` - Валидация сетапа
- `updateConfig(config: Partial<VisualizationConfig>): void` - Обновить конфигурацию

### PineScriptGenerator

Генератор Pine Script:

- `generate(setup: TradingSetup, options?: PineScriptOptions): PineScriptResult`
- `validate(setup: TradingSetup): ValidationResult`

### ChartingLibraryGenerator

Генератор конфигурации для TradingView Charting Library:

- `generate(setup: TradingSetup, options?: ChartingLibraryOptions): ChartingLibraryConfig`
- `generateWidgetCode(setup: TradingSetup, options?: ChartingLibraryOptions): string`
- `generateHTMLPage(setup: TradingSetup, options?: ChartingLibraryOptions): string`

### VisualReportGenerator

Генератор отчетов:

- `generate(setup: TradingSetup, config: VisualizationConfig): Promise<VisualReport>`
- `generateMarkdownReport(setup: TradingSetup, config: VisualizationConfig): string`

## Требования

- Node.js >= 20.0.0
- TypeScript >= 5.0.0
- (Опционально) TradingView Charting Library для embedded виджетов

## Лицензия

MIT

## Автор

BTC Trading Bot Team
