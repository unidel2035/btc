import { chromium, Browser, Page } from 'playwright';
import { BaseNewsCollector } from './base-collector';
import { NewsItem } from '../../types/news';
import * as cheerio from 'cheerio';

/**
 * Base web scraper collector using Playwright
 */
export abstract class ScraperCollector extends BaseNewsCollector {
  protected browser: Browser | null = null;
  protected page: Page | null = null;

  /**
   * Initialize browser and page
   */
  protected async initBrowser(): Promise<void> {
    if (!this.browser) {
      this.log('Launching browser...');
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      this.page = await this.browser.newPage();
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
    }
  }

  /**
   * Close browser
   */
  protected async closeBrowser(): Promise<void> {
    if (this.browser) {
      this.log('Closing browser...');
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * Parse date from various formats
   */
  protected parseDate(dateString: string): Date {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? new Date() : date;
  }
}

/**
 * The Block scraper
 */
export class TheBlockCollector extends ScraperCollector {
  public readonly source = 'The Block';

  async collect(): Promise<NewsItem[]> {
    try {
      await this.initBrowser();
      if (!this.page) {
        throw new Error('Failed to initialize browser');
      }

      this.log('Navigating to The Block...');
      await this.page.goto('https://www.theblock.co/latest', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      await this.page.waitForTimeout(2000);

      const content = await this.page.content();
      const $ = cheerio.load(content);
      const items: NewsItem[] = [];

      // The Block uses article cards
      $('article').each((_, element) => {
        const $article = $(element);
        const title = $article.find('h2, h3, .headline').first().text().trim();
        const link = $article.find('a').first().attr('href');
        const summary = $article.find('p, .summary').first().text().trim();
        const dateStr = $article.find('time').attr('datetime') || new Date().toISOString();

        if (title && link) {
          const url = link.startsWith('http') ? link : `https://www.theblock.co${link}`;
          const tags = this.extractTags(`${title} ${summary}`);

          items.push(
            this.createNewsItem({
              title,
              content: summary || title,
              url,
              publishedAt: this.parseDate(dateStr),
              tags,
            })
          );
        }
      });

      this.log(`Collected ${items.length} items from The Block`);
      return items.slice(0, 20); // Limit to recent 20 items
    } catch (error) {
      this.error('Failed to scrape The Block', error);
      return [];
    } finally {
      await this.closeBrowser();
    }
  }
}

/**
 * CryptoNews scraper
 */
export class CryptoNewsCollector extends ScraperCollector {
  public readonly source = 'CryptoNews';

  async collect(): Promise<NewsItem[]> {
    try {
      await this.initBrowser();
      if (!this.page) {
        throw new Error('Failed to initialize browser');
      }

      this.log('Navigating to CryptoNews...');
      await this.page.goto('https://cryptonews.com/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      await this.page.waitForTimeout(2000);

      const content = await this.page.content();
      const $ = cheerio.load(content);
      const items: NewsItem[] = [];

      // CryptoNews uses article listings
      $('.article, .post, article').each((_, element) => {
        const $article = $(element);
        const title = $article.find('h2, h3, .title, .article-title').first().text().trim();
        const link = $article.find('a').first().attr('href');
        const summary = $article.find('p, .excerpt, .description').first().text().trim();
        const dateStr = $article.find('time').attr('datetime') ||
                       $article.find('.date, .time').text() ||
                       new Date().toISOString();

        if (title && link) {
          const url = link.startsWith('http') ? link : `https://cryptonews.com${link}`;
          const tags = this.extractTags(`${title} ${summary}`);

          items.push(
            this.createNewsItem({
              title,
              content: summary || title,
              url,
              publishedAt: this.parseDate(dateStr),
              tags,
            })
          );
        }
      });

      this.log(`Collected ${items.length} items from CryptoNews`);
      return items.slice(0, 20);
    } catch (error) {
      this.error('Failed to scrape CryptoNews', error);
      return [];
    } finally {
      await this.closeBrowser();
    }
  }
}

/**
 * Decrypt scraper
 */
export class DecryptCollector extends ScraperCollector {
  public readonly source = 'Decrypt';

  async collect(): Promise<NewsItem[]> {
    try {
      await this.initBrowser();
      if (!this.page) {
        throw new Error('Failed to initialize browser');
      }

      this.log('Navigating to Decrypt...');
      await this.page.goto('https://decrypt.co/news', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      await this.page.waitForTimeout(2000);

      const content = await this.page.content();
      const $ = cheerio.load(content);
      const items: NewsItem[] = [];

      // Decrypt uses article cards
      $('article, .post-item, .article-card').each((_, element) => {
        const $article = $(element);
        const title = $article.find('h2, h3, .post-title, .article-title').first().text().trim();
        const link = $article.find('a').first().attr('href');
        const summary = $article.find('p, .excerpt, .description').first().text().trim();
        const dateStr = $article.find('time').attr('datetime') ||
                       $article.find('.date, .timestamp').text() ||
                       new Date().toISOString();

        if (title && link) {
          const url = link.startsWith('http') ? link : `https://decrypt.co${link}`;
          const tags = this.extractTags(`${title} ${summary}`);

          items.push(
            this.createNewsItem({
              title,
              content: summary || title,
              url,
              publishedAt: this.parseDate(dateStr),
              tags,
            })
          );
        }
      });

      this.log(`Collected ${items.length} items from Decrypt`);
      return items.slice(0, 20);
    } catch (error) {
      this.error('Failed to scrape Decrypt', error);
      return [];
    } finally {
      await this.closeBrowser();
    }
  }
}
