import type { NewsItem } from './types.js';

/**
 * Интерфейс для хранилища новостей
 */
export interface NewsStorage {
  /**
   * Сохранить новость
   */
  save(news: NewsItem): Promise<void>;

  /**
   * Сохранить несколько новостей
   */
  saveMany(news: NewsItem[]): Promise<void>;

  /**
   * Получить новость по ID
   */
  getById(id: string): Promise<NewsItem | null>;

  /**
   * Проверить существование новости по URL
   */
  existsByUrl(url: string): Promise<boolean>;

  /**
   * Получить последние новости
   */
  getRecent(limit: number, offset?: number): Promise<NewsItem[]>;

  /**
   * Получить новости по источнику
   */
  getBySource(source: string, limit: number): Promise<NewsItem[]>;

  /**
   * Получить новости за период
   */
  getByDateRange(from: Date, to: Date): Promise<NewsItem[]>;

  /**
   * Получить количество новостей
   */
  count(): Promise<number>;

  /**
   * Удалить старые новости
   */
  deleteOlderThan(date: Date): Promise<number>;
}

/**
 * In-memory хранилище новостей (для разработки и тестирования)
 */
export class InMemoryNewsStorage implements NewsStorage {
  private news: Map<string, NewsItem>;
  private urlIndex: Map<string, string>; // url -> id

  constructor() {
    this.news = new Map();
    this.urlIndex = new Map();
  }

  async save(newsItem: NewsItem): Promise<void> {
    this.news.set(newsItem.id, newsItem);
    this.urlIndex.set(newsItem.url, newsItem.id);
  }

  async saveMany(newsItems: NewsItem[]): Promise<void> {
    for (const item of newsItems) {
      await this.save(item);
    }
  }

  async getById(id: string): Promise<NewsItem | null> {
    return this.news.get(id) || null;
  }

  async existsByUrl(url: string): Promise<boolean> {
    return this.urlIndex.has(url);
  }

  async getRecent(limit: number, offset: number = 0): Promise<NewsItem[]> {
    const allNews = Array.from(this.news.values());

    // Сортируем по дате публикации (новые первыми)
    allNews.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

    return allNews.slice(offset, offset + limit);
  }

  async getBySource(source: string, limit: number): Promise<NewsItem[]> {
    const filtered = Array.from(this.news.values()).filter((n) => n.source === source);

    // Сортируем по дате публикации
    filtered.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

    return filtered.slice(0, limit);
  }

  async getByDateRange(from: Date, to: Date): Promise<NewsItem[]> {
    const filtered = Array.from(this.news.values()).filter(
      (n) => n.publishedAt >= from && n.publishedAt <= to,
    );

    // Сортируем по дате публикации
    filtered.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

    return filtered;
  }

  async count(): Promise<number> {
    return this.news.size;
  }

  async deleteOlderThan(date: Date): Promise<number> {
    let deleted = 0;

    for (const [id, item] of this.news.entries()) {
      if (item.publishedAt < date) {
        this.news.delete(id);
        this.urlIndex.delete(item.url);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Очистить все данные
   */
  clear(): void {
    this.news.clear();
    this.urlIndex.clear();
  }

  /**
   * Получить статистику хранилища
   */
  getStats(): {
    total: number;
    bySource: Record<string, number>;
  } {
    const bySource: Record<string, number> = {};

    for (const item of this.news.values()) {
      bySource[item.source] = (bySource[item.source] || 0) + 1;
    }

    return {
      total: this.news.size,
      bySource,
    };
  }
}

/**
 * SQL схема для PostgreSQL
 */
export const NEWS_TABLE_SCHEMA = `
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

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_news_source ON news(source);
CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_collected_at ON news(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_url ON news(url);

-- Индекс для полнотекстового поиска
CREATE INDEX IF NOT EXISTS idx_news_title_content ON news
  USING gin(to_tsvector('english', title || ' ' || content));
`;
