# News Collector Module

Модуль сбора новостей из различных криптовалютных источников.

## Возможности

- ✅ **RSS парсинг** - Сбор новостей из RSS лент (CoinDesk, Bitcoin Magazine, Decrypt)
- ✅ **Веб-скрапинг** - Извлечение новостей с веб-сайтов (CoinTelegraph, The Block, CryptoNews)
- ✅ **Дедупликация** - Автоматическое удаление дубликатов по URL и заголовку
- ✅ **Нормализация данных** - Единый формат для всех источников
- ✅ **Планировщик** - Автоматический сбор новостей по расписанию (каждые 5 минут)
- ✅ **In-memory хранилище** - Встроенное хранилище для разработки и тестирования
- ✅ **PostgreSQL схема** - Готовая SQL схема для production

## Архитектура

```
src/collectors/news/
├── types.ts                 # TypeScript типы и интерфейсы
├── config.ts                # Конфигурация источников
├── BaseCollector.ts         # Базовый класс коллектора
├── RSSCollector.ts          # RSS парсер
├── WebScraper.ts            # Веб-скрапер
├── storage.ts               # Интерфейс хранилища
├── NewsCollectorManager.ts  # Менеджер коллекторов
└── index.ts                 # Экспорты модуля
```

## Источники данных

### RSS источники
- **CoinDesk** - https://www.coindesk.com/arc/outboundfeeds/rss/
- **Bitcoin Magazine** - https://bitcoinmagazine.com/.rss/full/
- **Decrypt** - https://decrypt.co/feed

### Web Scraper источники
- **CoinTelegraph** - https://cointelegraph.com/tags/bitcoin
- **The Block** - https://www.theblock.co/latest
- **CryptoNews** - https://cryptonews.com/

## Использование

### Базовое использование

```typescript
import { NewsCollectorManager } from './collectors/news';

// Создание менеджера
const manager = new NewsCollectorManager();

// Инициализация коллекторов
manager.initialize();

// Однократный сбор новостей
await manager.collectAll();

// Запуск планировщика для периодического сбора
manager.startScheduler();

// Остановка планировщика
manager.stopScheduler();

// Очистка ресурсов
await manager.cleanup();
```

### Работа с хранилищем

```typescript
import { InMemoryNewsStorage } from './collectors/news';

// Создание хранилища
const storage = new InMemoryNewsStorage();

// Получение последних новостей
const recent = await storage.getRecent(10);

// Фильтрация по источнику
const coindesk = await storage.getBySource('coindesk', 20);

// Проверка существования по URL
const exists = await storage.existsByUrl('https://...');

// Статистика
const stats = storage.getStats();
```

### Использование отдельных коллекторов

```typescript
import { RSSCollector, WebScraper, NewsSource } from './collectors/news';

// RSS коллектор
const rssCollector = new RSSCollector(
  NewsSource.COINDESK,
  'https://www.coindesk.com/arc/outboundfeeds/rss/'
);

const result = await rssCollector.run({
  checkUrl: true,
  checkTitle: true,
  similarityThreshold: 0.8,
});

// Web скрапер
const scraper = new WebScraper(NewsSource.COINTELEGRAPH, {
  url: 'https://cointelegraph.com/tags/bitcoin',
  selectors: {
    article: 'article.post-card',
    title: '.post-card__title',
    content: '.post-card__text',
    link: 'a.post-card__link',
    date: '.post-card__date',
  },
});

const news = await scraper.collect();
await scraper.closeBrowser();
```

## CLI команды

```bash
# Запуск сбора новостей
npm run collect

# Запуск тестов
npm run test

# Пример использования
npm run example:news
```

## Переменные окружения

```env
# Включить планировщик для автоматического сбора
ENABLE_NEWS_SCHEDULER=false
```

## Структура данных

```typescript
interface NewsItem {
  id: string;              // Уникальный идентификатор
  source: string;          // Источник новости
  title: string;           // Заголовок
  content: string;         // Содержание
  url: string;             // Ссылка на оригинал
  publishedAt: Date;       // Дата публикации
  collectedAt: Date;       // Дата сбора
  tags: string[];          // Теги
  sentiment?: number;      // Настроение (опционально)
}
```

## Результат сбора

```typescript
interface CollectionResult {
  source: NewsSource;      // Источник
  success: boolean;        // Успешность сбора
  newsCount: number;       // Количество собранных новостей
  duplicatesSkipped: number; // Пропущено дубликатов
  errors?: string[];       // Ошибки (если были)
  collectedAt: Date;       // Время сбора
}
```

## Дедупликация

Модуль поддерживает несколько уровней дедупликации:

1. **По URL** - Проверка уникальности ссылки
2. **По заголовку** - Нормализация и сравнение заголовков
3. **По схожести** - Вычисление коэффициента Жаккара для заголовков

```typescript
const options = {
  checkUrl: true,           // Проверять URL
  checkTitle: true,         // Проверять заголовок
  similarityThreshold: 0.8, // Порог схожести (0-1)
};

await collector.run(options);
```

## База данных

### PostgreSQL схема

```sql
CREATE TABLE IF NOT EXISTS news (
  id VARCHAR(36) PRIMARY KEY,
  source VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  published_at TIMESTAMPTZ NOT NULL,
  collected_at TIMESTAMPTZ NOT NULL,
  tags TEXT[] DEFAULT '{}',
  sentiment REAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_news_source ON news(source);
CREATE INDEX idx_news_published_at ON news(published_at DESC);
CREATE INDEX idx_news_url ON news(url);
```

## Расширение

### Добавление нового RSS источника

```typescript
// В config.ts
{
  name: NewsSource.NEW_SOURCE,
  type: CollectorType.RSS,
  url: 'https://example.com/rss',
  enabled: true,
  updateInterval: 5,
  tags: ['crypto', 'news'],
}
```

### Добавление нового веб-скрапера

```typescript
// В config.ts - источник
{
  name: NewsSource.NEW_SOURCE,
  type: CollectorType.SCRAPER,
  url: 'https://example.com/news',
  enabled: true,
  updateInterval: 5,
  selector: 'article',
}

// В config.ts - селекторы
[NewsSource.NEW_SOURCE]: {
  article: 'article',
  title: '.title',
  content: '.content',
  link: 'a',
  date: '.date',
}
```

## Acceptance Criteria ✅

- ✅ Сбор новостей из минимум 5 источников (6 реализовано)
- ✅ Обновление каждые 5 минут (настраиваемый интервал)
- ✅ Дедупликация по URL и заголовку

## TODO

- [ ] PostgreSQL адаптер для хранилища
- [ ] Sentiment анализ новостей
- [ ] Извлечение entities (монеты, биржи, люди)
- [ ] Webhook уведомления о важных новостях
- [ ] Rate limiting для скраперов
- [ ] Прокси-поддержка для веб-скрапинга
