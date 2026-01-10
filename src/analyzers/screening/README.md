### AI Screening Module

Автоматизированная система отбора перспективных криптопроектов для технического анализа и включения в торговые стратегии.

## Обзор

AI Screening Module проводит макро-анализ рынка, выполняет скрининг и сравнительный анализ множества проектов с целью формирования короткого списка из 2-4 наиболее перспективных криптопроектов из разных высокопотенциальных секторов.

### Ключевые возможности

- 🔍 **Автоматический отбор секторов** - Анализ трендов и выбор 2-3 самых перспективных секторов
- 📊 **Количественный скрининг** - Фильтрация проектов по объему, капитализации, листингам
- 🎯 **Фундаментальная оценка** - Комплексный scoring по команде, технологии, сообществу
- 💼 **Построение портфеля** - Диверсификация и баланс риска/доходности
- 📄 **Детальные отчеты** - Markdown, JSON и CSV форматы для удобного анализа

## Архитектура

Модуль состоит из 4 этапов:

```
Stage 0: Macro Sector Analysis
    ↓
Stage 1: Quantitative Screening
    ↓
Stage 2: Fundamental Scoring
    ↓
Stage 3: Portfolio Construction
    ↓
Report Generation
```

### Stage 0: Macro Sector Analysis

**Цель**: Выбрать 2-3 самых перспективных сектора рынка

**Источники данных**:
- CoinGecko Categories API
- Трендовые данные
- Новостной фон

**Критерии отбора**:
- Рост капитализации сектора за 30/90 дней
- Усиление нарратива (volume/market cap ratio)
- Фундаментальные драйверы

**Перспективные сектора**:
- AI + Crypto (децентрализованные вычисления)
- DePin (децентрализованная физическая инфраструктура)
- Real World Assets (RWA)
- Модульные блокчейны & L2
- DeFi нового поколения

### Stage 1: Quantitative Screening

**Цель**: Отобрать топ-5-7 проектов внутри каждого сектора

**Фильтры**:
- ✅ Market cap rank: 1-200
- ✅ 24h volume > $10M
- ✅ Price change 30d > 0%
- ✅ Листинг минимум на 2 биржах из: Binance, Bybit, OKX, KuCoin

**Выход**: Сводная таблица с 10-15 проектами-кандидатами

### Stage 2: Fundamental Scoring

**Цель**: Рассчитать композитный балл для каждого проекта

**A. Фундамент & Команда (30%)**:
- Активность разработки (GitHub commits)
- Качество токеномики (инфляция, разблокировки)
- Прозрачность (homepage, GitHub, Twitter)
- GitHub stars и community

**B. Рыночные показатели (40%)**:
- Price/ATH ratio (потенциал восстановления)
- Ликвидность (volume/market cap)
- Ценовой моментум (30d change)
- Качество листингов

**C. Сообщество & Нарратив (30%)**:
- Twitter followers
- Reddit subscribers
- Telegram community
- Активность (posts, comments)

**Выход**: Ранжированный список с баллами 0-100

### Stage 3: Portfolio Construction

**Цель**: Сформировать финальный список из 2-4 проектов

**Принципы отбора**:
- 🎯 **Диверсификация по секторам** - минимум 1 проект из каждого сектора
- ⚖️ **Баланс риска**:
  - 50% "голубые фишки" (top 50 by market cap) - стабильность
  - 50% "газели" (51-200 rank) - потенциал роста
- 🚫 **Исключение дублирования** - не брать конкурирующие проекты

## Использование

### Быстрый старт

```bash
# 1. Установить зависимости
npm install

# 2. Настроить .env файл
cp .env.example .env
# Опционально добавить COINGECKO_API_KEY для Pro tier

# 3. Запустить скрининг
npm run screening

# Или через example
npm run example:screening
```

### Программное использование

