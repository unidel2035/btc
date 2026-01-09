# BTC News Trading Bot

Торговый робот криптовалюты на основе анализа новостных лент, социальных сигналов и технической аналитики.

## Описание проекта

Автоматизированная торговая система для криптовалютных рынков, использующая:
- **Новостную аналитику** — парсинг и анализ новостей из различных источников
- **Sentiment Analysis** — анализ настроений рынка через NLP
- **Технический анализ** — индикаторы и паттерны
- **Социальные сигналы** — мониторинг Twitter/X, Reddit, Telegram

## Архитектура

```
btc/
├── src/
│   ├── collectors/        # Сбор данных из источников
│   │   ├── news/          # Новостные агрегаторы
│   │   ├── social/        # Социальные сети
│   │   └── market/        # Рыночные данные
│   ├── analyzers/         # Модули анализа
│   │   ├── sentiment/     # Анализ настроений
│   │   ├── technical/     # Технический анализ
│   │   └── signals/       # Генерация сигналов
│   ├── trading/           # Торговая логика
│   │   ├── strategies/    # Торговые стратегии
│   │   ├── execution/     # Исполнение ордеров
│   │   └── risk/          # Риск-менеджмент
│   ├── api/               # REST API
│   └── dashboard/         # Веб-интерфейс
├── config/                # Конфигурации
├── data/                  # Локальные данные
├── tests/                 # Тесты
└── docs/                  # Документация
```

## Технологический стек

- **Backend:** Node.js / TypeScript
- **ML/NLP:** Python, Transformers, spaCy
- **База данных:** PostgreSQL, Redis (кеш)
- **Очереди:** Bull/BullMQ
- **API бирж:** Binance, Bybit, OKX
- **Frontend:** Vue.js / Nuxt

## Источники данных

### Новости
- CoinDesk, CoinTelegraph, The Block
- Bloomberg Crypto, Reuters
- Официальные блоги проектов

### Социальные сети
- Twitter/X (ключевые аккаунты, хештеги)
- Reddit (r/Bitcoin, r/CryptoCurrency)
- Telegram каналы

### Рыночные данные
- Биржевые API (свечи, orderbook, trades)
- On-chain метрики
- Fear & Greed Index

## Торговые стратегии

1. **News Momentum** — торговля на новостных импульсах
2. **Sentiment Swing** — позиционная торговля по настроениям
3. **Event-Driven** — реакция на конкретные события
4. **Hybrid** — комбинация сигналов

## Риск-менеджмент

- Максимальный размер позиции
- Stop-loss / Take-profit
- Дневной лимит убытков
- Диверсификация по активам
- Корреляционный анализ

## Установка

```bash
# Клонирование
git clone https://github.com/unidel2035/btc.git
cd btc

# Установка зависимостей
npm install

# Настройка окружения
cp .env.example .env
# Заполнить API ключи и настройки

# Запуск в dev-режиме
npm run dev
```

## Конфигурация

Основные переменные окружения:

```env
# Биржи
BINANCE_API_KEY=
BINANCE_SECRET=
BYBIT_API_KEY=
BYBIT_SECRET=

# Данные
POSTGRES_URL=
REDIS_URL=

# Источники новостей
TWITTER_BEARER_TOKEN=
NEWS_API_KEY=
ENABLE_NEWS_SCHEDULER=false

# Telegram уведомления
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

## Использование

```bash
# Запуск бота
npm run start

# Только сбор данных (новостей)
npm run collect

# Запуск тестов
npm run test

# Пример использования news collector
npm run example:news

# Только анализ
npm run analyze

# Backtesting
npm run backtest --strategy=news-momentum --from=2024-01-01

# Dashboard
npm run dashboard
```

## API Endpoints

```
GET  /api/signals          # Текущие сигналы
GET  /api/positions        # Открытые позиции
GET  /api/history          # История сделок
GET  /api/metrics          # Метрики производительности
POST /api/settings         # Обновить настройки
```

## Метрики и мониторинг

- Telegram уведомления о сделках
- Веб-dashboard с графиками
- Логирование всех действий
- Prometheus метрики

## Roadmap

- [x] Базовая архитектура проекта
- [x] Модуль сбора новостей
- [ ] Sentiment анализ
- [ ] Интеграция с биржами
- [ ] Торговые стратегии
- [ ] Backtesting engine
- [ ] Веб-интерфейс
- [ ] Paper trading режим
- [ ] Production deployment

## Лицензия

MIT

## Disclaimer

Данное ПО предоставляется "как есть". Торговля криптовалютами связана с высокими рисками. Авторы не несут ответственности за финансовые потери.
