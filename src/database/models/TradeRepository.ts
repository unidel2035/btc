import { postgres } from '../postgres.js';
import type {
  TradeModel,
  TradeInsert,
  TradeUpdate,
  TradeFilter,
  PaginationOptions,
} from './types.js';

/**
 * Trade repository for database operations
 */
export class TradeRepository {
  /**
   * Create a trade
   */
  static async create(data: TradeInsert): Promise<TradeModel> {
    const query = `
      INSERT INTO trades (
        symbol, side, type, quantity, price, status, strategy,
        signal_id, pnl, opened_at, closed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      data.symbol,
      data.side,
      data.type,
      data.quantity,
      data.price,
      data.status,
      data.strategy ?? null,
      data.signal_id ?? null,
      data.pnl ?? null,
      data.opened_at,
      data.closed_at ?? null,
    ];

    const result = await postgres.query<TradeModel>(query, values);
    if (!result.rows[0]) throw new Error('Failed to create trade'); return result.rows[0];
  }

  /**
   * Find trade by ID
   */
  static async findById(id: string): Promise<TradeModel | null> {
    const query = 'SELECT * FROM trades WHERE id = $1';
    const result = await postgres.query<TradeModel>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find trades with filters and pagination
   */
  static async find(
    filter: TradeFilter = {},
    options: PaginationOptions = {},
  ): Promise<TradeModel[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    // Build WHERE clause
    if (filter.symbol) {
      conditions.push(`symbol = $${++paramCount}`);
      values.push(filter.symbol);
    }

    if (filter.status) {
      conditions.push(`status = $${++paramCount}`);
      values.push(filter.status);
    }

    if (filter.strategy) {
      conditions.push(`strategy = $${++paramCount}`);
      values.push(filter.strategy);
    }

    if (filter.signal_id) {
      conditions.push(`signal_id = $${++paramCount}`);
      values.push(filter.signal_id);
    }

    if (filter.opened_after) {
      conditions.push(`opened_at >= $${++paramCount}`);
      values.push(filter.opened_after);
    }

    if (filter.opened_before) {
      conditions.push(`opened_at <= $${++paramCount}`);
      values.push(filter.opened_before);
    }

    if (filter.closed_after) {
      conditions.push(`closed_at >= $${++paramCount}`);
      values.push(filter.closed_after);
    }

    if (filter.closed_before) {
      conditions.push(`closed_at <= $${++paramCount}`);
      values.push(filter.closed_before);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build ORDER BY clause
    const orderBy = options.orderBy || 'opened_at';
    const orderDirection = options.orderDirection || 'DESC';

    // Build LIMIT and OFFSET
    const limit = options.limit || 100;
    const offset = options.offset || 0;

    const query = `
      SELECT * FROM trades
      ${whereClause}
      ORDER BY ${orderBy} ${orderDirection}
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    values.push(limit, offset);

    const result = await postgres.query<TradeModel>(query, values);
    return result.rows;
  }

  /**
   * Count trades with filters
   */
  static async count(filter: TradeFilter = {}): Promise<number> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (filter.symbol) {
      conditions.push(`symbol = $${++paramCount}`);
      values.push(filter.symbol);
    }

    if (filter.status) {
      conditions.push(`status = $${++paramCount}`);
      values.push(filter.status);
    }

    if (filter.strategy) {
      conditions.push(`strategy = $${++paramCount}`);
      values.push(filter.strategy);
    }

    if (filter.signal_id) {
      conditions.push(`signal_id = $${++paramCount}`);
      values.push(filter.signal_id);
    }

    if (filter.opened_after) {
      conditions.push(`opened_at >= $${++paramCount}`);
      values.push(filter.opened_after);
    }

    if (filter.opened_before) {
      conditions.push(`opened_at <= $${++paramCount}`);
      values.push(filter.opened_before);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `SELECT COUNT(*) as count FROM trades ${whereClause}`;
    const result = await postgres.query<{ count: string }>(query, values);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Update trade
   */
  static async update(id: string, data: TradeUpdate): Promise<TradeModel | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (data.status !== undefined) {
      fields.push(`status = $${++paramCount}`);
      values.push(data.status);
    }

    if (data.pnl !== undefined) {
      fields.push(`pnl = $${++paramCount}`);
      values.push(data.pnl);
    }

    if (data.closed_at !== undefined) {
      fields.push(`closed_at = $${++paramCount}`);
      values.push(data.closed_at);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const query = `
      UPDATE trades
      SET ${fields.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    const result = await postgres.query<TradeModel>(query, values);
    return result.rows[0] || null;
  }

  /**
   * Close a trade
   */
  static async close(id: string, pnl: number): Promise<TradeModel | null> {
    return this.update(id, {
      status: 'closed',
      closed_at: new Date(),
      pnl,
    });
  }

  /**
   * Cancel a trade
   */
  static async cancel(id: string): Promise<TradeModel | null> {
    return this.update(id, {
      status: 'cancelled',
      closed_at: new Date(),
    });
  }

  /**
   * Delete trade by ID
   */
  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM trades WHERE id = $1';
    const result = await postgres.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get open trades
   */
  static async getOpen(limit: number = 100): Promise<TradeModel[]> {
    return this.find({ status: 'open' }, { limit });
  }

  /**
   * Get closed trades
   */
  static async getClosed(limit: number = 100): Promise<TradeModel[]> {
    return this.find({ status: 'closed' }, { limit });
  }

  /**
   * Get trades by symbol
   */
  static async getBySymbol(symbol: string, limit: number = 100): Promise<TradeModel[]> {
    return this.find({ symbol }, { limit });
  }

  /**
   * Get trades by strategy
   */
  static async getByStrategy(strategy: string, limit: number = 100): Promise<TradeModel[]> {
    return this.find({ strategy }, { limit });
  }

  /**
   * Calculate total PnL
   */
  static async getTotalPnL(filter: TradeFilter = {}): Promise<number> {
    const conditions: string[] = ['pnl IS NOT NULL'];
    const values: any[] = [];
    let paramCount = 0;

    if (filter.symbol) {
      conditions.push(`symbol = $${++paramCount}`);
      values.push(filter.symbol);
    }

    if (filter.status) {
      conditions.push(`status = $${++paramCount}`);
      values.push(filter.status);
    }

    if (filter.strategy) {
      conditions.push(`strategy = $${++paramCount}`);
      values.push(filter.strategy);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const query = `SELECT COALESCE(SUM(pnl), 0) as total FROM trades ${whereClause}`;
    const result = await postgres.query<{ total: string }>(query, values);
    return parseFloat(result.rows[0].total);
  }

  /**
   * Get trade statistics
   */
  static async getStats(filter: TradeFilter = {}): Promise<{
    total: number;
    open: number;
    closed: number;
    cancelled: number;
    totalPnl: number;
    winRate: number;
  }> {
    const total = await this.count(filter);
    const open = await this.count({ ...filter, status: 'open' });
    const closed = await this.count({ ...filter, status: 'closed' });
    const cancelled = await this.count({ ...filter, status: 'cancelled' });
    const totalPnl = await this.getTotalPnL({ ...filter, status: 'closed' });

    // Calculate win rate
    const closedTrades = await this.find({ ...filter, status: 'closed' }, { limit: 10000 });
    const winners = closedTrades.filter((t) => (t.pnl ?? 0) > 0).length;
    const winRate = closedTrades.length > 0 ? winners / closedTrades.length : 0;

    return {
      total,
      open,
      closed,
      cancelled,
      totalPnl,
      winRate,
    };
  }
}