```typescript
import { ScreeningOrchestrator } from './src/analyzers/screening/index.js';

// Вариант 1: Конфигурация по умолчанию
const orchestrator = ScreeningOrchestrator.fromEnv();
const report = await orchestrator.runAndSaveReport();

// Вариант 2: Кастомная конфигурация
const config = {
  maxSectors: 2,
  finalProjectCount: 3,
  minVolume24h: 20_000_000,
  bluechipRatio: 0.67, // 2/3 bluechips
  gazzelleRatio: 0.33, // 1/3 mid-caps
  weights: {
    fundamental: 0.4,
    market: 0.4,
    community: 0.2,
  },
};

const customOrchestrator = new ScreeningOrchestrator(
  config,
  process.env.COINGECKO_API_KEY
);

const report = await customOrchestrator.runScreening();
console.log(report.recommendedProjects);
```

### Отчеты

Модуль генерирует отчеты в трех форматах:

#### 1. Markdown Report (`screening-report-YYYY-MM-DD.md`)

```markdown
# 📊 ОТЧЕТ ОТБОРА ПРОЕКТОВ ДЛЯ ТЕХНИЧЕСКОГО АНАЛИЗА

**Дата генерации:** 2024-05-15
**Анализированные сектора:** AI + Crypto, DePin

## 🎯 РЕКОМЕНДУЕМЫЙ СПИСОК ПРОЕКТОВ (4)

| № | Тикер | Название | Сектор | Рейтинг | ... |
|---|-------|----------|--------|---------|-----|
| 1 | RNDR  | Render   | AI     | 88      | ... |
...
```

#### 2. JSON Report (`screening-report-YYYY-MM-DD.json`)

Полная структурированная информация для программной обработки.

#### 3. CSV Report (`screening-report-YYYY-MM-DD.csv`)

Для импорта в Excel/Google Sheets.

## Конфигурация

Все параметры настраиваются через `.env` файл:

```env
# CoinGecko API
COINGECKO_API_KEY=your_api_key_here

# Stage 0: Sector Selection
SCREENING_MAX_SECTORS=3
SCREENING_MIN_SECTOR_GROWTH=10
SCREENING_MIN_NARRATIVE_STRENGTH=0.3

# Stage 1: Screening
SCREENING_MIN_MARKET_CAP_RANK=1
SCREENING_MAX_MARKET_CAP_RANK=200
SCREENING_MIN_VOLUME=10000000
SCREENING_MIN_PRICE_CHANGE_30D=0
SCREENING_PROJECTS_PER_SECTOR=7
SCREENING_REQUIRED_EXCHANGES=binance,bybit,okx,kucoin
SCREENING_MIN_EXCHANGE_LISTINGS=2

# Stage 2: Scoring
SCREENING_WEIGHT_FUNDAMENTAL=0.3
SCREENING_WEIGHT_MARKET=0.4
SCREENING_WEIGHT_COMMUNITY=0.3
SCREENING_MAX_UNLOCK_PERCENT=2
SCREENING_UNLOCK_PENALTY=-5

# Stage 3: Portfolio
SCREENING_FINAL_COUNT=4
SCREENING_MIN_PROJECTS_PER_SECTOR=1
SCREENING_BLUECHIP_RATIO=0.5
SCREENING_GAZZELLE_RATIO=0.5

# Output
SCREENING_REPORT_DIR=./reports
SCREENING_REPORT_FORMATS=markdown,json,csv
```

## API Integration

### CoinGecko API

Модуль использует CoinGecko API для получения данных:

**Free Tier**:
- 50 requests/minute
- Автоматический rate limiting
- Подходит для большинства случаев

**Pro Tier** (рекомендуется):
- Больше requests/minute
- Более свежие данные
- Нужен API ключ в `COINGECKO_API_KEY`

### Rate Limiting

Встроенная защита от превышения лимитов:
- Автоматическая задержка между запросами
- Batch запросы где возможно
- Обработка ошибок 429 (Too Many Requests)

## Пример вывода

