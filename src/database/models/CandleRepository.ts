import { postgres } from '../postgres.js';
import type {
  CandleModel,
  CandleInsert,
  CandleFilter,
  PaginationOptions,
} from './types.js';

/**
 * Candle repository for database operations
 */
export class CandleRepository {
  /**
   * Create a candle
   */
  static async create(data: CandleInsert): Promise<CandleModel> {
    const query = `
      INSERT INTO candles (
        symbol, interval, open_time, open, high, low, close, volume,
        close_time, quote_volume, trades_count
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (symbol, interval, open_time) DO UPDATE
      SET open = EXCLUDED.open,
          high = EXCLUDED.high,
          low = EXCLUDED.low,
          close = EXCLUDED.close,
          volume = EXCLUDED.volume,
          close_time = EXCLUDED.close_time,
          quote_volume = EXCLUDED.quote_volume,
          trades_count = EXCLUDED.trades_count
      RETURNING *
    `;

    const values = [
      data.symbol,
      data.interval,
      data.open_time,
      data.open,
      data.high,
      data.low,
      data.close,
      data.volume,
      data.close_time,
      data.quote_volume ?? null,
      data.trades_count ?? null,
    ];

    const result = await postgres.query<CandleModel>(query, values);
    if (!result.rows[0]) throw new Error('Failed to create candle'); return result.rows[0];
  }

  /**
   * Create multiple candles (upsert)
   */
  static async createMany(items: CandleInsert[]): Promise<CandleModel[]> {
    if (items.length === 0) return [];

    return postgres.transaction(async (client) => {
      const results: CandleModel[] = [];

      for (const item of items) {
        const query = `
          INSERT INTO candles (
            symbol, interval, open_time, open, high, low, close, volume,
            close_time, quote_volume, trades_count
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (symbol, interval, open_time) DO UPDATE
          SET open = EXCLUDED.open,
              high = EXCLUDED.high,
              low = EXCLUDED.low,
              close = EXCLUDED.close,
              volume = EXCLUDED.volume,
              close_time = EXCLUDED.close_time,
              quote_volume = EXCLUDED.quote_volume,
              trades_count = EXCLUDED.trades_count
          RETURNING *
        `;

        const values = [
          item.symbol,
          item.interval,
          item.open_time,
          item.open,
          item.high,
          item.low,
          item.close,
          item.volume,
          item.close_time,
          item.quote_volume ?? null,
          item.trades_count ?? null,
        ];

        const result = await client.query<CandleModel>(query, values);
        results.push(result.rows[0]);
      }

      return results;
    });
  }

  /**
   * Find candle by primary key
   */
  static async findOne(
    symbol: string,
    interval: string,
    openTime: Date,
  ): Promise<CandleModel | null> {
    const query = 'SELECT * FROM candles WHERE symbol = $1 AND interval = $2 AND open_time = $3';
    const result = await postgres.query<CandleModel>(query, [symbol, interval, openTime]);
    return result.rows[0] || null;
  }

  /**
   * Find candles with filters and pagination
   */
  static async find(
    filter: CandleFilter,
    options: PaginationOptions = {},
  ): Promise<CandleModel[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    // Symbol and interval are required
    conditions.push(`symbol = $${++paramCount}`);
    values.push(filter.symbol);

    conditions.push(`interval = $${++paramCount}`);
    values.push(filter.interval);

    // Optional time range filters
    if (filter.open_time_after) {
      conditions.push(`open_time >= $${++paramCount}`);
      values.push(filter.open_time_after);
    }

    if (filter.open_time_before) {
      conditions.push(`open_time <= $${++paramCount}`);
      values.push(filter.open_time_before);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Build ORDER BY clause
    const orderBy = options.orderBy || 'open_time';
    const orderDirection = options.orderDirection || 'ASC';

    // Build LIMIT and OFFSET
    const limit = options.limit || 1000;
    const offset = options.offset || 0;

    const query = `
      SELECT * FROM candles
      ${whereClause}
      ORDER BY ${orderBy} ${orderDirection}
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    values.push(limit, offset);

    const result = await postgres.query<CandleModel>(query, values);
    return result.rows;
  }

  /**
   * Count candles with filters
   */
  static async count(filter: CandleFilter): Promise<number> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    conditions.push(`symbol = $${++paramCount}`);
    values.push(filter.symbol);

    conditions.push(`interval = $${++paramCount}`);
    values.push(filter.interval);

    if (filter.open_time_after) {
      conditions.push(`open_time >= $${++paramCount}`);
      values.push(filter.open_time_after);
    }

    if (filter.open_time_before) {
      conditions.push(`open_time <= $${++paramCount}`);
      values.push(filter.open_time_before);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const query = `SELECT COUNT(*) as count FROM candles ${whereClause}`;
    const result = await postgres.query<{ count: string }>(query, values);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Delete candles by primary key
   */
  static async delete(symbol: string, interval: string, openTime: Date): Promise<boolean> {
    const query = 'DELETE FROM candles WHERE symbol = $1 AND interval = $2 AND open_time = $3';
    const result = await postgres.query(query, [symbol, interval, openTime]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Delete old candles before a certain date
   */
  static async deleteOlderThan(symbol: string, interval: string, date: Date): Promise<number> {
    const query =
      'DELETE FROM candles WHERE symbol = $1 AND interval = $2 AND open_time < $3';
    const result = await postgres.query(query, [symbol, interval, date]);
    return result.rowCount ?? 0;
  }

  /**
   * Get recent candles
   */
  static async getRecent(
    symbol: string,
    interval: string,
    limit: number = 100,
  ): Promise<CandleModel[]> {
    return this.find({ symbol, interval }, { limit, orderDirection: 'DESC' });
  }

  /**
   * Get candles in time range
   */
  static async getInRange(
    symbol: string,
    interval: string,
    startTime: Date,
    endTime: Date,
  ): Promise<CandleModel[]> {
    return this.find({
      symbol,
      interval,
      open_time_after: startTime,
      open_time_before: endTime,
    });
  }

  /**
   * Get latest candle
   */
  static async getLatest(symbol: string, interval: string): Promise<CandleModel | null> {
    const candles = await this.find({ symbol, interval }, { limit: 1, orderDirection: 'DESC' });
    return candles[0] || null;
  }

  /**
   * Get available symbols
   */
  static async getSymbols(): Promise<string[]> {
    const query = 'SELECT DISTINCT symbol FROM candles ORDER BY symbol';
    const result = await postgres.query<{ symbol: string }>(query);
    return result.rows.map((row) => row.symbol);
  }

  /**
   * Get available intervals for a symbol
   */
  static async getIntervals(symbol: string): Promise<string[]> {
    const query = 'SELECT DISTINCT interval FROM candles WHERE symbol = $1 ORDER BY interval';
    const result = await postgres.query<{ interval: string }>(query, [symbol]);
    return result.rows.map((row) => row.interval);
  }
}
