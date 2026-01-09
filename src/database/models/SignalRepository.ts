import { postgres } from '../postgres.js';
import type {
  SignalModel,
  SignalInsert,
  SignalFilter,
  PaginationOptions,
} from './types.js';

/**
 * Signal repository for database operations
 */
export class SignalRepository {
  /**
   * Create a signal
   */
  static async create(data: SignalInsert): Promise<SignalModel> {
    const query = `
      INSERT INTO signals (type, source, symbol, direction, strength, data)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      data.type,
      data.source,
      data.symbol,
      data.direction,
      data.strength,
      data.data ? JSON.stringify(data.data) : null,
    ];

    const result = await postgres.query<SignalModel>(query, values);
    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to create signal');
    }
    return row;
  }

  /**
   * Create multiple signals
   */
  static async createMany(items: SignalInsert[]): Promise<SignalModel[]> {
    if (items.length === 0) return [];

    return postgres.transaction(async (client) => {
      const results: SignalModel[] = [];

      for (const item of items) {
        const query = `
          INSERT INTO signals (type, source, symbol, direction, strength, data)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;

        const values = [
          item.type,
          item.source,
          item.symbol,
          item.direction,
          item.strength,
          item.data ? JSON.stringify(item.data) : null,
        ];

        const result = await client.query<SignalModel>(query, values);
        const row = result.rows[0];
        if (row) {
          results.push(row);
        }
      }

      return results;
    });
  }

  /**
   * Find signal by ID
   */
  static async findById(id: string): Promise<SignalModel | null> {
    const query = 'SELECT * FROM signals WHERE id = $1';
    const result = await postgres.query<SignalModel>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find signals with filters and pagination
   */
  static async find(
    filter: SignalFilter = {},
    options: PaginationOptions = {},
  ): Promise<SignalModel[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    // Build WHERE clause
    if (filter.type) {
      conditions.push(`type = $${++paramCount}`);
      values.push(filter.type);
    }

    if (filter.source) {
      conditions.push(`source = $${++paramCount}`);
      values.push(filter.source);
    }

    if (filter.symbol) {
      conditions.push(`symbol = $${++paramCount}`);
      values.push(filter.symbol);
    }

    if (filter.direction) {
      conditions.push(`direction = $${++paramCount}`);
      values.push(filter.direction);
    }

    if (filter.strength_min !== undefined) {
      conditions.push(`strength >= $${++paramCount}`);
      values.push(filter.strength_min);
    }

    if (filter.created_after) {
      conditions.push(`created_at >= $${++paramCount}`);
      values.push(filter.created_after);
    }

    if (filter.created_before) {
      conditions.push(`created_at <= $${++paramCount}`);
      values.push(filter.created_before);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build ORDER BY clause
    const orderBy = options.orderBy || 'created_at';
    const orderDirection = options.orderDirection || 'DESC';

    // Build LIMIT and OFFSET
    const limit = options.limit || 100;
    const offset = options.offset || 0;

    const query = `
      SELECT * FROM signals
      ${whereClause}
      ORDER BY ${orderBy} ${orderDirection}
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    values.push(limit, offset);

    const result = await postgres.query<SignalModel>(query, values);
    return result.rows;
  }

  /**
   * Count signals with filters
   */
  static async count(filter: SignalFilter = {}): Promise<number> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (filter.type) {
      conditions.push(`type = $${++paramCount}`);
      values.push(filter.type);
    }

    if (filter.source) {
      conditions.push(`source = $${++paramCount}`);
      values.push(filter.source);
    }

    if (filter.symbol) {
      conditions.push(`symbol = $${++paramCount}`);
      values.push(filter.symbol);
    }

    if (filter.direction) {
      conditions.push(`direction = $${++paramCount}`);
      values.push(filter.direction);
    }

    if (filter.strength_min !== undefined) {
      conditions.push(`strength >= $${++paramCount}`);
      values.push(filter.strength_min);
    }

    if (filter.created_after) {
      conditions.push(`created_at >= $${++paramCount}`);
      values.push(filter.created_after);
    }

    if (filter.created_before) {
      conditions.push(`created_at <= $${++paramCount}`);
      values.push(filter.created_before);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `SELECT COUNT(*) as count FROM signals ${whereClause}`;
    const result = await postgres.query<{ count: string }>(query, values);
    const row = result.rows[0];
    return row ? parseInt(row.count, 10) : 0;
  }

  /**
   * Delete signal by ID
   */
  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM signals WHERE id = $1';
    const result = await postgres.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Delete old signals before a certain date
   */
  static async deleteOlderThan(date: Date): Promise<number> {
    const query = 'DELETE FROM signals WHERE created_at < $1';
    const result = await postgres.query(query, [date]);
    return result.rowCount ?? 0;
  }

  /**
   * Get recent signals
   */
  static async getRecent(limit: number = 100, offset: number = 0): Promise<SignalModel[]> {
    return this.find({}, { limit, offset });
  }

  /**
   * Get signals by symbol
   */
  static async getBySymbol(symbol: string, limit: number = 100): Promise<SignalModel[]> {
    return this.find({ symbol }, { limit });
  }

  /**
   * Get strong signals (above threshold)
   */
  static async getStrongSignals(
    threshold: number = 0.7,
    limit: number = 100,
  ): Promise<SignalModel[]> {
    return this.find({ strength_min: threshold }, { limit, orderBy: 'strength', orderDirection: 'DESC' });
  }

  /**
   * Get signals by type
   */
  static async getByType(type: string, limit: number = 100): Promise<SignalModel[]> {
    return this.find({ type }, { limit });
  }
}
