import Parser from 'rss-parser';
import { BaseNewsCollector } from './BaseCollector.js';
import type { NewsItem, NewsSource } from './types.js';

/**
 * Коллектор новостей из RSS лент
 */
export class RSSCollector extends BaseNewsCollector {
  private rssUrl: string;
  private parser: Parser;

  constructor(source: NewsSource, rssUrl: string) {
    super(source);
    this.rssUrl = rssUrl;
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'BTC-Trading-Bot/1.0',
      },
    });
  }

  /**
   * Сбор новостей из RSS ленты
   */
  async collect(): Promise<NewsItem[]> {
    const feed = await this.parser.parseURL(this.rssUrl);
    const newsItems: NewsItem[] = [];

    if (!feed.items) {
      console.warn(`[${this.source}] No items in RSS feed`);
      return newsItems;
    }

    for (const item of feed.items) {
      // Пропускаем записи без обязательных полей
      if (!item.title || !item.link) {
        continue;
      }

      // Парсим дату публикации
      let publishedAt = new Date();
      if (item.pubDate) {
        publishedAt = new Date(item.pubDate);
      } else if (item.isoDate) {
        publishedAt = new Date(item.isoDate);
      }

      // Извлекаем контент
      const content = this.extractContent(item);

      // Извлекаем теги
      const tags = this.extractTags(item);

      newsItems.push(
        this.createNewsItem({
          title: item.title,
          content,
          url: item.link,
          publishedAt,
          tags,
        }),
      );
    }

    return newsItems;
  }

  /**
   * Извлечение контента из RSS записи
   */
  private extractContent(item: Parser.Item): string {
    // Пробуем разные поля контента
    if (item.content) {
      return this.stripHtml(item.content);
    }

    if (item.contentSnippet) {
      return item.contentSnippet;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemAny = item as any;
    if (itemAny['content:encoded']) {
      return this.stripHtml(itemAny['content:encoded'] as string);
    }

    if (item.summary) {
      return this.stripHtml(item.summary);
    }

    // Fallback на description
    return itemAny.description ? this.stripHtml(itemAny.description) : '';
  }

  /**
   * Извлечение тегов из RSS записи
   */
  private extractTags(item: Parser.Item): string[] {
    const tags: string[] = [];

    // Из категорий
    if (item.categories) {
      tags.push(...item.categories);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemAny = item as any;

    // Из Dublin Core terms
    if (itemAny['dc:subject']) {
      const subjects = Array.isArray(itemAny['dc:subject'])
        ? itemAny['dc:subject']
        : [itemAny['dc:subject']];
      tags.push(...(subjects as string[]));
    }

    // Из media:keywords
    if (itemAny['media:keywords']) {
      const keywords = (itemAny['media:keywords'] as string).split(',');
      tags.push(...keywords.map((k) => k.trim()));
    }

    return [...new Set(tags)]; // Убираем дубликаты
  }

  /**
   * Удаление HTML тегов из текста
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Убираем HTML теги
      .replace(/&nbsp;/g, ' ') // Заменяем &nbsp; на пробел
      .replace(/&amp;/g, '&') // Декодируем &
      .replace(/&lt;/g, '<') // Декодируем <
      .replace(/&gt;/g, '>') // Декодируем >
      .replace(/&quot;/g, '"') // Декодируем "
      .replace(/&#39;/g, "'") // Декодируем '
      .replace(/\s+/g, ' ') // Нормализуем пробелы
      .trim();
  }
}
