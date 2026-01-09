import { chromium, type Browser, type Page } from 'playwright';
import { BaseNewsCollector } from './BaseCollector.js';
import type { NewsItem, NewsSource } from './types.js';

interface ScraperConfig {
  url: string;
  selectors: {
    article: string;
    title: string;
    content: string;
    link: string;
    date?: string;
  };
}

/**
 * Коллектор новостей через веб-скрапинг
 */
export class WebScraper extends BaseNewsCollector {
  private config: ScraperConfig;
  private browser: Browser | null = null;

  constructor(source: NewsSource, config: ScraperConfig) {
    super(source);
    this.config = config;
  }

  /**
   * Инициализация браузера
   */
  private async initBrowser(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
  }

  /**
   * Закрытие браузера
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Сбор новостей через скрапинг
   */
  async collect(): Promise<NewsItem[]> {
    await this.initBrowser();

    if (!this.browser) {
      throw new Error('Failed to initialize browser');
    }

    const page = await this.browser.newPage();
    const newsItems: NewsItem[] = [];

    try {
      // Устанавливаем User-Agent
      await page.setExtraHTTPHeaders({
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      // Переходим на страницу
      await page.goto(this.config.url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Ждем появления статей
      await page.waitForSelector(this.config.selectors.article, {
        timeout: 10000,
      });

      // Извлекаем данные
      const articles = await page.$$(this.config.selectors.article);

      console.info(`[${this.source}] Found ${articles.length} articles on page`);

      for (const article of articles) {
        try {
          const newsItem = await this.extractArticle(page, article);
          if (newsItem) {
            newsItems.push(newsItem);
          }
        } catch (error) {
          console.warn(
            `[${this.source}] Failed to extract article:`,
            error instanceof Error ? error.message : error,
          );
        }
      }
    } finally {
      await page.close();
    }

    return newsItems;
  }

  /**
   * Извлечение данных статьи
   */
  private async extractArticle(_page: Page, articleElement: any): Promise<NewsItem | null> {
    try {
      // Заголовок
      const titleElement = await articleElement.$(this.config.selectors.title);
      const title = titleElement ? await titleElement.textContent() : null;

      if (!title) {
        return null;
      }

      // Ссылка
      const linkElement = await articleElement.$(this.config.selectors.link);
      let url = linkElement ? await linkElement.getAttribute('href') : null;

      if (!url) {
        return null;
      }

      // Преобразуем относительную ссылку в абсолютную
      if (!url.startsWith('http')) {
        const baseUrl = new URL(this.config.url);
        url = new URL(url, baseUrl.origin).href;
      }

      // Контент
      const contentElement = await articleElement.$(this.config.selectors.content);
      const content = contentElement ? await contentElement.textContent() : '';

      // Дата публикации
      let publishedAt = new Date();
      if (this.config.selectors.date) {
        const dateElement = await articleElement.$(this.config.selectors.date);
        if (dateElement) {
          const dateText = await dateElement.textContent();
          if (dateText) {
            publishedAt = this.parseDate(dateText);
          }
        }
      }

      return this.createNewsItem({
        title: title.trim(),
        content: content?.trim() || '',
        url,
        publishedAt,
        tags: [],
      });
    } catch (error) {
      console.error(`[${this.source}] Error extracting article:`, error);
      return null;
    }
  }

  /**
   * Парсинг даты из текста
   */
  private parseDate(dateText: string): Date {
    // Удаляем лишние пробелы
    const cleaned = dateText.trim();

    // Пробуем стандартный парсинг
    const parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    // Обработка относительных дат
    const now = new Date();

    // "X hours ago"
    const hoursMatch = cleaned.match(/(\d+)\s*hours?\s*ago/i);
    if (hoursMatch) {
      const hours = parseInt(hoursMatch[1] ?? '0', 10);
      return new Date(now.getTime() - hours * 60 * 60 * 1000);
    }

    // "X minutes ago"
    const minutesMatch = cleaned.match(/(\d+)\s*minutes?\s*ago/i);
    if (minutesMatch) {
      const minutes = parseInt(minutesMatch[1] ?? '0', 10);
      return new Date(now.getTime() - minutes * 60 * 1000);
    }

    // "X days ago"
    const daysMatch = cleaned.match(/(\d+)\s*days?\s*ago/i);
    if (daysMatch) {
      const days = parseInt(daysMatch[1] ?? '0', 10);
      return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }

    // Fallback на текущую дату
    return now;
  }
}