```
🚀 Starting AI Screening Module...

================================================================================
🔍 Stage 0: Analyzing crypto sectors...
✅ Selected 3 top sectors:
   1. AI + Crypto (Score: 85.00)
   2. DePin (Score: 82.00)
   3. Real World Assets (Score: 78.00)

🔍 Stage 1: Quantitative screening of projects...

   Screening sector: AI + Crypto
   ✅ Found 7 candidates in AI + Crypto

   Screening sector: DePin
   ✅ Found 6 candidates in DePin

✅ Total candidates found: 13

🔍 Stage 2: Scoring projects on fundamentals...
   ✅ RNDR: 88.0/100
   ✅ TAO: 79.0/100
   ...

✅ Scored 13 projects

🔍 Stage 3: Building final portfolio...
   Target: 2 bluechips, 2 gazzelles

✅ Final portfolio: 4 projects
   1. RNDR - Render Network (AI + Crypto) - 88/100
   2. HNT - Helium (DePin) - 82/100
   3. TAO - Bittensor (AI + Crypto) - 79/100
   4. ONDO - Ondo Finance (RWA) - 75/100

✅ Screening completed in 45.3s

================================================================================
📊 SCREENING SUMMARY
================================================================================

📅 Generated: 2024-05-15 10:30:00
📊 Analyzed: 13 projects across 3 sectors
✅ Selected: 4 projects

🎯 RECOMMENDED PROJECTS:

1. RNDR - Render Network
   Sector: AI + Crypto
   Rating: 88/100
   Pair: RNDR/USDT
   Leading project in decentralized GPU rendering, strong partnerships

...

📄 Report saved to: ./reports/screening-report-2024-05-15.md
💾 JSON report saved to: ./reports/screening-report-2024-05-15.json
📊 CSV report saved to: ./reports/screening-report-2024-05-15.csv
```

## Интеграция с торговыми стратегиями

Результаты скрининга легко интегрируются в торговый бот:

```typescript
import { ScreeningOrchestrator } from './src/analyzers/screening/index.js';

// Получить список рекомендуемых пар
const orchestrator = ScreeningOrchestrator.fromEnv();
const report = await orchestrator.runScreening();

const tradingPairs = report.recommendedProjects.map(p => p.tradingPair);
// ['RNDR/USDT', 'HNT/USDT', 'TAO/USDT', 'ONDO/USDT']

// Передать в модуль технического анализа
for (const pair of tradingPairs) {
  await technicalAnalyzer.analyze(pair);
  await strategyManager.addToWatchlist(pair);
}
```

## Ограничения и замечания

### Текущие ограничения:

1. **GitHub данные**: Требуют наличия публичных репозиториев
2. **Twitter followers**: Может быть недоступно для некоторых проектов
3. **TVL данные**: Не все проекты имеют TVL метрики
4. **Unlock schedule**: Требует дополнительных API для точных данных

### Рекомендации:

- ⏰ Запускать скрининг 1-2 раза в неделю
- 📊 Комбинировать с техническим анализом
- 🔍 Проводить дополнительный manual research для финального списка
- 📈 Мониторить фундаментальные триггеры (апгрейды, разблокировки)

## Roadmap

- [ ] Интеграция с DeFi Llama для TVL данных
- [ ] Token unlock schedule из Messari/Token Unlocks API
- [ ] Исторические данные секторов для точного расчета роста
- [ ] On-chain метрики (активные адреса, транзакции)
- [ ] Sentiment анализ из Twitter/Reddit
- [ ] Автоматический мониторинг и алерты на изменения рейтингов
- [ ] Интеграция с Telegram для отправки отчетов

## Troubleshooting

### Rate limit errors

```
Error: 429 Too Many Requests
```

**Решение**:
- Увеличить `requestDelay` в CoinGeckoClient
- Использовать Pro API key
- Уменьшить `SCREENING_PROJECTS_PER_SECTOR`

### Недостаточно данных

```
Warning: Portfolio validation failed
```

**Решение**:
- Увеличить `SCREENING_MAX_MARKET_CAP_RANK`
- Уменьшить `SCREENING_MIN_VOLUME`
- Снизить `SCREENING_MIN_PRICE_CHANGE_30D`

## Contributing

При добавлении новых функций:

1. Следовать существующей архитектуре (Stage 0-3)
2. Добавлять тесты для новых scoring критериев
3. Обновлять конфигурацию в `.env.example`
4. Документировать новые параметры

## License

MIT
