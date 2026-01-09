import Parser from 'rss-parser';
import { BaseNewsCollector } from './base-collector';
import { NewsItem } from '../../types/news';

/**
 * Generic RSS feed collector
 */
export class RSSCollector extends BaseNewsCollector {
  public readonly source: string;
  private feedUrl: string;
  private parser: Parser;

  constructor(source: string, feedUrl: string, debug = false) {
    super(debug);
    this.source = source;
    this.feedUrl = feedUrl;
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'BTC-Trading-Bot/1.0',
      },
    });
  }

  /**
   * Collect news from RSS feed
   */
  async collect(): Promise<NewsItem[]> {
    try {
      this.log(`Fetching RSS feed from ${this.feedUrl}`);
      const feed = await this.parser.parseURL(this.feedUrl);
      const items: NewsItem[] = [];

      for (const item of feed.items) {
        if (!item.title || !item.link) {
          this.log('Skipping item without title or link');
          continue;
        }

        const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();
        const content = item.contentSnippet || item.content || item.summary || '';
        const tags = this.extractTags(`${item.title} ${content}`);

        const newsItem = this.createNewsItem({
          title: item.title,
          content: content,
          url: item.link,
          publishedAt: publishedAt,
          tags: tags,
        });

        items.push(newsItem);
      }

      this.log(`Collected ${items.length} items from RSS feed`);
      return items;
    } catch (error) {
      this.error('Failed to fetch RSS feed', error);
      return [];
    }
  }
}

/**
 * CoinDesk RSS Collector
 */
export class CoinDeskCollector extends RSSCollector {
  constructor(debug = false) {
    super('CoinDesk', 'https://www.coindesk.com/arc/outboundfeeds/rss/', debug);
  }
}

/**
 * CoinTelegraph RSS Collector
 */
export class CoinTelegraphCollector extends RSSCollector {
  constructor(debug = false) {
    super('CoinTelegraph', 'https://cointelegraph.com/rss', debug);
  }
}

/**
 * Bitcoin Magazine RSS Collector
 */
export class BitcoinMagazineCollector extends RSSCollector {
  constructor(debug = false) {
    super('Bitcoin Magazine', 'https://bitcoinmagazine.com/.rss/full/', debug);
  }
}
