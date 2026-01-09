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
- ✅ **Twitter/X API v2** — мониторинг ключевых аккаунтов и хештегов
- ✅ **Reddit API** — мониторинг r/Bitcoin, r/CryptoCurrency, r/CryptoMarkets
- ✅ **Telegram** — мониторинг публичных каналов (требует дополнительной библиотеки)

Подробная документация: [src/collectors/social/README.md](src/collectors/social/README.md)

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

Полнофункциональная система управления рисками:

### Position Sizing
- ✅ Фиксированный размер позиции
- ✅ Процент от баланса
- ✅ Kelly Criterion
- ✅ Volatility-adjusted sizing

### Stop-Loss / Take-Profit
- ✅ Фиксированный stop-loss
- ✅ ATR-based stop
- ✅ Trailing stop
- ✅ Множественные take-profit уровни

### Лимиты
- ✅ Максимальный размер позиции
- ✅ Максимальное количество позиций
- ✅ Дневной лимит убытков (daily drawdown)
- ✅ Общий лимит убытков (max drawdown)
- ✅ Лимит на актив

### Корреляция и диверсификация
- ✅ Анализ корреляции активов
- ✅ Ограничение коррелированных позиций
- ✅ Проверка диверсификации портфеля

### Уведомления и логирование
- ✅ Логирование всех риск-событий
- ✅ Уведомления при приближении к лимитам
- ✅ Автоматическое закрытие при достижении лимитов

Подробная документация: [src/trading/risk/README.md](src/trading/risk/README.md)

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

# Социальные сети
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USERNAME=
REDDIT_PASSWORD=
TELEGRAM_API_ID=
TELEGRAM_API_HASH=
ENABLE_SOCIAL_TWITTER=false
ENABLE_SOCIAL_REDDIT=false

# Sentiment Analysis
SENTIMENT_API_URL=http://localhost:8000

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
npm run test:sentiment
npm run test:risk
npm run test:strategies
npm run test:dashboard
npm run test:backtest
npm run test:paper
npm run test:social:retry
npm run test:social:orchestrator

# Примеры использования
npm run example:news
npm run example:sentiment
npm run example:risk
npm run example:strategies
npm run example:backtest
npm run example:paper
npm run example:twitter
npm run example:reddit
npm run example:social

# Только анализ (требует запущенный sentiment-analyzer)
npm run analyze

# Backtesting
npm run backtest --strategy=news-momentum --symbol=BTCUSDT --from=2024-01-01 --to=2024-12-31
npm run backtest --strategy=sentiment-swing --params='{"threshold": 0.7}'
npm run backtest --symbols=BTCUSDT,ETHUSDT,SOLUSDT --capital=50000

# Paper Trading (бумажная торговля)
npm run start -- --mode=paper
npm run start -- --mode=paper --balance=50000
npm run example:paper

# Dashboard (веб-интерфейс)
npm run dashboard

# Примеры использования
npm run example:dashboard
```

## Paper Trading

Режим бумажной торговли для безопасного тестирования стратегий без риска реальных денег.

### Возможности
- ✅ **Симуляция баланса** - виртуальный баланс с отслеживанием средств
- ✅ **Виртуальные ордера** - market и limit ордера
- ✅ **Реальные рыночные данные** - актуальные цены с бирж
- ✅ **Учет комиссий** - maker/taker комиссии (0.1%)
- ✅ **Симуляция проскальзывания** - реалистичное проскальзывание (0.05%)
- ✅ **Stop-Loss и Take-Profit** - автоматическое управление рисками
- ✅ **Статистика** - полная аналитика торговли

### Запуск

```bash
# Запуск в paper mode
npm run start -- --mode=paper

# С начальным балансом
npm run start -- --mode=paper --balance=50000

# Пример использования
npm run example:paper

# Тесты
npm run test:paper
```

### Конфигурация

В `.env` файле:

```env
TRADING_MODE=paper
PAPER_INITIAL_BALANCE=10000
PAPER_CURRENCY=USDT
PAPER_MAKER_FEE=0.1
PAPER_TAKER_FEE=0.1
PAPER_SLIPPAGE=0.05
PAPER_ALLOW_SHORTS=true
PAPER_MAX_POSITIONS=5
```

### Переключение на Live

⚠️ **ВНИМАНИЕ:** При переключении на live режим используются реальные деньги!

```bash
npm run start -- --mode=live
```

Требуется явное подтверждение и настроенные API ключи бирж.

Подробная документация: [src/trading/paper/README.md](src/trading/paper/README.md)

## Dashboard Веб-интерфейс

Полнофункциональный веб-интерфейс для мониторинга и управления ботом:

### Возможности
- **Dashboard** — общий обзор с метриками, графиком equity, открытыми позициями
- **Signals** — real-time лента торговых сигналов с фильтрами
- **Positions** — управление позициями (просмотр, редактирование SL/TP, закрытие)
- **News Feed** — лента новостей с sentiment analysis
- **Analytics** — подробная статистика производительности, trade journal
- **Settings** — настройка риск-менеджмента и стратегий

### Технологии
- **Backend**: Express.js + WebSocket для real-time обновлений
- **Frontend**: HTML/CSS/JavaScript (vanilla) с Chart.js
- **Storage**: In-memory (для демо)
- **API**: RESTful endpoints

### Запуск
```bash
npm run dashboard
# Откройте http://localhost:8080 в браузере
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

## База данных

Проект использует PostgreSQL для хранения данных и Redis для кеширования.

### Быстрый старт

```bash
# Запуск PostgreSQL и Redis через Docker
docker-compose up -d postgres redis

# Применение миграций
npm run db:migrate

# (Опционально) Заполнение тестовыми данными
npm run db:seed

# Тестирование подключения
npm run test:database

# Примеры использования
npm run example:database
```

### Структура базы данных

- **news** — новостные статьи из различных источников
- **social_posts** — посты из Twitter, Reddit, Telegram
- **signals** — торговые сигналы от различных анализаторов
- **trades** — история торговых позиций
- **candles** — OHLCV данные для технического анализа

Подробная документация: [src/database/README.md](src/database/README.md)

### Бекапы

```bash
# Создание бекапа
npm run db:backup create

# Восстановление из бекапа
npm run db:backup restore ./backups/backup_file.sql

# Бекап Redis
npm run db:backup redis
```

## Roadmap

- [x] Базовая архитектура проекта
- [x] Модуль сбора новостей
- [x] Sentiment анализ
- [x] Риск-менеджмент модуль
- [x] Торговые стратегии (News Momentum, Sentiment Swing)
- [x] Backtesting engine
- [x] База данных и хранение данных
- [x] Веб-интерфейс (Dashboard)
- [x] Paper trading режим
- [ ] Интеграция с биржами
- [ ] Production deployment

## Лицензия

MIT

## Disclaimer

Данное ПО предоставляется "как есть". Торговля криптовалютами связана с высокими рисками. Авторы не несут ответственности за финансовые потери.
