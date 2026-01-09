import { postgres } from '../postgres.js';
import type {
  NewsModel,
  NewsInsert,
  NewsUpdate,
  NewsFilter,
  PaginationOptions,
} from './types.js';

/**
 * News repository for database operations
 */
export class NewsRepository {
  /**
   * Create a news item
   */
  static async create(data: NewsInsert): Promise<NewsModel> {
    const query = `
      INSERT INTO news (
        source, title, content, url, published_at, collected_at,
        sentiment, impact, processed
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      data.source,
      data.title,
      data.content,
      data.url,
      data.published_at,
      data.collected_at,
      data.sentiment ?? null,
      data.impact ?? null,
      data.processed ?? false,
    ];

    const result = await postgres.query<NewsModel>(query, values);
    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to create news item');
    }
    return row;
  }

  /**
   * Create multiple news items
   */
  static async createMany(items: NewsInsert[]): Promise<NewsModel[]> {
    if (items.length === 0) return [];

    return postgres.transaction(async (client) => {
      const results: NewsModel[] = [];

      for (const item of items) {
        const query = `
          INSERT INTO news (
            source, title, content, url, published_at, collected_at,
            sentiment, impact, processed
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (url) DO NOTHING
          RETURNING *
        `;

        const values = [
          item.source,
          item.title,
          item.content,
          item.url,
          item.published_at,
          item.collected_at,
          item.sentiment ?? null,
          item.impact ?? null,
          item.processed ?? false,
        ];

        const result = await client.query<NewsModel>(query, values);
        const row = result.rows[0];
        if (row) {
          results.push(row);
        }
      }

      return results;
    });
  }

  /**
   * Find news by ID
   */
  static async findById(id: string): Promise<NewsModel | null> {
    const query = 'SELECT * FROM news WHERE id = $1';
    const result = await postgres.query<NewsModel>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find news by URL
   */
  static async findByUrl(url: string): Promise<NewsModel | null> {
    const query = 'SELECT * FROM news WHERE url = $1';
    const result = await postgres.query<NewsModel>(query, [url]);
    return result.rows[0] || null;
  }

  /**
   * Check if news exists by URL
   */
  static async existsByUrl(url: string): Promise<boolean> {
    const query = 'SELECT EXISTS(SELECT 1 FROM news WHERE url = $1)';
    const result = await postgres.query<{ exists: boolean }>(query, [url]);
    return result.rows[0].exists;
  }

  /**
   * Find news with filters and pagination
   */
  static async find(
    filter: NewsFilter = {},
    options: PaginationOptions = {},
  ): Promise<NewsModel[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    // Build WHERE clause
    if (filter.source) {
      conditions.push(`source = $${++paramCount}`);
      values.push(filter.source);
    }

    if (filter.processed !== undefined) {
      conditions.push(`processed = $${++paramCount}`);
      values.push(filter.processed);
    }

    if (filter.sentiment) {
      if (filter.sentiment.min !== undefined) {
        conditions.push(`sentiment >= $${++paramCount}`);
        values.push(filter.sentiment.min);
      }
      if (filter.sentiment.max !== undefined) {
        conditions.push(`sentiment <= $${++paramCount}`);
        values.push(filter.sentiment.max);
      }
    }

    if (filter.published_after) {
      conditions.push(`published_at >= $${++paramCount}`);
      values.push(filter.published_after);
    }

    if (filter.published_before) {
      conditions.push(`published_at <= $${++paramCount}`);
      values.push(filter.published_before);
    }

    if (filter.search) {
      conditions.push(
        `to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', $${++paramCount})`,
      );
      values.push(filter.search);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build ORDER BY clause
    const orderBy = options.orderBy || 'published_at';
    const orderDirection = options.orderDirection || 'DESC';

    // Build LIMIT and OFFSET
    const limit = options.limit || 100;
    const offset = options.offset || 0;

    const query = `
      SELECT * FROM news
      ${whereClause}
      ORDER BY ${orderBy} ${orderDirection}
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    values.push(limit, offset);

    const result = await postgres.query<NewsModel>(query, values);
    return result.rows;
  }

  /**
   * Count news with filters
   */
  static async count(filter: NewsFilter = {}): Promise<number> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (filter.source) {
      conditions.push(`source = $${++paramCount}`);
      values.push(filter.source);
    }

    if (filter.processed !== undefined) {
      conditions.push(`processed = $${++paramCount}`);
      values.push(filter.processed);
    }

    if (filter.sentiment) {
      if (filter.sentiment.min !== undefined) {
        conditions.push(`sentiment >= $${++paramCount}`);
        values.push(filter.sentiment.min);
      }
      if (filter.sentiment.max !== undefined) {
        conditions.push(`sentiment <= $${++paramCount}`);
        values.push(filter.sentiment.max);
      }
    }

    if (filter.published_after) {
      conditions.push(`published_at >= $${++paramCount}`);
      values.push(filter.published_after);
    }

    if (filter.published_before) {
      conditions.push(`published_at <= $${++paramCount}`);
      values.push(filter.published_before);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `SELECT COUNT(*) as count FROM news ${whereClause}`;
    const result = await postgres.query<{ count: string }>(query, values);
    const row = result.rows[0];
    return row ? parseInt(row.count, 10) : 0;
  }

  /**
   * Update news
   */
  static async update(id: string, data: NewsUpdate): Promise<NewsModel | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (data.sentiment !== undefined) {
      fields.push(`sentiment = $${++paramCount}`);
      values.push(data.sentiment);
    }

    if (data.impact !== undefined) {
      fields.push(`impact = $${++paramCount}`);
      values.push(data.impact);
    }

    if (data.processed !== undefined) {
      fields.push(`processed = $${++paramCount}`);
      values.push(data.processed);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const query = `
      UPDATE news
      SET ${fields.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    const result = await postgres.query<NewsModel>(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete news by ID
   */
  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM news WHERE id = $1';
    const result = await postgres.query(query, [id]);
    const rowCount = result.rowCount;
    return rowCount !== null && rowCount > 0;
  }

  /**
   * Delete old news before a certain date
   */
  static async deleteOlderThan(date: Date): Promise<number> {
    const query = 'DELETE FROM news WHERE published_at < $1';
    const result = await postgres.query(query, [date]);
    return result.rowCount ?? 0;
  }

  /**
   * Get unprocessed news
   */
  static async getUnprocessed(limit: number = 100): Promise<NewsModel[]> {
    return this.find({ processed: false }, { limit, orderBy: 'collected_at', orderDirection: 'ASC' });
  }

  /**
   * Mark news as processed
   */
  static async markAsProcessed(id: string, sentiment?: number): Promise<NewsModel | null> {
    return this.update(id, { processed: true, sentiment });
  }

  /**
   * Get news by source
   */
  static async getBySource(source: string, limit: number = 100): Promise<NewsModel[]> {
    return this.find({ source }, { limit });
  }

  /**
   * Get recent news
   */
  static async getRecent(limit: number = 100, offset: number = 0): Promise<NewsModel[]> {
    return this.find({}, { limit, offset, orderBy: 'published_at', orderDirection: 'DESC' });
  }
}
