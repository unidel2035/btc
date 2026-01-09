import { db } from './connection';
import { NewsItem, CollectorStats } from '../types/news';

/**
 * Repository for news items database operations
 */
export class NewsRepository {
  /**
   * Save a news item to database
   */
  async save(item: NewsItem): Promise<void> {
    const query = `
      INSERT INTO news_items (
        id, source, title, content, url, published_at, collected_at, tags, sentiment
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (url) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        sentiment = EXCLUDED.sentiment,
        updated_at = NOW()
    `;

    const values = [
      item.id,
      item.source,
      item.title,
      item.content,
      item.url,
      item.publishedAt,
      item.collectedAt,
      item.tags,
      item.sentiment,
    ];

    await db.query(query, values);
  }

  /**
   * Save multiple news items
   */
  async saveMany(items: NewsItem[]): Promise<number> {
    let saved = 0;
    for (const item of items) {
      try {
        await this.save(item);
        saved++;
      } catch (error) {
        console.error(`Failed to save item ${item.id}:`, error);
      }
    }
    return saved;
  }

  /**
   * Find news by URL
   */
  async findByUrl(url: string): Promise<NewsItem | null> {
    const query = 'SELECT * FROM news_items WHERE url = $1';
    const result = await db.query(query, [url]);
    return result.rows.length > 0 ? this.mapToNewsItem(result.rows[0]) : null;
  }

  /**
   * Find news by source
   */
  async findBySource(source: string, limit = 100): Promise<NewsItem[]> {
    const query = `
      SELECT * FROM news_items
      WHERE source = $1
      ORDER BY published_at DESC
      LIMIT $2
    `;
    const result = await db.query(query, [source, limit]);
    return result.rows.map(this.mapToNewsItem);
  }

  /**
   * Find recent news
   */
  async findRecent(limit = 100): Promise<NewsItem[]> {
    const query = `
      SELECT * FROM news_items
      ORDER BY published_at DESC
      LIMIT $1
    `;
    const result = await db.query(query, [limit]);
    return result.rows.map(this.mapToNewsItem);
  }

  /**
   * Find news by date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<NewsItem[]> {
    const query = `
      SELECT * FROM news_items
      WHERE published_at BETWEEN $1 AND $2
      ORDER BY published_at DESC
    `;
    const result = await db.query(query, [startDate, endDate]);
    return result.rows.map(this.mapToNewsItem);
  }

  /**
   * Find news by tags
   */
  async findByTags(tags: string[], limit = 100): Promise<NewsItem[]> {
    const query = `
      SELECT * FROM news_items
      WHERE tags && $1
      ORDER BY published_at DESC
      LIMIT $2
    `;
    const result = await db.query(query, [tags, limit]);
    return result.rows.map(this.mapToNewsItem);
  }

  /**
   * Get all URLs (for deduplication)
   */
  async getAllUrls(): Promise<string[]> {
    const query = 'SELECT url FROM news_items';
    const result = await db.query(query);
    return result.rows.map((row) => row.url);
  }

  /**
   * Get recent URLs (for deduplication cache)
   */
  async getRecentUrls(hours = 24): Promise<string[]> {
    const query = `
      SELECT url FROM news_items
      WHERE collected_at > NOW() - INTERVAL '${hours} hours'
    `;
    const result = await db.query(query);
    return result.rows.map((row) => row.url);
  }

  /**
   * Count total items
   */
  async count(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM news_items';
    const result = await db.query(query);
    return parseInt(result.rows[0].count);
  }

  /**
   * Count items by source
   */
  async countBySource(source: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM news_items WHERE source = $1';
    const result = await db.query(query, [source]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Delete old items
   */
  async deleteOlderThan(days: number): Promise<number> {
    const query = `
      DELETE FROM news_items
      WHERE published_at < NOW() - INTERVAL '${days} days'
    `;
    const result = await db.query(query);
    return result.rowCount || 0;
  }

  /**
   * Map database row to NewsItem
   */
  private mapToNewsItem(row: any): NewsItem {
    return {
      id: row.id,
      source: row.source,
      title: row.title,
      content: row.content,
      url: row.url,
      publishedAt: new Date(row.published_at),
      collectedAt: new Date(row.collected_at),
      tags: row.tags || [],
      sentiment: row.sentiment,
    };
  }
}

/**
 * Repository for collector statistics
 */
export class StatsRepository {
  /**
   * Save collector statistics
   */
  async save(stats: CollectorStats): Promise<void> {
    const query = `
      INSERT INTO collector_stats (
        source, items_collected, items_stored, duplicates_skipped, errors, last_run
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;

    const values = [
      stats.source,
      stats.itemsCollected,
      stats.itemsStored,
      stats.duplicatesSkipped,
      stats.errors,
      stats.lastRun,
    ];

    await db.query(query, values);
  }

  /**
   * Get latest stats for a source
   */
  async getLatest(source: string): Promise<CollectorStats | null> {
    const query = `
      SELECT * FROM collector_stats
      WHERE source = $1
      ORDER BY last_run DESC
      LIMIT 1
    `;
    const result = await db.query(query, [source]);
    return result.rows.length > 0 ? this.mapToStats(result.rows[0]) : null;
  }

  /**
   * Get all latest stats
   */
  async getAllLatest(): Promise<CollectorStats[]> {
    const query = `
      SELECT DISTINCT ON (source) *
      FROM collector_stats
      ORDER BY source, last_run DESC
    `;
    const result = await db.query(query);
    return result.rows.map(this.mapToStats);
  }

  /**
   * Map database row to CollectorStats
   */
  private mapToStats(row: any): CollectorStats {
    return {
      source: row.source,
      itemsCollected: row.items_collected,
      itemsStored: row.items_stored,
      duplicatesSkipped: row.duplicates_skipped,
      errors: row.errors,
      lastRun: new Date(row.last_run),
    };
  }
}

/**
 * Repository instances
 */
export const newsRepository = new NewsRepository();
export const statsRepository = new StatsRepository();
