import { randomUUID } from 'crypto';
import type { NewsItem, NewsSource, CollectionResult, DeduplicationOptions } from './types.js';

/**
 * Базовый класс для всех коллекторов новостей
 */
export abstract class BaseNewsCollector {
  protected source: NewsSource;
  protected seenUrls: Set<string>;
  protected seenTitles: Set<string>;

  constructor(source: NewsSource) {
    this.source = source;
    this.seenUrls = new Set();
    this.seenTitles = new Set();
  }

  /**
   * Абстрактный метод сбора новостей (должен быть реализован в наследниках)
   */
  abstract collect(): Promise<NewsItem[]>;

  /**
   * Запуск сбора новостей с обработкой ошибок и дедупликацией
   */
  async run(
    deduplicationOptions: DeduplicationOptions = {
      checkUrl: true,
      checkTitle: true,
    },
  ): Promise<CollectionResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let newsItems: NewsItem[] = [];
    let duplicatesSkipped = 0;

    try {
      console.info(`[${this.source}] Starting news collection...`);

      // Сбор новостей
      const rawNews = await this.collect();
      console.info(`[${this.source}] Collected ${rawNews.length} raw items`);

      // Дедупликация
      for (const item of rawNews) {
        if (this.isDuplicate(item, deduplicationOptions)) {
          duplicatesSkipped++;
          continue;
        }

        // Добавляем в список уникальных
        newsItems.push(item);

        // Запоминаем для дедупликации
        if (deduplicationOptions.checkUrl) {
          this.seenUrls.add(item.url);
        }
        if (deduplicationOptions.checkTitle) {
          this.seenTitles.add(this.normalizeTitle(item.title));
        }
      }

      const duration = Date.now() - startTime;
      console.info(
        `[${this.source}] Completed in ${duration}ms. ` +
          `Unique: ${newsItems.length}, Duplicates: ${duplicatesSkipped}`,
      );

      return {
        source: this.source,
        success: true,
        newsCount: newsItems.length,
        duplicatesSkipped,
        collectedAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[${this.source}] Collection failed:`, errorMessage);

      errors.push(errorMessage);

      return {
        source: this.source,
        success: false,
        newsCount: 0,
        duplicatesSkipped: 0,
        errors,
        collectedAt: new Date(),
      };
    }
  }

  /**
   * Проверка на дубликат
   */
  protected isDuplicate(item: NewsItem, options: DeduplicationOptions): boolean {
    if (options.checkUrl && this.seenUrls.has(item.url)) {
      return true;
    }

    if (options.checkTitle) {
      const normalizedTitle = this.normalizeTitle(item.title);

      if (this.seenTitles.has(normalizedTitle)) {
        return true;
      }

      // Проверка схожести заголовков (если указан порог)
      if (options.similarityThreshold !== undefined) {
        for (const seenTitle of this.seenTitles) {
          const similarity = this.calculateSimilarity(normalizedTitle, seenTitle);
          if (similarity >= options.similarityThreshold) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Нормализация заголовка для сравнения
   */
  protected normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Убираем пунктуацию
      .replace(/\s+/g, ' '); // Нормализуем пробелы
  }

  /**
   * Вычисление схожести двух строк (коэффициент Жаккара)
   */
  protected calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(' '));
    const words2 = new Set(str2.split(' '));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Создание базового объекта новости
   */
  protected createNewsItem(data: {
    title: string;
    content: string;
    url: string;
    publishedAt: Date;
    tags?: string[];
  }): NewsItem {
    return {
      id: randomUUID(),
      source: this.source,
      title: data.title,
      content: data.content,
      url: data.url,
      publishedAt: data.publishedAt,
      collectedAt: new Date(),
      tags: data.tags || [],
    };
  }

  /**
   * Очистка кеша дедупликации
   */
  clearCache(): void {
    this.seenUrls.clear();
    this.seenTitles.clear();
    console.info(`[${this.source}] Deduplication cache cleared`);
  }

  /**
   * Получение статистики кеша
   */
  getCacheStats(): { urls: number; titles: number } {
    return {
      urls: this.seenUrls.size,
      titles: this.seenTitles.size,
    };
  }
}
